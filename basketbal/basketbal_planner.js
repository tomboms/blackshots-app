// --- BASKETBAL_PLANNER.JS: MET TOOLTIPS EN NIEUWE REGELS ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.beschikbaarheidDB = JSON.parse(localStorage.getItem('blackshots_beschikbaarheid')) || {};

window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {}; 

const START_UUR = 9; 
const EIND_UUR = 22; 
const PIXEL_SCALE = 2; 
const SNAP_MINUTEN = 15; 

// ============================================================================
// ☁️ FIREBASE CLOUD MOTOR
// ============================================================================
window.slaPlannerDataOp = function() {
    localStorage.setItem('blackshots_wedstrijd_taken', JSON.stringify(window.takenDB));
    localStorage.setItem('blackshots_plan_status', JSON.stringify(window.planStatusDB));
    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));

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
    window.laadPlanbord();
};

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
        window.teamsDB.forEach(t => { teamSelect.innerHTML += `<option value="${t.naam}">${t.naam}</option>`; });
    }
    window.laadPlanbord();
};

window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = teamNaam.toUpperCase();
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || 
        naam.includes('20') || naam.includes('22') || naam.includes('SE')) return 105;
    return 90; 
};

window.tijdNaarMinuten = function(tijdStr) {
    if (!tijdStr || tijdStr.includes('Te plannen') || tijdStr.includes('N.t.b.')) return 0;
    let parts = tijdStr.split(':');
    return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
};

// ============================================================================
// 🚨 UITGEBREIDE CONFLICT ENGINE (MET UITLEG)
// ============================================================================
window.checkConflicten = function(taakPersoon, matchStartMin, matchEindMin, speelDatum, alleDaggeplande, huidigeMatchId, alleTakenHuidigeMatch) {
    // Dit object slaat de status op en een lijstje met uitleg (om te tonen bij hover)
    let resultaat = { status: 'groen', berichten: [] };

    if (!taakPersoon || taakPersoon === "" || taakPersoon === "Vrij") return resultaat;

    // CHECK 1: Dubbel in dezelfde wedstrijd
    let countInMatch = 0;
    if(alleTakenHuidigeMatch.sA === taakPersoon) countInMatch++;
    if(alleTakenHuidigeMatch.sB === taakPersoon) countInMatch++;
    if(alleTakenHuidigeMatch.tab === taakPersoon) countInMatch++;
    if(alleTakenHuidigeMatch.sco === taakPersoon) countInMatch++;
    if(countInMatch > 1) {
        resultaat.status = 'rood';
        resultaat.berichten.push("Dubbel ingedeeld bij deze wedstrijd!");
    }

    // CHECK 2: Afwezig in Matrix
    let sr = window.scheidsrechtersDB.find(s => s.naam === taakPersoon);
    if (sr) {
        let status = window.beschikbaarheidDB[`${sr.id}_${speelDatum}`];
        if (status === 'af') {
            resultaat.status = 'rood';
            resultaat.berichten.push(`${taakPersoon} is Afwezig volgens het rooster.`);
        }
    }

    // CHECK 3: X10/X12 waarschuwing (Zachte regel)
    if (taakPersoon.toUpperCase().includes('X10') || taakPersoon.toUpperCase().includes('X12')) {
        // Als je niet specifiek 'Ouders' hebt getypt, geven we een oranje waarschuwing
        if (!taakPersoon.toLowerCase().includes('ouders')) {
            if (resultaat.status !== 'rood') resultaat.status = 'oranje';
            resultaat.berichten.push("Let op: Spelers uit X10/X12 tafelen/fluiten normaal gesproken niet zelf. Gebruik 'Ouders X10'.");
        }
    }

    // CHECK 4: Overlap met andere wedstrijden
    alleDaggeplande.forEach(andereMatch => {
        let aStart = window.tijdNaarMinuten(andereMatch.geplandeTijd);
        if (aStart === 0) return;
        let aEind = aStart + andereMatch.duur;

        // Is er een tijds-overlap met een andere wedstrijd?
        if (matchStartMin < aEind && matchEindMin > aStart) {
            
            // A. Heeft deze persoon al een andere taak op dit moment?
            if (andereMatch.uniekId !== huidigeMatchId) {
                let andereTaken = window.takenDB[andereMatch.uniekId] || {};
                if (andereTaken.sA === taakPersoon || andereTaken.sB === taakPersoon || 
                    andereTaken.tab === taakPersoon || andereTaken.sco === taakPersoon) {
                    resultaat.status = 'rood';
                    resultaat.berichten.push(`${taakPersoon} is al ingedeeld bij ${andereMatch.Thuisteam.replace('Black Shots ', '')}.`);
                }
            }

            let anderThuisteam = andereMatch.Thuisteam.replace('Black Shots ', '').trim();
            
            // B. Speelt het TEAM dat als taak is ingedeeld zelf een wedstrijd?
            if (taakPersoon === anderThuisteam || taakPersoon.includes(anderThuisteam)) {
                resultaat.status = 'rood';
                resultaat.berichten.push(`Team ${taakPersoon} speelt op dit tijdstip zelf!`);
            }

            // C. Speelt het GEKOPPELDE TEAM van de scheidsrechter een wedstrijd?
            if (sr && sr.gekoppeldTeam && sr.gekoppeldTeam === anderThuisteam) {
                resultaat.status = 'rood';
                resultaat.berichten.push(`${taakPersoon} speelt op dit moment zelf met ${sr.gekoppeldTeam}.`);
            }

            // D. Coach check! We checken of de persoon de Coach is van het team dat nu op het veld staat.
            let spelendTeamDb = window.teamsDB.find(t => t.naam === anderThuisteam);
            if (spelendTeamDb && spelendTeamDb.coach && spelendTeamDb.coach.includes(taakPersoon)) {
                resultaat.status = 'rood';
                resultaat.berichten.push(`${taakPersoon} is aan het coachen bij ${anderThuisteam}.`);
            }
        }
    });

    return resultaat;
};


