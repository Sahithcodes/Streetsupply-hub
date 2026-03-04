// ---------------- DATA & STATE ----------------
let allProducts = [];
let supplierProducts = [];
let vendorOrders = [];
let trendData = [];
let recommendedProducts = [];
let vendorBargains = [];
let disabledBargainAdds = new Set();

let cart = [];
let appState = {
    isLoggedIn: false,
    role: 'vendor',
    userName: '',
    phone: '',
    business: '',
    address: '',
    id: null
};
let currentBargainProduct = null;

let myFriends = [];
let lastUserSearch = [];

const API_BASE = "http://localhost:5000";
let selectedCategory = "all";

// ---------------- PRODUCT IMAGES ----------------

const pictureFiles = [
    "Bajra Flour.jpg",
    "Besan Flour.jpg",
    "Chana Dal.jpg",
    "Cold-Pressed Mustard Oil.jpg",
    "Farm-Fresh Potatoes.webp",
    "Fresh Tomatoes.jpg",
    "Green Chillies.jpg",
    "Groundnut Oil.jpg",
    "Kashmiri Apples.jpg",
    "MP Sharbati Wheat.jpg",
    "Moong Dal.jpg",
    "Organic Basmati Rice.jpg",
    "Organic Turmeric Powder.jpg",
    "Palmolein Oil.jpg",
    "Premium Maida (Flour).jpg",
    "Premium Onions.jpg",
    "Red Onions.jpg",
    "Refined Wheat Flour.jpg",
    "Rice Bran Oil.jpg",
    "Semolina (Sooji).jpg",
    "Sona Masoori Rice.jpg",
    "Soybean Oil (Bulk).jpg",
    "Sunflower Oil Tin.jpg",
    "Toor Dal.jpg"
];

const normalizeName = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const pictureMap = new Map(pictureFiles.map((file) => [normalizeName(file), file]));

function findPicture(productName) {
    const key = normalizeName(productName);
    if (!key) return null;
    if (pictureMap.has(key)) return pictureMap.get(key);
    const keyTokens = new Set(key.split(" "));
    let best = { score: 0, file: null };
    for (const [fileKey, fileName] of pictureMap.entries()) {
        if (fileKey.includes(key) || key.includes(fileKey)) return fileName;
        const fileTokens = new Set(fileKey.split(" "));
        let overlap = 0;
        keyTokens.forEach(t => { if (fileTokens.has(t)) overlap += 1; });
        const score = overlap / Math.max(1, Math.max(keyTokens.size, fileTokens.size));
        if (score > best.score) best = { score, file: fileName };
    }
    return best.score >= 0.5 ? best.file : null;
}

function getProductImage(product) {
    if (product.image) return product.image;
    const matched = findPicture(product.name);
    if (matched) return `pictures/${encodeURIComponent(matched)}`;
    const category = (product.category || "").toLowerCase();
    const name = (product.name || "Product").replace(/[^a-z0-9 ]/gi, "").trim() || "Product";
    const label = encodeURIComponent(name.slice(0, 14));
    if (category === "vegetable") {
        return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 220'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23e7f7ec'/><stop offset='1' stop-color='%23b8e6c8'/></linearGradient></defs><rect width='360' height='220' rx='18' fill='url(%23g)'/><circle cx='110' cy='110' r='54' fill='%2388cfa1'/><circle cx='190' cy='120' r='46' fill='%236ab384'/><circle cx='245' cy='95' r='34' fill='%234f9b6f'/><text x='24' y='198' font-family='Sora, Arial' font-size='18' fill='%2332593f'>${label}</text></svg>`;
    }
    if (category === "oil") {
        return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 220'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23fff3d4'/><stop offset='1' stop-color='%23ffd08a'/></linearGradient></defs><rect width='360' height='220' rx='18' fill='url(%23g)'/><rect x='90' y='40' width='60' height='120' rx='16' fill='%23f4b942'/><rect x='170' y='60' width='80' height='100' rx='18' fill='%23e39b2e'/><text x='24' y='198' font-family='Sora, Arial' font-size='18' fill='%236a4a12'>${label}</text></svg>`;
    }
    if (category === "grains" || category === "flour") {
        return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 220'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23fff5e1'/><stop offset='1' stop-color='%23f3d5a4'/></linearGradient></defs><rect width='360' height='220' rx='18' fill='url(%23g)'/><path d='M90 150 C110 90, 150 90, 170 150' fill='%23e2b97e'/><path d='M170 150 C190 90, 230 90, 250 150' fill='%23d6a86e'/><text x='24' y='198' font-family='Sora, Arial' font-size='18' fill='%236a4a12'>${label}</text></svg>`;
    }
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 220'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23edf3ff'/><stop offset='1' stop-color='%23c9d9ff'/></linearGradient></defs><rect width='360' height='220' rx='18' fill='url(%23g)'/><rect x='86' y='60' width='190' height='90' rx='20' fill='%2384a2e6'/><text x='24' y='198' font-family='Sora, Arial' font-size='18' fill='%2332487a'>${label}</text></svg>`;
}

// ---------------- API & DATA FETCHING ----------------

async function fetchAllProducts() {
    try {
        const res = await fetch(`${API_BASE}/api/products`);
        const json = await res.json();
        if (json.success) {
            allProducts = json.data;
            renderProducts();
            await fetchTrendData();
            if (appState.isLoggedIn && appState.role === "vendor" && appState.id) {
                fetchVendorOrders(renderRecommendationSection);
            } else {
                renderRecommendationSection();
            }
        }
    } catch (err) { console.error("Fetch failed", err); }
}

async function fetchTrendData() {
    try {
        const res = await fetch(`${API_BASE}/api/product-trends`);
        const json = await res.json();
        if (json.success) {
            trendData = json.data;
            renderTrendSection();
        }
    } catch (err) {
        console.error("Trend fetch failed", err);
        trendData = [];
        renderTrendSection();
    }
}

async function fetchSupplierProducts() {
    if (appState.role !== 'supplier' || !appState.id) return;
    try {
        const res = await fetch(`${API_BASE}/api/supplier/products?userId=${appState.id}`);
        const json = await res.json();
        if (json.success) {
            supplierProducts = json.data;
            if (!document.getElementById('seller-dashboard').classList.contains('hidden')) {
                showManageInventory();
            }
        }
    } catch (err) { console.error(err); }
}

async function fetchVendorOrders(renderFn) {
    if (appState.role !== 'vendor' || !appState.id) return;
    try {
        const res = await fetch(`${API_BASE}/api/vendor/orders?userId=${appState.id}`);
        const json = await res.json();
        if (json.success) {
            vendorOrders = json.data;
            if (typeof renderFn === "function") renderFn();
            else renderOrderHistory();
        }
    } catch (err) { console.error(err); }
}

// ---------------- NAVIGATION ----------------

function toggleSidebar() { document.getElementById('left-sidebar').classList.toggle('sidebar-hidden'); }
function toggleCart() { document.getElementById('cart-sidebar').classList.toggle('cart-hidden'); }
function toggleProfileMenu() { document.getElementById('profile-dropdown')?.classList.toggle('hidden'); }

function goHome() {
    hideAllPages();
    document.getElementById('landing-page').classList.remove('hidden');
    if (appState.role === 'supplier') {
        const cartIcon = document.getElementById('cart-count');
        if (cartIcon) cartIcon.parentElement.style.display = 'none';
    } else {
        const cartIcon = document.getElementById('cart-count');
        if (cartIcon) cartIcon.parentElement.style.display = 'block';
    }
    updateAuthUI();
    updateInsightsLayout();
    renderProducts(document.getElementById('landing-search')?.value || "");
    renderTrendSection();
    renderRecommendationSection();
}

function hideAllPages() {
    [
        'landing-page',
        'seller-dashboard',
        'vendor-bargains-page',
        'previous-orders-page',
        'tracking-page',
        'profile-page',
        'auth-container',
        'about-page',
        'group-hub-page',
        'support-page',
        'reviews-page'
    ].forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

// ---------------- AUTH ----------------

function showLogin() {
    hideAllPages();
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('register-page').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.remove('hidden');
}

function handleLoginKey(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const otpVisible = !document.getElementById('otp-section')?.classList.contains('hidden');
    if (otpVisible) verifyOTP();
    else sendOTP();
}

function findVisibleContainer(selectors) {
    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && !el.classList.contains('hidden')) return el;
    }
    return null;
}

