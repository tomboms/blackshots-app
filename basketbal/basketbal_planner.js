// --- BASKETBAL_PLANNER.JS: DRAG & DROP + TAKEN + CLOUD SYNC ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];

// DE 3 CRUCIALE DATABASES VOOR DE PLANNER
window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {}; // NIEUW: Onthoudt posities & tijden!

const START_UUR = 8; 
const EIND_UUR = 23; 
const SNAP_MINUTEN = 15; 

// ============================================================================
// ☁️ FIREBASE CLOUD MOTOR
// ============================================================================
window.slaPlannerDataOp = function() {
    // Sla lokaal op
    localStorage.setItem('blackshots_wedstrijd_taken', JSON.stringify(window.takenDB));
    localStorage.setItem('blackshots_plan_status', JSON.stringify(window.planStatusDB));
    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));

    // Stuur door naar Firebase
    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_wedstrijd_taken', window.takenDB);
        window.opslaanInFirebase('blackshots_plan_status', window.planStatusDB);
        window.opslaanInFirebase('blackshots_custom_wedstrijden', window.customWedstrijden);
    } else {
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_wedstrijd_taken', data: window.takenDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_plan_status', data: window.planStatusDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_custom_wedstrijden', data: window.customWedstrijden } }));
    }
};

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    if (sleutel === 'blackshots_custom_wedstrijden') window.customWedstrijden = Array.isArray(data) ? data : Object.values(data);
    
    // Herlaad direct het bord als er data binnenkomt!
    window.laadPlanbord();
};

// ============================================================================
// 🚀 INITIATIE
// ============================================================================
window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let vandaag = new Date();
    let dag = vandaag.getDay();
    let verschilZaterdag = (dag <= 6) ? (6 - dag) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    
    datumInput.value = vandaag.toISOString().split('T')[0];
    
    let teamSelect = document.getElementById('nw-match-team');
    if(teamSelect) {
        teamSelect.innerHTML = '<option value="">-- Selecteer eigen team --</option>';
        window.teamsDB.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.naam}">${t.naam}</option>`;
        });
    }

    window.laadPlanbord();
};

window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = teamNaam.toUpperCase();
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || 
        naam.includes('20') || naam.includes('22') || naam.includes('SE')) {
        return 105;
    }
    return 90; 
};

// ============================================================================
// 📋 TAKEN TOEWIJZEN (4 VELDEN)
// ============================================================================
window.genereerDropdownOpties = function(huidigeWaarde) {
    let html = `<option value="">-- Vrij --</option>`;
    
    html += `<optgroup label="👨‍⚖️ Scheidsrechters (Matrix)">`;
    window.scheidsrechtersDB.forEach(sr => {
        html += `<option value="${sr.naam}">${sr.naam}</option>`;
    });
    html += `</optgroup>`;

    html += `<optgroup label="🏀 Club Teams">`;
    window.teamsDB.forEach(t => {
        html += `<option value="${t.naam}">${t.naam}</option>`;
    });
    html += `</optgroup>`;

    html += `<optgroup label="Overig">`;
    html += `<option value="handmatig">✏️ Handmatig typen...</option>`;
    html += `</optgroup>`;

    // Voeg handmatige typ-tekst toe als optie zodat hij netjes geselecteerd blijft
    let bekendeWaarden = window.scheidsrechtersDB.map(s => s.naam).concat(window.teamsDB.map(t => t.naam));
    if (huidigeWaarde && huidigeWaarde !== "" && !bekendeWaarden.includes(huidigeWaarde)) {
        html += `<option value="${huidigeWaarde}" style="display:none;">${huidigeWaarde}</option>`;
    }

    return html;
};

window.openTakenModal = function(matchId) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => {
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam + w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        let checkId = w.id || `match-${cleanNummer}`;
        return checkId === matchId;
    });

    if (!match) return;

    document.getElementById('taak-match-id').value = matchId;
    document.getElementById('taak-match-titel').innerText = `🏀 ${match.Thuisteam.replace('Black Shots ', '')} vs ${match.Uitteam}`;
    
    let labelEl = document.getElementById(`tijd-label-${matchId}`);
    let weergegevenTijd = labelEl ? labelEl.innerText.replace('⏱️', '').trim() : "Te plannen";
    document.getElementById('taak-match-meta').innerText = `Tijdstip: ${weergegevenTijd} | NBB: ${match.Wedstrijdnummer || 'Custom'}`;

    let taken = window.takenDB[matchId] || { sA: "", sB: "", tab: "", sco: "" };

    let selects = ['taak-scheids-a', 'taak-scheids-b', 'taak-tablet', 'taak-score'];
    let waarden = [taken.sA, taken.sB, taken.tab, taken.sco];

    selects.forEach((selId, i) => {
        let sel = document.getElementById(selId);
        sel.innerHTML = window.genereerDropdownOpties(waarden[i]);
        sel.value = waarden[i];
    });

    document.getElementById('taken-modal').style.display = 'flex';
};

