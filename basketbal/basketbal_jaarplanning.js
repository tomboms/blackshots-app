// --- BASKETBAL_JAARPLANNING.JS: GOOGLE CALENDAR STIJL & TIJDZONE FIX ---

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

    // Trucje om tijdzone fouten te voorkomen voor 'Vandaag'
    let dNu = new Date();
    let vandaagStr = `${dNu.getFullYear()}-${String(dNu.getMonth()+1).padStart(2,'0')}-${String(dNu.getDate()).padStart(2,'0')}`;

    for (let dag = 1; dag <= aantalDagen; dag++) {
        let isoDatum = `${jaar}-${String(maand+1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
        let dagClasses = [];
        if (isoDatum === vandaagStr) dagClasses.push('vandaag');
        
        // 1. Haal items op die OP of OVER deze datum vallen (Meerdaags!)
        let dagItems = window.jaarplanningData.filter(i => {
            let eind = i.eindDatum || i.isoDatum;
            return isoDatum >= i.isoDatum && isoDatum <= eind;
        });
        
        if (dagItems.some(i => i.type === "Vakantie")) dagClasses.push('vakantie-dag');

        let itemsHtml = '';
        dagItems.forEach(item => {
            let badgeClass = `k-${item.type.toLowerCase()}`;
            let eind = item.eindDatum || item.isoDatum;
            let extraClass = '';
            
            // Logica voor de Google Calendar "Doorloop Balken"
            if (item.isoDatum !== eind) {
                extraClass += ' k-multiday';
                if (isoDatum === item.isoDatum) extraClass += ' k-start';
                if (isoDatum === eind) extraClass += ' k-end';
            }

            // Toon de tekst (en prullenbak) alleen op de eerste dag, OF op maandagen om het leesbaar te houden
            let dObj = new Date(isoDatum);
            let isStartOfSpan = (isoDatum === item.isoDatum || dObj.getDay() === 1);
            let weergaveTekst = isStartOfSpan ? item.tekst : '&nbsp;';
            let deleteKnop = isStartOfSpan ? `<span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7; margin-left:5px;" title="Verwijder Reeks">✖</span>` : '';

            itemsHtml += `
                <div class="k-item ${badgeClass} ${extraClass}" title="${item.tekst}">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85%; display:inline-block;">${weergaveTekst}</span>
                    ${deleteKnop}
                </div>
            `;
        });

        // 2. ZAALHUUR SYNC
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
// INTERACTIEF DAG-BEHEER (Nu met Kogelvrije Datums!)
// ============================================================================
let actieveModalDatum = null;

window.openDagModal = function(isoDatum, dag, maand, jaar) {
    actieveModalDatum = isoDatum;
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    document.getElementById('modal-start-label').innerText = `${dag} ${maandNamen[maand]}`;
    document.getElementById('item-tekst').value = '';
    document.getElementById('item-einddatum').value = ''; 
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

    let eindDatum = eindDatumInput ? eindDatumInput : actieveModalDatum;

    // String vergelijking (YYYY-MM-DD) is 100% veilig en immuun voor tijdzone-verschuivingen!
    if (eindDatum < actieveModalDatum) {
        return alert("De einddatum kan niet vóór de startdatum liggen!");
    }

    // Voeg 1 slim item toe die de datums overspant!
    window.jaarplanningData.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        isoDatum: actieveModalDatum,
        eindDatum: eindDatum,
        type: type,
        tekst: tekst
    });

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    tekenKalender();
    sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item (en eventuele reeks) wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    verversModalLijst();
    tekenKalender();
};

function verversModalLijst() {
    let lijst = document.getElementById('modal-huidige-items');
    
    // Pak items die OVER deze dag heen vallen
    let itemsOpDag = window.jaarplanningData.filter(i => {
        let eind = i.eindDatum || i.isoDatum;
        return actieveModalDatum >= i.isoDatum && actieveModalDatum <= eind;
    });
    
    if(itemsOpDag.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Geen items gepland op deze datum.</p>';
        return;
    }

    let html = '';
    itemsOpDag.forEach(item => {
        let badgeClass = `k-${item.type.toLowerCase()}`;
        let extraInfo = (item.isoDatum !== item.eindDatum) ? ` <small style="color:#7f8c8d;">(Reeks t/m ${item.eindDatum})</small>` : '';
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:8px; border:1px solid #eee; border-radius:4px; margin-bottom:5px;">
                <div><span class="k-item ${badgeClass}" style="margin-right:10px;">${item.type}</span> ${item.tekst} ${extraInfo}</div>
                <button onclick="verwijderItem('${item.id}')" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;">🗑️</button>
            </div>
        `;
    });
    lijst.innerHTML = html;
}

window.verwerkPlanningBestand = function(e) {
    alert(`Functie momenteel omgeleid: Klik in de visuele kalender op een datum om direct items in bulk (t/m datum) toe te voegen! Dit is veel sneller en overzichtelijker dan Excel.`);
};

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de hele jaarplanning leeg wilt gooien?")) {
        localStorage.removeItem('blackshots_jaarplanning_data');
        location.reload();
    }
};