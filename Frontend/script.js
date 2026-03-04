// ---------------- DATA & STATE ----------------
let PRODUCTS = [];

let priceTrends = [];

let cart = [];
let previousOrders = [];
let pendingBargains = []; // For Supplier Dashboard
let appState = {
    isLoggedIn: false,
    role: 'vendor',
    userName: '',
    phone: ''
};
let groupOrders = {};
let currentBargainProduct = null;

// ---------------- NAVIGATION ----------------

function toggleSidebar() {
    document.getElementById('left-sidebar').classList.toggle('sidebar-hidden');
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('cart-hidden');
}

function toggleProfileMenu() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
}

function goHome() {
    document.getElementById('previous-orders-page').classList.add('hidden');
    document.getElementById('tracking-page').classList.add('hidden');
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('seller-dashboard').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
}

// ---------------- AUTH & OTP ----------------

function showLogin() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('register-page').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('register-page').classList.remove('hidden');
}

function selectRole(role) {
    appState.role = role;
    document.querySelectorAll('.role-block').forEach(b => b.classList.remove('active-role'));
    document.getElementById('block-' + role).classList.add('active-role');
    document.getElementById('registration-form').classList.remove('hidden');

    if (role === 'supplier') {
        document.getElementById('supplier-product-section').classList.remove('hidden');
    } else {
        document.getElementById('supplier-product-section').classList.add('hidden');
    }
}

async function finalizeRegistration() {
    const full_name = document.getElementById('reg-name').value;
    const business_name = document.getElementById('reg-biz').value;
    const address = document.getElementById('reg-addr').value;
    const phone = document.getElementById('login-phone')?.value || prompt("Enter phone number:");
    const products = document.getElementById('reg-products')?.value;

    const res = await fetch("http://localhost:5000/register-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            full_name,
            business_name,
            address,
            phone,
            role: appState.role,
            products
        })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        const otp = prompt("Enter OTP sent to phone:");
        const verify = await fetch("http://localhost:5000/register-verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp })
        });

        const verifyData = await verify.json();
        alert(verifyData.message);

        if (verifyData.success) {
            showLogin();
        }
    }
}

// NEW: OTP Functions
async function sendOTP() {

    const phone = document.getElementById('login-phone').value.trim();

    if (phone.length < 10) {
        return alert("Enter valid phone number");
    }

    const res = await fetch("http://localhost:5000/login-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        document.getElementById('otp-section').classList.remove('hidden');
    }
}

async function verifyOTP() {

    const phone = document.getElementById('login-phone').value.trim();
    const otp = document.getElementById('otp-input').value.trim();

    const res = await fetch("http://localhost:5000/login-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        appState.userName = data.user.full_name;
        appState.phone = data.user.phone;
        appState.role = data.user.role;
        login();
    }
}

function login() {
    appState.isLoggedIn = true;

    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
    document.getElementById('auth-nav-btn').classList.add('hidden');
    document.getElementById('profile-wrapper').classList.remove('hidden');

    const firstLetter = appState.userName.charAt(0).toUpperCase();
    document.getElementById('profile-icon').innerText = firstLetter;
    document.getElementById('profile-letter').innerText = firstLetter;
    document.getElementById('profile-display-name').innerText = appState.userName;
    document.getElementById('profile-display-phone').innerText = appState.phone || "";
    document.getElementById('menu-btn').classList.remove('hidden');

    setupSidebar();
    renderProducts();
    renderTrendSection();

    if (appState.role === 'supplier') {
        showSellerDashboard();
    } else {
        document.getElementById('hero-section').innerHTML =
            `<h1>Welcome back, ${appState.userName}!</h1>
             <p>Start your bulk procurement today with Direct Bargaining.</p>`;
    }
}

function logout() {
    location.reload();
}

// ---------------- SIDEBAR ----------------

function setupSidebar() {
    const sidebar = document.getElementById('sidebar-content');

    if (appState.role === 'vendor') {
        sidebar.innerHTML = `
            <a href="#" onclick="goHome(); toggleSidebar();">🏠 Home</a>
            <a href="#" onclick="showPreviousOrders(); toggleSidebar();">📦 Previous Orders</a>
            <a href="#" onclick="showTrackingPage(); toggleSidebar();">📍 Tracking Orders</a>
            <a href="#">⚙️ Profile Settings</a>
        `;
    } else {
        sidebar.innerHTML = `
            <a href="#" onclick="showSellerDashboard(); toggleSidebar();">📊 Sales Overview</a>
            <a href="#" onclick="goHome(); toggleSidebar();">🛒 View Marketplace</a>
            <a href="#">📦 Manage Inventory</a>
        `;
    }
}

