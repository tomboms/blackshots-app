window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

window.nbbWedstrijden = window.veiligeArray('blackshots_wedstrijden_json');
window.customWedstrijden = window.veiligeArray('blackshots_custom_wedstrijden');
window.teamsDB = window.veiligeArray('blackshots_teams');
window.spelersDB = window.veiligeArray('blackshots_spelers');
window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.verborgenDB = window.veiligeArray('blackshots_verborgen_wedstrijden');

window.teamTakenDB = window.veiligObject('blackshots_wedstrijd_taken');
window.planStatusDB = window.veiligObject('blackshots_plan_status');
window.persoonsTakenDB = window.veiligObject('blackshots_persoons_taken');

const START_UUR = 9; const EIND_UUR = 22; const PIXEL_SCALE = 2;

// ============================================================================
// BASIS HELPERS
// ============================================================================
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

window.zoekPersoonIdViaNaam = function(naamStr) {
    if (!naamStr || naamStr === "Vrij") return "";
    let clean = naamStr.toLowerCase().trim();
    let sr = window.scheidsrechtersDB.find(s => s && s.naam.toLowerCase().trim() === clean);
    if (sr) return sr.gekoppeldLid ? sr.gekoppeldLid : sr.id;
    let sp = window.spelersDB.find(s => s && s.naam.toLowerCase().trim() === clean);
    if (sp) return sp.id;
    return ""; 
};

// ============================================================================
// AUTO-MIGRATIE EN SEIZOENS TELLER
// ============================================================================
window.schoonPersoonsTakenOp = function() {
    let gewijzigd = false;
    Object.keys(window.teamTakenDB).forEach(matchId => {
        let tTaken = window.teamTakenDB[matchId];
        let pTaken = window.persoonsTakenDB[matchId] || {};
        ['sA', 'sB', 'tab', 'sco', 'auto1', 'auto2', 'auto3'].forEach(rol => {
            if (!pTaken[rol] && tTaken[rol] && tTaken[rol] !== "Vrij") {
                let gevondenId = window.zoekPersoonIdViaNaam(tTaken[rol]);
                if (gevondenId) { pTaken[rol] = gevondenId; gewijzigd = true; }
            }
        });
        if (gewijzigd) window.persoonsTakenDB[matchId] = pTaken;
    });

    Object.keys(window.persoonsTakenDB).forEach(matchId => {
        let taken = window.persoonsTakenDB[matchId];
        ['sA', 'sB', 'tab', 'sco', 'auto1', 'auto2', 'auto3'].forEach(rol => {
            let val = taken[rol];
            if (val && val !== "Vrij" && val !== "") {
                let isSpeler = window.spelersDB.some(s => s.id === val);
                let sr = window.scheidsrechtersDB.find(s => s.id === val);
                if (sr && sr.gekoppeldLid) {
                    taken[rol] = sr.gekoppeldLid; gewijzigd = true;
                } else if (!isSpeler && !sr) {
                    let gevondenId = window.zoekPersoonIdViaNaam(val); 
                    if (gevondenId) { taken[rol] = gevondenId; gewijzigd = true; }
                }
            }
        });
    });
    if (gewijzigd) localStorage.setItem('blackshots_persoons_taken', JSON.stringify(window.persoonsTakenDB));
};

