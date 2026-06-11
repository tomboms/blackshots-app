// --- BASKETBAL_AGENDA.JS: TRAININGEN, ZAALHUUR WAARSCHUWING & WHATSAPP ---

let actieveTraining = null;
let actieveTijdlijn = [];
let actieveWeekStart = new Date();

let d = actieveWeekStart.getDay();
let diff = actieveWeekStart.getDate() - d + (d === 0 ? -6 : 1);
actieveWeekStart.setDate(diff);

window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};
window.afgelasteTrainingen = JSON.parse(localStorage.getItem('blackshots_afgelaste_trainingen')) || [];

// Navigatie
window.wijzigWeek = function(delta) { actieveWeekStart.setDate(actieveWeekStart.getDate() + (delta * 7)); window.renderWeekAgenda(); };
window.gaNaarHuidigeWeek = function() { actieveWeekStart = new Date(); let d = actieveWeekStart.getDay(); actieveWeekStart.setDate(actieveWeekStart.getDate() - d + (d === 0 ? -6 : 1)); window.renderWeekAgenda(); };

// ============================================================================
// WHATSAPP & AFLASSEN FUNCTIES
// ============================================================================
window.toggleAflassen = function(key) {
    if(confirm("Wil je deze specifieke training aflassen/herstellen?")) {
        let idx = window.afgelasteTrainingen.indexOf(key);
        if(idx > -1) window.afgelasteTrainingen.splice(idx, 1);
        else window.afgelasteTrainingen.push(key);
        
        localStorage.setItem('blackshots_afgelaste_trainingen', JSON.stringify(window.afgelasteTrainingen));
        // Forceer cloud sync voor deze custom lijst
        if (typeof window.autoUpload === 'function') window.autoUpload('blackshots_afgelaste_trainingen', window.afgelasteTrainingen);
        
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

// ============================================================================
// AGENDA RENDEREN (DE VERTROUWDE STIJL)
// ============================================================================
window.renderWeekAgenda = function() {
    let grid = document.getElementById('agenda-grid');
    let label = document.getElementById('week-label');
    if (!grid) return;

    let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
    let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
    let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];

    let startDatum = new Date(actieveWeekStart);
    let eindDatum = new Date(actieveWeekStart);
    eindDatum.setDate(startDatum.getDate() + 4); 
    
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
        let nlDatum = `${dagNamen[i]} ${loopDag.getDate()} ${loopDag.toLocaleString('nl-NL', {month:'short'})}`;

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

        // 3. TRAININGEN OPHALEN
        let actieveKeys = Object.keys(window.geplandeTrainingenDB).filter(k => k.startsWith(isoDatum) && window.geplandeTrainingenDB[k].length > 0);

        // Styling Logica
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
        } else {
            if (actieveKeys.length > 0) {
                actieveKeys.forEach(k => {
                    let teamId = k.split('_')[1];
                    let team = window.teamsDB.find(t => t.id === teamId);
                    let teamNaam = team ? team.naam : "Ext. Team";
                    let tijd = team && team.trainingTijd ? team.trainingTijd : "";
                    let veldInfo = team && team.trainingLocatie ? team.trainingLocatie : "";
                    
                    let uDB = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || {};
                    let isTrainer = (uDB.rol === 'trainer');
                    let magBewerken = !isTrainer || (uDB.teams && (uDB.teams.includes('all') || uDB.teams.includes(teamId)));
                    
                    let isAfgelast = window.afgelasteTrainingen.includes(k);
                    
                    // VERTROUWDE STIJL BEPALING
                    let cardBorder = isAfgelast ? "border-left: 5px solid #e74c3c;" : "border-left: 5px solid var(--primary-color);";
                    let cardBg = isAfgelast ? "background: #fef2f2;" : "background: var(--card-bg);";
                    bodyModeClass = document.body.classList.contains('dark-mode') && isAfgelast ? "background: rgba(231,76,60,0.1);" : cardBg;
                    let textDeco = isAfgelast ? "text-decoration: line-through; color: #e74c3c;" : "color: var(--text-color);";

                    agendaHtml += `
                        <div style="margin-bottom:10px; padding:12px; border-radius:6px; ${bodyModeClass} border: 1px solid var(--border-color); ${cardBorder} box-shadow: 0 2px 4px rgba(0,0,0,0.05); position:relative;">
                            ${isAfgelast ? `<div style="position:absolute; top:10px; right:10px; font-size:0.7rem; background:#e74c3c; color:white; font-weight:bold; padding:2px 6px; border-radius:4px;">AFGELAST</div>` : ''}
                            
                            <strong style="display:block; font-size:1.1rem; ${textDeco} margin-bottom:5px;">${teamNaam}</strong>
                            
                            <div style="display:flex; gap:10px; font-size:0.85rem; color:var(--text-muted); margin-bottom:10px; font-weight:500;">
                                ${tijd ? `<span>⏰ ${tijd}</span>` : ''}
                                ${veldInfo ? `<span>📍 Veld ${veldInfo}</span>` : ''}
                            </div>

                            <div style="font-size:0.75rem; color:var(--primary-color); font-weight:bold; margin-bottom:10px; display:inline-block; background:rgba(52, 152, 219, 0.1); padding:3px 8px; border-radius:12px;">
                                ${window.geplandeTrainingenDB[k].length} Oefeningen
                            </div>

                            <div style="display:flex; gap:5px; border-top:1px solid var(--border-color); padding-top:10px; margin-top:5px;">
                                ${magBewerken ? `<button onclick="window.openDagDetail('${isoDatum}', '${teamId}')" title="Bewerk Oefeningen" style="background:rgba(52, 152, 219, 0.1); color:#3498db; border:none; padding:6px; border-radius:4px; cursor:pointer; flex:1;">✏️</button>` : ''}
                                ${magBewerken ? `<button onclick="window.toggleAflassen('${k}')" title="Aflassen / Herstellen" style="background:rgba(231, 76, 60, 0.1); color:#e74c3c; border:none; padding:6px; border-radius:4px; cursor:pointer; flex:1;">❌</button>` : ''}
                                <button onclick="window.stuurWhatsApp('${teamNaam}', '${nlDatum}', '${tijd}', ${isAfgelast})" title="Stuur Appje" style="background:rgba(39, 174, 96, 0.1); color:#27ae60; border:none; padding:6px; border-radius:4px; cursor:pointer; flex:1; font-size:1.1rem;">💬</button>
                            </div>
                        </div>
                    `;
                });
            } else {
                agendaHtml += `<p style="text-align:center; color:var(--text-muted); font-size:0.9rem; font-style:italic; margin-top:20px;">Geen trainingen ingepland.</p>`;
            }

            // VERTROUWDE DASHED BUTTON ONDERAAN
            agendaHtml += `
                <div style="margin-top:auto; padding-top:15px;">
                    <button class="admin-only" onclick="window.openTeamKiezer('${isoDatum}')" style="width:100%; padding:10px; border-radius:6px; background:transparent; border:2px dashed var(--border-dark); color:var(--text-muted); font-weight:bold; cursor:pointer; transition:0.2s;">
                        + Team Toevoegen
                    </button>
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
// MODALS & DATABEHEER
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
        } else alert("Dit team is al ingepland op deze dag.");
    } else alert("Team niet gevonden of je hebt geen rechten.");
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
// OEFENINGEN & TIJDLIJN IN DE MODAL
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
                <div style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="flex:1;">
                        <span style="font-size:0.7rem; background:var(--secondary-color); color:white; padding:3px 6px; border-radius:4px;">${badge}</span><br>
                        <strong style="color:var(--text-color); font-size:1.1rem; display:block; margin-top:6px;">${oef.naam}</strong>
                        <span style="font-size:0.85rem; color:var(--text-muted);">${isProgressie ? oef.totaleDuur : oef.duur} min | ${oef.categorie || 'Geen cat.'}</span>
                        ${progLijst}
                    </div>
                    <button onclick="window.voegToeAanTraining('${oef.id}')" style="background:var(--primary-color); color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1.2rem; margin-left:10px; transition:0.2s;">+</button>
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
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-muted); font-style:italic;">Kies hiernaast een oefening en klik op de blauwe + knop.</div>';
        return;
    }

    let totaleTijd = actieveTijdlijn.reduce((som, o) => som + parseInt(o.type === 'progressie' ? o.totaleDuur : o.duur), 0);
    let html = `<div style="background:#2ecc71; color:white; text-align:center; padding:10px; border-radius:4px; font-weight:bold; margin-bottom:15px; font-size:1.1rem;">⏱️ Totale duur: ${totaleTijd} minuten</div>`;

    actieveTijdlijn.forEach((oef, idx) => {
        let tijdText = oef.type === 'progressie' ? `${oef.totaleDuur} min (Reeks)` : `${oef.duur} min`;
        html += `
            <div style="background:var(--card-bg); border-left:5px solid var(--primary-color); padding:15px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom:8px;">
                <div>
                    <strong style="color:var(--text-color); font-size:1.1rem;">${idx+1}. ${oef.naam}</strong><br>
                    <span style="font-size:0.9rem; color:var(--text-muted);">${tijdText}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    ${idx > 0 ? `<button onclick="window.verschuifTijdlijn(${idx}, -1)" style="background:var(--hover-bg); color:var(--text-color); border:1px solid var(--border-color); padding:8px; border-radius:4px; cursor:pointer;">⬆️</button>` : ''}
                    ${idx < actieveTijdlijn.length - 1 ? `<button onclick="window.verschuifTijdlijn(${idx}, 1)" style="background:var(--hover-bg); color:var(--text-color); border:1px solid var(--border-color); padding:8px; border-radius:4px; cursor:pointer;">⬇️</button>` : ''}
                    <button onclick="window.verwijderUitTijdlijn(${idx})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-left:10px;">✖</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
};

// Start
document.addEventListener('DOMContentLoaded', () => { window.renderWeekAgenda(); });