// --- BASKETBAL_PLANNER.JS: DRAG & DROP + HANDMATIG TYPEN ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];

const START_UUR = 8; 
const EIND_UUR = 23; 
const SNAP_MINUTEN = 15; 

window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let vandaag = new Date();
    let dag = vandaag.getDay();
    let verschilZaterdag = (dag <= 6) ? (6 - dag) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    
    datumInput.value = vandaag.toISOString().split('T')[0];
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
// 🤖 LAAD ALLE TEAMS TEGELIJK (GENERATOR)
// ============================================================================
window.genereerAlleTeams = function() {
    let speelDatum = document.getElementById('plan-datum').value;
    if(!speelDatum) return alert("Kies eerst een datum!");

    if(!confirm(`Weet je zeker dat je voor ELK competitieteam een thuiswedstrijd wilt inplannen op ${speelDatum}?`)) return;

    window.teamsDB.forEach(t => {
        // Alleen competitieteams, geen recreanten
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

    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));
    window.laadPlanbord(); 
    alert("✅ Alle teams zijn toegevoegd aan de wachtkamer!");
};


// ============================================================================
// ✍️ HANDMATIGE WEDSTRIJDEN AANMAKEN & VERWIJDEREN
// ============================================================================
window.openNieuweWedstrijdModal = function() {
    let teamSelect = document.getElementById('nw-match-team');
    teamSelect.innerHTML = '<option value="">-- Selecteer eigen team --</option>';
    
    window.teamsDB.forEach(t => {
        teamSelect.innerHTML += `<option value="${t.naam}">${t.naam}</option>`;
    });

    document.getElementById('nw-match-tegenstander').value = "";
    document.getElementById('nw-match-type').value = "Oefenwedstrijd"; // Reset hard naar oefenwedstrijd
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

    if (!teamNaam || !tegenstander) {
        return alert("Vul zowel een thuisteam als een tegenstander in!");
    }

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
    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));
    
    document.getElementById('nieuw-wedstrijd-modal').style.display = 'none';
    window.laadPlanbord(); 
};

window.verwijderCustomWedstrijd = function(id) {
    if(confirm("Weet je zeker dat je deze wedstrijd wilt verwijderen?")) {
        window.customWedstrijden = window.customWedstrijden.filter(w => w.id !== id);
        localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));
        window.laadPlanbord(); 
    }
};

// ============================================================================
// ⌨️ HANDMATIG TIJD TYPEN DOOR TE KLIKKEN
// ============================================================================
window.wijzigTijdHandmatig = function(id) {
    let matchEl = document.getElementById(id);
    let labelEl = document.getElementById(`tijd-label-${id}`);
    
    // Haal huidige tijd op uit het label
    let huidigeTijd = labelEl.innerText.replace('⏱️', '').trim();
    let suggestie = (huidigeTijd === 'Te plannen' || huidigeTijd === 'N.t.b.') ? '12:00' : huidigeTijd;
    
    let nweTijd = prompt("Voer de starttijd in (UU:MM), of laat leeg om hem terug naar de wachtkamer te sturen:", suggestie);
    
    // Annuleren geklikt
    if (nweTijd === null) return; 

    // Terug naar wachtkamer als veld leeg is
    if (nweTijd.trim() === "") {
        let wachtkamer = document.getElementById('te-plannen-container');
        matchEl.style.position = 'relative';
        matchEl.style.top = 'auto';
        matchEl.style.left = 'auto';
        matchEl.style.right = 'auto';
        labelEl.innerText = `⏱️ Te plannen`;
        labelEl.style.background = '#e74c3c'; 
        wachtkamer.appendChild(matchEl);
        window.updateWachtkamerTeller();
        return;
    }

    // Tijd valideren (verwacht format 14:30)
    if (!/^\d{1,2}:\d{2}$/.test(nweTijd)) {
        return alert("Ongeldig formaat. Gebruik UU:MM (bijvoorbeeld 14:30)");
    }

    let parts = nweTijd.split(':');
    let uren = parseInt(parts[0]);
    let minuten = parseInt(parts[1]);

    if (uren < START_UUR || uren >= EIND_UUR) {
        return alert(`Let op: de tijd moet tussen ${START_UUR}:00 en ${EIND_UUR}:00 liggen.`);
    }

    // Zet hem standaard op Veld 1 als hij nog in de wachtkamer stond
    let veldContainer = matchEl.parentElement;
    if (veldContainer.id === 'te-plannen-container') {
        veldContainer = document.getElementById('wedstrijd-container-1'); 
    }

    // Bereken pixel positie (1 minuut = 1 pixel)
    let topPixels = ((uren - START_UUR) * 60) + minuten;

    matchEl.style.position = 'absolute';
    matchEl.style.top = topPixels + 'px';
    matchEl.style.left = '5px';
    matchEl.style.right = '5px';
    matchEl.style.width = 'auto'; 

    labelEl.innerText = `⏱️ ${String(uren).padStart(2, '0')}:${String(minuten).padStart(2, '0')}`;
    labelEl.style.background = '#27ae60'; 

    veldContainer.appendChild(matchEl);
    window.updateWachtkamerTeller();
};

