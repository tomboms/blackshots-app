// --- BASKETBAL_JAARPLANNING.JS: FIREBASE CLOUD SYNC ACTIEF ---

// ============================================================================
// CLOUD SYNC MOTOR
// ============================================================================
window.slaDataOp = function(sleutel, data) {
    // 1. Lokale backup (voor snelheid en offline gebruik)
    localStorage.setItem(sleutel, JSON.stringify(data));
    
    // 2. FIREBASE CLOUD SYNC (Kijkt of je firebase_motor.js is geladen)
    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase(sleutel, data);
    } else if (typeof window.bewaarNaarFirebase === 'function') {
        window.bewaarNaarFirebase(sleutel, data);
    } else {
        // Fallback event voor custom firebase setups
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: sleutel, data: data } }));
    }
};

window.jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];

window.jaarplanningData = window.jaarplanningData.map(item => {
    if(!item.titel && item.tekst) item.titel = item.tekst;
    if(!item.titel) item.titel = "Naamloos Item";
    if(!item.type) item.type = "memo";
    return item;
});

const standaardCategorieen = [
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

window.kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_categorieen')) || standaardCategorieen;

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
        
        if (document.body.classList.contains('is-fullscreen')) {
            window.toggleFullScreen();
        }
    }
});

window.toggleFullScreen = function() {
    let body = document.body; let container = document.getElementById('hoofd-container'); let btn = document.getElementById('btn-fullscreen');
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

function updateDropdownKleur() {
    let select = document.getElementById('item-type');
    let bolletje = document.getElementById('type-kleur-preview');
    if(!select || !bolletje) return;
    let cat = window.kalenderCategorieen.find(c => c.id === select.value);
    if(cat) {
        bolletje.style.backgroundColor = cat.kleur;
        select.style.backgroundColor = '#ffffff'; select.style.color = '#333333'; select.style.border = '1px solid #bdc3c7';
    }
}

function vulDropdown() {
    let select = document.getElementById('item-type');
    if(!select) return;
    select.innerHTML = '';
    window.kalenderCategorieen.forEach(cat => { select.innerHTML += `<option value="${cat.id}">${cat.naam}</option>`; });
    select.onchange = updateDropdownKleur;
    updateDropdownKleur();
}

window.openCategorieInstellingen = function() { tekenCategorieLijst(); document.getElementById('categorie-modal').style.display = 'flex'; };
window.sluitCategorieInstellingen = function() { document.getElementById('categorie-modal').style.display = 'none'; laadDynamischeKleuren(); vulDropdown(); tekenKalender(); };

function tekenCategorieLijst() {
    let lijst = document.getElementById('categorie-lijst');
    lijst.innerHTML = '';
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
            </div>
        `;
    });
}

window.voegCategorieToe = function() {
    let naam = document.getElementById('nieuwe-cat-naam').value.trim();
    let kleur = document.getElementById('nieuwe-cat-kleur').value;
    if(!naam) return alert("Vul een naam in");
    let id = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
    window.kalenderCategorieen.push({ id: id, naam: naam, kleur: kleur, isVakantie: id.includes('vakantie') || id.includes('vrij') });
    window.slaDataOp('blackshots_categorieen', window.kalenderCategorieen); // CLOUD SYNC
    document.getElementById('nieuwe-cat-naam').value = '';
    tekenCategorieLijst();
};

window.updateCatKleur = function(index, nieuweKleur) { window.kalenderCategorieen[index].kleur = nieuweKleur; window.slaDataOp('blackshots_categorieen', window.kalenderCategorieen); };
window.updateCatNaam = function(index, nieuweNaam) { window.kalenderCategorieen[index].naam = nieuweNaam; window.slaDataOp('blackshots_categorieen', window.kalenderCategorieen); };
window.verwijderCategorie = function(index) { 
    if(!confirm("Zeker weten?")) return;
    window.kalenderCategorieen.splice(index, 1); 
    window.slaDataOp('blackshots_categorieen', window.kalenderCategorieen); // CLOUD SYNC
    tekenCategorieLijst(); 
};

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

        if (thuisTeams.length > 0) dynamischeItems.push({ isDynamisch: true, bron: "NBB App", type: "thuis", titel: `Thuis: ${[...new Set(thuisTeams)].join(', ')}`, omschrijving: `Gekoppeld via de Poule-indeling module.\nSpelende teams: ${thuisTeams.join(', ')}` });
        if (uitTeams.length > 0) dynamischeItems.push({ isDynamisch: true, bron: "NBB App", type: "uit", titel: `Uit: ${[...new Set(uitTeams)].join(', ')}`, omschrijving: `Gekoppeld via de Poule-indeling module.\nSpelende teams: ${uitTeams.join(', ')}` });
    }
    return dynamischeItems;
}

window.tekenKalender = function() {
    let container = document.getElementById('kalender-container');
    container.innerHTML = '';
    if (weergaveIsJaar) {
        for(let m = 0; m < 12; m++) container.innerHTML += genereerMaandHTML(huidigJaar, m, false);
        setTimeout(() => { let aVak = document.getElementById(`maand-${new Date().getMonth()}`); if(aVak) aVak.scrollIntoView({behavior: 'smooth', block: 'start'}); }, 100);
    } else {
        container.innerHTML = genereerMaandHTML(huidigJaar, huidigeMaand, true);
    }
};

window.wisselWeergave = function() {
    weergaveIsJaar = !weergaveIsJaar;
    document.getElementById('btn-weergave').innerText = weergaveIsJaar ? "🗓️ Toon 1 Maand" : "🗓️ Toon Hele Jaar";
    if(!weergaveIsJaar) huidigeMaand = new Date().getMonth();
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
    let startVakje = eersteDag === 0 ? 6 : eersteDag - 1; 
    let aantalDagen = new Date(jaar, maand + 1, 0).getDate();

    let navTitel = weergaveIsJaar ? `${jaar}` : `${maandNamen[maand]} ${jaar}`; 
    let navTekstVorig = weergaveIsJaar ? "◀ Vorig Jaar" : "◀ Vorige";
    let navTekstVolgend = weergaveIsJaar ? "Volgend Jaar ▶" : "Volgende ▶";

    let navHtml = toonNavigatie ? `
        <div style="display:flex; gap:10px; align-items:center;">
            <button onclick="gaNaarVandaag()" class="kalender-nav-btn" style="background:#3498db;">📅 Vandaag</button>
            <button onclick="wijzigMaand(-1)" class="kalender-nav-btn">${navTekstVorig}</button>
            <button onclick="wijzigMaand(1)" class="kalender-nav-btn">${navTekstVolgend}</button>
        </div>` : '';

    let html = `
        <div id="maand-${maand}" style="margin-bottom: 30px;">
            <div class="kalender-header"><h2 style="margin:0; font-size:1.5rem;">${navTitel}</h2>${navHtml}</div>
            <div class="kalender-weekdagen"><div>Ma</div><div>Di</div><div>Wo</div><div>Do</div><div>Vr</div><div>Za</div><div>Zo</div></div>
            <div class="kalender-grid">
    `;

    let totaalVakjes = startVakje + aantalDagen;
    let restVakjes = (totaalVakjes % 7 === 0) ? 0 : 7 - (totaalVakjes % 7);
    let eindLoop = aantalDagen + restVakjes;

    let dNu = new Date();
    let vandaagStr = `${dNu.getFullYear()}-${String(dNu.getMonth()+1).padStart(2,'0')}-${String(dNu.getDate()).padStart(2,'0')}`;

    for (let dagOffset = 1 - startVakje; dagOffset <= eindLoop; dagOffset++) {
        let echteDatum = new Date(jaar, maand, dagOffset);
        let dJaar = echteDatum.getFullYear(); let dMaand = echteDatum.getMonth(); let dDag = echteDatum.getDate();
        let isoDatum = `${dJaar}-${String(dMaand+1).padStart(2, '0')}-${String(dDag).padStart(2, '0')}`;
        let isAndereMaand = (dMaand !== maand);
        
        let dagClasses = [];
        if (isoDatum === vandaagStr) dagClasses.push('vandaag');
        if (isAndereMaand) dagClasses.push('andere-maand'); 
        
        let handmatigeItems = window.jaarplanningData.filter(i => {
            let eind = i.eindDatum || i.isoDatum || "";
            return isoDatum >= (i.isoDatum||"") && isoDatum <= eind;
        });

        let dynamischeItems = haalDynamischeItemsOp(isoDatum);
        let alleItems = [...handmatigeItems, ...dynamischeItems];
        
        if (alleItems.some(i => window.kalenderCategorieen.find(c => c.id.toLowerCase() === (i.type||"").toLowerCase() && c.isVakantie))) {
            dagClasses.push('vakantie-dag');
        }

        let itemsHtml = '';
        alleItems.forEach(item => {
            let typeId = (item.type || 'memo').toLowerCase();
            let badgeClass = `k-${typeId}`;
            let eind = item.eindDatum || item.isoDatum || isoDatum;
            let extraClass = '';
            
            if (item.isoDatum !== eind && !item.isDynamisch) {
                extraClass += ' k-multiday';
                if (isoDatum === item.isoDatum) extraClass += ' k-start';
                if (isoDatum === eind) extraClass += ' k-end';
            }

            let dObj = new Date(isoDatum);
            let isStartOfSpan = (isoDatum === item.isoDatum || dObj.getDay() === 1 || item.isDynamisch);
            let weergaveTitel = item.titel || "Naamloos Item";
            
            let metaHtml = '';
            if (isStartOfSpan && (item.tijd || item.locatie)) {
                let metaArr = [];
                if(item.tijd) metaArr.push(item.tijd);
                if(item.locatie) metaArr.push(item.locatie);
                metaHtml = ` <span style="font-weight:normal; font-size:0.85em; opacity:0.85;">(${metaArr.join(' | ')})</span>`;
            }

            let weergaveTekst = isStartOfSpan ? (weergaveTitel + metaHtml) : '&nbsp;';
            
            let clickAction = item.isDynamisch
                ? `onclick="event.stopPropagation(); openDagModal('${isoDatum}', ${dDag}, ${dMaand}, ${dJaar}, null)"`
                : `onclick="event.stopPropagation(); openDagModal('${isoDatum}', ${dDag}, ${dMaand}, ${dJaar}, '${item.id}')"`;

            let deleteKnop = '';
            if(!item.isDynamisch && isStartOfSpan) {
                deleteKnop = `<span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7; margin-left:5px; flex-shrink:0;" title="Verwijder Reeks">✖</span>`;
            } else if (item.isDynamisch && isStartOfSpan) {
                deleteKnop = `<span style="opacity:0.5; margin-left:5px; font-size:0.6rem; flex-shrink:0;" title="Gekoppeld via ${item.bron}">🔗</span>`;
            }

            itemsHtml += `
                <div class="k-item ${badgeClass} ${extraClass}" title="Klik om te bekijken of te bewerken" ${clickAction} style="cursor:pointer;">
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">
                        ${weergaveTekst}
                    </div>
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
            <div class="kalender-dag ${dagClasses.join(' ')}" onclick="openDagModal('${isoDatum}', ${dDag}, ${dMaand}, ${dJaar})">
                <div class="kalender-dag-nummer">${dDag}</div>
                <div class="kalender-items">${itemsHtml}</div>
                ${zaalBalkHtml}
            </div>
        `;
    }

    html += `</div></div>`;
    return html;
}

