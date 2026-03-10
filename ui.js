// ==========================================
//  UI — Navigation, Theme, Modals, FAB, Gestures
// ==========================================

// --- THEME ---
function initTheme() {
    if (localStorage.getItem(CONFIG_KEYS.THEME) === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.className = 'fa-solid fa-sun';
    }
}

window.toggleTheme = function () {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem(CONFIG_KEYS.THEME, isDark ? 'dark' : 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

// --- NAVIGATION ---
function showSection(sectionId, element) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');
    if (element) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    }
    if (sectionId === 'multi-calculator') renderOrderList();
    if (sectionId === 'transactions') renderTransactionHistory();
    if (sectionId === 'admin-panel') { renderPerfumeList(); renderInventoryList(); renderBottleList(); }
    if (sectionId === 'expenses') renderExpenseList();
    if (sectionId === 'dashboard') updateDashboard();
    if (sectionId === 'tasks') renderTasks();
}
window.showSection = showSection;

// --- POPULATE FORM OPTIONS ---
function populateFormOptions() {
    const markupSelects = document.querySelectorAll('#saleMarkupTierSingle, #saleMarkupTierOrder, #calcMarkupTier, #priceListMarkup');
    const sourceSelects = document.querySelectorAll('#saleSourceSingle, #saleSourceOrder, #historyFilterSource');
    const flaconSelects = document.querySelectorAll('#flaconVolume, #orderFlaconVolume, #calcFlaconVolume');

    markupSelects.forEach(s => s.innerHTML = '');
    sourceSelects.forEach(s => s.innerHTML = '<option value="">Всі</option>');
    flaconSelects.forEach(s => s.innerHTML = '');

    const fragMarkup = document.createDocumentFragment();
    Object.keys(MARKUP_PRESETS).forEach(name => {
        const option = document.createElement('option');
        option.value = name; option.textContent = `${name} (+${(MARKUP_PRESETS[name] * 100).toFixed(0)}%)`;
        fragMarkup.appendChild(option);
    });
    markupSelects.forEach(s => s.appendChild(fragMarkup.cloneNode(true)));

    const fragFlacon = document.createDocumentFragment();
    FLACON_VOLUMES.sort((a, b) => a - b).forEach(vol => {
        const option = document.createElement('option');
        option.value = vol; option.textContent = `${vol} мл (${FLACON_COSTS[vol] || 0} грн)`;
        fragFlacon.appendChild(option);
    });
    flaconSelects.forEach(s => s.appendChild(fragFlacon.cloneNode(true)));

    const fragSource = document.createDocumentFragment();
    SALES_SOURCES.forEach(source => {
        const option = document.createElement('option'); option.value = source; option.textContent = source;
        fragSource.appendChild(option);
    });
    sourceSelects.forEach(s => s.appendChild(fragSource.cloneNode(true)));

    const perfumeList = document.getElementById('perfumeList');
    if (perfumeList) {
        perfumeList.innerHTML = '';
        const fragPerfume = document.createDocumentFragment();
        Object.keys(PERFUME_PRICES).sort().forEach(name => {
            const option = document.createElement('option'); option.value = name;
            fragPerfume.appendChild(option);
        });
        perfumeList.appendChild(fragPerfume);
    }

    const clientList = document.getElementById('clientList');
    if (clientList) {
        clientList.innerHTML = '';
        const clients = new Set(getTransactions().map(t => t.clientName).filter(Boolean));
        const fragClient = document.createDocumentFragment();
        clients.forEach(name => {
            const option = document.createElement('option'); option.value = name;
            fragClient.appendChild(option);
        });
        clientList.appendChild(fragClient);
    }

    const smmSelect = document.getElementById('smmPerfumeSelect');
    if (smmSelect) {
        smmSelect.innerHTML = '<option value="">-- Оберіть парфум --</option>';
        const fragSMM = document.createDocumentFragment();
        Object.keys(PERFUME_PRICES).sort().forEach(name => {
            const option = document.createElement('option'); option.value = name; option.textContent = name;
            fragSMM.appendChild(option);
        });
        smmSelect.appendChild(fragSMM);
    }
}
window.populateFormOptions = populateFormOptions;

// --- MODAL UTILS ---
function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = '';
}
window.closeModal = closeModal;

