// --- BASKETBAL_AGENDA.JS ---

let actieveTraining = null;
let actieveTijdlijn = [];
let actieveWeekStart = new Date();

let d = actieveWeekStart.getDay();
let diff = actieveWeekStart.getDate() - d + (d === 0 ? -6 : 1);
actieveWeekStart.setDate(diff);
actieveWeekStart.setHours(0,0,0,0);

window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};
window.afgelasteTrainingen = JSON.parse(localStorage.getItem('blackshots_afgelaste_trainingen')) || [];

// ============================================================================
// WISSEN TUSSEN WEEK & TEAM WEERGAVE
// ============================================================================
window.wisselAgendaView = function(view) {
    const btnWeek = document.getElementById('btn-view-week'); 
    const btnTeam = document.getElementById('btn-view-team');
    if (!btnWeek || !btnTeam) return;

    if (view === 'week') {
        btnWeek.style.background = 'var(--primary-color)'; btnWeek.style.color = 'white'; btnWeek.style.border = 'none';
        btnTeam.style.background = 'transparent'; btnTeam.style.color = 'var(--text-color)'; btnTeam.style.border = '2px solid var(--border-color)';
        
        document.getElementById('agenda-week-controls').style.display = 'flex';
        document.getElementById('agenda-grid').style.display = 'grid';
        document.getElementById('agenda-team-controls').style.display = 'none';
        document.getElementById('team-agenda-container').style.display = 'none';
        
        window.renderWeekAgenda();
    } else {
        btnTeam.style.background = 'var(--primary-color)'; btnTeam.style.color = 'white'; btnTeam.style.border = 'none';
        btnWeek.style.background = 'transparent'; btnWeek.style.color = 'var(--text-color)'; btnWeek.style.border = '2px solid var(--border-color)';
        
        document.getElementById('agenda-week-controls').style.display = 'none';
        document.getElementById('agenda-grid').style.display = 'none';
        document.getElementById('agenda-team-controls').style.display = 'flex';
        document.getElementById('team-agenda-container').style.display = 'block';
        
        window.vulAgendaTeamSelect(); 
        window.renderTeamAgenda();
    }
};

window.vulAgendaTeamSelect = function() {
    const select = document.getElementById('agenda-team-select');
    if (select && select.options.length <= 1) {
        select.innerHTML = '<option value="">-- Kies een team --</option>';
        window.teamsDB.forEach(t => { 
            select.innerHTML += `<option value="${t.id}">${t.naam}</option>`; 
        });
    }
};

window.getIsoDatumS = function(dateObj) {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(dateObj - tzOffset)).toISOString().slice(0, 10);
};