window.checkHandmatigeInvoer = function(selectElement) {
    if (selectElement.value === 'handmatig') {
        let invoer = prompt("Typ de handmatige toewijzing (bijv. 'Ouders X10' of 'Invaller'):");
        if (invoer && invoer.trim() !== "") {
            let nwOption = document.createElement('option');
            nwOption.value = invoer.trim();
            nwOption.text = invoer.trim();
            selectElement.add(nwOption);
            selectElement.value = invoer.trim();
        } else {
            selectElement.value = ""; 
        }
    }
};

window.slaTakenOp = function() {
    let matchId = document.getElementById('taak-match-id').value;
    
    window.takenDB[matchId] = {
        sA: document.getElementById('taak-scheids-a').value,
        sB: document.getElementById('taak-scheids-b').value,
        tab: document.getElementById('taak-tablet').value,
        sco: document.getElementById('taak-score').value
    };

    window.slaPlannerDataOp();
    document.getElementById('taken-modal').style.display = 'none';
    window.laadPlanbord();
};


// ============================================================================
// 🎨 BORD RENDERING & POSITIE BEHOUD
// ============================================================================
window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = document.getElementById('plan-datum').value;
    
    if(!bord || !speelDatum) return;

    let html = `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) {
        html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    }
    html += `</div>`;

    let aantalVelden = locatie === 'veka' ? 2 : 1;
    let veldNamen = locatie === 'veka' ? ['Veld 1', 'Veld 2'] : ['De Veste Hoofdveld'];

    for(let v = 0; v < aantalVelden; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) {
            gridLijnenHtml += `<div class="grid-lijn-15m"></div><div class="grid-lijn-30m"></div><div class="grid-lijn-15m"></div><div class="grid-lijn-60m"></div>`;
        }
        gridLijnenHtml += `</div>`;

        html += `
            <div class="veld-kolom" id="veld-kolom-${v+1}" 
                 ondragover="window.onDragOver(event)" 
                 ondrop="window.onDropVeld(event, ${v+1})">
                <div class="veld-header">${veldNamen[v]}</div>
                ${gridLijnenHtml}
                <div id="wedstrijd-container-${v+1}" style="position:absolute; top:42px; left:0; right:0; bottom:0;"></div>
            </div>
        `;
    }

    bord.innerHTML = html;
    window.plaatsWedstrijdenInWachtkamer(speelDatum);
};

window.plaatsWedstrijdenInWachtkamer = function(datum) {
    let container = document.getElementById('te-plannen-container');
    let leegMelding = document.getElementById('wachtkamer-leeg');
    
    Array.from(container.children).forEach(child => {
        if (!child.classList.contains('wachtkamer-header') && child.id !== 'wachtkamer-leeg') child.remove();
    });

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => (w.Datum === datum || w.Datum.includes(datum)) && (w.Thuisteam || '').toLowerCase().includes('black shots'));

    document.getElementById('aantal-te-plannen').innerText = dagWedstrijden.length;
    leegMelding.style.display = dagWedstrijden.length === 0 ? 'block' : 'none';

    dagWedstrijden.forEach((w) => {
        let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
        let tegenstander = w.Uitteam || 'Tegenstander';
        let isCustom = w.id && w.id.includes('custom');
        
        // DE FIX: Zorgt voor een ONBREEKBAAR en stabiel ID voor de NBB wedstrijden
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (wedstrijdNaam + tegenstander).replace(/[^a-zA-Z0-9]/g, '');
        let uniekId = w.id || `match-${cleanNummer}`;
        
        let duurMinuten = w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);

        // CHECK OF HIJ GEPLAND IS IN DE DATABASE!
        let dbStatus = window.planStatusDB[uniekId];
        
        let doelContainerId = dbStatus ? `wedstrijd-container-${dbStatus.veld}` : 'te-plannen-container';
        let cssPositie = dbStatus ? `position: absolute; top: ${dbStatus.top}px; left: 5px; right: 5px; width: auto;` : `position: relative;`;
        let tijdWeergave = dbStatus ? dbStatus.tijd : ((w.Status === 'Te plannen' || w.Tijd === 'Te plannen') ? 'N.t.b.' : w.Tijd.substring(0,5));
        let badgeKleur = dbStatus ? '#27ae60' : '#e67e22'; 

        let typeBadge = isCustom ? `<span style="background:#8e44ad; color:white; padding:1px 4px; border-radius:3px; font-size:0.65rem;">${w.Wedstrijdnummer}</span>` : '';
        let deleteBtn = isCustom ? `<button onmousedown="event.stopPropagation();" onclick="window.verwijderCustomWedstrijd('${uniekId}')" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:0; margin-left:auto;">🗑️</button>` : '';

        // Taken inladen
        let taken = window.takenDB[uniekId] || { sA: "", sB: "", tab: "", sco: "" };
        let sAW = taken.sA ? `<span class="taak-waarde taak-gevuld">${taken.sA}</span>` : `<span class="taak-waarde">Vrij</span>`;
        let sBW = taken.sB ? `<span class="taak-waarde taak-gevuld">${taken.sB}</span>` : `<span class="taak-waarde">Vrij</span>`;
        let tabW = taken.tab ? `<span class="taak-waarde taak-gevuld">${taken.tab}</span>` : `<span class="taak-waarde">Vrij</span>`;
        let scoW = taken.sco ? `<span class="taak-waarde taak-gevuld">${taken.sco}</span>` : `<span class="taak-waarde">Vrij</span>`;

        let html = `
            <div class="wedstrijd-blok" id="${uniekId}" draggable="true" 
                 ondragstart="window.onDragStart(event)" ondragend="window.onDragEnd(event)"
                 data-duur="${duurMinuten}" style="${cssPositie} height: ${duurMinuten}px;">
                <div class="wb-titel">
                    <span>🏀 ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${tegenstander}</span></span>
                    ${deleteBtn}
                </div>
                <div class="wb-meta">
                    <span class="wb-tijd-badge" id="tijd-label-${uniekId}" onmousedown="event.stopPropagation();" onclick="window.wijzigTijdHandmatig('${uniekId}')" style="background:${badgeKleur};">⏱️ ${tijdWeergave}</span> 
                    <span>| NBB: ${w.Wedstrijdnummer || '?'} ${typeBadge}</span>
                </div>
                <div class="wb-taken" onclick="window.openTakenModal('${uniekId}')">
                    <div style="display:flex; gap:5px;">
                        <div class="taak-regel" style="flex:1;"><span class="taak-label">👨‍⚖️ A:</span> ${sAW}</div>
                        <div class="taak-regel" style="flex:1;"><span class="taak-label">👨‍⚖️ B:</span> ${sBW}</div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <div class="taak-regel" style="flex:1;"><span class="taak-label">💻 Tab:</span> ${tabW}</div>
                        <div class="taak-regel" style="flex:1;"><span class="taak-label">⏱️ Sco:</span> ${scoW}</div>
                    </div>
                </div>
            </div>
        `;
        
        let targetDiv = document.getElementById(doelContainerId);
        if(targetDiv) targetDiv.insertAdjacentHTML('beforeend', html);
    });
};

