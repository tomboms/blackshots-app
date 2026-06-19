// --- BASKETBAL_PLANNER.JS: MET CLUBREGELS EN TELLER ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.beschikbaarheidDB = JSON.parse(localStorage.getItem('blackshots_beschikbaarheid')) || {};

window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {}; 
// NIEUW: Database voor de volgorde regels
window.clubRegelsDB = JSON.parse(localStorage.getItem('blackshots_clubregels')) || [];

const START_UUR = 9; 
const EIND_UUR = 22; 
const PIXEL_SCALE = 2; 
const SNAP_MINUTEN = 15; 

// ============================================================================
// ☁️ CLOUD SYNC
// ============================================================================
window.slaPlannerDataOp = function() {
    localStorage.setItem('blackshots_wedstrijd_taken', JSON.stringify(window.takenDB));
    localStorage.setItem('blackshots_plan_status', JSON.stringify(window.planStatusDB));
    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));
    localStorage.setItem('blackshots_clubregels', JSON.stringify(window.clubRegelsDB));

    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_wedstrijd_taken', window.takenDB);
        window.opslaanInFirebase('blackshots_plan_status', window.planStatusDB);
        window.opslaanInFirebase('blackshots_clubregels', window.clubRegelsDB);
    }
};

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    if (sleutel === 'blackshots_clubregels') window.clubRegelsDB = data;
    window.laadPlanbord();
};

window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let vandaag = new Date();
    let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    datumInput.value = vandaag.toISOString().split('T')[0];
    
    // Vul alle team dropdowns
    let opts = '<option value="">-- Selecteer team --</option>';
    window.teamsDB.forEach(t => { opts += `<option value="${t.naam}">${t.naam}</option>`; });
    
    if(document.getElementById('nw-match-team')) document.getElementById('nw-match-team').innerHTML = opts;
    if(document.getElementById('regel-team-voor')) document.getElementById('regel-team-voor').innerHTML = opts;
    if(document.getElementById('regel-team-na')) document.getElementById('regel-team-na').innerHTML = opts;

    window.laadPlanbord();
};

window.tijdNaarMinuten = function(tijdStr) {
    if (!tijdStr || tijdStr.includes('Te plannen') || tijdStr.includes('N.t.b.')) return 0;
    let parts = tijdStr.split(':');
    return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
};

// ============================================================================
// 📜 CLUBREGELS (VOLGORDE)
// ============================================================================
window.openRegelsModal = function() {
    window.renderRegelsLijst();
    document.getElementById('regels-modal').style.display = 'flex';
};

window.voegRegelToe = function() {
    let voor = document.getElementById('regel-team-voor').value;
    let na = document.getElementById('regel-team-na').value;
    if (!voor || !na) return alert("Selecteer beide teams.");
    if (voor === na) return alert("Een team kan niet voor zichzelf spelen.");

    window.clubRegelsDB.push({ id: 'regel_' + Date.now(), teamVoor: voor, teamNa: na });
    window.slaPlannerDataOp();
    window.renderRegelsLijst();
    window.laadPlanbord(); // Herlaad bord om waarschuwingen te checken
};

window.verwijderRegel = function(id) {
    window.clubRegelsDB = window.clubRegelsDB.filter(r => r.id !== id);
    window.slaPlannerDataOp();
    window.renderRegelsLijst();
    window.laadPlanbord();
};

window.renderRegelsLijst = function() {
    let lijst = document.getElementById('huidige-regels-lijst');
    if(window.clubRegelsDB.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.8rem;">Geen actieve regels.</p>';
        return;
    }
    let html = '';
    window.clubRegelsDB.forEach(r => {
        html += `<div style="background:#eef2f5; padding:8px 12px; border-radius:4px; border-left:3px solid #8e44ad; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
            <span><strong>${r.teamVoor}</strong> moet vóór <strong>${r.teamNa}</strong></span>
            <button onclick="window.verwijderRegel('${r.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;">🗑️</button>
        </div>`;
    });
    lijst.innerHTML = html;
};

