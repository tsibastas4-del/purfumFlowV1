// ==========================================
//  STORAGE — localStorage utilities & data load/save
// ==========================================

function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key, defaultVal) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultVal;
    } catch (e) { return defaultVal; }
}

function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid fa-info-circle"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- DATA LOAD ---
function loadPerfumePrices() { PERFUME_PRICES = getFromLocalStorage(CONFIG_KEYS.PRICES, {}); }
function savePerfumePrices() { saveToLocalStorage(CONFIG_KEYS.PRICES, PERFUME_PRICES); }
function loadFlaconData() {
    FLACON_COSTS = getFromLocalStorage(CONFIG_KEYS.FLACONS, FLACON_COSTS);
    FLACON_VOLUMES = getFromLocalStorage(CONFIG_KEYS.VOLUMES, FLACON_VOLUMES);
}
function loadMarkupPresets() { MARKUP_PRESETS = getFromLocalStorage(CONFIG_KEYS.MARKUPS, MARKUP_PRESETS); }
function loadSalesSources() { SALES_SOURCES = getFromLocalStorage(CONFIG_KEYS.SOURCES, SALES_SOURCES); }
function loadInventory() {
    PERFUME_STOCK = JSON.parse(localStorage.getItem(CONFIG_KEYS.INVENTORY) || '{}');
    Object.keys(PERFUME_PRICES).forEach(name => { if (PERFUME_STOCK[name] === undefined) PERFUME_STOCK[name] = 0; });
    Object.keys(PERFUME_STOCK).forEach(name => { if (PERFUME_PRICES[name] === undefined) delete PERFUME_STOCK[name]; });
    saveInventory();
}

function loadBottleStock() {
    BOTTLE_STOCK = getFromLocalStorage(CONFIG_KEYS.BOTTLE_STOCK, {});
}

function saveInventory() { saveToLocalStorage(CONFIG_KEYS.INVENTORY, PERFUME_STOCK); }
function saveBottleStock() { saveToLocalStorage(CONFIG_KEYS.BOTTLE_STOCK, BOTTLE_STOCK); }

function findBottleForPerfume(perfumeName) {
    let result = [];
    for (const bottleName in BOTTLE_STOCK) {
        const bottleData = BOTTLE_STOCK[bottleName];
        if (bottleData.linkedPerfume === perfumeName && bottleData.qty > 0) {
            result.push({ name: bottleName, ...bottleData });
        }
    }
    return result;
}

function getTransactions() { return getFromLocalStorage(CONFIG_KEYS.TRANSACTIONS, []); }
function saveTransactions(txs) { saveToLocalStorage(CONFIG_KEYS.TRANSACTIONS, txs); }
function getExpenses() { return getFromLocalStorage(CONFIG_KEYS.EXPENSES, []); }
function saveExpenses(exps) { saveToLocalStorage(CONFIG_KEYS.EXPENSES, exps); }

// --- CALC LOGIC ---
function calculateCost(perfumeName, volume, markupTier) {
    const pData = PERFUME_PRICES[perfumeName];
    const flaconCost = FLACON_COSTS[volume] || 0;
    const markup = MARKUP_PRESETS[markupTier] || MARKUP_PRESETS['Стандарт'];
    if (!pData) return null;
    let costPerML = pData.basePrice;
    const perfumeCostTotal = volume * costPerML;
    const costTotal = perfumeCostTotal + flaconCost;
    const profit = costTotal * markup;
    const revenue = costTotal + profit;
    return { costTotal, profit, revenue, flaconCost, perfumeCostTotal };
}

// --- LOYALTY LOGIC ---
function getClientStats(clientName) {
    if (!clientName) return { totalSpend: 0, level: 'Новачок', discount: 0 };
    const txs = getTransactions().filter(t => t.clientName.toLowerCase() === clientName.toLowerCase());
    const totalSpend = txs.reduce((acc, t) => acc + t.revenue, 0);

    let level = 'Новачок';
    let discount = 0;

    if (totalSpend >= 20000) { level = '💎 VIP Platinum'; discount = 0.10; }
    else if (totalSpend >= 10000) { level = '🥇 Gold'; discount = 0.05; }
    else if (totalSpend >= 5000) { level = '🥈 Silver'; discount = 0.03; }

    return { totalSpend, level, discount };
}

window.checkClientLoyalty = function (input) {
    const name = input.value.trim();
    if (!name) return;
    const stats = getClientStats(name);
    if (stats.discount > 0) {
        showToast(`🌟 Клієнт: ${stats.level} (Витрати: ${stats.totalSpend} ₴)`, 'success');
        const discountSelect = document.getElementById('discountSelectOrder');
        if (discountSelect) {
            discountSelect.style.borderColor = 'var(--secondary)';
            discountSelect.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.4)';
        }
    }
}
