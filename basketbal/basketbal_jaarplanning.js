// --- BASKETBAL_JAARPLANNING.JS: FIREBASE BEVEILIGING TEGEN CORRUPTE ARRAYS ---

// ============================================================================
// CLOUD ONTVANGER
// ============================================================================
window.ontvangCloudData = function(sleutel, data) {
    if(!data) return;
    // FIRESTORE FIX: Maak er ALTIJD een echte lijst van, zelfs als Firebase het als een {Object} stuurt!
    let veiligeData = Array.isArray(data) ? data : Object.values(data);
    let redrawNodig = false;

    if (sleutel === 'blackshots_jaarplanning_data') { 
        window.jaarplanningData = veiligeData; 
        redrawNodig = true; 
    }
    if (sleutel === 'blackshots_jaarplanning_categorieen') { 
        window.kalenderCategorieen = veiligeData; 
        laadDynamischeKleuren(); 
        vulDropdown(); 
        redrawNodig = true; 
    }

    if(redrawNodig) tekenKalender();
};

// ============================================================================
// DATA INLADEN MET VEILIGHEIDS-CHECKS
// ============================================================================
let ruweJaarData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
window.jaarplanningData = Array.isArray(ruweJaarData) ? ruweJaarData : Object.values(ruweJaarData);

let ruweZaalData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
window.zaalhuurData = Array.isArray(ruweZaalData) ? ruweZaalData : Object.values(ruweZaalData);

let ruweNbbData = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.nbbWedstrijden = Array.isArray(ruweNbbData) ? ruweNbbData : Object.values(ruweNbbData);

// Oude data upgraden
window.jaarplanningData = window.jaarplanningData.map(item => {
    if(!item.titel && item.tekst) item.titel = item.tekst;
    if(!item.titel) item.titel = "Naamloos Item";
    if(!item.type) item.type = "memo";
    return item;
});

// Categorieën initialiseren
let opgeslagenCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen'));
if (opgeslagenCategorieen && Object.keys(opgeslagenCategorieen).length > 0) {
    window.kalenderCategorieen = Array.isArray(opgeslagenCategorieen) ? opgeslagenCategorieen : Object.values(opgeslagenCategorieen);
} else {
    window.kalenderCategorieen = [
        { id: 'thuis', naam: 'Thuis Wedstrijd', kleur: '#27ae60', isVakantie: false },
        { id: 'uit', naam: 'Uit Wedstrijd', kleur: '#e74c3c', isVakantie: false },
        { id: 'training', naam: 'Training', kleur: '#16a085', isVakantie: false },
        { id: 'vergadering', naam: 'Vergadering', kleur: '#34495e', isVakantie: false },
        { id: 'financieel', naam: 'Financieel', kleur: '#e84393', isVakantie: false },
        { id: 'vakantie', naam: 'Vakantie / Feestdag', kleur: '#f1c40f', isVakantie: true, tekstKleur: '#333333' },
        { id: 'activiteit', naam: 'Activiteit', kleur: '#9b59b6', isVakantie: false },
        { id: 'tijdelijk', naam: 'Tijdelijk', kleur: '#ecf0f1', isVakantie: false, tekstKleur: '#7f8c8d', dashed: true },
        { id: 'memo', naam: 'Memo / Overig', kleur: '#3498db', isVakantie: false }
    ];
    localStorage.setItem('blackshots_jaarplanning_categorieen', JSON.stringify(window.kalenderCategorieen));
}

let huidigeMaand = new Date().getMonth();
let huidigJaar = new Date().getFullYear();
let weergaveIsJaar = false;

document.addEventListener('DOMContentLoaded', () => {
    laadDynamischeKleuren();
    vulDropdown();
    tekenKalender();
});

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        let dagModal = document.getElementById('dag-modal');
        let catModal = document.getElementById('categorie-modal');
        if (dagModal && dagModal.style.display === 'flex') sluitDagModal();
        if (catModal && catModal.style.display === 'flex') sluitCategorieInstellingen();
        if (document.body.classList.contains('is-fullscreen')) window.toggleFullScreen();
    }
});