// ============================================================================
// 🚨 CONFLICT ENGINE (TAKEN)
// ============================================================================
window.checkConflicten = function(taakPersoon, matchStartMin, matchEindMin, speelDatum, alleDaggeplande, huidigeMatchId, alleTakenHuidigeMatch) {
    let resultaat = { status: 'groen', berichten: [] };
    if (!taakPersoon || taakPersoon === "" || taakPersoon === "Vrij") return resultaat;

    let countInMatch = 0;
    if(alleTakenHuidigeMatch.sA === taakPersoon) countInMatch++;
    if(alleTakenHuidigeMatch.sB === taakPersoon) countInMatch++;
    if(alleTakenHuidigeMatch.tab === taakPersoon) countInMatch++;
    if(alleTakenHuidigeMatch.sco === taakPersoon) countInMatch++;
    if(countInMatch > 1) { resultaat.status = 'rood'; resultaat.berichten.push("Dubbel in deze wedstrijd!"); }

    let sr = window.scheidsrechtersDB.find(s => s.naam === taakPersoon);
    if (sr && window.beschikbaarheidDB[`${sr.id}_${speelDatum}`] === 'af') {
        resultaat.status = 'rood'; resultaat.berichten.push("Afwezig volgens rooster.");
    }

    if ((taakPersoon.toUpperCase().includes('X10') || taakPersoon.toUpperCase().includes('X12')) && !taakPersoon.toLowerCase().includes('ouders')) {
        if (resultaat.status !== 'rood') resultaat.status = 'oranje';
        resultaat.berichten.push("X10/X12 tafelen/fluiten niet zelf. Gebruik 'Ouders X10'.");
    }

    alleDaggeplande.forEach(andereMatch => {
        let aStart = window.tijdNaarMinuten(andereMatch.geplandeTijd);
        if (aStart === 0) return;
        let aEind = aStart + andereMatch.duur;

        if (matchStartMin < aEind && matchEindMin > aStart) {
            if (andereMatch.uniekId !== huidigeMatchId) {
                let andereTaken = window.takenDB[andereMatch.uniekId] || {};
                if (Object.values(andereTaken).includes(taakPersoon)) {
                    resultaat.status = 'rood'; resultaat.berichten.push(`Al ingedeeld bij andere wedstrijd.`);
                }
            }
            let anderThuisteam = andereMatch.Thuisteam.replace('Black Shots ', '').trim();
            if (taakPersoon === anderThuisteam || taakPersoon.includes(anderThuisteam)) {
                resultaat.status = 'rood'; resultaat.berichten.push(`Dit team speelt zelf!`);
            }
            if (sr && sr.gekoppeldTeam && sr.gekoppeldTeam === anderThuisteam) {
                resultaat.status = 'rood'; resultaat.berichten.push(`Speelt nu zelf bij ${sr.gekoppeldTeam}.`);
            }
            let spelendTeamDb = window.teamsDB.find(t => t.naam === anderThuisteam);
            if (spelendTeamDb && spelendTeamDb.coach && spelendTeamDb.coach.includes(taakPersoon)) {
                resultaat.status = 'rood'; resultaat.berichten.push(`Is aan het coachen.`);
            }
        }
    });

    return resultaat;
};