function handleGlobalEnter(event) {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

    const target = event.target;
    if (target && target.tagName === "TEXTAREA") return;
    if (target && target.closest('.prod-card, .products-grid, .recommend-card')) return;
    if (target && target.id === "chat-input") return;

    const container = findVisibleContainer([
        '#login-page',
        '#register-page',
        '#profile-page',
        '#group-hub-page',
        '#support-page',
        '#reviews-page',
        '#cart-sidebar:not(.cart-hidden)',
        '#bargain-modal:not(.hidden)'
    ]);
    if (!container) return;

    const primaryBtn = container.querySelector('button.btn-primary:not(.hidden)');
    if (primaryBtn) {
        event.preventDefault();
        primaryBtn.click();
    }
}

async function finalizeRegistration() {
    const role = appState.role;
    const formData = new FormData();
    formData.append("full_name", document.getElementById("reg-name").value.trim());
    formData.append("business_name", document.getElementById("reg-biz").value.trim());
    formData.append("address", document.getElementById("reg-addr").value.trim());
    formData.append("phone", document.getElementById("reg-phone").value.trim());
    formData.append("role", role);
    formData.append("products", document.getElementById("reg-products")?.value.trim() || "");

    const aadhaarFile = document.getElementById("reg-aadhaar").files[0];
    if (aadhaarFile) formData.append("aadhaar", aadhaarFile);

    const res = await fetch(`${API_BASE}/register-send-otp`, {
        method: "POST",
        body: formData
    });
    const data = await res.json();

    const messageEl = document.getElementById("register-main-message");
    messageEl.textContent = data.message;
    messageEl.className = `otp-message ${data.success ? "otp-success" : "otp-error"}`;

    if (data.success) {
        document.getElementById("register-otp-section").classList.remove("hidden");
    }
}

async function verifyRegisterOTP() {
    const phone = document.getElementById("reg-phone").value.trim();
    const otp = document.getElementById("register-otp-input").value.trim();

    const res = await fetch(`${API_BASE}/register-verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
    });
    const data = await res.json();

    const messageEl = document.getElementById("register-main-message");
    messageEl.textContent = data.message;
    messageEl.className = `otp-message ${data.success ? "otp-success" : "otp-error"}`;

    if (data.success) {
        setTimeout(() => showLogin(), 800);
    }
}

function selectRole(role) {
    appState.role = role;
    document.querySelectorAll('.role-block').forEach(b => b.classList.remove('active-role'));
    document.getElementById('block-' + role).classList.add('active-role');
    document.getElementById('registration-form').classList.remove('hidden');
    document.getElementById('supplier-product-section').classList.toggle('hidden', role !== 'supplier');
}

async function sendOTP() {
    const phone = document.getElementById('login-phone').value.trim();
    if (phone.length < 10) return alert("Valid phone required");
    const res = await fetch(`${API_BASE}/login-send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.success) {
        document.getElementById('login-initial-action').classList.add('hidden');
        document.getElementById('otp-section').classList.remove('hidden');
    } else { alert(data.message); if(data.message.includes("register")) showRegister(); }
}

async function verifyOTP() {
    const phone = document.getElementById('login-phone').value.trim();
    const otp = document.getElementById('otp-input').value.trim();
    const res = await fetch(`${API_BASE}/login-verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
    });
    const data = await res.json();
    if (data.success) {
        appState = {
            isLoggedIn: true,
            userName: data.user.full_name,
            phone: data.user.phone,
            role: String(data.user.role || "").toLowerCase(),
            id: data.user.id,
            business: data.user.business_name || "",
            address: data.user.address || ""
        };
        localStorage.setItem("userData", JSON.stringify(appState));
        login();
    } else alert(data.message);
}

function login() {
    hideAllPages();
    document.getElementById('profile-wrapper').classList.remove('hidden');
    document.getElementById('auth-nav-btn').classList.add('hidden');
    document.getElementById('menu-btn').classList.remove('hidden');
    updateChatAccess();
    updateAuthUI();

    const displayName = appState.userName || "User";
    const firstLetter = displayName.charAt(0).toUpperCase();
    document.getElementById('profile-display-name').innerText = displayName;
    document.getElementById('profile-display-phone').innerText = appState.phone || "";
    document.getElementById('profile-icon').innerText = firstLetter;
    document.getElementById('profile-letter').innerText = firstLetter;

    setupSidebar();
    if (appState.role === "supplier") {
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('hero-section').innerHTML = `<h1>Welcome back, ${displayName}!</h1>`;
        fetchAllProducts();
        fetchSupplierProducts();
    } else {
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('hero-section').innerHTML = `<h1>Welcome back, ${displayName}!</h1>`;
        fetchAllProducts();
        fetchFriends();
    }
}

function logout() {
    localStorage.removeItem("userData");
    updateChatAccess();
    location.reload();
}

function openProfilePage() {
    hideAllPages();
    document.getElementById("profile-page").classList.remove("hidden");
    document.getElementById("profile-edit-name").value = appState.userName || "";
    document.getElementById("profile-edit-phone").value = appState.phone || "";
    document.getElementById("profile-edit-business").value = appState.business || "";
    document.getElementById("profile-edit-address").value = appState.address || "";
}

function saveProfileChanges() {
    const newBusiness = document.getElementById("profile-edit-business").value.trim();
    const newAddress = document.getElementById("profile-edit-address").value.trim();

    updateProfileOnServer({
        id: appState.id,
        full_name: appState.userName,
        phone: appState.phone,
        business_name: newBusiness || appState.business,
        address: newAddress || appState.address
    });
}

async function updateProfileOnServer(payload) {
    try {
        const res = await fetch(`${API_BASE}/api/users/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Update failed");
        appState.userName = data.user.full_name;
        appState.phone = data.user.phone;
        appState.business = data.user.business_name || "";
        appState.address = data.user.address || "";
        localStorage.setItem("userData", JSON.stringify(appState));

        const displayName = appState.userName || "User";
        const firstLetter = displayName.charAt(0).toUpperCase();
        document.getElementById('profile-display-name').innerText = displayName;
        document.getElementById('profile-display-phone').innerText = appState.phone || "";
        document.getElementById('profile-icon').innerText = firstLetter;
        document.getElementById('profile-letter').innerText = firstLetter;

        document.getElementById('hero-section').innerHTML =
            `<h1>Welcome back, ${displayName}!</h1>
             <p>Start your bulk procurement today with Direct Bargaining.</p>`;
        alert("Profile Updated Successfully!");
        goHome();
    } catch (err) {
        console.error(err);
        alert("Profile update failed.");
    }
}

// ---------------- SIDEBAR ----------------

function setupSidebar() {
    const sidebarContent = document.getElementById('sidebar-content');
    if (appState.role === 'supplier') {
        sidebarContent.innerHTML = `
            <a href="#" onclick="goHome(); toggleSidebar();">Marketplace</a>
            <a href="#" onclick="showSalesOverview(); toggleSidebar();">Sales Overview</a>
            <a href="#" onclick="showManageInventory(); toggleSidebar();">Manage Inventory</a>
            <a href="#" onclick="showSellerDashboard(); toggleSidebar();">Bargain Requests</a>
            <a href="#" onclick="showPastCustomers(); toggleSidebar();">Past Customers</a>
            <hr style="border:0; border-top:1px solid #444; margin:10px 0;">
            <a href="#" onclick="showAbout(); toggleSidebar();">About Us</a>
            <a href="#" onclick="showSupportPage(); toggleSidebar();">Support</a>
        `;
    } else {
        sidebarContent.innerHTML = `
            <a href="#" onclick="goHome(); toggleSidebar();">Home</a>
            <a href="#" onclick="showVendorBargains(); toggleSidebar();">My Bargains</a>
            <a href="#" onclick="showPreviousOrders(); toggleSidebar();">My Orders</a>
            <a href="#" onclick="showTrackingPage(); toggleSidebar();">Track Orders</a>
            <a href="#" onclick="showGroupHub(); toggleSidebar();">Group Hub (Add Friends)</a>
            <a href="#" onclick="showAbout(); toggleSidebar();">About Us</a>
            <a href="#" onclick="showSupportPage(); toggleSidebar();">Support</a>
            <a href="#" onclick="showReviewsPage(); toggleSidebar();">Feedback</a>
        `;
    }
}

