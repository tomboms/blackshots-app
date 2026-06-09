// --- BASKETBAL_TOERNOOI.JS: LOGICA VOOR INTERNE COMPETITIES ---

const standaardToernooiDB = {
    "jong": {
        naam: "Jeugd Competitie 2026",
        teams: [
            { id: "t_gsw", naam: "Golden State Warriors", kleur: "#f39c12", spelers: ["Sem", "Lody", "Roan", "Djayden", "Lucas", "Liwanu", "Nicholas", "Thijmen"] },
            { id: "t_bos", naam: "Boston Celtics", kleur: "#27ae60", spelers: ["Bledi", "Filp", "Artun", "Tim", "Lonaéya", "Wout", "Alex V", "Jairo"] },
            { id: "t_lal", naam: "Los Angeles Lakers", kleur: "#8e44ad", spelers: ["Evin", "Alex G", "Vic", "Tommie", "Boris", "Ralph", "Thijs", "Slva"] },
            { id: "t_chi", naam: "Chicago Bulls", kleur: "#e74c3c", spelers: ["Mehdie", "Devlan", "Milan", "Zinedine", "Bink", "Lotfi", "Jack", "Djamina"] }
        ],
        wedstrijden: [
            { id: "m1", datum: "8-jun", tijd: "17:00", veld: "Veld A", thuis: "t_gsw", uit: "t_lal", scoreThuis: null, scoreUit: null },
            { id: "m2", datum: "8-jun", tijd: "17:00", veld: "Veld B", thuis: "t_chi", uit: "t_bos", scoreThuis: null, scoreUit: null },
            { id: "m3", datum: "15-jun", tijd: "17:00", veld: "Veld A", thuis: "t_bos", uit: "t_lal", scoreThuis: null, scoreUit: null },
            { id: "m4", datum: "15-jun", tijd: "17:00", veld: "Veld B", thuis: "t_chi", uit: "t_gsw", scoreThuis: null, scoreUit: null },
            { id: "m5", datum: "22-jun", tijd: "17:00", veld: "Veld A", thuis: "t_lal", uit: "t_chi", scoreThuis: null, scoreUit: null },
            { id: "m6", datum: "22-jun", tijd: "17:00", veld: "Veld B", thuis: "t_gsw", uit: "t_bos", scoreThuis: null, scoreUit: null },
            { id: "m7", datum: "29-jun", tijd: "17:00", veld: "Veld A", thuis: "rank_3", uit: "rank_4", scoreThuis: null, scoreUit: null },
            { id: "m8", datum: "29-jun", tijd: "17:00", veld: "Veld B", thuis: "rank_1", uit: "rank_2", scoreThuis: null, scoreUit: null }
        ]
    },
    "oud": {
        naam: "Oudere Jeugd Competitie 2026",
        teams: [
            { id: "t_cha", naam: "Charlotte Hornets", kleur: "#00b894", spelers: ["Dean", "Younes", "Thquill", "Maciej", "Alexander W", "Billy", "Nithilan"] },
            { id: "t_min", naam: "Minnesota Timberwolves", kleur: "#2c3e50", spelers: ["Krijn", "Thijmen", "Armin", "Jevell", "Lars", "Stan", "Gilbert"] },
            { id: "t_den", naam: "Denver Nuggets", kleur: "#2980b9", spelers: ["Dylano", "Kane", "Jamian", "Daveny", "Gustavo", "Alexander P", "Yurliáno"] },
            { id: "t_san", naam: "San Antonio Spurs", kleur: "#7f8c8d", spelers: ["Mike", "Sjoerd", "Nanih", "Jelle", "Martin", "Atharva"] }
        ],
        wedstrijden: [
            { id: "m9", datum: "8-jun", tijd: "18:00", veld: "Veld A", thuis: "t_cha", uit: "t_min", scoreThuis: null, scoreUit: null },
            { id: "m10", datum: "8-jun", tijd: "18:00", veld: "Veld B", thuis: "t_den", uit: "t_san", scoreThuis: null, scoreUit: null },
            { id: "m11", datum: "15-jun", tijd: "18:00", veld: "Veld A", thuis: "t_san", uit: "t_min", scoreThuis: null, scoreUit: null },
            { id: "m12", datum: "15-jun", tijd: "18:00", veld: "Veld B", thuis: "t_den", uit: "t_cha", scoreThuis: null, scoreUit: null },
            { id: "m13", datum: "22-jun", tijd: "18:00", veld: "Veld A", thuis: "t_min", uit: "t_den", scoreThuis: null, scoreUit: null },
            { id: "m14", datum: "22-jun", tijd: "18:00", veld: "Veld B", thuis: "t_cha", uit: "t_san", scoreThuis: null, scoreUit: null },
            { id: "m15", datum: "29-jun", tijd: "18:00", veld: "Veld A", thuis: "rank_3", uit: "rank_4", scoreThuis: null, scoreUit: null },
            { id: "m16", datum: "29-jun", tijd: "18:00", veld: "Veld B", thuis: "rank_1", uit: "rank_2", scoreThuis: null, scoreUit: null }
        ]
    }
};

