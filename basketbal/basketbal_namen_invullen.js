window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

window.nbbWedstrijden = window.veiligeArray('blackshots_wedstrijden_json');
window.customWedstrijden = window.veiligeArray('blackshots_custom_wedstrijden');
window.teamsDB = window.veiligeArray('blackshots_teams');
window.spelersDB = window.veiligeArray('blackshots_spelers');
window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.verborgenDB = window.veiligeArray('blackshots_verborgen_wedstrijden');

// De databases uit Fase 1 (Tijden, Velden en Toegewezen Teams)
window.teamTakenDB = window.veiligObject('blackshots_wedstrijd_taken');
window.planStatusDB = window.veiligObject('blackshots_plan_status');

// DE NIEUWE DATABASE: Hier slaan we de specifieke ID's van de personen op!
window.persoonsTakenDB = window.veiligObject('blackshots_persoons_taken');

const START_UUR = 9; const EIND_UUR = 22; const PIXEL_SCALE = 2;

window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10); 
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) { let delen = str.split('-'); return `${delen[2]}-${delen[1]}-${delen[0]}`; }
    return str;
};

window.genereerUniekId = function(w) {
    if (w.ID) return `nbb-${w.ID}`; 
    if (w.id) return w.id; 
    let thuisteam = w.Thuisteam ? String(w.Thuisteam) : ''; let uitteam = w.Uitteam ? String(w.Uitteam) : '';
    let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (thuisteam + uitteam).replace(/[^a-zA-Z0-9]/g, '');
    return `match-${window.normaalDatum(w.Datum)}-${clean}`;
};

window.getCanonicalTeam = function(identifier) {
    if (!identifier) return null;
    let cleanZoek = String(identifier).toLowerCase().replace(/[-\s]/g, '');
    return window.teamsDB.find(team => {
        let tId = String(team.id || '').toLowerCase().replace(/[-\s]/g, '');
        let tNaam = String(team.naam || '').toLowerCase().replace(/[-\s]/g, '');
        if (cleanZoek === tId || cleanZoek === tNaam) return true;
        if (team.aliassen) {
            let aliasArray = team.aliassen.toLowerCase().split(',').map(a => a.replace(/[-\s]/g, ''));
            if (aliasArray.includes(cleanZoek)) return true;
        }
        return false;
    });
};

window.tijdNaarMinuten = function(tijdStr) {
    if (!tijdStr || tijdStr.includes('Te plannen') || tijdStr.includes('N.t.b.')) return 0;
    let parts = tijdStr.split(':'); return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
};
window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = teamNaam.toUpperCase();
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || naam.includes('20') || naam.includes('22') || naam.includes('SE')) return 105;
    return 90; 
};

// ============================================================================
// 📊 GLOBALE SEIZOENS TELLER
// ============================================================================
window.globaleTakenScore = {}; // Houdt per speler.id de score bij

window.berekenGlobaleScores = function() {
    window.globaleTakenScore = {};
    
    // Zet iedereen standaard op 0
    window.spelersDB.forEach(s => window.globaleTakenScore[s.id] = 0);

    // Loop door ALLE persoonsTaken in het hele seizoen
    Object.values(window.persoonsTakenDB).forEach(matchTaken => {
        ['sA', 'sB', 'tab', 'sco', 'auto1', 'auto2', 'auto3'].forEach(rol => {
            let pId = matchTaken[rol];
            if (pId && pId !== "Vrij" && pId !== "") {
                window.globaleTakenScore[pId] = (window.globaleTakenScore[pId] || 0) + 1;
            }
        });
    });

    // Teken de lijst in de linkerkolom
    let lijstContainer = document.getElementById('seizoen-teller-container');
    if (!lijstContainer) return;

    let arrayScores = Object.keys(window.globaleTakenScore).map(id => {
        let s = window.spelersDB.find(x => x.id === id);
        return { id: id, naam: s ? s.naam : id, score: window.globaleTakenScore[id] };
    }).filter(x => x.score > 0); // Laat alleen mensen zien die al wat gedaan hebben

    arrayScores.sort((a, b) => b.score - a.score); // Meeste bovenaan

    let html = '';
    arrayScores.forEach(item => {
        html += `<div class="teller-item"><span>${item.naam}</span> <strong>${item.score}x</strong></div>`;
    });
    
    if(html === '') html = '<div style="color:#7f8c8d; font-size:0.8rem; text-align:center;">Nog niemand is ingedeeld.</div>';
    lijstContainer.innerHTML = html;
};