// ============================================================================
// TEAM AGENDA RENDEREN
// ============================================================================
window.renderTeamAgenda = function() {
    const container = document.getElementById('team-agenda-container');
    if (!container) return;
    const teamId = document.getElementById('agenda-team-select').value;
    container.innerHTML = '';
    
    if (!teamId) { 
        container.innerHTML = '<p style="color:var(--text-muted); font-style:italic; padding:20px; text-align:center;">Kies hierboven een team om het schema te zien.</p>'; 
        return; 
    }

    const team = window.teamsDB.find(t => t.id === teamId);
    if (!team || !team.trainingen || team.trainingen.length === 0) {
        container.innerHTML = '<div style="background:rgba(230, 126, 34, 0.1); border:1px solid #e67e22; padding:15px; border-radius:6px; color:#d35400;"><strong>Geen vaste trainingstijden!</strong> Ga naar "Teams" om tijden in te stellen.</div>'; 
        return;
    }

    let startDatum = new Date(); startDatum.setHours(0,0,0,0);
    let aankomendeTrainingen = [];
    const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag", 7: "Zondag"};

    for (let i = 0; i < 60; i++) {
        let checkDatum = new Date(startDatum); checkDatum.setDate(checkDatum.getDate() + i);
        let isoDatum = window.getIsoDatumS(checkDatum); 
        let dagNummer = checkDatum.getDay() || 7; 
        
        team.trainingen.forEach(tr => {
            if (parseInt(tr.dag) === parseInt(dagNummer)) {
                aankomendeTrainingen.push({
                    datumObj: checkDatum, isoDatum: isoDatum,
                    mooieDatum: `${dagenMap[dagNummer]} ${checkDatum.getDate()}-${checkDatum.getMonth()+1}`,
                    start: tr.start, eind: tr.eind, zaal: tr.zaal, veld: tr.veld || '', duur: tr.duur || 90, teamId: team.id, teamNaam: team.naam
                });
            }
        });
    }

    let vandaagIso = window.getIsoDatumS(new Date());

    aankomendeTrainingen.forEach(tr => {
        let opslagSleutel = `${tr.isoDatum}_${tr.teamId}`;
        let isVandaag = tr.isoDatum === vandaagIso;
        let isAfgelast = window.afgelasteTrainingen.includes(opslagSleutel);
        
        let dbTr = window.geplandeTrainingenDB[opslagSleutel] || [];
        let isGepland = `<span style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">⚠️ Leeg</span>`;
        let randStyle = isVandaag ? 'border-left: 6px solid var(--primary-color); background: var(--hover-bg);' : 'border-left: 6px solid var(--border-color); background: var(--card-bg);';

        if (dbTr.length > 0) isGepland = `<span style="background:#27ae60; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">✅ Gevuld</span>`;
        if (isAfgelast) {
            isGepland = `<span style="background:#e74c3c; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">❌ Afgelast</span>`;
            randStyle = 'border-left: 6px solid #e74c3c; background: rgba(231,76,60,0.05);';
        }

        let veldDisplay = tr.veld ? ` - Veld ${tr.veld}` : '';
        let openFunctie = `window.openDagDetail('${tr.isoDatum}', '${tr.teamId}')`;

        container.innerHTML += `
            <div style="${randStyle} padding:15px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.02); margin-bottom:10px;" onclick="${openFunctie}">
                <div>
                    <strong style="display:block; font-size:1.1rem; color:var(--text-color); margin-bottom:5px; ${isAfgelast ? 'text-decoration:line-through; color:#e74c3c;' : ''}">📅 ${tr.mooieDatum} ${isVandaag ? '<span style="color:#e74c3c; font-size:0.8rem;">(Vandaag)</span>' : ''}</strong>
                    <div style="color:var(--text-muted); font-size:0.9rem;">🕒 ${tr.start} - ${tr.eind} (${tr.duur} min) &nbsp;|&nbsp; 📍 ${tr.zaal}${veldDisplay}</div>
                </div>
                <div>${isGepland}</div>
            </div>
        `;
    });
};

// ============================================================================
// WHATSAPP & AFLASSEN FUNCTIES
// ============================================================================
window.toggleAflassen = function(key) {
    if(confirm("Wil je deze training aflassen/herstellen?")) {
        let idx = window.afgelasteTrainingen.indexOf(key);
        if(idx > -1) window.afgelasteTrainingen.splice(idx, 1);
        else window.afgelasteTrainingen.push(key);
        localStorage.setItem('blackshots_afgelaste_trainingen', JSON.stringify(window.afgelasteTrainingen));
        window.renderWeekAgenda();
    }
};

window.stuurWhatsApp = function(teamNaam, weergaveDatum, tijd, isAfgelast) {
    let tijdTekst = tijd ? ` om ${tijd}` : "";
    let tekst = isAfgelast
        ? `Hoi ${teamNaam},\n\nHelaas is de training van ${weergaveDatum}${tijdTekst} AFGELAST! ❌\n\nGroeten, de trainer.`
        : `Hoi ${teamNaam},\n\nVergeet de training van ${weergaveDatum}${tijdTekst} niet! 🏀 Tot dan!\n\nGroeten, de trainer.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(tekst)}`, '_blank');
};

// ============================================================================
// WEEKAGENDA RENDEREN (KOGELVRIJ + GRID)
// ============================================================================
window.wijzigWeek = function(delta) { actieveWeekStart.setDate(actieveWeekStart.getDate() + (delta * 7)); window.renderWeekAgenda(); };
window.gaNaarHuidigeWeek = function() { actieveWeekStart = new Date(); let d = actieveWeekStart.getDay(); actieveWeekStart.setDate(actieveWeekStart.getDate() - d + (d === 0 ? -6 : 1)); window.renderWeekAgenda(); };