// ============================================================================
// 🎨 BORD RENDERING
// ============================================================================
window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = document.getElementById('plan-datum').value;
    
    if(!bord || !speelDatum) return;

    let html = '';

    html += `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) {
        html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    }
    html += `</div>`;

    let aantalVelden = locatie === 'veka' ? 2 : 1;
    let veldNamen = locatie === 'veka' ? ['Veld 1', 'Veld 2'] : ['De Veste Hoofdveld'];

    for(let v = 0; v < aantalVelden; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) {
            gridLijnenHtml += `
                <div class="grid-lijn-15m"></div>
                <div class="grid-lijn-30m"></div>
                <div class="grid-lijn-15m"></div>
                <div class="grid-lijn-60m"></div>
            `;
        }
        gridLijnenHtml += `</div>`;

        html += `
            <div class="veld-kolom" id="veld-kolom-${v+1}" 
                 ondragover="window.onDragOver(event)" 
                 ondrop="window.onDropVeld(event, ${v+1})">
                <div class="veld-header">${veldNamen[v]}</div>
                ${gridLijnenHtml}
                <div id="wedstrijd-container-${v+1}" style="position:absolute; top:42px; left:0; right:0; bottom:0;">
                </div>
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
        if (!child.classList.contains('wachtkamer-header') && child.id !== 'wachtkamer-leeg') {
            child.remove();
        }
    });

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];

    let dagWedstrijden = alleWedstrijden.filter(w => {
        let isDatum = w.Datum === datum || w.Datum.includes(datum);
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        return isDatum && isThuis;
    });

    document.getElementById('aantal-te-plannen').innerText = dagWedstrijden.length;

    if(dagWedstrijden.length === 0) {
        leegMelding.style.display = 'block';
        return;
    }
    leegMelding.style.display = 'none';

    dagWedstrijden.sort((a,b) => (a.Tijd || '00:00').localeCompare(b.Tijd || '00:00'));

    dagWedstrijden.forEach((w) => {
        let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
        let tegenstander = w.Uitteam || 'Tegenstander';
        let uniekId = w.id || `match-${w.Wedstrijdnummer || Date.now() + Math.random()}`;
        let duurMinuten = w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);
        let tijdWeergave = (w.Status === 'Te plannen' || w.Tijd === 'Te plannen') ? 'N.t.b.' : w.Tijd.substring(0,5);

        let isCustom = w.id && w.id.includes('custom');
        let typeBadge = isCustom ? `<span style="background:#8e44ad; color:white; padding:1px 4px; border-radius:3px; font-size:0.65rem;">${w.Wedstrijdnummer}</span>` : '';
        let deleteBtn = isCustom ? `<button onmousedown="event.stopPropagation();" onclick="window.verwijderCustomWedstrijd('${uniekId}')" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:0; margin-left:auto;" title="Verwijder">🗑️</button>` : '';

        // Let op de onmousedown="event.stopPropagation()" bij het tijd-label. Dit voorkomt dat je per ongeluk gaat slepen als je wilt klikken!
        let html = `
            <div class="wedstrijd-blok" id="${uniekId}" draggable="true" 
                 ondragstart="window.onDragStart(event)" 
                 ondragend="window.onDragEnd(event)"
                 data-duur="${duurMinuten}"
                 style="position: relative; height: ${duurMinuten}px;">
                <div class="wb-titel">
                    <span>🏀 ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${tegenstander}</span></span>
                    ${deleteBtn}
                </div>
                <div class="wb-meta">
                    <span class="wb-tijd-badge" id="tijd-label-${uniekId}" onmousedown="event.stopPropagation();" onclick="window.wijzigTijdHandmatig('${uniekId}')" title="Klik om tijd te typen">⏱️ ${tijdWeergave}</span> 
                    <span>| NBB: ${w.Wedstrijdnummer || '?'} ${typeBadge}</span>
                </div>
                <div class="wb-taken">
                    <div class="taak-regel"><span>👨‍⚖️ Scheids:</span> <span style="color:#e74c3c;">Vrij</span></div>
                    <div class="taak-regel"><span>⏱️ Tafel:</span> <span style="color:#e74c3c;">Vrij</span></div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
    });
};

// ============================================================================
// 🖱️ DRAG & DROP MOTOR
// ============================================================================
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
    
    let matchEl = document.getElementById(matchId);
    let targetContainer = document.getElementById(`wedstrijd-container-${veldIndex}`);
    
    let rect = e.currentTarget.getBoundingClientRect();
    let dropY = e.clientY - rect.top - 42; 
    
    let snapY = Math.round(dropY / SNAP_MINUTEN) * SNAP_MINUTEN;
    if (snapY < 0) snapY = 0; 
    
    let uren = Math.floor(snapY / 60) + START_UUR;
    let minuten = snapY % 60;
    let nieuweTijd = String(uren).padStart(2, '0') + ':' + String(minuten).padStart(2, '0');
    
    matchEl.style.position = 'absolute';
    matchEl.style.top = snapY + 'px';
    matchEl.style.left = '5px';
    matchEl.style.right = '5px';
    matchEl.style.width = 'auto'; 
    
    document.getElementById(`tijd-label-${matchId}`).innerText = `⏱️ ${nieuweTijd}`;
    document.getElementById(`tijd-label-${matchId}`).style.background = '#27ae60'; 
    
    targetContainer.appendChild(matchEl);
    window.updateWachtkamerTeller();
};

window.onDropTePlannen = function(e) {
    e.preventDefault();

    let matchId = window.draggedMatchId;
    if (!matchId) return;
    
    let matchEl = document.getElementById(matchId);
    let wachtkamer = document.getElementById('te-plannen-container');
    
    matchEl.style.position = 'relative';
    matchEl.style.top = 'auto';
    matchEl.style.left = 'auto';
    matchEl.style.right = 'auto';
    
    document.getElementById(`tijd-label-${matchId}`).innerText = `⏱️ Te plannen`;
    document.getElementById(`tijd-label-${matchId}`).style.background = '#e74c3c'; 
    
    wachtkamer.appendChild(matchEl);
    window.updateWachtkamerTeller();
};

window.updateWachtkamerTeller = function() {
    let wachtkamer = document.getElementById('te-plannen-container');
    let blocks = wachtkamer.querySelectorAll('.wedstrijd-blok');
    document.getElementById('aantal-te-plannen').innerText = blocks.length;
    
    if (blocks.length === 0) {
        document.getElementById('wachtkamer-leeg').style.display = 'block';
    } else {
        document.getElementById('wachtkamer-leeg').style.display = 'none';
    }
};