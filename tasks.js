// ==========================================
//  TASKS — Task management (orders + manual)
// ==========================================

window.switchTaskTab = function (tabName) {
    const ordersView = document.getElementById('task-view-orders');
    const manualView = document.getElementById('task-view-manual');
    const ordersTab = document.getElementById('tab-orders');
    const manualTab = document.getElementById('tab-manual');
    if (tabName === 'orders') {
        ordersView.style.display = 'block'; manualView.style.display = 'none';
        ordersTab.classList.add('active'); manualTab.classList.remove('active'); renderTasksOrders();
    } else {
        ordersView.style.display = 'none'; manualView.style.display = 'block';
        ordersTab.classList.remove('active'); manualTab.classList.add('active'); renderTasksManual();
    }
}

function getTasks() { return getFromLocalStorage(CONFIG_KEYS.TASKS, []); }
function saveTasks(tasks) { saveToLocalStorage(CONFIG_KEYS.TASKS, tasks); }
function getCompletedOrders() { return getFromLocalStorage(CONFIG_KEYS.COMPLETED_ORDERS, []); }
function saveCompletedOrders(ids) { saveToLocalStorage(CONFIG_KEYS.COMPLETED_ORDERS, ids); }

window.renderTasksOrders = function () {
    const container = document.getElementById('orders-task-list'); if (!container) return; container.innerHTML = '';
    const completedIds = getCompletedOrders();
    const txs = getTransactions().filter(t => t.orderId);
    const uniqueOrderIds = [...new Set(txs.map(t => t.orderId))];
    uniqueOrderIds.sort((a, b) => { const aCompleted = completedIds.includes(a); const bCompleted = completedIds.includes(b); if (aCompleted !== bCompleted) return aCompleted ? 1 : -1; return b - a; });
    uniqueOrderIds.forEach(orderId => {
        const orderItems = txs.filter(t => t.orderId === orderId); const t = orderItems[0];
        const itemsText = orderItems.map(oi => `🔹 ${oi.perfumeName} (${oi.quantityML} мл)`).join('\n');
        const isCompleted = completedIds.includes(orderId);
        const card = document.createElement('div'); card.className = `task-card task-order ${isCompleted ? 'completed' : ''}`;
        card.innerHTML = `<div class="task-date">${new Date(t.timestamp).toLocaleString()}</div><div class="task-type" style="background: #dbeafe; color: #1e40af;">📦 ЗАМОВЛЕННЯ #${orderId}</div><div style="font-weight: bold; margin-bottom: 5px;">Клієнт: ${t.clientName}</div><div class="task-content"><strong>Склад замовлення:</strong>\n${itemsText}</div><div class="task-actions">${isCompleted ? '<span style="color:var(--success); font-weight:bold; font-size:0.8rem;">🗸 ВИКОНАНО</span>' : `<button class="btn-sm btn-success" onclick="completeOrderTask(${orderId})">✅ Виконано</button>`}</div>`;
        container.appendChild(card);
    });
    if (uniqueOrderIds.length === 0) container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 50px;">Замовлень поки немає</p>';
}

window.renderTasksManual = function () {
    const container = document.getElementById('manual-task-list'); if (!container) return; container.innerHTML = '';
    let tasks = getTasks().filter(t => t.type === 'manual');
    tasks.sort((a, b) => { const aComp = a.status === 'completed'; const bComp = b.status === 'completed'; if (aComp !== bComp) return aComp ? 1 : -1; return b.timestamp - a.timestamp; });
    tasks.forEach(task => {
        const isCompleted = task.status === 'completed';
        const card = document.createElement('div'); card.className = `task-card task-manual ${isCompleted ? 'completed' : ''}`;
        card.innerHTML = `<div class="task-date">${new Date(task.timestamp).toLocaleString()}</div><div class="task-type" style="background: #f3e8ff; color: #6b21a8;">📝 РУЧНА ЗАДАЧА</div><div class="task-content">${task.content}</div><div class="task-actions">${!isCompleted ? `<button class="btn-sm btn-warning" onclick="editManualTask(${task.id})" title="Редагувати"><i class="fa-solid fa-pen"></i></button><button class="btn-sm btn-success" onclick="completeManualTask(${task.id})" title="Виконати"><i class="fa-solid fa-check"></i></button>` : `<button class="btn-sm btn-danger" onclick="deleteManualTask(${task.id})" title="Видалити"><i class="fa-solid fa-trash"></i></button>`}</div>`;
        container.appendChild(card);
    });
    if (tasks.length === 0) container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 50px;">Ручних задач немає</p>';
}

window.createManualTaskAI = async function () {
    const text = document.getElementById('manualTaskInput').value.trim(); if (!text) return;
    const btn = event.target; const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Створення...'; btn.disabled = true;
    try {
        const prompt = `Ти - помічник у CRM для парфумерії. Користувач ввів нотатку.\nТвоя задача: зробити її структурованою та граматично правильною.\nНОТАТКА: "${text}"\nПоверни ТІЛЬКИ відформатований текст задачі без зайвих слів. Мова: Українська.`;
        const aiOutput = await callGemini(prompt);
        const tasks = getTasks(); tasks.push({ id: Date.now(), type: 'manual', content: aiOutput.trim(), timestamp: Date.now(), status: 'pending' });
        saveTasks(tasks); document.getElementById('manualTaskInput').value = ''; renderTasksManual(); showToast("✅ Задачу створено!", "success");
    } catch (e) {
        showToast("❌ Помилка AI: " + e.message, "error");
    } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

window.completeManualTask = function (id) {
    const tasks = getTasks(); const task = tasks.find(t => t.id === id);
    if (task) { task.status = 'completed'; saveTasks(tasks); renderTasksManual(); showToast("✅ Задачу виконано", "success"); }
}

window.deleteManualTask = function (id) {
    if (!confirm("Видалити цю задачу назавжди?")) return;
    saveTasks(getTasks().filter(t => t.id !== id)); renderTasksManual(); showToast("🗑️ Задача видалена", "error");
}

window.completeOrderTask = function (orderId) {
    const completedIds = getCompletedOrders();
    if (!completedIds.includes(orderId)) { completedIds.push(orderId); saveCompletedOrders(completedIds); renderTasksOrders(); showToast("✅ Замовлення позначено як розлите та виконане", "success"); }
}

window.editManualTask = async function (id) {
    const tasks = getTasks(); const task = tasks.find(t => t.id === id); if (!task) return;
    const newText = prompt("Редагувати задачу:", task.content);
    if (newText !== null) { task.content = newText; saveTasks(tasks); renderTasksManual(); }
}

// Initial Tasks Load
document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { if (typeof renderTasksOrders === 'function') renderTasksOrders(); }, 1000); });

window.renderTasks = function () { switchTaskTab('orders'); }
