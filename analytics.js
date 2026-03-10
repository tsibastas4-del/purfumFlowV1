// ==========================================
//  ANALYTICS — Dashboard, Charts, Reports, Expenses
// ==========================================
let salesChartInstance = null;
let topProductsChartInstance = null;
let monthlyProfitChartInstance = null;
let sourcesChartInstance = null;

window.updateDashboard = function () {
    const txs = getTransactions();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let todayRevenue = 0, monthRevenue = 0, monthOrders = 0;
    txs.forEach(t => {
        if (t.timestamp >= startOfToday) todayRevenue += t.revenue;
        if (t.timestamp >= startOfMonth) { monthRevenue += t.revenue; monthOrders++; }
    });
    const lowStockCount = Object.values(PERFUME_STOCK).filter(stock => stock <= 15).length;
    document.getElementById('dash-today-revenue').textContent = todayRevenue.toFixed(0) + ' ₴';
    document.getElementById('dash-month-revenue').textContent = monthRevenue.toFixed(0) + ' ₴';
    document.getElementById('dash-month-orders').textContent = monthOrders;
    document.getElementById('dash-low-stock-count-value').textContent = lowStockCount;
    renderSalesChart(txs); renderTopProductsChart(txs); renderMonthlyProfitChart(txs); renderSourcesChart(txs); renderTopProductsTable(txs);
};

