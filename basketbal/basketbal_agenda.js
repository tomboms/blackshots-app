// --- BASKETBAL_AGENDA.JS: KOGELVRIJE AGENDA MET GRID, ZAALHUUR & WAARSCHUWINGEN ---

let actieveTraining = null;
let actieveTijdlijn = [];
let actieveWeekStart = new Date();

// DATA REPARATEUR
if (Array.isArray(window.geplandeTrainingenDB)) {
    let oudeArray = window.geplandeTrainingenDB;
    window.geplandeTrainingenDB = {};
    oudeArray.forEach(item => {
        if (!item) return;
        if (item.opslagSleutel && item.tijdlijn) {
            window.geplandeTrainingenDB[item.opslagSleutel] = item.tijdlijn;
        } else if (item.datum) {
            let matchTeam = (window.teamsDB || []).find(t => 
                t.naam === item.titel || t.id === item.titel || (t.id && item.titel && t.id.includes(item.titel))
            );
            let tId = matchTeam ? matchTeam.id : 'unknown';
            let isoDate = item.datum;
            if (item.datum.includes('-')) {
                let parts = item.datum.split('-');
                if (parts[0].length === 2) isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            let sleutel = `${isoDate}_${tId}`;
            window.geplandeTrainingenDB[sleutel] = [{ naam: item.titel || 'Training', duur: 90, kleur: '#3498db' }];
        }
    });
    localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
}

function injecteerMooieModals() {
    if (document.getElementById('custom-prompt-modal')) return;
    const style = document.createElement('style');
    style.innerHTML = `
        .mooie-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(26, 37, 48, 0.6); display:none; justify-content:center; align-items:center; z-index:999999; backdrop-filter:blur(4px); }
        .mooie-modal-content { background:white; padding:30px; border-radius:12px; width:90%; max-width:420px; box-shadow:0 15px 35px rgba(0,0,0,0.2); text-align:center; animation:popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275); border-top:6px solid #3498db; }
        @keyframes popIn { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }
        .mooie-input { width:100%; padding:12px; margin:15px 0; border:2px solid #bdc3c7; border-radius:6px; font-size:1rem; box-sizing:border-box; }
        .mooie-input:focus { border-color:#3498db; outline:none; }
        .mooie-btn-groep { display:flex; gap:10px; justify-content:center; margin-top:10px; }
        .mooie-btn { flex:1; padding:12px; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1rem; transition:0.2s; }
        .btn-cancel { background:#ecf0f1; color:#7f8c8d; } .btn-cancel:hover { background:#bdc3c7; }
        .btn-confirm { background:#3498db; color:white; } .btn-confirm:hover { background:#2980b9; }
    `;
    document.head.appendChild(style);

    const modalsHtml = `
        <div id="custom-prompt-modal" class="mooie-modal">
            <div class="mooie-modal-content">
                <h2 id="prompt-titel" style="margin-top:0; color:#2c3e50; font-size:1.4rem;">Titel</h2>
                <p id="prompt-tekst" style="color:#7f8c8d; font-size:0.95rem; margin-bottom:5px;">Tekst</p>
                <input type="text" id="prompt-input" class="mooie-input">
                <div class="mooie-btn-groep">
                    <button class="mooie-btn btn-cancel" onclick="document.getElementById('custom-prompt-modal').style.display='none'">Annuleren</button>
                    <button id="prompt-confirm-btn" class="mooie-btn btn-confirm">Bevestigen</button>
                </div>
            </div>
        </div>
        <div id="custom-confirm-modal" class="mooie-modal">
            <div class="mooie-modal-content">
                <h2 id="confirm-titel" style="margin-top:0; color:#2c3e50; font-size:1.4rem;">Titel</h2>
                <p id="confirm-tekst" style="color:#7f8c8d; font-size:0.95rem; margin-bottom:20px;">Tekst</p>
                <div class="mooie-btn-groep">
                    <button class="mooie-btn btn-cancel" onclick="document.getElementById('custom-confirm-modal').style.display='none'">Annuleren</button>
                    <button id="confirm-yes-btn" class="mooie-btn btn-confirm" style="background:#e74c3c;">Ja</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalsHtml);
}
document.addEventListener('DOMContentLoaded', injecteerMooieModals);

function safeImage(imgStr) { return (!imgStr || imgStr === "null" || imgStr.trim() === "") ? null : imgStr; }
function zetOpMaandag(dateObj) { let d = new Date(dateObj); let dag = d.getDay() || 7; d.setDate(d.getDate() - dag + 1); d.setHours(0,0,0,0); return d; }
actieveWeekStart = zetOpMaandag(actieveWeekStart);

window.getIsoDatumS = function(dateObj) {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(dateObj - tzOffset)).toISOString().slice(0, 10);
};

window.toonCustomPrompt = function(titel, tekst, placeholder, callback) {
    document.getElementById('prompt-titel').innerText = titel; document.getElementById('prompt-tekst').innerText = tekst;
    let input = document.getElementById('prompt-input'); input.placeholder = placeholder; input.value = '';
    let confirmBtn = document.getElementById('prompt-confirm-btn');
    confirmBtn.onclick = function() { document.getElementById('custom-prompt-modal').style.display = 'none'; callback(input.value.trim()); };
    document.getElementById('custom-prompt-modal').style.display = 'flex'; input.focus();
};

window.toonCustomConfirm = function(titel, tekst, knopTekst, callback) {
    document.getElementById('confirm-titel').innerText = titel; document.getElementById('confirm-tekst').innerText = tekst;
    let confirmBtn = document.getElementById('confirm-yes-btn'); confirmBtn.innerText = knopTekst;
    confirmBtn.onclick = function() { document.getElementById('custom-confirm-modal').style.display = 'none'; callback(); };
    document.getElementById('custom-confirm-modal').style.display = 'flex';
};

// --- WHATSAPP & AFLASSEN LOGICA ---
window.toggleAflassen = function(key) {
    let afgelasteTrainingen = JSON.parse(localStorage.getItem('blackshots_afgelaste_trainingen')) || [];
    if(confirm("Wil je deze specifieke training aflassen/herstellen?")) {
        let idx = afgelasteTrainingen.indexOf(key);
        if(idx > -1) afgelasteTrainingen.splice(idx, 1);
        else afgelasteTrainingen.push(key);
        
        localStorage.setItem('blackshots_afgelaste_trainingen', JSON.stringify(afgelasteTrainingen));
        window.renderWeekAgenda();
    }
};

window.stuurWhatsApp = function(teamNaam, weergaveDatum, tijd, isAfgelast) {
    let tijdTekst = tijd ? ` om ${tijd}` : "";
    let tekst = isAfgelast
        ? `Hoi ${teamNaam},\n\nHelaas is de training van ${weergaveDatum}${tijdTekst} AFGELAST! ❌\n\nGroeten, de trainer.`
        : `Hoi ${teamNaam},\n\nVergeet de training van ${weergaveDatum}${tijdTekst} niet! 🏀 Tot dan!\n\nGroeten, de trainer.`;
    
    let url = `https://wa.me/?text=${encodeURIComponent(tekst)}`;
    window.open(url, '_blank');
};

// --- VIEW CONTROLS ---
window.wisselAgendaView = function(view) {
    const btnWeek = document.getElementById('btn-view-week'); const btnTeam = document.getElementById('btn-view-team');
    if (!btnWeek || !btnTeam) return;
    if (view === 'week') {
        btnWeek.style.background = 'var(--primary-color)'; btnWeek.style.color = 'white';
        btnTeam.style.background = 'transparent'; btnTeam.style.color = 'var(--secondary-color)';
        document.getElementById('agenda-week-controls').style.display = 'flex';
        document.getElementById('week-agenda-container').style.display = 'grid';
        document.getElementById('agenda-team-controls').style.display = 'none';
        window.renderWeekAgenda();
    } else {
        btnTeam.style.background = 'var(--primary-color)'; btnTeam.style.color = 'white';
        btnWeek.style.background = 'transparent'; btnWeek.style.color = 'var(--secondary-color)';
        document.getElementById('agenda-week-controls').style.display = 'none';
        document.getElementById('week-agenda-container').style.display = 'none';
        document.getElementById('agenda-team-controls').style.display = 'flex';
        window.vulAgendaTeamSelect(); window.renderTeamAgenda();
    }
};

window.vulAgendaTeamSelect = function() {
    const select = document.getElementById('agenda-team-select');
    if (select && select.options.length <= 1) {
        select.innerHTML = '<option value="">-- Kies een team --</option>';
        
        let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {teams:['all']};
        (window.teamsDB||[]).forEach(t => { 
            if(!actieveGebruiker.teams.includes('all') && !actieveGebruiker.teams.includes(t.id)) return;
            select.innerHTML += `<option value="${t.id}">${t.naam}</option>`; 
        });
    }
};

window.renderTeamAgenda = function() {
    const container = document.getElementById('team-agenda-container');
    if (!container) return;
    const teamId = document.getElementById('agenda-team-select').value;
    container.innerHTML = '';
    
    if (!teamId) { container.innerHTML = '<p style="color:#7f8c8d; font-style:italic; padding:20px; text-align:center;">Kies hierboven een team om het trainingsschema te zien.</p>'; return; }

    const team = window.teamsDB.find(t => t.id === teamId);
    if (!team || !team.trainingen || team.trainingen.length === 0) {
        container.innerHTML = '<div style="background:#fdf2e9; border:1px solid #e67e22; padding:15px; border-radius:6px; color:#d35400;"><strong>Geen trainingstijden!</strong> Ga naar "Teams" om een vaste trainingstijd aan dit team te koppelen.</div>'; return;
    }

    let startDatum = new Date(); startDatum.setHours(0,0,0,0);
    let aankomendeTrainingen = [];
    const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag", 7: "Zondag"};

    for (let i = 0; i < 60; i++) {
        let checkDatum = new Date(startDatum); checkDatum.setDate(checkDatum.getDate() + i);
        let isoDatum = window.getIsoDatumS(checkDatum); let dagNummer = checkDatum.getDay() || 7; 
        
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

    aankomendeTrainingen.sort((a,b) => a.datumObj - b.datumObj || (a.start || '').localeCompare(b.start || ''));

    aankomendeTrainingen.forEach(tr => {
        let opslagSleutel = `${tr.isoDatum}_${tr.teamId}`;
        let isVandaag = tr.isoDatum === window.getIsoDatumS(new Date());
        
        let isGepland = `<span style="background:#f39c12; color:white; padding:6px 10px; border-radius:4px; font-size:0.85rem; font-weight:bold;">⚠️ Nog Leeg</span>`;
        let randStyle = isVandaag ? 'border-left: 6px solid var(--primary-color); background: #fffcf8;' : 'border-left: 6px solid #bdc3c7; background: white;';

        if (window.geplandeTrainingenDB && window.geplandeTrainingenDB[opslagSleutel]) {
            let dbTr = window.geplandeTrainingenDB[opslagSleutel];
            if(dbTr.length === 1 && dbTr[0].type === 'geannuleerd') {
                isGepland = `<span style="background:#e74c3c; color:white; padding:6px 10px; border-radius:4px; font-size:0.85rem; font-weight:bold;">❌ Afgelast</span>`;
                randStyle = 'border-left: 6px solid #e74c3c; background: #fdedec;';
            } else {
                isGepland = `<span style="background:#27ae60; color:white; padding:6px 10px; border-radius:4px; font-size:0.85rem; font-weight:bold;">✅ Training Gevuld</span>`;
            }
        }

        let veldDisplay = tr.veld ? ` - Veld ${tr.veld}` : '';
        let openFunctie = typeof window.openTrainingsPlanner === 'function' ? `window.openTrainingsPlanner('${tr.teamId}', '${tr.start}', ${tr.duur}, '${tr.isoDatum}')` : `window.openDagDetail('${tr.isoDatum}', '${tr.teamId}')`;

        container.innerHTML += `
            <div style="${randStyle} padding:15px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.02); margin-bottom:10px; transition:0.2s;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'" onclick="${openFunctie}">
                <div>
                    <strong style="display:block; font-size:1.2rem; color:var(--secondary-color); margin-bottom:5px;">📅 ${tr.mooieDatum} ${isVandaag ? '<span style="color:#e74c3c; font-size:0.9rem;">(Vandaag)</span>' : ''}</strong>
                    <div style="color:#7f8c8d; font-size:0.95rem;">🕒 ${tr.start} - ${tr.eind} (${tr.duur} min) &nbsp;|&nbsp; 📍 ${tr.zaal}${veldDisplay}</div>
                </div>
                <div>${isGepland}</div>
            </div>
        `;
    });
};

window.wijzigWeek = function(dagen) { actieveWeekStart.setDate(actieveWeekStart.getDate() + (dagen * 7)); window.renderWeekAgenda(); };
window.gaNaarHuidigeWeek = function() { actieveWeekStart = zetOpMaandag(new Date()); window.renderWeekAgenda(); };

// --- HIER BEGINT DE NIEUWE WEEK AGENDA (KOGELVRIJ) ---
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
        let afgelasteTrainingen = JSON.parse(localStorage.getItem('blackshots_afgelaste_trainingen')) || [];

        for (let i = 0; i < 5; i++) {
            let loopDag = new Date(startDatum);
            loopDag.setDate(startDatum.getDate() + i);
            let isoDatum = `${loopDag.getFullYear()}-${String(loopDag.getMonth()+1).padStart(2,'0')}-${String(loopDag.getDate()).padStart(2,'0')}`;
            let displayDatum = `${loopDag.getDate()}-${loopDag.getMonth()+1}`;
            let nlDatum = `${dagNamen[i]} ${loopDag.getDate()} ${loopDag.toLocaleString('nl-NL', {month:'short'})}`;

            let actieveKeys = Object.keys(window.geplandeTrainingenDB || {}).filter(k => k.startsWith(isoDatum) && Array.isArray(window.geplandeTrainingenDB[k]) && window.geplandeTrainingenDB[k].length > 0);

            // 1. JAARPLANNING VAKANTIE CHECK
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

            // 2. ZAALHUUR CHECK
            let zalenOpDag = zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
            let gehuurdeZalen = [...new Set(zalenOpDag.map(z => z.zaal.replace('Sporthal', '').replace('Sportzaal', '').trim()))];

            let bgClass = "background: var(--card-alt-bg);";
            let headerClass = "background: var(--secondary-color);";
            let waarschuwingHtml = "";
            let zaalHtml = "";

            if (isVakantie) {
                bgClass = "background: rgba(231, 76, 60, 0.05); border: 2px solid #e74c3c;";
                headerClass = "background: #e74c3c;";
            } else if (actieveKeys.length > 0 && gehuurdeZalen.length === 0) {
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
                `;
            } else if (actieveKeys.length > 0) {
                let zaalGroepen = {};
                
                actieveKeys.forEach(k => {
                    let teamId = k.split('_')[1];
                    let team = (window.teamsDB || []).find(t => t.id === teamId);
                    let locatie = (team && team.trainingLocatie) ? String(team.trainingLocatie) : "Onbekend";
                    let basisZaal = locatie.split('-')[0].trim().toLowerCase(); 
                    if (!basisZaal) basisZaal = "onbekend";
                    
                    if (!zaalGroepen[basisZaal]) zaalGroepen[basisZaal] = [];
                    zaalGroepen[basisZaal].push(k);
                });

                Object.keys(zaalGroepen).forEach(zaal => {
                    let keysInZaal = zaalGroepen[zaal];
                    let gridStyle = keysInZaal.length > 1 ? 'display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-bottom: 10px;' : 'margin-bottom: 10px;';
                    
                    agendaHtml += `<div style="${gridStyle}">`;

                    keysInZaal.forEach(k => {
                        let teamId = k.split('_')[1];
                        let team = (window.teamsDB || []).find(t => t.id === teamId);
                        let teamNaam = team ? team.naam : "Onbekend";
                        let tijd = team && team.trainingTijd ? team.trainingTijd : "";
                        let veldInfo = team && team.trainingLocatie ? team.trainingLocatie : "";
                        let isAfgelast = afgelasteTrainingen.includes(k);

                        let uDB = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {};
                        let isTrainer = (uDB.rol === 'trainer');
                        let magBewerken = !isTrainer || (uDB.teams && (uDB.teams.includes('all') || uDB.teams.includes(teamId)));
                        
                        let openFunctie = typeof window.openTrainingsPlanner === 'function' ? `window.openTrainingsPlanner('${teamId}', '${tijd}', 90, '${isoDatum}')` : `window.openDagDetail('${isoDatum}', '${teamId}')`;
                        let clickAction = magBewerken ? openFunctie : `alert('Je hebt geen rechten om deze training te bewerken.')`;
                        
                        let cardBorder = isAfgelast ? "border-left: 5px solid #e74c3c;" : "border-left: 5px solid var(--primary-color);";
                        let cardBg = isAfgelast ? "background: #fef2f2;" : "background: var(--card-bg);";
                        let bodyModeClass = document.body.classList.contains('dark-mode') && isAfgelast ? "background: rgba(231,76,60,0.1);" : cardBg;
                        let textDeco = isAfgelast ? "text-decoration: line-through; color: #e74c3c;" : "color: var(--text-color);";

                        let opacityStyle = magBewerken ? '' : 'opacity:0.6; cursor:not-allowed;';
                        let itemMargin = keysInZaal.length > 1 ? 'margin: 0;' : ''; 

                        agendaHtml += `
                            <div class="training-item" onclick="${clickAction}" style="${opacityStyle} ${itemMargin} padding:12px; border-radius:6px; ${bodyModeClass} border: 1px solid var(--border-color); ${cardBorder} box-shadow: 0 2px 4px rgba(0,0,0,0.05); position:relative;">
                                ${isAfgelast ? `<div style="position:absolute; top:10px; right:10px; font-size:0.7rem; background:#e74c3c; color:white; font-weight:bold; padding:2px 6px; border-radius:4px;">AFGELAST</div>` : ''}
                                
                                <strong style="display:block; font-size:1.1rem; ${textDeco} margin-bottom:5px;">${teamNaam}</strong>
                                
                                <div style="display:flex; flex-direction:column; gap:5px; font-size:0.85rem; color:var(--text-muted); margin-bottom:10px; font-weight:500;">
                                    ${tijd ? `<span>⏰ ${tijd}</span>` : ''}
                                    ${veldInfo ? `<span>📍 ${veldInfo}</span>` : ''}
                                </div>

                                <div style="font-size:0.75rem; color:var(--primary-color); font-weight:bold; margin-bottom:10px; display:inline-block; background:rgba(52, 152, 219, 0.1); padding:3px 8px; border-radius:12px;">
                                    📝 ${(window.geplandeTrainingenDB[k] || []).length} Oef.
                                </div>

                                <div style="display:flex; gap:5px; border-top:1px solid var(--border-color); padding-top:10px; margin-top:5px;">
                                    ${magBewerken ? `<button onclick="event.stopPropagation(); window.toggleAflassen('${k}')" title="Aflassen / Herstellen" style="background:rgba(231, 76, 60, 0.1); color:#e74c3c; border:none; padding:6px; border-radius:4px; cursor:pointer; flex:1;">❌</button>` : ''}
                                    <button onclick="event.stopPropagation(); window.stuurWhatsApp('${teamNaam}', '${nlDatum}', '${tijd}', ${isAfgelast})" title="Stuur WhatsApp" style="background:rgba(39, 174, 96, 0.1); color:#27ae60; border:none; padding:6px; border-radius:4px; cursor:pointer; flex:1;">💬</button>
                                </div>
                            </div>
                        `;
                    });

                    agendaHtml += `</div>`; 
                });

            } else {
                agendaHtml += `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; font-style:italic; margin-top:20px;">Geen trainingen ingepland.</p>`;
            }

            if (!isVakantie) {
                agendaHtml += `
                    </div>
                    <div style="padding:10px; border-top:1px solid var(--border-color); background:var(--card-bg); margin-top:auto;">
                        <button class="admin-only" onclick="window.openTeamKiezer('${isoDatum}')" style="width:100%; background:transparent; border:2px dashed var(--border-dark); color:var(--text-color); padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">
                            + Team Toevoegen
                        </button>
                        ${actieveKeys.length > 0 ? `<button class="admin-only" onclick="window.wisDag('${isoDatum}')" style="width:100%; background:transparent; border:none; color:#e74c3c; font-size:0.8rem; cursor:pointer; margin-top:5px;">Wis alle trainingen</button>` : ''}
                    </div>
                `;
            }

            agendaHtml += `
                </div>
                ${waarschuwingHtml}
            `;
        }
        grid.innerHTML = agendaHtml;

    } catch (error) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; background: #e74c3c; color: white; padding: 20px; border-radius: 8px; font-weight: bold; margin: 20px;">
                🚨 Fout in agenda tekenen:<br><pre>${error.message}</pre>
            </div>
        `;
        console.error("Fout in renderWeekAgenda:", error);
    }
};

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
        } else alert("Dit team is al ingepland op deze dag.");
    } else alert("Team niet gevonden of je hebt geen rechten.");
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
        window.renderWeekAgenda();
    }
    window.sluitDagDetail();
};

window.openBulkModal = function() { document.getElementById('bulk-modal').style.display = 'flex'; };

window.voerBulkAnnuleringUit = function() {
    let start = document.getElementById('bulk-start').value;
    let eind = document.getElementById('bulk-eind').value;
    if (!start || !eind || start > eind) return alert("Vul een geldige periode in.");
    
    if(confirm(`Weet je zeker dat je alle trainingen tussen ${start} en ${eind} wilt wissen?`)) {
        Object.keys(window.geplandeTrainingenDB).forEach(k => {
            let datum = k.split('_')[0];
            if (datum >= start && datum <= eind) delete window.geplandeTrainingenDB[k];
        });
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        document.getElementById('bulk-modal').style.display = 'none';
        window.renderWeekAgenda();
        alert("Trainingen verwijderd!");
    }
};

// ============================================================================
// OEFENINGEN & TIJDLIJN BEHEER
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

        html += `
            <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:6px; margin-bottom:10px; overflow:hidden;">
                <div style="padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <span style="font-size:0.7rem; background:var(--secondary-color); color:white; padding:2px 6px; border-radius:4px;">${badge}</span><br>
                        <strong style="color:var(--text-color); font-size:1rem; display:block; margin-top:4px;">${oef.naam}</strong>
                        <span style="font-size:0.8rem; color:var(--text-muted);">${isProgressie ? oef.totaleDuur : oef.duur} min | ${oef.categorie || 'Geen cat.'}</span>
                        ${progLijst}
                    </div>
                    <button onclick="window.voegToeAanTraining('${oef.id}')" style="background:var(--primary-color); color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:1.1rem; box-shadow:0 2px 4px rgba(0,0,0,0.1); margin-left:10px;">+</button>
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
            <div style="background:var(--card-bg); border-left:4px solid var(--primary-color); padding:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:8px;">
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

// Start de module zachtjes
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (window.renderWeekAgenda) window.renderWeekAgenda(); }, 200);
});