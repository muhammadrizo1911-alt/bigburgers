// Tailwind script already loaded via CDN

let selectedCategoryId = 1;
let cartItems = 0;

// Savatcha Toggle
function openCart() {
    alert('🛒 Savatcha ochildi!\nUmuman ' + cartItems + ' ta maxsulot');
    console.log('Cart opened with ' + cartItems + ' items');
}

// Profile Menu Toggle
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
}

// Dropdown tashqarida bosilganda yopish
document.addEventListener('click', function(event) {
    const profileMenu = document.querySelector('.profile-menu');
    if (!profileMenu.contains(event.target)) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }
});

const categories = [
    { id: 1, name: "Yangilar", icon: "🛒", color: "from-orange-400 to-amber-500", desc: "Yangi kelgan taomlar va maxsus takliflar", items: 4 },
    { id: 2, name: "Ganburgerlar", icon: "🍔", color: "from-blue-400 to-cyan-500", desc: "Eng mashhur gamburgerlar", items: 8 },
    { id: 3, name: "Burgerlar", icon: "🍕", color: "from-red-400 to-rose-500", desc: "Klassik va zamonaviy burgerlar", items: 12 },
    { id: 4, name: "Hot-Doklar", icon: "🌭", color: "from-yellow-400 to-orange-500", desc: "Sosli va mazali hot-doklar", items: 6 },
    { id: 5, name: "Sendvichlar", icon: "🥪", color: "from-green-400 to-emerald-500", desc: "To'liq sendvichlar va wrap'lar", items: 9 },
    { id: 6, name: "Shirinhliklar", icon: "🍰", color: "from-purple-400 to-violet-500", desc: "Tayyor va yangi desertlar", items: 7 },
    { id: 7, name: "Ayronlar", icon: "🥛", color: "from-indigo-400 to-blue-500", desc: "Qaymoqli va mushtak ayronlar", items: 5 }
];

function createCategoryCard(category) {
    return `
        <div class="category-card group bg-white rounded-3xl overflow-hidden shadow-lg border border-transparent hover:border-orange-200">
            <div onclick="selectCategory(${category.id})" class="cursor-pointer">
                <div class="relative">
                    <div class="h-48 bg-gradient-to-br ${category.color} flex items-center justify-center text-7xl transition-all group-hover:scale-110">
                        ${category.icon}
                    </div>
                    <div class="absolute top-4 right-4 bg-white text-xs font-bold px-3 py-1 rounded-2xl shadow text-orange-600">
                        ${category.items} ta
                    </div>
                </div>
                <div class="p-5">
                    <h3 class="font-semibold text-xl text-gray-800">${category.name}</h3>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">${category.desc}</p>
                </div>
            </div>
            <button onclick="addToCart('${category.name}')" class="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold py-2 px-4 rounded-b-3xl hover:from-orange-500 hover:to-amber-600 transition-all">
                Savatcha qoşish
            </button>
        </div>
    `;
}

// Savatcha qoşish funktsiyasi
function addToCart(categoryName) {
    cartItems++;
    updateCartCount();
    console.log(categoryName + ' savatcha qo\'shildi');
    
    // Toast notification
    showNotification('✅ ' + categoryName + ' savatcha qo\'shildi!');
}

// Savatcha countini update qilish
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        cartCount.textContent = cartItems;
        cartCount.style.animation = 'pulse 0.3s';
    }
}

// Toast notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

function renderCategories() {
    const grid = document.getElementById('categoryGrid');
    grid.innerHTML = '';
    
    categories.forEach(cat => {
        grid.innerHTML += createCategoryCard(cat);
    });
}

// Category selection function - works with both header and grid
function selectCategory(element) {
    let categoryId;
    
    // Agar element object bo'lsa (header buttonlardan)
    if (typeof element === 'object' && element.onclick) {
        // Element tanlandi
        categoryId = findCategoryIdFromButton(element);
    } else if (typeof element === 'number') {
        // Agar number bo'lsa, u ID
        categoryId = element;
    }
    
    if (!categoryId) return;
    
    selectedCategoryId = categoryId;
    updateHeaderSelection();
    
    console.log(`Kategory bosildi: ${categoryId}`);
    document.getElementById('categoryGrid').scrollIntoView({ behavior: 'smooth' });
}

// Header buttondan category ID topish
function findCategoryIdFromButton(button) {
    const categoryText = button.querySelector('span.block.font-bold') || button.querySelector('span.block.text-gray-700');
    if (categoryText) {
        const categoryName = categoryText.textContent;
        const category = categories.find(cat => cat.name === categoryName);
        return category ? category.id : null;
    }
    return null;
}

// Header buttons selection update qilish
function updateHeaderSelection() {
    const headerButtons = document.querySelectorAll('.overflow-x-auto .category-card');
    headerButtons.forEach(card => {
        card.classList.remove('active-nav', 'border-orange-400');
    });
    
    // Tanlangan categoryga active class qoşish
    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
    if (selectedCategory) {
        headerButtons.forEach(button => {
            const btnText = button.querySelector('span.block:first-of-type')?.textContent;
            if (btnText === selectedCategory.name) {
                button.classList.add('active-nav', 'border-orange-400');
            }
        });
    }
}

// Initialize
window.onload = function() {
    renderCategories();
    updateHeaderSelection();
    console.log('%c🍔 Yangi Kategoriyalar tayyor! Hamma kategoriyaga bosish mumkin va stroke yonadi.', 'color:#f97316; font-size:13px');
};