// ============================================================================
// 📊 TELLER BEREKENEN
// ============================================================================
window.werkTellerBij = function(dagWedstrijden) {
    let counts = {};
    
    // Loop over alle wedstrijden van VANDAAG
    dagWedstrijden.forEach(w => {
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam+w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        let uniekId = w.id || `match-${cleanNummer}`;
        let taken = window.takenDB[uniekId] || {};
        
        let aanwezigeTaken = [taken.sA, taken.sB, taken.tab, taken.sco];
        aanwezigeTaken.forEach(persoonOfTeam => {
            if (persoonOfTeam && persoonOfTeam.trim() !== "" && persoonOfTeam !== "Vrij") {
                counts[persoonOfTeam] = (counts[persoonOfTeam] || 0) + 1;
            }
        });
    });

    // Sorteer op aantal (hoogste eerst)
    let gesorteerd = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    
    let lijstContainer = document.getElementById('teller-lijst-container');
    if (!lijstContainer) return;

    if (gesorteerd.length === 0) {
        lijstContainer.innerHTML = '<div style="color:#7f8c8d; font-size:0.8rem; text-align:center;">Nog geen taken toegewezen vandaag.</div>';
        return;
    }

    let html = '';
    gesorteerd.forEach(naam => {
        html += `<div class="teller-item"><span>${naam}</span> <strong>${counts[naam]}</strong></div>`;
    });
    lijstContainer.innerHTML = html;
};