// ---------------- PRODUCTS & FILTERing ----------------

function renderProducts(filter = "") {
    const grid = document.getElementById('product-list');
    grid.innerHTML = "";
    PRODUCTS
        .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
        .forEach(renderProductCard);
}

async function filterCategory(category) {
    try {
        const res = await fetch("http://localhost:5000/api/products?category=" + category);
        const data = await res.json();
        if (data.success) {
            PRODUCTS = data.products;
            renderProducts();
        }
    } catch (e) {
        console.error(e);
    }
}

async function filterProducts() {
    const val = document.getElementById('landing-search').value;
    try {
        const res = await fetch("http://localhost:5000/api/products?search=" + val);
        const data = await res.json();
        if (data.success) {
            PRODUCTS = data.products;
            renderProducts();
        }
    } catch (e) {
        console.error(e);
    }
}

function renderProductCard(p) {
    const grid = document.getElementById("product-list");
    grid.innerHTML += `
        <div class="prod-card">
            <span class="moq-tag">MOQ: ${p.moq} ${p.unit}</span>
            <h3>${p.name}</h3>
            <p class="price">₹${p.price} / ${p.unit}</p>

            <div class="add-cart-row">
                <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
                <button class="btn-primary add-btn" onclick="addToCart(${p.id})">
                    Add (<span id="qty-${p.id}">${p.moq}</span>)
                </button>
                <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
            </div>

            <button class="group-btn" style="background:#444;" onclick="openBargain(${p.id})">🤝 Bargain Price</button>
            <button class="group-btn" onclick="createGroupOrder(${p.id})">Create Group Order</button>
            <button class="group-btn join-btn hidden" id="join-btn-${p.id}" onclick="joinGroupOrder(${p.id})">Join Group Order</button>
            <p id="group-status-${p.id}" class="group-status hidden">Current Group: 0 ${p.unit}</p>
        </div>
    `;
}

// ---------------- BARGAINING (NEW) ----------------

function openBargain(pid) {
    if (!appState.isLoggedIn) {
        alert("Please login to bargain with suppliers.");
        showLogin();
        return;
    }
    currentBargainProduct = PRODUCTS.find(p => p.id === pid);
    document.getElementById('bargain-prod-name').innerText = currentBargainProduct.name;
    document.getElementById('current-price-display').innerText = "₹" + currentBargainProduct.price + " / " + currentBargainProduct.unit;
    document.getElementById('bargain-modal').classList.remove('hidden');
}

function closeBargain() {
    document.getElementById('bargain-modal').classList.add('hidden');
}

function submitBargain() {
    const offer = document.getElementById('offer-price').value;
    const qty = document.getElementById('offer-qty').value;

    if (!offer || !qty) return alert("Please enter your offer price and quantity.");

    pendingBargains.push({
        vendor: appState.userName,
        product: currentBargainProduct.name,
        original: currentBargainProduct.price,
        offer: offer,
        qty: qty
    });

    alert("Your offer of ₹" + offer + " has been sent to the supplier!");
    closeBargain();
}

// ---------------- GROUP ORDER ----------------

function createGroupOrder(pid) {
    const product = PRODUCTS.find(p => p.id === pid);
    groupOrders[pid] = product.moq;
    document.getElementById(`join-btn-${pid}`).classList.remove("hidden");
    const status = document.getElementById(`group-status-${pid}`);
    status.classList.remove("hidden");
    status.innerText = "Current Group: " + groupOrders[pid] + " " + product.unit;
    alert("Group Order Created 🎉");
}

function joinGroupOrder(pid) {
    const product = PRODUCTS.find(p => p.id === pid);
    if (!groupOrders[pid]) return;
    groupOrders[pid] += product.moq;
    document.getElementById(`group-status-${pid}`).innerText = "Current Group: " + groupOrders[pid] + " " + product.unit;
    if (groupOrders[pid] >= product.moq * 3) {
        alert("🎉 MOQ Achieved! Group Order Ready!");
    }
}

// ---------------- CART & QUANTITY ----------------

function changeQty(pid, direction) {
    const product = PRODUCTS.find(p => p.id === pid);
    const qtyEl = document.getElementById(`qty-${pid}`);
    let qty = parseInt(qtyEl.innerText);
    if (direction === 1) qty += product.moq;
    else if (qty > product.moq) qty -= product.moq;
    qtyEl.innerText = qty;
}

