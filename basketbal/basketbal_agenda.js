// --- BASKETBAL_AGENDA.JS: KOGELVRIJE AGENDA MET GEBRUIKERS RECHTEN ---

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

window.wisselAgendaView = function(view) {
    const btnWeek = document.getElementById('btn-view-week'); const btnTeam = document.getElementById('btn-view-team');
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
        window.teamsDB.forEach(t => { 
            // CHECK RECHTEN: Laat alleen toegestane teams zien in de dropdown
            if(!actieveGebruiker.teams.includes('all') && !actieveGebruiker.teams.includes(t.id)) return;
            select.innerHTML += `<option value="${t.id}">${t.naam}</option>`; 
        });
    }
};

window.renderTeamAgenda = function() {
    const container = document.getElementById('team-agenda-container');
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

        container.innerHTML += `
            <div style="${randStyle} padding:15px; border-radius:8px; border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.02); margin-bottom:10px; transition:0.2s;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'" onclick="window.openTrainingsPlanner('${tr.teamId}', '${tr.start}', ${tr.duur}, '${tr.isoDatum}')">
                <div>
                    <strong style="display:block; font-size:1.2rem; color:var(--secondary-color); margin-bottom:5px;">📅 ${tr.mooieDatum} ${isVandaag ? '<span style="color:#e74c3c; font-size:0.9rem;">(Vandaag)</span>' : ''}</strong>
                    <div style="color:#7f8c8d; font-size:0.95rem;">🕒 ${tr.start} - ${tr.eind} (${tr.duur} min) &nbsp;|&nbsp; 📍 ${tr.zaal}${veldDisplay}</div>
                </div>
                <div>${isGepland}</div>
            </div>
        `;
    });
};


window.annuleerDagVolledig = function(isoDatum, reden) {
    if(confirm(`Wil je alle trainingen op ${isoDatum} aflassen vanwege: ${reden}?`)) {
        let d = new Date(isoDatum);
        let dagNummer = d.getDay() || 7;
        
        window.teamsDB.forEach(team => {
            if(team.trainingen) {
                team.trainingen.forEach(tr => {
                    if(parseInt(tr.dag) === parseInt(dagNummer)) {
                        let sleutel = `${isoDatum}_${team.id}`;
                        window.geplandeTrainingenDB[sleutel] = [{ type: 'geannuleerd', reden: reden, duur: tr.duur || 90 }];
                    }
                });
            }
        });
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        window.renderWeekAgenda();
    }
};

window.veranderWeek = function(dagen) { actieveWeekStart.setDate(actieveWeekStart.getDate() + dagen); window.renderWeekAgenda(); };
window.gaNaarHuidigeWeek = function() { actieveWeekStart = zetOpMaandag(new Date()); window.renderWeekAgenda(); };

