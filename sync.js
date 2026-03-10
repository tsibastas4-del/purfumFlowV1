// ==========================================
//  SYNC — Supabase Cloud, Google Sheets, SMM Preview
// ==========================================

let supabaseClient = null;
let SHEET_MAPPINGS = {}; // Stores "Sheet Name" -> "DB Name"

// ==========================================
//  SUPABASE INTEGRATION
// ==========================================
function getSupabaseConfig() {
    return {
        url: localStorage.getItem('supabase_url') || 'https://oxxzlqwnssivwzhalojw.supabase.co',
        key: localStorage.getItem('supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eHpscXduc3Npdnd6aGFsb2p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDU0MjgsImV4cCI6MjA4NTAyMTQyOH0.NsAb_R46ziufVT_5tqqTW9RntLkCdKDjzvd5m234_us'
    };
}

function initSupabase() {
    const config = getSupabaseConfig();
    if (config.url && config.key && window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(config.url, config.key);
            console.log('Supabase Client Initialized');
        } catch (e) {
            console.error('Supabase Init Error', e);
        }
    }
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.key || '';
}

window.saveSupabaseConfig = function () {
    const url = document.getElementById('supabaseUrlInput')?.value?.trim();
    const key = document.getElementById('supabaseKeyInput')?.value?.trim();
    if (url) localStorage.setItem('supabase_url', url);
    if (key) localStorage.setItem('supabase_key', key);
    initSupabase();
};

function updateSyncStatus() {
    const lastSync = localStorage.getItem('last_cloud_sync');
    const lastRestore = localStorage.getItem('last_cloud_restore');
    const el = document.getElementById('syncStatusDisplay');
    if (!el) return;
    el.innerHTML = '';
    if (lastSync) {
        const d = new Date(lastSync);
        el.innerHTML += `<div style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--secondary); border-radius: 4px;">
            <strong>✅ Остання синхронізація:</strong><br>${d.toLocaleString('uk-UA')} (${getTimeAgo(d)})</div>`;
    }
    if (lastRestore) {
        const d = new Date(lastRestore);
        el.innerHTML += `<div style="margin-top: 5px; padding: 10px; background: rgba(79, 70, 229, 0.1); border-left: 3px solid var(--primary); border-radius: 4px;">
            <strong>📥 Останнє відновлення:</strong><br>${d.toLocaleString('uk-UA')} (${getTimeAgo(d)})</div>`;
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'щойно';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} хв тому`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} год тому`;
    return `${Math.floor(seconds / 86400)} дн тому`;
}

window.testSupabaseConnection = async function () {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) { showToast("⚠️ Спочатку введіть URL та Key!", "error"); return; }
    showToast("🔄 Перевірка з'єднання...", "primary");
    try {
        const { error } = await supabaseClient.from('app_data').select('count', { count: 'exact', head: true });
        if (error) throw error;
        showToast("✅ З'єднання успішне! Таблиця app_data знайдена.", "success");
    } catch (error) {
        if (error.code === '42P01') {
            alert("⚠️ З'єднання працює, але таблиця app_data не знайдена!\n\nСтворіть таблицю:\n1. Supabase Dashboard → Table Editor\n2. New Table: app_data\n3. Колонки: id (int8), json_data (jsonb), updated_at (timestamp)");
        } else {
            showToast(`❌ Помилка: ${error.message}`, "error");
        }
    }
};

window.syncWithCloud = async function () {
    if (!supabaseClient) { showToast("⚠️ Налаштуйте Supabase!", "error"); return; }
    if (!confirm("Це синхронізує ваші дані з хмарою. Продовжити?")) return;
    showToast("🔄 Відправка в хмару...", "primary");
    try {
        const allData = {};
        Object.values(CONFIG_KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            allData[key] = item ? ((() => { try { return JSON.parse(item); } catch (e) { return item; } })()) : null;
        });
        const result = await Promise.race([
            supabaseClient.from('app_data').upsert({ id: 1, json_data: allData }).select(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 20000))
        ]);
        if (result.error) throw result.error;
        localStorage.setItem('last_cloud_sync', new Date().toISOString());
        showToast(`✅ Дані збережено в хмару!`, "success");
        updateSyncStatus();
    } catch (error) {
        showToast(`❌ Помилка: ${error.message}`, "error");
    }
};

