<?php
// ============================================
// BIG BURGERS — API (api.php)
// ============================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DATABASE CONFIG ──────────────────────────
define('DB_HOST', 'localhost');
define('DB_USER', 'ck540806_test2');
define('DB_PASS', 'test2');
define('DB_NAME', 'ck540806_test2');
define('DB_PORT', 3306);

// ── CONNECTION ───────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    try {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        jsonError('DB ulanishda xato: ' . $e->getMessage(), 500);
    }
    return $pdo;
}

// ── ROUTER ───────────────────────────────────
$action = $_GET['action'] ?? '';

match ($action) {
    'categories' => handleCategories(),
    'products'   => handleProducts(),
    'order'      => handleOrder(),
    'menu'       => handleMenu(),
    default      => jsonError('Noma\'lum action', 400),
};

// ── HANDLERS ─────────────────────────────────

function handleCategories(): void {
    $rows = getDB()
        ->query("SELECT id, name, icon FROM categories WHERE is_active=1 ORDER BY sort_order, id")
        ->fetchAll();
    jsonOk($rows);
}

function handleProducts(): void {
    $catId = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;

    $sql = "SELECT p.id, p.category_id, c.name AS category_name, c.icon AS category_icon,
                   p.name, p.description, p.price, p.image_url, p.badge
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.is_active = 1 AND c.is_active = 1";

    if ($catId > 0) {
        $stmt = getDB()->prepare($sql . " AND p.category_id = ? ORDER BY p.sort_order, p.id");
        $stmt->execute([$catId]);
    } else {
        $stmt = getDB()->query($sql . " ORDER BY c.sort_order, c.id, p.sort_order, p.id");
    }

    $products = $stmt->fetchAll();
    foreach ($products as &$p) $p['price'] = (float)$p['price'];
    jsonOk($products);
}

function handleMenu(): void {
    $db = getDB();

    $categories = $db
        ->query("SELECT id, name, icon FROM categories WHERE is_active=1 ORDER BY sort_order, id")
        ->fetchAll();

    $products = $db
        ->query("SELECT p.id, p.category_id, c.name AS category_name, c.icon AS category_icon,
                        p.name, p.description, p.price, p.image_url, p.badge
                 FROM products p
                 JOIN categories c ON c.id = p.category_id
                 WHERE p.is_active=1 AND c.is_active=1
                 ORDER BY c.sort_order, c.id, p.sort_order, p.id")
        ->fetchAll();

    foreach ($products as &$p) $p['price'] = (float)$p['price'];
    jsonOk(['categories' => $categories, 'products' => $products]);
}

/** Buyurtmani saqlash — manzil va to'lov usuli bilan */
function handleOrder(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonError('Faqat POST', 405);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonError('JSON noto\'g\'ri', 400);

    $name    = trim($body['name']    ?? '');
    $phone   = trim($body['phone']   ?? '');
    $address = trim($body['address'] ?? '');
    $payment = trim($body['payment'] ?? 'naxt');
    $items   = $body['items'] ?? [];

    // Validatsiya
    if (!$name)         jsonError('Ism kiritilmagan', 422);
    if (!$address)      jsonError('Manzil kiritilmagan', 422);
    if (empty($items))  jsonError('Savat bo\'sh', 422);

    // To'lov usulini tekshirish
    $allowed = ['naxt', 'karta', 'click'];
    if (!in_array($payment, $allowed)) $payment = 'naxt';

    $orderNum = 'ORD-' . strtoupper(substr(uniqid(), -6));
    $total    = 0;
    foreach ($items as $item) {
        $total += (float)($item['price'] ?? 0) * (int)($item['qty'] ?? 1);
    }

    $db = getDB();
    $db->beginTransaction();
    try {
        $stmt = $db->prepare(
            "INSERT INTO orders (order_number, customer_name, customer_phone, address, payment_method, total_price)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$orderNum, $name, $phone, $address, $payment, $total]);
        $orderId = $db->lastInsertId();

        $ins = $db->prepare(
            "INSERT INTO order_items (order_id, product_id, product_name, price, qty) VALUES (?,?,?,?,?)"
        );
        foreach ($items as $item) {
            $ins->execute([
                $orderId,
                (int)($item['id']    ?? 0),
                (string)($item['name']  ?? ''),
                (float)($item['price'] ?? 0),
                (int)($item['qty']   ?? 1),
            ]);
        }

        $db->commit();
        jsonOk(['order_number' => $orderNum, 'total' => $total]);

    } catch (Exception $e) {
        $db->rollBack();
        jsonError('Buyurtma saqlashda xato: ' . $e->getMessage(), 500);
    }
}

// ── HELPERS ──────────────────────────────────
function jsonOk(mixed $data): never {
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}