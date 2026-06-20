// --- BASKETBAL_OVERZICHT.JS: VOLLEDIGE VERSIE INCL. SCHEIDSRECHTER BALANS ---

window.speeldagenDB = JSON.parse(localStorage.getItem('blackshots_speeldagen')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {};

window.initSeizoensOverzicht = function() {
    window.berekenEnRenderOverzicht();
};

window.slaOverzichtDataOp = function() {
    localStorage.setItem('blackshots_speeldagen', JSON.stringify(window.speeldagenDB));
    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));
    localStorage.setItem('blackshots_plan_status', JSON.stringify(window.planStatusDB));

    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_speeldagen', window.speeldagenDB);
        window.opslaanInFirebase('blackshots_custom_wedstrijden', window.customWedstrijden);
        window.opslaanInFirebase('blackshots_plan_status', window.planStatusDB);
    } else {
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_speeldagen', data: window.speeldagenDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_custom_wedstrijden', data: window.customWedstrijden } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_plan_status', data: window.planStatusDB } }));
    }
};

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_speeldagen') window.speeldagenDB = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_wedstrijden_json') window.nbbWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_custom_wedstrijden') window.customWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    if (sleutel === 'blackshots_scheidsrechters') window.scheidsrechtersDB = Array.isArray(data) ? data : Object.values(data);
    
    window.berekenEnRenderOverzicht();
};

// ============================================================================
// ➕ CENTRALIZED SPEELDAG WIZARD ENGINE
// ============================================================================
window.openWedstrijddagModal = function() {
    let container = document.getElementById('wday-teams-lijst');
    if(!container) return;

    let vandaag = new Date();
    let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    document.getElementById('wday-datum').value = vandaag.toISOString().split('T')[0];

    let html = '';
    window.teamsDB.forEach(t => {
        if (!t.isVrijwilliger && !t.isRecreant) {
            html += `
                <div class="team-grid-row">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="wday-team-checkbox" value="${t.naam}" style="transform: scale(1.2);">
                        🏀 ${t.naam}
                    </label>
                    <div>
                        <span style="font-size:0.75rem; color:#7f8c8d; margin-right:5px;">Tijd:</span>
                        <input type="time" id="wday-time-${t.naam.replace(/\s+/g, '')}" style="padding:4px; border:1px solid #bdc3c7; border-radius:4px; font-weight:bold;">
                    </div>
                </div>
            `;
        }
    });
    container.innerHTML = html;
    document.getElementById('wedstrijddag-modal').style.display = 'flex';
};

window.slaCompleteWedstrijddagOp = function() {
    let gekozenDatum = document.getElementById('wday-datum').value;
    if (!gekozenDatum) return alert("Selecteer een geldige datum.");

    if (!window.speeldagenDB.includes(gekozenDatum)) {
        window.speeldagenDB.push(gekozenDatum);
        window.speeldagenDB.sort();
    }

    let checkboxes = document.querySelectorAll('.wday-team-checkbox');
    let aantalToegevoegd = 0;

    checkboxes.forEach(chk => {
        if (chk.checked) {
            let teamNaam = chk.value;
            let timeId = `wday-time-${teamNaam.replace(/\s+/g, '')}`;
            let ingevuldeTijd = document.getElementById(timeId).value;

            let uniekId = 'custom_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            let naamUpper = teamNaam.toUpperCase();
            let duur = (naamUpper.includes('14') || naamUpper.includes('16') || naamUpper.includes('18') || 
                        naamUpper.includes('20') || naamUpper.includes('22') || naamUpper.includes('SE')) ? 105 : 90;

            let nwMatch = {
                id: uniekId, Datum: gekozenDatum, Thuisteam: "Black Shots " + teamNaam, Uitteam: "Tegenstander " + teamNaam,
                Tijd: ingevuldeTijd ? ingevuldeTijd : "Te plannen", Status: "Te plannen", Wedstrijdnummer: "Competitie", handmatigeDuur: duur
            };
            window.customWedstrijden.push(nwMatch);

            if (ingevuldeTijd) {
                window.planStatusDB[uniekId] = { veld: 1, tijd: ingevuldeTijd };
            }
            aantalToegevoegd++;
        }
    });

    window.slaOverzichtDataOp();
    document.getElementById('wedstrijddag-modal').style.display = 'none';
    window.berekenEnRenderOverzicht();
    alert(`✅ Succes! Datum toegevoegd aan de matrix en ${aantalToegevoegd} wedstrijden klaargezet.`);
};

