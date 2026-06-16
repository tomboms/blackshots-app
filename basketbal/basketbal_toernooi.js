// --- BASKETBAL_TOERNOOI.JS ---

window.toernooiDB = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
let actieveCompId = null;
let actieveLiveMatchId = null;
window.collapsedTeams = window.collapsedTeams || [];

window.vulToernooiSelect = function() {
    let select = document.getElementById('toernooi-select');
    if (!select) return;
    select.innerHTML = '';
    
    let keys = Object.keys(window.toernooiDB);
    if (keys.length === 0) {
        select.innerHTML = `<option value="">-- Geen toernooien --</option>`;
        actieveCompId = null;
    } else {
        keys.forEach(key => { 
            let tNaam = window.toernooiDB[key].naam || 'Toernooi';
            select.innerHTML += `<option value="${key}">${tNaam}</option>`; 
        });
        if (!actieveCompId || !window.toernooiDB[actieveCompId]) actieveCompId = keys[0];
        select.value = actieveCompId;
    }
    window.renderToernooi();
};

window.wisselToernooi = function() {
    actieveCompId = document.getElementById('toernooi-select').value;
    window.renderToernooi();
};

window.maakNieuweCompetitie = function() {
    let naam = prompt("Naam van het nieuwe toernooi?");
    if (!naam) return;
    let id = 'comp_' + Date.now();
    window.toernooiDB[id] = { naam: naam, teams: [], wedstrijden: [] };
    actieveCompId = id;
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.vulToernooiSelect();
};

window.verwijderCompetitie = function() {
    if (!actieveCompId) return;
    if (confirm(`Weet je zeker dat je toernooi "${window.toernooiDB[actieveCompId].naam}" wilt wissen?`)) {
        delete window.toernooiDB[actieveCompId];
        actieveCompId = null;
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.vulToernooiSelect();
    }
};

window.toggleShowMode = function() {
    document.body.classList.toggle('show-mode');
    if (document.body.classList.contains('show-mode') && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e=>e);
    } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(e=>e);
    }
};

window.toggleTeamCollapse = function(teamId) {
    if (window.collapsedTeams.includes(teamId)) window.collapsedTeams = window.collapsedTeams.filter(id => id !== teamId);
    else window.collapsedTeams.push(teamId);
    window.renderToernooi();
};
// ============================================================================
// HARDE SYNC NAAR JAARPLANNING (Geen checks, gewoon pushen!)
// ============================================================================
// Helper om te zorgen dat het ECHT naar Firebase gaat
window.slaDataOp = function(sleutel, data) {
    localStorage.setItem(sleutel, JSON.stringify(data));
    if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase(sleutel, data);
    else if (typeof window.bewaarNaarFirebase === 'function') window.bewaarNaarFirebase(sleutel, data);
    else document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: sleutel, data: data } }));
};