window.renderWeekAgenda = function() {
    let grid = document.getElementById('agenda-grid');
    let label = document.getElementById('week-label');
    if (!grid) return;

    try {
        let startDatum = new Date(actieveWeekStart);
        let eindDatum = new Date(actieveWeekStart);
        eindDatum.setDate(startDatum.getDate() + 4); 
        
        let sMnd = startDatum.toLocaleString('nl-NL', { month: 'short' });
        let eMnd = eindDatum.toLocaleString('nl-NL', { month: 'short' });
        if (label) label.innerText = `Week van ma ${startDatum.getDate()} ${sMnd} t/m vr ${eindDatum.getDate()} ${eMnd} ${startDatum.getFullYear()}`;

        let agendaHtml = '';
        let dagNamen = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

        let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
        let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];

        for (let i = 0; i < 5; i++) {
            let loopDag = new Date(startDatum);
            loopDag.setDate(startDatum.getDate() + i);
            let isoDatum = `${loopDag.getFullYear()}-${String(loopDag.getMonth()+1).padStart(2,'0')}-${String(loopDag.getDate()).padStart(2,'0')}`;
            let displayDatum = `${loopDag.getDate()}-${loopDag.getMonth()+1}`;
            let nlDatum = `${dagNamen[i]} ${loopDag.getDate()} ${loopDag.toLocaleString('nl-NL', {month:'short'})}`;
            let dagNummer = loopDag.getDay() || 7;

            // Zoeken naar vaste trainingen (rooster) + losse trainingen
            let dagTrainingen = [];
            window.teamsDB.forEach(team => {
                if (team.trainingen && Array.isArray(team.trainingen)) {
                    team.trainingen.forEach(tr => {
                        if (parseInt(tr.dag) === parseInt(dagNummer)) {
                            dagTrainingen.push({ team: team, training: tr, sleutel: `${isoDatum}_${team.id}` });
                        }
                    });
                }
            });

            Object.keys(window.geplandeTrainingenDB).forEach(k => {
                if (k.startsWith(isoDatum) && window.geplandeTrainingenDB[k].length > 0) {
                    let teamId = k.split('_')[1];
                    if (!dagTrainingen.some(d => d.sleutel === k)) {
                        let team = window.teamsDB.find(t => t.id === teamId);
                        if (team) dagTrainingen.push({ team: team, training: { start: team.trainingTijd || "", zaal: team.trainingLocatie || "" }, sleutel: k });
                    }
                }
            });

            // Vakantie Check
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
                if (cat && cat.isVakantie) { isVakantie = true; vakantieTitel = item.titel; }
            });

            // Zaalhuur Check
            let zalenOpDag = zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
            let gehuurdeZalen = [...new Set(zalenOpDag.map(z => z.zaal.replace('Sporthal', '').replace('Sportzaal', '').trim()))];

            let bgClass = "background: var(--card-alt-bg);";
            let headerClass = "background: var(--secondary-color);";
            let waarschuwingHtml = "";
            let zaalHtml = "";

            if (isVakantie) {
                bgClass = "background: rgba(231, 76, 60, 0.05); border: 2px solid #e74c3c;";
                headerClass = "background: #e74c3c;";
            } else if (dagTrainingen.length > 0 && gehuurdeZalen.length === 0) {
                bgClass = "background: rgba(231, 76, 60, 0.05); border: 2px solid #e74c3c;";
                headerClass = "background: #e74c3c;";
                waarschuwingHtml = `<div style="background:#e74c3c; color:white; padding:10px; text-align:center; font-weight:bold; font-size:0.9rem; border-radius:0 0 6px 6px; margin-top:auto;">⚠️ PAS OP: GEEN ZAAL GEHUURD!</div>`;
            }

            if (!isVakantie) {
                if (gehuurdeZalen.length > 0) zaalHtml = `<div style="background:var(--primary-color); color:white; font-size:0.75rem; text-align:center; padding:6px; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">🏢 Zaalhuur: ${gehuurdeZalen.join(' & ')}</div>`;
                else zaalHtml = `<div style="background:var(--border-dark); color:white; font-size:0.7rem; text-align:center; padding:4px; font-weight:bold; text-transform:uppercase;">Geen zaalhuur bekend</div>`;
            }

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
                    </div></div>
                `;
                continue;
            }

            if (dagTrainingen.length > 0) {
                let zaalGroepen = {};
                dagTrainingen.forEach(item => {
                    let locatie = item.training.zaal ? String(item.training.zaal) : "Onbekend";
                    let basisZaal = locatie.split('-')[0].trim().toLowerCase(); 
                    if (!basisZaal) basisZaal = "onbekend";
                    if (!zaalGroepen[basisZaal]) zaalGroepen[basisZaal] = [];
                    zaalGroepen[basisZaal].push(item);
                });

                Object.keys(zaalGroepen).forEach(zaal => {
                    let keysInZaal = zaalGroepen[zaal];
                    let gridStyle = keysInZaal.length > 1 ? 'display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-bottom: 10px;' : 'margin-bottom: 10px;';
                    
                    agendaHtml += `<div style="${gridStyle}">`;

                    keysInZaal.forEach(item => {
                        let k = item.sleutel;
                        let team = item.team;
                        let tr = item.training;
                        
                        let isAfgelast = window.afgelasteTrainingen.includes(k);
                        let oefCount = (window.geplandeTrainingenDB[k] || []).length;

                        let uDB = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {};
                        let isTrainer = (uDB.rol === 'trainer');
                        let magBewerken = !isTrainer || (uDB.teams && (uDB.teams.includes('all') || uDB.teams.includes(team.id)));
                        
                        let clickAction = magBewerken ? `window.openDagDetail('${isoDatum}', '${team.id}')` : `alert('Je hebt geen rechten om deze training te bewerken.')`;
                        
                        let cardBorder = isAfgelast ? "border-left: 5px solid #e74c3c;" : "border-left: 5px solid var(--primary-color);";
                        let cardBg = isAfgelast ? "background: rgba(231,76,60,0.1);" : "background: var(--card-bg);";
                        let textDeco = isAfgelast ? "text-decoration: line-through; color: #e74c3c;" : "color: var(--text-color);";
                        let opacityStyle = magBewerken ? '' : 'opacity:0.6; cursor:not-allowed;';
                        let itemMargin = keysInZaal.length > 1 ? 'margin: 0;' : ''; 
                        let veldDisplay = tr.veld ? ` - Veld ${tr.veld}` : '';

                        agendaHtml += `
                            <div class="training-item" onclick="${clickAction}" style="${opacityStyle} ${itemMargin} ${cardBg} ${cardBorder} padding:12px; border-radius:6px; border: 1px solid var(--border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.05); position:relative; display:flex; flex-direction:column;">
                                ${isAfgelast ? `<div style="position:absolute; top:10px; right:10px; font-size:0.7rem; background:#e74c3c; color:white; font-weight:bold; padding:2px 6px; border-radius:4px;">AFGELAST</div>` : ''}
                                
                                <strong style="display:block; font-size:1.1rem; ${textDeco} margin-bottom:5px;">${team.naam}</strong>
                                
                                <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">
                                    ${tr.start ? `<div>⏰ ${tr.start}</div>` : ''}
                                    ${tr.zaal ? `<div>📍 ${tr.zaal}${veldDisplay}</div>` : ''}
                                    <div style="margin-top:5px; font-weight:bold; color:var(--secondary-color);">
                                        📝 ${oefCount} Oefeningen
                                    </div>
                                </div>

                                <div style="display:flex; gap:5px; border-top:1px solid var(--border-color); padding-top:10px; margin-top:auto;">
                                    ${magBewerken ? `<button onclick="event.stopPropagation(); window.toggleAflassen('${k}')" title="Aflassen / Herstellen" style="background:rgba(231, 76, 60, 0.1); border:none; color:#e74c3c; padding:6px; border-radius:4px; cursor:pointer; flex:1;">❌</button>` : ''}
                                    <button onclick="event.stopPropagation(); window.stuurWhatsApp('${team.naam}', '${nlDatum}', '${tr.start}', ${isAfgelast})" title="Stuur WhatsApp" style="background:rgba(39, 174, 96, 0.1); border:none; color:#27ae60; padding:6px; border-radius:4px; cursor:pointer; flex:1;">💬</button>
                                </div>
                            </div>
                        `;
                    });
                    agendaHtml += `</div>`; 
                });
            } else {
                agendaHtml += `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; font-style:italic; margin-top:20px;">Geen trainingen ingepland.</p>`;
            }

            agendaHtml += `
                    </div>
                    <div style="padding:10px; border-top:1px solid var(--border-color); background:var(--card-bg); margin-top:auto;">
                        <button class="admin-only" onclick="window.openTeamKiezer('${isoDatum}')" style="width:100%; background:transparent; border:2px dashed var(--border-dark); color:var(--text-color); padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">
                            + Team Toevoegen
                        </button>
                        ${dagTrainingen.length > 0 ? `<button class="admin-only" onclick="window.wisDag('${isoDatum}')" style="width:100%; background:transparent; border:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; margin-top:5px;">Wis alle trainingen</button>` : ''}
                    </div>
                </div>
                ${waarschuwingHtml}
            `;
        }
        grid.innerHTML = agendaHtml;
    } catch (error) {
        console.error("Fout in renderWeekAgenda:", error);
    }
};