window.loadFromCloud = async function () {
    if (!supabaseClient) { showToast("⚠️ Налаштуйте Supabase!", "error"); return; }
    if (!confirm("⚠️ УВАГА: Це замінить локальні дані даними з хмари!\n\nПродовжити?")) return;
    showToast("🔄 Завантаження з хмари...", "primary");
    try {
        const { data, error } = await supabaseClient.from('app_data').select('json_data').eq('id', 1).single();
        if (error) throw error;
        if (!data?.json_data) { showToast("⚠️ У хмарі немає збережених даних.", "warning"); return; }
        const cloudData = data.json_data;
        Object.keys(cloudData).forEach(key => {
            if (cloudData[key] !== null) {
                const v = cloudData[key];
                localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v));
            }
        });
        localStorage.setItem('last_cloud_restore', new Date().toISOString());
        showToast("✅ Дані відновлено! Оновлення...", "success");
        setTimeout(() => location.reload(), 2000);
    } catch (error) {
        showToast(`❌ Помилка: ${error.message}`, "error");
    }
};

window.testTelegramConnection = async function () {
    if (typeof testTelegramBotConnection === 'function') {
        testTelegramBotConnection();
    } else {
        showToast('Перевірте налаштування Telegram в telegram.js', 'warning');
    }
};

// ==========================================
//  GOOGLE SHEETS INTEGRATION
// ==========================================
function loadSheetMappings() {
    SHEET_MAPPINGS = JSON.parse(localStorage.getItem('perfume_sheet_mappings') || '{}');
    const last = localStorage.getItem('last_sheet_sync');
    const el = document.getElementById('lastSyncTime');
    if (el && last) el.textContent = `Остання синхронізація: ${last}`;
    const autoSync = localStorage.getItem('sheet_auto_sync') === 'true';
    const cb = document.getElementById('autoSyncOnLoad');
    if (cb) cb.checked = autoSync;
    if (autoSync && document.getElementById('sheetUrl')) {
        setTimeout(() => syncWithGoogleSheet(), 2000);
    }
}

window.toggleAutoSync = function (enabled) {
    localStorage.setItem('sheet_auto_sync', enabled ? 'true' : 'false');
    showToast(enabled ? '🔄 Авто-синхронізація увімкнена' : '⏸ Авто-синхронізація вимкнена', 'success');
};

function saveSheetMappings() {
    localStorage.setItem('perfume_sheet_mappings', JSON.stringify(SHEET_MAPPINGS));
}

window.syncWithGoogleSheet = async function () {
    const url = document.getElementById('sheetUrl')?.value?.trim();
    if (!url) { showToast("❌ Введіть URL таблиці", "error"); return; }
    const btn = document.querySelector('button[onclick="syncWithGoogleSheet()"]');
    const originalText = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Завантаження...'; btn.disabled = true; }
    const corsProxies = ['https://corsproxy.io/?', 'https://api.allorigins.win/raw?url='];
    let csvText = null;
    for (const proxy of corsProxies) {
        try {
            const response = await fetch(proxy + encodeURIComponent(url));
            if (response.ok) { csvText = await response.text(); break; }
        } catch (e) { console.warn(`Proxy ${proxy} failed:`, e.message); }
    }
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    if (csvText) {
        processSheetData(csvText);
        const now = new Date().toLocaleString('uk-UA');
        localStorage.setItem('last_sheet_sync', now);
        const el = document.getElementById('lastSyncTime');
        if (el) el.textContent = `Остання синхронізація: ${now}`;
    } else {
        showToast("⚠️ Не вдалося завантажити автоматично. Вставте CSV вручну.", "warning");
        showManualCsvPaste();
    }
};