window.renderWeekAgenda = function() {
    const container = document.getElementById('week-overzicht') || document.getElementById('week-agenda-container');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'week-grid';
    container.style.display = 'grid';

    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {teams:['all']};
    const dagenNamen = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];

    let eindVanWeek = new Date(actieveWeekStart); eindVanWeek.setDate(eindVanWeek.getDate() + 4);
    let titelEl = document.getElementById('week-titel');
    if (titelEl) titelEl.innerText = `Week van ${actieveWeekStart.getDate()}-${actieveWeekStart.getMonth()+1} t/m ${eindVanWeek.getDate()}-${eindVanWeek.getMonth()+1}`;

    let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
    let afgelasteTrainingenLijst = JSON.parse(localStorage.getItem('blackshots_afgelaste_trainingen')) || [];
    
    let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
    let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];

    for (let i = 0; i < 5; i++) {
        let datumVoorKolom = new Date(actieveWeekStart); datumVoorKolom.setDate(datumVoorKolom.getDate() + i);
        let isoDatum = window.getIsoDatumS(datumVoorKolom);
        let isVandaag = isoDatum === window.getIsoDatumS(new Date());

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

        // --- ZACHTERE STYLING VOOR VAKANTIES ---
        // HeaderBg blijft altijd de donkerblauwe secondary-color. De rode rand wordt transparanter.
        let borderStijl = isVandaag ? 'border: 2px solid var(--primary-color);' : (isVakantie ? 'border: 2px solid rgba(231, 76, 60, 0.4);' : 'border: 1px solid var(--border-color);');
        let bgClass = isVakantie ? "background: rgba(231, 76, 60, 0.05);" : "background: transparent;";
        let headerBg = "background: var(--secondary-color);";

        const kolom = document.createElement('div');
        kolom.className = 'dag-kolom';
        kolom.style.cssText += borderStijl + bgClass + ' display: flex; flex-direction: column; overflow: hidden;';
        
        let zalenOpDag = zaalhuurData.filter(z => z.isoDatum === isoDatum && !z.geannuleerd);
        let gehuurdeZalen = [...new Set(zalenOpDag.map(z => z.zaal.replace('Sporthal', '').replace('Sportzaal', '').trim()))];
        let zaalTekst = gehuurdeZalen.length > 0 ? gehuurdeZalen.join(' & ') : "Geen zaalhuur bekend";

        let kolomTopHtml = `
            <div class="dag-titel" style="${headerBg} color:white; padding:10px; text-align:center; border-bottom:1px solid var(--border-color);">
                <div style="font-weight:bold; font-size:1.1rem; margin-bottom:4px;">
                    ${dagenNamen[i]} <span style="font-size:0.85rem; font-weight:normal;">(${datumVoorKolom.getDate()}-${datumVoorKolom.getMonth()+1})</span>
                </div>
                <div style="font-size:0.75rem; font-weight:bold; color:rgba(255,255,255,0.7); text-transform:uppercase; letter-spacing:1px;">
                    ${zaalTekst}
                </div>
            </div>
        `;

        // Een zachtere kleur rood (#e57373) voor het klikbare balkje
        if (isVakantie) {
            kolomTopHtml += `
                <div onclick="window.annuleerDagVolledig('${isoDatum}', '${vakantieTitel}')" style="background:#e57373; color:white; font-size:0.85rem; font-weight:bold; text-align:center; padding:8px; cursor:pointer; border-bottom:1px solid #ef5350; transition:0.2s;" title="Klik om alle trainingen vandaag af te lassen">
                     ${vakantieTitel}<br>
                    <span style="font-size:0.7rem; font-weight:normal; opacity:0.9;">(Klik om alles af te lassen)</span>
                </div>
            `;
        }

        kolom.innerHTML = kolomTopHtml;

        let trainingenVandaag = [];
        if (Array.isArray(window.teamsDB)) {
            window.teamsDB.forEach(team => {
                if(!actieveGebruiker.teams.includes('all') && !actieveGebruiker.teams.includes(team.id)) return;

                if (team.trainingen) {
                    team.trainingen.forEach(tr => {
                        if (parseInt(tr.dag) === (i + 1)) {
                            trainingenVandaag.push({ teamNaam: team.naam, start: tr.start, eind: tr.eind, zaal: tr.zaal, veld: tr.veld || '', duur: tr.duur || 90, teamId: team.id });
                        }
                    });
                }
            });
        }

        trainingenVandaag.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
        let heeftActieveTraining = false; 
        let inhoud = `<div style="padding:10px; flex: 1;">`; 

        if (trainingenVandaag.length === 0) {
            inhoud += `<p style="text-align:center; color:#bdc3c7; font-size:0.9rem; margin-top:20px;">Geen trainingen</p>`;
        } else {
            let zaalGroepen = {};
            trainingenVandaag.forEach(tr => {
                let locatie = tr.zaal ? String(tr.zaal) : "Onbekend";
                let basisZaal = locatie.split('-')[0].trim().toLowerCase();
                if (!basisZaal) basisZaal = "onbekend";
                
                if (!zaalGroepen[basisZaal]) zaalGroepen[basisZaal] = [];
                zaalGroepen[basisZaal].push(tr);
            });

            Object.keys(zaalGroepen).forEach(zaal => {
                let trInZaal = zaalGroepen[zaal];
                let gridStyle = trInZaal.length > 1 ? 'display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; margin-bottom: 10px;' : 'margin-bottom: 10px;';

                inhoud += `<div style="${gridStyle}">`;

                trInZaal.forEach(tr => {
                    let opslagSleutel = `${isoDatum}_${tr.teamId}`;
                    let isGepland = '';
                    let isAfgelast = afgelasteTrainingenLijst.includes(opslagSleutel);

                    if (window.geplandeTrainingenDB && window.geplandeTrainingenDB[opslagSleutel]) {
                        let dbTr = window.geplandeTrainingenDB[opslagSleutel];
                        if(Array.isArray(dbTr) && dbTr.length === 1 && dbTr[0].type === 'geannuleerd') {
                            isAfgelast = true;
                        } else if (!isAfgelast) {
                            isGepland = `<span style="background:#27ae60; color:white; padding:2px 4px; border-radius:4px; font-size:0.7rem; float:right;">✅ Gepland</span>`;
                        }
                    }

                    if (isAfgelast) {
                        isGepland = `<span style="background:#e74c3c; color:white; padding:2px 4px; border-radius:4px; font-size:0.7rem; float:right;">❌ Afgelast</span>`;
                    } else {
                        heeftActieveTraining = true;
                    }

                    let veldDisplay = tr.veld ? ` - Veld ${tr.veld}` : '';
                    let itemMargin = trInZaal.length > 1 ? 'margin: 0;' : 'margin-bottom: 10px;';
                    let kaartOpmaak = isAfgelast ? "opacity: 0.6; background: #fdf2f2; border-left: 4px solid #e74c3c;" : "background: white; border-left: 4px solid var(--primary-color);";

                    inhoud += `
                        <div style="${kaartOpmaak} ${itemMargin} padding:10px; border-radius:4px; box-shadow:0 2px 4px rgba(0,0,0,0.05); cursor:pointer; transition:0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="window.openTrainingsPlanner('${tr.teamId}', '${tr.start}', ${tr.duur}, '${isoDatum}')">
                            <strong style="display:block; font-size:1.1rem; color:var(--secondary-color);">${tr.teamNaam} ${isGepland}</strong>
                            <div style="color:#e67e22; font-weight:bold; font-size:0.9rem; margin:3px 0;">🕒 ${tr.start} - ${tr.eind}</div>
                            <div style="font-size:0.8rem; color:#7f8c8d;">📍 ${tr.zaal}${veldDisplay}</div>
                        </div>
                    `;
                });
                
                inhoud += `</div>`;
            });
        }
        inhoud += `</div>`;

        // Het Alarm Balkje (Alleen als er training is en géén zaal)
        if (heeftActieveTraining && gehuurdeZalen.length === 0 && !isVakantie) {
            inhoud += `<div style="background:#e74c3c; color:white; font-size:0.85rem; font-weight:bold; text-align:center; padding:10px; margin-top:auto; border-top: 1px solid #c0392b;">⚠️ PAS OP: GEEN ZAAL GEHUURD!</div>`;
        }

        kolom.innerHTML += inhoud;
        container.appendChild(kolom);
    }
};
window.openTrainingsPlanner = function(teamId, startTijd, duur, datumStr) {
    const team = window.teamsDB.find(t => t.id === teamId);
    actieveTraining = { teamId, startTijd, duur, datum: datumStr, opslagSleutel: `${datumStr}_${teamId}` };
    
    let d = new Date(datumStr);
    let dagNaam = d.toLocaleDateString('nl-NL', { weekday: 'long' });
    document.getElementById('planner-titel').innerText = `Training: ${team.naam} (${duur} min)`;
    document.getElementById('planner-datum-weergave').innerText = `📅 ${dagNaam} ${d.getDate()}-${d.getMonth()+1}`;

    if (!window.geplandeTrainingenDB) window.geplandeTrainingenDB = {};

    if (window.geplandeTrainingenDB[actieveTraining.opslagSleutel]) {
        actieveTijdlijn = window.geplandeTrainingenDB[actieveTraining.opslagSleutel];
    } else {
        actieveTijdlijn = [{ naam: 'Warming-up (Standaard)', duur: 10, kleur: '#e67e22' }, { naam: 'Partijvorm (Standaard)', duur: 15, kleur: '#3498db' }];
    }

    let pSpelers = document.getElementById('planner-spelers');
    let pZoek = document.getElementById('planner-zoek');
    let pCat = document.getElementById('planner-cat-filter');
    
    if (pSpelers) pSpelers.value = ''; 
    if (pZoek) pZoek.value = ''; 
    if (pCat) pCat.value = '';
    
    if(window.renderTijdlijn) window.renderTijdlijn(); 
    if(window.filterPlannerOefeningen) window.filterPlannerOefeningen(); 
    
    let modal = document.getElementById('planner-modal');
    if(modal) modal.style.display = 'flex';
};

