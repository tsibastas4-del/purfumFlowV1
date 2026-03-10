// ==========================================
//  ADMIN — Perfume CRUD, catalog filters
// ==========================================

window.addOrUpdatePerfume = function () {
    const name = document.getElementById('adminPerfumeName').value.trim();
    const basePrice = document.getElementById('adminBasePrice').value.trim();
    const discountVolume = document.getElementById('adminDiscountVolume').value.trim();
    const discountPrice = document.getElementById('adminDiscountPrice').value.trim();
    const barcode = document.getElementById('adminBarcode').value.trim();
    const gender = document.getElementById('adminGender').value;
    const seasons = Array.from(document.querySelectorAll('input[name="adminSeason"]:checked')).map(el => el.value);
    const tags = document.getElementById('adminTags').value.split(',').map(t => t.trim()).filter(t => t);
    const pyramid = document.getElementById('adminPyramid').value.trim();
    const description = document.getElementById('adminDescription').value.trim();

    if (!name || !basePrice) { showToast("Заповніть назву та ціну", "error"); return; }
    PERFUME_PRICES[name] = {
        basePrice: parseFloat(basePrice), discountVolume: parseFloat(discountVolume) || 5,
        discountPrice: parseFloat(discountPrice) || null, barcode: barcode || null,
        gender: gender || null, seasons: seasons, tags: tags,
        pyramid: pyramid || null, description: description || null
    };
    if (PERFUME_STOCK[name] === undefined) PERFUME_STOCK[name] = 0;
    savePerfumePrices(); saveInventory(); renderPerfumeList(); populateFormOptions();
    showToast(`Збережено: ${name}`, "success");
    ['adminPerfumeName', 'adminBasePrice', 'adminBarcode', 'adminTags', 'adminPyramid', 'adminDescription'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('adminGender').value = '';
    document.querySelectorAll('input[name="adminSeason"]').forEach(el => el.checked = false);
}

window.autoFillPerfumeData = async function () {
    const name = document.getElementById('adminPerfumeName').value.trim();
    if (!name) { showToast("⚠️ Спочатку введіть назву парфуму!", "warning"); return; }
    const btn = document.querySelector('button[onclick="autoFillPerfumeData()"]');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true;
    try {
        const prompt = `Ти — експерт-парфумер. Надай дані для парфуму "${name}" у строгому форматі JSON (без зайвого тексту).
            Формат відповіді: { "gender": "Жіночий" | "Чоловічий" | "Унісекс", "seasons": ["Літо", "Зима"], "tags": ["свіжий", "квітковий", "мускусний"], "pyramid": "текст піраміди", "description": "короткий професійний опис" }
            Дані мають бути українською мовою.`;
        const responseText = await callGemini(prompt);
        const data = JSON.parse(responseText.replace(/```json|```/g, '').trim());
        if (data.gender) document.getElementById('adminGender').value = data.gender;
        if (data.seasons) document.querySelectorAll('input[name="adminSeason"]').forEach(el => { el.checked = data.seasons.includes(el.value); });
        if (data.tags) document.getElementById('adminTags').value = data.tags.join(', ');
        if (data.pyramid) document.getElementById('adminPyramid').value = data.pyramid;
        if (data.description) document.getElementById('adminDescription').value = data.description;
        showToast("✨ Дані заповнено за допомогою AI!", "success");
    } catch (err) {
        console.error("AutoFill Error:", err); showToast("❌ Не вдалося отримати дані від AI", "error");
    } finally { btn.innerHTML = originalContent; btn.disabled = false; }
}

window.editPerfume = function (name) {
    const pData = PERFUME_PRICES[name]; if (!pData) return;
    document.getElementById('adminPerfumeName').value = name;
    document.getElementById('adminBasePrice').value = pData.basePrice;
    document.getElementById('adminDiscountVolume').value = pData.discountVolume || 5;
    document.getElementById('adminDiscountPrice').value = pData.discountPrice || '';
    document.getElementById('adminBarcode').value = pData.barcode || '';
    document.getElementById('adminGender').value = pData.gender || '';
    document.querySelectorAll('input[name="adminSeason"]').forEach(el => el.checked = (pData.seasons || []).includes(el.value));
    document.getElementById('adminTags').value = (pData.tags || []).join(', ');
    document.getElementById('adminPyramid').value = pData.pyramid || '';
    document.getElementById('adminDescription').value = pData.description || '';
    document.getElementById('adminPerfumeName').focus();
}

window.renderPerfumeList = function () {
    const tbody = document.getElementById('perfume-list-table').getElementsByTagName('tbody')[0];
    const search = (document.getElementById('perfumeSearchInput')?.value || '').toLowerCase();
    const rows = [];
    Object.keys(PERFUME_PRICES).sort().forEach(name => {
        const pData = PERFUME_PRICES[name];
        if (CATALOG_FILTERS.gender !== 'all' && pData.gender !== CATALOG_FILTERS.gender) return;
        if (CATALOG_FILTERS.season !== 'all' && !(pData.seasons || []).includes(CATALOG_FILTERS.season)) return;
        if (search && !name.toLowerCase().includes(search) && (!pData.barcode || !pData.barcode.includes(search)) && !(pData.tags || []).some(t => t.toLowerCase().includes(search))) return;
        const barcodeDisplay = pData.barcode ? `<span style="font-size:0.75rem; color:var(--text-muted); display:block;">Код: ${pData.barcode}</span>` : '';
        const genderClass = pData.gender === 'Чоловічий' ? 'gender-male' : (pData.gender === 'Жіночий' ? 'gender-female' : 'gender-unisex');
        const genderBadge = pData.gender ? `<span class="badge-gender ${genderClass}">${pData.gender[0]}</span>` : '';
        const seasonBadges = (pData.seasons || []).map(s => `<span class="season-badge">${s === 'Літо' ? '☀️' : '❄️'}</span>`).join('');
        const tagsHtml = (pData.tags || []).map(t => `<span class="tag-badge">${t}</span>`).join('');
        rows.push(`<tr><td>${genderBadge}${seasonBadges}<span class="text-bold">${name}</span>${barcodeDisplay}${tagsHtml}</td><td class="text-right">${pData.basePrice.toFixed(2)} ₴</td><td class="text-right"><button class="btn-sm btn-warning" onclick="editPerfume('${name.replace(/'/g, "\\'")}')""><i class="fa-solid fa-edit"></i></button> <button class="btn-sm btn-danger" onclick="deletePerfume('${name.replace(/'/g, "\\'")}')""><i class="fa-solid fa-trash"></i></button></td></tr>`);
    });
    tbody.innerHTML = rows.join('');
}

window.setCatalogFilter = function (type, value, el) {
    CATALOG_FILTERS[type] = value;
    el.parentElement.querySelectorAll('.filter-chip').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active'); renderPerfumeList();
}

window.deletePerfume = function (name) {
    if (confirm('Видалити?')) { delete PERFUME_PRICES[name]; delete PERFUME_STOCK[name]; savePerfumePrices(); saveInventory(); renderPerfumeList(); renderInventoryList(); populateFormOptions(); }
}

window.addOrUpdateFlacon = function () {
    const vol = parseFloat(document.getElementById('adminFlaconVolume').value); const cost = parseFloat(document.getElementById('adminFlaconCost').value);
    if (vol && cost) { FLACON_COSTS[vol] = cost; if (!FLACON_VOLUMES.includes(vol)) FLACON_VOLUMES.push(vol); saveToLocalStorage(CONFIG_KEYS.FLACONS, FLACON_COSTS); saveToLocalStorage(CONFIG_KEYS.VOLUMES, FLACON_VOLUMES); populateFormOptions(); showToast("Флакон додано", "success"); }
}

window.addOrUpdateMarkupPreset = function () {
    const name = document.getElementById('adminMarkupName').value; const val = parseFloat(document.getElementById('adminMarkupValue').value);
    if (name && val) { MARKUP_PRESETS[name] = val; saveToLocalStorage(CONFIG_KEYS.MARKUPS, MARKUP_PRESETS); populateFormOptions(); showToast("Націнку додано", "success"); }
}