// Click-outside to close modals
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// --- RECEIPT MODAL ---
function generateReceiptHTML(orderItems, totalOriginal, clientName, ttn = null, discount = 0) {
    const discountAmount = totalOriginal * (discount / 100);
    const finalTotal = totalOriginal - discountAmount;
    const date = new Date().toLocaleDateString('uk-UA');

    const itemsHtml = orderItems.map((item, index) =>
        `<p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 0.95rem;"><span>${index + 1}. ${item.name} (${item.vol} мл)</span><span class="text-bold">${item.revenue.toFixed(2)} ₴</span></p>`
    ).join('');
    const ttnDisplay = ttn ? `<p style="margin: 10px 0; font-weight: 600;">📦 ТТН: ${ttn}</p>` : '';

    let totalsHtml = `<div class="receipt-total">До сплати: ${finalTotal.toFixed(2)} ₴</div>`;
    if (discount > 0) {
        totalsHtml = `
            <div style="border-top: 2px dashed var(--border); margin-top:15px; padding-top:10px; text-align:right;">
                <p>Сума: ${totalOriginal.toFixed(2)} ₴</p>
                <p style="color:var(--secondary);">Знижка (${discount}%): -${discountAmount.toFixed(2)} ₴</p>
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary); margin-top:5px;">Разом: ${finalTotal.toFixed(2)} ₴</div>
            </div>`;
    }

    return `<div style="max-width: 300px; margin: 0 auto; padding: 15px; border: 1px dashed var(--border); border-radius: 5px; font-family: monospace; color: var(--text-main);">
        <h3 style="text-align: center; margin-bottom: 5px; color: var(--primary);">PerfumeFlow</h3>
        <p style="text-align: center; margin-bottom: 15px; border-bottom: 1px dashed var(--border); padding-bottom: 5px; font-size: 0.85rem;">Дата: ${date} | Клієнт: ${clientName}</p>
        ${itemsHtml}${ttnDisplay}${totalsHtml}
        <p style="text-align: center; margin-top: 20px; font-size: 0.9rem; color: var(--text-muted);" class="no-print">Дякуємо!</p>
        <div class="no-print admin-buttons-group" style="margin-top: 20px; text-align: center; display: flex; gap: 10px;">
            <button onclick="window.print()" style="background-color: var(--secondary); flex-grow: 1; color: white; border: none; border-radius: 4px; padding: 8px;">🖨️ Друк</button>
            <button onclick="closeReceiptModal()" style="background-color: var(--text-muted); flex-grow: 1; color: white; border: none; border-radius: 4px; padding: 8px;">Закрити</button>
        </div>
    </div>`;
}

function showModalReceipt(orderItems, totalRounded, clientName, ttn = null, discount = 0) {
    const receiptContent = document.getElementById('receiptContent');
    if (receiptContent) receiptContent.innerHTML = generateReceiptHTML(orderItems, totalRounded, clientName, ttn, discount);
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.add('active');
}
window.showModalReceipt = showModalReceipt;
window.closeReceiptModal = function () { closeModal('receiptModal'); };

// --- SYNC MODAL ---
window.showSyncModal = function () {
    const allData = {};
    Object.values(CONFIG_KEYS).forEach(key => allData[key] = JSON.parse(localStorage.getItem(key) || 'null'));
    const out = document.getElementById('syncDataOutput');
    if (out) out.value = JSON.stringify(allData);
    const modal = document.getElementById('syncModal');
    if (modal) modal.classList.add('active');
};
window.closeSyncModal = function () { closeModal('syncModal'); };
window.copySyncData = function () {
    const el = document.getElementById('syncDataOutput');
    if (el) { el.select(); document.execCommand('copy'); showToast('Скопійовано!', 'success'); }
};
window.importDataFromSync = function () {
    try {
        const data = JSON.parse(document.getElementById('syncDataInput').value);
        if (confirm('Це перезапише дані! Продовжити?')) {
            Object.keys(data).forEach(key => { if (data[key]) localStorage.setItem(key, JSON.stringify(data[key])); });
            location.reload();
        }
    } catch (e) { showToast('Помилка формату', 'error'); }
};

// --- EXPORT / IMPORT ---
window.exportDataToJSON = function () {
    const allData = {};
    Object.values(CONFIG_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        allData[key] = item ? JSON.parse(item) : null;
    });
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dl = document.createElement('a');
    dl.setAttribute('href', url);
    dl.setAttribute('download', 'crm_backup_' + new Date().toISOString().slice(0, 10) + '.json');
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
    URL.revokeObjectURL(url);
    showToast('Бек-ап успішно створено!', 'success');
};