window.sluitPlanner = function() { 
    let modal = document.getElementById('planner-modal');
    if(modal) modal.style.display = 'none'; 
};

window.slaTrainingOp = function() {
    if(!actieveTraining) return;
    if (!window.geplandeTrainingenDB) window.geplandeTrainingenDB = {};
    window.geplandeTrainingenDB[actieveTraining.opslagSleutel] = actieveTijdlijn;
    localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
    
    const btn = document.getElementById('save-training-btn'); 
    let orig = "Opslaan";
    if (btn) {
        orig = btn.innerHTML;
        btn.innerHTML = "✅ Opgeslagen!"; 
        btn.style.background = "#2ecc71";
    }
    
    let teamControls = document.getElementById('agenda-team-controls');
    if (teamControls && teamControls.style.display === 'flex') {
        window.renderTeamAgenda();
    } else {
        window.renderWeekAgenda();
    }

    setTimeout(() => { 
        if(btn) { 
            btn.innerHTML = orig; 
            btn.style.background = "#27ae60"; 
        } 
        window.sluitPlanner(); 
    }, 1000);
};

window.berekenHistorie = function(oefNaam) {
    let aantal = 0;
    if(!window.geplandeTrainingenDB) return 0;
    Object.keys(window.geplandeTrainingenDB).forEach(key => {
        if (key.endsWith('_' + actieveTraining.teamId) && key !== actieveTraining.opslagSleutel) {
            aantal += window.geplandeTrainingenDB[key].filter(i => i.naam === oefNaam).length;
        }
    });
    return aantal;
};

