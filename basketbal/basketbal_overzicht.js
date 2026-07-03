// --- BASKETBAL_OVERZICHT.JS: INCLUSIEF NBB UPLOAD, THUIS & UITWEDSTRIJDEN ---

window.speeldagenDB = JSON.parse(localStorage.getItem('blackshots_speeldagen')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {};

window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10); 
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        let delen = str.split('-'); return `${delen[2]}-${delen[1]}-${delen[0]}`;
    }
    return str;
};

window.genereerUniekId = function(w) {
    if (w.id) return w.id; 
    let thuisteam = w.Thuisteam ? String(w.Thuisteam) : '';
    let uitteam = w.Uitteam ? String(w.Uitteam) : '';
    let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (thuisteam + uitteam).replace(/[^a-zA-Z0-9]/g, '');
    return `match-${window.normaalDatum(w.Datum)}-${clean}`;
};

window.schoonDatumsOp = function() {
    window.speeldagenDB = [...new Set((window.speeldagenDB || []).map(d => window.normaalDatum(d)))].filter(d => d !== "");
};

window.initSeizoensOverzicht = function() {
    window.schoonDatumsOp();
    window.berekenEnRenderOverzicht();
};

window.slaOverzichtDataOp = function() {
    window.schoonDatumsOp();
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

// ============================================================================
// 📥 JSON UPLOAD EN AUTOMATISCHE DATUM HERKENNING
// ============================================================================
window.triggerJsonUpload = function() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json, application/json';
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = function(event) {
            try {
                let data = JSON.parse(event.target.result);
                window.nbbWedstrijden = data;
                localStorage.setItem('blackshots_wedstrijden_json', JSON.stringify(data));
                if (typeof window.opslaanInFirebase === 'function') {
                    window.opslaanInFirebase('blackshots_wedstrijden_json', data);
                }

                // Automatisch alle datums uit de JSON toevoegen aan het rooster
                let nieuwGevonden = 0;
                data.forEach(w => {
                    let isBlackShots = (w.Thuisteam || '').toLowerCase().includes('black shots') || (w.Uitteam || '').toLowerCase().includes('black shots');
                    if (isBlackShots && w.Datum) {
                        let isoDatum = window.normaalDatum(w.Datum); 
                        if(isoDatum && !window.speeldagenDB.includes(isoDatum)) {
                            window.speeldagenDB.push(isoDatum);
                            nieuwGevonden++;
                        }
                    }
                });
                
                if (nieuwGevonden > 0) window.speeldagenDB.sort();
                
                window.slaOverzichtDataOp();
                window.berekenEnRenderOverzicht();
                alert(`✅ Succes! Schema ingeladen en ${nieuwGevonden} nieuwe speeldagen (Uit & Thuis) toegevoegd aan het overzicht.`);
            } catch(err) {
                alert("🚨 Fout bij inladen JSON. Zorg dat het een geldig NBB export bestand is.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_speeldagen') window.speeldagenDB = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_wedstrijden_json') window.nbbWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_custom_wedstrijden') window.customWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    if (sleutel === 'blackshots_scheidsrechters') window.scheidsrechtersDB = Array.isArray(data) ? data : Object.values(data);
    
    window.schoonDatumsOp();
    window.berekenEnRenderOverzicht();
};

window.openWedstrijddagModal = function() {
    let container = document.getElementById('wday-teams-lijst');
    if(!container) return;

    let vandaag = new Date();
    let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    document.getElementById('wday-datum').value = vandaag.toISOString().split('T')[0];

    let html = '';
    let veiligeTeams = Array.isArray(window.teamsDB) ? window.teamsDB : [];
    
    veiligeTeams.forEach(t => {
        if (!t.isVrijwilliger && !t.isRecreant) {
            let veiligeNaam = t.naam ? t.naam.replace(/\s+/g, '') : 'onbekend';
            html += `
                <div class="team-grid-row">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:bold; cursor:pointer;">
                        <input type="checkbox" class="wday-team-checkbox" value="${t.naam || ''}" style="transform: scale(1.2);">
                        🏀 ${t.naam || 'Onbekend Team'}
                    </label>
                    <div>
                        <span style="font-size:0.75rem; color:#7f8c8d; margin-right:5px;">Tijd:</span>
                        <input type="time" id="wday-time-${veiligeNaam}" style="padding:4px; border:1px solid #bdc3c7; border-radius:4px; font-weight:bold;">
                    </div>
                </div>
            `;
        }
    });
    
    if(html === '') html = '<p style="color:#7f8c8d; font-style:italic;">Geen teams gevonden. Voeg deze eerst toe in Clubbeheer.</p>';
    container.innerHTML = html;
    document.getElementById('wedstrijddag-modal').style.display = 'flex';
};

window.slaCompleteWedstrijddagOp = function() {
    let gekozenDatum = window.normaalDatum(document.getElementById('wday-datum').value);
    if (!gekozenDatum) return alert("Selecteer een geldige datum.");

    if (!window.speeldagenDB.includes(gekozenDatum)) {
        window.speeldagenDB.push(gekozenDatum);
        window.speeldagenDB.sort();
    }

    let checkboxes = document.querySelectorAll('.wday-team-checkbox');
    let aantalToegevoegd = 0;

    checkboxes.forEach(chk => {
        if (chk.checked) {
            let teamNaam = chk.value || '';
            let timeId = `wday-time-${teamNaam.replace(/\s+/g, '')}`;
            let timeEl = document.getElementById(timeId);
            let ingevuldeTijd = timeEl ? timeEl.value : '';

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
// 🎨 RENDERING EN SEIZOENSBEREKENINGEN (NU OOK UITWEDSTRIJDEN & AUTO'S)
// ============================================================================
window.berekenEnRenderOverzicht = function() {
    let actueleTakenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
    let actueleWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
    let actueleCustom = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
    
    let alleWedstrijden = [...actueleWedstrijden, ...actueleCustom];
    
    let teamModel = {};
    (window.teamsDB || []).forEach(t => {
        if (t && !t.isVrijwilliger && !t.isRecreant && t.naam) teamModel[t.naam] = 0;
    });

    let scheidsModel = {};
    (window.scheidsrechtersDB || []).forEach(sr => {
        if (sr && sr.naam) scheidsModel[sr.naam] = 0;
    });

    let totaalTakenTeller = 0;
    let openTakenTeller = 0;
    let dagStatusMap = {};

    (window.speeldagenDB || []).forEach(datum => {
        let schoneDatum = window.normaalDatum(datum);
        dagStatusMap[schoneDatum] = { totaal: 0, vrij: 0, wedstrijdenThuis: 0, wedstrijdenUit: 0 };
        
        let dagMatches = alleWedstrijden.filter(w => {
            let matchDatum = window.normaalDatum(w.Datum);
            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            let isUit = (w.Uitteam || '').toLowerCase().includes('black shots');
            return (matchDatum === schoneDatum) && (isThuis || isUit);
        });
        
        dagMatches.forEach(w => {
            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            if (isThuis) {
                dagStatusMap[schoneDatum].wedstrijdenThuis++;
            } else {
                dagStatusMap[schoneDatum].wedstrijdenUit++;
            }

            let uniekId = window.genereerUniekId(w);
            let taken = actueleTakenDB[uniekId] || {};
            
            // Als het Thuis is: 4 taken. Als het Uit is: 3 autotaken.
            let slots = isThuis ? [taken.sA, taken.sB, taken.tab, taken.sco] : [taken.auto1, taken.auto2, taken.auto3];

            slots.forEach(vakje => {
                dagStatusMap[schoneDatum].totaal++;
                totaalTakenTeller++;
                
                let vakjeStr = vakje ? String(vakje).trim() : "";

                if (vakjeStr === "" || vakjeStr === "Vrij") {
                    dagStatusMap[schoneDatum].vrij++; 
                    openTakenTeller++;
                } else {
                    let isToegewezen = false;
                    let vakjeLow = vakjeStr.toLowerCase();

                    let matchScheids = Object.keys(scheidsModel).find(naam => vakjeLow === naam.toLowerCase() || vakjeLow.includes(naam.toLowerCase()));
                    if (matchScheids) {
                        scheidsModel[matchScheids]++;
                        isToegewezen = true;
                    }

                    if (!isToegewezen) {
                        let matchTeam = Object.keys(teamModel).find(team => {
                            let teamBase = team.split('-')[0].toLowerCase().trim();
                            return vakjeLow === team.toLowerCase() || vakjeLow.includes(team.toLowerCase()) || vakjeLow.includes(teamBase);
                        });
                        if (matchTeam) teamModel[matchTeam]++;
                    }
                }
            });
        });
    });

    let elTotDag = document.getElementById('stat-totaal-dagen');
    if (elTotDag) elTotDag.innerText = window.speeldagenDB.length;
    
    let elTotTaak = document.getElementById('stat-totaal-taken');
    if (elTotTaak) elTotTaak.innerText = totaalTakenTeller;
    
    let elTotOpen = document.getElementById('stat-open-taken');
    if (elTotOpen) elTotOpen.innerText = openTakenTeller;

    let druksteTeam = "--"; 
    let maxTaken = 0;
    Object.keys(teamModel).forEach(team => {
        if (teamModel[team] > maxTaken) { maxTaken = teamModel[team]; druksteTeam = `${team} (${maxTaken})`; }
    });
    let elDrukst = document.getElementById('stat-drukste-team');
    if (elDrukst) elDrukst.innerText = druksteTeam;

    let balansContainer = document.getElementById('seizoens-balans-container');
    if (balansContainer) {
        if (Object.keys(teamModel).length === 0) {
            balansContainer.innerHTML = '<p style="color:#7f8c8d; font-size:0.8rem;">Er zijn nog geen teams toegevoegd of gepland.</p>';
        } else {
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
    }

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

    let kalenderContainer = document.getElementById('kalender-lijst-container');
    if (kalenderContainer) {
        if (!window.speeldagenDB || window.speeldagenDB.length === 0) {
            kalenderContainer.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen speeldagen gevonden. Maak er één aan met de knop rechtsboven.</p>';
            return;
        }
        
        let htmlKalender = '';
        window.speeldagenDB.forEach(datum => {
            let schoneDatum = window.normaalDatum(datum);
            let statusObj = dagStatusMap[schoneDatum] || { totaal: 0, vrij: 0, wedstrijdenThuis: 0, wedstrijdenUit: 0 };
            
            let d = new Date(schoneDatum);
            let netteDatum = isNaN(d) ? schoneDatum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) + ' - ' + d.toLocaleDateString('nl-NL', { weekday: 'short' });
            let badgeKleurClass = statusObj.vrij === 0 ? 'status-compleet' : 'status-open';
            let badgeTekst = statusObj.vrij === 0 ? '✅ Rond' : `⏳ ${statusObj.vrij} open taken`;

            htmlKalender += `
                <div class="dag-kaart">
                    <div class="dag-info">
                        <span class="dag-datum">📅 ${netteDatum}</span>
                        <span class="dag-meta">🏠 ${statusObj.wedstrijdenThuis} Thuis | 🚌 ${statusObj.wedstrijdenUit} Uit</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span class="dag-status-badge ${badgeKleurClass}">${badgeTekst}</span>
                        <button onclick="window.stuurDoorNaarPlanner('${schoneDatum}')" class="open-btn">🧩 Open Planner</button>
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

