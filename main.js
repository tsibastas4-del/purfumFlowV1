// ==========================================
//  MAIN — App initialization (DOMContentLoaded)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Set Gemini API key default if missing
    const currentKey = localStorage.getItem('gemini_api_key');
    const defaultKey = 'AIzaSyDYtCM1M61MG18zX3KZD2jfwofLmKvPG9U';
    if (!currentKey || currentKey === 'AIzaSyDHKSxzyfzzcuZlnSox3Taj4L8k0ZPBAzg') {
        localStorage.setItem('gemini_api_key', defaultKey);
    }

    // Load all data
    loadPerfumePrices();
    loadFlaconData();
    loadMarkupPresets();
    loadSalesSources();
    loadInventory();
    loadBottleStock();
    loadSheetMappings();
    TASKS = getTasks();

    // Initialize theme
    initTheme();

    // Populate form dropdowns
    populateFormOptions();
    renderExpenseList();
    updateDashboard();

    // Set initial section
    const dashboardBtn = document.querySelector('.nav-btn');
    showSection('dashboard', dashboardBtn);

    renderOrderList();

    // Ensure settings UI reflects current values
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
    const modelSelect = document.getElementById('geminiModelSelect');
    if (modelSelect) modelSelect.value = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

    // Initialize Supabase if available
    if (typeof initSupabase === 'function') initSupabase();

    // Delay-load tasks
    setTimeout(() => {
        if (typeof renderTasksOrders === 'function') renderTasksOrders();
    }, 1000);

    console.log('🚀 PerfumeFlow CRM Loaded (Modular Architecture)');
});