window.syncToernooiNaarJaarplanning = function() {
    if (!actieveCompId || !window.toernooiDB[actieveCompId]) return alert("Geen toernooi actief!");
    
    // FIX 1: Veranderd naar blackshots_jaarplanning_data
    let planningDB = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
    let comp = window.toernooiDB[actieveCompId];
    const berekendeStand = window.berekenStand(comp);
    
    let matchenPerDatum = {};
    
    // Groepeer alle wedstrijden netjes per datum
    comp.wedstrijden.forEach(w => {
        if (!w.datum) return;
        
        let dStr = w.datum;
        let isoDatum = dStr;
        // Fix de datum van "8-jun" naar "2026-06-08" voor de agenda
        if (/^\d{1,2}-[a-z]{3}$/i.test(dStr)) {
            let maanden = { 'jan':'01', 'feb':'02', 'mrt':'03', 'apr':'04', 'mei':'05', 'jun':'06', 'jul':'07', 'aug':'08', 'sep':'09', 'okt':'10', 'nov':'11', 'dec':'12' };
            let delen = dStr.toLowerCase().split('-');
            let jaar = new Date().getFullYear(); 
            isoDatum = `${jaar}-${maanden[delen[1]]}-${delen[0].padStart(2, '0')}`;
        }

        if (!matchenPerDatum[isoDatum]) matchenPerDatum[isoDatum] = [];
        matchenPerDatum[isoDatum].push(w);
    });

    let toegevoegd = 0;
    let geupdate = 0;

    Object.keys(matchenPerDatum).forEach(isoDatum => {
        let matchesOpDag = matchenPerDatum[isoDatum];
        let startTijd = "17:00"; // Standaard tijd
        
        // Bepaal de vroegste starttijd voor in de agenda
        matchesOpDag.forEach(w => {
            if (w.tijd && (!startTijd || w.tijd < startTijd)) startTijd = w.tijd;
        });

        // 📝 Bouw het gedetailleerde overzicht voor de Notities op!
        let beschrijving = `Automatisch toegevoegd vanuit de Toernooi module: ${comp.naam}\n\nWedstrijdprogramma voor deze dag:\n`;
        
        matchesOpDag.sort((a,b) => (a.tijd||'').localeCompare(b.tijd||'')).forEach(w => {
            let tThuis = getTeamWeergave(w.thuis, berekendeStand, comp.teams).naam;
            let tUit = getTeamWeergave(w.uit, berekendeStand, comp.teams).naam;
            let locatie = w.veld || "Onbekend";
            beschrijving += `• ${w.tijd || '??:??'} | ${tThuis} vs ${tUit} (${locatie})\n`;
        });

        let uniekId = `toernooi_${actieveCompId}_${isoDatum}`;
        let bestaandeIndex = planningDB.findIndex(item => item.id === uniekId);

        let act = {
            id: uniekId,
            type: 'training', // Wordt gezien als legitieme actie voor zaalhuur
            titel: `🏆 ${comp.naam}`,
            tekst: `🏆 ${comp.naam}`,
            datum: isoDatum,
            isoDatum: isoDatum,
            eindDatum: isoDatum, 
            tijd: startTijd,
            locatie: "De Veste",
            kleur: "#16a085",
            omschrijving: beschrijving
        };

        if (bestaandeIndex > -1) {
            planningDB[bestaandeIndex] = act;
            geupdate++;
        } else {
            planningDB.push(act);
            toegevoegd++;
        }
    });

    // FIX 2: Veranderd naar blackshots_jaarplanning_data
    window.slaDataOp('blackshots_jaarplanning_data', planningDB);
    
    alert(`✅ Toernooi gesynchroniseerd met de Jaarplanning!\n\nNieuwe speeldagen in agenda: ${toegevoegd}\nBestaande speeldagen geüpdatet: ${geupdate}\n\nKijk in de Notities van de Jaarplanning voor het gedetailleerde programma.`);
};
window.berekenStand = function(comp) {
    let stand = {};
    comp.teams.forEach(t => stand[t.id] = { id: t.id, naam: t.naam || 'Onbekend', kleur: t.kleur, p: 0, w: 0, g: 0, v: 0, voor: 0, tegen: 0, punten: 0 });

    comp.wedstrijden.forEach(w => {
        let thuisId = w.thuis; let uitId = w.uit;
        if (w.scoreThuis !== null && w.scoreUit !== null && stand[thuisId] && stand[uitId]) {
            let st = parseInt(w.scoreThuis) || 0; let su = parseInt(w.scoreUit) || 0;
            stand[thuisId].p++; stand[uitId].p++;
            stand[thuisId].voor += st; stand[thuisId].tegen += su;
            stand[uitId].voor += su; stand[uitId].tegen += st;

            if (st > su) { stand[thuisId].w++; stand[uitId].v++; stand[thuisId].punten += 2; } 
            else if (su > st) { stand[uitId].w++; stand[thuisId].v++; stand[uitId].punten += 2; } 
            else { stand[thuisId].g++; stand[uitId].g++; stand[thuisId].punten += 1; stand[uitId].punten += 1; }
        }
    });
    return Object.values(stand).sort((a,b) => b.punten - a.punten || (b.voor - b.tegen) - (a.voor - a.tegen));
};

