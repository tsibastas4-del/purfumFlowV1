// ==========================================
//  AI — Gemini API, Smart Parse, Admin Bot, SMM
// ==========================================

async function callGemini(prompt) {
    const apiKey = localStorage.getItem('gemini_api_key');
    const model = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
    if (!apiKey) { showToast("🔑 Додайте Gemini API Key у налаштуваннях!", "error"); openSettingsModal(); throw new Error("API Key missing"); }
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, topP: 1 } }) });
        if (response.status === 429) throw new Error("⏳ Перевищено ліміт запитів ШІ. Зачекайте 15-30 секунд.");
        const data = await response.json();
        if (data.error) { if (data.error.message.includes("quota") || data.error.message.includes("limit")) throw new Error("⏳ Квота ШІ вичерпана."); throw new Error(data.error.message); }
        if (!data.candidates || !data.candidates[0].content.parts[0].text) throw new Error("Порожня відповідь від AI");
        return data.candidates[0].content.parts[0].text;
    } catch (err) { console.error("Gemini Error:", err); throw err; }
}

// --- AI PARSING ---
window.smartParseAI = async function (mode = 'single') {
    const inputId = mode === 'order' ? 'pasteAreaOrder' : 'pasteArea';
    const text = document.getElementById(inputId).value;
    if (!text) { showToast("⚠️ Спочатку вставте текст!", "warning"); return; }
    const btn = document.querySelector(`button[onclick*="smartParseAI"]`);
    const originalText = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Обробка...'; btn.disabled = true;
    try {
        const perfumesList = Object.keys(PERFUME_PRICES).join(', '); const volumesList = FLACON_VOLUMES.join(', ');
        const prompt = `Ти — професійний асистент CRM для продажу парфумерії.\nКАТАЛОГ: [${perfumesList}]\nОБ'ЄМИ: [${volumesList}]\nПОВЕРНИ ТІЛЬКИ JSON:\n{ "clientName": "ПІБ", "phone": "0XXXXXXXXX", "city": "Місто", "postOffice": "Номер", "items": [{ "perfumeName": "назва", "volume": число }] }\nТЕКСТ: "${text}"`;
        const responseText = await callGemini(prompt);
        const result = JSON.parse(responseText.replace(/```json/g, '').replace(/```/g, '').trim());
        const fieldMap = mode === 'order' ? { name: 'clientNameOrder', phone: 'phoneOrder', city: 'cityOrder', post: 'postOfficeOrder' } : { name: 'clientNameSingle', phone: 'phoneSingle', city: 'citySingle', post: 'postOfficeSingle' };
        if (result.clientName) document.getElementById(fieldMap.name).value = result.clientName;
        if (result.phone) document.getElementById(fieldMap.phone).value = result.phone;
        if (result.city) document.getElementById(fieldMap.city).value = result.city;
        if (result.postOffice) document.getElementById(fieldMap.post).value = result.postOffice;
        if (result.items && result.items.length > 0) {
            let addedCount = 0; const markup = document.getElementById('saleMarkupTierOrder')?.value || 'Стандарт';
            result.items.forEach(item => { if (item.perfumeName && PERFUME_PRICES[item.perfumeName] && item.volume) { if (mode === 'order') { const calc = calculateCost(item.perfumeName, item.volume, markup); if (calc) { CURRENT_ORDER_LIST.push({ ...calc, name: item.perfumeName, vol: item.volume, markup: markup }); addedCount++; } } else { if (addedCount === 0) { document.getElementById('perfumeName').value = item.perfumeName; document.getElementById('flaconVolume').value = item.volume; addedCount++; } } } });
            if (addedCount > 0) { if (mode === 'order') renderOrderList(); showToast(`🤖 AI розпізнав та додав ${addedCount} позицій!`, "success"); }
        }
        if (result.clientName) { const inputEl = mode === 'order' ? document.getElementById('clientNameOrder') : document.getElementById('clientNameSingle'); checkClientLoyalty(inputEl); }
    } catch (err) {
        console.error(err); showToast("❌ Помилка AI розбору.", "error");
    } finally { btn.innerHTML = originalText; btn.disabled = false; }
}

// --- UNIVERSAL ADMIN BOT ---
window.runAdminAI = async function () {
    const input = document.getElementById('adminAiChatInput').value.trim(); if (!input) return;
    const resDiv = document.getElementById('adminAiResponse'); const contentDiv = document.getElementById('adminAiResponseContent');
    const btn = document.querySelector('button[onclick="runAdminAI()"]');
    resDiv.style.display = 'block'; contentDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Аналізую...'; btn.disabled = true;
    try {
        const perfumesList = Object.entries(PERFUME_PRICES).map(([name, data]) => `- ${name}: ${PERFUME_STOCK[name] || 0} мл, ${data.gender || '?'}, ${(data.tags || []).join(', ')}`).join('\n');
        const prompt = `Ти — професійний менеджер магазину парфумерії.\nКаталог:\n${perfumesList}\nФормула OLX: ((Ціна+35)*1.03).\nЗАПИТ: "${input}"`;
        const responseText = await callGemini(prompt); contentDiv.innerHTML = responseText;
    } catch (err) {
        console.error(err); contentDiv.innerHTML = "❌ Помилка: " + err.message;
    } finally { btn.disabled = false; }
}

// --- SMM CREATOR ---
window.generateSMMContent = async function () {
    const pName = document.getElementById('smmPerfumeName').value; const goal = document.getElementById('smmGoal').value;
    if (!pName || !PERFUME_PRICES[pName]) { showToast("⚠️ Оберіть парфум зі списку!", "warning"); return; }
    const pData = PERFUME_PRICES[pName]; const outDiv = document.getElementById('smmOutput'); const outContent = document.getElementById('smmOutputContent');
    const btn = document.querySelector('button[onclick="generateSMMContent()"]');
    outDiv.style.display = 'block'; outContent.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Створюю креатив...'; btn.disabled = true;
    try {
        const prompt = `Ти — SMM-менеджер парфумерного бренду.\nПарфум: "${pName}". Стать: ${pData.gender}, Сезони: ${(pData.seasons || []).join(', ')}, Теги: ${(pData.tags || []).join(', ')}.\nЦіль: ${goal}.\nСтвори контент українською. Використовуй емодзі, заклики та хештеги.`;
        const responseText = await callGemini(prompt); outContent.innerHTML = responseText;
    } catch (err) {
        console.error(err); outContent.innerHTML = "❌ Помилка: " + err.message;
    } finally { btn.disabled = false; }
}
