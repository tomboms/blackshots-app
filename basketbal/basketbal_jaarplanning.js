// --- BASKETBAL_JAARPLANNING.JS: DE DYNAMISCHE HUB (LEEST MEE MET ANDERE MODULES) ---

// 1. Haal de eigen handmatige data op
window.jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];

// 2. Haal de data van ANDERE modules op (De "Lees-mee" functie)
window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.bestuurAgenda = JSON.parse(localStorage.getItem('blackshots_bestuur_agenda')) || []; // Voor in de toekomst
window.interneCompetitie = JSON.parse(localStorage.getItem('blackshots_interne_competitie')) || []; // Voor in de toekomst

// Standaard Black Shots Categorieën
const standaardCategorieen = [
    { id: 'thuis', naam: 'Thuis Wedstrijd', kleur: '#27ae60', isVakantie: false },
    { id: 'uit', naam: 'Uit Wedstrijd', kleur: '#e74c3c', isVakantie: false },
    { id: 'training', naam: 'Training', kleur: '#16a085', isVakantie: false },
    { id: 'vergadering', naam: 'Vergadering', kleur: '#34495e', isVakantie: false },
    { id: 'financieel', naam: 'Financieel', kleur: '#e84393', isVakantie: false },
    { id: 'vakantie', naam: 'Vakantie / Feestdag', kleur: '#f1c40f', isVakantie: true },
    { id: 'activiteit', naam: 'Activiteit', kleur: '#9b59b6', isVakantie: false },
    { id: 'tijdelijk', naam: 'Tijdelijk', kleur: '#ecf0f1', isVakantie: false, tekstKleur: '#7f8c8d', dashed: true },
    { id: 'memo', naam: 'Memo / Overig', kleur: '#3498db', isVakantie: false }
];

window.kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_categorieen')) || standaardCategorieen;

let huidigeMaand = new Date().getMonth();
let huidigJaar = new Date().getFullYear();
let weergaveIsJaar = false;

document.addEventListener('DOMContentLoaded', () => {
    laadDynamischeKleuren();
    vulDropdown();
    tekenKalender();
});

function laadDynamischeKleuren() {
    let styleTag = document.getElementById('dynamic-category-styles');
    let cssText = '';
    window.kalenderCategorieen.forEach(cat => {
        let tKleur = cat.tekstKleur || '#ffffff';
        let border = cat.dashed ? `1px dashed #95a5a6` : 'none';
        let shadow = cat.dashed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)';
        cssText += `.k-${cat.id} { background-color: ${cat.kleur} !important; color: ${tKleur} !important; border: ${border} !important; box-shadow: ${shadow} !important; }`;
    });
    styleTag.innerHTML = cssText;
}