// ============================================================================
// WEERGAVE OPTIES
// ============================================================================
window.toggleFullScreen = function() {
    let body = document.body; 
    let container = document.getElementById('hoofd-container'); 
    let btn = document.getElementById('btn-fullscreen');
    if (body.classList.contains('is-fullscreen')) {
        body.classList.remove('is-fullscreen'); container.classList.remove('fullscreen-mode'); btn.innerText = "🔲 Full Screen";
    } else {
        body.classList.add('is-fullscreen'); container.classList.add('fullscreen-mode'); btn.innerText = "❌ Sluit Full Screen";
    }
};

window.gaNaarVandaag = function() {
    huidigeMaand = new Date().getMonth(); huidigJaar = new Date().getFullYear(); tekenKalender();
    if (weergaveIsJaar) { setTimeout(() => { let mDiv = document.getElementById(`maand-${huidigeMaand}`); if(mDiv) mDiv.scrollIntoView({behavior: "smooth", block: "start"}); }, 100); }
};

window.wisselWeergave = function() {
    weergaveIsJaar = !weergaveIsJaar; document.getElementById('btn-weergave').innerText = weergaveIsJaar ? "🗓️ Toon 1 Maand" : "🗓️ Toon Hele Jaar";
    if(!weergaveIsJaar) huidigeMaand = new Date().getMonth(); tekenKalender();
};

window.wijzigMaand = function(delta) {
    if(weergaveIsJaar) huidigJaar += delta; 
    else { huidigeMaand += delta; if (huidigeMaand < 0) { huidigeMaand = 11; huidigJaar--; } if (huidigeMaand > 11) { huidigeMaand = 0; huidigJaar++; } }
    tekenKalender();
};

// ============================================================================
// CATEGORIEEN FUNCTIES
// ============================================================================
function laadDynamischeKleuren() {
    let styleTag = document.getElementById('dynamic-category-styles'); let cssText = '';
    window.kalenderCategorieen.forEach(cat => {
        let tKleur = cat.tekstKleur || '#ffffff'; let border = cat.dashed ? `1px dashed #95a5a6` : 'none'; let shadow = cat.dashed ? 'none' : '0 1px 2px rgba(0,0,0,0.1)';
        cssText += `.k-${cat.id} { background-color: ${cat.kleur} !important; color: ${tKleur} !important; border: ${border} !important; box-shadow: ${shadow} !important; }`;
    });
    styleTag.innerHTML = cssText;
}

function updateDropdownKleur() {
    let select = document.getElementById('item-type'); let bolletje = document.getElementById('type-kleur-preview');
    if(!select || !bolletje) return;
    let cat = window.kalenderCategorieen.find(c => c.id === select.value);
    if(cat) { bolletje.style.backgroundColor = cat.kleur; select.style.backgroundColor = '#ffffff'; select.style.color = '#333333'; select.style.border = '1px solid #bdc3c7'; }
}

function vulDropdown() {
    let select = document.getElementById('item-type'); if(!select) return; select.innerHTML = '';
    window.kalenderCategorieen.forEach(cat => { select.innerHTML += `<option value="${cat.id}">${cat.naam}</option>`; });
    select.onchange = updateDropdownKleur; updateDropdownKleur();
}

window.openCategorieInstellingen = function() { tekenCategorieLijst(); document.getElementById('categorie-modal').style.display = 'flex'; };
window.sluitCategorieInstellingen = function() { document.getElementById('categorie-modal').style.display = 'none'; laadDynamischeKleuren(); vulDropdown(); tekenKalender(); };