// ---------------- GROUP HUB ----------------

function showGroupHub() {
    hideAllPages();
    document.getElementById('group-hub-page').classList.remove('hidden');
    fetchFriends();
}

function searchFriend() {
    const query = document.getElementById('friend-search-input').value.trim();
    const resultDiv = document.getElementById('search-result');

    if (!query) {
        resultDiv.innerHTML = `<p style="color:#777;">Enter a name to search.</p>`;
        return;
    }
    fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Search failed");
            lastUserSearch = data.data || [];
            if (lastUserSearch.length === 0) {
                resultDiv.innerHTML = `<p style="color:red;">No users found.</p>`;
                return;
            }
            resultDiv.innerHTML = lastUserSearch.map(u => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f0f0f0; padding:10px; border-radius:5px; margin-bottom:8px;">
                    <span>${u.business_name || u.full_name}</span>
                    <button class="btn-primary" style="width:auto; padding:5px 15px;" onclick="sendFriendRequest(${u.id})">Add Friend</button>
                </div>`).join('');
        })
        .catch(() => {
            resultDiv.innerHTML = `<p style="color:red;">Search failed.</p>`;
        });
}

function sendFriendRequest(friendUserId) {
    if (!appState.id) return alert("Please login first.");
    if (appState.id === friendUserId) return alert("You cannot add yourself.");
    fetch(`${API_BASE}/api/friends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: appState.id, friendUserId })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            alert("Friend added!");
            fetchFriends();
        })
        .catch(() => alert("Unable to add friend."));
}

