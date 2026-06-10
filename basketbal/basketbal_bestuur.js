// --- BASKETBAL_BESTUUR.JS: SLEPEN, 3-VAKKEN, A,B,C SUBPUNTEN & NOTULEN ---

window.bestuurDB = JSON.parse(localStorage.getItem('blackshots_bestuur')) || [];
window.standaardSjabloon = JSON.parse(localStorage.getItem('blackshots_bestuur_sjabloon')) || [
    "Opening en vaststellen agendapunten",
    "Mededelingen en ledenmutaties",
    "Actielijst",
    "Ingekomen stukken",
    "Financiën",
    "Jaarplanning",
    "Extra agendapunten bespreken",
    "Rondvraag",
    "Vaststellen volgende vergaderdatum en sluiting"
];
window.actieveVergaderingId = null;
window.isLiveModus = false;

// Het perfecte Sleep (Drag) Icoontje in SVG (werkt op elke computer)
const dragIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>`;

// --- 1. OVERZICHT ---
window.tekenOverzicht = function() {
    let container = document.getElementById('vergaderingen-lijst');
    if (!container) return;
    container.innerHTML = '';
    
    if (window.bestuurDB.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Nog geen vergaderingen gepland. Klik op de groene knop!</p>';
        return;
    }

    let gesorteerd = [...window.bestuurDB].reverse();
    gesorteerd.forEach(v => {
        container.innerHTML += `
            <div onclick="openVergadering('${v.id}')" class="card" style="cursor:pointer; transition:0.2s; border-left:6px solid #3498db; margin-bottom:10px;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                <strong style="font-size:1.2rem; color:var(--secondary-color);">📅 ${v.datum || 'Nieuwe Vergadering'}</strong>
                <div style="color:#7f8c8d; font-size:0.9rem; margin-top:5px;">🕒 ${v.tijd || '?'} | 📍 ${v.adres || '?'}</div>
            </div>
        `;
    });
};

// --- 2. VERGADERING AANMAKEN & OPENEN ---
window.nieuweVergadering = function() {
    let startPunten = window.standaardSjabloon.map(titel => {
        return { id: 'p_' + Math.random().toString(36).substr(2, 9), titel: titel, isSub: false, prep: '', klad: '', verslag: '' };
    });

    let nw = { 
        id: 'verg_' + Date.now(), 
        datum: '', tijd: '20:00 uur', adres: '', aanwezig: 'Martin, Izaac, Jolanda, Tom', 
        punten: startPunten
    };

    window.bestuurDB.push(nw);
    slaOpEnHerlaad();
    openVergadering(nw.id);
};

window.openVergadering = function(id) {
    window.actieveVergaderingId = id;
    let v = window.bestuurDB.find(x => x.id === id);
    if (!v) return;

    // Database reparatie voor oude punten
    if(v.punten) {
        v.punten.forEach(p => { 
            if(typeof p.klad === 'undefined') p.klad = ''; 
            if(typeof p.isSub === 'undefined') p.isSub = false; 
        });
    }

    document.getElementById('overzicht-scherm').style.display = 'none';
    document.getElementById('editor-scherm').style.display = 'block';

    document.getElementById('v_datum').value = v.datum || '';
    document.getElementById('v_tijd').value = v.tijd || '';
    document.getElementById('v_adres').value = v.adres || '';
    document.getElementById('v_aanwezig').value = v.aanwezig || '';

    tekenAgendaPunten();
};

window.sluitEditor = function() {
    window.actieveVergaderingId = null;
    document.getElementById('editor-scherm').style.display = 'none';
    document.getElementById('overzicht-scherm').style.display = 'block';
    if (window.isLiveModus) toggleLiveModus();
    tekenOverzicht();
};

window.toggleLiveModus = function() {
    window.isLiveModus = !window.isLiveModus;
    document.getElementById('live-header').style.display = window.isLiveModus ? 'flex' : 'none';
    
    if (window.isLiveModus) {
        document.body.classList.add('live-modus-actief');
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(e=>e);
    } else {
        document.body.classList.remove('live-modus-actief');
        if (document.exitFullscreen) document.exitFullscreen().catch(e=>e);
    }
    tekenAgendaPunten(); 
};

// --- 3. SLEPEN (DRAG & DROP) LOGICA VOOR DE EDITOR ---
let draggedItemIndex = null;
window.startDrag = function(index) { draggedItemIndex = index; };
window.overDrag = function(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); };
window.leaveDrag = function(event) { event.currentTarget.classList.remove('drag-over'); };
window.dropPunt = function(event, index) {
    event.preventDefault(); event.currentTarget.classList.remove('drag-over');
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    let draggedPunt = v.punten.splice(draggedItemIndex, 1)[0]; 
    v.punten.splice(index, 0, draggedPunt); 
    
    slaOpEnHerlaad(); tekenAgendaPunten(); draggedItemIndex = null;
};

// --- 4. AGENDAPUNTEN TEKENEN (INCLUSIEF 3 VAKKEN EN A,B,C LOGICA) ---
window.tekenAgendaPunten = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    let container = document.getElementById('agenda-punten-container');
    container.innerHTML = '';

    let mainCounter = 0;
    let subCounter = 0;

    v.punten.forEach((punt, index) => {
        
        // --- De Nummering of A,B,C logica ---
        let prefixStr = '';
        if (punt.isSub) {
            let letter = String.fromCharCode(65 + subCounter); // A = 65, B = 66, etc.
            prefixStr = letter + ".";
            subCounter++;
        } else {
            mainCounter++;
            prefixStr = mainCounter + ".";
            subCounter = 0; // reset the A,B,C counter for the next main item
        }

        let isSubClass = punt.isSub ? 'sub-punt' : '';
        let subBtnKleur = punt.isSub ? '#8e44ad' : '#bdc3c7';

        // --- De 3 Vakken ---
        let htmlVakken = '';
        if (window.isLiveModus) {
            let prepDisplay = punt.prep ? punt.prep.replace(/\n/g, '<br>') : '<i style="color:#bdc3c7;">Geen voorbereiding genoteerd...</i>';
            htmlVakken = `
            <div style="margin-top:15px;">
                <div class="spiekbrief-lees-blok">
                    <strong style="color:#d35400; font-size:0.85rem; display:block; margin-bottom:8px; text-transform:uppercase;">🤫 Jouw Spiekbrief:</strong>
                    ${prepDisplay}
                </div>
                <div>
                    <textarea class="notitie-veld klad-veld" style="min-height:150px; font-size:1.05rem;" placeholder="✍️ TYP HIER JE KLADNOTITIES TIJDENS DE VERGADERING..." onchange="slaVeldOp('${punt.id}', 'klad', this.value)">${punt.klad || ''}</textarea>
                </div>
            </div>`;
        } else {
            htmlVakken = `
            <div class="drie-vakken-grid">
                <div>
                    <label class="veld-label label-prep">🤫 1. Tom's Versie</label>
                    <textarea class="notitie-veld prep-veld" placeholder="Wat wil je bespreken?" onchange="slaVeldOp('${punt.id}', 'prep', this.value)">${punt.prep}</textarea>
                </div>
                <div>
                    <label class="veld-label label-klad">📝 2. Vergader Klad</label>
                    <textarea class="notitie-veld klad-veld" placeholder="Je snelle krabbels (LIVE)..." onchange="slaVeldOp('${punt.id}', 'klad', this.value)">${punt.klad || ''}</textarea>
                </div>
                <div>
                    <label class="veld-label label-live">✍️ 3. Nette Notule</label>
                    <textarea class="notitie-veld live-veld" placeholder="Definitieve tekst voor in de PDF..." onchange="slaVeldOp('${punt.id}', 'verslag', this.value)">${punt.verslag}</textarea>
                </div>
            </div>`;
        }

        // Knoppen bovenaan het agendapunt
        let actieKnoppen = window.isLiveModus ? '' : `
            <div style="display:flex; align-items:center; gap:8px;">
                <button onclick="toggleSubPunt('${punt.id}')" class="sub-btn" style="background:transparent; border:1px solid ${subBtnKleur}; color:${subBtnKleur}; border-radius:4px; padding:3px 8px; font-size:0.8rem; font-weight:bold; cursor:pointer;" title="Maak hier een A, B, C sub-punt van">⇥ Inspringen</button>
                <button onclick="verwijderPunt('${punt.id}')" class="delete-btn" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; font-size:1.2rem;" title="Verwijder dit blok">&times;</button>
            </div>
        `;

        container.innerHTML += `
            <div class="agenda-punt ${isSubClass}" draggable="${!window.isLiveModus}" ondragstart="startDrag(${index})" ondragover="overDrag(event)" ondragleave="leaveDrag(event)" ondrop="dropPunt(event, ${index})">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; align-items:center; flex:1;">
                        <span class="drag-handle" title="Sleep om te verplaatsen">${dragIcon}</span>
                        <span style="font-size:1.2rem; font-weight:bold; color:var(--secondary-color); margin-right:10px; width:30px; text-align:right;">${prefixStr}</span>
                        <input type="text" class="agenda-titel-input" value="${punt.titel}" placeholder="Naam van dit agendapunt..." onchange="slaTitelOp('${punt.id}', this.value)">
                    </div>
                    ${actieKnoppen}
                </div>
                ${htmlVakken}
            </div>`;
    });
};

// --- 5. EDIT & BEWAAR FUNCTIES ---
window.slaOp = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    v.datum = document.getElementById('v_datum').value; v.tijd = document.getElementById('v_tijd').value;
    v.adres = document.getElementById('v_adres').value; v.aanwezig = document.getElementById('v_aanwezig').value;
    slaOpEnHerlaad();
};

window.slaTitelOp = function(puntId, val) { window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId).titel = val; slaOpEnHerlaad(); };

window.slaVeldOp = function(puntId, veldNaam, val) { 
    window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId)[veldNaam] = val; 
    slaOpEnHerlaad(); 
};

window.toggleSubPunt = function(puntId) {
    let p = window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId);
    p.isSub = !p.isSub;
    slaOpEnHerlaad(); tekenAgendaPunten();
};

window.voegPuntToe = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    v.punten.push({ id: 'p_' + Math.random().toString(36).substr(2, 9), titel: 'Nieuw Agendapunt', isSub: false, prep: '', klad: '', verslag: '' });
    slaOpEnHerlaad(); tekenAgendaPunten();
    setTimeout(() => { window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" }); }, 100);
};

window.verwijderPunt = function(puntId) {
    if(confirm("Weet je zeker dat je dit agendapunt wilt wissen?")) {
        let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
        v.punten = v.punten.filter(p => p.id !== puntId);
        slaOpEnHerlaad(); tekenAgendaPunten();
    }
};

window.verwijderVergadering = function() {
    if(confirm("Weet je zeker dat je deze hele vergadering inclusief notulen wilt wissen? Dit kan niet ongedaan worden gemaakt.")) {
        let vIndex = window.bestuurDB.findIndex(x => x.id === window.actieveVergaderingId);
        if (vIndex > -1) {
            window.bestuurDB.splice(vIndex, 1);
            localStorage.setItem('blackshots_bestuur', JSON.stringify(window.bestuurDB));
        }
        window.sluitEditor(); 
    }
}

function slaOpEnHerlaad() { localStorage.setItem('blackshots_bestuur', JSON.stringify(window.bestuurDB)); }

// --- 6. SJABLOON BEHEERDER (MET DRAG & DROP!) ---
window.tempSjabloon = [];
let dragSjabIndex = null;

window.openSjabloonInstellingen = function() {
    window.tempSjabloon = [...window.standaardSjabloon];
    tekenSjabloonLijst(); document.getElementById('sjabloon-modal').style.display = 'flex';
};
window.sluitSjabloonInstellingen = function() { document.getElementById('sjabloon-modal').style.display = 'none'; };

window.startDragSjab = function(index) { dragSjabIndex = index; };
window.overDragSjab = function(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); };
window.leaveDragSjab = function(event) { event.currentTarget.classList.remove('drag-over'); };
window.dropSjab = function(event, index) {
    event.preventDefault(); event.currentTarget.classList.remove('drag-over');
    if (dragSjabIndex === null || dragSjabIndex === index) return;
    let draggedItem = window.tempSjabloon.splice(dragSjabIndex, 1)[0];
    window.tempSjabloon.splice(index, 0, draggedItem);
    tekenSjabloonLijst(); dragSjabIndex = null;
};

window.tekenSjabloonLijst = function() {
    let c = document.getElementById('sjabloon-lijst'); c.innerHTML = '';
    window.tempSjabloon.forEach((punt, idx) => {
        c.innerHTML += `
            <div class="sjabloon-rij" draggable="true" ondragstart="startDragSjab(${idx})" ondragover="overDragSjab(event)" ondragleave="leaveDragSjab(event)" ondrop="dropSjab(event, ${idx})">
                <span style="cursor:grab; color:#bdc3c7;">${dragIcon}</span>
                <span style="font-weight:bold; color:#7f8c8d; min-width:25px;">${idx+1}.</span>
                <input type="text" value="${punt}" onchange="window.tempSjabloon[${idx}] = this.value" style="flex:1; padding:8px; border:1px solid #bdc3c7; border-radius:4px; font-family:inherit; background:transparent; color:inherit;">
                <button onclick="window.tempSjabloon.splice(${idx}, 1); window.tekenSjabloonLijst()" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:6px 12px; font-weight:bold; cursor:pointer;">X</button>
            </div>`;
    });
}

window.voegSjabloonPuntToe = function() { window.tempSjabloon.push('Nieuw agendapunt...'); tekenSjabloonLijst(); };
window.slaSjabloonOp = function() {
    window.standaardSjabloon = window.tempSjabloon.filter(x => x.trim() !== '');
    localStorage.setItem('blackshots_bestuur_sjabloon', JSON.stringify(window.standaardSjabloon));
    sluitSjabloonInstellingen();
    alert("✅ Sjabloon succesvol bijgewerkt!");
};

// --- 7. DE PDF EXPORT (MET NESTE LIJSTEN VOOR A,B,C) ---
window.genereerDocument = function(soort) {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    let hoofdtitel = soort === 'notulen' ? "Notulen Bestuursvergadering" : "Bestuursvergadering";
    let subtitelDoc = soort === 'notulen' ? "Definitieve Besluiten & Notulen" : (soort === 'spiekbrief' ? "Agenda & Voorbereiding (Tom's Versie)" : "Officiële Agenda");

    let htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${hoofdtitel} Black Shots</title>
        <style>
            @page { margin: 0; size: A4 portrait; }
            body { font-family: 'Arial', sans-serif; color: #000; line-height: 1.5; padding: 2cm; background: white; margin: 0; }
            .logo-box { text-align: center; margin-bottom: 30px; }
            .logo-box img { max-width: 180px; }
            h1 { text-align: left; font-size: 18px; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .meta-tabel { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            .meta-tabel td { padding: 3px 0; vertical-align: top; }
            .meta-tabel td:first-child { width: 100px; font-weight: bold; }
            h2 { font-size: 16px; margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333; }
            
            .agenda-lijst { list-style-type: decimal; padding-left: 20px; font-size: 14px; font-weight: bold; margin-top: 0; }
            .sub-lijst { list-style-type: upper-alpha; padding-left: 25px; margin-top: 8px; margin-bottom: 15px; }
            li { margin-bottom: 15px; }
            
            .tekst-blok { font-weight: normal; font-size: 13px; margin-top: 5px; display: block; color: #333; white-space: pre-wrap; margin-bottom: 15px; }
            .prep-label { font-size: 11px; color: #d35400; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; }
            
            @media print { .print-btn { display: none !important; } }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()" style="position:fixed; top:20px; right:20px; padding:12px 24px; background:#27ae60; color:white; border:none; border-radius:6px; font-size:16px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.3);">📥 Opslaan als PDF</button>

        <div class="logo-box"><img src="Logo Zwart.png" alt="Black Shots Logo" onerror="this.style.display='none'"></div>
        <h1>${hoofdtitel} Black Shots</h1>
        
        <table class="meta-tabel">
            <tr><td>Datum:</td><td>${v.datum || '...'}</td></tr>
            <tr><td>Tijd:</td><td>${v.tijd || '...'}</td></tr>
            <tr><td>Adres:</td><td>${v.adres || '...'}</td></tr>
            <tr><td>Aanwezig:</td><td>${v.aanwezig || '...'}</td></tr>
        </table>

        <h2>${subtitelDoc}</h2>
        <ol class="agenda-lijst">
    `;

    // Genereer de lijst waarbij sub-items perfect als A,B,C in de HTML komen
    let inSubLijst = false;

    v.punten.forEach((punt, index) => {
        // Open of sluit een <ol type="A"> (Sublijst)
        if (punt.isSub && !inSubLijst) {
            htmlDoc += `<ol class="sub-lijst">`;
            inSubLijst = true;
        } else if (!punt.isSub && inSubLijst) {
            htmlDoc += `</ol>`;
            inSubLijst = false;
        }

        htmlDoc += `<li>${punt.titel || 'Onbenoemd punt'}`;
        
        // Spiekbrief tonen
        if (soort === 'spiekbrief' && punt.prep) {
            htmlDoc += `<div class="tekst-blok"><div class="prep-label">Jouw Voorbereiding:</div>${punt.prep}</div>`;
        }
        // Notulen tonen
        if (soort === 'notulen' && punt.verslag) {
            htmlDoc += `<div class="tekst-blok">${punt.verslag}</div>`;
        }
        
        htmlDoc += `</li>`;
    });

    if (inSubLijst) htmlDoc += `</ol>`;
    htmlDoc += `</ol></body></html>`;

    let printTab = window.open('', '_blank'); printTab.document.write(htmlDoc); printTab.document.close();
    setTimeout(() => { printTab.print(); }, 500);
};

setTimeout(window.tekenOverzicht, 200);