// ==========================================
//  ORDERS — Order management, parser, cart
// ==========================================

// --- PARSER LOGIC ---
window.parseOrderText = function () {
    const text = document.getElementById('pasteArea').value;
    if (!text) return;

    const cleanPhoneText = text.replace(/[\s\-\(\)]/g, '');
    const phoneMatch = cleanPhoneText.match(/(?:\+38)?(0\d{9})/);
    if (phoneMatch) {
        document.getElementById('phoneSingle').value = phoneMatch[1] || phoneMatch[0];
    }

    let foundVolume = null;
    for (let v of FLACON_VOLUMES) {
        if (text.toLowerCase().includes(v + 'ml') || text.toLowerCase().includes(v + ' мл')) {
            foundVolume = v;
            break;
        }
    }
    if (!foundVolume) {
        for (let v of FLACON_VOLUMES) {
            const regex = new RegExp(`(^|\\s)${v}($|\\s)`);
            if (regex.test(text)) {
                foundVolume = v;
                break;
            }
        }
    }
    if (foundVolume) {
        document.getElementById('flaconVolume').value = foundVolume;
    }

    const textLower = text.toLowerCase();
    let foundPerfume = "";
    const dbNames = Object.keys(PERFUME_PRICES).sort((a, b) => b.length - a.length);
    for (let name of dbNames) {
        if (textLower.includes(name.toLowerCase())) {
            foundPerfume = name;
            break;
        }
    }
    if (foundPerfume) {
        document.getElementById('perfumeName').value = foundPerfume;
    }

    const officeMatch = text.match(/(?:№|відділення|від)\.?\s*(\d+)/i);
    if (officeMatch) {
        document.getElementById('postOfficeSingle').value = officeMatch[1];
    }

    const commonCities = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Запоріжжя"];
    for (let city of commonCities) {
        if (text.includes(city)) {
            document.getElementById('citySingle').value = city;
            break;
        }
    }

    showToast("🔍 Текст проаналізовано!", "success");
}

// --- ORDER ACTIONS ---
window.addItemToOrder = function () {
    const name = document.getElementById('orderPerfumeName').value.trim();
    const volume = parseFloat(document.getElementById('orderFlaconVolume').value);
    const markup = document.getElementById('saleMarkupTierOrder').value;
    if (!name || !volume) return;
    const calc = calculateCost(name, volume, markup);
    if (!calc) return;
    CURRENT_ORDER_LIST.push({ ...calc, name: name, vol: volume, markup: markup });
    renderOrderList(); document.getElementById('orderPerfumeName').value = '';
}

// Add listener to discount change
document.addEventListener('DOMContentLoaded', () => {
    const ds = document.getElementById('discountSelectOrder');
    if (ds) ds.addEventListener('change', renderOrderList);
});

window.removeItemFromOrder = function (index) { CURRENT_ORDER_LIST.splice(index, 1); renderOrderList(); }

// --- PERFUME SELECTOR MODAL ---
let SELECTOR_FILTER_CATEGORY = 'all';

window.openPerfumeSelector = function () {
    const modal = document.getElementById('perfumeSelectorModal');
    if (!modal) return;
    modal.style.display = 'block';
    document.getElementById('perfumeSelectorSearch').value = '';
    SELECTOR_FILTER_CATEGORY = 'all';

    const chips = modal.querySelectorAll('.filter-chip');
    if (chips.length > 0) {
        chips.forEach(c => c.classList.remove('active'));
        chips[0].classList.add('active');
    }

    renderPerfumeSelector();

    setTimeout(() => {
        const searchInput = document.getElementById('perfumeSelectorSearch');
        if (searchInput) searchInput.focus();
    }, 100);
}

window.closePerfumeSelector = function () {
    const modal = document.getElementById('perfumeSelectorModal');
    if (modal) modal.style.display = 'none';
}

window.filterPerfumeSelectorCategory = function (category, el) {
    SELECTOR_FILTER_CATEGORY = category;
    const container = el.parentElement;
    container.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    renderPerfumeSelector();
}