window.annuleerTrainingPrompt = function() {
    window.toonCustomPrompt(
        "Training Aflassen", 
        "Wat is de reden dat de training niet doorgaat?", 
        "Bijv. Feestdag, zaal gesloten...", 
        function(reden) {
            if (!reden) return; 
            actieveTijdlijn = [{ type: 'geannuleerd', reden: reden, duur: actieveTraining.duur }];
            if(window.renderTijdlijn) window.renderTijdlijn();
            
            window.geplandeTrainingenDB[actieveTraining.opslagSleutel] = actieveTijdlijn;
            localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
            
            let teamControls = document.getElementById('agenda-team-controls');
            if (teamControls && teamControls.style.display === 'flex') {
                window.renderTeamAgenda();
            } else {
                window.renderWeekAgenda();
            }
        }
    );
};

window.herstelTraining = function() {
    window.toonCustomConfirm(
        "Training Herstellen", 
        "Weet je zeker dat je deze training weer actief wilt maken?", 
        "Ja, herstellen",
        function() {
            actieveTijdlijn = [{ naam: 'Warming-up (Standaard)', duur: 10, kleur: '#e67e22' }, { naam: 'Partijvorm (Standaard)', duur: 15, kleur: '#3498db' }];
            if(window.renderTijdlijn) window.renderTijdlijn();
        }
    );
};

window.genereerAnnuleringBericht = function(reden) {
    let team = window.teamsDB.find(t => t.id === actieveTraining.teamId);

    let afgelasteDatums = [];
    Object.keys(window.geplandeTrainingenDB).forEach(key => {
        if (key.endsWith('_' + team.id)) {
            let tr = window.geplandeTrainingenDB[key];
            if (tr.length === 1 && tr[0].type === 'geannuleerd' && tr[0].reden.toLowerCase() === reden.toLowerCase()) {
                let isoDatum = key.split('_')[0];
                afgelasteDatums.push(new Date(isoDatum));
            }
        }
    });

    afgelasteDatums.sort((a, b) => a - b);

    let datumStrings = afgelasteDatums.map(d => {
        let dagNaam = d.toLocaleDateString('nl-NL', { weekday: 'long' });
        return `${dagNaam} ${d.getDate()}-${d.getMonth() + 1}`;
    });
    
    let datumTekst = "";
    let meervoud = false;
    if (datumStrings.length === 1) {
        datumTekst = datumStrings[0];
    } else {
        meervoud = true;
        let laatste = datumStrings.pop();
        datumTekst = datumStrings.join(', ') + " en " + laatste;
    }

    let laatsteAfgelast = afgelasteDatums[afgelasteDatums.length - 1];
    let volgendeDatumObj = null;
    let checkDate = new Date(laatsteAfgelast);
    checkDate.setDate(checkDate.getDate() + 1); 
    
    for (let i = 0; i < 100; i++) {
        let iso = window.getIsoDatumS(checkDate);
        let dNum = checkDate.getDay() || 7;
        
        if (team.trainingen) {
            let trainVandaag = team.trainingen.some(tr => parseInt(tr.dag) === parseInt(dNum));
            if (trainVandaag) {
                let sl = `${iso}_${team.id}`;
                let gepl = window.geplandeTrainingenDB ? window.geplandeTrainingenDB[sl] : null;
                let isGeannuleerd = gepl && gepl.length === 1 && gepl[0].type === 'geannuleerd';
                
                if (!isGeannuleerd) {
                    volgendeDatumObj = new Date(checkDate);
                    break;
                }
            }
        }
        checkDate.setDate(checkDate.getDate() + 1);
    }

    let volgendeDatumStr = "binnenkort bekendgemaakt";
    if (volgendeDatumObj) {
        let dagNaamVolgende = volgendeDatumObj.toLocaleDateString('nl-NL', { weekday: 'long' });
        volgendeDatumStr = `${dagNaamVolgende} ${volgendeDatumObj.getDate()}-${volgendeDatumObj.getMonth() + 1}`;
    }

    let msg = `Beste ${team.naam},\n\nDe training${meervoud ? 'en' : ''} van ${datumTekst} gaa${meervoud ? 'n' : 't'} niet door vanwege ${reden}.\nDe volgende training is weer op ${volgendeDatumStr}.\n\nMocht je willen weten wanneer er geen trainingen zijn kan je altijd op https://www.blackshots.nl/bs/#/info kijken.\n\nBij vragen hoor ik het graag!`;
    
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.value = msg;
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    
    alert(`✅ Succes! Bericht gekopieerd naar klembord!`);
};