// ============================================================================
// ⌨️ HANDMATIG TIJD TYPEN & DRAG DROP LOGICA (NU MET OPSLAG)
// ============================================================================
window.wijzigTijdHandmatig = function(id) {
    let labelEl = document.getElementById(`tijd-label-${id}`);
    let huidigeTijd = labelEl.innerText.replace('⏱️', '').trim();
    let suggestie = (huidigeTijd === 'Te plannen' || huidigeTijd === 'N.t.b.') ? '12:00' : huidigeTijd;
    
    let nweTijd = prompt("Voer de starttijd in (UU:MM), of laat leeg om hem terug naar de wachtkamer te sturen:", suggestie);
    if (nweTijd === null) return; 

    if (nweTijd.trim() === "") {
        delete window.planStatusDB[id]; // Gooi weg uit gepland
        window.slaPlannerDataOp();
        window.laadPlanbord();
        return;
    }

    if (!/^\d{1,2}:\d{2}$/.test(nweTijd)) return alert("Ongeldig formaat. Gebruik UU:MM (bijvoorbeeld 14:30)");

    let parts = nweTijd.split(':');
    let uren = parseInt(parts[0]);
    let minuten = parseInt(parts[1]);

    if (uren < START_UUR || uren >= EIND_UUR) return alert(`Let op: de tijd moet tussen ${START_UUR}:00 en ${EIND_UUR}:00 liggen.`);

    let topPixels = ((uren - START_UUR) * 60) + minuten;
    let huidigVeld = window.planStatusDB[id] ? window.planStatusDB[id].veld : 1;

    // Sla de nieuwe positie keihard op!
    window.planStatusDB[id] = { veld: huidigVeld, tijd: nweTijd, top: topPixels };
    window.slaPlannerDataOp();
    window.laadPlanbord();
};

window.draggedMatchId = null;

window.onDragStart = function(e) {
    window.draggedMatchId = e.target.id;
    e.dataTransfer.setData('text/plain', e.target.id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.classList.add('is-dragging'); }, 10);
};

