// --- BASKETBAL_AGENDA.JS: TRAININGEN AGENDA MET ZAALHUUR & JAARPLANNING SYNC ---

let actieveTraining = null;
let actieveTijdlijn = [];
let actieveWeekStart = new Date();

// Zet startdatum op afgelopen maandag
let d = actieveWeekStart.getDay();
let diff = actieveWeekStart.getDate() - d + (d === 0 ? -6 : 1);
actieveWeekStart.setDate(diff);

// Data inladen
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// DATA REPARATEUR (Omzetten oude structuur)
if (Array.isArray(window.geplandeTrainingenDB)) {
    let oudeArray = window.geplandeTrainingenDB;
    window.geplandeTrainingenDB = {};
    oudeArray.forEach(item => {
        if (!item) return;
        if (item.opslagSleutel && item.tijdlijn) {
            window.geplandeTrainingenDB[item.opslagSleutel] = item.tijdlijn;
        } else if (item.datum) {
            let matchTeam = (window.teamsDB || []).find(t => t.naam === item.titel || t.id === item.titel);
            let tId = matchTeam ? matchTeam.id : 'unknown';
            let isoDate = item.datum;
            if (item.datum.includes('-')) {
                let parts = item.datum.split('-');
                if (parts[0].length === 2) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            window.geplandeTrainingenDB[`${isoDate}_${tId}`] = item.oefeningen || [];
        }
    });
    localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
}

// Navigatie
window.wijzigWeek = function(delta) {
    actieveWeekStart.setDate(actieveWeekStart.getDate() + (delta * 7));
    window.renderWeekAgenda();
};

window.gaNaarHuidigeWeek = function() {
    actieveWeekStart = new Date();
    let d = actieveWeekStart.getDay();
    actieveWeekStart.setDate(actieveWeekStart.getDate() - d + (d === 0 ? -6 : 1));
    window.renderWeekAgenda();
};

// ============================================================================
// DE AGENDA TEKENEN (INCLUSIEF ZAALHUUR & VAKANTIE CHECK!)
// ============================================================================
window.renderWeekAgenda = function() {
    let grid = document.getElementById('agenda-grid');
    let label = document.getElementById('week-label');
    if (!grid) return;

    // Haal verse cloud/lokale data op voor de checks
    let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
    let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
    let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];

    let startDatum = new Date(actieveWeekStart);
    let eindDatum = new Date(actieveWeekStart);
    eindDatum.setDate(startDatum.getDate() + 4); // We tonen Maandag t/m Vrijdag
    
    let sMnd = startDatum.toLocaleString('nl-NL', { month: 'short' });
    let eMnd = eindDatum.toLocaleString('nl-NL', { month: 'short' });
    if (label) label.innerText = `Week van ma ${startDatum.getDate()} ${sMnd} t/m vr ${eindDatum.getDate()} ${eMnd} ${startDatum.getFullYear()}`;

    let agendaHtml = '';
    let dagNamen = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

    for (let i = 0; i < 5; i++) {
        let loopDag = new Date(startDatum);
        loopDag.setDate(startDatum.getDate() + i);
        let isoDatum = `${loopDag.getFullYear()}-${String(loopDag.getMonth()+1).padStart(2,'0')}-${String(loopDag.getDate()).padStart(2,'0')}`;
        let displayDatum = `${loopDag.getDate()}-${loopDag.getMonth()+1}`;

        // 1. CHECK JAARPLANNING (VAKANTIE OF ANNULERING)
        let dagItems = jaarplanningData.filter(item => {
            if(!item.isoDatum) return false;
            let start = item.isoDatum;
            let eind = item.eindDatum || item.isoDatum;
            return (start <= isoDatum && eind >= isoDatum);
        });
        
        let isVakantie = false;
        let vakantieTitel = "";
        dagItems.forEach(item => {
            let catId = (item.type || 'memo').toLowerCase();
            let cat = kalenderCategorieen.find(c => c.id === catId);
            if (cat && cat.isVakantie) {
                isVakantie = true;
                vakantieTitel = item.titel;
            }
        });

        // 2. CHECK ZAALHUUR
        let zalenOpDag = zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
        let gehuurdeZalen = [...new Set(zalenOpDag.map(z => z.zaal.replace('Sporthal', '').replace('Sportzaal', '').trim()))];

        // 3. TRAININGEN OPHALEN
        let actieveKeys = Object.keys(window.geplandeTrainingenDB).filter(k => k.startsWith(isoDatum) && window.geplandeTrainingenDB[k].length > 0);

        // Bepaal Waarschuwingen & Kleuren
        let bgClass = "background: var(--card-alt-bg);";
        let headerClass = "background: var(--secondary-color);";
        let waarschuwingHtml = "";
        let zaalHtml = "";

        if (isVakantie) {
            bgClass = "background: rgba(231, 76, 60, 0.05); border: 2px solid #e74c3c;";
            headerClass = "background: #e74c3c;";
        } else if (actieveKeys.length > 0 && gehuurdeZalen.length === 0) {
            // Alarm: Wel trainingen gepland, maar geen zaal!
            bgClass = "background: rgba(231, 76, 60, 0.05); border: 2px solid #e74c3c;";
            headerClass = "background: #e74c3c;";
            waarschuwingHtml = `<div style="background:#e74c3c; color:white; padding:10px; text-align:center; font-weight:bold; font-size:0.9rem; border-radius:0 0 6px 6px; margin-top:auto; box-shadow:0 -2px 5px rgba(0,0,0,0.1);">⚠️ PAS OP: GEEN ZAAL GEHUURD!</div>`;
        }

        if (!isVakantie) {
            if (gehuurdeZalen.length > 0) {
                zaalHtml = `<div style="background:var(--primary-color); color:white; font-size:0.75rem; text-align:center; padding:6px; font-weight:bold; text-transform:uppercase; letter-spacing:1px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🏢 Zaalhuur: ${gehuurdeZalen.join(' & ')}</div>`;
            } else {
                zaalHtml = `<div style="background:var(--text-muted); color:white; font-size:0.7rem; text-align:center; padding:4px; font-weight:bold; text-transform:uppercase; opacity:0.8;">Geen zaalhuur bekend</div>`;
            }
        }

        // Bouw de HTML Kolom op
        agendaHtml += `
            <div class="dag-kolom" style="${bgClass} display:flex; flex-direction:column; justify-content:flex-start; min-height:280px; position:relative;">
                <div class="dag-header" style="${headerClass} color:white; padding:10px; text-align:center; font-weight:bold; font-size:1.1rem; border-radius:6px 6px 0 0;">
                    ${dagNamen[i]} <span style="font-size:0.8rem; font-weight:normal;">(${displayDatum})</span>
                </div>
                ${zaalHtml}
                <div style="flex:1; padding:10px; display: flex; flex-direction: column;">
        `;

        if (isVakantie) {
            agendaHtml += `
                <div style="background:rgba(231, 76, 60, 0.1); border:1px solid rgba(231, 76, 60, 0.3); color:#c0392b; padding:20px 10px; border-radius:6px; text-align:center; margin-top:15px;">
                    <div style="font-size:2.5rem; margin-bottom:10px;">🏖️</div>
                    <strong style="font-size:1rem; display:block; text-transform:uppercase;">Geannuleerd via Jaarplanning:</strong>
                    <span style="font-size:1.1rem; font-weight:bold;">${vakantieTitel}</span>
                </div>
            `;
        } else {
            if (actieveKeys.length > 0) {
                // Hier is de Side-By-Side (Grid) container toegevoegd!
                agendaHtml += `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap:10px; margin-bottom:15px;">`;
                
                actieveKeys.forEach(k => {
                    let teamId = k.split('_')[1];
                    let team = window.teamsDB.find(t => t.id === teamId);
                    let teamNaam = team ? team.naam : "Onbekend";
                    let tijd = team ? team.trainingTijd : "Tijd onbekend";
                    let veldInfo = team && team.trainingLocatie ? `<span style="display:inline-block; font-size:0.7rem; background:rgba(52, 152, 219, 0.1); color:var(--primary-color); padding:2px 5px; border-radius:4px; margin-top:3px;">📍 Veld ${team.trainingLocatie}</span>` : '';
                    
                    // Beveiliging: Mag deze trainer dit team aanpassen?
                    let uDB = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {};
                    let isTrainer = (uDB.rol === 'trainer');
                    let magBewerken = !isTrainer || (uDB.teams && (uDB.teams.includes('all') || uDB.teams.includes(teamId)));
                    let clickAction = magBewerken ? `window.openDagDetail('${isoDatum}', '${teamId}')` : `alert('Je hebt geen rechten om deze training te bewerken.')`;
                    let opacityStyle = magBewerken ? '' : 'opacity:0.6; cursor:not-allowed;';

                    agendaHtml += `
                        <div class="training-item" onclick="${clickAction}" style="margin:0; ${opacityStyle} padding:10px; border-radius:6px; background:var(--card-bg); border:1px solid var(--border-color); border-left:4px solid var(--primary-color); box-shadow:0 2px 4px rgba(0,0,0,0.05); text-align:center;">
                            <strong style="display:block; color:var(--text-color); font-size:1rem; margin-bottom:4px;">${teamNaam}</strong>
                            <div style="font-size:0.8rem; color:var(--text-muted); font-weight:bold;">⏰ ${tijd}</div>
                            ${veldInfo}
                            <div style="font-size:0.75rem; color:white; background:var(--primary-color); border-radius:12px; padding:3px 8px; display:inline-block; margin-top:8px; font-weight:bold;">
                                ${window.geplandeTrainingenDB[k].length} Oef.
                            </div>
                        </div>
                    `;
                });
                agendaHtml += `</div>`;
            } else {
                agendaHtml += `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; font-style:italic; margin-top:20px;">Geen trainingen ingepland.</p>`;
            }

            // Knoppen onderaan (Voor Admins/Bestuur)
            agendaHtml += `
                <div style="margin-top:auto; display:flex; flex-direction:column; gap:5px;">
                    <button class="admin-only" onclick="window.openTeamKiezer('${isoDatum}')" style="background:transparent; border:2px dashed var(--border-dark); color:var(--text-color); padding:10px; border-radius:6px; font-size:0.9rem; font-weight:bold; cursor:pointer; transition:0.2s;">
                        + Team Toevoegen
                    </button>
                    ${actieveKeys.length > 0 ? `<button class="admin-only" onclick="window.wisDag('${isoDatum}')" style="background:transparent; border:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; margin-top:5px; text-decoration:underline;">Wis alle trainingen</button>` : ''}
                </div>
            `;
        }

        agendaHtml += `
                </div>
                ${waarschuwingHtml}
            </div>
        `;
    }
    grid.innerHTML = agendaHtml;
};