// ============================================================================
// 📋 TAKEN TOEWIJZEN MODAL
// ============================================================================
window.genereerDropdownOpties = function(huidigeWaarde) {
    let html = `<option value="">-- Vrij --</option>`;
    html += `<optgroup label="👨‍⚖️ Scheidsrechters (Matrix)">`;
    window.scheidsrechtersDB.forEach(sr => html += `<option value="${sr.naam}">${sr.naam}</option>`);
    html += `</optgroup><optgroup label="🏀 Club Teams">`;
    window.teamsDB.forEach(t => html += `<option value="${t.naam}">${t.naam}</option>`);
    html += `</optgroup><optgroup label="Overig"><option value="handmatig">✏️ Handmatig typen...</option></optgroup>`;

    let bekende = window.scheidsrechtersDB.map(s => s.naam).concat(window.teamsDB.map(t => t.naam));
    if (huidigeWaarde && huidigeWaarde !== "" && !bekende.includes(huidigeWaarde)) {
        html += `<option value="${huidigeWaarde}" style="display:none;">${huidigeWaarde}</option>`;
    }
    return html;
};

window.openTakenModal = function(matchId) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => {
        let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam+w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        return (w.id || `match-${clean}`) === matchId;
    });

    if (!match) return;
    document.getElementById('taak-match-id').value = matchId;
    document.getElementById('taak-match-titel').innerText = `🏀 ${match.Thuisteam.replace('Black Shots ', '')} vs ${match.Uitteam}`;
    
    let dbStatus = window.planStatusDB[matchId];
    document.getElementById('taak-match-meta').innerText = `Tijdstip: ${dbStatus ? dbStatus.tijd : 'Te plannen'} | NBB: ${match.Wedstrijdnummer || 'Custom'}`;

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
        let invoer = prompt("Typ de handmatige toewijzing:");
        if (invoer && invoer.trim() !== "") {
            let nwOption = document.createElement('option');
            nwOption.value = invoer.trim(); nwOption.text = invoer.trim();
            selectElement.add(nwOption); selectElement.value = invoer.trim();
        } else selectElement.value = ""; 
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
// 🎨 BORD RENDERING MET TOOLTIPS
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

    let geplandeDataLijst = [];
    dagWedstrijden.forEach(w => {
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam+w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        let uniekId = w.id || `match-${cleanNummer}`;
        let dbStatus = window.planStatusDB[uniekId];
        if (dbStatus) {
            let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
            geplandeDataLijst.push({
                uniekId: uniekId,
                Thuisteam: w.Thuisteam,
                geplandeTijd: dbStatus.tijd,
                duur: w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam)
            });
        }
    });

    dagWedstrijden.forEach((w) => {
        let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim() || 'Onbekend Team';
        let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam+w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
        let uniekId = w.id || `match-${cleanNummer}`;
        
        let duurMinuten = w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);
        let pixelHoogte = duurMinuten * PIXEL_SCALE;

        let dbStatus = window.planStatusDB[uniekId];
        let startMinuten = dbStatus ? window.tijdNaarMinuten(dbStatus.tijd) : 0;
        let topPixels = dbStatus ? ((startMinuten - (START_UUR * 60)) * PIXEL_SCALE) : 0; 
        
        let doelContainerId = dbStatus ? `wedstrijd-container-${dbStatus.veld}` : 'te-plannen-container';
        let cssPositie = dbStatus ? `position: absolute; top: ${topPixels}px; left: 5px; right: 5px; width: auto;` : `position: relative;`;
        
        let tijdWeergave = dbStatus ? dbStatus.tijd : 'Te plannen';
        let taken = window.takenDB[uniekId] || { sA: "", sB: "", tab: "", sco: "" };

        // --- CONFLICT CHECKER MET UITLEG ---
        let aantalConflicten = 0;
        let checkTaak = (naam) => {
            let conflictObj = dbStatus ? window.checkConflicten(naam, startMinuten, startMinuten + duurMinuten, datum, geplandeDataLijst, uniekId, taken) : { status: 'groen', berichten: [] };
            
            let cssTaak = naam ? "taak-gevuld" : "";
            let cssTekst = "";
            let icoon = "";
            let tooltip = "";

            if (conflictObj.status === 'rood') {
                cssTaak = "conflict-taak"; cssTekst = "conflict-text"; icoon = "🔴";
                tooltip = conflictObj.berichten.join(' | ');
                aantalConflicten++;
            } else if (conflictObj.status === 'oranje') {
                cssTaak = "warning-taak"; cssTekst = "warning-text"; icoon = "🟠";
                tooltip = conflictObj.berichten.join(' | ');
            }

            return { tekst: naam ? naam : "Vrij", cssTaak: cssTaak, cssTekst: cssTekst, icoon: icoon, tooltip: tooltip };
        };

        let tA = checkTaak(taken.sA);
        let tB = checkTaak(taken.sB);
        let tTab = checkTaak(taken.tab);
        let tSco = checkTaak(taken.sco);

        let conflictBanner = aantalConflicten > 0 ? `<div class="conflict-banner">⚠️ ${aantalConflicten} Conflict(en) Gedetecteerd!</div>` : '';
        let typeBadge = (w.id && w.id.includes('custom')) ? `<span style="background:#8e44ad; color:white; padding:1px 4px; border-radius:3px; font-size:0.65rem;">${w.Wedstrijdnummer}</span>` : '';
        let deleteBtn = (w.id && w.id.includes('custom')) ? `<button onmousedown="event.stopPropagation();" onclick="window.verwijderCustomWedstrijd('${uniekId}')" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:0; margin-left:auto;">🗑️</button>` : '';

        // Let op het title="" attribuut. Hier stoppen we de uitleg in!
        let html = `
            <div class="wedstrijd-blok" id="${uniekId}" draggable="true" ondragstart="window.onDragStart(event)" ondragend="window.onDragEnd(event)" style="${cssPositie} height: ${pixelHoogte}px;">
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
// 🖱️ DRAG & DROP & HANDMATIG REKENEN
// ============================================================================
window.wijzigTijdHandmatig = function(id) {
    let labelEl = document.getElementById(`tijd-label-${id}`);
    let huidigeTijd = labelEl.innerText.replace('⏱️', '').trim();
    let suggestie = (huidigeTijd === 'Te plannen' || huidigeTijd === 'N.t.b.') ? '12:00' : huidigeTijd;
    
    let nweTijd = prompt("Voer de starttijd in (UU:MM), of laat leeg om hem terug naar de wachtkamer te sturen:", suggestie);
    if (nweTijd === null) return; 

    if (nweTijd.trim() === "") {
        delete window.planStatusDB[id]; 
        window.slaPlannerDataOp(); window.laadPlanbord(); return;
    }

    if (!/^\d{1,2}:\d{2}$/.test(nweTijd)) return alert("Ongeldig formaat. Gebruik UU:MM");

    let parts = nweTijd.split(':');
    let uren = parseInt(parts[0]);
    if (uren < START_UUR || uren >= EIND_UUR) return alert(`Tijd moet tussen ${START_UUR}:00 en ${EIND_UUR}:00 liggen.`);

    let huidigVeld = window.planStatusDB[id] ? window.planStatusDB[id].veld : 1;
    window.planStatusDB[id] = { veld: huidigVeld, tijd: nweTijd };
    window.slaPlannerDataOp(); window.laadPlanbord();
};

window.draggedMatchId = null;
window.onDragStart = function(e) { window.draggedMatchId = e.target.id; e.dataTransfer.setData('text/plain', e.target.id); setTimeout(() => { e.target.classList.add('is-dragging'); }, 10); };
window.onDragEnd = function(e) { e.target.classList.remove('is-dragging'); window.draggedMatchId = null; };
window.onDragOver = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

window.onDropVeld = function(e, veldIndex) {
    e.preventDefault();
    if (!window.draggedMatchId) return;
    
    let rect = e.currentTarget.getBoundingClientRect();
    let dropY = e.clientY - rect.top - 42; 
    
    let dropMinuten = dropY / PIXEL_SCALE;
    let snapMinuten = Math.round(dropMinuten / SNAP_MINUTEN) * SNAP_MINUTEN;
    if (snapMinuten < 0) snapMinuten = 0; 
    
    let uren = Math.floor(snapMinuten / 60) + START_UUR;
    let minuten = snapMinuten % 60;
    let nieuweTijd = String(uren).padStart(2, '0') + ':' + String(minuten).padStart(2, '0');
    
    window.planStatusDB[window.draggedMatchId] = { veld: veldIndex, tijd: nieuweTijd };
    window.slaPlannerDataOp(); window.laadPlanbord();
};

window.onDropTePlannen = function(e) {
    e.preventDefault();
    if (!window.draggedMatchId) return;
    delete window.planStatusDB[window.draggedMatchId];
    window.slaPlannerDataOp(); window.laadPlanbord();
};

// ============================================================================
// 🤖 HANDMATIGE WEDSTRIJDEN MODAL
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
    window.slaPlannerDataOp(); window.laadPlanbord(); 
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