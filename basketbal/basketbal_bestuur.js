// --- BASKETBAL_BESTUUR.JS: COMPLETE VERSIE MET SYNC, SJABLONEN & VASTZETTEN ---

window.bestuurDB = JSON.parse(localStorage.getItem('blackshots_bestuur')) || [];
window.bestuurSjablonen = JSON.parse(localStorage.getItem('blackshots_bestuur_sjablonen')) || {
    "Bestuur": [
        "Opening en vaststellen agendapunten",
        "Mededelingen en ledenmutaties",
        "Actielijst",
        "Ingekomen stukken",
        "Financiën",
        "Jaarplanning",
        "Extra agendapunten bespreken",
        "Rondvraag",
        "Vaststellen volgende vergaderdatum en sluiting"
    ],
    "ALV": [
        "Opening door de voorzitter",
        "Ingekomen stukken en mededelingen",
        "Notulen vorige ALV",
        "Jaarverslag secretaris",
        "Financieel jaarverslag penningmeester",
        "Verslag kascommissie en decharge",
        "Begroting & contributievaststelling komend seizoen",
        "Bestuursverkiezing",
        "Rondvraag & Sluiting"
    ],
    "Commissie": [
        "Opening en doelstelling",
        "Status updates lopende projecten",
        "Knelpunten & Actiepunten",
        "Rondvraag en sluiting"
    ],
    "Plain": []
};
window.actieveVergaderingId = null;
window.isLiveModus = false;

// --- CLOUD SYNC MOTOR ---
window.slaDataOp = function(sleutel, data) {
    localStorage.setItem(sleutel, JSON.stringify(data));
    if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase(sleutel, data);
    else if (typeof window.bewaarNaarFirebase === 'function') window.bewaarNaarFirebase(sleutel, data);
    else document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: sleutel, data: data } }));
};

window.ontvangCloudDataBestuur = function(sleutel, data) {
    if (sleutel === 'blackshots_bestuur' && data) {
        window.bestuurDB = data;
        if (!window.actieveVergaderingId) window.tekenOverzicht();
    }
    if (sleutel === 'blackshots_bestuur_sjablonen' && data) {
        window.bestuurSjablonen = data;
    }
};

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
        let typeIcoon = v.type === 'ALV' ? '👥' : (v.type === 'Commissie' ? '📋' : '💼');
        container.innerHTML += `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; transition:0.2s; border-left:6px solid #3498db; margin-bottom:10px;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                <div style="flex:1; cursor:pointer;" onclick="window.openVergadering('${v.id}')">
                    <strong style="font-size:1.2rem; color:var(--secondary-color);">${v.vastgezet ? '🔒' : '📅'} ${v.datum || 'Nieuwe Vergadering'} <span style="font-size:0.9rem; color:#7f8c8d;">(${typeIcoon} ${v.type || 'Bestuur'})</span></strong>
                    <div style="color:#7f8c8d; font-size:0.9rem; margin-top:5px;">🕒 ${v.tijd || '?'} | 📍 ${v.adres || '?'}</div>
                </div>
                <button onclick="window.verwijderVergadering('${v.id}')" style="background:#e74c3c; color:white; border:none; border-radius:6px; padding:10px 15px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:0.2s;" onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'" title="Verwijder deze vergadering direct">🗑️</button>
            </div>
        `;
    });
};

// --- 2. VERGADERING AANMAKEN & OPENEN ---
window.openNieuweVergaderingModal = function() {
    document.getElementById('am_datum').value = new Date().toISOString().split('T')[0];
    document.getElementById('aanmaak-modal').style.display = 'flex';
};
window.bevestigNieuweVergadering = function() {
    let ruweDatum = document.getElementById('am_datum').value;
    let type = document.getElementById('am_type').value;
    
    if(!ruweDatum) return alert("Kies eerst een datum!");
    
    let dParts = ruweDatum.split('-');
    let maanden = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    let weergaveDatum = `${parseInt(dParts[2])} ${maanden[parseInt(dParts[1]) - 1]} ${dParts[0]}`;

    let geselecteerdSjabloon = window.bestuurSjablonen[type] || [];
    let startPunten = geselecteerdSjabloon.map(titel => {
        return { id: 'p_' + Math.random().toString(36).substr(2, 9), titel: titel, isSub: false, prep: '', klad: '', verslag: '' };
    });

    let nw = { 
        id: 'verg_' + Date.now(), 
        type: type,
        datum: weergaveDatum, 
        isoDatum: ruweDatum, 
        tijd: '20:00 uur', 
        adres: 'De Veste', 
        aanwezig: 'Martin, Izaac, Jolanda, Tom', 
        vastgezet: false, 
        acties: [], 
        punten: startPunten
    };

    window.bestuurDB.push(nw);
    document.getElementById('aanmaak-modal').style.display = 'none';
    
    window.actieveVergaderingId = nw.id; 
    window.slaOpEnHerlaad(); // FIX: Voert nu direct de cloud opslag én de jaarplanning sync uit!
    window.openVergadering(nw.id);
};