function fetchFriends() {
    if (!appState.id) return;
    fetch(`${API_BASE}/api/friends?userId=${appState.id}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            myFriends = data.data || [];
            renderFriends();
            updateGroupStatus();
        })
        .catch(() => {
            myFriends = [];
            renderFriends();
        });
}

function renderFriends() {
    const list = document.getElementById('friend-list');
    if (!list) return;
    if (myFriends.length === 0) {
        list.innerHTML = `<li style="color:#888;">No friends added yet.</li>`;
        return;
    }
    list.innerHTML = myFriends.map(f => `
        <li style="padding:10px 0; border-bottom:1px solid #eee;">✅ ${f.business_name || f.full_name}</li>
    `).join('');
}

function updateGroupStatus() {
    const count = myFriends.length + 1;
    document.getElementById('group-count').innerText = `Members: ${count}/5`;
    document.getElementById('group-progress').value = count;

    if (count >= 5) {
        document.getElementById('group-benefit').style.display = 'block';
    }
}

// ---------------- MARKETPLACE ----------------

function renderProducts(filter = "") {
    const grid = document.getElementById('product-list');
    if (!grid) return;
    grid.innerHTML = "";

    const isSupplier = (appState.role === 'supplier');
    const isGuest = !appState.isLoggedIn;

    allProducts
        .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
        .filter(p => selectedCategory === "all" || p.category === selectedCategory)
        .forEach(p => {
            const supplierPhone = p.supplier_phone || "N/A";
            const trustScore = computeTrustScore(p);
            const guestClass = isGuest ? "masked" : "";
            const productImage = getProductImage(p);
            grid.innerHTML += `
                <div class="prod-card">
                    <img class="product-img" src="${productImage}" alt="${p.name}">
                    <span class="moq-tag">MOQ: ${p.moq} ${p.unit}</span>
                    ${p.supplier_is_new ? `<span class="new-badge">New Supplier</span>` : ``}
                    <h3>${p.name}</h3>
                    <div class="product-supplier">
                        by ${p.supplier_display_name || p.supplier_business || p.supplier_name || "Supplier"}
                        · <span class="${guestClass}">${supplierPhone}</span>
                    </div>
                    <p class="price">₹${p.price} / ${p.unit}</p>
                    <div class="supplier-hover">
                        <div class="supplier-title">${p.supplier_display_name || p.supplier_business || p.supplier_name || "Supplier"}</div>
                        <div class="supplier-meta ${guestClass}">${supplierPhone}</div>
                        <div class="trust-score">Trust Score: <strong class="${guestClass}">${trustScore}</strong></div>
                    </div>
                    ${isSupplier ? `
                        <div class="view-only-tag">Supplier View (No Purchasing)</div>
                    ` : isGuest ? `
                        <div class="card-actions guest-actions">
                            <button class="btn-primary" onclick="showLogin()">Login to Purchase</button>
                            <p class="guest-note">Browse freely, login to place orders or bargain.</p>
                        </div>
                    ` : `
                        <div class="card-actions">
                            <div class="add-cart-row">
                                <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
                                <button class="btn-primary add-btn" onclick="addToCart(${p.id})">Add (<span id="qty-${p.id}">${p.moq}</span>)</button>
                                <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
                            </div>
                            <button class="group-btn" style="background:#444;" onclick="openBargain(${p.id})">Bargain</button>
                            <button class="group-btn" onclick="createGroupOrder(${p.id})">Create Group Order</button>
                            <button class="group-btn join-btn hidden" id="join-btn-${p.id}" onclick="joinGroupOrder(${p.id})">Join Group Order</button>
                            <p id="group-status-${p.id}" class="group-status hidden">Current Group: 0 ${p.unit}</p>
                        </div>
                    `}
                </div>`;
        });
    refreshAllGroupStatuses();
}

function updateAuthUI() {
    const isGuest = !appState.isLoggedIn;
    document.getElementById('profile-wrapper')?.classList.toggle('hidden', isGuest);
    document.getElementById('auth-nav-btn')?.classList.toggle('hidden', !isGuest);
    document.getElementById('menu-btn')?.classList.toggle('hidden', isGuest);
    const cartIcon = document.getElementById('cart-count');
    if (cartIcon) {
        cartIcon.parentElement.style.display = isGuest || appState.role === 'supplier' ? 'none' : 'block';
    }
}

function filterProducts() {
    const select = document.getElementById('category-select');
    const rawCategory = select ? (select.value || "all") : selectedCategory;
    selectedCategory = rawCategory === "flour" ? "grains" : rawCategory;
    renderProducts(document.getElementById('landing-search').value);
}

function filterCategory(category) {
    selectedCategory = category === "flour" ? "grains" : category;
    const select = document.getElementById('category-select');
    if (select) select.value = category;
    renderProducts(document.getElementById('landing-search')?.value || "");
}

function renderTrendSection() {
    const trendList = document.getElementById("trend-list");
    if (!trendList) return;
    if (!appState.isLoggedIn) return;
    trendList.innerHTML = "";

    const source = trendData.length
        ? trendData
        : allProducts.map(p => ({
            id: p.id,
            name: p.name,
            current_price: Number(p.price),
            baseline_price: Number(p.price)
        }));

    source.forEach(t => {
        const productName = t.name || allProducts.find(p => p.id === t.id)?.name || "Product";
        const current = Number(t.current_price);
        const baseline = Number(t.baseline_price);
        const diff = current - baseline;
        const base = baseline || 1;
        const percent = ((diff / base) * 100).toFixed(1);
        const direction = diff >= 0 ? "up" : "down";

        trendList.innerHTML += `
            <div class="trend-card">
                <h4>${productName}</h4>
                <p><span class="${direction}">${direction === "up" ? "⬆" : "⬇"} ₹${Math.abs(diff).toFixed(2)}</span></p>
                <small>${percent}% ${direction === "up" ? "increase" : "decrease"}</small>
            </div>`;
    });
}

function buildRecommendations() {
    const now = Date.now();
    const productSignals = new Map();
    const categoryAffinity = new Map();
    const productsById = new Map(allProducts.map(p => [Number(p.id), p]));

    vendorOrders.forEach(order => {
        const orderTime = order?.date ? new Date(order.date).getTime() : now;
        const daysAgo = Math.max(0, (now - orderTime) / (1000 * 60 * 60 * 24));
        const recencyMultiplier = Math.max(0.25, 1 - (daysAgo / 120));

        (order.items || []).forEach(item => {
            const qty = Number(item.quantity ?? item.qty ?? 0) || 0;
            const productId = Number(item.product_id || 0);
            const itemName = (item?.name || "").trim();
            const key = productId ? `id:${productId}` : `name:${itemName.toLowerCase()}`;
            if (!itemName && !productId) return;

            const prev = productSignals.get(key) || {
                productId,
                name: itemName,
                count: 0,
                qty: 0,
                weightedScore: 0
            };
            prev.count += 1;
            prev.qty += qty;
            prev.weightedScore += (1 + Math.log1p(Math.max(1, qty))) * recencyMultiplier;
            productSignals.set(key, prev);

            const linkedProduct = productId ? productsById.get(productId) : allProducts.find(
                p => (p.name || "").trim().toLowerCase() === itemName.toLowerCase()
            );
            if (linkedProduct?.category) {
                const prevCat = categoryAffinity.get(linkedProduct.category) || 0;
                categoryAffinity.set(linkedProduct.category, prevCat + (1 + Math.log1p(Math.max(1, qty))) * recencyMultiplier);
            }
        });
    });

    const signalsByProductId = new Map();
    productSignals.forEach(signal => {
        let product = null;
        if (signal.productId) {
            product = productsById.get(Number(signal.productId));
        } else if (signal.name) {
            product = allProducts.find(p => (p.name || "").trim().toLowerCase() === signal.name.toLowerCase());
        }
        if (product) signalsByProductId.set(Number(product.id), signal);
    });

    const ranked = allProducts.map(product => {
        const signal = signalsByProductId.get(Number(product.id));
        const categoryBoost = categoryAffinity.get(product.category) || 0;

        let score = 0;
        let reason = "Popular in your buying categories";

        if (signal) {
            score += (signal.weightedScore * 5) + (signal.count * 3) + Math.log1p(signal.qty);
            reason = signal.count >= 2 ? "Buy Again" : "You bought this recently";
        } else if (categoryBoost > 0) {
            score += categoryBoost * 2.3;
            reason = `Because you often buy ${product.category || "similar"} items`;
        } else {
            score += Number(product.supplier_total_orders || 0) * 0.08;
            reason = "Trending with marketplace buyers";
        }

        const lowPriceBonus = Number(product.price || 0) > 0 ? (1 / Number(product.price)) * 40 : 0;
        score += Math.min(2, lowPriceBonus);

        return {
            ...product,
            recReason: reason,
            recCount: signal ? signal.count : 0,
            recQty: signal ? signal.qty : 0,
            recScore: score
        };
    });

    return ranked
        .sort((a, b) => b.recScore - a.recScore)
        .slice(0, Math.min(9, allProducts.length));
}

function recommendQuickAdd(productId) {
    if (!appState.isLoggedIn) {
        alert("Please login to add products.");
        showLogin();
        return;
    }
    if (appState.role !== "vendor") return alert("Only vendors can place orders.");
    const product = allProducts.find(p => Number(p.id) === Number(productId));
    if (!product) return;

    const existing = cart.find(x => Number(x.id) === Number(productId));
    if (existing) existing.qty += Number(product.moq || 1);
    else cart.push({ ...product, qty: Number(product.moq || 1) });
    updateCartUI();
}

function jumpToCategory(category) {
    if (!category) return;
    selectedCategory = category;
    const select = document.getElementById('category-select');
    if (select) select.value = (category === "grains" ? "flour" : category);
    renderProducts(document.getElementById('landing-search')?.value || "");
    document.getElementById("product-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRecommendationSection() {
    updateInsightsLayout();
    if (appState.role === "supplier" || !appState.isLoggedIn) return;
    const recommendList = document.getElementById("recommend-list");
    if (!recommendList) return;

    recommendList.innerHTML = "";
    if (!appState.isLoggedIn || appState.role !== "vendor") {
        recommendList.innerHTML = `<p class="recommend-empty">Login as a vendor to unlock personalized picks.</p>`;
        return;
    }

    recommendedProducts = buildRecommendations();
    if (!recommendedProducts.length) {
        recommendList.innerHTML = `<p class="recommend-empty">Recommendations are getting ready. Place an order to personalize this section.</p>`;
        return;
    }

    recommendList.innerHTML = recommendedProducts.map(p => {
        const supplierName = p.supplier_display_name || p.supplier_business || p.supplier_name || "Supplier";
        const reasonMeta = p.recCount > 0
            ? `Ordered ${p.recCount} time${p.recCount > 1 ? "s" : ""} • ${p.recQty} ${p.unit}`
            : `Category: ${p.category || "General"}`;
        const productImage = getProductImage(p);
        return `
            <article class="recommend-card">
                <img class="recommend-img" src="${productImage}" alt="${p.name}">
                <div class="recommend-badge">${p.recReason}</div>
                <h4>${p.name}</h4>
                <div class="recommend-meta">by ${supplierName}</div>
                <div class="recommend-submeta">${reasonMeta}</div>
                <div class="recommend-bottom">
                    <strong>₹${Number(p.price).toFixed(2)} / ${p.unit}</strong>
                    <span class="moq-tag">MOQ ${p.moq}</span>
                </div>
                <div class="recommend-actions">
                    <button class="recommend-btn" onclick="recommendQuickAdd(${p.id})">Add MOQ</button>
                    <button class="recommend-btn alt" onclick="openBargain(${p.id})">Bargain</button>
                    <button class="recommend-btn alt" onclick="jumpToCategory('${(p.category || "").replace(/'/g, "\\'")}')">More Like This</button>
                </div>
            </article>
        `;
    }).join("");
}

function updateInsightsLayout() {
    const grid = document.querySelector('#landing-page .insights-grid');
    const recommendSection = document.getElementById('recommend-section');
    const trendSection = document.getElementById('trend-section');
    if (!grid || !recommendSection) return;
    const hideRecommendations = appState.role === 'supplier' || !appState.isLoggedIn;
    const hideTrends = !appState.isLoggedIn;
    recommendSection.classList.toggle('hidden', hideRecommendations);
    if (trendSection) trendSection.classList.toggle('hidden', hideTrends);
    grid.classList.toggle('hidden', hideRecommendations && hideTrends);
    grid.classList.toggle('center-trend', hideRecommendations && !hideTrends);
}

function computeTrustScore(p) {
    const totalOrders = Number(p.supplier_total_orders || 0);
    const deliveredOrders = Number(p.supplier_delivered_orders || 0);
    const cancelledOrders = Number(p.supplier_cancelled_orders || 0);
    const avgRating = p.supplier_avg_rating !== null && p.supplier_avg_rating !== undefined
        ? Number(p.supplier_avg_rating)
        : null;
    const avgPrice = p.avg_price_per_unit !== null && p.avg_price_per_unit !== undefined
        ? Number(p.avg_price_per_unit)
        : null;
    const currentPrice = Number(p.price || 0);

    const onTimeDelivery = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 70;
    const completionRate = totalOrders > 0 ? ((totalOrders - cancelledOrders) / totalOrders) * 100 : 70;
    const vendorRatings = avgRating !== null ? (avgRating / 5) * 100 : 75;
    const priceStability = avgPrice !== null && currentPrice > 0
        ? Math.max(0, 100 - (Math.abs(avgPrice - currentPrice) / currentPrice) * 100)
        : 80;

    const trust100 = (0.4 * onTimeDelivery) + (0.3 * completionRate) + (0.2 * vendorRatings) + (0.1 * priceStability);
    const trust10 = Math.round((trust100 / 10) * 10) / 10;
    return `${trust10.toFixed(1)}/10`;
}

// ---------------- GROUP ORDER ----------------

function createGroupOrder(pid) {
    const product = allProducts.find(p => p.id === pid);
    if (!product) return;
    if (appState.role !== "vendor") return alert("Only vendors can create group orders.");
    if (!appState.id) return alert("Please login first.");
    fetch(`${API_BASE}/api/group-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            productId: pid,
            vendorId: appState.id,
            quantity: product.moq,
            targetMoq: product.moq * 3
        })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            alert("Group Order Created");
            fetchGroupOrderStatus(pid);
        })
        .catch(() => alert("Unable to create group order."));
}