window.voerBulkAnnuleringUit = function() {
    let reden = document.getElementById('bulk-reden').value.trim();
    let start = document.getElementById('bulk-start').value;
    let eind = document.getElementById('bulk-eind').value;

    if(!reden || !start || !eind) return alert("Vul alsjeblieft een reden en beide datums in.");
    
    let startDate = new Date(start);
    let endDate = new Date(eind);
    if(startDate > endDate) return alert("De startdatum moet wel vóór de einddatum liggen.");

    if(!window.geplandeTrainingenDB) window.geplandeTrainingenDB = {};
    let cancelledCount = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        let iso = window.getIsoDatumS(d);
        let dayNum = d.getDay() || 7;
        
        window.teamsDB.forEach(team => {
            if(team.trainingen) {
                team.trainingen.forEach(tr => {
                    if(parseInt(tr.dag) === parseInt(dayNum)) {
                        let sleutel = `${iso}_${team.id}`;
                        window.geplandeTrainingenDB[sleutel] = [{ type: 'geannuleerd', reden: reden, duur: tr.duur }];
                        cancelledCount++;
                    }
                });
            }
        });
    }

    localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
    let modal = document.getElementById('bulk-cancel-modal');
    if(modal) modal.style.display = 'none';
    
    let teamControls = document.getElementById('agenda-team-controls');
    if (teamControls && teamControls.style.display === 'flex') {
        window.renderTeamAgenda();
    } else {
        window.renderWeekAgenda();
    }

    setTimeout(() => { alert(`✅ Succes! ${cancelledCount} trainingen geannuleerd.`); }, 100);
};