// ============================================================================
// 🎨 BORD RENDERING
// ============================================================================
window.initNamenPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let vandaag = new Date();
    let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    datumInput.value = vandaag.toISOString().split('T')[0];
    
    window.berekenGlobaleScores();
    window.laadNamenBord();
};

window.laadNamenBord = function() {
    let bord = document.getElementById('planner-bord-container');
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
    if(!bord || !speelDatum) return;

    let html = `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    html += `</div>`;

    for(let v = 1; v <= 2; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) gridLijnenHtml += `<div class="grid-lijn-15m"></div><div class="grid-lijn-30m"></div><div class="grid-lijn-15m"></div><div class="grid-lijn-60m"></div>`;
        gridLijnenHtml += `</div>`;
        html += `<div class="veld-kolom">
                    <div class="veld-header">Veld ${v}</div>
                    ${gridLijnenHtml}
                    <div id="wedstrijd-container-${v}" style="position:absolute; top:42px; left:0; right:0; bottom:0;"></div>
                 </div>`;
    }

    let gridLijnenUit = `<div class="grid-lijnen">`;
    for(let u = START_UUR; u < EIND_UUR; u++) gridLijnenUit += `<div class="grid-lijn-15m"></div><div class="grid-lijn-30m"></div><div class="grid-lijn-15m"></div><div class="grid-lijn-60m"></div>`;
    gridLijnenUit += `</div>`;
    html += `<div class="veld-kolom" style="background: rgba(41, 128, 185, 0.05);">
                <div class="veld-header" style="background:#2980b9;">🚌 Uitwedstrijden</div>
                ${gridLijnenUit}
                <div id="wedstrijd-container-uit" style="position:absolute; top:42px; left:0; right:0; bottom:0;"></div>
             </div>`;

    bord.innerHTML = html;

    // Haal wedstrijden op die in de planner zijn vastgezet
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => {
        let matchDatum = window.normaalDatum(w.Datum);
        let id = window.genereerUniekId(w);
        return matchDatum === speelDatum && window.planStatusDB[id] && !window.verborgenDB.includes(id);
    });

    let uitOverlaps = {};

    dagWedstrijden.forEach(w => {
        let uniekId = window.genereerUniekId(w);
        let dbStatus = window.planStatusDB[uniekId];
        let teamTaken = window.teamTakenDB[uniekId] || {};     // De teams uit fase 1
        let persTaken = window.persoonsTakenDB[uniekId] || {}; // De personen uit deze fase

        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let wedstrijdNaam = isThuis ? (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
        let tegenstander = isThuis ? (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
        
        let duurMinuten = w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);
        let pixelHoogte = duurMinuten * PIXEL_SCALE;
        let startMinuten = window.tijdNaarMinuten(dbStatus.tijd);
        let topPixels = ((startMinuten - (START_UUR * 60)) * PIXEL_SCALE);

        let cssPositie = `position: absolute; top: ${topPixels}px; left: 5px; right: 5px; width: auto; z-index: 10;`;
        if (dbStatus.veld === 'uit') {
            let overlapIndex = uitOverlaps[startMinuten] || 0;
            cssPositie = `position: absolute; top: ${topPixels}px; left: ${5 + (overlapIndex * 35)}px; right: 5px; width: calc(100% - ${10 + overlapIndex * 35}px); z-index: ${10 + overlapIndex};`;
            uitOverlaps[startMinuten] = overlapIndex + 1;
        }

        // Helper om de echte naam te tonen in plaats van het ID
        let naamWeergave = (pId, defaultTeam) => {
            if (!pId || pId === "" || pId === "Vrij") return `[${defaultTeam || 'Team N.n.b.'}]`;
            let s = window.spelersDB.find(x => x.id === pId);
            return s ? s.naam : pId;
        };

        let htmlTakenBlok = '';
        if (isThuis) {
            let pA = naamWeergave(persTaken.sA, teamTaken.sA); let pB = naamWeergave(persTaken.sB, teamTaken.sB);
            let pT = naamWeergave(persTaken.tab, teamTaken.tab); let pS = naamWeergave(persTaken.sco, teamTaken.sco);
            
            htmlTakenBlok = `
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">A:</span> <span class="taak-waarde ${persTaken.sA?'taak-gevuld':''}">${pA}</span></div>
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">B:</span> <span class="taak-waarde ${persTaken.sB?'taak-gevuld':''}">${pB}</span></div>
                </div>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">💻:</span> <span class="taak-waarde ${persTaken.tab?'taak-gevuld':''}">${pT}</span></div>
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">⏱️:</span> <span class="taak-waarde ${persTaken.sco?'taak-gevuld':''}">${pS}</span></div>
                </div>`;
        } else {
            let p1 = naamWeergave(persTaken.auto1, "Auto 1"); let p2 = naamWeergave(persTaken.auto2, "Auto 2"); let p3 = naamWeergave(persTaken.auto3, "Auto 3");
            htmlTakenBlok = `
                <div style="display:flex; flex-direction:column; gap:5px; margin-top:5px; border-top:1px dashed #3498db; padding-top:5px;">
                    <div class="taak-regel" style="border-color:#3498db;"><span class="taak-label">🚗 1:</span> <span class="taak-waarde ${persTaken.auto1?'taak-gevuld':''}">${p1}</span></div>
                    <div style="display:flex; gap:5px;">
                        <div class="taak-regel" style="flex:1; border-color:#3498db;"><span class="taak-label">🚗 2:</span> <span class="taak-waarde ${persTaken.auto2?'taak-gevuld':''}">${p2}</span></div>
                        <div class="taak-regel" style="flex:1; border-color:#3498db;"><span class="taak-label">🚗 3:</span> <span class="taak-waarde ${persTaken.auto3?'taak-gevuld':''}">${p3}</span></div>
                    </div>
                </div>`;
        }

        let bgKleur = isThuis ? '#fff3e0' : '#ebf5fb';
        let randKleur = isThuis ? '#e67e22' : '#3498db';
        let titelKleur = isThuis ? '#d35400' : '#2980b9';

        let html = `
            <div class="wedstrijd-blok" onclick="window.openNamenModal('${uniekId}')" style="background:${bgKleur}; border-color:${randKleur}; ${cssPositie} height: ${pixelHoogte}px;">
                <div class="wb-titel" style="color:${titelKleur};">
                    <span>${isThuis?'🏠':'🚌'} ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${tegenstander}</span></span>
                </div>
                <div class="wb-meta"><span class="wb-tijd-badge">⏱️ ${dbStatus.tijd}</span></div>
                <div class="wb-taken">${htmlTakenBlok}</div>
            </div>
        `;
        let targetDiv = document.getElementById(`wedstrijd-container-${dbStatus.veld}`);
        if(targetDiv) targetDiv.insertAdjacentHTML('beforeend', html);
    });
};

// ============================================================================
// 📋 DYNAMISCH NAMEN MODAL (Sorteert op Minste Taken)
// ============================================================================
window.genereerPersoonDropdown = function(geselecteerdePersoonId, basisTeamNaam, vereisteTaak) {
    let basisCanon = window.getCanonicalTeam(basisTeamNaam);
    
    // Filter ALLE spelers op de vereiste vaardigheid
    let geschikteSpelers = window.spelersDB.filter(s => {
        if (vereisteTaak === 'fluit') return s.magFluiten !== false;
        if (vereisteTaak === 'tafel') return s.magTafelen !== false;
        if (vereisteTaak === 'auto') return s.heeftAuto === true;
        return true;
    });

    // Sorteer op de globale score (minste taken eerst!)
    geschikteSpelers.sort((a, b) => (window.globaleTakenScore[a.id] || 0) - (window.globaleTakenScore[b.id] || 0));

    // Splits in Twee Groepen: Eigen Team vs De Rest
    let eigenTeamOpties = '';
    let overigeOpties = '';

    geschikteSpelers.forEach(s => {
        let scoreStr = `(${window.globaleTakenScore[s.id] || 0} taken)`;
        let isGeselecteerd = (s.id === geselecteerdePersoonId) ? 'selected' : '';
        let sTeam = window.getCanonicalTeam(s.teamId);
        
        let optHtml = `<option value="${s.id}" ${isGeselecteerd}>${s.naam} ${scoreStr}</option>`;
        
        if (basisCanon && sTeam && sTeam.id === basisCanon.id) {
            eigenTeamOpties += optHtml;
        } else {
            overigeOpties += optHtml;
        }
    });

    let html = `<option value="">-- Geen persoon geselecteerd --</option>`;
    if (basisCanon) html += `<optgroup label="✅ Vanuit ${basisCanon.naam} (Minste taken eerst)">${eigenTeamOpties}</optgroup>`;
    html += `<optgroup label="🌐 Overige geschikte clubleden">${overigeOpties}</optgroup>`;
    return html;
};

window.openNamenModal = function(matchId) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => window.genereerUniekId(w) === matchId);
    if (!match) return;

    let isThuis = (match.Thuisteam || '').toLowerCase().includes('black shots');
    let thuisNaam = (match.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
    let uitNaam = (match.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
    let speelTeamNaam = isThuis ? thuisNaam : uitNaam;

    document.getElementById('namen-match-id').value = matchId;
    document.getElementById('namen-match-titel').innerText = `${isThuis ? '🏠 Thuis:' : '🚌 Uit:'} ${thuisNaam} vs ${uitNaam}`;
    
    let teamTaken = window.teamTakenDB[matchId] || {};
    let persTaken = window.persoonsTakenDB[matchId] || {};
    
    let veldenHtml = '';

    if (isThuis) {
        let tA_naam = (teamTaken.sA || '').replace(/ouders/i,'').trim();
        let tB_naam = (teamTaken.sB || '').replace(/ouders/i,'').trim();
        let tTab_naam = (teamTaken.tab || '').replace(/ouders/i,'').trim();
        let tSco_naam = (teamTaken.sco || '').replace(/ouders/i,'').trim();

        veldenHtml = `
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">👨‍⚖️ Scheids A (Team: ${teamTaken.sA||'?'})</label><select id="pers-sA" style="width:100%; padding:10px; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.sA, tA_naam, 'fluit')}</select></div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">👨‍⚖️ Scheids B (Team: ${teamTaken.sB||'?'})</label><select id="pers-sB" style="width:100%; padding:10px; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.sB, tB_naam, 'fluit')}</select></div>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">💻 Tablet (Team: ${teamTaken.tab||'?'})</label><select id="pers-tab" style="width:100%; padding:10px; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.tab, tTab_naam, 'tafel')}</select></div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">⏱️ Scorebord (Team: ${teamTaken.sco||'?'})</label><select id="pers-sco" style="width:100%; padding:10px; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.sco, tSco_naam, 'tafel')}</select></div>
            </div>`;
    } else {
        veldenHtml = `
            <div style="margin-bottom:15px;"><label style="font-weight:bold; font-size:0.85rem; color:#3498db;">🚗 Chauffeur 1 (Vanuit ${speelTeamNaam})</label><select id="pers-auto1" style="width:100%; padding:10px; border:2px solid #3498db; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.auto1, speelTeamNaam, 'auto')}</select></div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">🚗 Chauffeur 2</label><select id="pers-auto2" style="width:100%; padding:10px; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.auto2, speelTeamNaam, 'auto')}</select></div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">🚗 Chauffeur 3</label><select id="pers-auto3" style="width:100%; padding:10px; border-radius:4px;">${window.genereerPersoonDropdown(persTaken.auto3, speelTeamNaam, 'auto')}</select></div>
            </div>`;
    }

    document.getElementById('dynamische-namen-velden').innerHTML = veldenHtml;
    document.getElementById('namen-modal').style.display = 'flex';
};

window.slaNamenOp = function() {
    let matchId = document.getElementById('namen-match-id').value;
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => window.genereerUniekId(w) === matchId);
    let isThuis = match && (match.Thuisteam || '').toLowerCase().includes('black shots');

    let currentData = window.persoonsTakenDB[matchId] || {};

    if (isThuis) {
        currentData.sA = document.getElementById('pers-sA').value;
        currentData.sB = document.getElementById('pers-sB').value;
        currentData.tab = document.getElementById('pers-tab').value;
        currentData.sco = document.getElementById('pers-sco').value;
    } else {
        currentData.auto1 = document.getElementById('pers-auto1').value;
        currentData.auto2 = document.getElementById('pers-auto2').value;
        currentData.auto3 = document.getElementById('pers-auto3').value;
    }

    window.persoonsTakenDB[matchId] = currentData;
    localStorage.setItem('blackshots_persoons_taken', JSON.stringify(window.persoonsTakenDB));
    
    document.getElementById('namen-modal').style.display = 'none';
    window.berekenGlobaleScores();
    window.laadNamenBord();
};

window.navigeerSpeeldag = function(richting) {
    let huidigeDatum = window.normaalDatum(document.getElementById('plan-datum').value);
    let dagen = JSON.parse(localStorage.getItem('blackshots_speeldagen')) || [];
    if(dagen.length === 0) return;
    
    dagen.sort();
    let index = dagen.indexOf(huidigeDatum);
    if (index === -1) index = 0;
    
    let nwIndex = index + richting;
    if (nwIndex >= 0 && nwIndex < dagen.length) {
        document.getElementById('plan-datum').value = dagen[nwIndex];
        window.initNamenPlanner();
    }
};

window.kopieerNamenSchema = function() { alert("Komt eraan in de volgende update!"); };
window.botVulThuisIn = function() { alert("De Thuis Bot wordt gebouwd in de volgende stap!"); };
window.botVulUitIn = function() { alert("De Uit Bot wordt gebouwd in de volgende stap!"); };