function vulDropdown() {
    let select = document.getElementById('item-type');
    if(!select) return;
    select.innerHTML = '';
    window.kalenderCategorieen.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.naam}</option>`;
    });
}

// ============================================================================
// DYNAMISCHE DATA GENERATORS (Zet andere modules om naar kalender-items)
// ============================================================================

// Haalt teams uit de lange NBB naam (bijv. "Black Shots MSE 1" -> "MSE 1")
function stripTeamNaam(langeNaam) {
    if(!langeNaam) return "?";
    return langeNaam.replace(/Black Shots/ig, '').trim();
}

function haalDynamischeItemsOp(isoDatum) {
    let dynamischeItems = [];

    // 1. NBB WEDSTRIJDEN BUNDELEN
    let wedstrijdenOpDag = window.nbbWedstrijden.filter(w => w.Datum && w.Datum.startsWith(isoDatum));
    if (wedstrijdenOpDag.length > 0) {
        let thuisTeams = [];
        let uitTeams = [];

        wedstrijdenOpDag.forEach(w => {
            if (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots')) {
                thuisTeams.push(stripTeamNaam(w.Thuisteam));
            } else if (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots')) {
                uitTeams.push(stripTeamNaam(w.Uitteam));
            }
        });

        if (thuisTeams.length > 0) {
            dynamischeItems.push({
                isDynamisch: true,
                bron: "Poule-indeling",
                type: "thuis",
                titel: `Thuis: ${[...new Set(thuisTeams)].join(', ')}`,
                omschrijving: `Geïmporteerd via NBB JSON.\nTeams: ${thuisTeams.join(', ')}`
            });
        }
        if (uitTeams.length > 0) {
            dynamischeItems.push({
                isDynamisch: true,
                bron: "Poule-indeling",
                type: "uit",
                titel: `Uit: ${[...new Set(uitTeams)].join(', ')}`,
                omschrijving: `Geïmporteerd via NBB JSON.\nTeams: ${uitTeams.join(', ')}`
            });
        }
    }

    // 2. TOEKOMSTIGE BESTUURSAGENDA (Placeholder)
    let agendaOpDag = window.bestuurAgenda.filter(a => a.isoDatum === isoDatum);
    agendaOpDag.forEach(a => {
        dynamischeItems.push({
            isDynamisch: true, bron: "Bestuur", type: "vergadering", 
            titel: a.titel || "Vergadering", 
            omschrijving: "Klik hier om naar de agenda te gaan (binnenkort mogelijk)."
        });
    });

    // 3. TOEKOMSTIGE INTERNE COMPETITIE (Placeholder)
    let internOpDag = window.interneCompetitie.filter(i => i.isoDatum === isoDatum);
    if(internOpDag.length > 0) {
        dynamischeItems.push({
            isDynamisch: true, bron: "Interne Competitie", type: "activiteit", 
            titel: "Interne Competitie", 
            omschrijving: "Er worden vandaag interne wedstrijden gespeeld."
        });
    }

    return dynamischeItems;
}

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
    if(weergaveIsJaar) huidigeMaand = 0; else huidigeMaand = new Date().getMonth();
    tekenKalender();
};

window.wijzigMaand = function(delta) {
    if(weergaveIsJaar) huidigJaar += delta; 
    else {
        huidigeMaand += delta;
        if (huidigeMaand < 0) { huidigeMaand = 11; huidigJaar--; }
        if (huidigeMaand > 11) { huidigeMaand = 0; huidigJaar++; }
    }
    tekenKalender();
};

const maandNamen = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

function genereerMaandHTML(jaar, maand, toonNavigatie = false) {
    let eersteDag = new Date(jaar, maand, 1).getDay();
    let aantalDagen = new Date(jaar, maand + 1, 0).getDate();
    let startVakje = eersteDag === 0 ? 6 : eersteDag - 1; 

    let navTitel = weergaveIsJaar ? `${jaar}` : `${maandNamen[maand]} ${jaar}`;
    let navTekstVorig = weergaveIsJaar ? "◀ Vorig Jaar" : "◀ Vorige";
    let navTekstVolgend = weergaveIsJaar ? "Volgend Jaar ▶" : "Volgende ▶";

    let html = `
        <div style="margin-bottom: 30px;">
            <div class="kalender-header">
                <h2 style="margin:0; font-size:1.5rem;">${navTitel}</h2>
                ${toonNavigatie ? `<div><button onclick="wijzigMaand(-1)" class="kalender-nav-btn">${navTekstVorig}</button><button onclick="wijzigMaand(1)" class="kalender-nav-btn">${navTekstVolgend}</button></div>` : ''}
            </div>
            <div class="kalender-weekdagen"><div>Ma</div><div>Di</div><div>Wo</div><div>Do</div><div>Vr</div><div>Za</div><div>Zo</div></div>
            <div class="kalender-grid">
    `;

    for (let i = 0; i < startVakje; i++) html += `<div class="kalender-dag leeg"></div>`;

    let dNu = new Date();
    let vandaagStr = `${dNu.getFullYear()}-${String(dNu.getMonth()+1).padStart(2,'0')}-${String(dNu.getDate()).padStart(2,'0')}`;

    for (let dag = 1; dag <= aantalDagen; dag++) {
        let isoDatum = `${jaar}-${String(maand+1).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
        let dagClasses = [];
        if (isoDatum === vandaagStr) dagClasses.push('vandaag');
        
        let handmatigeItems = window.jaarplanningData.filter(i => {
            let eind = i.eindDatum || i.isoDatum || "";
            return isoDatum >= (i.isoDatum||"") && isoDatum <= eind;
        });

        // Combineer handmatig + Gekoppelde module items
        let dynamischeItems = haalDynamischeItemsOp(isoDatum);
        let alleItems = [...handmatigeItems, ...dynamischeItems];
        
        if (alleItems.some(i => window.kalenderCategorieen.find(c => c.id === i.type && c.isVakantie))) {
            dagClasses.push('vakantie-dag');
        }

        let itemsHtml = '';
        alleItems.forEach(item => {
            let badgeClass = `k-${item.type}`;
            let eind = item.eindDatum || item.isoDatum || isoDatum;
            let extraClass = '';
            
            if (item.isoDatum !== eind && !item.isDynamisch) {
                extraClass += ' k-multiday';
                if (isoDatum === item.isoDatum) extraClass += ' k-start';
                if (isoDatum === eind) extraClass += ' k-end';
            }

            let dObj = new Date(isoDatum);
            let isStartOfSpan = (isoDatum === item.isoDatum || dObj.getDay() === 1 || item.isDynamisch);
            let weergaveTekst = isStartOfSpan ? item.titel : '&nbsp;';
            
            // Verberg prullenbak voor items uit andere modules
            let deleteKnop = '';
            if(!item.isDynamisch && isStartOfSpan) {
                deleteKnop = `<span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7; margin-left:5px;" title="Verwijder Reeks">✖</span>`;
            } else if (item.isDynamisch && isStartOfSpan) {
                deleteKnop = `<span style="opacity:0.5; margin-left:5px; font-size:0.6rem;" title="Gekoppeld via ${item.bron}">🔗</span>`;
            }

            itemsHtml += `
                <div class="k-item ${badgeClass} ${extraClass}" title="Klik voor beschrijving: ${item.titel}">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85%; display:inline-block;">${weergaveTekst}</span>
                    ${deleteKnop}
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
// INTERACTIEF DAG-BEHEER (Met Detail Omschrijvingen!)
// ============================================================================
let actieveModalDatum = null;

window.openDagModal = function(isoDatum, dag, maand, jaar) {
    actieveModalDatum = isoDatum;
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    document.getElementById('item-titel').value = '';
    document.getElementById('item-omschrijving').value = '';
    
    let eindVeld = document.getElementById('item-einddatum');
    if(eindVeld) { eindVeld.value = ''; eindVeld.min = isoDatum; }
    
    verversModalLijst();
    document.getElementById('dag-modal').style.display = 'flex';
    document.getElementById('item-titel').focus();
};

window.sluitDagModal = function() {
    document.getElementById('dag-modal').style.display = 'none';
};

window.slaItemOp = function() {
    let type = document.getElementById('item-type').value;
    let titel = document.getElementById('item-titel').value.trim();
    let omschrijving = document.getElementById('item-omschrijving').value.trim();
    let eindEl = document.getElementById('item-einddatum');
    
    if(!titel) return alert("Vul op z'n minst een korte titel in!");

    let eindDatum = (eindEl && eindEl.value) ? eindEl.value : actieveModalDatum;
    if (eindDatum < actieveModalDatum) return alert("De einddatum kan niet vóór de startdatum liggen!");

    window.jaarplanningData.push({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        isoDatum: actieveModalDatum,
        eindDatum: eindDatum,
        type: type,
        titel: titel,
        omschrijving: omschrijving 
    });

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    tekenKalender();
    sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    verversModalLijst();
    tekenKalender();
};

function verversModalLijst() {
    let lijst = document.getElementById('modal-huidige-items');
    if(!lijst) return;
    
    let handmatigeItems = window.jaarplanningData.filter(i => {
        let eind = i.eindDatum || i.isoDatum || "";
        return actieveModalDatum >= (i.isoDatum||"") && actieveModalDatum <= eind;
    });

    let dynamischeItems = haalDynamischeItemsOp(actieveModalDatum);
    let alleItems = [...handmatigeItems, ...dynamischeItems];
    
    if(alleItems.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Geen items gepland op deze datum.</p>';
        return;
    }

    let html = '';
    alleItems.forEach(item => {
        let cat = window.kalenderCategorieen.find(c => c.id === item.type);
        let badgeClass = `k-${item.type}`;
        
        let extraInfo = '';
        if(item.isDynamisch) extraInfo = ` <small style="color:#3498db; font-weight:bold;">(Gekoppeld via ${item.bron})</small>`;
        else if (item.isoDatum !== item.eindDatum) extraInfo = ` <small style="color:#7f8c8d;">(Reeks t/m ${item.eindDatum})</small>`;
        
        let deleteKnop = item.isDynamisch ? '' : `<button onclick="verwijderItem('${item.id}')" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;">🗑️</button>`;

        html += `
            <div style="background:#f8f9fa; padding:12px; border:1px solid #eee; border-radius:6px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;">
                    <div style="font-weight:bold; color:#2c3e50; font-size:1.1rem;">
                        <span class="k-item ${badgeClass}" style="display:inline-block; margin-right:8px; font-size:0.8rem;">${cat ? cat.naam : item.type}</span> 
                        ${item.titel} ${extraInfo}
                    </div>
                    ${deleteKnop}
                </div>
                ${item.omschrijving ? `<div style="color:#34495e; font-size:0.95rem; white-space:pre-wrap; border-left:3px solid #bdc3c7; padding-left:10px; margin-top:10px;">${item.omschrijving}</div>` : ''}
            </div>
        `;
    });
    lijst.innerHTML = html;
}

// Categorie instellingen (zoals eerder geprogrammeerd)...
window.openCategorieInstellingen = function() { document.getElementById('categorie-modal').style.display = 'flex'; tekenCategorieLijst(); };
window.sluitCategorieInstellingen = function() { document.getElementById('categorie-modal').style.display = 'none'; laadDynamischeKleuren(); vulDropdown(); tekenKalender(); };
function tekenCategorieLijst() { /* ... Code uit vorige stap (bewaard voor beknoptheid) ... */ }
// etc...