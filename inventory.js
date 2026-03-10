// ==========================================
//  INVENTORY — Stock management, bottles, forecast
// ==========================================

window.addStock = function () {
    const name = document.getElementById('inventoryPerfumeName').value.trim();
    const volume = parseFloat(document.getElementById('inventoryVolume').value);
    if (!name || isNaN(volume) || volume === 0) return;
    if (!PERFUME_PRICES[name]) { showToast("Спочатку додайте парфум у довідник!", "error"); return; }
    PERFUME_STOCK[name] = (PERFUME_STOCK[name] || 0) + volume;
    saveInventory(); renderInventoryList(); updateDashboard();
    document.getElementById('inventoryPerfumeName').value = '';
    document.getElementById('inventoryVolume').value = '';
    showToast(`Склад оновлено: ${name}`, "success");
}

window.scanBarcodeForStock = function (barcodeValue) {
    if (!barcodeValue) return;
    const barcodeToFind = barcodeValue.trim();
    let perfumeName = null;
    for (const name in PERFUME_PRICES) {
        if (PERFUME_PRICES[name].barcode === barcodeToFind) { perfumeName = name; break; }
    }
    if (perfumeName) {
        PERFUME_STOCK[perfumeName] = (PERFUME_STOCK[perfumeName] || 0) + 500;
        saveInventory(); renderInventoryList(); updateDashboard();
        showToast(`✅ ${perfumeName} (+500 мл) додано!`, "success");
    } else {
        showToast(`⚠️ Штрих-код ${barcodeToFind} не знайдено.`, "error");
        document.getElementById('inventoryPerfumeName').value = `Code: ${barcodeToFind}`;
        document.getElementById('inventoryVolume').value = 500;
    }
}

window.renderInventoryList = function () {
    const tbody = document.getElementById('inventory-list-table').getElementsByTagName('tbody')[0];
    let lowStockCount = 0;
    const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase();

    const rows = [];
    Object.keys(PERFUME_STOCK).sort().forEach(name => {
        const pData = PERFUME_PRICES[name] || {};
        if (STOCK_FILTER_GENDER !== 'all' && pData.gender !== STOCK_FILTER_GENDER) return;
        if (search && !name.toLowerCase().includes(search)) return;

        const stock = PERFUME_STOCK[name];
        if (stock <= 15) lowStockCount++;

        const genderClass = pData.gender === 'Чоловічий' ? 'gender-male' : (pData.gender === 'Жіночий' ? 'gender-female' : 'gender-unisex');
        const genderBadge = pData.gender ? `<span class="badge-gender ${genderClass}" style="font-size:0.6rem; padding: 1px 4px;">${pData.gender[0]}</span>` : '';

        rows.push(`<tr><td>${genderBadge}${name}</td><td class="text-right" ${stock <= 15 ? 'style="color:var(--danger);font-weight:bold;"' : ''}>${stock} мл</td><td class="text-right"><button class="btn-sm btn-danger" onclick="PERFUME_STOCK['${name.replace(/'/g, "\\'")}']='0';saveInventory();renderInventoryList();updateDashboard();"><i class="fa-solid fa-trash"></i></button></td></tr>`);
    });

    tbody.innerHTML = rows.join('');
    const dashLowStock = document.getElementById('dash-low-stock-count-value');
    if (dashLowStock) dashLowStock.textContent = lowStockCount;
}