window.renderPerfumeSelector = function () {
    const table = document.getElementById('perfume-selector-table');
    if (!table) return;
    const tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) return;

    tbody.innerHTML = '';
    const searchInput = document.getElementById('perfumeSelectorSearch');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let entries = Object.keys(PERFUME_PRICES).sort();

    entries.forEach(name => {
        const pData = PERFUME_PRICES[name];

        if (SELECTOR_FILTER_CATEGORY !== 'all' && pData.gender !== SELECTOR_FILTER_CATEGORY) return;

        if (search) {
            const matchesName = name.toLowerCase().includes(search);
            const matchesBarcode = pData.barcode && pData.barcode.toLowerCase().includes(search);
            const matchesTag = pData.tags && pData.tags.some(t => t.toLowerCase().includes(search));
            if (!matchesName && !matchesBarcode && !matchesTag) return;
        }

        const stock = PERFUME_STOCK[name] || 0;

        const genderClass = pData.gender === 'Чоловічий' ? 'gender-male' : (pData.gender === 'Жіночий' ? 'gender-female' : 'gender-unisex');
        const genderBadge = pData.gender ? `<span class="badge-gender ${genderClass}" style="font-size:0.6rem; padding: 1px 4px;">${pData.gender[0]}</span>` : '';
        const stockStyle = stock <= 15 ? 'color: var(--danger); font-weight: bold; font-size: 0.8rem;' : 'color: var(--text-muted); font-size: 0.8rem;';

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = function () {
            const input = document.getElementById('orderPerfumeName');
            if (input) input.value = name;
            closePerfumeSelector();
        };

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 5px;">
                    ${genderBadge}
                    <span class="text-bold" style="font-size: 0.95rem;">${name}</span>
                </div>
                <div style="${stockStyle} margin-top: 4px;">📦 Залишок: ${stock} мл</div>
            </td>
            <td class="text-right" style="vertical-align: middle;">
                <span style="font-weight: 700; color: var(--primary);">${pData.basePrice.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.renderOrderList = function () {
    const tbody = document.getElementById('order-list-table').getElementsByTagName('tbody')[0];
    const totalDiv = document.getElementById('orderTotalSection');
    const summaryText = document.getElementById('orderSummaryOutput');

    tbody.innerHTML = '';
    let totalRev = 0;

    CURRENT_ORDER_LIST.forEach((item, index) => {
        totalRev += item.revenue;
        tbody.innerHTML += `<tr><td>${item.name}</td><td class="text-right">${item.vol} мл</td><td class="text-right">${item.revenue.toFixed(2)}</td><td class="text-right"><button class="btn-sm btn-danger" onclick="removeItemFromOrder(${index})"><i class="fa-solid fa-times"></i></button></td></tr>`;
    });

    totalDiv.textContent = `Разом: ${totalRev.toFixed(2)} ₴`;

    // Stock Warnings
    const warningsDiv = document.getElementById('order-stock-warnings');
    warningsDiv.innerHTML = '';

    let requiredVolumes = {};
    CURRENT_ORDER_LIST.forEach(item => {
        requiredVolumes[item.name] = (requiredVolumes[item.name] || 0) + item.vol;
    });

    for (const perfumeName in requiredVolumes) {
        const required = requiredVolumes[perfumeName];
        const currentStock = PERFUME_STOCK[perfumeName] || 0;

        if (required > currentStock) {
            const matchingBottles = findBottleForPerfume(perfumeName);

            const alertBox = document.createElement('div');
            alertBox.style.padding = '10px';
            alertBox.style.borderRadius = '8px';
            alertBox.style.marginTop = '10px';
            alertBox.style.fontSize = '0.9rem';

            if (matchingBottles.length > 0) {
                const bottleNames = matchingBottles.map(b => b.name).join(' або ');
                alertBox.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
                alertBox.style.border = '1px solid var(--warning)';
                alertBox.style.color = '#b45309';
                alertBox.innerHTML = `<strong>⚠️ Увага:</strong> Не вистачає розливного парфуму <em>${perfumeName}</em>.<br>✅ <strong>Є цілий флакон</strong> → «Відкрийте флакон: ${bottleNames}»`;
            } else {
                alertBox.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                alertBox.style.border = '1px solid var(--danger)';
                alertBox.style.color = '#b91c1c';
                alertBox.innerHTML = `<strong>❌ Помилка:</strong> Недостатньо парфуму <em>${perfumeName}</em> і цілих флаконів немає!`;
            }
            warningsDiv.appendChild(alertBox);
        }
    }

    // CLEAN ORDER TEXT
    if (CURRENT_ORDER_LIST.length > 0) {
        const discountPercent = parseInt(document.getElementById('discountSelectOrder').value) || 0;
        const discountAmount = totalRev * (discountPercent / 100);
        const finalTotal = totalRev - discountAmount;

        let text = "Ваше замовлення:\n\n";
        CURRENT_ORDER_LIST.forEach((item, i) => { text += `${i + 1}. ${item.name} (${item.vol} мл) — ${item.revenue.toFixed(0)} грн\n`; });
        if (discountPercent > 0) {
            text += `\nЗнижка ${discountPercent}%: -${discountAmount.toFixed(0)} грн\n`;
        }
        text += `\n${MY_DELIVERY_INFO}\n\n`;
        text += `${MY_PAYMENT_INFO}\n\n`;
        text += `До сплати: ${finalTotal.toFixed(0)} грн`;
        summaryText.value = text;
        totalDiv.innerHTML = `Сума: ${totalRev.toFixed(0)} ₴ <br> ${discountPercent > 0 ? `<span style='color:var(--secondary)'>Знижка: -${discountAmount.toFixed(0)} ₴</span> <br>` : ''} Разом: ${finalTotal.toFixed(0)} ₴`;
    } else { summaryText.value = ''; totalDiv.textContent = ''; }
}

window.clearOrder = function () { CURRENT_ORDER_LIST = []; renderOrderList(); IS_EDITING_ORDER = null; const btn = document.getElementById('processOrderBtn'); btn.innerHTML = '<i class="fa-solid fa-cash-register"></i> Оформити'; btn.classList.remove('btn-warning'); btn.classList.add('btn-success'); }

window.revertOrderStock = function (orderId) {
    const txsToRevert = getTransactions().filter(t => t.orderId === orderId);
    let totalVolume = {};
    txsToRevert.forEach(item => { totalVolume[item.perfumeName] = (totalVolume[item.perfumeName] || 0) + item.quantityML; });
    for (const name in totalVolume) { PERFUME_STOCK[name] = (PERFUME_STOCK[name] || 0) + totalVolume[name]; }
    saveInventory();
}

window.deleteOrder = function (orderId, showToastMessage = true) {
    if (showToastMessage && !confirm(`Видалити замовлення?`)) return;
    revertOrderStock(orderId);
    saveTransactions(getTransactions().filter(t => t.orderId !== orderId));
    if (showToastMessage) showToast(`Замовлення видалено.`, "error");
    renderTransactionHistory(); updateDashboard();
}

window.startEditOrder = function (orderId) {
    const txs = getTransactions().filter(t => t.orderId === orderId);
    if (txs.length === 0) return;
    IS_EDITING_ORDER = orderId; CURRENT_ORDER_LIST.length = 0;
    txs.forEach(t => { const calc = calculateCost(t.perfumeName, t.quantityML, t.markupTier); if (calc) CURRENT_ORDER_LIST.push({ ...calc, name: t.perfumeName, vol: t.quantityML, markup: t.markupTier }); });
    const first = txs[0];
    document.getElementById('clientNameOrder').value = first.clientName || '';
    document.getElementById('saleSourceOrder').value = first.source || '';
    document.getElementById('ttnNumberOrder').value = first.ttnNumber || '';
    const firstTx = txs[0];
    if (firstTx.discountPercent) {
        document.getElementById('discountSelectOrder').value = firstTx.discountPercent;
    } else {
        document.getElementById('discountSelectOrder').value = 0;
    }
    renderOrderList();
    const btn = document.getElementById('processOrderBtn');
    btn.innerHTML = '<i class="fa-solid fa-save"></i> Зберегти';
    btn.classList.remove('btn-success'); btn.classList.add('btn-warning');
    showSection('multi-calculator', document.querySelector('.navbar-links .nav-btn:nth-child(3)'));
}

window.processOrder = function () {
    if (CURRENT_ORDER_LIST.length === 0) return;
    const client = document.getElementById('clientNameOrder').value.trim() || 'Клієнт';
    const markup = document.getElementById('saleMarkupTierOrder').value;
    const source = document.getElementById('saleSourceOrder').value;
    const ttn = document.getElementById('ttnNumberOrder').value.trim() || null;
    const phone = document.getElementById('phoneOrder').value.trim();
    const fullName = document.getElementById('fullNameOrder').value.trim();
    const city = document.getElementById('cityOrder').value.trim();
    const postOffice = document.getElementById('postOfficeOrder').value.trim();
    const comments = document.getElementById('commentsOrder').value.trim();
    if (!source) { showToast("Оберіть джерело!", "error"); return; }
    if (IS_EDITING_ORDER) { deleteOrder(IS_EDITING_ORDER, false); IS_EDITING_ORDER = null; const btn = document.getElementById('processOrderBtn'); btn.innerHTML = '<i class="fa-solid fa-cash-register"></i> Оформити'; btn.classList.remove('btn-warning'); btn.classList.add('btn-success'); }
    const txs = getTransactions();
    const total = CURRENT_ORDER_LIST.reduce((acc, item) => acc + item.revenue, 0);
    const orderId = IS_EDITING_ORDER || Date.now();
    const discountPercent = parseInt(document.getElementById('discountSelectOrder').value) || 0;

    const newTransactions = CURRENT_ORDER_LIST.map(item => {
        const itemDiscount = item.revenue * (discountPercent / 100);
        const finalRevenue = item.revenue - itemDiscount;
        const finalProfit = finalRevenue - item.costTotal;

        return {
            id: Date.now() + Math.random(), timestamp: Date.now(), clientName: client, source: source, markupTier: markup,
            perfumeName: item.name, quantityML: item.vol,
            revenue: finalRevenue, profit: finalProfit, costTotal: item.costTotal,
            ttnNumber: ttn, orderId: orderId, discountPercent: discountPercent
        };
    });
    txs.push(...newTransactions); saveTransactions(txs);
    let totalVolume = {};
    CURRENT_ORDER_LIST.forEach(item => { totalVolume[item.name] = (totalVolume[item.name] || 0) + item.vol; });
    for (const name in totalVolume) { PERFUME_STOCK[name] = (PERFUME_STOCK[name] || 0) - totalVolume[name]; }
    saveInventory();
    showToast(`✅ Замовлення збережено!`, "success");
    showModalReceipt(CURRENT_ORDER_LIST, total, client, ttn, discountPercent);
    clearOrder(); updateDashboard();
}

window.generateAIOrderMessage = async function () {
    if (CURRENT_ORDER_LIST.length === 0) {
        showToast("📦 Спочатку додайте товари у кошик!", "warning");
        return;
    }

    const btn = document.querySelector('button[onclick="generateAIOrderMessage()"]');
    const originalContent = btn.innerHTML;
    const outputArea = document.getElementById('orderSummaryOutput');
    const clientName = document.getElementById('clientNameOrder').value.trim() || 'Клієнт';

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Генерую...';
    btn.disabled = true;

    try {
        const stats = getClientStats(clientName);
        const total = CURRENT_ORDER_LIST.reduce((acc, item) => acc + item.revenue, 0);
        const discountPercent = parseInt(document.getElementById('discountSelectOrder').value) || 0;
        const finalTotal = total * (1 - discountPercent / 100);

        const itemsText = CURRENT_ORDER_LIST.map(i => `- ${i.name} (${i.vol} мл) — ${i.revenue.toFixed(0)} ₴`).join('\n');

        const prompt = `
            Ти — менеджер магазину парфумерії. Склади ввічливе повідомлення для клієнта на основі замовлення.
            
            КЛІЄНТ: ${clientName}
            СТАТУС ЛОЯЛЬНОСТІ: ${stats.level}
            ТОВАРИ:
            ${itemsText}
            СУМА ДО ОПЛАТИ: ${finalTotal.toFixed(0)} ₴
            
            ВАШІ РЕКВІЗИТИ ТА УМОВИ:
            ${MY_PAYMENT_INFO}
            ${MY_DELIVERY_INFO}
            
            ВИМОГИ ДО ПОВІДОМЛЕННЯ:
            1. Тон: Професійний, дружній, українською мовою. 
            2. Подякуй за замовлення.
            3. Якщо клієнт має статус вище за "Новачок" (наприклад, Silver, Gold, VIP), обов'язково подякуй за лояльність та згадай це в тексті.
            4. Використовуй емодзі для привабливості.
            5. Структуровано виклади товари, суму та реквізити.
            
            Надай ТІЛЬКИ текст повідомлення для месенджера.
        `;

        const responseText = await callGemini(prompt);
        outputArea.value = responseText;
        showToast("🤖 ШІ сформував повідомлення!", "success");

    } catch (err) {
        console.error(err);
        showToast("❌ Не вдалося згенерувати повідомлення", "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

window.copyOrderSummary = function () { document.getElementById("orderSummaryOutput").select(); document.execCommand("copy"); showToast("Скопійовано!", "success"); }