// ============================================================================
// MODALS & DATA BEHEER
// ============================================================================
window.openTeamKiezer = function(isoDatum) {
    let uDB = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {};
    let isTrainer = (uDB.rol === 'trainer');
    let keuzes = window.teamsDB.filter(t => !isTrainer || (uDB.teams && (uDB.teams.includes('all') || uDB.teams.includes(t.id))));
    if (keuzes.length === 0) return alert("Je hebt geen teams toegewezen gekregen.");

    let teamId = prompt("Welk team wil je inplannen?\n\nKies uit: \n" + keuzes.map(t => `- ${t.naam}`).join('\n'));
    if (!teamId) return;

    let match = keuzes.find(t => t.naam.toLowerCase() === teamId.toLowerCase());
    if (match) {
        let key = `${isoDatum}_${match.id}`;
        if (!window.geplandeTrainingenDB[key]) {
            window.geplandeTrainingenDB[key] = [];
            localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
            window.renderWeekAgenda();
        } else alert("Dit team is al ingepland.");
    } else alert("Team niet gevonden.");
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
        if(document.getElementById('agenda-week-controls').style.display !== 'none') window.renderWeekAgenda();
        else window.renderTeamAgenda();
    }
    window.sluitDagDetail();
};

window.openBulkModal = function() { document.getElementById('bulk-modal').style.display = 'flex'; };

