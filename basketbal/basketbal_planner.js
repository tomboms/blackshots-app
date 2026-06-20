// --- BASKETBAL_PLANNER.JS: MET DATUM STOFZUIGER ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.beschikbaarheidDB = JSON.parse(localStorage.getItem('blackshots_beschikbaarheid')) || {};

window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {}; 
window.clubRegelsDB = JSON.parse(localStorage.getItem('blackshots_clubregels')) || [];

const START_UUR = 9; 
const EIND_UUR = 22; 
const PIXEL_SCALE = 2; 
const SNAP_MINUTEN = 15; 

// 🧹 DE DATUM STOFZUIGER
window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10); 
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        let delen = str.split('-');
        return `${delen[2]}-${delen[1]}-${delen[0]}`;
    }
    return str;
};

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
        window.opslaanInFirebase('blackshots_custom_wedstrijden', window.customWedstrijden);
        window.opslaanInFirebase('blackshots_clubregels', window.clubRegelsDB);
    } else {
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_wedstrijd_taken', data: window.takenDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_plan_status', data: window.planStatusDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_custom_wedstrijden', data: window.customWedstrijden } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_clubregels', data: window.clubRegelsDB } }));
    }
};

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    if (sleutel === 'blackshots_custom_wedstrijden') window.customWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_clubregels') window.clubRegelsDB = Array.isArray(data) ? data : Object.values(data);
    window.laadPlanbord();
};

window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    
    // Check of we door het dashboard gestuurd zijn
    let opgeslagenDatum = localStorage.getItem('blackshots_actieve_datum');
    if (opgeslagenDatum) {
        datumInput.value = window.normaalDatum(opgeslagenDatum);
        localStorage.removeItem('blackshots_actieve_datum');
    } else {
        let vandaag = new Date();
        let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
        vandaag.setDate(vandaag.getDate() + verschilZaterdag);
        datumInput.value = vandaag.toISOString().split('T')[0];
    }
    
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

window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = teamNaam.toUpperCase();
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || 
        naam.includes('20') || naam.includes('22') || naam.includes('SE')) return 105;
    return 90; 
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
    window.laadPlanbord();
};

window.verwijderRegel = function(id) {
    window.clubRegelsDB = window.clubRegelsDB.filter(r => r.id !== id);
    window.slaPlannerDataOp();
    window.renderRegelsLijst();
    window.laadPlanbord();
};

window.renderRegelsLijst = function() {
    let lijst = document.getElementById('huidige-regels-lijst');
    if(!lijst) return;
    if(window.clubRegelsDB.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-size:0.8rem;">Geen actieve regels.</p>';
        return;
    }
    let html = '';
    window.clubRegelsDB.forEach(r => {
        html += `<div style="background:#eef2f5; padding:8px 12px; border-radius:4px; border-left:3px solid #8e44ad; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; margin-bottom:5px;">
            <span><strong>${r.teamVoor}</strong> moet vóór <strong>${r.teamNa}</strong></span>
            <button onclick="window.verwijderRegel('${r.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer;">🗑️</button>
        </div>`;
    });
    lijst.innerHTML = html;
};