window.openVergadering = function(id) {
    window.actieveVergaderingId = id;
    let v = window.bestuurDB.find(x => x.id === id);
    if (!v) return;

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

    window.tekenAgendaPunten();

    // TEKEN DE VASTZET KNOP OP DE JUISTE PLEK
    let lockBtnContainer = document.getElementById('lock-btn-container');
    if (lockBtnContainer) {
        if (v.vastgezet) {
            lockBtnContainer.innerHTML = `<button onclick="window.toggleVergaderingLock()" style="width:100%; background:#7f8c8d; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; font-size:1.1rem; cursor:pointer;">🔓 Wijzig Notulen (Vergadering is nu Vastgezet)</button>`;
        } else {
            lockBtnContainer.innerHTML = `<button onclick="window.toggleVergaderingLock()" style="width:100%; background:#2c3e50; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.15);">🔒 Zet Vergadering Definitief Vast</button>`;
        }
    }

    // SCHAKEL VELDEN UIT ALS HIJ VASTZIT
    setTimeout(() => {
        let inputs = document.querySelectorAll('#editor-scherm input, #editor-scherm textarea, #editor-scherm select');
        inputs.forEach(input => {
            if (input.closest('#lock-btn-container') || input.matches('button') || input.onclick) return;
            input.disabled = v.vastgezet;
            if(v.vastgezet) input.style.background = "#f8f9fa";
            else input.style.background = "transparent";
        });
    }, 50);
};

window.sluitEditor = function() {
    window.actieveVergaderingId = null;
    document.getElementById('editor-scherm').style.display = 'none';
    document.getElementById('overzicht-scherm').style.display = 'block';
    if (window.isLiveModus) window.toggleLiveModus();
    window.tekenOverzicht();
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
    window.tekenAgendaPunten(); 
};

window.toggleVergaderingLock = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    if (!v) return;
    v.vastgezet = !v.vastgezet;
    window.slaOpEnHerlaad();
    window.openVergadering(v.id); 
};

// --- 3. SLEPEN (DRAG & DROP) LOGICA ---
let draggedItemIndex = null;
window.startDrag = function(index) { draggedItemIndex = index; };
window.overDrag = function(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); };
window.leaveDrag = function(event) { event.currentTarget.classList.remove('drag-over'); };
window.dropPunt = function(event, index) {
    event.preventDefault(); event.currentTarget.classList.remove('drag-over');
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    if(v.vastgezet) return; // Niet slepen als hij vastzit
    
    let draggedPunt = v.punten.splice(draggedItemIndex, 1)[0]; 
    v.punten.splice(index, 0, draggedPunt); 
    
    window.slaOpEnHerlaad(); window.tekenAgendaPunten(); draggedItemIndex = null;
};