function joinGroupOrder(pid) {
    const product = allProducts.find(p => p.id === pid);
    if (!product) return;
    if (appState.role !== "vendor") return alert("Only vendors can join group orders.");
    if (!appState.id) return alert("Please login first.");
    fetch(`${API_BASE}/api/group-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            productId: pid,
            vendorId: appState.id,
            quantity: product.moq,
            targetMoq: product.moq * 3
        })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            fetchGroupOrderStatus(pid);
        })
        .catch(() => alert("Unable to join group order."));
}

function refreshAllGroupStatuses() {
    const ids = allProducts.map(p => p.id);
    ids.forEach(id => fetchGroupOrderStatus(id));
}

function fetchGroupOrderStatus(productId) {
    const userIdParam = appState?.id ? `&userId=${appState.id}` : "";
    fetch(`${API_BASE}/api/group-orders?productId=${productId}${userIdParam}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) return;
            const info = data.data;
            const product = allProducts.find(p => p.id === productId);
            const joinBtn = document.getElementById(`join-btn-${productId}`);
            const status = document.getElementById(`group-status-${productId}`);
            if (!joinBtn || !status) return;
            if (!info) {
                joinBtn.classList.add("hidden");
                status.classList.add("hidden");
                return;
            }
            if (info.can_join) {
                joinBtn.classList.remove("hidden");
                status.classList.remove("hidden");
                status.innerText = `Current Group: ${info.totalQty} ${product ? product.unit : "units"}`;
                if (info.totalQty >= info.target_moq) {
                    status.innerText += " ✅ MOQ Achieved";
                }
            } else {
                joinBtn.classList.add("hidden");
                status.classList.add("hidden");
            }
        })
        .catch(() => {});
}

// ---------------- BARGAINING ----------------

function openBargain(productId) {
    if (!appState.isLoggedIn) {
        alert("Please login to bargain with suppliers.");
        showLogin();
        return;
    }
    currentBargainProduct = allProducts.find(p => p.id === productId);
    if (!currentBargainProduct) return;
    document.getElementById("bargain-prod-name").innerText = currentBargainProduct.name;
    document.getElementById("current-price-display").innerText = `₹${currentBargainProduct.price}/${currentBargainProduct.unit}`;
    document.getElementById("offer-price").value = "";
    document.getElementById("offer-qty").value = currentBargainProduct.moq;
    document.getElementById("bargain-modal").classList.remove("hidden");
}

function closeBargain() {
    document.getElementById("bargain-modal").classList.add("hidden");
}

function submitBargain() {
    if (!currentBargainProduct) return;
    const offerPrice = Number(document.getElementById("offer-price").value);
    const quantity = Number(document.getElementById("offer-qty").value);
    if (!offerPrice || !quantity) {
        alert("Enter valid offer price and quantity.");
        return;
    }
    if (!appState.id) return alert("Please login first.");
    fetch(`${API_BASE}/api/bargains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            product_id: currentBargainProduct.id,
            vendor_id: appState.id,
            offer_price: offerPrice,
            quantity
        })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            alert("Offer sent to supplier.");
            closeBargain();
        })
        .catch(() => alert("Unable to send bargain."));
}

// ---------------- VENDOR BARGAINS ----------------

function showVendorBargains() {
    hideAllPages();
    const page = document.getElementById('vendor-bargains-page');
    page.classList.remove('hidden');
    if (!appState.isLoggedIn || appState.role !== "vendor" || !appState.id) {
        page.innerHTML = `<p>Please login as a vendor to view your bargains.</p>`;
        return;
    }
    fetchVendorBargains();
}

function fetchVendorBargains() {
    const page = document.getElementById('vendor-bargains-page');
    if (!page || !appState.id) return;
    page.innerHTML = `<p>Loading your bargains...</p>`;
    fetch(`${API_BASE}/api/bargains?vendorId=${encodeURIComponent(appState.id)}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            vendorBargains = data.data || [];
            renderVendorBargains();
        })
        .catch((err) => {
            console.error("Vendor bargains load failed:", err);
            page.innerHTML = `<p>Unable to load bargains. Please refresh and try again.</p>`;
        });
}

function isBargainInCart(bargainId) {
    return cart.some(item => Number(item.bargain_id) === Number(bargainId));
}

function addAcceptedBargainToCart(bargainId) {
    if (disabledBargainAdds.has(Number(bargainId))) return;
    const bargain = vendorBargains.find(b => Number(b.id) === Number(bargainId));
    if (!bargain) return;
    const product = allProducts.find(p => Number(p.id) === Number(bargain.product_id)) || {};
    const baseItem = {
        id: Number(bargain.product_id),
        name: bargain.product_name || product.name || "Product",
        unit: bargain.unit || product.unit || "unit",
        moq: Number(bargain.moq || product.moq || 1)
    };
    const qty = Number(bargain.quantity || baseItem.moq || 1);
    const price = Number(bargain.offer_price || product.price || 0);

    const existing = cart.find(x => Number(x.id) === Number(baseItem.id));
    if (existing) {
        existing.qty = Number(existing.qty || 0) + qty;
        existing.price = price;
        existing.bargain_id = bargain.id;
        existing.bargain_price = price;
    } else {
        cart.push({
            ...baseItem,
            qty,
            price,
            bargain_id: bargain.id,
            bargain_price: price
        });
    }
    updateCartUI();
    renderVendorBargains();
}

function renderVendorBargains() {
    const page = document.getElementById('vendor-bargains-page');
    if (!page) return;
    const rows = vendorBargains.map(b => {
        const status = b.status || "Pending";
        const statusClass = status.toLowerCase();
        const inCart = isBargainInCart(b.id);
        const isDisabled = disabledBargainAdds.has(Number(b.id));
        const actionCell = status === "Accepted"
            ? (inCart
                ? `<span class="status-pill in-cart">In Cart</span>`
                : (isDisabled
                    ? `<button class="btn-primary" style="width:auto; padding:6px 12px; opacity:0.6; cursor:not-allowed;" disabled>Add to Cart Disabled</button>`
                    : `<button class="btn-primary" style="width:auto; padding:6px 12px;" onclick="addAcceptedBargainToCart(${b.id})">Add to Cart</button>`))
            : `<span class="muted">—</span>`;
        return `
            <tr>
                <td>${b.product_name}</td>
                <td>${b.supplier_name || "Supplier"}</td>
                <td>₹${Number(b.offer_price).toFixed(2)}</td>
                <td>${b.quantity}</td>
                <td><span class="status-pill ${statusClass}">${status}</span></td>
                <td>${actionCell}</td>
            </tr>`;
    }).join("");

    page.innerHTML = `
        <div class="container">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                <h2>My Bargain Requests</h2>
                <button class="btn-primary" style="width:auto; padding:6px 12px;" onclick="fetchVendorBargains()">Refresh</button>
            </div>
            <div class="trend-section">
                <table class="seller-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Supplier</th>
                            <th>Offer</th>
                            <th>Qty</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="6">No bargain requests yet.</td></tr>'}</tbody>
                </table>
            </div>
        </div>`;
}

// ---------------- CART ----------------

function changeQty(pid, dir) {
    const p = allProducts.find(x => x.id === pid);
    const el = document.getElementById(`qty-${pid}`);
    if (!p || !el) return;
    let qty = parseInt(el.innerText);
    const newQty = (dir === 1) ? qty + p.moq : Math.max(p.moq, qty - p.moq);
    
    if (newQty > p.stock_quantity) {
        alert(`Warning: Only ${p.stock_quantity} ${p.unit} available in stock for ${p.name}.`);
        return;
    }
    el.innerText = newQty;
}