let actieveModalDatum = null;
let actieveEditId = null;

window.openDagModal = function(isoDatum, dag, maand, jaar, editId = null) {
    actieveModalDatum = isoDatum;
    actieveEditId = editId; 
    
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    let eindVeld = document.getElementById('item-einddatum');
    if(eindVeld) eindVeld.min = isoDatum;

    if (editId) {
        bewerkItem(editId);
    } else {
        let select = document.getElementById('item-type');
        if(select && select.options.length > 0) select.selectedIndex = 0;
        document.getElementById('item-tijd').value = '';
        document.getElementById('item-locatie').value = '';
        document.getElementById('item-titel').value = '';
        document.getElementById('item-omschrijving').value = '';
        if(eindVeld) eindVeld.value = '';
        document.getElementById('btn-opslaan').innerText = '💾 Opslaan';
        updateDropdownKleur();
    }
    
    verversModalLijst();
    document.getElementById('dag-modal').style.display = 'flex';
    
    if(!editId) setTimeout(() => document.getElementById('item-titel').focus(), 50);
};

window.bewerkItem = function(id) {
    let item = window.jaarplanningData.find(i => i.id === id);
    if(!item) return;
    actieveEditId = id;
    let typeSelect = document.getElementById('item-type');
    if(typeSelect) { 
        let safeType = (item.type || 'memo').toLowerCase();
        typeSelect.value = safeType; 
        if(!typeSelect.value) typeSelect.value = 'memo'; 
        updateDropdownKleur(); 
    }
    document.getElementById('item-tijd').value = item.tijd || ''; document.getElementById('item-locatie').value = item.locatie || '';
    document.getElementById('item-titel').value = item.titel || ''; document.getElementById('item-omschrijving').value = item.omschrijving || '';
    document.getElementById('item-einddatum').value = (item.eindDatum && item.eindDatum !== item.isoDatum) ? item.eindDatum : '';
    document.getElementById('btn-opslaan').innerText = '💾 Wijzigingen Opslaan';
};