// --- 4. AGENDAPUNTEN TEKENEN ---
window.tekenAgendaPunten = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    let container = document.getElementById('agenda-punten-container');
    container.innerHTML = '';

    let mainCounter = 0;
    let subCounter = 0;

    v.punten.forEach((punt, index) => {
        let prefixStr = '';
        if (punt.isSub) {
            let letter = String.fromCharCode(65 + subCounter);
            prefixStr = letter + ".";
            subCounter++;
        } else {
            mainCounter++;
            prefixStr = mainCounter + ".";
            subCounter = 0; 
        }

        let isSubClass = punt.isSub ? 'sub-punt' : '';
        let subBtnKleur = punt.isSub ? '#8e44ad' : '#bdc3c7';

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
                    <textarea class="notitie-veld klad-veld" style="min-height:150px; font-size:1.05rem;" placeholder="✍️ TYP HIER JE KLADNOTITIES TIJDENS DE VERGADERING..." onchange="window.slaVeldOp('${punt.id}', 'klad', this.value)" ${v.vastgezet ? 'disabled' : ''}>${punt.klad || ''}</textarea>
                </div>
            </div>`;
        } else {
            htmlVakken = `
            <div class="drie-vakken-grid">
                <div>
                    <label class="veld-label label-prep">🤫 1. Tom's Versie</label>
                    <textarea class="notitie-veld prep-veld" placeholder="Wat wil je bespreken?" onchange="window.slaVeldOp('${punt.id}', 'prep', this.value)" ${v.vastgezet ? 'disabled' : ''}>${punt.prep}</textarea>
                </div>
                <div>
                    <label class="veld-label label-klad">📝 2. Vergader Klad</label>
                    <textarea class="notitie-veld klad-veld" placeholder="Je snelle krabbels (LIVE)..." onchange="window.slaVeldOp('${punt.id}', 'klad', this.value)" ${v.vastgezet ? 'disabled' : ''}>${punt.klad || ''}</textarea>
                </div>
                <div>
                    <label class="veld-label label-live">✍️ 3. Nette Notule</label>
                    <textarea class="notitie-veld live-veld" placeholder="Definitieve tekst voor in de PDF..." onchange="window.slaVeldOp('${punt.id}', 'verslag', this.value)" ${v.vastgezet ? 'disabled' : ''}>${punt.verslag}</textarea>
                </div>
            </div>`;
        }

        let actieKnoppen = (window.isLiveModus || v.vastgezet) ? '' : `
            <div style="display:flex; align-items:center; gap:8px;">
                <button onclick="window.toggleSubPunt('${punt.id}')" class="sub-btn" style="background:transparent; border:1px solid ${subBtnKleur}; color:${subBtnKleur}; border-radius:4px; padding:3px 8px; font-size:0.8rem; font-weight:bold; cursor:pointer;" title="Maak hier een A, B, C sub-punt van">⇥ Inspringen</button>
                <button onclick="window.verwijderPunt('${punt.id}')" class="delete-btn" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; font-size:1.2rem;" title="Verwijder dit blok">&times;</button>
            </div>
        `;

        container.innerHTML += `
            <div class="agenda-punt ${isSubClass}" draggable="${!window.isLiveModus && !v.vastgezet}" ondragstart="window.startDrag(${index})" ondragover="window.overDrag(event)" ondragleave="window.leaveDrag(event)" ondrop="window.dropPunt(event, ${index})">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; align-items:center; flex:1;">
                        ${v.vastgezet ? '' : `<span class="drag-handle" title="Sleep om te verplaatsen">${dragIcon}</span>`}
                        <span style="font-size:1.2rem; font-weight:bold; color:var(--secondary-color); margin-right:10px; width:30px; text-align:right;">${prefixStr}</span>
                        <input type="text" class="agenda-titel-input" value="${punt.titel}" placeholder="Naam van dit agendapunt..." onchange="window.slaTitelOp('${punt.id}', this.value)" ${v.vastgezet ? 'disabled' : ''}>
                    </div>
                    ${actieKnoppen}
                </div>
                ${htmlVakken}
            </div>`;
    });
};

// --- 5. EDIT & BEWAAR FUNCTIES ---
window.slaOpEnHerlaad = function() {
    // 1. Sla de bestuursvergadering op via de universele cloud motor
    window.slaDataOp('blackshots_bestuur', window.bestuurDB);
    
    // 2. Voer de automatische achtergrond-sync naar de Jaarplanning uit
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    if (v && v.isoDatum) {
        let planningDB = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        
        // FIX: Uniek ID gewijzigd naar 'verg_' om conflicten met de toernooimodule te voorkomen
        let uniekId = `verg_${v.id}`; 
        let bestaandeIndex = planningDB.findIndex(item => item.id === uniekId);

        let omschrijving = `Notulen & Agenda voor de ${v.type || 'Bestuur'}vergadering.\n`;
        if (v.vastgezet) omschrijving += `🔒 Deze notulen zijn officieel vastgesteld.\n`;
        omschrijving += `\n🔗 Open de notulen direct in het clubbeheer via de Bestuur pagina.`;

        let act = {
            id: uniekId,
            type: 'vergadering', 
            titel: `📅 ${v.type || 'Bestuur'} Vergadering`,
            tekst: `📅 ${v.type || 'Bestuur'} Vergadering`,
            datum: v.isoDatum,
            isoDatum: v.isoDatum,
            eindDatum: v.isoDatum, 
            tijd: v.tijd || "20:00",
            locatie: v.adres || "De Veste",
            kleur: "#34495e", 
            omschrijving: omschrijving
        };

        if (bestaandeIndex > -1) planningDB[bestaandeIndex] = act;
        else planningDB.push(act);
        
        // FIX: Data wordt nu correct via de Firebase wrapper verzonden
        window.slaDataOp('blackshots_jaarplanning_data', planningDB);
    }
};

window.slaTitelOp = function(puntId, val) { window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId).titel = val; window.slaOpEnHerlaad(); };
window.slaVeldOp = function(puntId, veldNaam, val) { window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId)[veldNaam] = val; window.slaOpEnHerlaad(); };

window.toggleSubPunt = function(puntId) {
    let p = window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId);
    p.isSub = !p.isSub;
    window.slaOpEnHerlaad(); window.tekenAgendaPunten();
};

window.voegPuntToe = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    if(v.vastgezet) return;
    v.punten.push({ id: 'p_' + Math.random().toString(36).substr(2, 9), titel: 'Nieuw Agendapunt', isSub: false, prep: '', klad: '', verslag: '' });
    window.slaOpEnHerlaad(); window.tekenAgendaPunten();
    setTimeout(() => { window.scrollTo({ left: 0, top: document.body.scrollHeight, behavior: "smooth" }); }, 100);
};

window.verwijderPunt = function(puntId) {
    if(confirm("Weet je zeker dat je dit agendapunt wilt wissen?")) {
        let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
        v.punten = v.punten.filter(p => p.id !== puntId);
        window.slaOpEnHerlaad(); window.tekenAgendaPunten();
    }
};

window.verwijderVergadering = function(idGeforceerd = null) {
    let doelId = idGeforceerd || window.actieveVergaderingId;
    if(confirm("Weet je zeker dat je deze hele vergadering inclusief alle notulen definitief wilt wissen? Dit kan niet ongedaan worden gemaakt.")) {
        window.bestuurDB = window.bestuurDB.filter(x => x.id !== doelId);
        window.slaDataOp('blackshots_bestuur', window.bestuurDB);
        
        if (window.actieveVergaderingId === doelId) window.sluitEditor(); 
        else window.tekenOverzicht();
    }
}

window.slaOpEnHerlaad = function() {
    window.slaDataOp('blackshots_bestuur', window.bestuurDB);
    
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    if (v && v.isoDatum) {
        let planningDB = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        let uniekId = `toernooi_${v.id}`; 
        let bestaandeIndex = planningDB.findIndex(item => item.id === uniekId);

        let omschrijving = `Notulen & Agenda voor de ${v.type || 'Bestuur'}vergadering.\n`;
        if (v.vastgezet) omschrijving += `🔒 Deze notulen zijn officieel vastgesteld.\n`;
        omschrijving += `\n🔗 Open de notulen direct in het clubbeheer via de Bestuur pagina.`;

        let act = {
            id: uniekId,
            type: 'vergadering', 
            titel: `📅 ${v.type || 'Bestuur'} Vergadering`,
            tekst: `📅 ${v.type || 'Bestuur'} Vergadering`,
            datum: v.isoDatum,
            isoDatum: v.isoDatum,
            eindDatum: v.isoDatum, 
            tijd: v.tijd || "20:00",
            locatie: v.adres || "De Veste",
            kleur: "#34495e", 
            omschrijving: omschrijving
        };

        if (bestaandeIndex > -1) planningDB[bestaandeIndex] = act;
        else planningDB.push(act);
        
        localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(planningDB));
        if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase('blackshots_jaarplanning_data', planningDB);
    }
}

// --- 6. SJABLOON BEHEERDER (MULTI-TYPE ONDERSTEUNING) ---
window.tempSjabloon = [];
window.actiefSjabloonType = "Bestuur";
let dragSjabIndex = null;

window.openSjabloonInstellingen = function() {
    window.actiefSjabloonType = "Bestuur";
    window.vulSjabloonTypeSelect();
    window.laadSjabloonType(window.actiefSjabloonType); 
    document.getElementById('sjabloon-modal').style.display = 'flex';
};

window.sluitSjabloonInstellingen = function() { document.getElementById('sjabloon-modal').style.display = 'none'; };

window.vulSjabloonTypeSelect = function() {
    let select = document.getElementById('sjabloon-type-select');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(window.bestuurSjablonen).forEach(type => {
        select.innerHTML += `<option value="${type}">${type}</option>`;
    });
    select.value = window.actiefSjabloonType;
};

window.wisselSjabloonType = function(type) {
    window.actiefSjabloonType = type;
    window.laadSjabloonType(type);
};

window.laadSjabloonType = function(type) {
    window.tempSjabloon = [...(window.bestuurSjablonen[type] || [])];
    window.tekenSjabloonLijst();
};

window.maakNieuwSjabloonType = function() {
    let nieuwType = prompt("Naam van het nieuwe type vergadering / sjabloon?");
    if (!nieuwType) return;
    nieuwType = nieuwType.trim();
    if (window.bestuurSjablonen[nieuwType]) return alert("Dit type bestaat al!");
    
    window.bestuurSjablonen[nieuwType] = [];
    window.actiefSjabloonType = nieuwType;
    window.vulSjabloonTypeSelect();
    window.laadSjabloonType(nieuwType);
};

window.startDragSjab = function(index) { dragSjabIndex = index; };
window.overDragSjab = function(event) { event.preventDefault(); event.currentTarget.classList.add('drag-over'); };
window.leaveDragSjab = function(event) { event.currentTarget.classList.remove('drag-over'); };
window.dropSjab = function(event, index) {
    event.preventDefault(); event.currentTarget.classList.remove('drag-over');
    if (dragSjabIndex === null || dragSjabIndex === index) return;
    let draggedItem = window.tempSjabloon.splice(dragSjabIndex, 1)[0];
    window.tempSjabloon.splice(index, 0, draggedItem);
    window.tekenSjabloonLijst(); dragSjabIndex = null;
};

window.tekenSjabloonLijst = function() {
    let c = document.getElementById('sjabloon-lijst'); c.innerHTML = '';
    window.tempSjabloon.forEach((punt, idx) => {
        c.innerHTML += `
            <div class="sjabloon-rij" draggable="true" ondragstart="window.startDragSjab(${idx})" ondragover="window.overDragSjab(event)" ondragleave="window.leaveDragSjab(event)" ondrop="window.dropSjab(event, ${idx})">
                <span style="cursor:grab; color:#bdc3c7;">${dragIcon}</span>
                <span style="font-weight:bold; color:#7f8c8d; min-width:25px;">${idx+1}.</span>
                <input type="text" value="${punt}" onchange="window.tempSjabloon[${idx}] = this.value" style="flex:1; padding:8px; border:1px solid #bdc3c7; border-radius:4px; font-family:inherit; background:transparent; color:inherit;">
                <button onclick="window.tempSjabloon.splice(${idx}, 1); window.tekenSjabloonLijst()" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:6px 12px; font-weight:bold; cursor:pointer;">X</button>
            </div>`;
    });
};

window.voegSjabloonPuntToe = function() { window.tempSjabloon.push('Nieuw agendapunt...'); window.tekenSjabloonLijst(); };

window.slaSjabloonOp = function() {
    window.bestuurSjablonen[window.actiefSjabloonType] = window.tempSjabloon.filter(x => x.trim() !== '');
    window.slaDataOp('blackshots_bestuur_sjablonen', window.bestuurSjablonen);
    window.sluitSjabloonInstellingen();
    alert("✅ Sjablonen succesvol bijgewerkt!");
};
// --- 7. DE PDF EXPORT ---
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

    let inSubLijst = false;
    v.punten.forEach((punt) => {
        if (punt.isSub && !inSubLijst) { htmlDoc += `<ol class="sub-lijst">`; inSubLijst = true; } 
        else if (!punt.isSub && inSubLijst) { htmlDoc += `</ol>`; inSubLijst = false; }

        htmlDoc += `<li>${punt.titel || 'Onbenoemd punt'}`;
        if (soort === 'spiekbrief' && punt.prep) htmlDoc += `<div class="tekst-blok"><div class="prep-label">Jouw Voorbereiding:</div>${punt.prep}</div>`;
        if (soort === 'notulen' && punt.verslag) htmlDoc += `<div class="tekst-blok">${punt.verslag}</div>`;
        htmlDoc += `</li>`;
    });

    if (inSubLijst) htmlDoc += `</ol>`;
    htmlDoc += `</ol></body></html>`;

    let printTab = window.open('', '_blank'); printTab.document.write(htmlDoc); printTab.document.close();
    setTimeout(() => { printTab.print(); }, 500);
};

setTimeout(window.tekenOverzicht, 200);