function tekenCategorieLijst() {
    let lijst = document.getElementById('categorie-lijst'); lijst.innerHTML = '';
    window.kalenderCategorieen.forEach((cat, index) => {
        let kleurPreview = `<div style="width:20px; height:20px; border-radius:50%; background-color:${cat.kleur}; border: 1px solid #ccc; margin-right:10px;"></div>`;
        lijst.innerHTML += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px; flex:1;">
                    ${kleurPreview}
                    <input type="color" value="${cat.kleur}" onchange="updateCatKleur(${index}, this.value)" style="width:30px; height:30px; border:none; cursor:pointer;">
                    <input type="text" value="${cat.naam}" onchange="updateCatNaam(${index}, this.value)" style="padding:5px; border:1px solid #cbd5e1; border-radius:4px; flex:1; font-weight:bold;">
                </div>
                <button onclick="verwijderCategorie(${index})" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem; margin-left:10px;">🗑️</button>
            </div>`;
    });
}

window.voegCategorieToe = function() {
    let naam = document.getElementById('nieuwe-cat-naam').value.trim(); let kleur = document.getElementById('nieuwe-cat-kleur').value;
    if(!naam) return alert("Vul een naam in");
    let id = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
    window.kalenderCategorieen.push({ id: id, naam: naam, kleur: kleur, isVakantie: id.includes('vakantie') || id.includes('vrij') });
    localStorage.setItem('blackshots_jaarplanning_categorieen', JSON.stringify(window.kalenderCategorieen)); 
    document.getElementById('nieuwe-cat-naam').value = ''; tekenCategorieLijst();
};

window.updateCatKleur = function(index, nieuweKleur) { window.kalenderCategorieen[index].kleur = nieuweKleur; localStorage.setItem('blackshots_jaarplanning_categorieen', JSON.stringify(window.kalenderCategorieen)); };
window.updateCatNaam = function(index, nieuweNaam) { window.kalenderCategorieen[index].naam = nieuweNaam; localStorage.setItem('blackshots_jaarplanning_categorieen', JSON.stringify(window.kalenderCategorieen)); };
window.verwijderCategorie = function(index) { 
    if(!confirm("Zeker weten?")) return;
    window.kalenderCategorieen.splice(index, 1); 
    localStorage.setItem('blackshots_jaarplanning_categorieen', JSON.stringify(window.kalenderCategorieen)); tekenCategorieLijst(); 
};

// ============================================================================
// DYNAMISCHE HUB (NBB)
// ============================================================================
function stripTeamNaam(langeNaam) { return langeNaam ? langeNaam.replace(/Black Shots/ig, '').trim() : "?"; }

function haalDynamischeItemsOp(isoDatum) {
    let dynamischeItems = [];
    let wedstrijdenOpDag = window.nbbWedstrijden.filter(w => w.Datum && w.Datum.startsWith(isoDatum));
    if (wedstrijdenOpDag.length > 0) {
        let thuisTeams = []; let uitTeams = [];
        wedstrijdenOpDag.forEach(w => {
            if (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots')) thuisTeams.push(stripTeamNaam(w.Thuisteam));
            else if (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots')) uitTeams.push(stripTeamNaam(w.Uitteam));
        });
        if (thuisTeams.length > 0) dynamischeItems.push({ isDynamisch: true, bron: "NBB App", type: "thuis", titel: `Thuis: ${[...new Set(thuisTeams)].join(', ')}`, omschrijving: `Gekoppeld via Poule-indeling.\nTeams: ${thuisTeams.join(', ')}` });
        if (uitTeams.length > 0) dynamischeItems.push({ isDynamisch: true, bron: "NBB App", type: "uit", titel: `Uit: ${[...new Set(uitTeams)].join(', ')}`, omschrijving: `Gekoppeld via Poule-indeling.\nTeams: ${uitTeams.join(', ')}` });
    }
    return dynamischeItems;
}

// ============================================================================
// KALENDER TEKENEN
// ============================================================================
const maandNamen = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

window.tekenKalender = function() {
    let container = document.getElementById('kalender-container'); container.innerHTML = '';
    if (weergaveIsJaar) {
        for(let m = 0; m < 12; m++) container.innerHTML += genereerMaandHTML(huidigJaar, m, false);
        setTimeout(() => { let aVak = document.getElementById(`maand-${new Date().getMonth()}`); if(aVak) aVak.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 100);
    } else {
        container.innerHTML = genereerMaandHTML(huidigJaar, huidigeMaand, true);
    }
};

function genereerMaandHTML(jaar, maand, toonNavigatie = false) {
    let eersteDag = new Date(jaar, maand, 1).getDay(); let startVakje = eersteDag === 0 ? 6 : eersteDag - 1; let aantalDagen = new Date(jaar, maand + 1, 0).getDate();
    let navTitel = weergaveIsJaar ? `${jaar}` : `${maandNamen[maand]} ${jaar}`; 
    let navHtml = toonNavigatie ? `<div style="display:flex; gap:10px; align-items:center;"><button onclick="gaNaarVandaag()" class="kalender-nav-btn" style="background:#3498db;">📅 Vandaag</button><button onclick="wijzigMaand(-1)" class="kalender-nav-btn">${weergaveIsJaar ? "◀ Vorig Jaar" : "◀ Vorige"}</button><button onclick="wijzigMaand(1)" class="kalender-nav-btn">${weergaveIsJaar ? "Volgend Jaar ▶" : "Volgende ▶"}</button></div>` : '';

    let html = `<div id="maand-${maand}" style="margin-bottom: 30px;"><div class="kalender-header"><h2 style="margin:0; font-size:1.5rem;">${navTitel}</h2>${navHtml}</div><div class="kalender-weekdagen"><div>Ma</div><div>Di</div><div>Wo</div><div>Do</div><div>Vr</div><div>Za</div><div>Zo</div></div><div class="kalender-grid">`;
    let eindLoop = aantalDagen + ((startVakje + aantalDagen) % 7 === 0 ? 0 : 7 - ((startVakje + aantalDagen) % 7));
    let vandaagStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;

    for (let dagOffset = 1 - startVakje; dagOffset <= eindLoop; dagOffset++) {
        let echteDatum = new Date(jaar, maand, dagOffset); 
        let isoDatum = `${echteDatum.getFullYear()}-${String(echteDatum.getMonth()+1).padStart(2, '0')}-${String(echteDatum.getDate()).padStart(2, '0')}`;
        
        let dagClasses = [];
        if (isoDatum === vandaagStr) dagClasses.push('vandaag');
        if (echteDatum.getMonth() !== maand) dagClasses.push('andere-maand'); 
        
        let handmatigeItems = window.jaarplanningData.filter(i => isoDatum >= (i.isoDatum||"") && isoDatum <= (i.eindDatum || i.isoDatum || ""));
        let alleItems = [...handmatigeItems, ...haalDynamischeItemsOp(isoDatum)];
        if (alleItems.some(i => window.kalenderCategorieen.find(c => c.id.toLowerCase() === (i.type||"").toLowerCase() && c.isVakantie))) dagClasses.push('vakantie-dag');

        let itemsHtml = '';
        alleItems.forEach(item => {
            let typeId = (item.type || 'memo').toLowerCase(); 
            let badgeClass = `k-${typeId}`; 
            let eind = item.eindDatum || item.isoDatum || isoDatum; 
            let extraClass = '';
            
            if (item.isoDatum !== eind && !item.isDynamisch) { extraClass += ' k-multiday'; if (isoDatum === item.isoDatum) extraClass += ' k-start'; if (isoDatum === eind) extraClass += ' k-end'; }
            let isStartOfSpan = (isoDatum === item.isoDatum || new Date(isoDatum).getDay() === 1 || item.isDynamisch);
            
            let metaHtml = (isStartOfSpan && (item.tijd || item.locatie)) ? `<span class="k-meta" style="opacity: 0.85; margin-right: 6px; padding-right: 6px; border-right: 1px solid rgba(255,255,255,0.4); font-weight: normal; font-size: 0.7rem; white-space: nowrap;">${[item.tijd, item.locatie].filter(Boolean).join(', ')}</span>` : '';
            
            // 1. Actie & Hover bepalen
            let clickAction = "";
            let hoverTitel = item.titel || "Naamloos";
            
            if (item.type === 'thuis' || item.type === 'uit') {
                clickAction = `onclick="event.stopPropagation(); localStorage.setItem('blackshots_actieve_datum', '${isoDatum}'); window.location.href='namen_invullen.html';"`;
                hoverTitel = "Klik om direct naar de Taken Planner te gaan!";
            } else {
                clickAction = item.isDynamisch ? `onclick="event.stopPropagation(); openDagModal('${isoDatum}', ${echteDatum.getDate()}, ${echteDatum.getMonth()}, ${echteDatum.getFullYear()}, null)"` : `onclick="event.stopPropagation(); openDagModal('${isoDatum}', ${echteDatum.getDate()}, ${echteDatum.getMonth()}, ${echteDatum.getFullYear()}, '${item.id}')"`;
            }
            
            // 2. Knoppen
            let deleteKnop = (!item.isDynamisch && isStartOfSpan) ? `<span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7; margin-left:5px; flex-shrink:0;">✖</span>` : (item.isDynamisch && isStartOfSpan ? `<span style="opacity:0.5; margin-left:5px; font-size:0.6rem; flex-shrink:0;">🔗</span>` : '');

            // 3. Rand opmaak bepalen
            let borderOpmaak = '';
            let extraIcon = ''; 
            
            if (item.teams && item.teams.length > 0) {
                let lokaleTeams = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
                let kleurStukken = [];
                
                item.teams.forEach(tId => {
                    let t = lokaleTeams.find(team => team.id === tId);
                    let tKleur = (t && t.kleur) ? t.kleur : '#3498db'; 
                    kleurStukken.push(tKleur);
                });
                
                let randDikte = '6px';
                if (kleurStukken.length === 1) {
                    borderOpmaak = `border-left: ${randDikte} solid ${kleurStukken[0]} !important; padding-left: 8px;`;
                } else {
                    let gradientSteps = [];
                    let part = 100 / kleurStukken.length;
                    
                    kleurStukken.forEach((kleur, idx) => {
                        gradientSteps.push(`${kleur} ${idx * part}% ${(idx + 1) * part}%`);
                    });
                    borderOpmaak = `background-image: linear-gradient(to bottom, ${gradientSteps.join(', ')}); background-size: ${randDikte} 100%; background-repeat: no-repeat; background-position: left; padding-left: 10px; border-left: none !important;`;
                }
            }

            let extraHoogte = "padding-top: 8px; padding-bottom: 8px; min-height: 56px;";

            // 4. Eén keer HTML toevoegen
            itemsHtml += `<div class="k-item ${badgeClass} ${extraClass}" title="${hoverTitel}" ${clickAction} style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; ${borderOpmaak} ${extraHoogte}"><div style="display:flex; align-items:center; overflow:hidden; white-space:nowrap; flex:1; min-width:0;">${metaHtml}<span style="overflow:hidden; text-overflow:ellipsis;">${isStartOfSpan ? (item.titel || "Naamloos") : '&nbsp;'}</span>${isStartOfSpan ? extraIcon : ''}</div>${deleteKnop}</div>`;
        });

        let zalenOpDag = window.zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
        let zaalBalkHtml = zalenOpDag.length > 0 ? `<div class="kalender-zaal-balk">${[...new Set(zalenOpDag.map(z => z.zaal))].map(z => z.replace('Sporthal', '').replace('Sportzaal', '').trim()).join(' & ')}</div>` : '';

        html += `<div class="kalender-dag ${dagClasses.join(' ')}" onclick="openDagModal('${isoDatum}', ${echteDatum.getDate()}, ${echteDatum.getMonth()}, ${echteDatum.getFullYear()})"><div class="kalender-dag-nummer">${echteDatum.getDate()}</div><div class="kalender-items">${itemsHtml}</div>${zaalBalkHtml}</div>`;
    }
    html += `</div></div>`; return html;
}
// ============================================================================
// MODAL BEHEER
// ============================================================================
// ============================================================================
// MODAL BEHEER (Met Team Selectie)
// ============================================================================
let actieveModalDatum = null; let actieveEditId = null;