window.renderTijdlijn = function() {
    const container = document.getElementById('planner-tijdlijn');
    if(!container) return;
    container.innerHTML = ''; 

    if (actieveTijdlijn.length === 1 && actieveTijdlijn[0].type === 'geannuleerd') {
        container.innerHTML = `
            <div style="background:#fdedec; border:2px solid #e74c3c; padding:20px; border-radius:8px; text-align:center; margin-bottom:15px; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                <h3 style="color:#c0392b; margin-top:0; font-size:1.4rem;">❌ Training is Afgelast</h3>
                <p style="font-size:1.1rem; color:#7f8c8d;"><strong>Reden:</strong> ${actieveTijdlijn[0].reden}</p>
                <button onclick="window.herstelTraining()" style="background:#3498db; color:white; border:none; padding:10px 15px; border-radius:4px; margin-top:10px; font-weight:bold; cursor:pointer;">🔄 Training Herstellen</button>
            </div>
            <button onclick="window.genereerAnnuleringBericht('${actieveTijdlijn[0].reden}')" style="background:#8e44ad; color:white; border:none; padding:12px; width:100%; border-radius:6px; font-size:1.1rem; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">✉️ Stuur WhatsApp Bericht (Kopieer)</button>
        `;
        document.getElementById('planner-tijd-over').innerHTML = `<span style="color:#e74c3c;">0</span>`;
        return; 
    }

    let totaalGevuld = 0; let geteldeOefeningen = {};
    
    actieveTijdlijn.forEach((item, index) => {
        totaalGevuld += item.duur;
        let oefDetails = window.oefeningenDB.find(o => o.naam === item.naam);
        let extraInfoHtml = ''; let klikKursor = ''; let klikActie = ''; let visueelTekenImg = '';

        if (oefDetails) {
            klikKursor = 'cursor:pointer;';
            klikActie = `onclick="document.getElementById('tijdlijn-info-${index}').style.display = document.getElementById('tijdlijn-info-${index}').style.display === 'none' ? 'block' : 'none'"`;
            
            let teamVar = oefDetails.teamVariaties ? oefDetails.teamVariaties[actieveTraining.teamId] : null;
            let teamTxt = teamVar ? (typeof teamVar === 'string' ? teamVar : teamVar.tekst) : null;
            let teamImg = teamVar ? (typeof teamVar === 'object' ? teamVar.tekening : null) : null;

            if (!geteldeOefeningen[item.naam]) geteldeOefeningen[item.naam] = 0;
            let historieAantal = window.berekenHistorie(item.naam);
            let actueelWeekIndex = historieAantal + geteldeOefeningen[item.naam];
            geteldeOefeningen[item.naam]++; 

            let weekData = (oefDetails.progressie && oefDetails.progressie.length > 0) ? oefDetails.progressie[actueelWeekIndex] : null;
            let weekTxt = weekData ? (typeof weekData === 'string' ? weekData : weekData.tekst) : null;
            let weekImg = weekData ? (typeof weekData === 'object' ? weekData.tekening : null) : null;

            let finalImg = safeImage(teamImg) || safeImage(weekImg) || safeImage(oefDetails.tekening); 
            let imgHtml = finalImg ? `<div style="text-align:center; margin-bottom:10px; background:white; padding:10px; border-radius:6px; border:2px solid #34495e;"><img src="${finalImg}" style="max-width:100%; border-radius:4px;"></div>` : '';
            
            if (finalImg) visueelTekenImg = '<span style="margin-left:8px;" title="Bevat een Tactiekbord tekening!">🖼️</span>';

            let teamSpecifiek = teamTxt ? `<div style="background:#e8f8f5; border-left:4px solid #1abc9c; padding:8px; margin-bottom:8px; border-radius:4px;"><strong style="color:#16a085;">🏀 Regel voor dit team:</strong> ${teamTxt}</div>` : '';
            let weekInfo = weekTxt ? `<div style="background:#fdf2e9; border-left:4px solid #f39c12; padding:8px; margin-bottom:8px; border-radius:4px;"><strong style="color:#d35400;">📈 Actuele Focus (Week ${actueelWeekIndex + 1}):</strong> ${weekTxt}</div>` : '';

            extraInfoHtml = `
                <div id="tijdlijn-info-${index}" style="display:none; padding-top:10px; margin-top:10px; border-top:1px dashed var(--border-color); font-size:0.9rem; color:var(--secondary-color);">
                    ${imgHtml}
                    ${teamSpecifiek} ${weekInfo}
                    <p style="margin:0 0 5px 0;"><strong>Basis Uitleg:</strong> ${oefDetails.uitleg || 'Geen uitleg toegevoegd.'}</p>
                    ${oefDetails.makkelijker ? `<p style="margin:0 0 5px 0; color:#27ae60;"><strong>Makkelijker:</strong> ${oefDetails.makkelijker}</p>` : ''}
                    ${oefDetails.moeilijker ? `<p style="margin:0 0 5px 0; color:#e74c3c;"><strong>Moeilijker:</strong> ${oefDetails.moeilijker}</p>` : ''}
                </div>
            `;
        }

        container.innerHTML += `
            <div style="background:var(--card-bg); border-left:5px solid ${item.kleur || '#34495e'}; padding:10px 15px; margin-bottom:10px; border-radius:6px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1; ${klikKursor}" ${klikActie}>
                        <strong style="display:block; font-size:1.05rem;">${item.naam} ${visueelTekenImg} ${oefDetails ? '<span style="font-size:0.8rem; color:#3498db; margin-left:5px;">(Klik voor info ▼)</span>' : ''}</strong>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="display:flex; align-items:center; background:var(--bg-color); border-radius:20px; padding:2px 5px; border:1px solid var(--border-color);">
                            <button onclick="window.pasTijdAan(${index}, -5)" style="background:transparent; border:none; color:var(--primary-color); font-weight:bold; cursor:pointer; font-size:1.1rem; padding:0 5px;">-</button>
                            <span style="font-size:0.9rem; font-weight:bold; width:35px; text-align:center;">${item.duur}m</span>
                            <button onclick="window.pasTijdAan(${index}, 5)" style="background:transparent; border:none; color:var(--primary-color); font-weight:bold; cursor:pointer; font-size:1.1rem; padding:0 5px;">+</button>
                        </div>
                        <button onclick="window.verwijderUitTraining(${index})" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold;" title="Verwijder dit blok">X</button>
                    </div>
                </div>
                ${extraInfoHtml}
            </div>
        `;
    });

    let over = actieveTraining.duur - totaalGevuld;
    let kleur = over < 0 ? '#e74c3c' : (over === 0 ? '#27ae60' : '#e67e22');
    document.getElementById('planner-tijd-over').innerHTML = `<span style="color:${kleur}; font-size:1.2rem;">${over}</span>`;
};

