// --- BASKETBAL_PLANNER.JS: DE DRAG & DROP THUISWEDSTRIJD PLANNER ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];

// Instellingen voor de grid
const START_UUR = 8; // 08:00
const EIND_UUR = 23; // 23:00
const PIXELS_PER_MINUUT = 1; // 1 pixel = 1 minuut. (60px per uur)
const SNAP_MINUTEN = 15; // Blokjes klikken vast op elke 15 minuten

window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let vandaag = new Date();
    let dag = vandaag.getDay();
    let verschilZaterdag = (dag <= 6) ? (6 - dag) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    
    datumInput.value = vandaag.toISOString().split('T')[0];
    window.laadPlanbord();
};

// --- HULPFUNCTIE: BEREKEN DYNAMISCHE WEDSTRIJDDUUR ---
window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = teamNaam.toUpperCase();
    // Als het X14, M16, M18, M22 of Senioren is: 105 minuten (1 uur 45 min)
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || 
        naam.includes('20') || naam.includes('22') || naam.includes('SE')) {
        return 105;
    }
    // Standaard voor jeugd (X10, X12) is 90 minuten (1,5 uur)
    return 90;
};

window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = document.getElementById('plan-datum').value;
    
    if(!bord || !speelDatum) return;

    let html = '';

    // 1. Tijd-as opbouwen
    html += `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) {
        html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    }
    html += `</div>`;

    // 2. Bepaal aantal velden (Veka = 2, Veste = 1)
    let aantalVelden = locatie === 'veka' ? 2 : 1;
    let veldNamen = locatie === 'veka' ? ['Veld 1', 'Veld 2'] : ['De Veste Hoofdveld'];

    // 3. Bouw de veld-kolommen en hun grid-lijntjes (per 15/30/60m)
    for(let v = 0; v < aantalVelden; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) {
            // 4 streepjes per uur (00, 15, 30, 45)
            gridLijnenHtml += `
                <div class="grid-lijn-15m"></div>
                <div class="grid-lijn-30m"></div>
                <div class="grid-lijn-15m"></div>
                <div class="grid-lijn-60m"></div>
            `;
        }
        gridLijnenHtml += `</div>`;

        // De dropzone krijgt ondragover en ondrop events!
        html += `
            <div class="veld-kolom" id="veld-kolom-${v+1}" 
                 ondragover="window.onDragOver(event)" 
                 ondrop="window.onDropVeld(event, ${v+1})"
                 ondragenter="this.classList.add('dropzone-highlight')" 
                 ondragleave="this.classList.remove('dropzone-highlight')">
                <div class="veld-header">${veldNamen[v]}</div>
                ${gridLijnenHtml}
                <div id="wedstrijd-container-${v+1}" style="position:absolute; top:42px; left:0; right:0; bottom:0; pointer-events:none;">
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
    
    // Maak eerst de wachtkamer schoon (behalve de header en melding)
    Array.from(container.children).forEach(child => {
        if (!child.classList.contains('wachtkamer-header') && child.id !== 'wachtkamer-leeg') {
            child.remove();
        }
    });

    let dagWedstrijden = window.nbbWedstrijden.filter(w => {
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

    // Sorteer even netjes op originele NBB tijd
    dagWedstrijden.sort((a,b) => (a.Tijd || '00:00').localeCompare(b.Tijd || '00:00'));

    dagWedstrijden.forEach((w) => {
        let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
        let tegenstander = w.Uitteam || 'Tegenstander';
        let uniekId = `match-${w.Wedstrijdnummer || Date.now() + Math.random()}`;
        
        let duurMinuten = window.bepaalWedstrijdDuur(wedstrijdNaam);

        // Oorspronkelijke tijd of "Te bepalen"
        let tijdWeergave = w.Status === 'Te plannen' ? 'N.t.b.' : w.Tijd.substring(0,5);

        // Blokje aanmaken. State begint als 'relatief' in de zijbalk
        let html = `
            <div class="wedstrijd-blok" id="${uniekId}" draggable="true" 
                 ondragstart="window.onDragStart(event)" 
                 ondragend="window.onDragEnd(event)"
                 data-duur="${duurMinuten}"
                 style="position: relative; height: ${duurMinuten}px; pointer-events: auto;">
                <div class="wb-titel">🏀 ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${tegenstander}</span></div>
                <div class="wb-meta">
                    <span class="wb-tijd-badge" id="tijd-label-${uniekId}">⏱️ ${tijdWeergave}</span> 
                    | NBB: ${w.Wedstrijdnummer || '?'}
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
    
    // Kleine delay zorgt dat het spook-element goed meesleept
    setTimeout(() => {
        e.target.classList.add('is-dragging');
    }, 10);
};

window.onDragEnd = function(e) {
    e.target.classList.remove('is-dragging');
    window.draggedMatchId = null;
    document.querySelectorAll('.dropzone-highlight').forEach(el => el.classList.remove('dropzone-highlight'));
};

window.onDragOver = function(e) {
    e.preventDefault(); // Nodig om een drop toe te staan
    e.dataTransfer.dropEffect = 'move';
};

// Drop actie op het PLANBORD (Veld 1 of 2)
window.onDropVeld = function(e, veldIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove('dropzone-highlight');
    
    let matchId = window.draggedMatchId;
    if (!matchId) return;
    
    let matchEl = document.getElementById(matchId);
    let targetContainer = document.getElementById(`wedstrijd-container-${veldIndex}`);
    
    // 1. Bereken de Y-positie van de muis binnen de veld-kolom (compenseer voor de header 42px)
    let rect = e.currentTarget.getBoundingClientRect();
    let dropY = e.clientY - rect.top - 42; 
    
    // 2. SNAP naar de dichtstbijzijnde 15 minuten (15 pixels)
    let snapY = Math.round(dropY / SNAP_MINUTEN) * SNAP_MINUTEN;
    if (snapY < 0) snapY = 0; // Niet boven 08:00 uit komen
    
    // 3. Bereken de nieuwe starttijd (Elke pixel = 1 minuut vanaf START_UUR)
    let uren = Math.floor(snapY / 60) + START_UUR;
    let minuten = snapY % 60;
    let nieuweTijd = String(uren).padStart(2, '0') + ':' + String(minuten).padStart(2, '0');
    
    // 4. Update de visual en verplaats het element!
    matchEl.style.position = 'absolute';
    matchEl.style.top = snapY + 'px';
    matchEl.style.left = '5px';
    matchEl.style.right = '5px';
    matchEl.style.width = 'auto'; // Reset width if it came from sidebar
    
    document.getElementById(`tijd-label-${matchId}`).innerText = `⏱️ ${nieuweTijd}`;
    document.getElementById(`tijd-label-${matchId}`).style.background = '#27ae60'; // Maak groen als indicatie 'gepland'
    
    targetContainer.appendChild(matchEl);
    window.updateWachtkamerTeller();
};

// Drop actie terug in de WACHTKAMER
window.onDropTePlannen = function(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dropzone-highlight');

    let matchId = window.draggedMatchId;
    if (!matchId) return;
    
    let matchEl = document.getElementById(matchId);
    let wachtkamer = document.getElementById('te-plannen-container');
    
    // 1. Reset alle absolute posities zodat hij weer in de lijst flowt
    matchEl.style.position = 'relative';
    matchEl.style.top = 'auto';
    matchEl.style.left = 'auto';
    matchEl.style.right = 'auto';
    
    document.getElementById(`tijd-label-${matchId}`).innerText = `⏱️ Te plannen`;
    document.getElementById(`tijd-label-${matchId}`).style.background = '#e74c3c'; // Rood voor ongepland
    
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