window.importDataFromJSON = function () {
    const fileInput = document.getElementById('importFileInput');
    if (!fileInput.files || !fileInput.files.length) {
        showToast('⚠️ Виберіть файл перед відновленням!', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('⚠️ УВАГА: Всі поточні дані будуть замінені даними з файлу. Продовжити?')) {
                Object.keys(data).forEach(key => {
                    if (Object.values(CONFIG_KEYS).includes(key) && data[key] !== null) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                });
                showToast('Дані успішно відновлено! Оновлення...', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        } catch (err) {
            showToast(`❌ Помилка читання файлу: ${err.message}`, 'error');
        }
    };
    reader.onerror = function () { showToast('❌ Помилка завантаження файлу', 'error'); };
    reader.readAsText(fileInput.files[0]);
};

// --- SETTINGS MODAL ---
window.openSettingsModal = function () {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.style.display = 'block';
    const apiInput = document.getElementById('apiKeyInput');
    if (apiInput) apiInput.value = localStorage.getItem('gemini_api_key') || '';
    const config = typeof getSupabaseConfig === 'function' ? getSupabaseConfig() : {};
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.key || '';
    if (typeof updateSyncStatus === 'function') updateSyncStatus();
    const savedModel = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
    const modelSelect = document.getElementById('geminiModelSelect');
    if (modelSelect) modelSelect.value = savedModel;
};
window.closeSettingsModal = function () { closeModal('settingsModal'); };
window.saveApiKey = function (key) { localStorage.setItem('gemini_api_key', key.trim()); showToast('Ключ збережено', 'success'); };
window.saveGeminiKey = function (key) { window.saveApiKey(key); };

// --- FAB MENU ---
window.toggleFabMenu = function () {
    const menu = document.getElementById('fabMenu');
    const button = document.querySelector('.fab-button');
    if (menu) menu.classList.toggle('active');
    if (button) button.classList.toggle('active');
};

window.fabAction = function (action) {
    toggleFabMenu();
    switch (action) {
        case 'order':
            showSection('multi-calculator', document.querySelectorAll('.nav-btn')[1]);
            setTimeout(() => document.getElementById('orderPerfumeName')?.focus(), 300);
            break;
        case 'scan':
            showSection('admin-panel', document.querySelectorAll('.nav-btn')[6]);
            setTimeout(() => {
                const scanInput = document.getElementById('inventoryBarcodeScan');
                if (scanInput) { scanInput.focus(); scanInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            }, 300);
            break;
        case 'task':
            showSection('tasks', document.querySelectorAll('.nav-btn')[3]);
            if (typeof switchTaskTab === 'function') switchTaskTab('manual');
            setTimeout(() => document.getElementById('manualTaskInput')?.focus(), 300);
            break;
    }
};

// Close FAB when clicking outside
document.addEventListener('click', (e) => {
    const fabContainer = document.querySelector('.fab-container');
    const fabMenu = document.getElementById('fabMenu');
    if (fabMenu && fabContainer && !fabContainer.contains(e.target)) {
        fabMenu.classList.remove('active');
        document.querySelector('.fab-button')?.classList.remove('active');
    }
});

// --- SAVE SETTINGS ---
window.saveSettings = function () {
    const key = document.getElementById('apiKeyInput')?.value?.trim();
    const model = document.getElementById('geminiModelSelect')?.value;
    if (key) localStorage.setItem('gemini_api_key', key);
    if (model) localStorage.setItem('gemini_model', model);
    showToast('Налаштування збережено', 'success');
    closeSettingsModal();
};

// --- MOBILE TOUCH GESTURES (REMOVED) ---
// Native browser pull-to-refresh is sufficient and doesn't cause DOM leaks.

// --- PUSH NOTIFICATIONS ---
window.requestNotificationPermission = async function () {
    if (!('Notification' in window)) { showToast('❌ Ваш браузер не підтримує нотифікації', 'error'); return false; }
    if (Notification.permission === 'granted') { showToast('✅ Нотифікації вже дозволені', 'success'); return true; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        showToast('✅ Нотифікації увімкнено!', 'success');
        scheduleNotificationChecks();
        return true;
    } else { showToast('❌ Нотифікації заблоковані', 'error'); return false; }
};

function showLocalNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, { icon: './icon-192.png', badge: './icon-192.png', vibrate: [200, 100, 200], ...options });
        notification.onclick = () => { window.focus(); notification.close(); };
    }
}

function checkLowStockAlerts() {
    const threshold = 30;
    const lowStockItems = Object.entries(PERFUME_STOCK).filter(([, stock]) => stock > 0 && stock < threshold);
    if (lowStockItems.length > 0 && Notification.permission === 'granted') {
        const names = lowStockItems.map(([name]) => name).slice(0, 3).join(', ');
        showLocalNotification('⚠️ Низький залишок', {
            body: `Закінчується: ${names}${lowStockItems.length > 3 ? ` та інші (${lowStockItems.length - 3})` : ''}`,
            tag: 'low-stock'
        });
    }
}

function checkTaskReminders() {
    const now = new Date();
    const pendingTasks = TASKS.filter(t => !t.completed);
    if (pendingTasks.length > 0 && Notification.permission === 'granted') {
        const todayTasks = pendingTasks.filter(t => new Date(t.timestamp).toDateString() === now.toDateString());
        if (todayTasks.length > 0) {
            showLocalNotification('📋 Нагадування про задачі', {
                body: `У вас ${todayTasks.length} невиконаних задач на сьогодні`,
                tag: 'task-reminder'
            });
        }
    }
}

function scheduleNotificationChecks() {
    setInterval(() => { checkLowStockAlerts(); checkTaskReminders(); }, 60 * 60 * 1000);
    setTimeout(() => { checkLowStockAlerts(); checkTaskReminders(); }, 5000);
}

// Auto-request permission once
if (localStorage.getItem('notification_prompted') !== 'true') {
    setTimeout(() => {
        if (Notification.permission === 'default') {
            const ask = confirm('Увімкнути нотифікації для нагадувань про задачі та низькі залишки?');
            if (ask) requestNotificationPermission();
            localStorage.setItem('notification_prompted', 'true');
        } else if (Notification.permission === 'granted') {
            scheduleNotificationChecks();
        }
    }, 10000);
} else if (Notification.permission === 'granted') {
    scheduleNotificationChecks();
}
