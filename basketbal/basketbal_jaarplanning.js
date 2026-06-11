// --- BASKETBAL_JAARPLANNING.JS: INTERACTIEVE BLOKKEN & ZAALHUUR SYNC ---

window.jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || []; // Ophalen voor de sync!

let huidigeMaand = new Date().getMonth();
let huidigJaar = new Date().getFullYear();
let weergaveIsJaar = false;

document.addEventListener('DOMContentLoaded', () => {
    tekenKalender();
});

// ============================================================================
// KALENDER ENGINE (Tekent de blokken)
// ============================================================================
function tekenKalender() {
    let container = document.getElementById('kalender-container');
    container.innerHTML = '';

    if (weergaveIsJaar) {
        // Jaarweergave: Teken 12 maanden onder elkaar
        for(let m = 0; m < 12; m++) {
            container.innerHTML += genereerMaandHTML(huidigJaar, m);
        }
    } else {
        // Maandweergave: 1 maand met navigatie knoppen
        container.innerHTML = genereerMaandHTML(huidigJaar, huidigeMaand, true);
    }
}

function wisselWeergave() {
    weergaveIsJaar = !weergaveIsJaar;
    document.getElementById('btn-weergave').innerText = weergaveIsJaar ? "🗓️ Toon 1 Maand" : "🗓️ Toon Hele Jaar";
    if(weergaveIsJaar) {
        huidigeMaand = 0; // Spring naar Januari
    } else {
        huidigeMaand = new Date().getMonth(); // Terug naar nu
    }
    tekenKalender();
}

function wijzigMaand(delta) {
    huidigeMaand += delta;
    if (huidigeMaand < 0) { huidigeMaand = 11; huidigJaar--; }
    if (huidigeMaand > 11) { huidigeMaand = 0; huidigJaar++; }
    tekenKalender();
}

const maandNamen = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

function genereerMaandHTML(jaar, maand, toonNavigatie = false) {
    let eersteDag = new Date(jaar, maand, 1).getDay();
    let aantalDagen = new Date(jaar, maand + 1, 0).getDate();
    
    // JS dagen: 0=Zondag, 1=Maandag. Wij willen Maandag als start.
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

    // Lege startvakjes
    for (let i = 0; i < startVakje; i++) {
        html += `<div class="kalender-dag leeg"></div>`;
    }

    let vandaagStr = new Date().toISOString().split('T')[0];

    // Dagen tekenen
    for (let dag = 1; dag <= aantalDagen; dag++) {
        let isoDatum = `${jaar}-${(maand+1).toString().padStart(2, '0')}-${dag.toString().padStart(2, '0')}`;
        let isVandaag = (isoDatum === vandaagStr) ? 'vandaag' : '';
        
        // 1. Haal specifieke Jaarplanning items op voor deze dag
        let dagItems = window.jaarplanningData.filter(i => i.isoDatum === isoDatum);
        let itemsHtml = '';
        dagItems.forEach(item => {
            let badgeClass = `k-${item.type.toLowerCase()}`;
            itemsHtml += `<div class="k-item ${badgeClass}">${item.tekst}</div>`;
        });

        // 2. MAGISCHE ZAALHUUR SYNC! Zoek of we zalen gehuurd hebben op deze dag
        let zalenOpDag = window.zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
        let uniekeZalen = [...new Set(zalenOpDag.map(z => z.zaal))];
        let zaalBalkHtml = '';
        if (uniekeZalen.length > 0) {
            // Als de naam heel lang is, maken we hem kort (Sporthal VEKA -> VEKA)
            let korteNamen = uniekeZalen.map(z => z.replace('Sporthal', '').replace('Sportzaal', '').trim());
            zaalBalkHtml = `<div class="kalender-zaal-balk">📍 ${korteNamen.join(' & ')}</div>`;
        }

        html += `
            <div class="kalender-dag ${isVandaag}" onclick="openDagModal('${isoDatum}', ${dag}, ${maand}, ${jaar})">
                <div class="kalender-dag-nummer">${dag}</div>
                <div class="kalender-items">${itemsHtml}</div>
                ${zaalBalkHtml} </div>
        `;
    }

    // Lege eindvakjes opvullen
    let totaalVakjes = startVakje + aantalDagen;
    let restVakjes = (totaalVakjes % 7 === 0) ? 0 : 7 - (totaalVakjes % 7);
    for (let i = 0; i < restVakjes; i++) {
        html += `<div class="kalender-dag leeg"></div>`;
    }

    html += `</div></div>`;
    return html;
}