function addToCart(pid) {
    const p = allProducts.find(x => x.id === pid);
    if (!p) return;
    const qty = parseInt(document.getElementById(`qty-${pid}`).innerText);
    
    if (qty > p.stock_quantity) {
        alert(`Warning: Requested quantity (${qty}) exceeds available stock (${p.stock_quantity}) for ${p.name}.`);
        return;
    }

    const existing = cart.find(x => x.id === pid);
    if (existing) {
        if (existing.qty + qty > p.stock_quantity) {
            alert(`Warning: Total quantity in cart would exceed available stock (${p.stock_quantity}) for ${p.name}.`);
            return;
        }
        existing.qty += qty;
    } else {
        cart.push({...p, qty});
    }
    updateCartUI();
}

function removeFromCart(index) {
    const item = cart[index];
    if (item && item.bargain_id) {
        disabledBargainAdds.add(Number(item.bargain_id));
    }
    cart.splice(index, 1);
    updateCartUI();
    const bargainPage = document.getElementById('vendor-bargains-page');
    if (bargainPage && !bargainPage.classList.contains('hidden')) {
        renderVendorBargains();
    }
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const container = document.getElementById('cart-items');
    const totalFooter = document.getElementById('cart-total-footer');
    if (cart.length === 0) {
        container.innerHTML = "<p>Empty</p>";
        if (totalFooter) totalFooter.innerText = "";
        return;
    }
    let total = 0;
    container.innerHTML = cart.map((item, i) => {
        total += item.qty * item.price;
        return `
            <div class="cart-item">
                <div><b>${item.name}</b><br><small>${item.qty} ${item.unit}</small></div>
                <div>
                    ₹${item.qty * item.price}
                    ${item.bargain_id ? `<span class="bargain-tag">Bargain</span>` : ``}
                    <span class="remove-icon" onclick="removeFromCart(${i})">✖</span>
                </div>
            </div>`;
    }).join('');
    if (totalFooter) totalFooter.innerText = "Total: ₹" + total;
}

// ---------------- ORDER FLOW ----------------

function placeOrder() {
    if (!appState.isLoggedIn) {
        alert("Please Login to Place Order");
        showLogin();
        return;
    }
    if (appState.role === 'supplier') {
        alert("Suppliers cannot place orders. Please use a Vendor account.");
        return;
    }
    if (cart.length === 0) return alert("Cart empty");
    showLoanOptions();
}

function showLoanOptions() {
    const originalTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const memberCount = (myFriends ? myFriends.length : 0) + 1;
    const hasGroupDiscount = memberCount >= 5;
    const finalTotal = hasGroupDiscount ? (originalTotal * 0.9) : originalTotal;

    let popup = document.getElementById("loan-popup-dynamic");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "loan-popup-dynamic";
        popup.className = "loan-popup";
        document.body.appendChild(popup);
    }

    popup.classList.remove('hidden');
    popup.innerHTML = `
        <div class="loan-box">
            <h3>Choose Payment Option</h3>
            ${hasGroupDiscount ? `
                <p style="color:#27ae60; font-weight:bold; margin-bottom:5px;">
                    Group Discount Applied (5+ Members)
                </p>
                <p>Original: <del>₹${originalTotal}</del></p>
                <p>Total Amount: <strong style="font-size:1.4rem;">₹${finalTotal.toFixed(2)}</strong></p>
            ` : `
                <p>Total Amount: <strong>₹${originalTotal}</strong></p>
                <p style="font-size:0.8rem; color:#666;">
                    Tip: Add ${5 - memberCount} more friends to unlock 10% discount!
                </p>
            `}
            <button class="btn-primary" onclick="payFull(${finalTotal})">Pay Full</button>
            <button class="btn-primary" style="background:#f39c12; margin-top:10px;" onclick="payLater(${finalTotal})">7-Day Microloan</button>
            <button class="btn-primary" style="background:#ccc; color:#333; margin-top:10px;" onclick="closeLoanPopup()">Cancel</button>
        </div>
    `;
}

function payFull(total) {
    finalizeOrder(total, "Paid");
}

function payLater(total) {
    finalizeOrder(total, "Credit");
}

async function finalizeOrder(total, paymentStatus) {
    const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_id: appState.id, total_amount: total, items: cart, payment: paymentStatus })
    });
    const data = await res.json();
    if (data.success) {
        showSuccessPopup(
            paymentStatus === "Paid" ? "Payment Successful!" : "Microloan Approved!",
            paymentStatus === "Paid"
                ? `₹${total.toFixed(2)} has been paid successfully. Your order is now being processed.`
                : `₹${total.toFixed(2)} has been credited to your account. Your payment is due in 7 days.`
        );
        cart = [];
        updateCartUI();
        closeLoanPopup();
        if (!document.getElementById('cart-sidebar').classList.contains('cart-hidden')) toggleCart();
        fetchVendorOrders(renderRecommendationSection);
        fetchTrendData();
        showPreviousOrders();
    } else {
        alert(data.message || "Order failed");
    }
}

function showSuccessPopup(title, message) {
    const overlay = document.createElement("div");
    overlay.className = "custom-popup-overlay";
    overlay.innerHTML = `
        <div class="custom-popup-box">
            <div class="success-icon">✅</div>
            <h2>${title}</h2>
            <p>${message}</p>
            <button class="btn-primary" onclick="this.parentElement.parentElement.remove()">Great!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
    }, 4000);
}

function closeLoanPopup() {
    const popup = document.getElementById("loan-popup-dynamic");
    if (popup) popup.classList.add('hidden');
}

// ---------------- SUPPLIER DASHBOARD ----------------

function showSellerDashboard() {
    hideAllPages();
    const dash = document.getElementById('seller-dashboard');
    dash.classList.remove('hidden');
    if (!appState.id) {
        dash.innerHTML = `<p>Please login as a supplier.</p>`;
        return;
    }
    fetch(`${API_BASE}/api/bargains?supplierId=${appState.id}`)
        .then(res => res.json())
        .then(data => {
            const rows = (data.data || []).map(b => `
                <tr>
                    <td>${b.vendor_name}</td>
                    <td>${b.product_name}</td>
                    <td>₹${b.offer_price}</td>
                    <td>${b.quantity}</td>
                    <td>
                        ${b.status === "Pending" ? `
                            <button onclick="updateBargainStatus(${b.id}, 'Accepted')" style="color:green; cursor:pointer; background:none; border:none;">Accept</button>
                            <button onclick="updateBargainStatus(${b.id}, 'Rejected')" style="color:red; cursor:pointer; background:none; border:none; margin-left:8px;">Reject</button>
                        ` : `<span class="status-pill ${String(b.status || '').toLowerCase()}">${b.status || "Pending"}</span>`}
                    </td>
                </tr>`).join('');
            dash.innerHTML = `
                <div class="container">
                    <h2>Bargain Requests</h2>
                    <div class="trend-section">
                        <table class="seller-table">
                            <thead><tr><th>Vendor</th><th>Product</th><th>Offer</th><th>Qty</th><th>Action</th></tr></thead>
                            <tbody>${rows || '<tr><td colspan="5">No active requests</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>`;
        })
        .catch(() => {
            dash.innerHTML = `<p>Unable to load bargains.</p>`;
        });
}