// ============================================================================
// 🎨 BORD RENDERING MET CLUBREGELS
// ============================================================================
window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = document.getElementById('plan-datum').value;
    if(!bord || !speelDatum) return;

    let html = `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    html += `</div>`;

    let aantalVelden = locatie === 'veka' ? 2 : 1;
    let veldNamen = locatie === 'veka' ? ['Veld 1', 'Veld 2'] : ['De Veste Hoofdveld'];

    for(let v = 0; v < aantalVelden; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) gridLijnenHtml += `<div class="grid-lijn-15m"></div><div class="grid-lijn-30m"></div><div class="grid-lijn-15m"></div><div class="grid-lijn-60m"></div>`;
        gridLijnenHtml += `</div>`;
        html += `<div class="veld-kolom" id="veld-kolom-${v+1}" ondragover="window.onDragOver(event)" ondrop="window.onDropVeld(event, ${v+1})">
                    <div class="veld-header">${veldNamen[v]}</div>
                    ${gridLijnenHtml}
                    <div id="wedstrijd-container-${v+1}" style="position:absolute; top:42px; left:0; right:0; bottom:0;"></div>
                 </div>`;
    }
    bord.innerHTML = html;
    window.plaatsWedstrijdenInWachtkamer(speelDatum);
};

window.plaatsWedstrijdenInWachtkamer = function(datum) {
    let container = document.getElementById('te-plannen-container');
    Array.from(container.children).forEach(child => { if (!child.classList.contains('wachtkamer-header') && child.id !== 'wachtkamer-leeg') child.remove(); });

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => (w.Datum === datum || w.Datum.includes(datum)) && (w.Thuisteam || '').toLowerCase().includes('black shots'));

    document.getElementById('aantal-te-plannen').innerText = dagWedstrijden.length;
    document.getElementById('wachtkamer-leeg').style.display = dagWedstrijden.length === 0 ? 'block' : 'none';

    // Werk de live Teller bij!
    window.werkTellerBij(dagWedstrijden);

    // VOORBEREIDING 1: Geplande Data voor Overlap Checks
    let geplandeDataLijst = [];
    // VOORBEREIDING 2: Lookup map voor de Clubregels (Team A voor B)
    let teamStartTijden = {}; 

    dagWedstrijden.forEach(w => {
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam+w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        let uniekId = w.id || `match-${cleanNummer}`;
        let dbStatus = window.planStatusDB[uniekId];
        let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
        let startMin = dbStatus ? window.tijdNaarMinuten(dbStatus.tijd) : 0;
        
        if (dbStatus) {
            geplandeDataLijst.push({
                uniekId: uniekId, Thuisteam: w.Thuisteam, geplandeTijd: dbStatus.tijd,
                duur: w.handmatigeDuur ? w.handmatigeDuur : 90 // fallback
            });
            teamStartTijden[wedstrijdNaam] = startMin; 
        }
    });

    dagWedstrijden.forEach((w) => {
        let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam+w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        let uniekId = w.id || `match-${cleanNummer}`;
        
        let berekendeDuur = 90;
        if (wedstrijdNaam.includes('14') || wedstrijdNaam.includes('16') || wedstrijdNaam.includes('18') || wedstrijdNaam.includes('20') || wedstrijdNaam.includes('22') || wedstrijdNaam.includes('SE')) berekendeDuur = 105;
        let duurMinuten = w.handmatigeDuur ? w.handmatigeDuur : berekendeDuur;
        let pixelHoogte = duurMinuten * PIXEL_SCALE;

        let dbStatus = window.planStatusDB[uniekId];
        let startMinuten = dbStatus ? window.tijdNaarMinuten(dbStatus.tijd) : 0;
        let topPixels = dbStatus ? ((startMinuten - (START_UUR * 60)) * PIXEL_SCALE) : 0; 
        
        let cssPositie = dbStatus ? `position: absolute; top: ${topPixels}px; left: 5px; right: 5px; width: auto;` : `position: relative;`;
        let tijdWeergave = dbStatus ? dbStatus.tijd : 'Te plannen';
        let taken = window.takenDB[uniekId] || { sA: "", sB: "", tab: "", sco: "" };

        // --- CHECK CLUBREGELS (VOLGORDE) ---
        let regelBanners = [];
        if (dbStatus) { // Alleen checken als hij op het bord staat
            window.clubRegelsDB.forEach(regel => {
                // Als DIT team het "Team Voor" is, en het "Team Na" is OOK gepland, check tijd
                if (regel.teamVoor === wedstrijdNaam && teamStartTijden[regel.teamNa]) {
                    if (startMinuten >= teamStartTijden[regel.teamNa]) {
                        regelBanners.push(`Let op: Moet vóór ${regel.teamNa} spelen!`);
                    }
                }
                // Als DIT team het "Team Na" is, en het "Team Voor" is OOK gepland, check tijd
                if (regel.teamNa === wedstrijdNaam && teamStartTijden[regel.teamVoor]) {
                    if (startMinuten <= teamStartTijden[regel.teamVoor]) {
                        regelBanners.push(`Let op: Moet ná ${regel.teamVoor} spelen!`);
                    }
                }
            });
        }
        let clubRegelHtml = regelBanners.map(msg => `<div class="regel-banner">🟪 ${msg}</div>`).join('');

        let aantalConflicten = 0;
        let checkTaak = (naam) => {
            let conflictObj = dbStatus ? window.checkConflicten(naam, startMinuten, startMinuten + duurMinuten, datum, geplandeDataLijst, uniekId, taken) : { status: 'groen', berichten: [] };
            let cssTaak = naam ? "taak-gevuld" : ""; let cssTekst = ""; let icoon = ""; let tooltip = "";

            if (conflictObj.status === 'rood') {
                cssTaak = "conflict-taak"; cssTekst = "conflict-text"; icoon = "🔴";
                tooltip = conflictObj.berichten.join(' | '); aantalConflicten++;
            } else if (conflictObj.status === 'oranje') {
                cssTaak = "warning-taak"; cssTekst = "warning-text"; icoon = "🟠";
                tooltip = conflictObj.berichten.join(' | ');
            }
            return { tekst: naam ? naam : "Vrij", cssTaak: cssTaak, cssTekst: cssTekst, icoon: icoon, tooltip: tooltip };
        };

        let tA = checkTaak(taken.sA); let tB = checkTaak(taken.sB); let tTab = checkTaak(taken.tab); let tSco = checkTaak(taken.sco);

        let conflictBanner = aantalConflicten > 0 ? `<div class="conflict-banner">⚠️ ${aantalConflicten} Taak Conflict(en)!</div>` : '';
        let typeBadge = (w.id && w.id.includes('custom')) ? `<span style="background:#8e44ad; color:white; padding:1px 4px; border-radius:3px; font-size:0.65rem;">${w.Wedstrijdnummer}</span>` : '';
        let deleteBtn = (w.id && w.id.includes('custom')) ? `<button onmousedown="event.stopPropagation();" onclick="window.verwijderCustomWedstrijd('${uniekId}')" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:0; margin-left:auto;">🗑️</button>` : '';

        let html = `
            <div class="wedstrijd-blok" id="${uniekId}" draggable="true" ondragstart="window.onDragStart(event)" ondragend="window.onDragEnd(event)" style="${cssPositie} height: ${pixelHoogte}px;">
                ${clubRegelHtml}
                ${conflictBanner}
                <div class="wb-titel"><span>🏀 ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${w.Uitteam}</span></span>${deleteBtn}</div>
                <div class="wb-meta">
                    <span class="wb-tijd-badge" id="tijd-label-${uniekId}" onmousedown="event.stopPropagation();" onclick="window.wijzigTijdHandmatig('${uniekId}')" style="background:${dbStatus ? '#27ae60' : '#e67e22'};">⏱️ ${tijdWeergave}</span> 
                    <span>| NBB: ${w.Wedstrijdnummer || '?'} ${typeBadge}</span>
                </div>
                <div class="wb-taken" onclick="window.openTakenModal('${uniekId}')">
                    <div style="display:flex; gap:5px;">
                        <div class="taak-regel ${tA.cssTaak}" style="flex:1;" title="${tA.tooltip}"><span class="taak-label">👨‍⚖️ A:</span> <span class="taak-waarde ${tA.cssTekst}">${tA.tekst} ${tA.icoon}</span></div>
                        <div class="taak-regel ${tB.cssTaak}" style="flex:1;" title="${tB.tooltip}"><span class="taak-label">👨‍⚖️ B:</span> <span class="taak-waarde ${tB.cssTekst}">${tB.tekst} ${tB.icoon}</span></div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <div class="taak-regel ${tTab.cssTaak}" style="flex:1;" title="${tTab.tooltip}"><span class="taak-label">💻:</span> <span class="taak-waarde ${tTab.cssTekst}">${tTab.tekst} ${tTab.icoon}</span></div>
                        <div class="taak-regel ${tSco.cssTaak}" style="flex:1;" title="${tSco.tooltip}"><span class="taak-label">⏱️:</span> <span class="taak-waarde ${tSco.cssTekst}">${tSco.tekst} ${tSco.icoon}</span></div>
                    </div>
                </div>
            </div>
        `;
        let targetDiv = document.getElementById(dbStatus ? `wedstrijd-container-${dbStatus.veld}` : 'te-plannen-container');
        if(targetDiv) targetDiv.insertAdjacentHTML('beforeend', html);
    });
};

