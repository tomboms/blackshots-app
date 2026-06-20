// --- BASKETBAL_OVERZICHT.JS: DE SEIZOENS-BALANS ENGINE ---

window.speeldagenDB = JSON.parse(localStorage.getItem('blackshots_speeldagen')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {};

window.initSeizoensOverzicht = function() {
    window.berekenEnRenderOverzicht();
};

// Ontvangt updates vanuit Firebase Cloud
window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_speeldagen') window.speeldagenDB = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_wedstrijden_json') window.nbbWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_custom_wedstrijden') window.customWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    
    window.berekenEnRenderOverzicht();
};

window.berekenEnRenderOverzicht = function() {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let teamModel = {};
    
    // Bereid tellers voor elk clubteam voor
    window.teamsDB.forEach(t => {
        if (!t.isVrijwilliger && !t.isRecreant) {
            teamModel[t.naam] = 0;
        }
    });

    let totaalTakenTeller = 0;
    let openTakenTeller = 0;
    let dagStatusMap = {}; // Slaat op hoeveel open taken er per speeldatum zijn

    // 1. SCANNEN VAN DE COMPLETE DATABASE OVER HET HELE SEIZOEN
    window.speeldagenDB.forEach(datum => {
        dagStatusMap[datum] = { totaal: 0, vrij: 0, wedstrijden: 0 };

        // Filter alle thuiswedstrijden van deze specifieke datum
        let dagMatches = alleWedstrijden.filter(w => (w.Datum === datum || w.Datum.includes(datum)) && (w.Thuisteam || '').toLowerCase().includes('black shots'));
        
        dagStatusMap[datum].wedstrijden = dagMatches.length;

        dagMatches.forEach(w => {
            let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '').trim();
            let cleanNummer = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (wedstrijdNaam + w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
            let uniekId = w.id || `match-${cleanNummer}`;
            
            // Haal de opgeslagen taken op
            let taken = window.takenDB[uniekId] || { sA: "", sB: "", tab: "", sco: "" };
            let slots = [taken.sA, taken.sB, taken.tab, taken.sco];

            slots.forEach(vakje => {
                dagStatusMap[datum].totaal++;
                totaalTakenTeller++;

                if (!vakje || vakje.trim() === "" || vakje === "Vrij") {
                    dagStatusMap[datum].vrij++;
                    openTakenTeller++;
                } else {
                    // Als het een bekend clubteam is, tel mee voor de Seizoens-Balans!
                    if (teamModel[vakje] !== undefined) {
                        teamModel[vakje]++;
                    }
                }
            });
        });
    });

    // 2. BOVENSTE STATS UPADATEN
    document.getElementById('stat-totaal-dagen').innerText = window.speeldagenDB.length;
    document.getElementById('stat-totaal-taken').innerText = totaalTakenTeller;
    document.getElementById('stat-open-taken').innerText = openTakenTeller;

    // Bereken het drukste team
    let druksteTeam = "--";
    let maxTaken = 0;
    Object.keys(teamModel).forEach(team => {
        if (teamModel[team] > maxTaken) {
            maxTaken = teamModel[team];
            druksteTeam = `${team} (${maxTaken})`;
        }
    });
    document.getElementById('stat-drukste-team').innerText = druksteTeam;

    // 3. RENDER DE SEIZOENS-BALANS (RECHTS)
    let balansContainer = document.getElementById('seizoens-balans-container');
    if (balansContainer) {
        let htmlBalans = '';
        // Sorteer teams zodat het zwaarst belaste team bovenaan staat
        let gesorteerdeTeams = Object.keys(teamModel).sort((a,b) => teamModel[b] - teamModel[a]);
        
        // Bepaal de max waarde voor de 100% breedte van de voortgangsbalk
        let absoluteMax = Math.max(...Object.values(teamModel), 1);

        gesorteerdeTeams.forEach(team => {
            let behaaldeTaken = teamModel[team];
            let percentage = (behaaldeTaken / absoluteMax) * 100;

            htmlBalans += `
                <div class="balans-regel">
                    <div class="balans-label">
                        <span>🏀 ${team}</span>
                        <strong>${behaaldeTaken} taken</strong>
                    </div>
                    <div class="balans-balk-bg">
                        <div class="balans-balk-fill" style="width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        });
        balansContainer.innerHTML = htmlBalans;
    }

    // 4. RENDER DE SPEELDAGEN AGENDA (LINKS)
    let kalenderContainer = document.getElementById('kalender-lijst-container');
    if (kalenderContainer) {
        if (window.speeldagenDB.length === 0) {
            kalenderContainer.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Er staan nog geen speeldagen in je systeem. Ga naar de Scheidsrechters pagina om thuisdagen op te halen.</p>';
            return;
        }

        let htmlKalender = '';
        window.speeldagenDB.forEach(datum => {
            let statusObj = dagStatusMap[datum] || { totaal: 0, vrij: 0, wedstrijden: 0 };
            
            let d = new Date(datum);
            let opties = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
            let netteDatum = isNaN(d) ? datum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) + ' - ' + d.toLocaleDateString('nl-NL', { weekday: 'short' });

            let badgeKleurClass = statusObj.vrij === 0 ? 'status-compleet' : 'status-open';
            let badgeTekst = statusObj.vrij === 0 ? '✅ Rond' : `⏳ ${statusObj.vrij} open taken`;

            htmlKalender += `
                <div class="dag-kaart">
                    <div class="dag-info">
                        <span class="dag-datum">📅 ${netteDatum}</span>
                        <span class="dag-meta">🏟️ ${statusObj.wedstrijden} thuiswedstrijden gepland</span>
                    </div>
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
    // Sla de geselecteerde datum op in het geheugen, zodat planner.html weet welke dag hij moet openen!
    localStorage.setItem('blackshots_actieve_datum', datum);
    window.location.href = 'planner.html';
};