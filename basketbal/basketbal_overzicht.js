// --- BASKETBAL_OVERZICHT.JS ---
window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

window.speeldagenDB = window.veiligeArray('blackshots_speeldagen');
window.nbbWedstrijden = window.veiligeArray('blackshots_wedstrijden_json');
window.customWedstrijden = window.veiligeArray('blackshots_custom_wedstrijden');
window.teamsDB = window.veiligeArray('blackshots_teams');
window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.takenDB = window.veiligObject('blackshots_wedstrijd_taken');
window.planStatusDB = window.veiligObject('blackshots_plan_status');

window.normaalDatum = function(d) {
    if (!d) return "";
    
    // Pak de datum en haal eventuele achtergebleven tijdstippen (zoals 14:00) eraf
    let str = String(d).trim().split(' ')[0]; 
    
    // Check of het in het format dd-mm-yyyy of d-m-yyyy staat (bijv. 5-10-2025 of 05/10/2025)
    let matchNl = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (matchNl) {
        let dag = matchNl[1].padStart(2, '0');     // Zorgt dat '5' altijd '05' wordt
        let maand = matchNl[2].padStart(2, '0');   // Zorgt dat '8' altijd '08' wordt
        let jaar = matchNl[3];
        // Geef ALTIJD yyyy-mm-dd (ISO) terug voor de rekenmotor
        return `${jaar}-${maand}-${dag}`;
    }
    
    // Voor de zekerheid: als de bond het stiekem al als yyyy-mm-dd aanlevert
    let matchIso = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (matchIso) {
        let jaar = matchIso[1];
        let maand = matchIso[2].padStart(2, '0');
        let dag = matchIso[3].padStart(2, '0');
        return `${jaar}-${maand}-${dag}`;
    }

    return str; // Fallback als niks werkt
};