window.voerBulkAnnuleringUit = function() {
    let start = document.getElementById('bulk-start').value;
    let eind = document.getElementById('bulk-eind').value;
    if (!start || !eind || start > eind) return alert("Vul een geldige periode in.");
    if(confirm(`Weet je zeker dat je trainingen tussen ${start} en ${eind} wilt wissen?`)) {
        Object.keys(window.geplandeTrainingenDB).forEach(k => {
            let datum = k.split('_')[0];
            if (datum >= start && datum <= eind) delete window.geplandeTrainingenDB[k];
        });
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        document.getElementById('bulk-modal').style.display = 'none';
        window.renderWeekAgenda();
    }
};

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

    let html = '';
    gefilterd.forEach(oef => {
        let isProgressie = (oef.type === 'progressie');
        let badge = isProgressie ? '🔄 Oefeningen-Reeks' : '⏱️ Losse Oefening';
        html += `
            <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:6px; margin-bottom:10px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;">
                    <span style="font-size:0.7rem; background:var(--secondary-color); color:white; padding:2px 6px; border-radius:4px;">${badge}</span><br>
                    <strong style="color:var(--text-color); font-size:1rem; display:block; margin-top:4px;">${oef.naam}</strong>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${isProgressie ? oef.totaleDuur : oef.duur} min</span>
                </div>
                <button onclick="window.voegToeAanTraining('${oef.id}')" style="background:var(--primary-color); color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold;">+</button>
            </div>
        `;
    });
    container.innerHTML = html;
};

window.voegToeAanTraining = function(oefId) {
    let oef = window.oefeningenDB.find(o => o.id === oefId);
    if (oef) {
        actieveTijdlijn.push(JSON.parse(JSON.stringify(oef)));
        window.tekenTijdlijn();
    }
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
            <div style="background:var(--card-bg); border-left:4px solid var(--primary-color); padding:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:8px;">
                <div>
                    <strong style="color:var(--text-color); font-size:1rem;">${idx+1}. ${oef.naam}</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-muted);">${tijdText}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    ${idx > 0 ? `<button onclick="window.verschuifTijdlijn(${idx}, -1)" style="background:var(--border-color); border:none; padding:5px; border-radius:4px; cursor:pointer;">⬆️</button>` : ''}
                    ${idx < actieveTijdlijn.length - 1 ? `<button onclick="window.verschuifTijdlijn(${idx}, 1)" style="background:var(--border-color); border:none; padding:5px; border-radius:4px; cursor:pointer;">⬇️</button>` : ''}
                    <button onclick="window.verwijderUitTijdlijn(${idx})" style="background:#e74c3c; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">✖</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (window.renderWeekAgenda) window.renderWeekAgenda(); }, 200);
});