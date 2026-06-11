// --- BASKETBAL_JAARPLANNING.JS: INTERACTIEVE KLIKBARE KALENDER & ZAAL SYNC ---

window.jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

let huidigeMaand = new Date().getMonth();
let huidigJaar = new Date().getFullYear();
let weergaveIsJaar = false;

document.addEventListener('DOMContentLoaded', () => {
    tekenKalender();
});

// ============================================================================
// KALENDER ENGINE
// ============================================================================
window.tekenKalender = function() {
    let container = document.getElementById('kalender-container');
    container.innerHTML = '';

    if (weergaveIsJaar) {
        for(let m = 0; m < 12; m++) container.innerHTML += genereerMaandHTML(huidigJaar, m);
    } else {
        container.innerHTML = genereerMaandHTML(huidigJaar, huidigeMaand, true);
    }
};

window.wisselWeergave = function() {
    weergaveIsJaar = !weergaveIsJaar;
    document.getElementById('btn-weergave').innerText = weergaveIsJaar ? "🗓️ Toon 1 Maand" : "🗓️ Toon Hele Jaar";
    if(weergaveIsJaar) huidigeMaand = 0;
    else huidigeMaand = new Date().getMonth();
    tekenKalender();
};

window.wijzigMaand = function(delta) {
    huidigeMaand += delta;
    if (huidigeMaand < 0) { huidigeMaand = 11; huidigJaar--; }
    if (huidigeMaand > 11) { huidigeMaand = 0; huidigJaar++; }
    tekenKalender();
};

const maandNamen = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

function genereerMaandHTML(jaar, maand, toonNavigatie = false) {
    let eersteDag = new Date(jaar, maand, 1).getDay();
    let aantalDagen = new Date(jaar, maand + 1, 0).getDate();
    let startVakje = eersteDag === 0 ? 6 : eersteDag - 1; 

    let navHtml = toonNavigatie ? `
        <div>
            <button onclick="wijzigMaand(-1)" class="kalender-nav-btn">◀ Vorige</button>
            <button onclick="wijzigMaand(1)" class="kalender-nav-btn">Volgende ▶</button>
        </div>
    ` : '<div></div>';

    let html = `
        <div style="margin-bottom: 30px;">
            <div class="kalender-header">
                <h2 style="margin:0; font-size:1.5rem;">${maandNamen[maand]} ${jaar}</h2>
                ${navHtml}
            </div>
            <div class="kalender-weekdagen">
                <div>Ma</div><div>Di</div><div>Wo</div><div>Do</div><div>Vr</div><div>Za</div><div>Zo</div>
            </div>
            <div class="kalender-grid">
    `;

    for (let i = 0; i < startVakje; i++) html += `<div class="kalender-dag leeg"></div>`;

    let vandaagStr = new Date().toISOString().split('T')[0];

    for (let dag = 1; dag <= aantalDagen; dag++) {
        let isoDatum = `${jaar}-${(maand+1).toString().padStart(2, '0')}-${dag.toString().padStart(2, '0')}`;
        let isVandaag = (isoDatum === vandaagStr) ? 'vandaag' : '';
        
        // 1. Haal items op uit het geheugen!
        let dagItems = window.jaarplanningData.filter(i => i.isoDatum === isoDatum);
        let itemsHtml = '';
        dagItems.forEach(item => {
            let badgeClass = `k-${item.type.toLowerCase()}`;
            // Stop de event propagation zodat het vakje erachter niet ook klikt
            itemsHtml += `
                <div class="k-item ${badgeClass}" title="${item.tekst}">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">${item.tekst}</span>
                    <span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7;" title="Verwijder">✖</span>
                </div>
            `;
        });

        // 2. MAGISCHE ZAALHUUR SYNC (Subtiel, zonder lelijke ballonnetjes)
        let zalenOpDag = window.zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
        let uniekeZalen = [...new Set(zalenOpDag.map(z => z.zaal))];
        let zaalBalkHtml = '';
        if (uniekeZalen.length > 0) {
            let korteNamen = uniekeZalen.map(z => z.replace('Sporthal', '').replace('Sportzaal', '').trim());
            zaalBalkHtml = `<div class="kalender-zaal-balk">${korteNamen.join(' & ')}</div>`;
        }

        // Het vakje is klikbaar en opent de pop-up
        html += `
            <div class="kalender-dag ${isVandaag}" onclick="openDagModal('${isoDatum}', ${dag}, ${maand}, ${jaar})">
                <div class="kalender-dag-nummer">${dag}</div>
                <div class="kalender-items">${itemsHtml}</div>
                ${zaalBalkHtml}
            </div>
        `;
    }

    let totaalVakjes = startVakje + aantalDagen;
    let restVakjes = (totaalVakjes % 7 === 0) ? 0 : 7 - (totaalVakjes % 7);
    for (let i = 0; i < restVakjes; i++) html += `<div class="kalender-dag leeg"></div>`;

    html += `</div></div>`;
    return html;
}

// ============================================================================
// INTERACTIEF DAG-BEHEER (Klik op een dag in de kalender!)
// ============================================================================
let actieveModalDatum = null;

window.openDagModal = function(isoDatum, dag, maand, jaar) {
    actieveModalDatum = isoDatum;
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    document.getElementById('item-tekst').value = '';
    
    document.getElementById('dag-modal').style.display = 'flex';
    document.getElementById('item-tekst').focus();
};

window.sluitDagModal = function() {
    document.getElementById('dag-modal').style.display = 'none';
};

window.slaItemOp = function() {
    let type = document.getElementById('item-type').value;
    let tekst = document.getElementById('item-tekst').value.trim();
    
    if(!tekst) return alert("Vul een omschrijving in!");

    window.jaarplanningData.push({
        id: Date.now().toString(),
        isoDatum: actieveModalDatum,
        type: type,
        tekst: tekst
    });

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    tekenKalender();
    sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item uit de kalender wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    tekenKalender();
};

// ============================================================================
// OUDE BULK UPLOAD (Mocht je ooit CSV/Excel willen plakken)
// ============================================================================
window.verwerkPlanningBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1}); // Leest zonder headers om jouw rare Excel te pakken!
        
        let toegevoegd = 0;

        ruweData.forEach(row => {
            if(!row || row.length === 0) return;
            let tekst = row.join(' ').trim();
            if(!tekst) return;

            // Pakt datums zoals "12 jun" of "12-06-2026"
            let match = tekst.match(/(\d{1,2})[-/\s]([a-zA-Z]+|\d{1,2})[-/\s]?(\d{2,4})?/);
            if(match) {
                // Hier zit nog de logica in voor een CSV, maar we sturen je naar handmatig typen!
            }
        });
        
        alert(`Functie momenteel omgeleid: Klik in de visuele kalender op een datum om hem toe te voegen! Dit is veel sneller dan de warrige Excel upload.`);
    };
    reader.readAsArrayBuffer(file);
};

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de hele jaarplanning leeg wilt gooien?")) {
        localStorage.removeItem('blackshots_jaarplanning_data');
        location.reload();
    }
};