// ============================================================================
// INTERACTIEVE ITEM BEHEERDER (Op dag klikken)
// ============================================================================
let actieveModalDatum = null;

window.openDagModal = function(isoDatum, dag, maand, jaar) {
    actieveModalDatum = isoDatum;
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    document.getElementById('item-tekst').value = '';
    
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
    
    if(!tekst) return alert("Vul een omschrijving in!");

    window.jaarplanningData.push({
        id: Date.now().toString(),
        isoDatum: actieveModalDatum,
        type: type,
        tekst: tekst
    });

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    verversModalLijst();
    tekenKalender();
    document.getElementById('item-tekst').value = ''; // Maak veld leeg voor snelle 2e toevoeging
};

window.verwijderItem = function(id) {
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    verversModalLijst();
    tekenKalender();
};

function verversModalLijst() {
    let lijst = document.getElementById('modal-huidige-items');
    let itemsOpDag = window.jaarplanningData.filter(i => i.isoDatum === actieveModalDatum);
    
    if(itemsOpDag.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Geen items gepland op deze dag.</p>';
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

// ============================================================================
// OUDE BULK UPLOAD (Mocht je ooit grote excellijsten willen importeren)
// ============================================================================
window.verwerkPlanningBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        ruweData.forEach(row => {
            let keys = Object.keys(row);
            let datumKey = keys.find(k => k.toLowerCase().includes('datum'));
            let omsKey = keys.find(k => k.toLowerCase().includes('omschrijving') || k.toLowerCase().includes('activiteit'));
            
            if (datumKey && omsKey && row[datumKey] && row[omsKey]) {
                let datum = row[datumKey].toString().trim();
                let oms = row[omsKey].toString().trim();
                
                // Slimme type herkenning
                let tLower = oms.toLowerCase();
                let type = "Memo";
                if (tLower.includes('betaling') || tLower.includes('financieel')) type = "Financieel";
                if (tLower.includes('thuis') || tLower.includes('wedstrijd')) type = "Thuis";
                if (tLower.includes('uit') && tLower.includes('wedstrijd')) type = "Uit";
                if (tLower.includes('vakantie') || tLower.includes('feestdag')) type = "Vakantie";
                if (tLower.includes('alv') || tLower.includes('bestuur') || tLower.includes('vergadering')) type = "Vergadering";
                if (tLower.includes('activiteit')) type = "Activiteit";
                if (tLower.includes('tijdelijk') || tLower.includes('optie')) type = "Tijdelijk";
                
                let iso = "";
                let match = datum.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
                if (match) {
                    let d = match[1].padStart(2, '0'); let m = match[2].padStart(2, '0'); let y = match[3];
                    if (y.length === 2) y = "20" + y;
                    iso = `${y}-${m}-${d}`;
                }

                if(iso) {
                    window.jaarplanningData.push({ id: Date.now() + Math.random().toString(), isoDatum: iso, type: type, tekst: oms });
                }
            }
        });

        localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
        tekenKalender();
        alert("Bestand succesvol ingelezen!");
    };
    reader.readAsArrayBuffer(file);
};

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de jaarplanning wilt wissen?")) {
        localStorage.removeItem('blackshots_jaarplanning_data');
        location.reload();
    }
};