window.openDagModal = function(isoDatum, dag, maand, jaar, editId = null) {
    actieveModalDatum = isoDatum; actieveEditId = editId; 
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    let eindVeld = document.getElementById('item-einddatum'); if(eindVeld) eindVeld.min = isoDatum;

    // --- NIEUW: Laad alle teams dynamisch in als vinkjes ---
    let lokaleTeams = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
    let teamsContainer = document.getElementById('item-teams-container');
    if (teamsContainer) {
        let teamsHtml = '';
        lokaleTeams.forEach(t => {
            let badgeKleur = t.kleur || '#3498db';
            teamsHtml += `<label style="display:flex; align-items:center; gap:5px; background:white; padding:4px 8px; border:1px solid #ddd; border-left:4px solid ${badgeKleur}; border-radius:4px; font-size:0.85rem; cursor:pointer;"><input type="checkbox" class="item-team-checkbox" value="${t.id}"> ${t.naam}</label>`;
        });
        teamsContainer.innerHTML = teamsHtml || '<span style="font-size:0.8rem; color:#7f8c8d;">Geen teams gevonden in database.</span>';
    }

    if (editId) bewerkItem(editId);
    else {
        let select = document.getElementById('item-type'); if(select && select.options.length > 0) select.selectedIndex = 0;
        document.getElementById('item-tijd').value = ''; document.getElementById('item-locatie').value = '';
        document.getElementById('item-titel').value = ''; document.getElementById('item-omschrijving').value = '';
        if(eindVeld) eindVeld.value = ''; document.getElementById('btn-opslaan').innerText = '💾 Opslaan'; updateDropdownKleur();
        
        // Zorg dat bij een nieuw item alle vinkjes leeg zijn
        document.querySelectorAll('.item-team-checkbox').forEach(cb => cb.checked = false);
    }
    verversModalLijst(); document.getElementById('dag-modal').style.display = 'flex';
    if(!editId) setTimeout(() => document.getElementById('item-titel').focus(), 50);
};