window.globaleTakenScore = {}; 
window.berekenGlobaleScores = function() {
    window.globaleTakenScore = {};
    window.spelersDB.forEach(s => window.globaleTakenScore[s.id] = 0);
    window.scheidsrechtersDB.forEach(sr => window.globaleTakenScore[sr.id] = 0);

    Object.values(window.persoonsTakenDB).forEach(matchTaken => {
        ['sA', 'sB', 'tab', 'sco', 'auto1', 'auto2', 'auto3'].forEach(rol => {
            let pId = matchTaken[rol];
            if (pId && pId !== "Vrij" && pId !== "") window.globaleTakenScore[pId] = (window.globaleTakenScore[pId] || 0) + 1;
        });
    });

    let lijstContainer = document.getElementById('seizoen-teller-container');
    if (!lijstContainer) return;

    let arrayScores = Object.keys(window.globaleTakenScore).map(id => {
        let s = window.spelersDB.find(x => x.id === id);
        let sr = window.scheidsrechtersDB.find(x => x.id === id);
        return { id: id, naam: s ? s.naam : (sr ? sr.naam : id), score: window.globaleTakenScore[id] };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score); 

    let html = '';
    arrayScores.forEach(item => html += `<div class="teller-item"><span>${item.naam}</span> <strong>${item.score}x</strong></div>`);
    if(html === '') html = '<div style="color:#7f8c8d; font-size:0.8rem; text-align:center;">Nog niemand is ingedeeld.</div>';
    lijstContainer.innerHTML = html;
};

// ============================================================================
// 🗂️ LIJSTWEERGAVE SCHAKELAAR & CHECKBOXES
// ============================================================================
window.huidigeWeergave = 'grid';

window.toggleLijstWeergave = function() {
    window.huidigeWeergave = window.huidigeWeergave === 'grid' ? 'lijst' : 'grid';
    let btn = document.getElementById('btn-weergave-toggle');
    if(btn) btn.innerHTML = window.huidigeWeergave === 'grid' ? '🗂️ Lijstweergave' : '📅 Blokkenschema';
    
    let filterBar = document.getElementById('lijst-filters');
    
    if (window.huidigeWeergave === 'lijst') {
        if(filterBar) filterBar.style.display = 'flex';
        
        let tf = document.getElementById('filter-team-container');
        // FIX: We kijken nu of er echte HTML-elementen (children) inzitten, 
        // in plaats van te struikelen over de <!-- HTML comments -->
        if (tf && tf.children.length === 0) {
            let boxHtml = `<label style="display:flex; align-items:center; gap:5px; margin-bottom:5px; padding-bottom:5px; border-bottom:1px solid #eee;"><input type="checkbox" id="cb-alle-teams" checked onchange="window.toggleAlleTeams(this)"> <strong style="color:#2c3e50;">-- Alle Teams Tonen --</strong></label>`;
            window.teamsDB.forEach(t => { 
                if(!t.isVrijwilliger) {
                    boxHtml += `<label style="display:flex; align-items:center; gap:5px; margin-bottom:3px; cursor:pointer;"><input type="checkbox" class="team-filter-cb" value="${t.id}" checked onchange="window.checkAlleTeamsStatus(); window.laadNamenBord()"> ${t.naam}</label>`;
                }
            });
            tf.innerHTML = boxHtml;
        }
    } else {
        if(filterBar) filterBar.style.display = 'none';
    }
    window.laadNamenBord();
};

window.toggleAlleTeams = function(hoofdCb) {
    let cbs = document.querySelectorAll('.team-filter-cb');
    cbs.forEach(c => c.checked = hoofdCb.checked);
    window.laadNamenBord();
};

window.checkAlleTeamsStatus = function() {
    let cbs = document.querySelectorAll('.team-filter-cb');
    let allChecked = Array.from(cbs).every(c => c.checked);
    let hoofdCb = document.getElementById('cb-alle-teams');
    if(hoofdCb) hoofdCb.checked = allChecked;
};

// ============================================================================
// 🎨 PLANBORD RENDERING (MODUS 1: LIJST | MODUS 2: GRID)
// ============================================================================
window.initNamenPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let vandaag = new Date();
    let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    datumInput.value = vandaag.toISOString().split('T')[0];
    
    window.schoonPersoonsTakenOp();
    window.berekenGlobaleScores();
    window.laadNamenBord();
};