window.genereerUniekId = function(w) {
    if (w.ID) return `nbb-${w.ID}`; 
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
// 📥 JSON UPLOAD (Gefixed: Alleen thuiswedstrijden naar de matrix!)
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

                // FIX: Alleen echte THUISDAGEN worden aan het centrale geheugen toegevoegd
                let nieuwGevonden = 0;
                data.forEach(w => {
                    let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
                    let isGeannuleerd = (w.Status || '').toLowerCase().includes('teruggetrokken');
                    
                    if (isThuis && w.Datum && !isGeannuleerd) {
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
                alert(`✅ Succes! Schema ingeladen en ${nieuwGevonden} THUIS speeldagen toegevoegd aan de planner.`);
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
// 🎨 RENDERING (DYNAMISCH OPHALEN VAN ALLE DAGEN)
// ============================================================================
window.berekenEnRenderOverzicht = function() {
    let actueleTakenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
    let actueleWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
    let actueleCustom = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
    
    let alleWedstrijden = [...actueleWedstrijden, ...actueleCustom];
    
    // FIX: Bouw dynamisch een lijst van ALLE datums (Thuis + Uit) speciaal voor dit Dashboard
    let alleDagenSet = new Set(window.speeldagenDB || []);
    alleWedstrijden.forEach(w => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let isUit = (w.Uitteam || '').toLowerCase().includes('black shots');
        if (isThuis || isUit) {
            let d = window.normaalDatum(w.Datum);
            if (d) alleDagenSet.add(d);
        }
    });
    let dashboardDagenGesorteerd = Array.from(alleDagenSet).sort();

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

    dashboardDagenGesorteerd.forEach(datum => {
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
    if (elTotDag) elTotDag.innerText = dashboardDagenGesorteerd.length;
    
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
        if (dashboardDagenGesorteerd.length === 0) {
            kalenderContainer.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen speeldagen gevonden. Maak er één aan met de knop rechtsboven.</p>';
            return;
        }
        
        let htmlKalender = '';
        dashboardDagenGesorteerd.forEach(datum => {
            let schoneDatum = window.normaalDatum(datum);
            let statusObj = dagStatusMap[schoneDatum] || { totaal: 0, vrij: 0, wedstrijdenThuis: 0, wedstrijdenUit: 0 };
            
            let d = new Date(schoneDatum);
            // Fallback als de datum niet goed parsed: 
            let netteDatum = isNaN(d.getTime()) ? schoneDatum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) + ' - ' + d.toLocaleDateString('nl-NL', { weekday: 'short' });
            
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

// ============================================================================
// 💾 DATA BEHEER: TAKEN & SCHEIDSRECHTERS EXPORTEREN/IMPORTEREN
// ============================================================================

window.downloadTakenEnScheidsrechters = function() {
    // 1. Verzamel de specifieke data
    let backupData = {
        'blackshots_wedstrijd_taken': JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {},
        'blackshots_scheidsrechters': JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [],
        'blackshots_plan_status': JSON.parse(localStorage.getItem('blackshots_plan_status')) || {} // Handig voor de handmatige tijden/velden
    };

    // 2. Zet om naar een JSON bestand
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // 3. Simuleer een klik om de download te starten
    const a = document.createElement("a");
    a.href = url;
    let datumStr = new Date().toISOString().split('T')[0];
    a.download = `BlackShots_TakenBackup_${datumStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.triggerTakenUpload = function() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json, application/json';
    input.onchange = e => {
        let file = e.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = function(event) {
            try {
                let data = JSON.parse(event.target.result);
                
                // Valideer of het het juiste bestand is
                if (!data.blackshots_wedstrijd_taken && !data.blackshots_scheidsrechters) {
                    return alert("🚨 Dit lijkt geen geldig Taken-backup bestand te zijn.");
                }

                // Terugschrijven naar geheugen
                if(data.blackshots_wedstrijd_taken) localStorage.setItem('blackshots_wedstrijd_taken', JSON.stringify(data.blackshots_wedstrijd_taken));
                if(data.blackshots_scheidsrechters) localStorage.setItem('blackshots_scheidsrechters', JSON.stringify(data.blackshots_scheidsrechters));
                if(data.blackshots_plan_status) localStorage.setItem('blackshots_plan_status', JSON.stringify(data.blackshots_plan_status));
                
                // Forceer ook een Cloud Sync (als firebase aan staat)
                if (typeof window.opslaanInFirebase === 'function') {
                    if(data.blackshots_wedstrijd_taken) window.opslaanInFirebase('blackshots_wedstrijd_taken', data.blackshots_wedstrijd_taken);
                    if(data.blackshots_scheidsrechters) window.opslaanInFirebase('blackshots_scheidsrechters', data.blackshots_scheidsrechters);
                    if(data.blackshots_plan_status) window.opslaanInFirebase('blackshots_plan_status', data.blackshots_plan_status);
                }
                
                alert("✅ Taken en Scheidsrechters succesvol teruggezet!");
                window.location.reload();

            } catch(err) {
                alert("🚨 Fout bij inladen van het bestand. Bestand is mogelijk corrupt.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

// ============================================================================
// 🗑️ NIEUW SEIZOEN: SCHEMA VOLLEDIG WISSEN
// ============================================================================

window.resetNieuwSeizoen = function() {
    let check1 = confirm("⚠️ LET OP: Dit verwijdert ALLE wedstrijden (NBB én handmatig) en alle opgeslagen speeldagen uit de database! Weet je het zeker?");
    if (!check1) return;
    
    let check2 = confirm("🚨 LAATSTE WAARSCHUWING: Heb je netjes de 'Taken' gedownload via de Data Beheer knop als je die wilt behouden? Typ OK om door te gaan, Annuleren om te stoppen.");
    if (!check2) return;

    // Alles leegmaken in LocalStorage
    localStorage.setItem('blackshots_speeldagen', '[]');
    localStorage.setItem('blackshots_wedstrijden_json', '[]');
    localStorage.setItem('blackshots_custom_wedstrijden', '[]');

    // (Optioneel: Cloud updaten indien deze functie bestaat)
    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_speeldagen', []);
        window.opslaanInFirebase('blackshots_wedstrijden_json', []);
        window.opslaanInFirebase('blackshots_custom_wedstrijden', []);
    }

    alert("✅ Schoonmaak voltooid. Het wedstrijdschema is volledig leeg. De pagina wordt nu ververst.");
    
    // Geef de Firebase-cloud (als die actief is) een fractie om dit door te geven voordat de pagina herlaadt
    setTimeout(() => {
        window.location.reload();
    }, 1000);
};