window.syncBottlesFromGoogleSheets = async function () {
    const url = document.getElementById('bottleSheetUrl')?.value?.trim();
    if (!url) { showToast("❌ Введіть URL таблиці флаконів", "error"); return; }
    const btn = document.querySelector('button[onclick="syncBottlesFromGoogleSheets()"]');
    const originalText = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Схрещуємо...'; btn.disabled = true; }
    const corsProxies = ['https://corsproxy.io/?', 'https://api.allorigins.win/raw?url='];
    let csvText = null;
    for (const proxy of corsProxies) {
        try {
            const response = await fetch(proxy + encodeURIComponent(url));
            if (response.ok) { csvText = await response.text(); break; }
        } catch (e) { console.warn(`Proxy ${proxy} failed:`, e.message); }
    }
    if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    if (csvText) {
        processBottleSheetData(csvText);
        showToast("✅ Флакони успішно синхронізовано!", "success");
    } else {
        showToast("⚠️ Не вдалося завантажити автоматично. Вставте CSV вручну.", "warning");
        showManualCsvPaste();
    }
};

function showManualCsvPaste() {
    const area = document.getElementById('reconciliationArea');
    if (!area) return;
    area.style.display = 'block';
    area.innerHTML = `
        <h4 style="color: var(--warning);">📋 Ручне вставлення CSV</h4>
        <p style="font-size:0.85rem; color:var(--text-muted);">Відкрийте Google Таблицю → <strong>Файл → Завантажити → CSV</strong> → відкрийте файл, виділіть все (Ctrl+A), скопіюйте та вставте нижче:</p>
        <textarea id="manualCsvInput" style="min-height:120px; font-size:0.8rem; font-family:monospace;" placeholder="Вставте CSV дані тут..."></textarea>
        <button class="btn-primary" style="margin-top:10px;" onclick="processManualCsv()"><i class="fa-solid fa-check"></i> Обробити МЛ</button>
        <button class="btn-warning" style="margin-top:10px; margin-left: 10px;" onclick="processManualBottleCsv()"><i class="fa-solid fa-check"></i> Обробити Флакони</button>`;
}

window.processManualCsv = function () {
    const csvText = document.getElementById('manualCsvInput')?.value?.trim();
    if (!csvText) { showToast("❌ Вставте дані CSV", "error"); return; }
    document.getElementById('reconciliationArea').innerHTML = `
        <h4 style="color: var(--warning);"><i class="fa-solid fa-exclamation-triangle"></i> Незнайдені позиції (<span id="reconcileCount">0</span>)</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Ці товари є в таблиці, але відсутні в базі CRM.</p>
        <div class="table-container" style="max-height: 300px; overflow-y: auto;">
            <table class="table" id="reconcileTable"><thead><tr><th>Назва з Таблиці</th><th>Залишок</th><th>Дія</th></tr></thead><tbody></tbody></table>
        </div>`;
    processSheetData(csvText);
};

window.processManualBottleCsv = function () {
    const csvText = document.getElementById('manualCsvInput')?.value?.trim();
    if (!csvText) { showToast("❌ Вставте дані CSV", "error"); return; }
    processBottleSheetData(csvText);
};