// ============================================================================
// Modal functies voor Taken en Handmatige Wedstrijden zijn weggelaten in dit blok
// voor de leesbaarheid, maar je laat jouw bestaande modal functies (openTakenModal, etc)
// gewoon lekker staan in het bestand!
// ============================================================================
window.genereerDropdownOpties = function(huidigeWaarde) { /* Jouw bestaande code */ };
window.openTakenModal = function(matchId) { /* Jouw bestaande code */ };
window.checkHandmatigeInvoer = function(selectElement) { /* Jouw bestaande code */ };
window.slaTakenOp = function() { /* Jouw bestaande code */ };
window.wijzigTijdHandmatig = function(id) { /* Jouw bestaande code */ };
window.draggedMatchId = null;
window.onDragStart = function(e) { /* Jouw bestaande code */ };
window.onDragEnd = function(e) { /* Jouw bestaande code */ };
window.onDragOver = function(e) { /* Jouw bestaande code */ };
window.onDropVeld = function(e, veldIndex) { /* Jouw bestaande code */ };
window.onDropTePlannen = function(e) { /* Jouw bestaande code */ };
window.genereerAlleTeams = function() { /* Jouw bestaande code */ };
window.openNieuweWedstrijdModal = function() { /* Jouw bestaande code */ };
window.updateDuurSuggestie = function() { /* Jouw bestaande code */ };
window.slaNieuweWedstrijdOp = function() { /* Jouw bestaande code */ };
window.verwijderCustomWedstrijd = function(id) { /* Jouw bestaande code */ };