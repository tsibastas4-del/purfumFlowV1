// ==========================================
//  CONFIG & GLOBAL DATA
// ==========================================

const CONFIG_KEYS = {
    PRICES: 'perfumePrices',
    FLACONS: 'flaconCosts',
    VOLUMES: 'flaconVolumes',
    MARKUPS: 'markupPresets',
    SOURCES: 'salesSources',
    TRANSACTIONS: 'transactions',
    EXPENSES: 'expenses',
    INVENTORY: 'perfumeStock',
    BOTTLE_STOCK: 'bottleStock',
    TASKS: 'userTasks',
    COMPLETED_ORDERS: 'perfumeflow_completed_orders',
    THEME: 'themePreference'
};

// ==========================================
//  НАЛАШТУВАННЯ ТЕКСТУ ЗАМОВЛЕННЯ
// ==========================================
const MY_PAYMENT_INFO = `💳 Оплата:
Монобанк: 4441 1111 5956 0303 
`;

const MY_DELIVERY_INFO = `- Олх доставкою, на будь-яку пошту (Комісія OLX: 3% + 35 грн.);
- Повна передоплата на карту, будь яка пошта (нова пошта роблю мінімальну ціну
доставки);`;
// ==========================================

// --- GLOBAL DATA ---
let PERFUME_PRICES = {};
let FLACON_COSTS = { 5: 12, 10: 15, 15: 18, 20: 20, 30: 25, 50: 30, 100: 40 };
let FLACON_VOLUMES = [5, 10, 15, 20, 30, 50, 100];
let MARKUP_PRESETS = { 'Базова': 0.12, 'Стандарт': 0.20, 'Преміум': 0.25 };
let SALES_SOURCES = ['Instagram', 'Viber', 'Telegram', 'OLX', 'Особиста зустріч'];
let PERFUME_STOCK = {};
let BOTTLE_STOCK = {};
let CURRENT_ORDER_LIST = [];
let TASKS = [];
let IS_EDITING_ORDER = null;

// --- GLOBAL FILTERS ---
let CATALOG_FILTERS = {
    gender: 'all',
    season: 'all'
};
let STOCK_FILTER_GENDER = 'all';
let CURRENT_WEEK_OFFSET = 0;