window.manualScoreChange = function(matchId) {
    const comp = window.toernooiDB[actieveCompId];
    const match = comp.wedstrijden.find(w => w.id === matchId);
    let tVal = document.getElementById(`sc_thuis_${matchId}`).value;
    let uVal = document.getElementById(`sc_uit_${matchId}`).value;
    
    match.scoreThuis = tVal !== "" ? parseInt(tVal) : null;
    match.scoreUit = uVal !== "" ? parseInt(uVal) : null;
    
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

function getTeamWeergave(teamId, actueleStand, alleTeams) {
    if (teamId === 'nr1') return actueleStand[0] ? { naam: `[Nr 1] ${actueleStand[0].naam}`, kleur: '#f1c40f' } : { naam: "Nr 1 (Stand)", kleur: '#f1c40f' };
    if (teamId === 'nr2') return actueleStand[1] ? { naam: `[Nr 2] ${actueleStand[1].naam}`, kleur: '#95a5a6' } : { naam: "Nr 2 (Stand)", kleur: '#95a5a6' };
    if (teamId === 'nr3') return actueleStand[2] ? { naam: `[Nr 3] ${actueleStand[2].naam}`, kleur: '#d35400' } : { naam: "Nr 3 (Stand)", kleur: '#d35400' };
    if (teamId === 'nr4') return actueleStand[3] ? { naam: `[Nr 4] ${actueleStand[3].naam}`, kleur: '#3498db' } : { naam: "Nr 4 (Stand)", kleur: '#3498db' };
    
    let t = alleTeams.find(x => x.id === teamId);
    return t ? { naam: t.naam, kleur: t.kleur } : { naam: "N.n.b.", kleur: "#333" };
}

function slimmeDatumSorteerder(dStr) {
    if (!dStr) return 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return new Date(dStr).getTime();
    let maanden = { 'jan':1, 'feb':2, 'mrt':3, 'apr':4, 'mei':5, 'jun':6, 'jul':7, 'aug':8, 'sep':9, 'okt':10, 'nov':11, 'dec':12 };
    let delen = dStr.toLowerCase().split('-');
    if (delen.length === 2 && maanden[delen[1]]) {
        return new Date(new Date().getFullYear(), maanden[delen[1]] - 1, parseInt(delen[0])).getTime();
    }
    return new Date(dStr).getTime() || 0;
}

window.genereerToernooiBericht = function() {
    if (!actieveCompId || !window.toernooiDB[actieveCompId]) return alert("Geen toernooi geselecteerd.");
    
    const comp = window.toernooiDB[actieveCompId];
    const berekendeStand = window.berekenStand(comp);
    
    let maxSpelers = 0;
    let teamKolommen = comp.teams.map(t => {
        let spelersNamen = t.spelers.map(sId => {
            let sObj = (window.spelersDB || []).find(s => s.id === sId || s.naam === sId);
            return sObj ? sObj.naam : sId;
        });
        if (spelersNamen.length > maxSpelers) maxSpelers = spelersNamen.length;
        return { naam: t.naam, spelers: spelersNamen };
    });

    let teamTabelHTML = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px; text-align: left;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                ${teamKolommen.map(t => `<th>${t.naam}</th>`).join('')}
            </tr>
        </thead>
        <tbody>`;
    
    for (let i = 0; i < Math.max(maxSpelers, 1); i++) {
        teamTabelHTML += `<tr>`;
        teamKolommen.forEach(t => {
            teamTabelHTML += `<td>${t.spelers[i] ? (i + 1) + '. ' + t.spelers[i] : ''}</td>`;
        });
        teamTabelHTML += `</tr>`;
    }
    teamTabelHTML += `</tbody></table>`;

    let matchenPerDatum = {};
    comp.wedstrijden.forEach(w => {
        let d = w.datum || 'Onbekend';
        if (!matchenPerDatum[d]) matchenPerDatum[d] = [];
        matchenPerDatum[d].push(w);
    });
    let gesorteerdeDatums = Object.keys(matchenPerDatum).sort((a,b) => slimmeDatumSorteerder(a) - slimmeDatumSorteerder(b));

    let schemaTabelHTML = `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px; text-align: left;">
        <thead>
            <tr style="background-color: #f2f2f2;">
                <th>Datum</th><th>Thuis</th><th>Uit</th><th>Tijd</th><th>Veld</th>
            </tr>
        </thead>
        <tbody>`;
    
    gesorteerdeDatums.forEach(datum => {
        matchenPerDatum[datum].sort((a,b) => (a.tijd||'').localeCompare(b.tijd||'')).forEach(w => {
            let tThuis = getTeamWeergave(w.thuis, berekendeStand, comp.teams);
            let tUit = getTeamWeergave(w.uit, berekendeStand, comp.teams);
            schemaTabelHTML += `<tr>
                <td>${datum}</td>
                <td><strong>${tThuis.naam}</strong></td>
                <td>${tUit.naam}</td>
                <td>${w.tijd}</td>
                <td>${w.veld}</td>
            </tr>`;
        });
    });
    schemaTabelHTML += `</tbody></table>`;

    let htmlContent = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">
            <p>Beste ouders,</p>
            <p>Op maandag gaat de interne competitie weer van start!<br>
            De trainingen zien er daarom anders uit. Op deze dagen houden we geen traditionele training, maar spelen we wedstrijden onderling.</p>
            
            ${teamTabelHTML}
            
            <p>De wedstrijden beginnen op de geplande tijd met 10 minuten warming-up, met vervolgens 4 keer 10 minuten doorlopende speeltijd.</p>
            <p>Het eerstgenoemde team is het thuisteam en speelt in het zwart, het tweede team speelt in een andere kleur.</p>
            
            ${schemaTabelHTML}
            
            <p>Bij vragen hoor ik het graag!</p>
        </div>
    `;

    let modal = document.getElementById('mail-preview-modal');
    if (!modal) {
        let mDiv = document.createElement('div');
        mDiv.id = 'mail-preview-modal';
        mDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:none; justify-content:center; align-items:center; z-index:999999; backdrop-filter:blur(3px); overflow-y:auto; padding:20px;';
        mDiv.innerHTML = `
            <div style="background:white; padding:0; border-radius:12px; width:100%; max-width:850px; box-shadow:0 10px 30px rgba(0,0,0,0.4); display:flex; flex-direction:column; overflow:hidden;">
                <div style="background:#fdfdfd; padding:20px 25px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0; color:#e67e22; font-size:1.4rem;">✉️ Bericht Kopiëren</h2>
                    <button onclick="document.getElementById('mail-preview-modal').style.display='none'" style="background:none; border:none; font-size:1.5rem; color:#bdc3c7; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:20px 25px; background:#fafafa; border-bottom:1px solid #eee;">
                    <p style="margin:0 0 15px 0; color:#7f8c8d; font-size:0.95rem;">Klik op de groene knop om alles in één keer te kopiëren. Plak het daarna in Gmail of Outlook (Ctrl+V) en de tabellen komen perfect mee!</p>
                    <button onclick="window.kopieerHTMLMail()" style="width:100%; background:#27ae60; color:white; border:none; padding:15px; border-radius:6px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 6px rgba(39, 174, 96, 0.2);">📋 Kopieer Bericht naar Klembord</button>
                </div>
                <div id="html-mail-container" style="padding:30px; overflow-y:auto; max-height:50vh; background:white; border:2px dashed #bdc3c7; margin:20px; border-radius:8px;"></div>
            </div>
        `;
        document.body.appendChild(mDiv);
        modal = mDiv;
    }

    document.getElementById('html-mail-container').innerHTML = htmlContent;
    modal.style.display = 'flex';
};

window.kopieerHTMLMail = function() {
    let container = document.getElementById('html-mail-container');
    let range = document.createRange();
    range.selectNodeContents(container);
    let sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("copy");
    sel.removeAllRanges();
    document.getElementById('mail-preview-modal').style.display = 'none';
    alert("✅ Gekopieerd! Je kunt het bericht (inclusief tabellen!) nu plakken in je e-mail.");
};

window.verplaatsSpeler = function(vanTeamId, spelerId, naarTeamId) {
    if (!naarTeamId) return; 
    let comp = window.toernooiDB[actieveCompId];
    
    let vanTeam = comp.teams.find(t => t.id === vanTeamId);
    if (vanTeam) vanTeam.spelers = vanTeam.spelers.filter(s => s !== spelerId);
    
    let naarTeam = comp.teams.find(t => t.id === naarTeamId);
    if (naarTeam && !naarTeam.spelers.includes(spelerId)) {
        naarTeam.spelers.push(spelerId);
    }
    
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};


// --- HOOFD RENDERER ---
window.renderToernooi = function() {
    if (!actieveCompId || !window.toernooiDB[actieveCompId]) {
        if(document.getElementById('toernooi-stand')) document.getElementById('toernooi-stand').innerHTML = "<p>Maak een toernooi aan.</p>";
        if(document.getElementById('toernooi-schema')) document.getElementById('toernooi-schema').innerHTML = "";
        if(document.getElementById('toernooi-teams')) document.getElementById('toernooi-teams').innerHTML = "";
        return;
    }

    const comp = window.toernooiDB[actieveCompId];
    const berekendeStand = window.berekenStand(comp);

    let thuisSelect = document.getElementById('nw_thuis');
    let uitSelect = document.getElementById('nw_uit');
    if (thuisSelect && uitSelect) {
        let opties = '<option value="">-- Team --</option>';
        comp.teams.forEach(t => { opties += `<option value="${t.id}">${t.naam || 'Onbekend'}</option>`; });
        
        opties += `
            <optgroup label="Plaatsing / Finales">
                <option value="nr1">[Nr 1] in Stand</option>
                <option value="nr2">[Nr 2] in Stand</option>
                <option value="nr3">[Nr 3] in Stand</option>
                <option value="nr4">[Nr 4] in Stand</option>
            </optgroup>
        `;
        thuisSelect.innerHTML = opties; uitSelect.innerHTML = opties;
    }

    // 1. STAND RENDERN
    let standHtml = `<table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.95rem;">
        <tr style="border-bottom:2px solid #bdc3c7; color:#7f8c8d;">
            <th style="padding:10px 5px;">#</th><th style="padding:10px 5px;">Team</th><th style="padding:10px 5px;">G</th>
            <th style="padding:10px 5px;">W-V</th><th style="padding:10px 5px;">Saldo</th><th style="padding:10px 5px; font-size:1.1rem; color:black;">Pnt</th>
        </tr>`;
    berekendeStand.forEach((team, idx) => {
        let saldo = team.voor - team.tegen;
        standHtml += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px 5px; font-weight:bold;">${idx + 1}</td>
            <td style="padding:10px 5px; font-weight:bold; color:${team.kleur};">${team.naam}</td>
            <td style="padding:10px 5px;">${team.p}</td><td style="padding:10px 5px;">${team.w}-${team.v}</td>
            <td style="padding:10px 5px; font-weight:bold; color:${saldo >= 0 ? '#27ae60' : '#e74c3c'};">${saldo > 0 ? '+' : ''}${saldo}</td>
            <td style="padding:10px 5px; font-weight:bold; font-size:1.1rem;">${team.punten}</td>
        </tr>`;
    });
    standHtml += `</table>`;
    if(document.getElementById('toernooi-stand')) document.getElementById('toernooi-stand').innerHTML = standHtml;

    // 2. SCHEMA RENDERN
    let schemaHtml = '';
    let matchenPerDatum = {};

    comp.wedstrijden.forEach(w => {
        let d = w.datum || 'Onbekend';
        if (!matchenPerDatum[d]) matchenPerDatum[d] = [];
        matchenPerDatum[d].push(w);
    });

    let gesorteerdeDatums = Object.keys(matchenPerDatum).sort((a,b) => slimmeDatumSorteerder(a) - slimmeDatumSorteerder(b));

    if (gesorteerdeDatums.length === 0) {
        schemaHtml = "<p style='color:#7f8c8d;'>Nog geen wedstrijden ingepland.</p>";
    } else {
        gesorteerdeDatums.forEach(datum => {
            schemaHtml += `<div style="background:#eef2f5; padding:8px 15px; border-radius:4px; margin-top:15px; font-weight:bold; color:var(--secondary-color); display:flex; align-items:center; gap:8px;">🗓️ Speeldag: ${datum}</div>`;
            
            matchenPerDatum[datum].sort((a,b) => (a.tijd||'').localeCompare(b.tijd||'')).forEach(w => {
                let tThuis = getTeamWeergave(w.thuis, berekendeStand, comp.teams);
                let tUit = getTeamWeergave(w.uit, berekendeStand, comp.teams);

                let scT = w.scoreThuis !== null ? w.scoreThuis : '';
                let scU = w.scoreUit !== null ? w.scoreUit : '';

                schemaHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:12px; border:1px solid #ddd; border-radius:4px; margin-top:8px; flex-wrap:wrap; gap:10px; border-left:4px solid ${tThuis.kleur}">
                        <div style="font-size:0.85rem; color:#7f8c8d; min-width:80px;">
                            🕒 ${w.tijd} <br> 📍 ${w.veld}
                        </div>
                        <div style="flex:1; display:flex; justify-content:center; align-items:center; gap:10px; min-width:250px;">
                            <strong style="color:${tThuis.kleur}; text-align:right; flex:1; font-size:1rem;">${tThuis.naam}</strong>
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="number" id="sc_thuis_${w.id}" value="${scT}" style="width:60px; padding:6px; text-align:center; font-size:1.1rem; border:1px solid #bdc3c7; border-radius:4px; font-weight:bold;" onchange="window.manualScoreChange('${w.id}')">
                                <span style="color:#bdc3c7;">-</span>
                                <input type="number" id="sc_uit_${w.id}" value="${scU}" style="width:60px; padding:6px; text-align:center; font-size:1.1rem; border:1px solid #bdc3c7; border-radius:4px; font-weight:bold;" onchange="window.manualScoreChange('${w.id}')">
                            </div>
                            <strong style="color:${tUit.kleur}; text-align:left; flex:1; font-size:1rem;">${tUit.naam}</strong>
                        </div>
                        <div class="hide-in-show-mode" style="display:flex; gap:5px;">
                            <button onclick="window.openLiveScore('${w.id}')" style="background:#e67e22; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Live</button>
                            <button onclick="window.verwijderWedstrijd('${w.id}')" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">X</button>
                        </div>
                    </div>`;
            });
        });
    }
    if(document.getElementById('toernooi-schema')) document.getElementById('toernooi-schema').innerHTML = schemaHtml;

    // 3. TEAMS RENDERN
    let spelersLijstHtml = '<option value="">-- Voeg clublid toe --</option>';
    if (window.spelersDB && window.spelersDB.length > 0) {
        let gesorteerd = [...window.spelersDB].sort((a,b) => (a.naam || '').localeCompare(b.naam || ''));
        gesorteerd.forEach(s => { spelersLijstHtml += `<option value="${s.id}">${s.naam || 'Onbekend'}</option>`; });
    }

    let teamsHtml = '';
    comp.teams.forEach(t => {
        let isCollapsed = window.collapsedTeams.includes(t.id);
        let pijl = isCollapsed ? '▶' : '▼';
        let bodyDisplay = isCollapsed ? 'none' : 'block';

        let verplaatsOptiesHtml = '<option value="">🔄 Verplaats</option>';
        comp.teams.forEach(anderTeam => {
            if (anderTeam.id !== t.id) {
                verplaatsOptiesHtml += `<option value="${anderTeam.id}">${anderTeam.naam}</option>`;
            }
        });

        teamsHtml += `
            <div style="border-radius:6px; overflow:hidden; margin-bottom:10px; border:1px solid ${t.kleur};">
                <div style="background:${t.kleur}; color:white; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; font-weight:bold; cursor:pointer;" onclick="window.toggleTeamCollapse('${t.id}')">
                    <span>${t.naam || 'Team'} <span style="font-size:0.8rem; font-weight:normal; opacity:0.9;">(${t.spelers.length} spelers) ${pijl}</span></span>
                    <button onclick="event.stopPropagation(); window.verwijderToernooiTeam('${t.id}')" style="background:transparent; border:none; color:white; cursor:pointer; font-weight:bold; font-size:1.1rem; opacity:0.8;">X</button>
                </div>
                <div style="background:white; padding:15px; display:${bodyDisplay};">
                    <ul style="list-style:none; padding:0; margin:0 0 15px 0;">`;
        
        t.spelers.forEach((sId, pIdx) => {
            let sObj = (window.spelersDB || []).find(s => s.id === sId || s.naam === sId);
            let weergaveNaam = sObj ? sObj.naam : sId; 
            
            teamsHtml += `<li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #eee; padding:6px 0; font-size:0.9rem;">
                <span style="font-weight:bold;">${weergaveNaam}</span> 
                <div style="display:flex; gap:5px; align-items:center;">
                    <select onchange="window.verplaatsSpeler('${t.id}', '${sId}', this.value)" style="padding:2px 4px; font-size:0.75rem; border-radius:4px; border:1px solid #ecf0f1; background:#f8f9fa; color:#7f8c8d; max-width:85px; cursor:pointer;" title="Verplaats speler">
                        ${verplaatsOptiesHtml}
                    </select>
                    <button onclick="window.verwijderSpelerUitTeam('${t.id}', ${pIdx})" style="color:#bdc3c7; background:none; border:none; cursor:pointer; font-weight:bold; font-size:1.1rem; padding:0 4px;" title="Verwijder uit team">&times;</button>
                </div>
            </li>`;
        });

        teamsHtml += `</ul>
                    <div style="display:flex; gap:5px; margin-bottom:8px;">
                        <select id="add_speler_${t.id}" style="flex:1; padding:8px; font-size:0.85rem; border:1px solid #ccc; border-radius:4px;">${spelersLijstHtml}</select>
                        <button onclick="window.voegToernooiSpelerToe('${t.id}')" style="background:#27ae60; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;" title="Voeg clublid toe">Lid +</button>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="add_custom_speler_${t.id}" placeholder="Of typ een vrije naam..." style="flex:1; padding:8px; font-size:0.85rem; border:1px solid #ccc; border-radius:4px;">
                        <button onclick="window.voegCustomToernooiSpelerToe('${t.id}')" style="background:#3498db; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer;" title="Voeg vrije naam/gast toe">Naam +</button>
                    </div>
                </div>
            </div>`;
    });
    if(document.getElementById('toernooi-teams')) document.getElementById('toernooi-teams').innerHTML = teamsHtml || "<p style='color:#7f8c8d;'>Maak eerst een toernooiteam aan.</p>";
};