window.bewerkItem = function(id) {
    let item = window.jaarplanningData.find(i => i.id === id); if(!item) return; actieveEditId = id;
    let typeSelect = document.getElementById('item-type');
    if(typeSelect) { typeSelect.value = (item.type || 'memo').toLowerCase(); if(!typeSelect.value) typeSelect.value = 'memo'; updateDropdownKleur(); }
    document.getElementById('item-tijd').value = item.tijd || ''; document.getElementById('item-locatie').value = item.locatie || '';
    document.getElementById('item-titel').value = item.titel || ''; document.getElementById('item-omschrijving').value = item.omschrijving || '';
    document.getElementById('item-einddatum').value = (item.eindDatum && item.eindDatum !== item.isoDatum) ? item.eindDatum : '';
    document.getElementById('btn-opslaan').innerText = '💾 Wijzigingen Opslaan';
    
    // --- NIEUW: Vink de opgeslagen teams weer netjes aan ---
    let actieveTeams = item.teams || [];
    document.querySelectorAll('.item-team-checkbox').forEach(cb => {
        cb.checked = actieveTeams.includes(cb.value);
    });
};

window.sluitDagModal = function() { document.getElementById('dag-modal').style.display = 'none'; };

window.slaItemOp = function() {
    let type = document.getElementById('item-type').value; let tijd = document.getElementById('item-tijd').value.trim(); let locatie = document.getElementById('item-locatie').value.trim();
    let titel = document.getElementById('item-titel').value.trim(); let omschrijving = document.getElementById('item-omschrijving').value.trim(); let eindEl = document.getElementById('item-einddatum');
    if(!titel) return alert("Vul op z'n minst een korte titel in!");
    let eindDatum = (eindEl && eindEl.value) ? eindEl.value : actieveModalDatum; if (eindDatum < actieveModalDatum) return alert("De einddatum kan niet vóór de startdatum liggen!");

    // --- NIEUW: Sla de aangevinkte teams op in een lijstje ---
    let geselecteerdeTeams = Array.from(document.querySelectorAll('.item-team-checkbox:checked')).map(cb => cb.value);

    if(actieveEditId) {
        let item = window.jaarplanningData.find(i => i.id === actieveEditId);
        if(item) { item.type = type; item.tijd = tijd; item.locatie = locatie; item.titel = titel; item.omschrijving = omschrijving; item.eindDatum = eindDatum; item.teams = geselecteerdeTeams; }
        actieveEditId = null;
    } else {
        window.jaarplanningData.push({ id: Date.now().toString() + Math.random().toString(36).substr(2, 5), isoDatum: actieveModalDatum, eindDatum: eindDatum, type: type, tijd: tijd, locatie: locatie, titel: titel, omschrijving: omschrijving, teams: geselecteerdeTeams });
    }
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData)); tekenKalender(); sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    if(actieveEditId === id) { actieveEditId = null; document.getElementById('item-tijd').value = ''; document.getElementById('item-locatie').value = ''; document.getElementById('item-titel').value = ''; document.getElementById('item-omschrijving').value = ''; document.getElementById('btn-opslaan').innerText = '💾 Opslaan'; }
    verversModalLijst(); tekenKalender();
};