// === WHOLE BOTTLES ADMIN LOGIC ===
window.renderBottleList = function () {
    const tbody = document.getElementById('bottle-list-table');
    if (!tbody) return;
    const tbodyEl = tbody.getElementsByTagName('tbody')[0];
    if (!tbodyEl) return;

    const rows = [];

    Object.keys(BOTTLE_STOCK).sort().forEach(bottleName => {
        const data = BOTTLE_STOCK[bottleName];
        rows.push(`
            <tr>
                <td>${bottleName}</td>
                <td>${data.linkedPerfume}</td>
                <td class="text-right">${data.qty}</td>
                <td class="text-right">
                    <button class="btn-sm btn-danger" onclick="removeWholeBottle('${bottleName.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });

    tbodyEl.innerHTML = rows.join('');
}

window.addWholeBottle = function () {
    const bottleName = document.getElementById('adminBottleName').value.trim();
    const linkedPerfume = document.getElementById('adminBottleLinked').value.trim();
    const qty = parseInt(document.getElementById('adminBottleQty').value, 10);

    if (!bottleName || !linkedPerfume || isNaN(qty) || qty <= 0) {
        showToast("Будь ласка, заповніть всі поля коректно.", "error");
        return;
    }

    if (!PERFUME_PRICES[linkedPerfume]) {
        showToast("Такого парфуму немає в довіднику. Виберіть існуючий.", "error");
        return;
    }

    BOTTLE_STOCK[bottleName] = {
        qty: qty,
        linkedPerfume: linkedPerfume
    };

    saveBottleStock();
    renderBottleList();

    document.getElementById('adminBottleName').value = '';
    document.getElementById('adminBottleLinked').value = '';
    document.getElementById('adminBottleQty').value = '1';

    showToast(`Флакон "${bottleName}" успішно додано!`, "success");
}

window.removeWholeBottle = function (bottleName) {
    if (confirm(`Ви впевнені, що хочете видалити ${bottleName}?`)) {
        delete BOTTLE_STOCK[bottleName];
        saveBottleStock();
        renderBottleList();
        showToast(`Флакон "${bottleName}" видалено!`, "success");
    }
}

window.generateStockForecast = async function () {
    const btn = document.querySelector('button[onclick="generateStockForecast()"]');
    const originalContent = btn.innerHTML;
    const resDiv = document.getElementById('stockForecastResult');
    const contentDiv = document.getElementById('stockForecastContent');

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Аналізую...';
    btn.disabled = true;
    resDiv.style.display = 'block';
    contentDiv.innerHTML = 'Завантаження аналітики за останні 30 днів...';

    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentTxs = getTransactions().filter(t => t.timestamp >= thirtyDaysAgo);

        let analysisData = [];
        Object.keys(PERFUME_PRICES).forEach(name => {
            const stock = PERFUME_STOCK[name] || 0;
            const sales = recentTxs.filter(t => t.perfumeName === name).reduce((acc, t) => acc + t.quantityML, 0);
            analysisData.push({ name, stock, sales30d: sales });
        });

        const prompt = `
            Ти — аналітик складу парфумерії. Проаналізуй дані про залишки та продажі (за останні 30 днів) і надай змістовний звіт українською мовою.
            
            ДАНІ:
            ${JSON.stringify(analysisData)}
            
            ТВОЄ ЗАВДАННЯ:
            1. Виділи "ГАРЯЧІ" позиції: високі продажі та низький залишок. Порекомендуй, скільки мл докупити.
            2. Виділи "МЕРТВИЙ ВАНТАЖ": позиції, які не продавалися 30 днів, але мають залишки. Порекомендуй зробити на них знижку.
            3. Загальний стан: чи достатньо запасів на наступний місяць?
            
            Форматуй відповідь гарно, використовуючи списки, жирний текст та емодзі. Не використовуй технічний JSON у відповіді.
        `;

        const responseText = await callGemini(prompt);

        const html = responseText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n- (.*?)/g, '<br>• $1')
            .replace(/\n/g, '<br>');

        contentDiv.innerHTML = html;
        showToast("📈 ШІ Аналіз готовий!", "success");

    } catch (err) {
        console.error(err);
        contentDiv.innerHTML = "❌ Помилка аналізу: " + err.message;
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

window.filterStockByGender = function (value, el) {
    STOCK_FILTER_GENDER = value;
    const container = el.parentElement;
    container.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    renderInventoryList();
}