window.sluitDagModal = function() { document.getElementById('dag-modal').style.display = 'none'; };

window.slaItemOp = function() {
    let type = document.getElementById('item-type').value;
    let tijd = document.getElementById('item-tijd').value.trim(); let locatie = document.getElementById('item-locatie').value.trim();
    let titel = document.getElementById('item-titel').value.trim(); let omschrijving = document.getElementById('item-omschrijving').value.trim();
    let eindEl = document.getElementById('item-einddatum');
    if(!titel) return alert("Vul op z'n minst een korte titel in!");

    let eindDatum = (eindEl && eindEl.value) ? eindEl.value : actieveModalDatum;
    if (eindDatum < actieveModalDatum) return alert("De einddatum kan niet vóór de startdatum liggen!");

    if(actieveEditId) {
        let item = window.jaarplanningData.find(i => i.id === actieveEditId);
        if(item) { item.type = type; item.tijd = tijd; item.locatie = locatie; item.titel = titel; item.omschrijving = omschrijving; item.eindDatum = eindDatum; }
        actieveEditId = null;
    } else {
        window.jaarplanningData.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            isoDatum: actieveModalDatum, eindDatum: eindDatum,
            type: type, tijd: tijd, locatie: locatie, titel: titel, omschrijving: omschrijving 
        });
    }
    
    // Opslaan in LocalStorage én Firebase!
    window.slaDataOp('blackshots_jaarplanning_data', window.jaarplanningData);
    
    tekenKalender(); sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    
    // Synchroniseer de verwijdering met de cloud
    window.slaDataOp('blackshots_jaarplanning_data', window.jaarplanningData);
    
    if(actieveEditId === id) {
        actieveEditId = null;
        document.getElementById('item-tijd').value = ''; document.getElementById('item-locatie').value = '';
        document.getElementById('item-titel').value = ''; document.getElementById('item-omschrijving').value = '';
        document.getElementById('btn-opslaan').innerText = '💾 Opslaan';
    }
    verversModalLijst(); tekenKalender();
};