function normalizePerfumeName(name) {
    return name.toLowerCase()
        .replace(/\b(edp|edt|edc|eau de parfum|eau de toilette|eau de cologne|parfum|perfume|cologne|extrait|extract|intense|concentree?|concentrée?)\b/gi, '')
        .replace(/\b(20\d{2}|19\d{2})\b/g, '').replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(a, b) {
    if (a === b) return 1.0;
    if (a.length < 2 || b.length < 2) return 0.0;
    const getBigrams = (str) => { const s = new Set(); for (let i = 0; i < str.length - 1; i++) s.add(str.substring(i, i + 2)); return s; };
    const ba = getBigrams(a), bb = getBigrams(b);
    let intersection = 0;
    ba.forEach(bg => { if (bb.has(bg)) intersection++; });
    return (2.0 * intersection) / (ba.size + bb.size);
}

function findBestMatch(sheetName, dbNames) {
    const normSheet = normalizePerfumeName(sheetName);
    let bestMatch = null, bestScore = 0;
    const scored = [];
    for (const dbName of dbNames) {
        const normDb = normalizePerfumeName(dbName);
        let score = 0;
        if (normSheet === normDb) score = 1.0;
        else if (normSheet.includes(normDb) || normDb.includes(normSheet)) {
            const lenRatio = Math.min(normSheet.length, normDb.length) / Math.max(normSheet.length, normDb.length);
            score = 0.80 + (0.15 * lenRatio);
        } else score = calculateSimilarity(normSheet, normDb);
        scored.push({ name: dbName, score });
        if (score > bestScore) { bestScore = score; bestMatch = dbName; }
    }
    const candidates = scored.filter(c => c.score > 0.2).sort((a, b) => b.score - a.score).slice(0, 3);
    return { match: bestScore >= 0.75 ? bestMatch : null, score: bestScore, candidates };
}

function parseCSV(text) {
    const result = []; let row = [], inQuote = false, currentToken = '';
    for (let i = 0; i < text.length; i++) {
        const char = text[i], next = text[i + 1];
        if (char === '"') { if (inQuote && next === '"') { currentToken += '"'; i++; } else inQuote = !inQuote; }
        else if (char === ',' && !inQuote) { row.push(currentToken); currentToken = ''; }
        else if ((char === '\r' || char === '\n') && !inQuote) {
            if (currentToken || row.length > 0) row.push(currentToken);
            if (row.length > 0) result.push(row);
            row = []; currentToken = '';
            if (char === '\r' && next === '\n') i++;
        } else currentToken += char;
    }
    if (currentToken || row.length > 0) row.push(currentToken);
    if (row.length > 0) result.push(row);
    return result;
}

function processSheetData(csvText) {
    const rows = parseCSV(csvText), unmatchedItems = [];
    let updatedCount = 0, autoMatchedCount = 0;
    const dbNames = Object.keys(PERFUME_PRICES);
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;
        const brand = row[0].trim(), name = row[1].trim(), stockRaw = row[2].trim();
        if (!brand || !name) continue;
        const sheetFullName = `${brand} ${name}`;
        const stockVal = parseFloat(stockRaw.replace(',', '.'));
        if (SHEET_MAPPINGS[sheetFullName]) {
            PERFUME_STOCK[SHEET_MAPPINGS[sheetFullName]] = (!isNaN(stockVal) && stockVal > 0) ? stockVal : 0;
            updatedCount++; continue;
        }
        if (PERFUME_PRICES[sheetFullName]) {
            PERFUME_STOCK[sheetFullName] = (!isNaN(stockVal) && stockVal > 0) ? stockVal : 0;
            updatedCount++; continue;
        }
        const { match, score, candidates } = findBestMatch(sheetFullName, dbNames);
        if (match && score >= 0.75) {
            PERFUME_STOCK[match] = (!isNaN(stockVal) && stockVal > 0) ? stockVal : 0;
            SHEET_MAPPINGS[sheetFullName] = match;
            updatedCount++; autoMatchedCount++;
        } else {
            unmatchedItems.push({ sheetName: sheetFullName, stock: stockVal, candidates });
        }
    }
    saveInventory(); saveSheetMappings(); renderInventoryList(); updateDashboard();
    if (unmatchedItems.length > 0) {
        showReconciliationUI(unmatchedItems);
        const autoMsg = autoMatchedCount > 0 ? ` (авто-знайдено: ${autoMatchedCount})` : '';
        showToast(`⚠️ Оновлено: ${updatedCount}${autoMsg}. Потребує уточнення: ${unmatchedItems.length}`, "warning");
    } else {
        const area = document.getElementById('reconciliationArea');
        if (area) area.style.display = 'none';
        showToast(`✅ Синхронізовано! Оновлено: ${updatedCount}${autoMatchedCount > 0 ? ` (авто-матч: ${autoMatchedCount})` : ''}`, "success");
    }
}