function addToCart(pid) {
    const product = PRODUCTS.find(p => p.id === pid);
    const selectedQty = parseInt(document.getElementById(`qty-${pid}`).innerText);
    const existing = cart.find(x => x.id === pid);
    if (existing) existing.qty += selectedQty;
    else cart.push({ ...product, qty: selectedQty });
    updateCartUI();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.length;
    const container = document.getElementById('cart-items');
    const totalFooter = document.getElementById('cart-total-footer');

    if (cart.length === 0) {
        container.innerHTML = `<p style="padding:20px; text-align:center;">Empty</p>`;
        if (totalFooter) totalFooter.innerText = "";
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += item.qty * item.price;
        return `
            <div class="cart-item">
                <div><b>${item.name}</b><br><small>${item.qty} ${item.unit}</small></div>
                <div>₹${item.qty * item.price} <span onclick="removeFromCart(${index})" style="cursor:pointer;color:red;">❌</span></div>
            </div>`;
    }).join('');
    if (totalFooter) totalFooter.innerText = "Total: ₹" + total;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// ---------------- ORDER FLOW (CHECKOUT FIX) ----------------

function placeOrder() {
    if (!appState.isLoggedIn) {
        alert("Please Login to Place Order");
        showLogin();
        return;
    }
    if (cart.length === 0) {
        alert("Cart is empty");
        return;
    }
    showLoanOptions();
}