function verversModalLijst() {
    let lijst = document.getElementById('modal-huidige-items');
    if(!lijst) return;
    
    let handmatigeItems = window.jaarplanningData.filter(i => { return actieveModalDatum >= (i.isoDatum||"") && actieveModalDatum <= (i.eindDatum || i.isoDatum || ""); });
    let dynamischeItems = haalDynamischeItemsOp(actieveModalDatum);
    let alleItems = [...handmatigeItems, ...dynamischeItems];
    
    if(alleItems.length === 0) { lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Geen items gepland op deze datum.</p>'; return; }

    let html = '';
    alleItems.forEach(item => {
        let typeId = (item.type || 'memo').toLowerCase();
        let cat = window.kalenderCategorieen.find(c => c.id === typeId);
        let badgeClass = `k-${typeId}`;
        
        let extraInfo = '';
        if(item.isDynamisch) extraInfo = ` <small style="color:#3498db; font-weight:bold;">(Gekoppeld via ${item.bron})</small>`;
        else if (item.isoDatum !== item.eindDatum) extraInfo = ` <small style="color:#7f8c8d;">(Reeks t/m ${item.eindDatum})</small>`;
        
        let actieKnoppen = item.isDynamisch ? '' : `
            <button onclick="bewerkItem('${item.id}')" style="background:transparent; border:none; color:#3498db; cursor:pointer; font-size:1.2rem; margin-right:10px;" title="Bewerken">✏️</button>
            <button onclick="verwijderItem('${item.id}')" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem;" title="Verwijderen">🗑️</button>
        `;

        let weergaveTitel = item.titel || "Activiteit";
        let metaTekst = [];
        if(item.tijd) metaTekst.push(`⏰ ${item.tijd}`);
        if(item.locatie) metaTekst.push(`📍 ${item.locatie}`);
        let metaInfo = metaTekst.length > 0 ? `<div style="font-size:0.8rem; color:#7f8c8d; margin-bottom:5px;">${metaTekst.join(' | ')}</div>` : '';

        html += `
            <div style="background:#f8f9fa; padding:12px; border:1px solid #eee; border-radius:6px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;">
                    <div style="font-weight:bold; color:#2c3e50; font-size:1.1rem;">
                        <span class="k-item ${badgeClass}" style="display:inline-block; margin-right:8px; font-size:0.8rem;">${cat ? cat.naam : (item.type||"Memo")}</span> 
                        ${weergaveTitel} ${extraInfo}
                    </div>
                    <div>${actieKnoppen}</div>
                </div>
                ${metaInfo}
                ${item.omschrijving ? `<div style="color:#34495e; font-size:0.95rem; white-space:pre-wrap; border-left:3px solid #bdc3c7; padding-left:10px; margin-top:10px;">${item.omschrijving}</div>` : ''}
            </div>
        `;
    });
    lijst.innerHTML = html;
}

window.downloadSjabloon = function() { /* Ongewijzigd gehouden */ };
window.verwerkPlanningBestand = function(e) { /* Ongewijzigd gehouden */ };

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de hele jaarplanning leeg wilt gooien?")) {
        window.jaarplanningData = [];
        window.slaDataOp('blackshots_jaarplanning_data', window.jaarplanningData);
        location.reload();
    }
};