window.pasTijdAan = function(index, minuten) { 
    actieveTijdlijn[index].duur += minuten; 
    if (actieveTijdlijn[index].duur < 1) actieveTijdlijn[index].duur = 1; 
    if(window.renderTijdlijn) window.renderTijdlijn(); 
};

window.voegToeAanTraining = function(oefId) {
    const oef = window.oefeningenDB.find(o => o.id === oefId);
    if (!oef) return;
    let partijIndex = actieveTijdlijn.findIndex(i => i.naam.includes('Partijvorm'));
    let nieuwBlok = { naam: oef.naam, duur: oef.duur, kleur: '#9b59b6' };
    if (partijIndex > -1) actieveTijdlijn.splice(partijIndex, 0, nieuwBlok); else actieveTijdlijn.push(nieuwBlok);
    if(window.renderTijdlijn) window.renderTijdlijn(); 
    if(window.filterPlannerOefeningen) window.filterPlannerOefeningen();
};

window.voegVrijBlokToe = function() {
    const n = document.getElementById('vrij-blok-naam').value.trim() || 'Notitie / Uitleg';
    const d = parseInt(document.getElementById('vrij-blok-tijd').value) || 5;
    let pIdx = actieveTijdlijn.findIndex(i => i.naam.includes('Partijvorm'));
    let nb = { naam: n, duur: d, kleur: '#f1c40f' };
    if (pIdx > -1) actieveTijdlijn.splice(pIdx, 0, nb); else actieveTijdlijn.push(nb);
    document.getElementById('vrij-blok-naam').value = ''; 
    document.getElementById('vrij-blok-tijd').value = '5';
    if(window.renderTijdlijn) window.renderTijdlijn();
};

window.verwijderUitTraining = function(index) { 
    actieveTijdlijn.splice(index, 1); 
    if(window.renderTijdlijn) window.renderTijdlijn(); 
    if(window.filterPlannerOefeningen) window.filterPlannerOefeningen(); 
};