function updateBargainStatus(id, status) {
    fetch(`${API_BASE}/api/bargains/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
    }).then(() => showSellerDashboard());
}

async function showSalesOverview() {
    if (!appState.isLoggedIn || !appState.id) {
        alert("Please login as a supplier to view sales.");
        showLogin();
        return;
    }
    hideAllPages();
    const dash = document.getElementById('seller-dashboard');
    dash.classList.remove('hidden');
    dash.innerHTML = `<h2>Loading Sales Overview...</h2>`;

    try {
        console.log(`Fetching orders for supplier: ${appState.id}`);
        const res = await fetch(`${API_BASE}/api/supplier/orders?userId=${appState.id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message);

                const orders = json.data || [];
                console.log(`Loaded ${orders.length} orders`);
                
                if (orders.length === 0) {
                    dash.innerHTML = `
                        <div class="container">
                            <h2>Sales Overview</h2>
                            <p>No orders found yet for your products.</p>
                            <button class="btn-primary" style="width:auto; padding:8px 15px;" onclick="showSalesOverview()">Refresh</button>
                        </div>
                    `;
                    return;
                }
        
                const orderRows = orders.map(o => {
                    console.log(`Rendering order: ${o.id}, Items: ${o.items.length}`);
                    return `
                    <div class="prod-card" style="margin-bottom:20px; width:100%; max-width:none; text-align:left;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <h3>Order #${o.id} - <span class="status-pill ${(o.status || 'processing').toLowerCase()}">${o.status}</span></h3>
                                <p><strong>Customer:</strong> ${o.vendor?.business || 'Unknown'} (${o.vendor?.name || 'N/A'})</p>
                                <p><strong>Date:</strong> ${new Date(o.date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                ${(o.status === 'Processing') ? `
                                    <button class="btn-primary" style="width:auto; padding:8px 15px; margin-right:10px;" onclick="updateOrderStatus(${o.id}, 'Accepted')">Accept</button>
                                    <button class="btn-primary" style="width:auto; padding:8px 15px; background:#e74c3c;" onclick="updateOrderStatus(${o.id}, 'Rejected')">Reject</button>
                                ` : ''}
                            </div>
                        </div>
                        <hr style="margin:10px 0; border:0; border-top:1px solid #eee;">
                        <table style="width:100%; text-align:left;">
                            <thead>
                                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
                            </thead>
                            <tbody>
                                ${o.items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.quantity} ${item.unit}</td>
                                        <td>₹${item.price}</td>
                                        <td>₹${(item.quantity * item.price).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <p style="text-align:right; margin-top:10px;"><strong>Total Amount: ₹${Number(o.total || 0).toFixed(2)}</strong></p>
                    </div>
                `;}).join('');
        
                dash.innerHTML = `
                    <div class="container">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h2>Sales Overview</h2>
                            <button class="btn-primary" style="width:auto; padding:8px 15px;" onclick="showSalesOverview()">Refresh</button>
                        </div>
                        <p>Total Products: ${supplierProducts.length}</p>
                        <div id="supplier-orders-list">
                            ${orderRows}
                        </div>
                    </div>
                `;
        
    } catch (err) {
        console.error(err);
        dash.innerHTML = `<h2>Error loading sales overview</h2><p>${err.message}</p>`;
    }
}

async function updateOrderStatus(orderId, status) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this order?`)) return;
    try {
        const sId = Number(appState.id);
        const res = await fetch(`${API_BASE}/api/supplier/orders/${orderId}/status?supplierId=${sId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplier_id: sId, status })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Order #${orderId} has been ${status.toLowerCase()}.`);
            showSalesOverview();
        } else {
            alert(data.message || "Failed to update order status.");
        }
    } catch (err) {
        console.error(err);
        alert("Server error updating order status: " + err.message);
    }
}

async function showManageInventory() {
    hideAllPages();
    document.getElementById('seller-dashboard').classList.remove('hidden');
    const stockWarningThreshold = 50;
    const inventoryRows = supplierProducts.map(p => {
        const stock = Number(p.stock_quantity ?? 0);
        const isLow = stock <= stockWarningThreshold;
        const stockClass = isLow ? "stock-pill low" : "stock-pill";
        const stockLabel = isLow ? `${stock} Low` : `${stock}`;
        return `
            <tr>
                <td>${p.name}</td>
                <td><input type="number" class="supplier-input" value="${p.price}" onchange="updateProductRow(${p.id}, ${p.moq}, this)"></td>
                <td>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <button class="qty-btn" onclick="adjustStock(${p.id}, -10)">-10</button>
                        <input type="number" class="supplier-input" style="width:70px;" value="${p.stock_quantity ?? 0}" onchange="updateProductRow(${p.id}, ${p.moq}, this)">
                        <button class="qty-btn" onclick="adjustStock(${p.id}, 10)">+10</button>
                    </div>
                </td>
                <td><span class="${stockClass}">${stockLabel}</span></td>
                <td><button class="supplier-icon-btn" onclick="deleteProduct(${p.id})">Delete</button></td>
            </tr>`;
    }).join('');
    document.getElementById('seller-dashboard').innerHTML = `
        <div class="supplier-inventory">
            <div class="inventory-header">
                <h2>Manage Inventory</h2>
                <p>Keep your catalog accurate for better visibility and orders.</p>
            </div>
            <div class="trend-section inventory-form">
                <h3>Add Product</h3>
                <div class="inventory-grid">
                    <input type="text" id="add-name" class="supplier-input" placeholder="Name">
                    <input type="number" id="add-price" class="supplier-input" placeholder="Price">
                    <input type="number" id="add-moq" class="supplier-input" placeholder="MOQ">
                    <input type="text" id="add-unit" class="supplier-input" placeholder="Unit (kg/L)">
                    <input type="number" id="add-stock" class="supplier-input" placeholder="Stock Qty" min="1">
                </div>
                <button class="supplier-btn" onclick="addProduct()">➕ Add</button>
            </div>
            <table class="seller-table inventory-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Stock Qty</th>
                        <th>Remaining Stock</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventoryRows || `<tr><td colspan="5">No products found.</td></tr>`}
                </tbody>
            </table>
        </div>`;
}

async function adjustStock(id, change) {
    try {
        const res = await fetch(`${API_BASE}/api/products/${id}/stock`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supplier_id: appState.id, change })
        });
        const data = await res.json();
        if (data.success) {
            fetchSupplierProducts();
        } else {
            alert(data.message || "Stock update failed");
        }
    } catch (err) {
        console.error(err);
        alert("Server error adjusting stock");
    }
}