function showLoanOptions() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Create modal if not in HTML
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
            <p>Total Amount: <strong>₹${total}</strong></p>
            <button class="btn-primary" onclick="payFull(${total})">Pay Full</button>
            <button class="btn-primary" style="background:#f39c12; margin-top:10px;" onclick="payLater(${total})">7-Day Microloan</button>
            <button class="btn-primary" style="background:#ccc; color:#333; margin-top:10px;" onclick="closeLoanPopup()">Cancel</button>
        </div>
    `;
}

function payFull(total) { alert("Payment Successful! ₹" + total + " Paid."); finalizeOrder("Paid"); }
function payLater(total) { alert("Microloan Approved! ₹" + total + " Due in 7 Days."); finalizeOrder("Credit"); }

async function finalizeOrder(paymentStatus) {
    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    try {
        const res = await fetch("http://localhost:5000/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: cart,
                total: total,
                paymentStatus: paymentStatus,
                phone: appState.phone
            })
        });

        const data = await res.json();
        if (data.success) {
            cart = [];
            updateCartUI();
            closeLoanPopup();
            toggleCart(); // Close cart sidebar
            alert("✅ " + data.message);
            showPreviousOrders();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Server error placing order");
    }
}

function closeLoanPopup() {
    const popup = document.getElementById("loan-popup-dynamic");
    if (popup) popup.classList.add('hidden');
}

// ---------------- PAGES & DASHBOARDS ----------------

async function showPreviousOrders() {
    goHome();
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('previous-orders-page').classList.remove('hidden');

    const container = document.getElementById('previous-orders-list');
    container.innerHTML = "Loading orders...";

    try {
        const res = await fetch("http://localhost:5000/api/orders?phone=" + appState.phone);
        const data = await res.json();

        if (data.success) {
            previousOrders = data.orders;
            container.innerHTML = previousOrders.length ? previousOrders.map(o => `
                <div class="prod-card" style="text-align:left; padding:15px; grid-column: span 1;">
                    <h3 style="margin-top:0;">Order ID: ${o.id}</h3>
                    <p style="margin:5px 0;"><strong>Status:</strong> ${o.status}</p>
                    <p style="margin:5px 0;"><strong>Payment:</strong> <span style="color:${o.payment_status === 'Paid' ? 'green' : '#f39c12'}">${o.payment_status}</span></p>
                    <p style="margin:5px 0;"><strong>Total:</strong> ₹${o.total}</p>
                    <p style="margin:5px 0; font-size:0.85rem; color:#777;">Date: ${new Date(o.created_at).toLocaleString()}</p>
                    
                    <div style="margin-top:10px; padding:10px; background:#f9f9f9; border-radius:5px; max-height:100px; overflow-y:auto; border:1px solid #ddd;">
                        <ul style="margin:0; padding-left:15px; font-size:0.85rem;">
                            ${o.items && o.items.length ? o.items.map(item => `
                                <li style="margin-bottom:3px;">
                                    <b>${item.name}</b> - ${item.qty} ${item.unit} @ ₹${item.price} each = ₹${item.qty * item.price}
                                </li>
                            `).join('') : "<li>No items</li>"}
                        </ul>
                    </div>
                </div>`).join('') : "<p style='grid-column: 1 / -1;text-align:center;'>No past orders found.</p>";
        } else {
            container.innerHTML = "<p>Error loading orders: " + data.message + "</p>";
        }
    } catch (err) {
        container.innerHTML = "<p>Server error loading orders.</p>";
    }
}

function showTrackingPage() {
    goHome();
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('tracking-page').classList.remove('hidden');

    const container = document.getElementById('tracking-list');
    container.innerHTML = previousOrders.length ? previousOrders.map(o => `
        <div class="prod-card">
            <h3>Order ID: ${o.id}</h3>
            <p>Status: 🚚 ${o.status}</p>
            <progress value="50" max="100"></progress>
        </div>`).join('') : "<p>No active orders.</p>";
}

function showSellerDashboard() {
    document.getElementById('landing-page').classList.add('hidden');
    const dash = document.getElementById('seller-dashboard');
    dash.classList.remove('hidden');

    let rows = pendingBargains.map((b, i) => `
        <tr>
            <td>${b.vendor}</td>
            <td>${b.product}</td>
            <td>₹${b.offer}</td>
            <td>${b.qty}</td>
            <td><button onclick="pendingBargains.splice(${i},1); showSellerDashboard();" style="color:green; cursor:pointer;">Accept</button></td>
        </tr>`).join('');

    dash.innerHTML = `
        <div class="container">
            <h2>Supplier Dashboard</h2>
            <div class="trend-section" style="padding:20px;">
                <h3>Incoming Bargain Requests</h3>
                <table style="width:100%; text-align:left; border-collapse:collapse;">
                    <tr style="border-bottom:1px solid #ddd;"><th>Vendor</th><th>Product</th><th>Offer</th><th>Qty</th><th>Action</th></tr>
                    ${rows || '<tr><td colspan="5" style="padding:10px;">No active requests</td></tr>'}
                </table>
            </div>
        </div>`;
}

// ---------------- TRENDS ----------------

async function renderTrendSection() {
    try {
        const res = await fetch("http://localhost:5000/api/price-trends");
        const data = await res.json();
        if (data.success) {
            priceTrends = data.trends;
            const trendList = document.getElementById("trend-list");
            trendList.innerHTML = priceTrends.map(t => {
                const diff = t.new_price - t.old_price;
                const dir = diff >= 0 ? "up" : "down";
                return `
                    <div class="trend-card">
                        <h4>${t.name}</h4>
                        <p><span class="${dir}">${dir === "up" ? "⬆" : "⬇"} ₹${Math.abs(diff)}</span></p>
                        <small>${((diff / t.old_price) * 100).toFixed(1)}% change</small>
                    </div>`;
            }).join('');
        }
    } catch (e) {
        console.error(e);
    }
}

window.onload = async () => {
    try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();
        if (data.success) {
            PRODUCTS = data.products;
            await renderTrendSection();
            renderProducts();
        }
    } catch (err) {
        console.error("Failed to load products from API", err);
    }
};
// ---------------- REGISTER OTP FLOW ----------------

async function registerSendOTP() {

    const formData = new FormData();

    formData.append("full_name", document.getElementById("reg-name").value.trim());
    formData.append("business_name", document.getElementById("reg-biz").value.trim());
    formData.append("address", document.getElementById("reg-addr").value.trim());
    formData.append("phone", document.getElementById("reg-phone").value.trim());
    formData.append("role", appState.role);
    formData.append("products", document.getElementById("reg-products")?.value.trim());

    const fileInput = document.getElementById("reg-aadhaar");

    if (fileInput.files.length > 0) {
        formData.append("aadhaar", fileInput.files[0]);
    }

    const res = await fetch("http://localhost:5000/register-send-otp", {
        method: "POST",
        body: formData   // ⚠ NO JSON HEADERS
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        document.getElementById('register-otp-section').classList.remove('hidden');
    }
}


async function verifyRegisterOTP() {

    const phone = document.getElementById('reg-phone').value.trim();
    const otp = document.getElementById('register-otp-input').value.trim();

    const res = await fetch("http://localhost:5000/register-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp })
    });

    const data = await res.json();
    alert(data.message);

    if (data.success) {
        showLogin();
    }
}