window.filterPlannerOefeningen = function() {
    let zoekEl = document.getElementById('planner-zoek');
    let catEl = document.getElementById('planner-cat-filter');
    let spelersEl = document.getElementById('planner-spelers');
    
    const term = zoekEl ? zoekEl.value.toLowerCase().trim() : '';
    const cat = catEl ? catEl.value.toLowerCase() : '';
    const spelerCount = spelersEl ? spelersEl.value.trim() : '';
    
    const lijst = document.getElementById('planner-oefeningen-lijst');
    const progLijst = document.getElementById('planner-progressie-lijst');
    const progSectie = document.getElementById('planner-progressie-sectie');
    
    if(!lijst) return;
    lijst.innerHTML = ''; 
    if(progLijst) progLijst.innerHTML = ''; 
    let hasProgressie = false;

    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {teams:['all']};

    let gefilterd = (window.oefeningenDB || []).filter(o => {
        let catText = o.categorieen ? o.categorieen.join(' ').toLowerCase() : '';
        let matchTerm = (o.naam || '').toLowerCase().includes(term) || catText.includes(term);
        let matchCat = !cat || catText.includes(cat);
        let matchTeam = (!o.doelgroepen || o.doelgroepen.length === 0) || o.doelgroepen.includes(actieveTraining.teamId);
        let matchSpelers = true;
        if (spelerCount !== "") {
            let oefSpelers = (o.aantalSpelers || "").toLowerCase();
            if (oefSpelers !== "" && oefSpelers !== "alle" && !oefSpelers.includes("elk")) matchSpelers = oefSpelers.includes(spelerCount);
        }
        return matchTerm && matchCat && matchTeam && matchSpelers;
    });

    if (gefilterd.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen geschikte oefeningen...</p>';
        if(progSectie) progSectie.style.display = 'none'; 
        return;
    }

    gefilterd.forEach((oef, idx) => {
        let historieAantal = window.berekenHistorie(oef.naam);
        let aantalInTijdlijnNu = actieveTijdlijn.filter(i => i.naam === oef.naam).length;
        let actueelWeekIndex = historieAantal + aantalInTijdlijnNu; 
        
        let doel = oef.progressie ? oef.progressie.length : 0;
        let resterend = doel - actueelWeekIndex;
        let isProgressie = doel > 0 && resterend > 0;

        let spelerBadge = oef.aantalSpelers ? `<span style="font-size:0.8rem; color:#7f8c8d; margin-left:10px;">👥 ${oef.aantalSpelers}</span>` : '';
        let tellerBadge = isProgressie ? `<span style="background:#e74c3c; color:white; font-size:0.8rem; padding:2px 6px; border-radius:4px; float:right;">Week ${actueelWeekIndex + 1} / ${doel}</span>` : '';
        let achtergrond = isProgressie ? 'background:white; border-color:#f39c12;' : 'background:var(--card-bg); border-color:var(--border-color);';

        let teamVar = oef.teamVariaties ? oef.teamVariaties[actieveTraining.teamId] : null;
        let teamTxt = teamVar ? (typeof teamVar === 'string' ? teamVar : teamVar.tekst) : null;
        let teamImg = teamVar ? (typeof teamVar === 'object' ? teamVar.tekening : null) : null;

        let weekData = (oef.progressie && oef.progressie.length > 0) ? oef.progressie[actueelWeekIndex] : null;
        let weekTxt = weekData ? (typeof weekData === 'string' ? weekData : weekData.tekst) : null;
        let weekImg = weekData ? (typeof weekData === 'object' ? weekData.tekening : null) : null;

        let finalImg = safeImage(teamImg) || safeImage(weekImg) || safeImage(oef.tekening); 
        let imgHtml = finalImg ? `<div style="text-align:center; margin-bottom:10px; background:white; padding:10px; border-radius:6px; border:2px solid #34495e;"><img src="${finalImg}" style="max-width:100%; border-radius:4px;"></div>` : '';
        let visueelTekenImg = finalImg ? '<span style="margin-left:8px;" title="Bevat een Tactiekbord tekening!">🖼️</span>' : '';

        let teamSpecifiek = teamTxt ? `<div style="background:#e8f8f5; border-left:4px solid #1abc9c; padding:8px; margin-bottom:8px; border-radius:4px;"><strong style="color:#16a085;">🏀 Specifiek voor jullie:</strong> ${teamTxt}</div>` : '';
        let weekInfo = weekTxt ? `<div style="background:#fdf2e9; border-left:4px solid #f39c12; padding:8px; margin-bottom:8px; border-radius:4px;"><strong style="color:#d35400;">📈 Actuele Focus (Week ${actueelWeekIndex + 1}):</strong> ${weekTxt}</div>` : '';

        let htmlKaartje = `
            <div style="${achtergrond} border-width:1px; border-style:solid; border-radius:6px; margin-bottom:10px; overflow:hidden; transition:0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                <div style="padding:12px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1; cursor:pointer;" onclick="document.getElementById('db-info-${idx}').style.display = document.getElementById('db-info-${idx}').style.display === 'none' ? 'block' : 'none'">
                        <strong style="display:block; font-size:1rem; color:var(--secondary-color);">${oef.naam} ${visueelTekenImg} <span style="font-size:0.8rem; color:#bdc3c7; font-weight:normal;">(Info ▼)</span> ${tellerBadge}</strong>
                        <span style="font-size:0.85rem; color:#e67e22; font-weight:bold;">⏱ ${oef.duur} min</span>
                        ${spelerBadge}
                    </div>
                    <button onclick="window.voegToeAanTraining('${oef.id}')" style="background:var(--primary-color); color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:1.1rem; box-shadow:0 2px 4px rgba(0,0,0,0.1); margin-left:10px;">+</button>
                </div>
                <div id="db-info-${idx}" style="display:none; padding:12px; border-top:1px dashed var(--border-color); background:#fafafa; font-size:0.9rem;">
                    ${imgHtml}
                    ${teamSpecifiek} ${weekInfo}
                    <p style="margin:0 0 8px 0; color:var(--secondary-color);"><strong>Basis Uitleg:</strong> ${oef.uitleg || 'Geen uitleg toegevoegd.'}</p>
                    ${oef.makkelijker ? `<p style="margin:0 0 4px 0; color:#27ae60;"><strong>Makkelijker:</strong> ${oef.makkelijker}</p>` : ''}
                    ${oef.moeilijker ? `<p style="margin:0 0 4px 0; color:#e74c3c;"><strong>Moeilijker:</strong> ${oef.moeilijker}</p>` : ''}
                </div>
            </div>
        `;

        if (isProgressie && progLijst) { progLijst.innerHTML += htmlKaartje; hasProgressie = true; } 
        else { lijst.innerHTML += htmlKaartje; }
    });

    if(progSectie) progSectie.style.display = hasProgressie ? 'block' : 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (window.renderWeekAgenda) window.renderWeekAgenda(); }, 500);
});