function renderSalesChart(txs) {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) { const date = new Date(); date.setDate(date.getDate() - i); last30Days.push(date.toISOString().split('T')[0]); }
    const dailySales = {}; last30Days.forEach(d => dailySales[d] = 0);
    txs.forEach(t => { const date = new Date(t.timestamp).toISOString().split('T')[0]; if (dailySales.hasOwnProperty(date)) dailySales[date] += t.revenue; });
    const canvas = document.getElementById('salesChart'); if (!canvas) return;
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(canvas, { type: 'line', data: { labels: last30Days.map(d => new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })), datasets: [{ label: 'Виручка (₴)', data: last30Days.map(d => dailySales[d]), borderColor: 'rgba(124, 58, 237, 1)', backgroundColor: 'rgba(124, 58, 237, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' ₴' } } } } });
}

function renderTopProductsChart(txs) {
    const productStats = {}; txs.forEach(t => { productStats[t.perfumeName] = (productStats[t.perfumeName] || 0) + t.quantityML; });
    const sorted = Object.entries(productStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const canvas = document.getElementById('topProductsChart'); if (!canvas) return;
    if (topProductsChartInstance) topProductsChartInstance.destroy();
    topProductsChartInstance = new Chart(canvas, { type: 'bar', data: { labels: sorted.map(([name]) => name.length > 20 ? name.substring(0, 17) + '...' : name), datasets: [{ label: 'Продано (мл)', data: sorted.map(([, vol]) => vol), backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(124, 58, 237, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' мл' } } } } });
}

function renderMonthlyProfitChart(txs) {
    const last6Months = []; for (let i = 5; i >= 0; i--) { const date = new Date(); date.setMonth(date.getMonth() - i); last6Months.push(date.toISOString().substring(0, 7)); }
    const monthlyProfit = {}; last6Months.forEach(m => monthlyProfit[m] = 0);
    txs.forEach(t => { const month = new Date(t.timestamp).toISOString().substring(0, 7); if (monthlyProfit.hasOwnProperty(month)) monthlyProfit[month] += (t.profit || 0); });
    const canvas = document.getElementById('monthlyProfitChart'); if (!canvas) return;
    if (monthlyProfitChartInstance) monthlyProfitChartInstance.destroy();
    monthlyProfitChartInstance = new Chart(canvas, { type: 'bar', data: { labels: last6Months.map(m => { const [year, month] = m.split('-'); return new Date(year, month - 1).toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' }); }), datasets: [{ label: 'Прибуток (₴)', data: last6Months.map(m => monthlyProfit[m]), backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' ₴' } } } } });
}

function renderSourcesChart(txs) {
    const sourceStats = {}; txs.forEach(t => { const src = t.source || 'Інше'; sourceStats[src] = (sourceStats[src] || 0) + 1; });
    const sorted = Object.entries(sourceStats).sort((a, b) => b[1] - a[1]);
    const canvas = document.getElementById('sourcesChart'); if (!canvas) return;
    if (sourcesChartInstance) sourcesChartInstance.destroy();
    const colors = ['rgba(245, 158, 11, 0.8)', 'rgba(124, 58, 237, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(236, 72, 153, 0.8)'];
    sourcesChartInstance = new Chart(canvas, { type: 'doughnut', data: { labels: sorted.map(([src]) => src), datasets: [{ data: sorted.map(([, count]) => count), backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } } });
}

function renderTopProductsTable(txs) {
    const table = document.getElementById('top-products-table'); if (!table) return;
    const productStats = {};
    txs.forEach(t => { if (!productStats[t.perfumeName]) productStats[t.perfumeName] = { vol: 0, revenue: 0, count: 0 }; productStats[t.perfumeName].vol += t.quantityML; productStats[t.perfumeName].revenue += t.revenue; productStats[t.perfumeName].count++; });
    const sorted = Object.entries(productStats).sort((a, b) => b[1].vol - a[1].vol).slice(0, 5);
    table.querySelector('tbody').innerHTML = sorted.map(([name, stats], index) => `<tr><td>${index + 1}</td><td><strong>${name}</strong></td><td class="text-right">${stats.vol} мл</td><td class="text-right">${stats.revenue.toFixed(0)} ₴</td><td class="text-right">${stats.count}</td></tr>`).join('');
}

function renderTopProducts(transactions) {
    const productStats = {};
    transactions.forEach(t => { if (!productStats[t.perfumeName]) productStats[t.perfumeName] = { vol: 0, revenue: 0 }; productStats[t.perfumeName].vol += t.quantityML; productStats[t.perfumeName].revenue += t.revenue; });
    const sortedProducts = Object.entries(productStats).sort(([, a], [, b]) => b.vol - a.vol).slice(0, 5);
    const tbody = document.getElementById('top-products-table').getElementsByTagName('tbody')[0]; tbody.innerHTML = '';
    if (sortedProducts.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Немає даних</td></tr>'; return; }
    sortedProducts.forEach(([name, data], index) => { let rankDisplay = index + 1; if (index === 0) rankDisplay = '🥇 ' + rankDisplay; if (index === 1) rankDisplay = '🥈 ' + rankDisplay; if (index === 2) rankDisplay = '🥉 ' + rankDisplay; tbody.innerHTML += `<tr><td style="font-weight:bold;">${rankDisplay}</td><td>${name}</td><td class="text-right text-bold">${data.vol} мл</td><td class="text-right text-success">${data.revenue.toFixed(0)} ₴</td></tr>`; });
}

// --- HISTORY ---
function getWeekBounds(offset = 0) {
    const now = new Date(); const currentDay = now.getDay(); const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() + diffToMonday + (offset * 7)); startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek, end: endOfWeek };
}

window.navigateWeek = function (direction) {
    CURRENT_WEEK_OFFSET += direction; renderTransactionHistory();
    const { start, end } = getWeekBounds(CURRENT_WEEK_OFFSET);
    const label = CURRENT_WEEK_OFFSET === 0 ? 'Поточний тиждень' : start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) + ' - ' + end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    document.getElementById('currentWeekLabel').textContent = label;
    document.getElementById('nextWeekBtn').disabled = CURRENT_WEEK_OFFSET >= 0;
}

window.renderTransactionHistory = function () {
    const tbody = document.getElementById('transaction-history-table').getElementsByTagName('tbody')[0];
    const summary = document.getElementById('transactionSummary'); tbody.innerHTML = '';
    const uniqueTransactions = {};
    getTransactions().forEach(t => { const key = t.orderId || t.id; if (!uniqueTransactions[key] || t.orderId) uniqueTransactions[key] = t; });
    const filteredTxs = Object.values(uniqueTransactions).filter(t => {
        const search = document.getElementById('transactionSearch').value.toLowerCase();
        const sourceFilter = document.getElementById('historyFilterSource').value;
        const dateFilter = document.getElementById('historyStartDate').value;
        const txDate = new Date(t.timestamp);
        const { start: weekStart, end: weekEnd } = getWeekBounds(CURRENT_WEEK_OFFSET);
        if (txDate < weekStart || txDate > weekEnd) return false;
        if (search && !t.perfumeName.toLowerCase().includes(search) && !t.clientName.toLowerCase().includes(search)) return false;
        if (sourceFilter && t.source !== sourceFilter) return false;
        if (dateFilter && new Date(t.timestamp).toISOString().split('T')[0] !== dateFilter) return false;
        return true;
    });
    let totalRev = 0; let totalProf = 0;
    filteredTxs.sort((a, b) => b.timestamp - a.timestamp).forEach(t => {
        let displayItems = [t]; if (t.orderId) displayItems = getTransactions().filter(tx => tx.orderId === t.orderId);
        const totalRevenue = displayItems.reduce((acc, item) => acc + (parseFloat(item.revenue) || 0), 0);
        const totalProfit = displayItems.reduce((acc, item) => acc + (parseFloat(item.profit) || 0), 0);
        totalRev += totalRevenue; totalProf += totalProfit;
        const infoText = t.orderId ? `Замовлення (${displayItems.length} поз.)` : `${t.perfumeName} (${t.quantityML} мл)`;
        const ttnDisplay = t.ttnNumber ? `<a href="https://novaposhta.ua/tracking/?cargo_key=${t.ttnNumber}" target="_blank">${t.ttnNumber}</a>` : '-';
        const deleteButton = t.orderId ? `<button class="btn-danger btn-sm" onclick="deleteOrder(${t.orderId})"><i class="fa-solid fa-trash"></i></button>` : `<button class="btn-danger btn-sm" onclick="deleteTx(${t.id})"><i class="fa-solid fa-trash"></i></button>`;
        const editButton = t.orderId ? `<button class="btn-warning btn-sm" onclick="startEditOrder(${t.orderId})"><i class="fa-solid fa-edit"></i></button>` : '';
        tbody.innerHTML += `<tr><td>${new Date(t.timestamp).toLocaleDateString()}</td><td>${t.clientName}</td><td>${t.source}</td><td>${ttnDisplay}</td><td>${infoText}</td><td class="text-right">${totalRevenue.toFixed(2)}</td><td class="text-right text-success">${totalProfit.toFixed(2)}</td><td class="text-right">${editButton} ${deleteButton}</td></tr>`;
    });
    summary.textContent = 'Всього за тиждень: ' + totalRev.toFixed(2) + ' ₴ (Прибуток: ' + totalProf.toFixed(2) + ' ₴)';
    if (CURRENT_WEEK_OFFSET === 0 && document.getElementById('currentWeekLabel').textContent === 'Поточний тиждень') {
        const { start, end } = getWeekBounds(0);
        document.getElementById('currentWeekLabel').textContent = start.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) + ' - ' + end.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    }
}

window.deleteTx = function (id) {
    if (!confirm("Видалити?")) return;
    const tx = getTransactions().find(t => t.id === id);
    if (tx) { PERFUME_STOCK[tx.perfumeName] = (PERFUME_STOCK[tx.perfumeName] || 0) + tx.quantityML; saveInventory(); }
    saveTransactions(getTransactions().filter(t => t.id !== id)); renderTransactionHistory(); updateDashboard();
}

window.generateReport = function () {
    const start = document.getElementById('startDate').value; const end = document.getElementById('endDate').value;
    const output = document.getElementById('reportOutput'); if (!start || !end) return;
    const txs = getTransactions().filter(t => { const d = new Date(t.timestamp).toISOString().split('T')[0]; return d >= start && d <= end; });
    const count = txs.length; const revenue = txs.reduce((a, b) => a + (b.revenue || 0), 0); const profit = txs.reduce((a, b) => a + (b.profit || 0), 0);
    const exps = getExpenses().filter(e => { const d = new Date(e.timestamp).toISOString().split('T')[0]; return d >= start && d <= end; });
    const totalExp = exps.reduce((a, b) => a + b.amount, 0); const netProfit = profit - totalExp;
    const avgCheck = count > 0 ? (revenue / count) : 0; const margin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;
    const sourceStats = {}; txs.forEach(t => { const s = t.source || 'Інше'; sourceStats[s] = (sourceStats[s] || 0) + 1; });
    let sourceHtml = '<ul style="margin: 10px 0; padding-left: 20px;">'; for (const [src, cnt] of Object.entries(sourceStats)) sourceHtml += `<li>${src}: ${cnt}</li>`; sourceHtml += '</ul>';
    output.innerHTML = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;"><div style="background:var(--bg-input); padding:15px; border-radius:8px;"><h4 style="margin-top:0; color:var(--text-muted);">Фінанси</h4><p>Виручка: <strong>${revenue.toFixed(2)} ₴</strong></p><p>Валовий прибуток: <strong>${profit.toFixed(2)} ₴</strong></p><p>Витрати: <span style="color:var(--danger);">-${totalExp.toFixed(2)} ₴</span></p><hr style="border:0; border-top:1px dashed var(--border);"><p style="font-size:1.2rem; color:var(--primary);">Чистий прибуток: <strong>${netProfit.toFixed(2)} ₴</strong></p></div><div style="background:var(--bg-input); padding:15px; border-radius:8px;"><h4 style="margin-top:0; color:var(--text-muted);">KPI & Джерела</h4><p>Кількість продажів: <strong>${count}</strong></p><p>Середній чек: <strong>${avgCheck.toFixed(0)} ₴</strong></p><p>Рентабельність: <strong>${margin.toFixed(1)}%</strong></p><hr style="border:0; border-top:1px dashed var(--border);"><div style="font-size: 0.9rem;"><strong>По джерелах:</strong>${sourceHtml}</div></div></div>`;
}

window.addExpense = function () {
    const desc = document.getElementById('expenseDescription').value; const amount = parseFloat(document.getElementById('expenseAmount').value);
    if (!desc || !amount) return;
    const exps = getExpenses(); exps.push({ id: Date.now(), timestamp: Date.now(), description: desc, amount: amount });
    saveExpenses(exps); renderExpenseList();
    document.getElementById('expenseDescription').value = ''; document.getElementById('expenseAmount').value = '';
}

window.renderExpenseList = function () {
    const div = document.getElementById('expenseListOutput');
    const exps = getExpenses().sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    div.innerHTML = exps.map(e => `<div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:5px 0;"><span>${e.description}</span><span style="font-weight:bold; color:var(--danger)">-${e.amount} ₴</span></div>`).join('');
}

// Excel Export
window.exportToExcel = async function () {
    const txs = getTransactions(); if (txs.length === 0) { showToast("📊 Немає даних для експорту", "warning"); return; }
    showToast("📥 Генерую Excel файл...", "primary");
    let csv = '\ufeffДата,Клієнт,Парфум,Об\'єм (мл),Виручка (₴),Прибуток (₴),Джерело\n';
    txs.forEach(t => { const date = new Date(t.timestamp).toLocaleDateString('uk-UA'); csv += `${date},"${(t.clientName || 'Без імені').replace(/,/g, ' ')}","${t.perfumeName.replace(/,/g, ' ')}",${t.quantityML},${t.revenue.toFixed(2)},${(t.profit || 0).toFixed(2)},${t.source || 'Інше'}\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Звіт_PerfumeFlow_${new Date().toISOString().split('T')[0]}.csv`; link.click();
    showToast("✅ Excel файл завантажено!", "success");
};

// Pricing & Clients
window.calculateRetailPrice = function () {
    const name = document.getElementById('calcPerfumeName').value; const vol = parseFloat(document.getElementById('calcFlaconVolume').value); const mark = document.getElementById('calcMarkupTier').value;
    const res = calculateCost(name, vol, mark); if (res) document.getElementById('calculatorOutput').innerHTML = `<strong>Ціна: ${res.revenue.toFixed(0)} ₴</strong>`;
}

window.generatePriceList = function () {
    const markupKey = document.getElementById('priceListMarkup').value; if (!markupKey) return;
    const date = new Date().toLocaleDateString('uk-UA');
    let text = '📋 ПРАЙС-ЛИСТ PERFUMEFLOW\n📅 Дата: ' + date + '\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n🧴 ВАРТІСТЬ ФЛАКОНІВ:\n\n';
    [3, 5, 10, 15, 20, 30, 40, 50, 100].forEach(size => { const cost = FLACON_COSTS[size]; if (cost) text += '   ' + size + ' мл — ' + cost + ' грн\n'; });
    text += '\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n💎 ЦІНИ НА ПАРФУМИ:\n(ціна за 1 мл)\n\n';
    Object.keys(PERFUME_PRICES).sort().forEach(name => { const basePrice = PERFUME_PRICES[name].basePrice; if (!basePrice) return; const markup = MARKUP_PRESETS[markupKey] || 0.12; text += '🔹 ' + name + '\n   ' + Math.round(basePrice * (1 + markup)) + ' грн/мл\n\n'; });
    text += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n📱 Для замовлення - пишіть!\n✨ Розливаємо від 3 мл\n';
    const output = document.getElementById('priceListOutput'); output.value = text; output.select(); document.execCommand("copy"); showToast("✅ Прайс скопійовано!", "success");
}

window.showClientHistory = function () {
    const clientName = document.getElementById('clientSearchInput').value.trim().toLowerCase(); if (!clientName) return;
    const txs = getTransactions().filter(t => t.clientName.toLowerCase().includes(clientName));
    const tbody = document.getElementById('client-history-table').getElementsByTagName('tbody')[0]; tbody.innerHTML = '';
    const stats = getClientStats(clientName);
    document.getElementById('aiClientAnalysisBtn').style.display = txs.length > 0 ? 'inline-block' : 'none';
    txs.forEach(t => { tbody.innerHTML += `<tr><td>${new Date(t.timestamp).toLocaleDateString()}</td><td>${t.perfumeName} (${t.quantityML}ml)</td><td class="text-right">${t.revenue}</td><td class="text-right">${t.profit}</td></tr>`; });
    document.getElementById('clientCrmSummary').innerHTML = `<div style="background:var(--bg-input); padding:15px; border-radius:8px; border-left: 4px solid var(--primary);"><div style="font-size:1.1rem; font-weight:bold;">${clientName.toUpperCase()}</div><div style="margin-top:5px;">Рівень: <span style="color:var(--primary); font-weight:800;">${stats.level}</span></div><div>Всього покупок: <strong>${txs.length}</strong></div><div>Загальна сума: <strong>${stats.totalSpend.toFixed(0)} ₴</strong></div>${stats.discount > 0 ? `<div style="margin-top:5px; color:var(--secondary); font-weight:bold;">✨ Активна знижка: ${(stats.discount * 100).toFixed(0)}%</div>` : ''}</div>`;
}

window.analyzeClientPreferences = async function () {
    const clientName = document.getElementById('clientSearchInput').value.trim(); if (!clientName) return;
    const txs = getTransactions().filter(t => t.clientName.toLowerCase().includes(clientName.toLowerCase())); if (txs.length === 0) return;
    const btn = document.getElementById('aiClientAnalysisBtn'); const originalContent = btn.innerHTML; const summaryDiv = document.getElementById('clientCrmSummary');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Аналізую...'; btn.disabled = true;
    try {
        const purchaseHistory = txs.map(t => { const pData = PERFUME_PRICES[t.perfumeName] || {}; return { perfume: t.perfumeName, volume: t.quantityML, gender: pData.gender || 'не вказано', tags: (pData.tags || []).join(', '), pyramid: pData.pyramid || 'немає дани' }; });
        const prompt = `Ти — психолог-парфумер та експерт CRM. Проаналізуй історію покупок клієнта "${clientName}" та створи його "Ароматний Портрет".\nІСТОРІЯ ПОКУПОК:\n${JSON.stringify(purchaseHistory)}\nТВОЄ ЗАВДАННЯ:\n1. Визнач домінуючі смаки.\n2. Опиши характер клієнта як покупця.\n3. Сформуй 3-5 коротких міток для CRM.\n4. Порекомендуй 1-2 типи ароматів.\nВідповідай українською мовою. Форматуй відповідь емодзі та жирним текстом.`;
        const responseText = await callGemini(prompt);
        const oldResult = document.getElementById('aiClientAnalysisResult'); if (oldResult) oldResult.remove();
        summaryDiv.innerHTML += `<div id="aiClientAnalysisResult" style="margin-top:15px; padding:15px; background:rgba(var(--primary-rgb), 0.05); border:1px dashed var(--primary); border-radius:8px;"><h4 style="margin-bottom:10px;"><i class="fa-solid fa-magic"></i> ШІ-Портрет Клієнта</h4><div style="font-size:0.9rem; line-height:1.5;">${responseText.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div></div>`;
        showToast("🏷️ Аналіз уподобань готовий!", "success");
    } catch (err) {
        console.error(err); showToast("❌ Помилка ШІ-аналізу", "error");
    } finally { btn.innerHTML = originalContent; btn.disabled = false; }
}

// AI Revenue Forecast
window.forecastRevenue = async function () {
    const btn = event?.target || document.querySelector('button[onclick="forecastRevenue()"]'); if (!btn) return;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Аналізую...';
    try {
        const txs = getTransactions(); if (txs.length < 7) { showToast("📊 Потрібно мінімум 7 замовлень для прогнозу", "warning"); btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-chart-line"></i> Прогноз виручки'; return; }
        const last30Days = txs.filter(t => (new Date() - new Date(t.timestamp)) / (1000 * 60 * 60 * 24) <= 30);
        const totalRevenue = last30Days.reduce((sum, t) => sum + t.revenue, 0); const avgDailyRevenue = totalRevenue / 30; const avgOrderValue = totalRevenue / last30Days.length;
        const monthlyData = {}; txs.forEach(t => { const month = new Date(t.timestamp).toISOString().substring(0, 7); monthlyData[month] = (monthlyData[month] || 0) + t.revenue; });
        const monthlyRevenues = Object.values(monthlyData).slice(-6); const trend = monthlyRevenues.length > 1 ? ((monthlyRevenues[monthlyRevenues.length - 1] - monthlyRevenues[0]) / monthlyRevenues[0] * 100).toFixed(1) : 0;
        const prompt = `Ти - фінансовий аналітик магазину парфумерії. Зроби прогноз виручки на наступний місяць.\nДАНІ:\n- Виручка за 30 днів: ${totalRevenue.toFixed(0)} ₴\n- Середня на день: ${avgDailyRevenue.toFixed(0)} ₴\n- Замовлень: ${last30Days.length}\n- Середній чек: ${avgOrderValue.toFixed(0)} ₴\n- Тренд: ${trend > 0 ? '+' : ''}${trend}%\n- По місяцях: ${monthlyRevenues.map(r => r.toFixed(0)).join(', ')} ₴\nМаксимум 500 символів. Мова: українська.`;
        const forecast = await callGemini(prompt);
        const modal = document.getElementById('settingsModal'); modal.style.display = 'block';
        document.getElementById('settingsContent').innerHTML = `<h2 style="margin-top: 0;">📊 Прогноз виручки</h2><div style="background: var(--bg-input); padding: 20px; border-radius: 12px; border-left: 4px solid var(--primary);">${forecast.replace(/\n/g, '<br>')}</div><button class="btn-secondary" onclick="document.getElementById('settingsModal').style.display='none'" style="margin-top: 20px; width: 100%;">Закрити</button>`;
    } catch (e) {
        console.error(e); showToast("❌ Помилка прогнозування", "error");
    } finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-chart-line"></i> Прогноз виручки'; }
};
