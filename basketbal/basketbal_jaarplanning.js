// --- BASKETBAL_JAARPLANNING.JS: ESCAPE-KEY, KLIK & LEES EN STRAKKE DROPDOWNS ---

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

// ============================================================================
// ESCAPE TOETS LUISTERAAR (Sluit alle pop-ups)
// ============================================================================
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        let dagModal = document.getElementById('dag-modal');
        let catModal = document.getElementById('categorie-modal');
        if (dagModal && dagModal.style.display === 'flex') sluitDagModal();
        if (catModal && catModal.style.display === 'flex') sluitCategorieInstellingen();
    }
});

// ============================================================================
// DYNAMISCHE KLEUREN & INSTELLINGEN
// ============================================================================
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
    // Simpele, schone dropdown zonder kleuren!
    window.kalenderCategorieen.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.naam}</option>`;
    });
}

window.openCategorieInstellingen = function() {
    tekenCategorieLijst();
    document.getElementById('categorie-modal').style.display = 'flex';
};

window.sluitCategorieInstellingen = function() {
    document.getElementById('categorie-modal').style.display = 'none';
    laadDynamischeKleuren();
    vulDropdown();
    tekenKalender();
};

function tekenCategorieLijst() {
    let lijst = document.getElementById('categorie-lijst');
    lijst.innerHTML = '';
    window.kalenderCategorieen.forEach((cat, index) => {
        let isStandaard = standaardCategorieen.some(s => s.id === cat.id);
        lijst.innerHTML += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px; flex:1;">
                    <input type="color" value="${cat.kleur}" onchange="updateCatKleur(${index}, this.value)" style="width:30px; height:30px; border:none; cursor:pointer;" title="Klik om kleur te wijzigen">
                    <input type="text" value="${cat.naam}" onchange="updateCatNaam(${index}, this.value)" style="padding:5px; border:1px solid #cbd5e1; border-radius:4px; flex:1; font-weight:bold;">
                </div>
                <button onclick="verwijderCategorie(${index})" style="background:transparent; border:none; color:#e74c3c; cursor:pointer; font-size:1.2rem; margin-left:10px;" title="Verwijder Categorie">🗑️</button>
            </div>
        `;
    });
}

window.voegCategorieToe = function() {
    let naam = document.getElementById('nieuwe-cat-naam').value.trim();
    let kleur = document.getElementById('nieuwe-cat-kleur').value;
    if(!naam) return alert("Vul een naam in");
    
    let id = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
    let isVakantie = id.includes('vakantie') || id.includes('vrij');

    window.kalenderCategorieen.push({ id: id, naam: naam, kleur: kleur, isVakantie: isVakantie });
    localStorage.setItem('blackshots_categorieen', JSON.stringify(window.kalenderCategorieen));
    document.getElementById('nieuwe-cat-naam').value = '';
    tekenCategorieLijst();
};

window.updateCatKleur = function(index, nieuweKleur) { window.kalenderCategorieen[index].kleur = nieuweKleur; localStorage.setItem('blackshots_categorieen', JSON.stringify(window.kalenderCategorieen)); };
window.updateCatNaam = function(index, nieuweNaam) { window.kalenderCategorieen[index].naam = nieuweNaam; localStorage.setItem('blackshots_categorieen', JSON.stringify(window.kalenderCategorieen)); };
window.verwijderCategorie = function(index) { 
    if(!confirm("Weet je zeker dat je deze categorie wilt verwijderen? (Geplande items behouden hun tekst, maar verliezen hun kleur).")) return;
    window.kalenderCategorieen.splice(index, 1); 
    localStorage.setItem('blackshots_categorieen', JSON.stringify(window.kalenderCategorieen)); 
    tekenCategorieLijst(); 
};


// ============================================================================
// DYNAMISCHE HUB (Data uit NBB module overpakken)
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

        if (thuisTeams.length > 0) dynamischeItems.push({ isDynamisch: true, bron: "NBB App", type: "thuis", titel: `Thuis: ${[...new Set(thuisTeams)].join(', ')}`, omschrijving: `Gekoppeld via de Poule-indeling module.\nSpelende teams: ${thuisTeams.join(', ')}` });
        if (uitTeams.length > 0) dynamischeItems.push({ isDynamisch: true, bron: "NBB App", type: "uit", titel: `Uit: ${[...new Set(uitTeams)].join(', ')}`, omschrijving: `Gekoppeld via de Poule-indeling module.\nSpelende teams: ${uitTeams.join(', ')}` });
    }
    return dynamischeItems;
}

