// --- BASKETBAL_JAARPLANNING.JS: DE MASTER KAPSTOK ---

window.jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.jaarplanningData.length > 0) {
        document.getElementById('label-planning').innerText = `✅ Planning geladen (${window.jaarplanningData.length} items)`;
        tekenPlanning();
    }
});

// ============================================================================
// HET LIJST-SJABLOON (Cruciaal voor software!)
// ============================================================================
window.downloadSjabloon = function() {
    const wb = XLSX.utils.book_new();
    const sjabloonData = [
        ["Datum", "Omschrijving / Activiteit", "Locatie", "Opmerking"],
        ["24-12-2026", "Kerstavond", "-", "Sporthallen gesloten"],
        ["10-09-2026", "Betaling 1e termijn contributie", "-", "Deadline penningmeester"],
        ["15-11-2026", "Thuis wedstrijden", "Sporthal VEKA", "Vanaf U14 t/m Heren 1"],
        ["22-09-2026", "ALV Bestuur", "Sportzaal Westwijzer", "Start 20:00"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sjabloonData);
    XLSX.utils.book_append_sheet(wb, ws, "Jaarplanning Lijst");
    XLSX.writeFile(wb, "Jaarplanning_Sjabloon_Lijst.xlsx");
};

// ============================================================================
// DE SLIMME LABEL-SCANNER
// ============================================================================
function bepaalType(tekst) {
    let t = tekst.toLowerCase();
    
    if (t.includes('betaling') || t.includes('termijn') || t.includes('contributie') || t.includes('financ')) return "Financieel";
    if (t.includes('deadline') || t.includes('uiterlijk')) return "Deadline";
    if (t.includes('alv') || t.includes('vergadering') || t.includes('bespreking') || t.includes('bestuur')) return "Bestuur";
    if (t.includes('vakantie') || t.includes('feestdag') || t.includes('kerst') || t.includes('oudjaar') || t.includes('nieuwjaar')) return "Vakantie";
    if (t.includes('wedstrijd') || t.includes('toernooi')) return "Wedstrijd";
    if (t.includes('training') || t.includes('veka') || t.includes('veste') || t.includes('westwijzer')) return "Training";
    
    return "Overig";
}

function parseDatumNaarISO(datumStr) {
    if (!datumStr) return "9999-12-31";
    
    // Bijv "24-12-2026"
    let match = datumStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (match) {
        let d = match[1].padStart(2, '0');
        let m = match[2].padStart(2, '0');
        let y = match[3];
        if (y.length === 2) y = "20" + y;
        return `${y}-${m}-${d}`;
    }
    return datumStr; // Fallback
}

// ============================================================================
// EXCEL INLEZEN
// ============================================================================
window.verwerkPlanningBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-planning').innerText = `⏳ Inlezen...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        window.jaarplanningData = [];

        ruweData.forEach(row => {
            let keys = Object.keys(row);
            let datumKey = keys.find(k => k.toLowerCase().includes('datum'));
            let omsKey = keys.find(k => k.toLowerCase().includes('omschrijving') || k.toLowerCase().includes('activiteit'));
            let locKey = keys.find(k => k.toLowerCase().includes('locatie'));
            
            if (datumKey && omsKey && row[datumKey] && row[omsKey]) {
                let datum = row[datumKey].toString().trim();
                let oms = row[omsKey].toString().trim();
                let type = bepaalType(oms);
                
                window.jaarplanningData.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 9),
                    datum: datum,
                    isoDatum: parseDatumNaarISO(datum),
                    omschrijving: oms,
                    locatie: locKey && row[locKey] ? row[locKey].toString().trim() : "",
                    type: type
                });
            }
        });

        // Sorteer netjes op datum
        window.jaarplanningData.sort((a, b) => a.isoDatum.localeCompare(b.isoDatum));

        localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
        document.getElementById('label-planning').innerText = `✅ Ingeladen: ${window.jaarplanningData.length} items`;
        tekenPlanning();
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// TIJDLIJN TEKENEN
// ============================================================================
window.tekenPlanning = function() {
    let container = document.getElementById('planning-resultaten');
    let filterType = document.getElementById('filter-type').value;

    let data = window.jaarplanningData.filter(item => {
        return !filterType || item.type === filterType;
    });

    if (data.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen activiteiten gevonden in de planning.</p>';
        return;
    }

    // Groepeer op Maand-Jaar (bijv "2026-12")
    let maanden = {};
    data.forEach(item => {
        let maandKey = item.isoDatum.substring(0, 7); // Pakt YYYY-MM
        if (!maanden[maandKey]) maanden[maandKey] = [];
        maanden[maandKey].push(item);
    });

    let html = '';
    
    // Zet maand-cijfers om naar mooie tekst
    const maandNamen = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

    Object.keys(maanden).sort().forEach(mKey => {
        let y = mKey.split('-')[0];
        let m = parseInt(mKey.split('-')[1]) - 1;
        let mooieMaand = `${maandNamen[m]} ${y}`;

        html += `<div class="timeline-maand">${mooieMaand}</div>`;

        maanden[mKey].forEach(item => {
            let labelClass = `label-${item.type.toLowerCase()}`;
            let icon = "📌";
            if (item.type === "Financieel") icon = "💰";
            if (item.type === "Deadline") icon = "⏰";
            if (item.type === "Bestuur") icon = "🗣️";
            if (item.type === "Vakantie") icon = "🌴";
            if (item.type === "Wedstrijd") icon = "🏀";
            if (item.type === "Training") icon = "🏃‍♂️";

            html += `
                <div class="timeline-item ${labelClass}">
                    <div>
                        <strong style="color:#2c3e50; font-size:1.1rem; display:block; margin-bottom:5px;">${item.datum}</strong>
                        <span style="font-size:1.1rem; color:#34495e;">${item.omschrijving}</span>
                        ${item.locatie && item.locatie !== '-' ? `<br><small style="color:#7f8c8d;">📍 ${item.locatie}</small>` : ''}
                    </div>
                    <div>
                        <span class="label-badge badge">${icon} ${item.type}</span>
                    </div>
                </div>
            `;
        });
    });

    container.innerHTML = html;
};

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de jaarplanning wilt wissen?")) {
        localStorage.removeItem('blackshots_jaarplanning_data');
        location.reload();
    }
};