async function addProduct() {
    const stockQuantity = Number(document.getElementById('add-stock').value);
    if (!Number.isFinite(stockQuantity) || stockQuantity <= 0) {
        alert("Please enter a valid stock quantity.");
        return;
    }
    const payload = {
        supplier_id: appState.id,
        name: document.getElementById('add-name').value,
        price: document.getElementById('add-price').value,
        moq: document.getElementById('add-moq').value,
        unit: document.getElementById('add-unit').value,
        category: 'general',
        stock_quantity: stockQuantity
    };
    const res = await fetch(`${API_BASE}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if ((await res.json()).success) fetchSupplierProducts();
}

async function updateProduct(id, price, moq, stockQuantity) {
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, moq, stock_quantity: stockQuantity })
    });
    const data = await res.json();
    if (data.success) fetchSupplierProducts();
}

function updateProductRow(id, moq, inputEl) {
    const row = inputEl.closest('tr');
    if (!row) return;
    const inputs = row.querySelectorAll('input.supplier-input');
    const price = inputs[0]?.value;
    const stockQuantity = inputs[1]?.value;
    updateProduct(id, price, moq, stockQuantity);
}

async function deleteProduct(id) {
    if (confirm("Delete?")) {
        await fetch(`${API_BASE}/api/products/${id}`, { method: "DELETE" });
        fetchSupplierProducts();
    }
}

function showPastCustomers() {
    hideAllPages();
    const dash = document.getElementById('seller-dashboard');
    dash.classList.remove('hidden');

    fetchSupplierCustomers();
}

async function fetchSupplierCustomers() {
    const dash = document.getElementById('seller-dashboard');
    if (!dash) return;
    if (!appState.id) {
        dash.innerHTML = `<p>Please login as a supplier.</p>`;
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/supplier/customers?userId=${appState.id}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Failed to load customers");
        renderSupplierCustomers(json.data || []);
    } catch (err) {
        console.error(err);
        dash.innerHTML = `<p>Unable to load customers.</p>`;
    }
}

function renderSupplierCustomers(customers) {
    const dash = document.getElementById('seller-dashboard');
    if (!dash) return;
    dash.innerHTML = `
        <div class="container">
            <h2>Past Customers List</h2>
            <div class="trend-section" style="padding:20px;">
                <table class="seller-table">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Total Orders</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.length > 0 ? customers.map(c => `
                            <tr>
                                <td><strong>${c.vendor_business || c.vendor_name || "Vendor"}</strong><br><small>${c.vendor_name || ""}</small></td>
                                <td>${c.total_orders}</td>
                                <td>
                                    <button class="btn-primary" style="padding:5px 10px; width:auto;" onclick="alert('Messaging ${c.vendor_name || "Vendor"}...')">Message</button>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="3">No past customers found yet.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ---------------- VENDOR ORDERS ----------------

function showPreviousOrders() {
    hideAllPages();
    document.getElementById('previous-orders-page').classList.remove('hidden');
    fetchVendorOrders(renderOrderHistory);
}

function renderOrderHistory() {
    const container = document.getElementById('previous-orders-list');
    if (!container) return;
    container.innerHTML = vendorOrders.length ? vendorOrders.map(o => `
        <div class="prod-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Order #${o.id}</h3>
                <span class="status-pill ${o.status.toLowerCase()}">${o.status || "Processing"}</span>
            </div>
            <p>Date: ${o.date ? new Date(o.date).toLocaleDateString() : new Date().toLocaleDateString()}</p>
            <ul style="margin:10px 0; padding-left:20px;">
                ${(o.items || []).map(i => `<li>${i.name}: ${i.quantity || i.qty} ${i.unit} @ ₹${i.price}</li>`).join('')}
            </ul>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
                <strong>Total: ₹${Number(o.total || o.total_amount).toFixed(2)}</strong>
                ${o.status === 'Accepted' ? '<span style="color:#27ae60; font-weight:bold;">✅ Confirmed by Supplier</span>' : ''}
                ${o.status === 'Rejected' ? '<span style="color:#e74c3c; font-weight:bold;">❌ Rejected by Supplier</span>' : ''}
            </div>
        </div>`).join('') : "<p>No orders found.</p>";
}

function showTrackingPage() {
    hideAllPages();
    document.getElementById('tracking-page').classList.remove('hidden');
    fetchVendorOrders(renderTracking);
}

function renderTracking() {
    const container = document.getElementById('tracking-list');
    if (!container) return;
    container.innerHTML = vendorOrders.length ? vendorOrders.map(o => `
        <div class="prod-card">
            <h3>Order ID: ${o.id}</h3>
            <p>Status: ${o.status || "Processing"}</p>
            <div style="background: #eee; border-radius: 10px; height: 10px; width: 100%; margin: 10px 0;">
                <div style="background: #27ae60; width: 50%; height: 100%; border-radius: 10px;"></div>
            </div>
            <p><small>Estimated Delivery: 2 Days</small></p>
        </div>`).join('') : "<p style='padding:20px; text-align:center;'>No active orders to track.</p>";
}

// ---------------- ABOUT / SUPPORT / REVIEWS ----------------

function showAbout() {
    hideAllPages();
    document.getElementById('about-page').classList.remove('hidden');
}

function showSupportPage() {
    hideAllPages();
    document.getElementById('support-page').classList.remove('hidden');
}

function submitSupport() {
    const subject = document.getElementById("support-subject").value;
    const message = document.getElementById("support-message").value;
    const type = document.getElementById("support-type").value;

    if (!subject || !message) {
        alert("Please fill all fields");
        return;
    }

    if (!appState.id) return alert("Please login first.");
    fetch(`${API_BASE}/api/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: appState.id, subject, message, type })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            alert("Your " + type + " has been submitted successfully!");
            document.getElementById("support-subject").value = "";
            document.getElementById("support-message").value = "";
        })
        .catch(() => alert("Unable to submit support request."));
}

function showReviewsPage() {
    hideAllPages();
    document.getElementById('reviews-page').classList.remove('hidden');
    const container = document.getElementById('reviews-list');
    if (!container) return;
    if (vendorOrders.length === 0) {
        fetchVendorOrders(renderReviewsList);
    } else {
        renderReviewsList();
    }
}

function renderReviewsList() {
    const container = document.getElementById('reviews-list');
    if (!container) return;
    if (vendorOrders.length === 0) {
        container.innerHTML = "<p>No completed orders available for rating.</p>";
        return;
    }
    container.innerHTML = vendorOrders.map((o, index) => `
        <div class="prod-card">
            <h3>Order ID: ${o.id}</h3>
            <p>Total: ₹${o.total || o.total_amount}</p>
            <div>
                ${[1,2,3,4,5].map(star => 
                    `<span onclick="selectRating(${index}, ${star})" id="star-${index}-${star}" class="star">☆</span>`
                ).join('')}
            </div>
            <textarea id="review-${index}" class="input-field" placeholder="Write feedback..."></textarea>
            <button class="btn-primary" onclick="submitReview(${index})">Submit Review</button>
        </div>
    `).join('');
}

function selectRating(orderIndex, rating) {
    for (let i = 1; i <= 5; i++) {
        const star = document.getElementById(`star-${orderIndex}-${i}`);
        if (star) star.innerHTML = i <= rating ? "⭐" : "☆";
    }
    vendorOrders[orderIndex].rating = rating;
}

function submitReview(orderIndex) {
    const reviewText = document.getElementById(`review-${orderIndex}`).value;

    if (!vendorOrders[orderIndex].rating) {
        const successBox = document.getElementById("review-success");
        successBox.innerText = "⚠ Please select rating before submitting.";
        successBox.classList.remove("hidden");
        return;
    }

    if (!appState.id) return alert("Please login first.");
    fetch(`${API_BASE}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            order_id: vendorOrders[orderIndex].id,
            vendor_id: appState.id,
            rating: vendorOrders[orderIndex].rating,
            review_text: reviewText
        })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || "Failed");
            vendorOrders[orderIndex].review = reviewText;
            const successBox = document.getElementById("review-success");
            successBox.innerText = "✅ Review submitted successfully!";
            successBox.classList.remove("hidden");
            setTimeout(() => {
                successBox.classList.add("hidden");
            }, 3000);
        })
        .catch(() => alert("Unable to submit review."));
}

// ---------------- CHAT ----------------

function toggleChatWindow() {
    if (!appState.isLoggedIn) {
        alert("Please login to use the chat assistant.");
        showLogin();
        return;
    }
    document.getElementById("chat-window")?.classList.toggle("hidden");
}

function handleChatKey(event) {
    if (event.key === "Enter") sendChatMessage();
}

function appendChatBubble(className, text, messageId = "") {
    const chatBody = document.getElementById("chat-body");
    if (!chatBody) return;
    const node = document.createElement("div");
    node.className = className;
    if (messageId) node.id = messageId;
    node.textContent = text;
    chatBody.appendChild(node);
    chatBody.scrollTop = chatBody.scrollHeight;
}

async function sendChatMessage() {
    if (!appState.isLoggedIn) {
        alert("Please login to use the chat assistant.");
        showLogin();
        return;
    }
    const input = document.getElementById("chat-input");
    const message = input?.value.trim();
    if (!message) return;

    appendChatBubble("user-msg", message);
    input.value = "";

    const thinkingId = `thinking-${Date.now()}`;
    appendChatBubble("bot-msg", "Thinking...", thinkingId);

    try {
        const response = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        const botMessage = data.reply || "No response available.";
        const target = document.getElementById(thinkingId);
        if (target) target.textContent = botMessage;
    } catch (error) {
        const target = document.getElementById(thinkingId);
        if (target) target.textContent = "Chat service unavailable. Please try again.";
    }
}

function updateChatAccess() {
    const container = document.getElementById("chatbot-container");
    if (!container) return;
    container.classList.toggle("hidden", !appState.isLoggedIn);
    if (!appState.isLoggedIn) {
        document.getElementById("chat-window")?.classList.add("hidden");
    }
}

// ---------------- INIT ----------------

window.onload = () => {
    const saved = localStorage.getItem("userData");
    if (saved) {
        appState = JSON.parse(saved);
        appState.role = String(appState.role || "").toLowerCase();
        if (appState.isLoggedIn) {
            login();
        } else {
            hideAllPages();
            document.getElementById('landing-page').classList.remove('hidden');
            fetchAllProducts();
        }
    } else {
        hideAllPages();
        document.getElementById('landing-page').classList.remove('hidden');
        fetchAllProducts();
    }
    updateChatAccess();
    updateAuthUI();
    document.addEventListener("keydown", handleGlobalEnter);
};