let opgeslagenToernooien = localStorage.getItem('blackshots_toernooi');
if (opgeslagenToernooien) {
    window.toernooiDB = JSON.parse(opgeslagenToernooien);
} else {
    window.toernooiDB = standaardToernooiDB;
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
}

let actieveCompId = Object.keys(window.toernooiDB)[0] || null;

window.vulToernooiSelect = function() {
    let select = document.getElementById('toernooi-select');
    if(!select) return;
    select.innerHTML = '';
    
    let keys = Object.keys(window.toernooiDB);
    if(keys.length === 0) {
        select.innerHTML = `<option value="">-- Geen competities --</option>`;
        actieveCompId = null;
    } else {
        keys.forEach(key => {
            select.innerHTML += `<option value="${key}">${window.toernooiDB[key].naam}</option>`;
        });
        if(!window.toernooiDB[actieveCompId]) actieveCompId = keys[0];
        select.value = actieveCompId;
    }
};

window.wisselToernooi = function() {
    actieveCompId = document.getElementById('toernooi-select').value;
    window.renderToernooi();
};

window.maakNieuweCompetitie = function() {
    let naam = prompt("Wat is de naam van de nieuwe competitie?");
    if(!naam) return;
    
    let id = 'comp_' + Date.now();
    window.toernooiDB[id] = { naam: naam, teams: [], wedstrijden: [] };
    
    actieveCompId = id;
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.vulToernooiSelect();
    window.renderToernooi();
};

window.verwijderCompetitie = function() {
    if(!actieveCompId) return;
    if(confirm(`Weet je zeker dat je "${window.toernooiDB[actieveCompId].naam}" volledig wilt wissen?`)) {
        delete window.toernooiDB[actieveCompId];
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.vulToernooiSelect();
        window.renderToernooi();
    }
};

