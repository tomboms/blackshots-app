// --- BASKETBAL_TOERNOOI.JS: INTERNE COMPETITIE (FINALE FIX & MAIL KNOP) ---

window.toernooiDB = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
let actieveCompId = null;
let actieveLiveMatchId = null;

// --- INIT & MENU ---
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
    if (document.body.classList.contains('show-mode')) {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(e => console.log(e));
    }
};

// --- DATA BEREKENEN ---
window.berekenStand = function(comp) {
    let stand = {};
    comp.teams.forEach(t => stand[t.id] = { id: t.id, naam: t.naam || 'Onbekend', kleur: t.kleur, p: 0, w: 0, g: 0, v: 0, voor: 0, tegen: 0, punten: 0 });

    comp.wedstrijden.forEach(w => {
        // Zorg dat we alleen echte teams berekenen, geen "Nummer 1" placeholders
        if (w.scoreThuis !== null && w.scoreUit !== null && stand[w.thuis] && stand[w.uit]) {
            let st = parseInt(w.scoreThuis) || 0; 
            let su = parseInt(w.scoreUit) || 0;
            
            stand[w.thuis].p++; stand[w.uit].p++;
            stand[w.thuis].voor += st; stand[w.thuis].tegen += su;
            stand[w.uit].voor += su; stand[w.uit].tegen += st;

            if (st > su) { stand[w.thuis].w++; stand[w.uit].v++; stand[w.thuis].punten += 2; } 
            else if (su > st) { stand[w.uit].w++; stand[w.thuis].v++; stand[w.uit].punten += 2; } 
            else { stand[w.thuis].g++; stand[w.uit].g++; stand[w.thuis].punten += 1; stand[w.uit].punten += 1; }
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

// --- E-MAIL / WHATSAPP BERICHT GENERATOR ---
window.genereerToernooiBericht = function() {
    if (!actieveCompId || !window.toernooiDB[actieveCompId]) return alert("Er is geen toernooi geselecteerd.");
    
    const comp = window.toernooiDB[actieveCompId];
    const berekendeStand = window.berekenStand(comp);
    
    let bericht = `🏆 *Update: ${comp.naam}* 🏆\n\n*Actuele Stand:*\n`;
    berekendeStand.forEach((team, idx) => {
        bericht += `${idx + 1}. ${team.naam} (${team.punten} pnt | Saldo: ${team.voor - team.tegen})\n`;
    });

    bericht += `\n*Aankomende Wedstrijden:*\n`;
    let komendeWedstrijden = comp.wedstrijden.filter(w => w.scoreThuis === null && w.scoreUit === null);
    
    if (komendeWedstrijden.length === 0) {
        bericht += `Er staan momenteel geen wedstrijden op de planning.\n`;
    } else {
        // Sorteer op datum en tijd
        komendeWedstrijden.sort((a, b) => {
            let parseA = (a.datum||'').split('-').reverse().join('-') + (a.tijd||'');
            let parseB = (b.datum||'').split('-').reverse().join('-') + (b.tijd||'');
            return parseA.localeCompare(parseB);
        });

        // Laat maximaal de komende 5 zien om het bericht leesbaar te houden
        komendeWedstrijden.slice(0, 5).forEach(w => {
            let tThuis = comp.teams.find(t => t.id === w.thuis);
            let naamThuis = tThuis ? tThuis.naam : (w.thuis.startsWith('nr') ? w.thuis.replace('nr', 'Nummer ') : "N.n.b.");
            
            let tUit = comp.teams.find(t => t.id === w.uit);
            let naamUit = tUit ? tUit.naam : (w.uit.startsWith('nr') ? w.uit.replace('nr', 'Nummer ') : "N.n.b.");

            bericht += `📅 ${w.datum} 🕒 ${w.tijd}\n🏀 ${naamThuis} vs ${naamUit} (${w.veld})\n\n`;
        });
    }
    
    bericht += `Kijk voor meer details op de clubsite!\nGroeten, Black Shots`;

    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = bericht;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    
    alert(`✅ Succes! De stand en komende wedstrijden zijn gekopieerd naar je klembord.\nJe kunt ze nu plakken in WhatsApp of een e-mail.`);
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

    // FIX: Toevoegen van de FINALES (Nr 1 vs Nr 2) aan de dropdown
    let thuisSelect = document.getElementById('nw_thuis');
    let uitSelect = document.getElementById('nw_uit');
    if (thuisSelect && uitSelect) {
        let opties = '<option value="">-- Team --</option>';
        comp.teams.forEach(t => { opties += `<option value="${t.id}">${t.naam || 'Onbekend'}</option>`; });
        
        opties += `
            <optgroup label="Finales & Plaatsing">
                <option value="nr1">🏆 Nummer 1 (Stand)</option>
                <option value="nr2">🥈 Nummer 2 (Stand)</option>
                <option value="nr3">🥉 Nummer 3 (Stand)</option>
                <option value="nr4">🏅 Nummer 4 (Stand)</option>
            </optgroup>
        `;
        
        thuisSelect.innerHTML = opties; 
        uitSelect.innerHTML = opties;
    }

    // 1. STAND RENDERN
    let standHtml = `<table style="width:100%; border-collapse:collapse; text-align:left;">
        <tr style="border-bottom:2px solid #bdc3c7; color:#7f8c8d; font-size:0.9rem;">
            <th style="padding:8px;">#</th><th style="padding:8px;">Team</th><th style="padding:8px;">G</th>
            <th style="padding:8px;">W-V</th><th style="padding:8px;">Saldo</th><th style="padding:8px; font-size:1.1rem; color:black;">Pnt</th>
        </tr>`;
    berekendeStand.forEach((team, idx) => {
        let saldo = team.voor - team.tegen;
        standHtml += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px; font-weight:bold;">${idx + 1}</td>
            <td style="padding:8px; font-weight:bold; color:${team.kleur};">${team.naam}</td>
            <td style="padding:8px;">${team.p}</td><td style="padding:8px;">${team.w}-${team.v}</td>
            <td style="padding:8px; color:${saldo >= 0 ? 'green' : 'red'};">${saldo > 0 ? '+' : ''}${saldo}</td>
            <td style="padding:8px; font-weight:bold; font-size:1.2rem;">${team.punten}</td>
        </tr>`;
    });
    standHtml += `</table>`;
    if(document.getElementById('toernooi-stand')) document.getElementById('toernooi-stand').innerHTML = standHtml;

    // 2. SCHEMA RENDERN (GEGROEPEERD OP DATUM)
    let schemaHtml = '';
    let matchenPerDatum = {};

    comp.wedstrijden.forEach(w => {
        let d = w.datum || 'Onbekend';
        if (!matchenPerDatum[d]) matchenPerDatum[d] = [];
        matchenPerDatum[d].push(w);
    });

    let gesorteerdeDatums = Object.keys(matchenPerDatum).sort((a,b) => {
        let parseA = a.split('-').reverse().join('-');
        let parseB = b.split('-').reverse().join('-');
        return parseA.localeCompare(parseB);
    });

    if (gesorteerdeDatums.length === 0) {
        schemaHtml = "<p style='color:#7f8c8d;'>Nog geen wedstrijden ingepland.</p>";
    } else {
        gesorteerdeDatums.forEach(datum => {
            schemaHtml += `<h4 style="background:var(--secondary-color); color:white; padding:8px 15px; border-radius:4px; margin-top:20px; margin-bottom:10px;">🗓️ Speeldag: ${datum}</h4>`;
            
            matchenPerDatum[datum].sort((a,b) => (a.tijd||'').localeCompare(b.tijd||'')).forEach(w => {
                
                // FIX: Koppel de juiste namen en kleuren, ook voor de Finales!
                let tThuis = comp.teams.find(t => t.id === w.thuis);
                if(!tThuis) {
                    if (w.thuis === 'nr1') tThuis = { naam: "🏆 Nummer 1", kleur: "#f1c40f" };
                    else if (w.thuis === 'nr2') tThuis = { naam: "🥈 Nummer 2", kleur: "#95a5a6" };
                    else if (w.thuis === 'nr3') tThuis = { naam: "🥉 Nummer 3", kleur: "#d35400" };
                    else if (w.thuis === 'nr4') tThuis = { naam: "🏅 Nummer 4", kleur: "#3498db" };
                    else tThuis = { naam: "N.n.b.", kleur: "#333" };
                }

                let tUit = comp.teams.find(t => t.id === w.uit);
                if(!tUit) {
                    if (w.uit === 'nr1') tUit = { naam: "🏆 Nummer 1", kleur: "#f1c40f" };
                    else if (w.uit === 'nr2') tUit = { naam: "🥈 Nummer 2", kleur: "#95a5a6" };
                    else if (w.uit === 'nr3') tUit = { naam: "🥉 Nummer 3", kleur: "#d35400" };
                    else if (w.uit === 'nr4') tUit = { naam: "🏅 Nummer 4", kleur: "#3498db" };
                    else tUit = { naam: "N.n.b.", kleur: "#333" };
                }

                let scT = w.scoreThuis !== null ? w.scoreThuis : '';
                let scU = w.scoreUit !== null ? w.scoreUit : '';

                schemaHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fafafa; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:5px; flex-wrap:wrap; gap:10px; border-left:4px solid ${tThuis.kleur}">
                        <div style="font-size:0.85rem; color:#7f8c8d; min-width:100px;">
                            🕒 ${w.tijd} <br> 📍 ${w.veld}
                        </div>
                        <div style="flex:1; display:flex; justify-content:center; align-items:center; gap:10px; min-width:200px;">
                            <strong style="color:${tThuis.kleur}; text-align:right; flex:1; font-size:1.1rem;">${tThuis.naam}</strong>
                            <div style="display:flex; align-items:center; gap:5px;">
                                <input type="number" id="sc_thuis_${w.id}" value="${scT}" style="width:45px; padding:6px; text-align:center; margin:0; border:1px solid #bdc3c7; border-radius:4px; font-weight:bold;" onchange="window.manualScoreChange('${w.id}')">
                                <span style="font-weight:bold; color:#7f8c8d;">-</span>
                                <input type="number" id="sc_uit_${w.id}" value="${scU}" style="width:45px; padding:6px; text-align:center; margin:0; border:1px solid #bdc3c7; border-radius:4px; font-weight:bold;" onchange="window.manualScoreChange('${w.id}')">
                            </div>
                            <strong style="color:${tUit.kleur}; text-align:left; flex:1; font-size:1.1rem;">${tUit.naam}</strong>
                        </div>
                        <div class="hide-in-show-mode" style="display:flex; gap:5px;">
                            <button onclick="window.openLiveScore('${w.id}')" style="background:#e67e22; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">⏱️ Live</button>
                            <button onclick="window.verwijderWedstrijd('${w.id}')" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">X</button>
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
        teamsHtml += `
            <div style="border:1px solid ${t.kleur}; border-radius:6px; overflow:hidden;">
                <div style="background:${t.kleur}; color:white; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; font-weight:bold;">
                    <span>${t.naam || 'Team'} <span style="font-size:0.8rem; font-weight:normal;">(${t.spelers.length} spelers)</span></span>
                    <button onclick="window.verwijderToernooiTeam('${t.id}')" style="background:transparent; border:none; color:white; cursor:pointer; font-weight:bold;">X</button>
                </div>
                <div style="background:#fafafa; padding:10px;">
                    <ul style="list-style:none; padding:0; margin:0 0 10px 0;">`;
        
        t.spelers.forEach((sId, pIdx) => {
            let sObj = (window.spelersDB || []).find(s => s.id === sId || s.naam === sId);
            let weergaveNaam = sObj ? sObj.naam : sId; 
            teamsHtml += `<li style="display:flex; justify-content:space-between; border-bottom:1px dashed #ccc; padding:4px 0; font-size:0.9rem;">
                ${weergaveNaam} <button onclick="window.verwijderSpelerUitTeam('${t.id}', ${pIdx})" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">x</button>
            </li>`;
        });

        teamsHtml += `</ul>
                    <div style="display:flex; gap:5px;">
                        <select id="add_speler_${t.id}" style="flex:1; padding:6px; font-size:0.85rem;">${spelersLijstHtml}</select>
                        <button onclick="window.voegToernooiSpelerToe('${t.id}')" style="background:#27ae60; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">+</button>
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

window.verwijderSpelerUitTeam = function(teamId, index) {
    let team = window.toernooiDB[actieveCompId].teams.find(t => t.id === teamId);
    team.spelers.splice(index, 1);
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.toernooiWedstrijdToevoegen = function() {
    let datum = document.getElementById('nw_datum').value || new Date().toLocaleDateString('nl-NL');
    let tijd = document.getElementById('nw_tijd').value || "18:00";
    let veld = document.getElementById('nw_veld').value.trim() || "Veld 1";
    let thuis = document.getElementById('nw_thuis').value;
    let uit = document.getElementById('nw_uit').value;
    
    if (!thuis || !uit || thuis === uit) {
        return alert("Kies twee verschillende teams.");
    }
    
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

// --- LIVE SCORE MODULE ---
window.openLiveScore = function(matchId) {
    actieveLiveMatchId = matchId;
    const comp = window.toernooiDB[actieveCompId];
    const match = comp.wedstrijden.find(w => w.id === matchId);
    
    if (match.scoreThuis === null) match.scoreThuis = 0;
    if (match.scoreUit === null) match.scoreUit = 0;
    if (!match.logs) match.logs = [];
    if (!match.playerStats) match.playerStats = {};

    const tThuis = comp.teams.find(t => t.id === match.thuis) || { naam: "Thuis", kleur: "#333", spelers: [] };
    const tUit = comp.teams.find(t => t.id === match.uit) || { naam: "Uit", kleur: "#333", spelers: [] };

    let thuisOpties = '<option value="">-- Doelpuntmaker --</option>';
    tThuis.spelers.forEach(sId => { 
        let s = (window.spelersDB||[]).find(x => x.id === sId || x.naam === sId); 
        let weergaveNaam = s ? s.naam : sId;
        let valId = s ? s.id : sId;
        thuisOpties += `<option value="${valId}">${weergaveNaam}</option>`; 
    });
    
    let uitOpties = '<option value="">-- Doelpuntmaker --</option>';
    tUit.spelers.forEach(sId => { 
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
                    <h3 style="margin-top:0; border-bottom:1px solid #7f8c8d; padding-bottom:5px;">🌟 Topscorers (Deze wedstrijd)</h3>
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
        let s = window.spelersDB.find(x => x.id === spelerId || x.naam === spelerId);
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