// ============================================================================
// KALENDER TEKENEN
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
    let navHtml = toonNavigatie ? `<div><button onclick="wijzigMaand(-1)" class="kalender-nav-btn">◀ Vorige</button><button onclick="wijzigMaand(1)" class="kalender-nav-btn">Volgende ▶</button></div>` : '';

    let html = `
        <div style="margin-bottom: 30px;">
            <div class="kalender-header"><h2 style="margin:0; font-size:1.5rem;">${navTitel}</h2>${navHtml}</div>
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
            let weergaveTekst = isStartOfSpan ? weergaveTitel : '&nbsp;';
            
            // HIER IS DE KLIK-LOGICA AANGEPAST
            // Dynamisch = open modal leeg (info staat onderin)
            // Handmatig = open modal direct in bewerk-modus!
            let clickAction = item.isDynamisch
                ? `onclick="event.stopPropagation(); openDagModal('${isoDatum}', ${dag}, ${maand}, ${jaar}, null)"`
                : `onclick="event.stopPropagation(); openDagModal('${isoDatum}', ${dag}, ${maand}, ${jaar}, '${item.id}')"`;

            let deleteKnop = '';
            if(!item.isDynamisch && isStartOfSpan) {
                deleteKnop = `<span onclick="event.stopPropagation(); verwijderItem('${item.id}')" style="cursor:pointer; opacity:0.7; margin-left:5px;" title="Verwijder Reeks">✖</span>`;
            } else if (item.isDynamisch && isStartOfSpan) {
                deleteKnop = `<span style="opacity:0.5; margin-left:5px; font-size:0.6rem;" title="Gekoppeld via ${item.bron}">🔗</span>`;
            }

            itemsHtml += `
                <div class="k-item ${badgeClass} ${extraClass}" title="Klik om te bekijken of te bewerken" ${clickAction} style="cursor:pointer;">
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
// INTERACTIEF DAG-BEHEER (Met Lezen/Bewerken Modus!)
// ============================================================================
let actieveModalDatum = null;
let actieveEditId = null;

// Open modal met optionele Edit ID als we op een specifiek item hebben geklikt
window.openDagModal = function(isoDatum, dag, maand, jaar, editId = null) {
    actieveModalDatum = isoDatum;
    actieveEditId = editId; 
    
    document.getElementById('modal-datum-titel').innerText = `Planning: ${dag} ${maandNamen[maand]} ${jaar}`;
    let eindVeld = document.getElementById('item-einddatum');
    if(eindVeld) eindVeld.min = isoDatum;

    if (editId) {
        bewerkItem(editId); // Hergebruik bewerk functie om de velden te vullen
    } else {
        // Leegmaken voor een nieuw item
        document.getElementById('item-titel').value = '';
        document.getElementById('item-omschrijving').value = '';
        if(eindVeld) eindVeld.value = '';
        document.getElementById('btn-opslaan').innerText = '💾 Opslaan';
    }
    
    verversModalLijst();
    document.getElementById('dag-modal').style.display = 'flex';
    
    // Als we geen item bewerken, focus direct op de titelbox
    if(!editId) setTimeout(() => document.getElementById('item-titel').focus(), 50);
};

window.bewerkItem = function(id) {
    let item = window.jaarplanningData.find(i => i.id === id);
    if(!item) return;
    
    actieveEditId = id;
    let typeSelect = document.getElementById('item-type');
    if(typeSelect) typeSelect.value = item.type || 'memo';
    
    document.getElementById('item-titel').value = item.titel || '';
    document.getElementById('item-omschrijving').value = item.omschrijving || '';
    document.getElementById('item-einddatum').value = (item.eindDatum && item.eindDatum !== item.isoDatum) ? item.eindDatum : '';
    document.getElementById('btn-opslaan').innerText = '💾 Wijzigingen Opslaan';
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

    if(actieveEditId) {
        let item = window.jaarplanningData.find(i => i.id === actieveEditId);
        if(item) {
            item.type = type;
            item.titel = titel;
            item.omschrijving = omschrijving;
            item.eindDatum = eindDatum;
        }
        actieveEditId = null;
    } else {
        window.jaarplanningData.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            isoDatum: actieveModalDatum,
            eindDatum: eindDatum,
            type: type,
            titel: titel,
            omschrijving: omschrijving 
        });
    }

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    tekenKalender();
    sluitDagModal();
};