// ============================================================================
// 🎨 RENDERING EN SEIZOENSBEREKENINGEN (NU OOK MET SCHEIDSRECHTERS)
// ============================================================================
window.berekenEnRenderOverzicht = function() {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    
    // MODEL 1: De Teams
    let teamModel = {};
    window.teamsDB.forEach(t => {
        if (!t.isVrijwilliger && !t.isRecreant) teamModel[t.naam] = 0;
    });

    // MODEL 2: De Individuele Scheidsrechters
    let scheidsModel = {};
    window.scheidsrechtersDB.forEach(sr => {
        scheidsModel[sr.naam] = 0;
    });

    let totaalTakenTeller = 0;
    let openTakenTeller = 0;
    let dagStatusMap = {};

    window.speeldagenDB.forEach(datum => {
        dagStatusMap[datum] = { totaal: 0, vrij: 0, wedstrijden: 0 };
        let dagMatches = alleWedstrijden.filter(w => (w.Datum === datum || w.Datum.includes(datum)) && (w.Thuisteam || '').toLowerCase().includes('black shots'));
        dagStatusMap[datum].wedstrijden = dagMatches.length;

        dagMatches.forEach(w => {
            let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim();
            let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (wedstrijdNaam + w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
            let uniekId = w.id || `match-${cleanNummer}`;
            
            let taken = window.takenDB[uniekId] || { sA: "", sB: "", tab: "", sco: "" };
            let slots = [taken.sA, taken.sB, taken.tab, taken.sco];

            slots.forEach(vakje => {
                dagStatusMap[datum].totaal++;
                totaalTakenTeller++;
                if (!vakje || vakje.trim() === "" || vakje === "Vrij") {
                    dagStatusMap[datum].vrij++; openTakenTeller++;
                } else {
                    // Tel bij het juiste model op
                    if (teamModel[vakje] !== undefined) teamModel[vakje]++;
                    if (scheidsModel[vakje] !== undefined) scheidsModel[vakje]++;
                }
            });
        });
    });

    // STATS
    document.getElementById('stat-totaal-dagen').innerText = window.speeldagenDB.length;
    document.getElementById('stat-totaal-taken').innerText = totaalTakenTeller;
    document.getElementById('stat-open-taken').innerText = openTakenTeller;

    let druksteTeam = "--"; let maxTaken = 0;
    Object.keys(teamModel).forEach(team => {
        if (teamModel[team] > maxTaken) {
            maxTaken = teamModel[team]; druksteTeam = `${team} (${maxTaken})`;
        }
    });
    document.getElementById('stat-drukste-team').innerText = druksteTeam;

    // RENDER: TEAMS BALANS
    let balansContainer = document.getElementById('seizoens-balans-container');
    if (balansContainer) {
        let htmlBalans = '';
        let gesorteerdeTeams = Object.keys(teamModel).sort((a,b) => teamModel[b] - teamModel[a]);
        let absoluteMax = Math.max(...Object.values(teamModel), 1);

        gesorteerdeTeams.forEach(team => {
            let percentage = (teamModel[team] / absoluteMax) * 100;
            htmlBalans += `
                <div class="balans-regel">
                    <div class="balans-label"><span>🏀 ${team}</span><strong>${teamModel[team]} taken</strong></div>
                    <div class="balans-balk-bg"><div class="balans-balk-fill" style="width: ${percentage}%;"></div></div>
                </div>
            `;
        });
        balansContainer.innerHTML = htmlBalans;
    }

    // RENDER: SCHEIDSRECHTERS BALANS
    let scheidsContainer = document.getElementById('seizoens-balans-scheids-container');
    if (scheidsContainer) {
        if(Object.keys(scheidsModel).length === 0) {
            scheidsContainer.innerHTML = '<p style="color:#7f8c8d; font-size:0.8rem;">Er zijn nog geen scheidsrechters toegevoegd.</p>';
        } else {
            let htmlScheids = '';
            let gesorteerdeScheids = Object.keys(scheidsModel).sort((a,b) => scheidsModel[b] - scheidsModel[a]);
            let absoluteMaxScheids = Math.max(...Object.values(scheidsModel), 1);

            gesorteerdeScheids.forEach(naam => {
                let percentage = (scheidsModel[naam] / absoluteMaxScheids) * 100;
                htmlScheids += `
                    <div class="balans-regel">
                        <div class="balans-label"><span>👨‍⚖️ ${naam}</span><strong>${scheidsModel[naam]} beurten</strong></div>
                        <div class="balans-balk-bg"><div class="balans-balk-fill oranje" style="width: ${percentage}%;"></div></div>
                    </div>
                `;
            });
            scheidsContainer.innerHTML = htmlScheids;
        }
    }

    // RENDER: KALENDER
    let kalenderContainer = document.getElementById('kalender-lijst-container');
    if (kalenderContainer) {
        if (window.speeldagenDB.length === 0) {
            kalenderContainer.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen speeldagen gevonden.</p>';
            return;
        }
        let htmlKalender = '';
        window.speeldagenDB.forEach(datum => {
            let statusObj = dagStatusMap[datum] || { totaal: 0, vrij: 0, wedstrijden: 0 };
            let d = new Date(datum);
            let netteDatum = isNaN(d) ? datum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) + ' - ' + d.toLocaleDateString('nl-NL', { weekday: 'short' });
            let badgeKleurClass = statusObj.vrij === 0 ? 'status-compleet' : 'status-open';
            let badgeTekst = statusObj.vrij === 0 ? '✅ Rond' : `⏳ ${statusObj.vrij} open taken`;

            htmlKalender += `
                <div class="dag-kaart">
                    <div class="dag-info"><span class="dag-datum">📅 ${netteDatum}</span><span class="dag-meta">🏟️ ${statusObj.wedstrijden} thuiswedstrijden</span></div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span class="dag-status-badge ${badgeKleurClass}">${badgeTekst}</span>
                        <button onclick="window.stuurDoorNaarPlanner('${datum}')" class="open-btn">🧩 Open Planner</button>
                    </div>
                </div>
            `;
        });
        kalenderContainer.innerHTML = htmlKalender;
    }
};

window.stuurDoorNaarPlanner = function(datum) {
    localStorage.setItem('blackshots_actieve_datum', datum);
    window.location.href = 'planner.html';
};