function processBottleSheetData(csvText) {
    const rows = parseCSV(csvText);
    const newBottleStock = {};
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue;
        const fullName = row[0].trim(), qty = parseInt(row[1].trim(), 10);
        if (!fullName || isNaN(qty) || qty <= 0) continue;
        let linkedPerfume = PERFUME_PRICES[fullName] ? fullName : null;
        if (!linkedPerfume) {
            const lowerFull = fullName.toLowerCase();
            linkedPerfume = Object.keys(PERFUME_PRICES).find(n => lowerFull.includes(n.toLowerCase()) || n.toLowerCase().includes(lowerFull));
        }
        newBottleStock[fullName] = { qty, linkedPerfume: linkedPerfume || "Невідомий парфум" };
    }
    BOTTLE_STOCK = newBottleStock;
    saveBottleStock(); renderBottleList(); renderOrderList();
}

function showReconciliationUI(items) {
    const area = document.getElementById('reconciliationArea');
    const tbody = document.querySelector('#reconcileTable tbody');
    const countSpan = document.getElementById('reconcileCount');
    if (!area || !tbody) return;
    area.style.display = 'block';
    if (countSpan) countSpan.textContent = items.length;
    tbody.innerHTML = '';
    items.forEach((item, index) => {
        const rowId = `rec-row-${index}`;
        const safe = item.sheetName.replace(/'/g, "\\'");
        let candidatesHtml = item.candidates?.map(c => `
            <button class="btn-sm" style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.25);color:var(--text);text-align:left;display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-radius:6px;cursor:pointer;"
                onclick="applyAutoMatch('${safe}','${c.name.replace(/'/g, "\\'")}',${item.stock},'${rowId}')">
                <span><i class="fa-solid fa-check-circle" style="color:var(--secondary);margin-right:5px;"></i>${c.name}</span>
                <span style="background:${c.score >= 0.6 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'};color:${c.score >= 0.6 ? 'var(--secondary)' : 'var(--warning)'};border-radius:4px;padding:2px 7px;font-size:0.75rem;font-weight:700">${Math.round(c.score * 100)}%</span>
            </button>`).join('') || '';
        tbody.innerHTML += `<tr id="${rowId}"><td><strong>${item.sheetName}</strong></td><td>${!isNaN(item.stock) ? item.stock + ' мл' : '—'}</td>
            <td style="min-width:220px;">${candidatesHtml ? `<div style="margin-bottom:6px;font-size:0.78rem;color:var(--text-muted);font-weight:600;">🤖 Можливо це:</div><div style="display:flex;flex-direction:column;gap:4px;">${candidatesHtml}</div><hr style="margin:8px 0;border:0;border-top:1px dashed var(--border);">` : ''}
            <div style="display:flex;gap:5px;">
                <button class="btn-sm btn-success" onclick="createFromSheet('${safe}',${item.stock},'${rowId}')"><i class="fa-solid fa-plus"></i> Новий</button>
                <button class="btn-sm btn-secondary" onclick="showMapSelector('${safe}',${item.stock},'${rowId}')"><i class="fa-solid fa-link"></i> Вибрати</button>
                <button class="btn-sm" style="background:var(--bg-input);color:var(--text-muted);border:1px solid var(--border);" onclick="skipReconcileRow('${rowId}')"><i class="fa-solid fa-times"></i></button>
            </div></td></tr>`;
    });
}

window.createFromSheet = function (name, stock, rowId) {
    const nameInput = document.getElementById('adminPerfumeName');
    if (nameInput) { nameInput.value = name; nameInput.scrollIntoView({ behavior: 'smooth' }); nameInput.focus(); }
    PERFUME_STOCK[name] = stock;
    const row = document.getElementById(rowId);
    if (row) { row.style.opacity = '0.5'; row.style.pointerEvents = 'none'; }
    showToast("📝 Заповніть ціну та натисніть 'Зберегти'", "info");
};

window.showMapSelector = function (sheetName, stock, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const cell = row.cells[2];
    const options = ['<option value="">-- Оберіть зі списку --</option>', ...Object.keys(PERFUME_PRICES).sort().map(n => `<option value="${n}">${n}</option>`)].join('');
    cell.innerHTML = `<select style="font-size:0.8rem;" onchange="applyMapping('${sheetName.replace(/'/g, "\\'")}',this.value,${stock},'${rowId}')">${options}</select>
        <button class="btn-sm btn-secondary" style="margin-top:5px;" onclick="skipReconcileRow('${rowId}')">Скасувати</button>`;
};

window.applyMapping = function (sheetName, dbName, stock, rowId) {
    if (!dbName) return;
    SHEET_MAPPINGS[sheetName] = dbName; saveSheetMappings();
    PERFUME_STOCK[dbName] = (!isNaN(stock) && stock > 0) ? stock : 0;
    saveInventory(); renderInventoryList(); updateDashboard();
    _removeReconcileRow(rowId);
    showToast(`🔗 Зв'язано: ${sheetName} → ${dbName}`, "success");
};

window.applyAutoMatch = function (sheetName, dbName, stock, rowId) {
    if (!dbName) return;
    SHEET_MAPPINGS[sheetName] = dbName; saveSheetMappings();
    PERFUME_STOCK[dbName] = (!isNaN(stock) && stock > 0) ? stock : 0;
    saveInventory(); renderInventoryList(); updateDashboard();
    _removeReconcileRow(rowId);
    showToast(`✅ "${sheetName}" → "${dbName}" (збережено)`, "success");
};

window.skipReconcileRow = function (rowId) {
    _removeReconcileRow(rowId);
    showToast('⏭️ Позицію пропущено', 'primary');
};

function _removeReconcileRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
    const countSpan = document.getElementById('reconcileCount');
    if (countSpan) {
        const remaining = parseInt(countSpan.textContent) - 1;
        countSpan.textContent = remaining;
        if (remaining <= 0) { const area = document.getElementById('reconciliationArea'); if (area) area.style.display = 'none'; }
    }
}