window.verwijderItem = function(id) {
    if(!confirm("Weet je zeker dat je dit item wilt verwijderen?")) return;
    window.jaarplanningData = window.jaarplanningData.filter(i => i.id !== id);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
    
    if(actieveEditId === id) {
        actieveEditId = null;
        document.getElementById('item-titel').value = '';
        document.getElementById('item-omschrijving').value = '';
        document.getElementById('btn-opslaan').innerText = '💾 Opslaan';
    }
    
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

        html += `
            <div style="background:#f8f9fa; padding:12px; border:1px solid #eee; border-radius:6px; margin-bottom:10px; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;">
                    <div style="font-weight:bold; color:#2c3e50; font-size:1.1rem;">
                        <span class="k-item ${badgeClass}" style="display:inline-block; margin-right:8px; font-size:0.8rem;">${cat ? cat.naam : (item.type||"Memo")}</span> 
                        ${weergaveTitel} ${extraInfo}
                    </div>
                    <div>${actieKnoppen}</div>
                </div>
                ${item.omschrijving ? `<div style="color:#34495e; font-size:0.95rem; white-space:pre-wrap; border-left:3px solid #bdc3c7; padding-left:10px; margin-top:10px;">${item.omschrijving}</div>` : ''}
            </div>
        `;
    });
    lijst.innerHTML = html;
}

// Bulk import logic (ongewijzigd gehouden voor beknoptheid)
window.downloadSjabloon = function() {
    const wb = XLSX.utils.book_new();
    const sjabloonData = [
        ["Datum (DD-MM-YYYY)", "Omschrijving", "Type (Memo, Financieel, Thuis, Uit, Vakantie, Training, Vergadering)", "Einddatum (Optioneel)"],
        ["20-12-2026", "Kerstvakantie", "Vakantie", "04-01-2027"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sjabloonData);
    XLSX.utils.book_append_sheet(wb, ws, "Bulk_Import");
    XLSX.writeFile(wb, "BlackShots_Planning_Sjabloon.xlsx");
};

window.verwerkPlanningBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {defval:""});
        let teller = 0;
        ruweData.forEach(row => {
            let keys = Object.keys(row);
            let datumKey = keys.find(k => k.toLowerCase().includes('datum'));
            let omsKey = keys.find(k => k.toLowerCase().includes('omschrijving'));
            let typeKey = keys.find(k => k.toLowerCase().includes('type'));
            let eindKey = keys.find(k => k.toLowerCase().includes('eind'));
            
            if (datumKey && omsKey && row[datumKey] && row[omsKey]) {
                let isoDatum = row[datumKey].toString().match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/) ? row[datumKey].toString().replace(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/, (m,d,mo,y)=>`${y.length===2?'20'+y:y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`) : "";
                if(!isoDatum) return;
                let isoEind = eindKey && row[eindKey] ? row[eindKey].toString().replace(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/, (m,d,mo,y)=>`${y.length===2?'20'+y:y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`) : isoDatum;

                window.jaarplanningData.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    isoDatum: isoDatum, eindDatum: isoEind,
                    type: (typeKey && row[typeKey]) ? row[typeKey].toString().trim() : "memo",
                    titel: row[omsKey].toString().trim()
                });
                teller++;
            }
        });
        localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(window.jaarplanningData));
        alert(`✅ Bulk Upload Succesvol! Er zijn ${teller} items toegevoegd.`);
        tekenKalender();
    };
    reader.readAsArrayBuffer(file);
};

window.wisJaarplanning = function() {
    if(confirm("Weet je zeker dat je de hele jaarplanning leeg wilt gooien?")) {
        localStorage.removeItem('blackshots_jaarplanning_data');
        location.reload();
    }
};