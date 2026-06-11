// --- BASKETBAL_JAARPLANNING.JS: BULK TOEVOEGEN & VAKANTIE MARKERING ---

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
        let dagClasses = [];
        if (isoDatum === vandaagStr) dagClasses.push('vandaag');
        
        let dagItems = window.jaarplanningData.filter(i => i.isoDatum === isoDatum);
        
        // CHECK VOOR RODE VAKANTIE ACHTERGROND
        if (dagItems.some(i => i.type === "Vakantie")) {
            dagClasses.push('vakantie-dag');
        }

        let itemsHtml = '';
        dagItems.forEach(item => {
            let badgeClass = `k-${item.type.toLowerCase()}`;
            itemsHtml += `
                <div class="k-item ${badgeClass}" title="${item.tekst}">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">${item.tekst}</span>
                    <span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7;" title="Verwijder">✖</span>
                </div>
            `;
        });

        let zalenOpDag = window.zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
        let uniekeZalen = [...new Set(zalenOpDag.map(z => z.zaal))];
        let zaalBalkHtml = '';
        if (uniekeZalen.length > 0) {
            let korteNamen = uniekeZalen.map(z => z.replace('Sporthal', '').replace('Sportzaal', '').trim());
            zaalBalkHtml = `<div class="kalender-zaal-balk">${korteNamen.join(' & ')}</div>`;
        }

        html += `
            <div class="kalender-dag ${dagClasses.join(' ')}" onclick="openDagModal('${isoDatum}', ${dag}, ${maand}, ${jaar})">
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
// INTERACTIEF DAG-BEHEER MET BULK TOEVOEGING
// ============================================================================
let actieveModalDatum = null;

window.openDagModal = function(isoDatum, dag, maand, jaar) {
    actieveModalDatum = isoDatum;
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    document.getElementById('modal-start-label').innerText = `${dag} ${maandNamen[maand]}`;
    document.getElementById('item-tekst').value = '';
    document.getElementById('item-einddatum').value = ''; // Reset einddatum
    
    // Zet de einddatum min-waarde op de geselecteerde startdatum
    document.getElementById('item-einddatum').min = isoDatum;
    
    verversModalLijst();
    document.getElementById('dag-modal').style.display = 'flex';
    document.getElementById('item-tekst').focus();
};

window.sluitDagModal = function() {
    document.getElementById('dag-modal').style.display = 'none';
};

window.slaItemOp = function() {
    let type = document.getElementById('item-type').value;
    let tekst = document.getElementById('item-tekst').value.trim();
    let eindDatumInput = document.getElementById('item-einddatum').value;
    
    if(!tekst) return alert("Vul een omschrijving in!");

    let startDatumObj = new Date(actieveModalDatum);
    let eindDatumObj = eindDatumInput ? new Date(eindDatumInput) : new Date(actieveModalDatum);

    if (eindDatumObj < startDatumObj) {
        return alert("De einddatum kan niet vóór de startdatum liggen!");
    }

    // Doorloop de datums en voeg voor élke dag in de reeks het item toe
    let huidigeDatum = new Date(startDatumObj);
    while (huidigeDatum <= eindDatumObj) {
        let isoFormaat = huidigeDatum.toISOString().split('T')[0];
        
        window.jaarplanningData.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            isoDatum: isoFormaat,
            type: type,
            tekst: tekst
        });
        
        // Ga 1 dag vooruit
        huidigeDatum.setDate(huidigeDatum.getDate() + 1);
    }

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    tekenKalender();
    sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    verversModalLijst(); // Mocht je toevallig in de modal zitten
    tekenKalender();
};

function verversModalLijst() {
    let lijst = document.getElementById('modal-huidige-items');
    let itemsOpDag = window.jaarplanningData.filter(i => i.isoDatum === actieveModalDatum);
    
    if(itemsOpDag.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Geen items gepland op deze startdatum.</p>';
        return;
    }

    let html = '';
    itemsOpDag.forEach(item => {
        let badgeClass = `k-${item.type.toLowerCase()}`;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:8px; border:1px solid #eee; border-radius:4px; margin-bottom:5px;">
                <div><span class="k-item ${badgeClass}" style="margin-right:10px;">${item.type}</span> ${item.tekst}</div>
                <button onclick="verwijderItem('${item.id}')" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;">🗑️</button>
            </div>
        `;
    });
    lijst.innerHTML = html;
}

// Oude Excel Bulk Upload
window.verwerkPlanningBestand = function(e) {
    alert(`Functie momenteel omgeleid: Klik in de visuele kalender op een datum om direct items in bulk (t/m datum) toe te voegen! Dit is veel sneller en overzichtelijker dan Excel.`);
};

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de hele jaarplanning leeg wilt gooien?")) {
        localStorage.removeItem('blackshots_jaarplanning_data');
        location.reload();
    }
};