// ==========================================
//  SMM CREATOR — Preview Generation
// ==========================================
window.generateSMMPreview = async function () {
    const pName = document.getElementById('smmPerfumeSelect')?.value;
    if (!pName || !PERFUME_PRICES[pName]) { showToast("⚠️ Оберіть парфум зі списку!", "warning"); return; }
    const pData = PERFUME_PRICES[pName];
    const platform = document.getElementById('platform-tg')?.classList.contains('active') ? 'Telegram' : 'Instagram';
    const previewDiv = document.getElementById('smmPreviewArea');
    const btn = document.querySelector('button[onclick="generateSMMPreview()"]');
    const originalText = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Генерую...'; btn.disabled = true; }
    if (previewDiv) previewDiv.innerHTML = '<p style="text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Генерую контент...</p>';
    try {
        const prompt = `Ти — SMM-менеджер парфумерного магазину. Платформа: ${platform}.
Парфум: "${pName}". Стать: ${pData.gender || '?'}, Сезони: ${(pData.seasons || []).join(', ')}, Теги: ${(pData.tags || []).join(', ')}.
Ноти: ${pData.pyramid || 'Не вказані'}. Опис: "${pData.description || ''}".

Створи привабливий ${platform === 'Telegram' ? 'пост для Telegram-каналу' : 'пост для Instagram'} про цей парфум.
Використовуй емодзі, заклик до дії та хештеги. Мова: Українська.`;
        const text = await callGemini(prompt);
        const htmlText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');
        if (previewDiv) previewDiv.innerHTML = `<div style="padding:15px;line-height:1.6;font-size:0.9rem;">${htmlText}</div>`;
        // Show copy button
        const copyBtn = document.getElementById('copySmmBtn');
        if (copyBtn) { copyBtn.style.display = 'block'; copyBtn.onclick = () => { navigator.clipboard.writeText(text).then(() => showToast('✅ Скопійовано!', 'success')); }; }
    } catch (e) {
        if (previewDiv) previewDiv.innerHTML = `<p style="color:var(--danger);padding:20px;">❌ ${e.message}</p>`;
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
};

window.setSmmPlatform = function (platform) {
    const tgBtn = document.getElementById('platform-tg');
    const igBtn = document.getElementById('platform-inst');
    const postTgBtn = document.getElementById('postTgBtn');
    const copySmmBtn = document.getElementById('copySmmBtn');
    if (platform === 'telegram') {
        tgBtn?.classList.add('active'); igBtn?.classList.remove('active');
        if (postTgBtn) postTgBtn.style.display = '';
        if (copySmmBtn) copySmmBtn.style.display = 'none';
    } else {
        igBtn?.classList.add('active'); tgBtn?.classList.remove('active');
        if (postTgBtn) postTgBtn.style.display = 'none';
        if (copySmmBtn) copySmmBtn.style.display = '';
    }
};

window.copySmmToClipboard = function () {
    const text = document.getElementById('smmPreviewArea')?.innerText;
    if (text) navigator.clipboard.writeText(text).then(() => showToast('✅ Скопійовано для Instagram!', 'success'));
};

window.postCategorizedListToTelegram = async function () {
    const category = document.getElementById('smmListCategory')?.value;
    const btn = document.getElementById('postCategorizedBtn');
    const originalText = btn?.innerHTML;
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Генерую...'; btn.disabled = true; }
    try {
        let perfumePool = Object.entries(PERFUME_PRICES);
        let label = '';
        switch (category) {
            case 'popular': perfumePool = perfumePool.sort(() => Math.random() - 0.5).slice(0, 5); label = '🔥 Топ популярних'; break;
            case 'winter': perfumePool = perfumePool.filter(([, d]) => (d.seasons || []).includes('Зима')).sort(() => Math.random() - 0.5).slice(0, 5); label = '❄️ Зимові'; break;
            case 'summer': perfumePool = perfumePool.filter(([, d]) => (d.seasons || []).includes('Літо')).sort(() => Math.random() - 0.5).slice(0, 5); label = '☀️ Літні'; break;
            case 'fresh': perfumePool = perfumePool.filter(([, d]) => (d.tags || []).some(t => ['свіжий', 'цитрус', 'морський'].includes(t.toLowerCase()))).sort(() => Math.random() - 0.5).slice(0, 5); label = '🌿 Свіжі'; break;
            default: perfumePool = perfumePool.sort(() => Math.random() - 0.5).slice(0, 5); label = '🎲 Підбірка'; break;
        }
        if (perfumePool.length === 0) { showToast('⚠️ Немає парфумів у цій категорії', 'warning'); return; }
        const list = perfumePool.map(([n]) => n).join(', ');
        const prompt = `Ти — SMM-менеджер парфумерного магазину. Склади красивий пост-добірку для Telegram.
Категорія: "${label}". Парфуми: ${list}.
Для кожного — 1-2 речення опису. Мова: Українська, з емодзі та хештегами в кінці.`;
        const text = await callGemini(prompt);
        const copyBtn = document.getElementById('copyCategorizedBtn');
        if (copyBtn) { copyBtn.style.display = 'block'; copyBtn.onclick = () => { navigator.clipboard.writeText(text).then(() => showToast('✅ Скопійовано!', 'success')); }; }
        if (typeof postToTelegram === 'function') {
            await postToTelegram(text);
        } else {
            showToast('📋 Пост згенеровано! Скопіюйте для Instagram.', 'success');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
};

window.copyCategorizedListToClipboard = function () {
    const btn = document.getElementById('copyCategorizedBtn');
    if (btn?.onclick) btn.onclick();
};