function verversModalLijst() {
    let lijst = document.getElementById('modal-huidige-items'); if(!lijst) return;
    let handmatigeItems = window.jaarplanningData.filter(i => actieveModalDatum >= (i.isoDatum||"") && actieveModalDatum <= (i.eindDatum || i.isoDatum || ""));
    let dynamischeItems = haalDynamischeItemsOp(actieveModalDatum);
    let alleItems = [...handmatigeItems, ...dynamischeItems];
    if(alleItems.length === 0) { lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Geen items gepland op deze datum.</p>'; return; }

    let html = '';
    alleItems.forEach(item => {
        let typeId = (item.type || 'memo').toLowerCase(); let cat = window.kalenderCategorieen.find(c => c.id === typeId); let badgeClass = `k-${typeId}`;
        let extraInfo = item.isDynamisch ? ` <small style="color:#3498db; font-weight:bold;">(Gekoppeld via ${item.bron})</small>` : (item.isoDatum !== item.eindDatum ? ` <small style="color:#7f8c8d;">(Reeks t/m ${item.eindDatum})</small>` : '');
        let actieKnoppen = item.isDynamisch ? '' : `<button onclick="bewerkItem('${item.id}')" style="background:transparent; border:none; color:#3498db; cursor:pointer; font-size:1.2rem; margin-right:10px;">✏️</button><button onclick="verwijderItem('${item.id}')" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;">🗑️</button>`;
        let weergaveTitel = item.titel || "Activiteit";
        let metaTekst = []; if(item.tijd) metaTekst.push(`⏰ ${item.tijd}`); if(item.locatie) metaTekst.push(`📍 ${item.locatie}`);
        let metaInfo = metaTekst.length > 0 ? `<div style="font-size:0.8rem; color:#7f8c8d; margin-bottom:5px;">${metaTekst.join(' | ')}</div>` : '';

        html += `<div style="background:#f8f9fa; padding:12px; border:1px solid #eee; border-radius:6px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.02);"><div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;"><div style="font-weight:bold; color:#2c3e50; font-size:1.1rem;"><span class="k-item ${badgeClass}" style="display:inline-block; margin-right:8px; font-size:0.8rem;">${cat ? cat.naam : (item.type||"Memo")}</span> ${weergaveTitel} ${extraInfo}</div><div>${actieKnoppen}</div></div>${metaInfo}${item.omschrijving ? `<div style="color:#34495e; font-size:0.95rem; white-space:pre-wrap; border-left:3px solid #bdc3c7; padding-left:10px; margin-top:10px;">${item.omschrijving}</div>` : ''}</div>`;
    });
    lijst.innerHTML = html;
}

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de hele jaarplanning leeg wilt gooien?")) {
        window.jaarplanningData = []; localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData)); location.reload();
    }
};

window.downloadSjabloon = function() { /* ... */ }; window.verwerkPlanningBestand = function(e) { /* ... */ };