window.toernooiTeamToevoegen = function() {
    let naam = document.getElementById('nt_naam').value.trim();
    let kleur = document.getElementById('nt_kleur').value;
    if (!naam) return;
    window.toernooiDB[actieveCompId].teams.push({ id: 'tt_' + Date.now(), naam: naam, kleur: kleur, spelers: [] });
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.verwijderToernooiTeam = function(id) {
    window.toernooiDB[actieveCompId].teams = window.toernooiDB[actieveCompId].teams.filter(t => t.id !== id);
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.voegToernooiSpelerToe = function(teamId) {
    let spelerId = document.getElementById(`add_speler_${teamId}`).value;
    if (!spelerId) return;
    let team = window.toernooiDB[actieveCompId].teams.find(t => t.id === teamId);
    if (!team.spelers.includes(spelerId)) {
        team.spelers.push(spelerId);
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.voegCustomToernooiSpelerToe = function(teamId) {
    let inputVeld = document.getElementById(`add_custom_speler_${teamId}`);
    if (!inputVeld) return;
    let naam = inputVeld.value.trim();
    if (!naam) return;
    
    let team = window.toernooiDB[actieveCompId].teams.find(t => t.id === teamId);
    if (!team.spelers.includes(naam)) {
        team.spelers.push(naam);
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.verwijderSpelerUitTeam = function(teamId, index) {
    let team = window.toernooiDB[actieveCompId].teams.find(t => t.id === teamId);
    team.spelers.splice(index, 1);
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.toernooiWedstrijdToevoegen = function() {
    let datum = document.getElementById('nw_datum').value || new Date().toLocaleDateString('nl-NL');
    let tijd = document.getElementById('nw_tijd').value || "17:00";
    let veld = document.getElementById('nw_veld').value.trim() || "Veld A";
    let thuis = document.getElementById('nw_thuis').value;
    let uit = document.getElementById('nw_uit').value;
    
    if (!thuis || !uit || thuis === uit) return alert("Kies twee verschillende teams of plaatsingen.");
    
    window.toernooiDB[actieveCompId].wedstrijden.push({ 
        id: 'tm_' + Date.now(), datum: datum, tijd: tijd, veld: veld, 
        thuis: thuis, uit: uit, scoreThuis: null, scoreUit: null, logs: [], playerStats: {}
    });
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.verwijderWedstrijd = function(id) {
    if (confirm("Wedstrijd definitief verwijderen?")) {
        window.toernooiDB[actieveCompId].wedstrijden = window.toernooiDB[actieveCompId].wedstrijden.filter(w => w.id !== id);
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.openLiveScore = function(matchId) {
    actieveLiveMatchId = matchId;
    const comp = window.toernooiDB[actieveCompId];
    const match = comp.wedstrijden.find(w => w.id === matchId);
    const berekendeStand = window.berekenStand(comp);
    
    if (match.scoreThuis === null) match.scoreThuis = 0;
    if (match.scoreUit === null) match.scoreUit = 0;
    if (!match.logs) match.logs = [];
    if (!match.playerStats) match.playerStats = {};

    const tThuis = getTeamWeergave(match.thuis, berekendeStand, comp.teams);
    const tUit = getTeamWeergave(match.uit, berekendeStand, comp.teams);

    let origineelThuis = comp.teams.find(t => t.id === match.thuis) || { spelers: [] };
    let origineelUit = comp.teams.find(t => t.id === match.uit) || { spelers: [] };

    if (match.thuis.startsWith('nr') && berekendeStand[parseInt(match.thuis.replace('nr','')) - 1]) {
        origineelThuis = comp.teams.find(t => t.id === berekendeStand[parseInt(match.thuis.replace('nr','')) - 1].id) || { spelers: [] };
    }
    if (match.uit.startsWith('nr') && berekendeStand[parseInt(match.uit.replace('nr','')) - 1]) {
        origineelUit = comp.teams.find(t => t.id === berekendeStand[parseInt(match.uit.replace('nr','')) - 1].id) || { spelers: [] };
    }

    let thuisOpties = '<option value="">-- Doelpuntmaker --</option>';
    origineelThuis.spelers.forEach(sId => { 
        let s = (window.spelersDB||[]).find(x => x.id === sId || x.naam === sId); 
        let weergaveNaam = s ? s.naam : sId;
        let valId = s ? s.id : sId;
        thuisOpties += `<option value="${valId}">${weergaveNaam}</option>`; 
    });
    
    let uitOpties = '<option value="">-- Doelpuntmaker --</option>';
    origineelUit.spelers.forEach(sId => { 
        let s = (window.spelersDB||[]).find(x => x.id === sId || x.naam === sId); 
        let weergaveNaam = s ? s.naam : sId;
        let valId = s ? s.id : sId;
        uitOpties += `<option value="${valId}">${weergaveNaam}</option>`; 
    });

    let overlay = `
        <div id="live-score-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:#1a252f; z-index:999999; display:flex; flex-direction:column; overflow-y:auto;">
            <div style="background:#2c3e50; padding:15px; display:flex; justify-content:space-between; align-items:center; color:white; box-shadow:0 2px 10px rgba(0,0,0,0.5);">
                <h2 style="margin:0; font-size:1.2rem;">⏱️ Live Match</h2>
                <button onclick="window.sluitLiveScore()" style="background:#e74c3c; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">💾 Opslaan & Sluiten</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:10px; padding:15px;">
                <div style="background:white; border-radius:12px; padding:20px; text-align:center; border-top:8px solid ${tThuis.kleur}; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                    <h2 style="margin:0 0 10px 0; color:#333;">${tThuis.naam}</h2>
                    <div id="ls_score_thuis" style="font-size:6rem; font-weight:bold; color:${tThuis.kleur}; line-height:1;">${match.scoreThuis}</div>
                    
                    <div style="display:flex; justify-content:center; gap:10px; margin:20px 0;">
                        <button onclick="window.addScore('thuis', 1)" style="flex:1; padding:15px; font-size:1.5rem; font-weight:bold; background:#eef2f5; border:none; border-radius:8px; cursor:pointer;">+1</button>
                        <button onclick="window.addScore('thuis', 2)" style="flex:1; padding:15px; font-size:1.5rem; font-weight:bold; background:#eef2f5; border:none; border-radius:8px; cursor:pointer;">+2</button>
                        <button onclick="window.addScore('thuis', 3)" style="flex:1; padding:15px; font-size:1.5rem; font-weight:bold; background:#eef2f5; border:none; border-radius:8px; cursor:pointer;">+3</button>
                    </div>
                    <select id="ls_speler_thuis" style="width:100%; padding:12px; font-size:1rem; border-radius:6px; border:2px solid #ddd;">${thuisOpties}</select>
                </div>

                <div style="background:white; border-radius:12px; padding:20px; text-align:center; border-top:8px solid ${tUit.kleur}; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                    <h2 style="margin:0 0 10px 0; color:#333;">${tUit.naam}</h2>
                    <div id="ls_score_uit" style="font-size:6rem; font-weight:bold; color:${tUit.kleur}; line-height:1;">${match.scoreUit}</div>
                    
                    <div style="display:flex; justify-content:center; gap:10px; margin:20px 0;">
                        <button onclick="window.addScore('uit', 1)" style="flex:1; padding:15px; font-size:1.5rem; font-weight:bold; background:#eef2f5; border:none; border-radius:8px; cursor:pointer;">+1</button>
                        <button onclick="window.addScore('uit', 2)" style="flex:1; padding:15px; font-size:1.5rem; font-weight:bold; background:#eef2f5; border:none; border-radius:8px; cursor:pointer;">+2</button>
                        <button onclick="window.addScore('uit', 3)" style="flex:1; padding:15px; font-size:1.5rem; font-weight:bold; background:#eef2f5; border:none; border-radius:8px; cursor:pointer;">+3</button>
                    </div>
                    <select id="ls_speler_uit" style="width:100%; padding:12px; font-size:1rem; border-radius:6px; border:2px solid #ddd;">${uitOpties}</select>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:10px; padding:0 15px 15px 15px; color:white;">
                <div style="background:#34495e; padding:15px; border-radius:8px;">
                    <h3 style="margin-top:0; border-bottom:1px solid #7f8c8d; padding-bottom:5px;">📝 Wedstrijd Logboek</h3>
                    <div id="ls_logs" style="height:150px; overflow-y:auto; font-size:0.9rem;"></div>
                </div>
                <div style="background:#34495e; padding:15px; border-radius:8px;">
                    <h3 style="margin-top:0; border-bottom:1px solid #7f8c8d; padding-bottom:5px;">🌟 Topscorers</h3>
                    <div id="ls_stats" style="height:150px; overflow-y:auto; font-size:0.9rem;"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('live-score-container').innerHTML = overlay;
    window.refreshLiveDisplay();
};

window.addScore = function(zijde, punten) {
    const comp = window.toernooiDB[actieveCompId];
    const match = comp.wedstrijden.find(w => w.id === actieveLiveMatchId);
    
    let selectId = zijde === 'thuis' ? 'ls_speler_thuis' : 'ls_speler_uit';
    let spelerId = document.getElementById(selectId).value;
    let actieTekst = "";

    if (zijde === 'thuis') {
        match.scoreThuis += punten;
        actieTekst = `+${punten} Thuis`;
    } else {
        match.scoreUit += punten;
        actieTekst = `+${punten} Uit`;
    }

    if (spelerId) {
        let s = (window.spelersDB || []).find(x => x.id === spelerId || x.naam === spelerId);
        let spelerNaam = s ? s.naam : spelerId;
        actieTekst = `+${punten} door ${spelerNaam}`;
        match.playerStats[spelerId] = (match.playerStats[spelerId] || 0) + punten;
        document.getElementById(selectId).value = ""; 
    }

    let tijdNu = new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    match.logs.unshift({ tijd: tijdNu, tekst: actieTekst, stand: `${match.scoreThuis} - ${match.scoreUit}` });

    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.refreshLiveDisplay();
};

window.refreshLiveDisplay = function() {
    const match = window.toernooiDB[actieveCompId].wedstrijden.find(w => w.id === actieveLiveMatchId);
    if (!match) return;

    document.getElementById('ls_score_thuis').innerText = match.scoreThuis;
    document.getElementById('ls_score_uit').innerText = match.scoreUit;

    let logsHtml = '';
    match.logs.forEach(l => {
        logsHtml += `<div style="margin-bottom:5px;"><span style="color:#bdc3c7;">[${l.tijd}]</span> <strong>${l.stand}</strong> : ${l.tekst}</div>`;
    });
    document.getElementById('ls_logs').innerHTML = logsHtml || "Nog geen scores.";

    let statsHtml = '';
    let statsArray = Object.keys(match.playerStats).map(id => ({ id: id, pnt: match.playerStats[id] }));
    statsArray.sort((a,b) => b.pnt - a.pnt); 

    statsArray.forEach(stat => {
        let s = (window.spelersDB||[]).find(x => x.id === stat.id || x.naam === stat.id);
        let naam = s ? s.naam : stat.id;
        statsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px dashed #7f8c8d;">
            <span>${naam}</span> <strong>${stat.pnt} pnt</strong>
        </div>`;
    });
    document.getElementById('ls_stats').innerHTML = statsHtml || "Geen individuele scores bijgehouden.";
};

window.sluitLiveScore = function() {
    document.getElementById('live-score-container').innerHTML = '';
    actieveLiveMatchId = null;
    window.renderToernooi();
};