// ============================================================================
// 🚨 CONFLICT ENGINE
// ============================================================================
// ============================================================================
// 🚨 CONFLICT ENGINE (GEPANTSERD)
// ============================================================================
window.checkConflicten = function(taakPersoon, matchStartMin, matchEindMin, speelDatum, alleDaggeplande, huidigeMatchId, alleTakenHuidigeMatch) {
    let resultaat = { status: 'groen', berichten: [] };
    if (!taakPersoon || taakPersoon === "" || taakPersoon === "Vrij") return resultaat;

    let veiligeNaam = String(taakPersoon);
    let isTeam = (window.teamsDB || []).some(t => t && t.naam && veiligeNaam.includes(t.naam)) || veiligeNaam.toLowerCase().includes('ouders');

    if (!isTeam) {
        let countInMatch = 0;
        if(alleTakenHuidigeMatch.sA === taakPersoon) countInMatch++;
        if(alleTakenHuidigeMatch.sB === taakPersoon) countInMatch++;
        if(alleTakenHuidigeMatch.tab === taakPersoon) countInMatch++;
        if(alleTakenHuidigeMatch.sco === taakPersoon) countInMatch++;
        if(countInMatch > 1) { resultaat.status = 'rood'; resultaat.berichten.push("Persoon is dubbel ingedeeld in deze wedstrijd!"); }
    }

    let sr = (window.scheidsrechtersDB || []).find(s => s && s.naam === taakPersoon);
    if (sr && window.beschikbaarheidDB && window.beschikbaarheidDB[`${sr.id}_${speelDatum}`] === 'af') {
        resultaat.status = 'rood'; resultaat.berichten.push("Afwezig volgens rooster.");
    }

    if ((veiligeNaam.toUpperCase().includes('X10') || veiligeNaam.toUpperCase().includes('X12')) && !veiligeNaam.toLowerCase().includes('ouders')) {
        if (resultaat.status !== 'rood') resultaat.status = 'oranje';
        resultaat.berichten.push("X10/X12 tafelen/fluiten niet zelf. Gebruik 'Ouders X10'.");
    }

    (alleDaggeplande || []).forEach(andereMatch => {
        let aStart = window.tijdNaarMinuten(andereMatch.geplandeTijd);
        if (aStart === 0) return;
        let aEind = aStart + andereMatch.duur;

        if (matchStartMin < aEind && matchEindMin > aStart) {
            if (!isTeam && andereMatch.uniekId !== huidigeMatchId) {
                let andereTaken = window.takenDB[andereMatch.uniekId] || {};
                if (Object.values(andereTaken).includes(taakPersoon)) {
                    resultaat.status = 'rood'; resultaat.berichten.push(`Al ingedeeld bij andere wedstrijd.`);
                }
            }
            
            let anderThuisteam = (andereMatch.Thuisteam || '').replace('Black Shots ', '').trim();
            
            if (veiligeNaam === anderThuisteam || veiligeNaam.includes(anderThuisteam)) {
                resultaat.status = 'rood'; resultaat.berichten.push(`Dit team speelt nu zelf!`);
            }
            
            if (sr && sr.gekoppeldTeam && sr.gekoppeldTeam === anderThuisteam) {
                resultaat.status = 'rood'; resultaat.berichten.push(`Speelt nu zelf bij ${sr.gekoppeldTeam}.`);
            }
            
            let spelendTeamDb = (window.teamsDB || []).find(t => t && t.naam === anderThuisteam);
            if (spelendTeamDb && spelendTeamDb.coach && spelendTeamDb.coach.includes(taakPersoon)) {
                resultaat.status = 'rood'; resultaat.berichten.push(`Is aan het coachen bij dit team.`);
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
// 🎨 BORD RENDERING 
// ============================================================================
window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
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
    let schoneDatum = window.normaalDatum(datum);
    let container = document.getElementById('te-plannen-container');
    Array.from(container.children).forEach(child => { if (!child.classList.contains('wachtkamer-header') && child.id !== 'wachtkamer-leeg') child.remove(); });

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => (window.normaalDatum(w.Datum) === schoneDatum) && (w.Thuisteam || '').toLowerCase().includes('black shots'));

    document.getElementById('aantal-te-plannen').innerText = dagWedstrijden.length;
    document.getElementById('wachtkamer-leeg').style.display = dagWedstrijden.length === 0 ? 'block' : 'none';

    window.werkTellerBij(dagWedstrijden);

    let geplandeDataLijst = [];
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
                duur: w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam)
            });
            teamStartTijden[wedstrijdNaam] = startMin; 
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
        
        let cssPositie = dbStatus ? `position: absolute; top: ${topPixels}px; left: 5px; right: 5px; width: auto;` : `position: relative;`;
        let tijdWeergave = dbStatus ? dbStatus.tijd : 'Te plannen';
        let taken = window.takenDB[uniekId] || { sA: "", sB: "", tab: "", sco: "" };

        let regelBanners = [];
        if (dbStatus) { 
            window.clubRegelsDB.forEach(regel => {
                if (regel.teamVoor === wedstrijdNaam && teamStartTijden[regel.teamNa]) {
                    if (startMinuten >= teamStartTijden[regel.teamNa]) regelBanners.push(`Let op: Moet vóór ${regel.teamNa} spelen!`);
                }
                if (regel.teamNa === wedstrijdNaam && teamStartTijden[regel.teamVoor]) {
                    if (startMinuten <= teamStartTijden[regel.teamVoor]) regelBanners.push(`Let op: Moet ná ${regel.teamVoor} spelen!`);
                }
            });
        }
        let clubRegelHtml = regelBanners.map(msg => `<div class="regel-banner">🟪 ${msg}</div>`).join('');

        let aantalConflicten = 0;
        let checkTaak = (naam) => {
            let conflictObj = dbStatus ? window.checkConflicten(naam, startMinuten, startMinuten + duurMinuten, schoneDatum, geplandeDataLijst, uniekId, taken) : { status: 'groen', berichten: [] };
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
// 🤖 HANDMATIGE WEDSTRIJDEN & GENERATOR
// ============================================================================
window.genereerAlleTeams = function() {
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
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
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
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

// ============================================================================
// ⚙️ SMART FILL INSTELLINGEN & ENGINE (V 3.1 VOLLEDIG DYNAMISCH)
// ============================================================================

window.sfSettingsDB = JSON.parse(localStorage.getItem('blackshots_smartfill_settings')) || {
    zelfdeVeld: 150, anderVeld: 130, wachten: 30, niveau: 200, nietThuis: 500, eerlijkheid: 20, 
    srBonus: 150, srTafelStraf: 100, srMaxStraf: 500, oudFluitBonus: 80, oudTafelStraf: 50, voorkeuren: []
};

// 1. OPEN HET INSTELLINGEN MENU
window.openSmartFillSettings = function() {
    let s = window.sfSettingsDB;
    if(document.getElementById('sf-set-zelfde')) document.getElementById('sf-set-zelfde').value = s.zelfdeVeld;
    if(document.getElementById('sf-set-ander')) document.getElementById('sf-set-ander').value = s.anderVeld;
    if(document.getElementById('sf-set-wachten')) document.getElementById('sf-set-wachten').value = s.wachten;
    if(document.getElementById('sf-set-niveau')) document.getElementById('sf-set-niveau').value = s.niveau;
    if(document.getElementById('sf-set-thuis')) document.getElementById('sf-set-thuis').value = s.nietThuis;
    if(document.getElementById('sf-set-eerlijk')) document.getElementById('sf-set-eerlijk').value = s.eerlijkheid;
    
    if(document.getElementById('sf-set-sr-bonus')) document.getElementById('sf-set-sr-bonus').value = s.srBonus || 150;
    if(document.getElementById('sf-set-sr-tafel')) document.getElementById('sf-set-sr-tafel').value = s.srTafelStraf || 100;
    if(document.getElementById('sf-set-sr-max')) document.getElementById('sf-set-sr-max').value = s.srMaxStraf || 500;
    if(document.getElementById('sf-set-oud-fluit')) document.getElementById('sf-set-oud-fluit').value = s.oudFluitBonus || 80;
    if(document.getElementById('sf-set-oud-tafel')) document.getElementById('sf-set-oud-tafel').value = s.oudTafelStraf || 50;

    let opts = '<option value="">-- Kies Team --</option>';
    window.teamsDB.forEach(t => { if(!t.isRecreant && !t.isVrijwilliger) opts += `<option value="${t.naam}">${t.naam}</option>`; });
    if(document.getElementById('sf-voorkeur-team')) document.getElementById('sf-voorkeur-team').innerHTML = opts;

    window.renderSfVoorkeuren();
    if(document.getElementById('smart-fill-settings-modal')) document.getElementById('smart-fill-settings-modal').style.display = 'flex';
};

// 2. RENDER DE LIJST MET VOORKEUREN (Bv. M22 wil Vóór)
window.renderSfVoorkeuren = function() {
    let lijst = document.getElementById('sf-voorkeuren-lijst');
    if(!lijst) return;
    if (!window.sfSettingsDB.voorkeuren || window.sfSettingsDB.voorkeuren.length === 0) {
        lijst.innerHTML = '<span style="color:#7f8c8d; font-style:italic;">Geen teamvoorkeuren ingesteld.</span>'; return;
    }
    let html = '';
    window.sfSettingsDB.voorkeuren.forEach((v, index) => {
        let tekst = v.type === 'voor' ? 'vóór hun eigen wedstrijd' : 'ná hun eigen wedstrijd';
        html += `<div style="display:flex; justify-content:space-between; background:#eef2f5; padding:5px 10px; border-radius:4px; margin-bottom: 5px;">
            <span>🏀 <strong>${v.team}</strong> wil het liefst taken <strong>${tekst}</strong>.</span>
            <button onclick="window.verwijderSfVoorkeur(${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer;">🗑️</button>
        </div>`;
    });
    lijst.innerHTML = html;
};

// 3. TOEVOEGEN & VERWIJDEREN VOORKEUREN
window.voegSfVoorkeurToe = function() {
    let t = document.getElementById('sf-voorkeur-team').value;
    let type = document.getElementById('sf-voorkeur-type').value;
    if (!t) return;
    if(!window.sfSettingsDB.voorkeuren) window.sfSettingsDB.voorkeuren = [];
    window.sfSettingsDB.voorkeuren.push({ team: t, type: type });
    window.renderSfVoorkeuren();
};

window.verwijderSfVoorkeur = function(index) {
    window.sfSettingsDB.voorkeuren.splice(index, 1);
    window.renderSfVoorkeuren();
};

// 4. OPSLAAN VAN INSTELLINGEN
window.slaSmartFillSettingsOp = function() {
    let s = window.sfSettingsDB;
    s.zelfdeVeld = parseInt(document.getElementById('sf-set-zelfde').value) || 0;
    s.anderVeld = parseInt(document.getElementById('sf-set-ander').value) || 0;
    s.wachten = parseInt(document.getElementById('sf-set-wachten').value) || 0;
    s.niveau = parseInt(document.getElementById('sf-set-niveau').value) || 0;
    s.nietThuis = parseInt(document.getElementById('sf-set-thuis').value) || 0;
    s.eerlijkheid = parseInt(document.getElementById('sf-set-eerlijk').value) || 0;
    
    s.srBonus = parseInt(document.getElementById('sf-set-sr-bonus').value) || 0;
    s.srTafelStraf = parseInt(document.getElementById('sf-set-sr-tafel').value) || 0;
    s.srMaxStraf = parseInt(document.getElementById('sf-set-sr-max').value) || 0;
    s.oudFluitBonus = parseInt(document.getElementById('sf-set-oud-fluit').value) || 0;
    s.oudTafelStraf = parseInt(document.getElementById('sf-set-oud-tafel').value) || 0;

    localStorage.setItem('blackshots_smartfill_settings', JSON.stringify(s));
    document.getElementById('smart-fill-settings-modal').style.display = 'none';
};

// 5. HELPER FUNCTIE: BEPAAL NIVEAU TRAP
window.bepaalNiveau = function(naam) {
    if (!naam) return 0;
    let up = naam.toUpperCase();
    if (up.includes('X10') || up.includes('X12')) return 1;
    if (up.includes('X14') || up.includes('M14') || up.includes('V14')) return 2;
    if (up.includes('M16') || up.includes('V16')) return 3;
    if (up.includes('M18') || up.includes('V18')) return 4;
    if (up.includes('M20') || up.includes('V20') || up.includes('M22') || up.includes('V22')) return 5;
    if (up.includes('HEREN') || up.includes('DAMES') || up.includes('SE')) return 6;
    return 3;
};

// 6. DE MAGISCHE ENGINE
// ============================================================================
// ✨ DE MAGISCHE ENGINE (MET CRASH DETECTOR & SAFE GUARDS)
// ============================================================================
// ============================================================================
// ✨ DE MAGISCHE ENGINE (MET OUDER-REGEL & LEEFTIJDSBEVEILIGING)
// ============================================================================
window.startSmartFill = function() {
    try {
        let speelDatumEl = document.getElementById('plan-datum');
        if (!speelDatumEl || !speelDatumEl.value) return alert("Kies eerst een datum.");
        
        let speelDatum = window.normaalDatum(speelDatumEl.value);

        if (!confirm("De Smart Fill Bot gaat nu proberen alle lege vakjes eerlijk in te vullen op het bord. Doorgaan?")) return;

        let set = window.sfSettingsDB || {}; 
        if(!set.voorkeuren) set.voorkeuren = []; 

        let alleWedstrijden = [...(window.nbbWedstrijden || []), ...(window.customWedstrijden || [])];
        let dagMatches = alleWedstrijden.filter(w => window.normaalDatum(w.Datum) === speelDatum && window.planStatusDB[window.genereerUniekId(w)]);
        
        if (dagMatches.length === 0) return alert("Er staan nog geen geplande wedstrijden op het bord voor deze dag!");

        let kandidatenLijst = [];
        (window.teamsDB || []).forEach(t => { 
            if(t && t.naam && !t.isRecreant && !t.isVrijwilliger) {
                kandidatenLijst.push({ naam: String(t.naam), type: 'team' }); 
                
                // VOEG DE OUDERS TOE ALS KANDIDAAT VOOR DE JONGSTE TEAMS (X10 / X12)
                if (window.bepaalNiveau(t.naam) <= 1) {
                    kandidatenLijst.push({ naam: "Ouders " + t.naam, type: 'ouders' });
                }
            }
        });
        (window.scheidsrechtersDB || []).forEach(s => { 
            if(s && s.naam) kandidatenLijst.push({ naam: String(s.naam), type: 'scheids' }); 
        });

        if (kandidatenLijst.length === 0) return alert("Er zijn nog geen teams of scheidsrechters toegevoegd!");

        let taakTeller = {};
        let dagTellerRef = {}; 
        
        Object.values(window.takenDB || {}).forEach(taken => {
            ['sA', 'sB', 'tab', 'sco'].forEach(slot => {
                if (taken[slot] && taken[slot] !== "Vrij") taakTeller[taken[slot]] = (taakTeller[taken[slot]] || 0) + 1;
            });
        });

        dagMatches.forEach(m => {
            let t = window.takenDB[window.genereerUniekId(m)] || {};
            ['sA', 'sB', 'tab', 'sco'].forEach(slot => {
                if (t[slot] && t[slot] !== "Vrij") dagTellerRef[t[slot]] = (dagTellerRef[t[slot]] || 0) + 1;
            });
        });

        let thuisteamsVandaag = dagMatches.map(m => (m.Thuisteam || '').replace('Black Shots ', '').trim());
        let smartFillLog = ''; let toegewezenAantal = 0;

        dagMatches.sort((a, b) => window.tijdNaarMinuten((window.planStatusDB[window.genereerUniekId(a)]||{}).tijd) - window.tijdNaarMinuten((window.planStatusDB[window.genereerUniekId(b)]||{}).tijd));

        dagMatches.forEach(match => {
            let matchId = window.genereerUniekId(match);
            let matchStatus = window.planStatusDB[matchId];
            if(!matchStatus) return;

            let startMin = window.tijdNaarMinuten(matchStatus.tijd);
            let wedstrijdNaam = (match.Thuisteam || '').replace('Black Shots ', '').trim();
            let matchNiveau = window.bepaalNiveau(wedstrijdNaam);
            let taken = window.takenDB[matchId] || { sA: "", sB: "", tab: "", sco: "" };
            let matchDuur = match.handmatigeDuur ? match.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);
            let eindMin = startMin + matchDuur;

            let analyseerVakje = (vakjeKey, taakTypeLabel) => {
                if (taken[vakjeKey] && taken[vakjeKey] !== "Vrij") return;

                let besteKandidaat = null; let hoogsteScore = -9999; let besteUitleg = [];

                kandidatenLijst.forEach(kandidaat => {
                    let score = 0; let uitleg = [];

                    let conflictCheck = window.checkConflicten(kandidaat.naam, startMin, eindMin, speelDatum, dagMatches.map(m => ({
                        uniekId: window.genereerUniekId(m), Thuisteam: m.Thuisteam || '', geplandeTijd: (window.planStatusDB[window.genereerUniekId(m)]||{}).tijd,
                        duur: m.handmatigeDuur || window.bepaalWedstrijdDuur((m.Thuisteam||'').replace('Black Shots ',''))
                    })), matchId, {...taken});

                    if (conflictCheck.status === 'rood') return; 

                    let kandidaatNiveau = window.bepaalNiveau(kandidaat.naam);

                    // --- DE OUDER-REGEL LOGICA ---
                    if (kandidaat.type === 'ouders') {
                        if (vakjeKey === 'tab' || vakjeKey === 'sco') {
                            let gekoppeldTeam = kandidaat.naam.replace('Ouders ', '').trim();
                            if (wedstrijdNaam === gekoppeldTeam) {
                                score += 1000; uitleg.push("Ouders bij eigen wedstrijd (+1000)");
                            } else {
                                score -= 5000; uitleg.push("Ouders tafelen niet bij anderen (-5000)");
                            }
                        } else {
                            score -= 5000; uitleg.push("Ouders fluiten niet (-5000)");
                        }
                    }

                    // --- DE LEEFTIJDS-BLOKKADE ---
                    if (kandidaat.type === 'team' && kandidaatNiveau <= 1) {
                        score -= 5000; uitleg.push("Te jong voor eigen taken (-5000)");
                    }

                    // --- REGULIERE LOGICA (Teams & Scheidsrechters) ---
                    if (kandidaat.type !== 'ouders' && !(kandidaat.type === 'team' && kandidaatNiveau <= 1)) {
                        
                        let heeftWedstrijdVandaag = thuisteamsVandaag.some(t => kandidaat.naam.includes(t) || t.includes(kandidaat.naam));
                        if (kandidaat.type === 'team' && !heeftWedstrijdVandaag) {
                            score -= (set.nietThuis || 0); uitleg.push(`Niet thuis (-${set.nietThuis || 0})`);
                        }

                        let eerdereTaken = taakTeller[kandidaat.naam] || 0;
                        if (eerdereTaken > 0) {
                            score -= (eerdereTaken * (set.eerlijkheid || 0));
                            uitleg.push(`Al ${eerdereTaken}x (-${eerdereTaken*(set.eerlijkheid || 0)})`);
                        }

                        if (vakjeKey === 'tab' || vakjeKey === 'sco') {
                            if (kandidaat.type === 'scheids') { 
                                score -= (set.srTafelStraf || 0); uitleg.push(`Scheids achter tafel (-${set.srTafelStraf || 0})`); 
                            }
                            if (kandidaatNiveau >= 5 && kandidaat.type === 'team') { 
                                score -= (set.oudTafelStraf || 0); uitleg.push(`Ouder team tafelt (-${set.oudTafelStraf || 0})`); 
                            }
                        }

                        if (vakjeKey === 'sA' || vakjeKey === 'sB') {
                            if (kandidaat.type === 'scheids') { 
                                score += (set.srBonus || 0); uitleg.push(`Vaste Scheids (+${set.srBonus || 0})`); 
                                let dagTaken = dagTellerRef[kandidaat.naam] || 0;
                                if (dagTaken >= 2) {
                                    score -= (set.srMaxStraf || 0); uitleg.push(`Burn-out: >2x fluiten (-${set.srMaxStraf || 0})`);
                                }
                            }
                            
                            if (kandidaat.type === 'team') {
                                let verschil = matchNiveau - kandidaatNiveau;
                                if (verschil > 0) {
                                    score -= (verschil * (set.niveau || 0)); uitleg.push(`Niveau trap (-${verschil*(set.niveau || 0)})`);
                                }
                                if (kandidaatNiveau >= 5) {
                                    score += (set.oudFluitBonus || 0); uitleg.push(`Ouder team fluit (+${set.oudFluitBonus || 0})`);
                                }
                            }
                        }

                        dagMatches.forEach(eigenMatch => {
                            let eigenThuisteam = (eigenMatch.Thuisteam || '').replace('Black Shots ', '').trim();
                            if (kandidaat.naam.includes(eigenThuisteam) || eigenThuisteam.includes(kandidaat.naam)) {
                                let eigenStatus = window.planStatusDB[window.genereerUniekId(eigenMatch)];
                                if(!eigenStatus) return;

                                let eigenStart = window.tijdNaarMinuten(eigenStatus.tijd);
                                let eigenDuur = eigenMatch.handmatigeDuur || window.bepaalWedstrijdDuur(eigenThuisteam);
                                let eigenEind = eigenStart + eigenDuur;

                                let verschilMinuten = 999; let isVoor = false;

                                if (startMin < eigenStart) { verschilMinuten = eigenStart - eindMin; isVoor = true; } 
                                else if (startMin >= eigenEind) { verschilMinuten = startMin - eigenEind; isVoor = false; } 

                                if (verschilMinuten >= 0) {
                                    let wachttijdKwartieren = Math.floor(verschilMinuten / 15);
                                    if (wachttijdKwartieren > 0) {
                                        score -= (wachttijdKwartieren * (set.wachten || 0));
                                        uitleg.push(`Wachttijd: ${verschilMinuten}m (-${wachttijdKwartieren*(set.wachten || 0)})`);
                                    }

                                    if (verschilMinuten <= 15) {
                                        if (eigenStatus.veld === matchStatus.veld) { score += (set.zelfdeVeld || 0); uitleg.push(`Aansluiting zelfde veld (+${set.zelfdeVeld || 0})`); } 
                                        else { score += (set.anderVeld || 0); uitleg.push(`Aansluiting ander veld (+${set.anderVeld || 0})`); }
                                    }

                                    let voorkeurObj = (set.voorkeuren || []).find(v => v && v.team === eigenThuisteam);
                                    if (voorkeurObj) {
                                        if (voorkeurObj.type === 'voor' && isVoor) { score += 80; uitleg.push("Voorkeur VÓÓR match (+80)"); }
                                        if (voorkeurObj.type === 'na' && !isVoor) { score += 80; uitleg.push("Voorkeur NÁ match (+80)"); }
                                    }
                                }
                            }
                        });
                    }

                    if (score > hoogsteScore) { hoogsteScore = score; besteKandidaat = kandidaat.naam; besteUitleg = uitleg; }
                });

                if (besteKandidaat) {
                    taken[vakjeKey] = besteKandidaat;
                    taakTeller[besteKandidaat] = (taakTeller[besteKandidaat] || 0) + 1; 
                    if (kandidatenLijst.find(k => k.naam === besteKandidaat) && kandidatenLijst.find(k => k.naam === besteKandidaat).type === 'scheids') {
                        dagTellerRef[besteKandidaat] = (dagTellerRef[besteKandidaat] || 0) + 1;
                    }
                    toegewezenAantal++;
                    
                    let uitlegTekst = besteUitleg.length > 0 ? besteUitleg.join(', ') : "Basis invulling";
                    smartFillLog += `<div style="border-bottom:1px solid #ccc; padding:8px 0;"><strong style="color:#2c3e50;">${wedstrijdNaam} (${matchStatus.tijd}) - ${taakTypeLabel}:</strong> <span style="color:#27ae60; font-weight:bold;">${besteKandidaat}</span> <span style="color:#7f8c8d; font-size:0.8rem; margin-left:10px;">[Score: ${hoogsteScore}] ➔ ${uitlegTekst}</span></div>`;
                }
            };

            analyseerVakje('sA', 'Scheids A'); analyseerVakje('sB', 'Scheids B'); analyseerVakje('tab', 'Tablet'); analyseerVakje('sco', 'Scorebord');
            window.takenDB[matchId] = taken;
        });

        if (toegewezenAantal === 0) return alert("Het bord is al helemaal vol of er zijn geen logische kandidaten meer over!");

        let logContainer = document.getElementById('smart-fill-log-container');
        let modal = document.getElementById('smart-fill-rapport-modal');
        
        if(logContainer && modal) {
            logContainer.innerHTML = smartFillLog;
            modal.style.display = 'flex';
        } else {
            alert(`✅ Succes! ${toegewezenAantal} taken ingevuld. (Rapport kon niet geladen worden)`);
        }
        
        window.slaPlannerDataOp();
        window.laadPlanbord();

    } catch (error) {
        alert("CRASH DETECTOR 🚨: Er ging iets fout tijdens het berekenen. Stuur dit naar je bouwer: " + error.message);
        console.error(error);
    }
};


// 🛡️ DE KOGELVRIJE ID GENERATOR (Die was even kwijt!)
window.genereerUniekId = function(w) {
    if (w.id) return w.id; // Voor custom wedstrijden
    let thuisteam = w.Thuisteam ? String(w.Thuisteam) : '';
    let uitteam = w.Uitteam ? String(w.Uitteam) : '';
    let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (thuisteam + uitteam).replace(/[^a-zA-Z0-9]/g, '');
    return `match-${window.normaalDatum(w.Datum)}-${clean}`;
};