window.laadNamenBord = function() {
    let bord = document.getElementById('planner-bord-container');
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
    if(!bord || !speelDatum) return;

    // --- MODUS 1: DE SLIMME LIJSTWEERGAVE ---
    if (window.huidigeWeergave === 'lijst') {
        let periode = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'dag';
        let locatie = document.getElementById('filter-locatie') ? document.getElementById('filter-locatie').value : 'alles';
        let sortering = document.getElementById('filter-sortering') ? document.getElementById('filter-sortering').value : 'tijd';
        
        let hoofdCb = document.getElementById('cb-alle-teams');
        let isAllesAangevinkt = hoofdCb ? hoofdCb.checked : true;
        let actieveTeams = [];
        if (!isAllesAangevinkt) {
            document.querySelectorAll('.team-filter-cb').forEach(cb => { if(cb.checked) actieveTeams.push(cb.value); });
        }

        let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
        
        let toonWedstrijden = alleWedstrijden.filter(w => {
            let id = window.genereerUniekId(w);
            if (window.verborgenDB.includes(id)) return false;
            
            if (periode === 'dag') {
                if (window.normaalDatum(w.Datum) !== speelDatum) return false;
                if (!window.planStatusDB[id]) return false; 
            } else {
                if (!window.planStatusDB[id]) return false; 
            }

            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            if (locatie === 'thuis' && !isThuis) return false;
            if (locatie === 'uit' && isThuis) return false;

            if (!isAllesAangevinkt) {
                if (actieveTeams.length === 0) return false; 
                let wCanon = window.getCanonicalTeam(isThuis ? w.Thuisteam.replace(/Black Shots\s*-?\s*/i, '') : w.Uitteam.replace(/Black Shots\s*-?\s*/i, ''));
                if (!wCanon || !actieveTeams.includes(wCanon.id)) return false;
            }
            return true;
        });

        toonWedstrijden.sort((a, b) => {
            let dA = window.normaalDatum(a.Datum); let dB = window.normaalDatum(b.Datum);
            let tA = window.planStatusDB[window.genereerUniekId(a)] ? window.tijdNaarMinuten(window.planStatusDB[window.genereerUniekId(a)].tijd) : 9999;
            let tB = window.planStatusDB[window.genereerUniekId(b)] ? window.tijdNaarMinuten(window.planStatusDB[window.genereerUniekId(b)].tijd) : 9999;
            
            if (sortering === 'team') {
                let teamA = a.Thuisteam.includes('Black Shots') ? a.Thuisteam.replace(/Black Shots\s*-?\s*/i, '') : a.Uitteam.replace(/Black Shots\s*-?\s*/i, '');
                let teamB = b.Thuisteam.includes('Black Shots') ? b.Thuisteam.replace(/Black Shots\s*-?\s*/i, '') : b.Uitteam.replace(/Black Shots\s*-?\s*/i, '');
                let canonA = window.getCanonicalTeam(teamA); let canonB = window.getCanonicalTeam(teamB);
                let naamA = canonA ? canonA.naam : teamA; let naamB = canonB ? canonB.naam : teamB;
                
                if (naamA !== naamB) return naamA.localeCompare(naamB);
                if (dA !== dB) return dA.localeCompare(dB);
                return tA - tB;
            } else {
                if (dA !== dB) return dA.localeCompare(dB);
                return tA - tB;
            }
        });

        let html = `<div style="background:white; border-radius:8px; padding:20px; width:100%;"><h3 style="margin-top:0; color:#8e44ad;">🗂️ Overzichtslijst (${toonWedstrijden.length} gevonden)</h3><div style="display:flex; flex-direction:column; gap:15px;">`;

        let huidigTeamHeader = null;

        toonWedstrijden.forEach(w => {
            let uniekId = window.genereerUniekId(w);
            let dbStatus = window.planStatusDB[uniekId];
            let teamTaken = window.teamTakenDB[uniekId] || {};     
            let persTaken = window.persoonsTakenDB[uniekId] || {}; 

            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            let wedstrijdNaam = isThuis ? (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
            let tegenstander = isThuis ? (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
            
            if (sortering === 'team') {
                let canon = window.getCanonicalTeam(wedstrijdNaam);
                let weergaveNaam = canon ? canon.naam : wedstrijdNaam;
                if (weergaveNaam !== huidigTeamHeader) {
                    html += `<div style="margin-top: 15px; margin-bottom: 5px; color: white; background: #34495e; padding: 8px 12px; border-radius: 4px; font-weight: bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🏀 Team: ${weergaveNaam}</div>`;
                    huidigTeamHeader = weergaveNaam;
                }
            }

            let renderTaak = (pId, defaultTeam) => {
                let css = ""; let text = "";
                if (pId && pId !== "Vrij" && pId !== "") {
                    css = "taak-gevuld"; 
                    let s = window.spelersDB.find(x => x.id === pId);
                    let sr = window.scheidsrechtersDB.find(x => x.id === pId);
                    text = s ? s.naam : (sr ? sr.naam : pId);
                } else {
                    text = (!defaultTeam || defaultTeam === "Vrij" || defaultTeam === "") ? "Vrij" : `[${defaultTeam}]`; 
                }
                return { css, text };
            };

            let htmlTakenBlok = '';
            if (isThuis) {
                let pA = renderTaak(persTaken.sA, teamTaken.sA); let pB = renderTaak(persTaken.sB, teamTaken.sB);
                let pT = renderTaak(persTaken.tab, teamTaken.tab); let pS = renderTaak(persTaken.sco, teamTaken.sco);
                htmlTakenBlok = `
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:5px;">
                        <div class="taak-regel" style="min-width:160px; flex:1;"><span class="taak-label">A:</span> <span class="taak-waarde ${pA.css}">${pA.text}</span></div>
                        <div class="taak-regel" style="min-width:160px; flex:1;"><span class="taak-label">B:</span> <span class="taak-waarde ${pB.css}">${pB.text}</span></div>
                        <div class="taak-regel" style="min-width:160px; flex:1;"><span class="taak-label">💻:</span> <span class="taak-waarde ${pT.css}">${pT.text}</span></div>
                        <div class="taak-regel" style="min-width:160px; flex:1;"><span class="taak-label">⏱️:</span> <span class="taak-waarde ${pS.css}">${pS.text}</span></div>
                    </div>`;
            } else {
                let p1 = renderTaak(persTaken.auto1, "Auto 1"); let p2 = renderTaak(persTaken.auto2, "Auto 2"); let p3 = renderTaak(persTaken.auto3, "Auto 3");
                htmlTakenBlok = `
                    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:5px; border-top:1px dashed #3498db; padding-top:5px;">
                        <div class="taak-regel" style="min-width:160px; flex:1; border-color:#3498db;"><span class="taak-label">🚗 1:</span> <span class="taak-waarde ${p1.css}">${p1.text}</span></div>
                        <div class="taak-regel" style="min-width:160px; flex:1; border-color:#3498db;"><span class="taak-label">🚗 2:</span> <span class="taak-waarde ${p2.css}">${p2.text}</span></div>
                        <div class="taak-regel" style="min-width:160px; flex:1; border-color:#3498db;"><span class="taak-label">🚗 3:</span> <span class="taak-waarde ${p3.css}">${p3.text}</span></div>
                    </div>`;
            }

            let bgKleur = isThuis ? '#fff3e0' : '#ebf5fb';
            let randKleur = isThuis ? '#e67e22' : '#3498db';
            let titelKleur = isThuis ? '#d35400' : '#2980b9';
            let datumWeergave = periode === 'alles' ? ` | 📅 ${window.normaalDatum(w.Datum)}` : '';

            html += `
                <div class="wedstrijd-blok" onclick="window.openNamenModal('${uniekId}')" style="background:${bgKleur}; border-color:${randKleur}; position:relative; height:auto; padding-bottom:10px;">
                    <div class="wb-titel" style="color:${titelKleur};">
                        <span>${isThuis?'🏠':'🚌'} ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${tegenstander}</span></span>
                    </div>
                    <div class="wb-meta"><span class="wb-tijd-badge">⏱️ ${dbStatus.tijd}</span>${datumWeergave}</div>
                    <div class="wb-taken">${htmlTakenBlok}</div>
                </div>
            `;
        });

        html += `</div></div>`;
        bord.innerHTML = html;
        return; 
    }

    // --- MODUS 2: HET VERTROUWDE BLOKKENSCHEMA (GRID) ---
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
        let teamTaken = window.teamTakenDB[uniekId] || {};     
        let persTaken = window.persoonsTakenDB[uniekId] || {}; 

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

        let renderTaak = (pId, defaultTeam) => {
            let css = ""; let text = "";
            if (pId && pId !== "Vrij" && pId !== "") {
                css = "taak-gevuld"; 
                let s = window.spelersDB.find(x => x.id === pId);
                let sr = window.scheidsrechtersDB.find(x => x.id === pId);
                text = s ? s.naam : (sr ? sr.naam : pId);
            } else {
                text = (!defaultTeam || defaultTeam === "Vrij" || defaultTeam === "") ? "Vrij" : `[${defaultTeam}]`; 
            }
            return { css, text };
        };

        let htmlTakenBlok = '';
        if (isThuis) {
            let pA = renderTaak(persTaken.sA, teamTaken.sA); let pB = renderTaak(persTaken.sB, teamTaken.sB);
            let pT = renderTaak(persTaken.tab, teamTaken.tab); let pS = renderTaak(persTaken.sco, teamTaken.sco);
            htmlTakenBlok = `
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">A:</span> <span class="taak-waarde ${pA.css}">${pA.text}</span></div>
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">B:</span> <span class="taak-waarde ${pB.css}">${pB.text}</span></div>
                </div>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">💻:</span> <span class="taak-waarde ${pT.css}">${pT.text}</span></div>
                    <div class="taak-regel" style="flex:1;"><span class="taak-label">⏱️:</span> <span class="taak-waarde ${pS.css}">${pS.text}</span></div>
                </div>`;
        } else {
            let p1 = renderTaak(persTaken.auto1, "Auto 1"); let p2 = renderTaak(persTaken.auto2, "Auto 2"); let p3 = renderTaak(persTaken.auto3, "Auto 3");
            htmlTakenBlok = `
                <div style="display:flex; flex-direction:column; gap:5px; margin-top:5px; border-top:1px dashed #3498db; padding-top:5px;">
                    <div class="taak-regel" style="border-color:#3498db;"><span class="taak-label">🚗 1:</span> <span class="taak-waarde ${p1.css}">${p1.text}</span></div>
                    <div style="display:flex; gap:5px;">
                        <div class="taak-regel" style="flex:1; border-color:#3498db;"><span class="taak-label">🚗 2:</span> <span class="taak-waarde ${p2.css}">${p2.text}</span></div>
                        <div class="taak-regel" style="flex:1; border-color:#3498db;"><span class="taak-label">🚗 3:</span> <span class="taak-waarde ${p3.css}">${p3.text}</span></div>
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
// 🧠 SLIMME CONFLICT ENGINE & CUSTOM DROPDOWN LOGICA
// ============================================================================
window.haalPersoonInfoOp = function(pId) {
    if (!pId || pId === "" || pId === "Vrij") return { naam: "Kies een persoon...", teamNaam: "", score: 0 };
    let s = window.spelersDB.find(x => x.id === pId);
    let sr = window.scheidsrechtersDB.find(x => x.id === pId);
    if (s) {
        let tCanon = window.getCanonicalTeam(s.teamId);
        return { naam: s.naam, teamNaam: tCanon ? tCanon.naam : s.teamId, score: window.globaleTakenScore[pId] || 0 };
    }
    if (sr) return { naam: sr.naam + ' (Scheids)', teamNaam: sr.gekoppeldTeam, score: window.globaleTakenScore[pId] || 0 };
    return { naam: "Onbekend (Handmatig)", teamNaam: "", score: window.globaleTakenScore[pId] || 0 };
};

window.checkPersoonBeschikbaarheid = function(pId, pTeamId, vereisteTaak, matchStartMin, matchEindMin, huidigeMatchId, speelDatum) {
    let status = 'groen'; let reden = ''; let isPriority = false;
    
    let sr = window.scheidsrechtersDB.find(s => s.id === pId);
    if (sr && window.beschikbaarheidDB[`${sr.id}_${speelDatum}`] === 'af') return { status: 'rood', reden: 'Afwezig in rooster', isPriority: false };

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => window.normaalDatum(w.Datum) === speelDatum && window.planStatusDB[window.genereerUniekId(w)] && !window.verborgenDB.includes(window.genereerUniekId(w)));

    let huidigeMatch = dagWedstrijden.find(m => window.genereerUniekId(m) === huidigeMatchId);
    let huidigeCanon = huidigeMatch ? window.getCanonicalTeam(huidigeMatch.Thuisteam.includes('Black Shots') ? huidigeMatch.Thuisteam.replace('Black Shots ', '') : huidigeMatch.Uitteam.replace('Black Shots ', '')) : null;

    if (huidigeCanon && pTeamId && huidigeCanon.id === pTeamId) {
        if (vereisteTaak === 'fluit') return { status: 'rood', reden: 'Speelt zelf', isPriority: false };
        else isPriority = true;
    }

    for (let w of dagWedstrijden) {
        let wId = window.genereerUniekId(w);
        if (wId === huidigeMatchId) continue;
        let wStatus = window.planStatusDB[wId];
        
        let wStart = window.tijdNaarMinuten(wStatus.tijd);
        let wDuur = w.handmatigeDuur || window.bepaalWedstrijdDuur((w.Thuisteam||'').replace('Black Shots ',''));
        let wEind = wStart + wDuur;

        if (matchStartMin < wEind && matchEindMin > wStart) {
            let takenElders = window.persoonsTakenDB[wId] || {};
            if (Object.values(takenElders).includes(pId)) return { status: 'rood', reden: `Heeft al taak om ${wStatus.tijd}`, isPriority: false };
            
            let wCanon = window.getCanonicalTeam(w.Thuisteam.includes('Black Shots') ? w.Thuisteam.replace('Black Shots ', '') : w.Uitteam.replace('Black Shots ', ''));
            if (wCanon && pTeamId && wCanon.id === pTeamId) return { status: 'rood', reden: `Speelt zelf om ${wStatus.tijd}`, isPriority: false };
        }
    }

    return { status, reden, isPriority };
};

window.genereerCustomDropdownUI = function(vakjeId, geselecteerdePersoonId, basisTeamNaam, vereisteTaak, startMin, eindMin, speelDatum, matchId) {
    let basisCanon = window.getCanonicalTeam(basisTeamNaam);
    let geschiktePersonen = [];

    window.spelersDB.forEach(s => {
        if (vereisteTaak === 'fluit' && s.magFluiten === false) return;
        if (vereisteTaak === 'tafel' && s.magTafelen === false) return;
        if (vereisteTaak === 'auto' && s.heeftAuto === false) return;
        geschiktePersonen.push({ id: s.id, naam: s.naam, teamId: s.teamId });
    });

    if (vereisteTaak === 'fluit' || vereisteTaak === 'tafel') {
        window.scheidsrechtersDB.forEach(sr => {
            let targetId = sr.gekoppeldLid ? sr.gekoppeldLid : sr.id;
            if (!geschiktePersonen.some(p => p.id === targetId)) {
                geschiktePersonen.push({ id: targetId, naam: sr.naam + ' (Scheids)', teamId: sr.gekoppeldTeam });
            }
        });
    }

    let lijstData = geschiktePersonen.map(p => {
        let pCanon = window.getCanonicalTeam(p.teamId);
        let weergaveTeam = pCanon ? pCanon.naam : (p.teamId || '-');
        let check = window.checkPersoonBeschikbaarheid(p.id, pCanon ? pCanon.id : null, vereisteTaak, startMin, eindMin, matchId, speelDatum);
        if (basisCanon && pCanon && pCanon.id === basisCanon.id && check.status === 'groen') check.isPriority = true;
        return { id: p.id, naam: p.naam, teamNaam: weergaveTeam, score: window.globaleTakenScore[p.id] || 0, status: check.status, reden: check.reden, isPriority: check.isPriority };
    });

    lijstData.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        if (a.status === 'groen' && b.status === 'rood') return -1;
        if (a.status === 'rood' && b.status === 'groen') return 1;
        return a.score - b.score; 
    });

    let lijstHtml = `<div class="nz-item" onclick="window.kiesPersoon('${vakjeId}', '', 'Kies een persoon...')"><div class="nz-item-top"><strong>-- Maak leeg (Vrij) --</strong></div></div>`;
    let getoondAanbevolen = false; let getoondOverig = false; let getoondOnbeschikbaar = false;

    lijstData.forEach(p => {
        let isGeselecteerd = (p.id === geselecteerdePersoonId) ? 'background:#eef2f5;' : '';
        let cssRood = p.status === 'rood' ? 'is-rood' : '';
        let badgeTeam = p.teamNaam !== '-' ? `<span class="nz-badge-team">${p.teamNaam}</span>` : '';
        let htmlReden = p.status === 'rood' ? `<span class="nz-reden">🚫 ${p.reden}</span>` : '';

        if (p.isPriority && p.status === 'groen' && !getoondAanbevolen) { lijstHtml += `<div class="nz-priority-header">🌟 Aanbevolen (Eigen Team)</div>`; getoondAanbevolen = true; }
        if (!p.isPriority && p.status === 'groen' && !getoondOverig) { lijstHtml += `<div class="nz-priority-header" style="background:#eef2f5; color:#7f8c8d; border-color:#cbd5e1;">🌐 Alle beschikbare leden</div>`; getoondOverig = true; }
        if (p.status === 'rood' && !getoondOnbeschikbaar) { lijstHtml += `<div class="nz-priority-header" style="background:#fadbd8; color:#c0392b; border-color:#f5b7b1;">🚫 Onbeschikbaar / Overlap</div>`; getoondOnbeschikbaar = true; }

        let escapeNaam = p.naam.replace(/'/g, "\\'");
        lijstHtml += `
            <div class="nz-item ${cssRood} search-item" data-search="${p.naam.toLowerCase()} ${p.teamNaam.toLowerCase()}" style="${isGeselecteerd}" onclick="window.kiesPersoon('${vakjeId}', '${p.id}', '${escapeNaam}')">
                <div class="nz-item-top">
                    <span><strong>${p.naam}</strong> <span class="nz-badge-score">${p.score}x</span></span>
                    ${badgeTeam}
                </div>
                ${htmlReden}
            </div>`;
    });

    let displayInfo = window.haalPersoonInfoOp(geselecteerdePersoonId);
    let btnText = geselecteerdePersoonId ? `${displayInfo.naam}` : 'Kies een persoon...';

    return `
        <div class="nz-container" id="nz-${vakjeId}">
            <div class="nz-header" onclick="window.toggleDropdown('${vakjeId}')">
                <span id="nz-display-${vakjeId}">${btnText}</span><span>▼</span>
            </div>
            <div class="nz-body" id="nz-body-${vakjeId}">
                <input type="text" class="nz-search" placeholder="🔍 Zoek speler of team..." onkeyup="window.filterDropdown('${vakjeId}', this.value)" onclick="event.stopPropagation();">
                <div class="nz-lijst" id="nz-lijst-${vakjeId}">${lijstHtml}</div>
            </div>
            <input type="hidden" id="pers-${vakjeId}" value="${geselecteerdePersoonId || ''}">
        </div>
    `;
};

window.toggleDropdown = function(vakjeId) {
    let body = document.getElementById(`nz-body-${vakjeId}`);
    let isZichtbaar = body.style.display === 'block';
    document.querySelectorAll('.nz-body').forEach(el => el.style.display = 'none'); 
    if (!isZichtbaar) { body.style.display = 'block'; body.querySelector('.nz-search').focus(); }
};

window.kiesPersoon = function(vakjeId, pId, pNaam) {
    document.getElementById(`pers-${vakjeId}`).value = pId;
    document.getElementById(`nz-display-${vakjeId}`).innerText = pNaam;
    document.getElementById(`nz-body-${vakjeId}`).style.display = 'none';
};

window.filterDropdown = function(vakjeId, term) {
    let lowerTerm = term.toLowerCase();
    let items = document.querySelectorAll(`#nz-lijst-${vakjeId} .search-item`);
    items.forEach(el => {
        if (el.getAttribute('data-search').includes(lowerTerm)) el.style.display = 'flex';
        else el.style.display = 'none';
    });
};

document.addEventListener('click', function(event) {
    if (!event.target.closest('.nz-container')) {
        document.querySelectorAll('.nz-body').forEach(el => el.style.display = 'none');
    }
});

// ============================================================================
// 📋 OPEN MODAL EN OPSLAAN
// ============================================================================
window.openNamenModal = function(matchId) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => window.genereerUniekId(w) === matchId);
    if (!match) return;

    let isThuis = (match.Thuisteam || '').toLowerCase().includes('black shots');
    let speelTeamNaam = isThuis ? (match.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (match.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();

    let dbStatus = window.planStatusDB[matchId];
    let startMin = window.tijdNaarMinuten(dbStatus.tijd);
    let eindMin = startMin + (match.handmatigeDuur || window.bepaalWedstrijdDuur(speelTeamNaam));
    let speelDatum = window.normaalDatum(match.Datum);

    document.getElementById('namen-match-id').value = matchId;
    document.getElementById('namen-match-titel').innerText = `${isThuis ? '🏠 Thuis:' : '🚌 Uit:'} ${speelTeamNaam} vs ${isThuis?match.Uitteam:match.Thuisteam}`;
    
    let teamTaken = window.teamTakenDB[matchId] || {};
    let persTaken = window.persoonsTakenDB[matchId] || {};
    let veldenHtml = '';

    if (isThuis) {
        let tA_naam = (teamTaken.sA || '').replace(/ouders/i,'').trim(); let tB_naam = (teamTaken.sB || '').replace(/ouders/i,'').trim();
        let tTab_naam = (teamTaken.tab || '').replace(/ouders/i,'').trim(); let tSco_naam = (teamTaken.sco || '').replace(/ouders/i,'').trim();

        veldenHtml = `
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">👨‍⚖️ Scheids A (Team: ${teamTaken.sA||'?'})</label>${window.genereerCustomDropdownUI('sA', persTaken.sA, tA_naam, 'fluit', startMin, eindMin, speelDatum, matchId)}</div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">👨‍⚖️ Scheids B (Team: ${teamTaken.sB||'?'})</label>${window.genereerCustomDropdownUI('sB', persTaken.sB, tB_naam, 'fluit', startMin, eindMin, speelDatum, matchId)}</div>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">💻 Tablet (Team: ${teamTaken.tab||'?'})</label>${window.genereerCustomDropdownUI('tab', persTaken.tab, tTab_naam, 'tafel', startMin, eindMin, speelDatum, matchId)}</div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">⏱️ Scorebord (Team: ${teamTaken.sco||'?'})</label>${window.genereerCustomDropdownUI('sco', persTaken.sco, tSco_naam, 'tafel', startMin, eindMin, speelDatum, matchId)}</div>
            </div>`;
    } else {
        veldenHtml = `
            <div style="margin-bottom:15px;"><label style="font-weight:bold; font-size:0.85rem; color:#3498db;">🚗 Chauffeur 1 (Vanuit ${speelTeamNaam})</label>${window.genereerCustomDropdownUI('auto1', persTaken.auto1, speelTeamNaam, 'auto', startMin, eindMin, speelDatum, matchId)}</div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">🚗 Chauffeur 2</label>${window.genereerCustomDropdownUI('auto2', persTaken.auto2, speelTeamNaam, 'auto', startMin, eindMin, speelDatum, matchId)}</div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">🚗 Chauffeur 3</label>${window.genereerCustomDropdownUI('auto3', persTaken.auto3, speelTeamNaam, 'auto', startMin, eindMin, speelDatum, matchId)}</div>
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
    window.schoonPersoonsTakenOp();
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
        window.schoonPersoonsTakenOp();
        window.berekenGlobaleScores();
        window.laadNamenBord();
    }
};

// ============================================================================
// 🤖 DE SLIMME BOTS (AUTOMATISCH INVULLEN)
// ============================================================================

// Helper: Welke wedstrijden heeft de gebruiker nú in beeld?
window.getZichtbareWedstrijden = function() {
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];

    if (window.huidigeWeergave === 'grid') {
        return alleWedstrijden.filter(w => {
            let id = window.genereerUniekId(w);
            return window.normaalDatum(w.Datum) === speelDatum && window.planStatusDB[id] && !window.verborgenDB.includes(id);
        });
    } else {
        let periode = document.getElementById('filter-periode') ? document.getElementById('filter-periode').value : 'dag';
        let locatie = document.getElementById('filter-locatie') ? document.getElementById('filter-locatie').value : 'alles';
        let hoofdCb = document.getElementById('cb-alle-teams');
        let isAllesAangevinkt = hoofdCb ? hoofdCb.checked : true;
        let actieveTeams = [];
        if (!isAllesAangevinkt) document.querySelectorAll('.team-filter-cb').forEach(cb => { if(cb.checked) actieveTeams.push(cb.value); });

        return alleWedstrijden.filter(w => {
            let id = window.genereerUniekId(w);
            if (window.verborgenDB.includes(id)) return false;
            if (periode === 'dag' && window.normaalDatum(w.Datum) !== speelDatum) return false;
            if (!window.planStatusDB[id]) return false; 
            
            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            if (locatie === 'thuis' && !isThuis) return false;
            if (locatie === 'uit' && isThuis) return false;

            if (!isAllesAangevinkt) {
                if (actieveTeams.length === 0) return false; 
                let wCanon = window.getCanonicalTeam(isThuis ? w.Thuisteam.replace(/Black Shots\s*-?\s*/i, '') : w.Uitteam.replace(/Black Shots\s*-?\s*/i, ''));
                if (!wCanon || !actieveTeams.includes(wCanon.id)) return false;
            }
            return true;
        });
    }
};

window.voerBotUit = function(isThuisBot) {
    let wedstrijden = window.getZichtbareWedstrijden();
    let aantalGevuld = 0;

    // We lopen door alle zichtbare wedstrijden
    wedstrijden.forEach(w => {
        let isThuisWedstrijd = (w.Thuisteam || '').toLowerCase().includes('black shots');
        if (isThuisBot && !isThuisWedstrijd) return;
        if (!isThuisBot && isThuisWedstrijd) return;

        let matchId = window.genereerUniekId(w);
        let dbStatus = window.planStatusDB[matchId];
        let speelDatum = window.normaalDatum(w.Datum);
        let speelTeamNaam = isThuisWedstrijd ? (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
        
        let startMin = window.tijdNaarMinuten(dbStatus.tijd);
        let eindMin = startMin + (w.handmatigeDuur || window.bepaalWedstrijdDuur(speelTeamNaam));

        let teamTaken = window.teamTakenDB[matchId] || {};
        let persTaken = window.persoonsTakenDB[matchId] || {};
        let gewijzigd = false;

        let rollen = isThuisBot ? ['sA', 'sB', 'tab', 'sco'] : ['auto1', 'auto2', 'auto3'];

        rollen.forEach(rol => {
            // Pas invullen als het vakje écht nog leeg is
            if (!persTaken[rol] || persTaken[rol] === "Vrij") {
                let vereisteTaak = (rol === 'sA' || rol === 'sB') ? 'fluit' : (rol === 'tab' || rol === 'sco' ? 'tafel' : 'auto');
                let doelTeamNaam = isThuisBot ? teamTaken[rol] : speelTeamNaam;
                
                if (!doelTeamNaam || doelTeamNaam === "Vrij") return;

                // 🚀 FIX: Haal "Ouders", "Ouders van" of "Team" eruit zodat de bot het pure team overhoudt!
                let opgeschoondeTeamNaam = doelTeamNaam.replace(/ouders( van)?/i, '').replace(/team/i, '').trim();

                let doelTeamCanon = window.getCanonicalTeam(opgeschoondeTeamNaam);
                if (!doelTeamCanon) return; 

                let kandidaten = [];
                
                // Zoek alle spelers uit dat specifieke team
                window.spelersDB.forEach(s => {
                    let sCanon = window.getCanonicalTeam(s.teamId);
                    if (!sCanon || sCanon.id !== doelTeamCanon.id) return; 
                    
                    if (vereisteTaak === 'fluit' && s.magFluiten === false) return;
                    if (vereisteTaak === 'tafel' && s.magTafelen === false) return;
                    if (vereisteTaak === 'auto' && s.heeftAuto === false) return;
                    
                    // Bot mag NOOIT 2x dezelfde persoon in 1 wedstrijd stoppen (bijv 2 auto's rijden)
                    if (Object.values(persTaken).includes(s.id)) return;

                    // Laat de slimme engine checken of ze overlappen
                    let check = window.checkPersoonBeschikbaarheid(s.id, s.teamId, vereisteTaak, startMin, eindMin, matchId, speelDatum);
                    if (check.status === 'groen') {
                        kandidaten.push(s.id);
                    }
                });

                // Sorteer op minste taken (eerlijk verdelen!)
                if (kandidaten.length > 0) {
                    kandidaten.sort((a, b) => (window.globaleTakenScore[a] || 0) - (window.globaleTakenScore[b] || 0));
                    let gekozenId = kandidaten[0];
                    
                    persTaken[rol] = gekozenId;
                    
                    // Update scores direct in het geheugen, anders deelt hij 2 wedstrijden achter elkaar aan dezelfde uit!
                    window.globaleTakenScore[gekozenId] = (window.globaleTakenScore[gekozenId] || 0) + 1; 
                    window.persoonsTakenDB[matchId] = persTaken;
                    
                    gewijzigd = true;
                    aantalGevuld++;
                }
            }
        });
    });

    if (aantalGevuld > 0) {
        localStorage.setItem('blackshots_persoons_taken', JSON.stringify(window.persoonsTakenDB));
        window.berekenGlobaleScores(); 
        window.laadNamenBord();
        alert(`✅ Bot klaar! Er zijn ${aantalGevuld} gaten eerlijk & automatisch ingevuld.`);
    } else {
        alert("🤖 Bot kon niemand vinden. Iedereen is op, heeft een overlap-conflict, of de geselecteerde lijst was al vol.");
    }
};

// ============================================================================
// 📤 EXPORTEER NAAR WHATSAPP & PDF (Op basis van wat zichtbaar is!)
// ============================================================================
window.kopieerNamenSchema = function() {
    let wedstrijden = window.getZichtbareWedstrijden();
    if (wedstrijden.length === 0) return alert("Er zijn geen wedstrijden zichtbaar om te kopiëren. Pas je filters aan!");

    let text = "🏀 *Black Shots - Scheidsrechter & Taken Schema* 🏀\n";
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
    let weergaveTxt = window.huidigeWeergave === 'grid' ? `Speeldag: ${speelDatum}` : `Geselecteerde Filterlijst`;
    text += `_${weergaveTxt}_\n\n`;

    wedstrijden.forEach(w => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let wedstrijdNaam = isThuis ? (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
        let tegenstander = isThuis ? (w.Uitteam || '').replace(/Black Shots\s*-?\s*/i, '').trim() : (w.Thuisteam || '').replace(/Black Shots\s*-?\s*/i, '').trim();
        
        let matchId = window.genereerUniekId(w);
        let dbStatus = window.planStatusDB[matchId];
        let teamTaken = window.teamTakenDB[matchId] || {};
        let persTaken = window.persoonsTakenDB[matchId] || {};

        // Helper om te zien of we een naam, een vergeten team, of "Vrij" moeten opschrijven
        let naamWeergave = (pId, defTeam) => {
            if (pId && pId !== "Vrij" && pId !== "") {
                let s = window.spelersDB.find(x => x.id === pId);
                let sr = window.scheidsrechtersDB.find(x => x.id === pId);
                return s ? s.naam : (sr ? sr.naam : pId);
            }
            return (!defTeam || defTeam === "Vrij" || defTeam === "") ? "Vrij" : `[Nog in te vullen door: ${defTeam}]`;
        };

        text += `${isThuis ? '🏠' : '🚌'} *${wedstrijdNaam}* vs ${tegenstander}\n`;
        text += `⏱️ ${dbStatus.tijd} | 📅 ${window.normaalDatum(w.Datum)}\n`;

        if (isThuis) {
            text += `👨‍⚖️ Scheids A: ${naamWeergave(persTaken.sA, teamTaken.sA)}\n`;
            text += `👨‍⚖️ Scheids B: ${naamWeergave(persTaken.sB, teamTaken.sB)}\n`;
            text += `💻 Tablet: ${naamWeergave(persTaken.tab, teamTaken.tab)}\n`;
            text += `⏱️ Scorebord: ${naamWeergave(persTaken.sco, teamTaken.sco)}\n`;
        } else {
            text += `🚗 Auto 1: ${naamWeergave(persTaken.auto1, "Auto 1")}\n`;
            text += `🚗 Auto 2: ${naamWeergave(persTaken.auto2, "Auto 2")}\n`;
            text += `🚗 Auto 3: ${naamWeergave(persTaken.auto3, "Auto 3")}\n`;
        }
        text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Tekst succesvol gekopieerd! Je kunt het nu direct in de club WhatsApp plakken.");
    }).catch(err => {
        alert("Kopiëren mislukt. Fout: " + err);
    });
};

window.downloadPDF = function() {
    // Dit roept de print-engine van Windows/Mac/Telefoon op. 
    // Doordat we in CSS '@media print' hebben toegevoegd, ziet de PDF er loepzuiver uit!
    window.print();
};

window.botVulThuisIn = function() { window.voerBotUit(true); };
window.botVulUitIn = function() { window.voerBotUit(false); };