window.berekenStand = function(comp) {
    let stand = {};
    comp.teams.forEach(t => stand[t.id] = { id: t.id, naam: t.naam, kleur: t.kleur, p: 0, w: 0, g: 0, v: 0, voor: 0, tegen: 0, punten: 0 });

    comp.wedstrijden.forEach(w => {
        let isDynamisch = w.type || (w.thuis && w.thuis.startsWith('rank_')) || (w.uit && w.uit.startsWith('rank_'));

        if (!isDynamisch && w.scoreThuis !== null && w.scoreUit !== null && stand[w.thuis] && stand[w.uit]) {
            let st = parseInt(w.scoreThuis); let su = parseInt(w.scoreUit);
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

window.renderToernooi = function() {
    if (!actieveCompId || !window.toernooiDB[actieveCompId]) {
        document.getElementById('toernooi-stand').innerHTML = "<p style='color:#7f8c8d; font-style:italic;'>Maak eerst een competitie aan.</p>";
        document.getElementById('toernooi-schema').innerHTML = "";
        document.getElementById('toernooi-teams').innerHTML = "";
        return;
    }

    const comp = window.toernooiDB[actieveCompId];
    const berekendeStand = window.berekenStand(comp);
    
    let ondertitel = document.getElementById('toernooi-ondertitel');
    if (ondertitel) {
        let n = comp.naam.toLowerCase();
        if (n.includes("jeugd") && !n.includes("ouder")) {
            ondertitel.innerText = "Lage basket (2,60m) - Balmaat 5 - 4x10 min speeltijd (doorlopend).";
        } else if (n.includes("ouder") || n.includes("m18") || n.includes("m22")) {
            ondertitel.innerText = "Normale basket (3,05m) - Balmaat 7 - 4x10 min speeltijd (doorlopend).";
        } else {
            ondertitel.innerText = `${comp.teams.length} Teams geregistreerd | ${comp.wedstrijden.length} Wedstrijden gepland.`;
        }
    }
    
    let thuisSelect = document.getElementById('nw_thuis');
    let uitSelect = document.getElementById('nw_uit');
    if(thuisSelect && uitSelect) {
        let opties = '<option value="">-- Kies Team --</option>';
        opties += '<optgroup label="Stand (Automatisch)">';
        opties += '<option value="rank_1">🏆 Nummer 1 (Finale)</option>';
        opties += '<option value="rank_2">🥈 Nummer 2 (Finale)</option>';
        opties += '<option value="rank_3">🥉 Nummer 3 (Troost)</option>';
        opties += '<option value="rank_4">🏅 Nummer 4 (Troost)</option>';
        opties += '</optgroup><optgroup label="Specifieke Teams">';
        comp.teams.forEach(t => { opties += `<option value="${t.id}">${t.naam}</option>`; });
        opties += '</optgroup>';
        
        thuisSelect.innerHTML = opties; uitSelect.innerHTML = opties;
    }
    
    if(comp.teams.length === 0) {
        document.getElementById('toernooi-stand').innerHTML = "<p style='color:#e74c3c;'>Voeg eerst teams toe in de rechterkolom!</p>";
    } else {
        let standHtml = `<table style="width:100%; border-collapse:collapse; text-align:left;">
            <tr style="border-bottom:2px solid #bdc3c7; color:#7f8c8d;">
                <th style="padding:8px;">#</th><th style="padding:8px;">Team</th><th style="padding:8px;">Gesp</th>
                <th style="padding:8px;">W</th><th style="padding:8px;">V</th><th style="padding:8px;">Saldo</th><th style="padding:8px;">Pnt</th>
            </tr>`;
        berekendeStand.forEach((team, idx) => {
            let saldo = team.voor - team.tegen;
            let saldoKleur = saldo > 0 ? 'green' : (saldo < 0 ? 'red' : 'black');
            standHtml += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px; font-weight:bold;">${idx + 1}</td>
                <td style="padding:8px; font-weight:bold; color:${team.kleur};">${team.naam}</td>
                <td style="padding:8px;">${team.p}</td><td style="padding:8px;">${team.w}</td><td style="padding:8px;">${team.v}</td>
                <td style="padding:8px; color:${saldoKleur}; font-weight:bold;">${saldo > 0 ? '+' : ''}${saldo}</td>
                <td style="padding:8px; font-weight:bold; font-size:1.1rem;">${team.punten}</td>
            </tr>`;
        });
        standHtml += `</table>`;
        document.getElementById('toernooi-stand').innerHTML = standHtml;
    }

    let schemaPerDatum = {};
    comp.wedstrijden.forEach(w => {
        if(!schemaPerDatum[w.datum]) schemaPerDatum[w.datum] = [];
        schemaPerDatum[w.datum].push(w);
    });

    let schemaHtml = '';
    Object.keys(schemaPerDatum).forEach(datum => {
        schemaHtml += `<div style="margin-bottom:15px;"><strong style="background:#eef2f5; padding:5px 10px; border-radius:4px; display:inline-block; margin-bottom:10px;">🗓️ Speeldag: ${datum}</strong>`;
        
        schemaPerDatum[datum].forEach(w => {
            let teamThuis = "N.n.b.", teamUit = "N.n.b.";
            let kleurThuis = "#333", kleurUit = "#333";
            let thuisId = w.thuis; let uitId = w.uit;

            if (w.type === 'finale') { thuisId = 'rank_1'; uitId = 'rank_2'; }
            else if (w.type === 'troostfinale') { thuisId = 'rank_3'; uitId = 'rank_4'; }

            if (thuisId && thuisId.startsWith('rank_')) {
                let rank = parseInt(thuisId.split('_')[1]) - 1;
                if (berekendeStand[rank]) { teamThuis = `[Nr ${rank+1}] ${berekendeStand[rank].naam}`; kleurThuis = berekendeStand[rank].kleur; } 
                else { teamThuis = `Nr ${rank+1} v.d. Stand`; }
            } else {
                let thObj = comp.teams.find(t => t.id === thuisId);
                if (thObj) { teamThuis = thObj.naam; kleurThuis = thObj.kleur; }
            }

            if (uitId && uitId.startsWith('rank_')) {
                let rank = parseInt(uitId.split('_')[1]) - 1;
                if (berekendeStand[rank]) { teamUit = `[Nr ${rank+1}] ${berekendeStand[rank].naam}`; kleurUit = berekendeStand[rank].kleur; } 
                else { teamUit = `Nr ${rank+1} v.d. Stand`; }
            } else {
                let uiObj = comp.teams.find(t => t.id === uitId);
                if (uiObj) { teamUit = uiObj.naam; kleurUit = uiObj.kleur; }
            }

            let scT = w.scoreThuis !== null ? w.scoreThuis : ''; let scU = w.scoreUit !== null ? w.scoreUit : '';

            schemaHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#fafafa; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:5px;">
                    <div style="flex:1; font-size:0.9rem; color:#7f8c8d;">🕒 ${w.tijd}<br>📍 ${w.veld}</div>
                    <div style="flex:3; display:flex; justify-content:center; align-items:center; gap:10px;">
                        <strong style="color:${kleurThuis}; text-align:right; flex:1;">${teamThuis}</strong>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <input type="number" id="sc_thuis_${w.id}" value="${scT}" style="width:40px; padding:5px; text-align:center; border:1px solid #bdc3c7; border-radius:4px;">
                            <span>-</span>
                            <input type="number" id="sc_uit_${w.id}" value="${scU}" style="width:40px; padding:5px; text-align:center; border:1px solid #bdc3c7; border-radius:4px;">
                        </div>
                        <strong style="color:${kleurUit}; text-align:left; flex:1;">${teamUit}</strong>
                    </div>
                    <div style="flex:1; text-align:right; display:flex; justify-content:flex-end; gap:5px;">
                        <button onclick="window.slaUitslagOp('${w.id}')" style="background:#27ae60; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">Opslaan</button>
                        <button onclick="window.verwijderWedstrijd('${w.id}')" style="background:#e74c3c; color:white; border:none; padding:6px; border-radius:4px; cursor:pointer;" title="Wis wedstrijd">X</button>
                    </div>
                </div>`;
        });
        schemaHtml += `</div>`;
    });
    document.getElementById('toernooi-schema').innerHTML = schemaHtml;

    let teamsHtml = '';
    comp.teams.forEach(t => {
        teamsHtml += `
            <div style="border:1px solid ${t.kleur}; border-radius:6px; overflow:hidden; background:white; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom:10px;">
                <div style="background:${t.kleur}; color:white; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; font-weight:bold; transition:0.2s;">
                    <span onclick="let c = this.parentElement.nextElementSibling; c.style.display = c.style.display === 'none' ? 'block' : 'none';" style="cursor:pointer; flex:1; font-size:1.1rem;">
                        ${t.naam} <span style="font-size:0.9rem; font-weight:normal; opacity:0.9;">(${t.spelers.length} spelers) ▼</span>
                    </span>
                    <button onclick="window.verwijderToernooiTeam('${t.id}')" style="background:transparent; border:none; color:white; cursor:pointer; font-weight:bold;" title="Verwijder Team">X</button>
                </div>
                <div style="padding:15px; display:none; background:#fafafa;">
                    <ul style="list-style:none; padding:0; margin:0 0 10px 0;">`;
        t.spelers.forEach((speler, pIdx) => {
            teamsHtml += `<li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #bdc3c7; padding:8px 0;">
                <span style="font-weight:bold; color:#2c3e50;">${speler}</span>
                <div style="display:flex; gap:8px;">
                    <select onchange="window.verplaatsSpeler('${t.id}', ${pIdx}, this.value)" style="padding:4px 8px; font-size:0.85rem; border-radius:4px; border:1px solid #95a5a6; cursor:pointer;">
                        <option value="">-- Wissel --</option>
                        ${comp.teams.filter(anderTeam => anderTeam.id !== t.id).map(anderTeam => `<option value="${anderTeam.id}">Naar ${anderTeam.naam}</option>`).join('')}
                    </select>
                    <button onclick="window.verwijderSpeler('${t.id}', ${pIdx})" style="background:#e74c3c; color:white; border:none; border-radius:4px; cursor:pointer; padding:4px 10px; font-weight:bold;">X</button>
                </div>
            </li>`;
        });
        teamsHtml += `</ul>
                    <div style="display:flex; gap:10px; margin-top:15px; border-top:2px solid #eee; padding-top:15px;">
                        <input type="text" id="nieuw_speler_${t.id}" placeholder="Nieuwe speler toevoegen..." style="flex:1; padding:8px; border:1px solid #bdc3c7; border-radius:4px;">
                        <button onclick="window.voegToernooiSpelerToe('${t.id}')" style="background:#27ae60; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">+ Toevoegen</button>
                    </div>
                </div>
            </div>`;
    });
    document.getElementById('toernooi-teams').innerHTML = teamsHtml;
};

// --- BERICHT GENEREREN FUNCTIE (JOUW SJABLOON!) ---
window.genereerBericht = function() {
    if (!actieveCompId || !window.toernooiDB[actieveCompId]) return;
    const comp = window.toernooiDB[actieveCompId];
    
    let n = comp.naam.toLowerCase();
    let isOud = n.includes("ouder") || n.includes("m18") || n.includes("m22");
    
    // Pas template dynamisch aan op het gekozen toernooi
    let geboorteJaar = isOud ? "2013 of ouder" : "2014 of eerder";
    let tijd = comp.wedstrijden.length > 0 ? comp.wedstrijden[0].tijd : "17:00";
    let basket = isOud ? "normale basket (3,05m)" : "lage basket (2,60m)";
    let bal = isOud ? "7" : "5";
    
    let datums = [...new Set(comp.wedstrijden.map(w => w.datum))];
    let datumZin = datums.join(', ');
    let startDatum = datums.length > 0 ? datums[0] : "...";

    // Genereer de HTML tabel voor de Teams en Spelers
    let teamsHtml = '<table style="width:100%; border-collapse:collapse; margin-bottom:15px; border:1px solid #bdc3c7;"><tr>';
    comp.teams.forEach(t => teamsHtml += `<th style="padding:8px; background:#f2f2f2; text-align:left; border:1px solid #bdc3c7;">${t.naam}</th>`);
    teamsHtml += '</tr>';
    
    let maxSpelers = Math.max(...comp.teams.map(t => t.spelers.length));
    for(let i = 0; i < maxSpelers; i++) {
        teamsHtml += '<tr>';
        comp.teams.forEach(t => {
            teamsHtml += `<td style="padding:6px; border:1px solid #bdc3c7;">${t.spelers[i] ? (i+1)+'. '+t.spelers[i] : ''}</td>`;
        });
        teamsHtml += '</tr>';
    }
    teamsHtml += '</table>';

    // Genereer de HTML tabel voor het Schema
    let berekendeStand = window.berekenStand(comp);
    let schemaHtml = '<table style="width:100%; border-collapse:collapse; border:1px solid #bdc3c7;"><tr><th style="padding:8px; border:1px solid #bdc3c7; background:#f2f2f2; text-align:left;">Datum</th><th style="padding:8px; border:1px solid #bdc3c7; background:#f2f2f2; text-align:left;">Thuis</th><th style="padding:8px; border:1px solid #bdc3c7; background:#f2f2f2; text-align:left;">Uit</th><th style="padding:8px; border:1px solid #bdc3c7; background:#f2f2f2; text-align:left;">Tijd</th><th style="padding:8px; border:1px solid #bdc3c7; background:#f2f2f2; text-align:left;">Veld</th></tr>';
    
    comp.wedstrijden.forEach(w => {
        let teamThuis = "N.n.b.", teamUit = "N.n.b.";
        let thuisId = w.thuis; let uitId = w.uit;

        if (w.type === 'finale') { thuisId = 'rank_1'; uitId = 'rank_2'; }
        else if (w.type === 'troostfinale') { thuisId = 'rank_3'; uitId = 'rank_4'; }

        if (thuisId && thuisId.startsWith('rank_')) {
            let rank = parseInt(thuisId.split('_')[1]) - 1;
            teamThuis = berekendeStand[rank] ? `Nr ${rank+1} (${berekendeStand[rank].naam})` : `Nr ${rank+1}`;
        } else {
            let thObj = comp.teams.find(t => t.id === thuisId);
            if(thObj) teamThuis = thObj.naam;
        }

        if (uitId && uitId.startsWith('rank_')) {
            let rank = parseInt(uitId.split('_')[1]) - 1;
            teamUit = berekendeStand[rank] ? `Nr ${rank+1} (${berekendeStand[rank].naam})` : `Nr ${rank+1}`;
        } else {
            let uiObj = comp.teams.find(t => t.id === uitId);
            if(uiObj) teamUit = uiObj.naam;
        }

        schemaHtml += `<tr>
            <td style="padding:6px; border:1px solid #bdc3c7;">${w.datum}</td>
            <td style="padding:6px; border:1px solid #bdc3c7; font-weight:bold;">${teamThuis}</td>
            <td style="padding:6px; border:1px solid #bdc3c7;">${teamUit}</td>
            <td style="padding:6px; border:1px solid #bdc3c7;">${w.tijd}</td>
            <td style="padding:6px; border:1px solid #bdc3c7;">${w.veld}</td>
        </tr>`;
    });
    schemaHtml += '</table>';

    let emailContent = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height:1.5;">
            <p>Beste ouders,</p>
            <p>Op maandag ${startDatum} gaat de interne competitie weer van start!<br>
            De trainingen van ${datumZin} zien er daarom anders uit. Op deze dagen houden we geen traditionele training, maar spelen we wedstrijden onderling. De teams zijn gemaakt van spelers die geboren zijn in <strong>${geboorteJaar}</strong>.</p>
            
            ${teamsHtml}
            
            <p>De wedstrijden beginnen om <strong>${tijd}</strong> met 10 minuten warming-up, met vervolgens 4 keer 10 minuten doorlopende speeltijd. Tussen de 1e & 2e en de 3e & 4e periode zit telkens 2 minuten pauze, en tussen de 2e & 3e periode zit 5 minuten pauze.</p>
            <p>Het eerstgenoemde team is het thuisteam en speelt in het zwart, het tweede team speelt in een andere kleur. De wedstrijden worden gespeeld op de ${basket} en met balmaat ${bal}.</p>
            
            ${schemaHtml}
            
            <p>Bij vragen hoor ik het graag!</p>
        </div>
    `;

    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:900px; width:95%; max-height:90vh; overflow-y:auto; padding:20px; background:white; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h2 style="margin:0; color:var(--primary-color);">✉️ Bericht Kopiëren</h2>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="sluit-knop" style="background:transparent; border:none; font-size:1.5rem; cursor:pointer;">X</button>
            </div>
            <p style="color:#7f8c8d; margin-bottom:15px;">Klik op de groene knop om alles in één keer te kopiëren. Plak het daarna in Gmail of Outlook (Ctrl+V) en de tabellen komen perfect mee!</p>
            
            <button onclick="window.kopieerBericht(this)" style="background:#27ae60; color:white; border:none; padding:12px 20px; border-radius:4px; font-weight:bold; cursor:pointer; margin-bottom:20px; font-size:1.1rem;">📋 Kopieer Bericht naar Klembord</button>
            
            <div id="bericht-te-kopieren" style="border: 2px dashed #bdc3c7; padding: 15px; user-select: all; background:#f9f9f9;">
                ${emailContent}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.kopieerBericht = function(btn) {
    const div = document.getElementById('bericht-te-kopieren');
    if (document.body.createTextRange) {
        const range = document.body.createTextRange();
        range.moveToElementText(div);
        range.select();
    } else if (window.getSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(div);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    try {
        document.execCommand('copy');
        let oldText = btn.innerText;
        btn.innerText = "✅ Succesvol Gekopieerd!";
        btn.style.background = "#2ecc71";
        setTimeout(() => { btn.innerText = oldText; btn.style.background = "#27ae60"; }, 2500);
        window.getSelection().removeAllRanges();
    } catch (err) {
        alert("Kopiëren mislukt. Selecteer de tekst handmatig en druk op Ctrl+C.");
    }
};

window.toernooiTeamToevoegen = function() {
    if(!actieveCompId) return alert("Selecteer of maak eerst een competitie.");
    let naam = document.getElementById('nt_naam').value.trim();
    let kleur = document.getElementById('nt_kleur').value;
    if(!naam) return;
    window.toernooiDB[actieveCompId].teams.push({ id: 't_' + Date.now(), naam: naam, kleur: kleur, spelers: [] });
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.verwijderToernooiTeam = function(teamId) {
    if(confirm("Weet je zeker dat je dit team wilt verwijderen?")) {
        window.toernooiDB[actieveCompId].teams = window.toernooiDB[actieveCompId].teams.filter(t => t.id !== teamId);
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.toernooiWedstrijdToevoegen = function() {
    if(!actieveCompId) return;
    let datum = document.getElementById('nw_datum').value.trim();
    let tijd = document.getElementById('nw_tijd').value;
    let veld = document.getElementById('nw_veld').value.trim();
    let thuis = document.getElementById('nw_thuis').value;
    let uit = document.getElementById('nw_uit').value;
    if(!datum || !thuis || !uit || thuis === uit) return alert("Vul een datum in en kies twee verschillende teams (of posities uit de stand).");
    window.toernooiDB[actieveCompId].wedstrijden.push({ id: 'm_' + Date.now(), datum: datum, tijd: tijd, veld: veld, thuis: thuis, uit: uit, scoreThuis: null, scoreUit: null });
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};

window.verwijderWedstrijd = function(matchId) {
    if(confirm("Wil je deze wedstrijd verwijderen?")) {
        window.toernooiDB[actieveCompId].wedstrijden = window.toernooiDB[actieveCompId].wedstrijden.filter(w => w.id !== matchId);
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.slaUitslagOp = function(matchId) {
    let tThuis = document.getElementById(`sc_thuis_${matchId}`).value;
    let tUit = document.getElementById(`sc_uit_${matchId}`).value;
    let match = window.toernooiDB[actieveCompId].wedstrijden.find(w => w.id === matchId);
    if(match) {
        match.scoreThuis = tThuis !== "" ? parseInt(tThuis) : null;
        match.scoreUit = tUit !== "" ? parseInt(tUit) : null;
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.voegToernooiSpelerToe = function(teamId) {
    let input = document.getElementById(`nieuw_speler_${teamId}`);
    if(input.value.trim() !== "") {
        let team = window.toernooiDB[actieveCompId].teams.find(t => t.id === teamId);
        team.spelers.push(input.value.trim());
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.verwijderSpeler = function(teamId, pIdx) {
    if(confirm("Weet je zeker dat je deze speler wilt verwijderen?")) {
        let team = window.toernooiDB[actieveCompId].teams.find(t => t.id === teamId);
        team.spelers.splice(pIdx, 1);
        localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
        window.renderToernooi();
    }
};

window.verplaatsSpeler = function(oudTeamId, pIdx, nieuwTeamId) {
    if(!nieuwTeamId) return;
    let oudTeam = window.toernooiDB[actieveCompId].teams.find(t => t.id === oudTeamId);
    let nieuwTeam = window.toernooiDB[actieveCompId].teams.find(t => t.id === nieuwTeamId);
    let speler = oudTeam.spelers.splice(pIdx, 1)[0];
    nieuwTeam.spelers.push(speler);
    localStorage.setItem('blackshots_toernooi', JSON.stringify(window.toernooiDB));
    window.renderToernooi();
};