// ============================================================================
// MODALS & DETAIL BEWERKING (Blijven intact)
// ============================================================================
window.openTeamKiezer = function(isoDatum) {
    let uDB = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {};
    let isTrainer = (uDB.rol === 'trainer');
    
    let keuzes = window.teamsDB.filter(t => !isTrainer || (uDB.teams && (uDB.teams.includes('all') || uDB.teams.includes(t.id))));
    if (keuzes.length === 0) return alert("Je hebt geen teams toegewezen gekregen.");

    let teamId = prompt("Welk team wil je inplannen op deze dag?\n\nKies uit: \n" + keuzes.map(t => `- ${t.naam}`).join('\n') + "\n\n(Typ de exacte naam of annuleer)");
    if (!teamId) return;

    let match = keuzes.find(t => t.naam.toLowerCase() === teamId.toLowerCase());
    if (match) {
        let key = `${isoDatum}_${match.id}`;
        if (!window.geplandeTrainingenDB[key]) {
            window.geplandeTrainingenDB[key] = [];
            localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
            window.renderWeekAgenda();
        } else {
            alert("Dit team is al ingepland op deze dag.");
        }
    } else {
        alert("Team niet gevonden of je hebt geen rechten.");
    }
};

window.openDagDetail = function(isoDatum, teamId) {
    actieveTraining = `${isoDatum}_${teamId}`;
    actieveTijdlijn = window.geplandeTrainingenDB[actieveTraining] ? [...window.geplandeTrainingenDB[actieveTraining]] : [];
    
    let team = window.teamsDB.find(t => t.id === teamId);
    let nwDatum = isoDatum.split('-').reverse().join('-');
    document.getElementById('modal-titel').innerText = `Training: ${team ? team.naam : 'Onbekend'} (${nwDatum})`;

    window.tekenOefeningenKiezer();
    window.tekenTijdlijn();
    document.getElementById('dag-detail-modal').style.display = 'flex';
};