window.onDragEnd = function(e) {
    e.target.classList.remove('is-dragging');
    window.draggedMatchId = null;
};

window.onDragOver = function(e) {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
};

window.onDropVeld = function(e, veldIndex) {
    e.preventDefault();
    let matchId = window.draggedMatchId;
    if (!matchId) return;
    
    let rect = e.currentTarget.getBoundingClientRect();
    let dropY = e.clientY - rect.top - 42; 
    let snapY = Math.round(dropY / SNAP_MINUTEN) * SNAP_MINUTEN;
    if (snapY < 0) snapY = 0; 
    
    let uren = Math.floor(snapY / 60) + START_UUR;
    let minuten = snapY % 60;
    let nieuweTijd = String(uren).padStart(2, '0') + ':' + String(minuten).padStart(2, '0');
    
    // Sla de drop-positie keihard op!
    window.planStatusDB[matchId] = { veld: veldIndex, tijd: nieuweTijd, top: snapY };
    window.slaPlannerDataOp();
    window.laadPlanbord();
};

window.onDropTePlannen = function(e) {
    e.preventDefault();
    let matchId = window.draggedMatchId;
    if (!matchId) return;
    
    // Wis de positie uit de database!
    delete window.planStatusDB[matchId];
    window.slaPlannerDataOp();
    window.laadPlanbord();
};

window.updateWachtkamerTeller = function() {
    let wachtkamer = document.getElementById('te-plannen-container');
    let blocks = wachtkamer.querySelectorAll('.wedstrijd-blok');
    document.getElementById('aantal-te-plannen').innerText = blocks.length;
    document.getElementById('wachtkamer-leeg').style.display = blocks.length === 0 ? 'block' : 'none';
};

// ============================================================================
// 🤖 LAAD ALLE TEAMS & HANDMATIG
// ============================================================================
window.genereerAlleTeams = function() {
    let speelDatum = document.getElementById('plan-datum').value;
    if(!speelDatum) return alert("Kies eerst een datum!");

    if(!confirm(`Alle competitieteams toevoegen op ${speelDatum}?`)) return;

    window.teamsDB.forEach(t => {
        if (t.isRecreant || t.isVrijwilliger) return;
        let nwCustomMatch = {
            id: 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            Datum: speelDatum,
            Thuisteam: "Black Shots " + t.naam,
            Uitteam: "Tegenstander " + t.naam,
            Tijd: "Te plannen",
            Status: "Te plannen",
            Wedstrijdnummer: "Competitie", 
            handmatigeDuur: window.bepaalWedstrijdDuur(t.naam) 
        };
        window.customWedstrijden.push(nwCustomMatch);
    });
    window.slaPlannerDataOp();
    window.laadPlanbord(); 
};

window.openNieuweWedstrijdModal = function() {
    document.getElementById('nw-match-tegenstander').value = "";
    document.getElementById('nw-match-type').value = "Oefenwedstrijd"; 
    document.getElementById('nw-match-duur').value = "90";
    document.getElementById('nieuw-wedstrijd-modal').style.display = 'flex';
};

window.updateDuurSuggestie = function() {
    let teamNaam = document.getElementById('nw-match-team').value;
    if(!teamNaam) return;
    document.getElementById('nw-match-duur').value = window.bepaalWedstrijdDuur(teamNaam);
};

window.slaNieuweWedstrijdOp = function() {
    let teamNaam = document.getElementById('nw-match-team').value;
    let tegenstander = document.getElementById('nw-match-tegenstander').value.trim();
    let speelDatum = document.getElementById('plan-datum').value;
    let duur = parseInt(document.getElementById('nw-match-duur').value);
    let type = document.getElementById('nw-match-type').value;

    if (!teamNaam || !tegenstander) return alert("Vul thuisteam en tegenstander in!");

    let nwCustomMatch = {
        id: 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        Datum: speelDatum,
        Thuisteam: "Black Shots " + teamNaam,
        Uitteam: tegenstander,
        Tijd: "Te plannen",
        Status: "Te plannen",
        Wedstrijdnummer: type, 
        handmatigeDuur: duur 
    };

    window.customWedstrijden.push(nwCustomMatch);
    window.slaPlannerDataOp();
    document.getElementById('nieuw-wedstrijd-modal').style.display = 'none';
    window.laadPlanbord(); 
};

window.verwijderCustomWedstrijd = function(id) {
    if(confirm("Weet je zeker dat je deze wedstrijd wilt verwijderen?")) {
        window.customWedstrijden = window.customWedstrijden.filter(w => w.id !== id);
        delete window.takenDB[id];
        delete window.planStatusDB[id];
        window.slaPlannerDataOp();
        window.laadPlanbord(); 
    }
};