window.sluitDagDetail = function() {
    document.getElementById('dag-detail-modal').style.display = 'none';
    actieveTraining = null; actieveTijdlijn = [];
};

window.opslaanDagDetail = function() {
    if (actieveTraining) {
        window.geplandeTrainingenDB[actieveTraining] = actieveTijdlijn;
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        window.renderWeekAgenda();
    }
    window.sluitDagDetail();
};

window.wisDag = function(isoDatum) {
    if (confirm(`Weet je zeker dat je ALLE trainingen van ${isoDatum} wilt wissen?`)) {
        Object.keys(window.geplandeTrainingenDB).forEach(k => {
            if (k.startsWith(isoDatum)) delete window.geplandeTrainingenDB[k];
        });
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        window.renderWeekAgenda();
    }
};

// ============================================================================
// OEFENINGEN & TIJDLIJN BEHEER (Voor de modal)
// ============================================================================
window.tekenOefeningenKiezer = function() {
    let container = document.getElementById('oefeningen-kiezer');
    let catSelect = document.getElementById('filter-categorie');
    if (!container) return;

    if (catSelect && catSelect.options.length <= 1) {
        catSelect.innerHTML = '<option value="all">-- Alle Categorieën --</option>';
        let uniekeCats = [...new Set(window.oefeningenDB.map(o => o.categorie).filter(Boolean))];
        uniekeCats.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
    }

    let zoekterm = document.getElementById('zoek-oefening') ? document.getElementById('zoek-oefening').value.toLowerCase() : "";
    let catFilter = catSelect ? catSelect.value : "all";

    let gefilterd = window.oefeningenDB.filter(o => {
        let matchZ = !zoekterm || o.naam.toLowerCase().includes(zoekterm);
        let matchC = (catFilter === "all") || (o.categorie === catFilter);
        return matchZ && matchC;
    });

    if (gefilterd.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); font-style:italic;">Geen oefeningen gevonden.</p>';
        return;
    }

    let html = '';
    gefilterd.forEach((oef, idx) => {
        let isProgressie = (oef.type === 'progressie');
        let progLijst = isProgressie ? `<ul style="margin:5px 0 0 20px; font-size:0.8rem; color:var(--text-muted);">` + oef.stappen.map(s => `<li>${s.naam} (${s.duur}m)</li>`).join('') + `</ul>` : '';
        let badge = isProgressie ? '🔄 Oefeningen-Reeks' : '⏱️ Losse Oefening';
        let imgHtml = oef.afbeeldingData ? `<img src="${oef.afbeeldingData}" style="width:100%; max-height:100px; object-fit:contain; margin-bottom:10px; border-radius:4px; border:1px solid #ccc;">` : '';

        html += `
            <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:6px; margin-bottom:10px; overflow:hidden;">
                <div style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <span style="font-size:0.7rem; background:var(--secondary-color); color:white; padding:2px 6px; border-radius:4px;">${badge}</span><br>
                        <strong style="color:var(--text-color); font-size:1rem; display:block; margin-top:4px;">${oef.naam}</strong>
                        <span style="font-size:0.8rem; color:var(--text-muted);">${isProgressie ? oef.totaleDuur : oef.duur} min | ${oef.categorie || 'Geen cat.'}</span>
                        ${progLijst}
                    </div>
                    <button onclick="window.voegToeAanTraining('${oef.id}')" style="background:var(--primary-color); color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:1.1rem; margin-left:10px;">+</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
};

window.voegToeAanTraining = function(oefId) {
    let oef = window.oefeningenDB.find(o => o.id === oefId);
    if (!oef) return;
    actieveTijdlijn.push(JSON.parse(JSON.stringify(oef)));
    window.tekenTijdlijn();
};

window.verwijderUitTijdlijn = function(index) {
    actieveTijdlijn.splice(index, 1);
    window.tekenTijdlijn();
};

window.verschuifTijdlijn = function(index, richting) {
    if (index + richting < 0 || index + richting >= actieveTijdlijn.length) return;
    let temp = actieveTijdlijn[index];
    actieveTijdlijn[index] = actieveTijdlijn[index + richting];
    actieveTijdlijn[index + richting] = temp;
    window.tekenTijdlijn();
};

window.tekenTijdlijn = function() {
    let container = document.getElementById('tijdlijn-container');
    if (!container) return;

    if (actieveTijdlijn.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted); font-style:italic;">Voeg oefeningen toe via de lijst hiernaast...</div>';
        return;
    }

    let totaleTijd = actieveTijdlijn.reduce((som, o) => som + parseInt(o.type === 'progressie' ? o.totaleDuur : o.duur), 0);
    let html = `<div style="background:#2ecc71; color:white; text-align:center; padding:8px; border-radius:4px; font-weight:bold; margin-bottom:10px;">⏱️ Totale duur: ${totaleTijd} minuten</div>`;

    actieveTijdlijn.forEach((oef, idx) => {
        let tijdText = oef.type === 'progressie' ? `${oef.totaleDuur} min (Reeks)` : `${oef.duur} min`;
        html += `
            <div style="background:var(--card-bg); border-left:4px solid var(--primary-color); padding:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <div>
                    <strong style="color:var(--text-color); font-size:1rem;">${idx+1}. ${oef.naam}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${tijdText}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    ${idx > 0 ? `<button onclick="window.verschuifTijdlijn(${idx}, -1)" style="background:var(--border-color); border:none; padding:5px; border-radius:4px; cursor:pointer;">⬆️</button>` : ''}
                    ${idx < actieveTijdlijn.length - 1 ? `<button onclick="window.verschuifTijdlijn(${idx}, 1)" style="background:var(--border-color); border:none; padding:5px; border-radius:4px; cursor:pointer;">⬇️</button>` : ''}
                    <button onclick="window.verwijderUitTijdlijn(${idx})" style="background:#e74c3c; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer; margin-left:5px;">✖</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
};

// Start applicatie
document.addEventListener('DOMContentLoaded', () => {
    window.renderWeekAgenda();
});