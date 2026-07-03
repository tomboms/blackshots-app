// --- BASKETBAL_PLANNER.JS: MET AUTO-PLANNER, UIT-KOLOM & VERWIJDER FUNCTIES ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.customWedstrijden = JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.beschikbaarheidDB = JSON.parse(localStorage.getItem('blackshots_beschikbaarheid')) || {};
window.takenDB = JSON.parse(localStorage.getItem('blackshots_wedstrijd_taken')) || {};
window.planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {}; 
window.clubRegelsDB = JSON.parse(localStorage.getItem('blackshots_clubregels')) || [];

// NIEUW: Database om NBB wedstrijden te verbergen als je ze verwijdert
window.verborgenDB = JSON.parse(localStorage.getItem('blackshots_verborgen_wedstrijden')) || [];

const START_UUR = 9; const EIND_UUR = 22; const PIXEL_SCALE = 2; const SNAP_MINUTEN = 15; 

window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10); 
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) { let delen = str.split('-'); return `${delen[2]}-${delen[1]}-${delen[0]}`; }
    return str;
};

window.genereerUniekId = function(w) {
    if (w.id) return w.id; 
    let thuisteam = w.Thuisteam ? String(w.Thuisteam) : '';
    let uitteam = w.Uitteam ? String(w.Uitteam) : '';
    let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (thuisteam + uitteam).replace(/[^a-zA-Z0-9]/g, '');
    return `match-${window.normaalDatum(w.Datum)}-${clean}`;
};

// ============================================================================
// ☁️ CLOUD SYNC & UPLOAD
// ============================================================================
window.triggerJsonUpload = function() {
    let input = document.createElement('input');
    input.type = 'file'; input.accept = '.json, application/json';
    input.onchange = e => {
        let file = e.target.files[0]; let reader = new FileReader();
        reader.onload = function(event) {
            try {
                let data = JSON.parse(event.target.result);
                window.nbbWedstrijden = data;
                localStorage.setItem('blackshots_wedstrijden_json', JSON.stringify(data));
                if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase('blackshots_wedstrijden_json', data);
                window.laadPlanbord();
                alert(`✅ Succes! ${data.length} wedstrijden ingeladen uit NBB Schema.`);
            } catch(err) { alert("🚨 Fout bij inladen JSON."); }
        };
        reader.readAsText(file);
    };
    input.click();
};

window.slaPlannerDataOp = function() {
    localStorage.setItem('blackshots_wedstrijd_taken', JSON.stringify(window.takenDB));
    localStorage.setItem('blackshots_plan_status', JSON.stringify(window.planStatusDB));
    localStorage.setItem('blackshots_custom_wedstrijden', JSON.stringify(window.customWedstrijden));
    localStorage.setItem('blackshots_clubregels', JSON.stringify(window.clubRegelsDB));
    localStorage.setItem('blackshots_verborgen_wedstrijden', JSON.stringify(window.verborgenDB));

    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_wedstrijd_taken', window.takenDB);
        window.opslaanInFirebase('blackshots_plan_status', window.planStatusDB);
        window.opslaanInFirebase('blackshots_custom_wedstrijden', window.customWedstrijden);
        window.opslaanInFirebase('blackshots_clubregels', window.clubRegelsDB);
        window.opslaanInFirebase('blackshots_verborgen_wedstrijden', window.verborgenDB);
    }
};

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_wedstrijd_taken') window.takenDB = data;
    if (sleutel === 'blackshots_plan_status') window.planStatusDB = data;
    if (sleutel === 'blackshots_custom_wedstrijden') window.customWedstrijden = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_clubregels') window.clubRegelsDB = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_verborgen_wedstrijden') window.verborgenDB = Array.isArray(data) ? data : Object.values(data);
    window.laadPlanbord();
};

window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    let opgeslagenDatum = localStorage.getItem('blackshots_actieve_datum');
    if (opgeslagenDatum) {
        datumInput.value = window.normaalDatum(opgeslagenDatum);
        localStorage.removeItem('blackshots_actieve_datum');
    } else {
        let vandaag = new Date();
        let verschilZaterdag = (vandaag.getDay() <= 6) ? (6 - vandaag.getDay()) : 6;
        vandaag.setDate(vandaag.getDate() + verschilZaterdag);
        datumInput.value = vandaag.toISOString().split('T')[0];
    }
    
    let opts = '<option value="">-- Selecteer team --</option>';
    window.teamsDB.forEach(t => { opts += `<option value="${t.naam}">${t.naam}</option>`; });
    if(document.getElementById('nw-match-team')) document.getElementById('nw-match-team').innerHTML = opts;
    if(document.getElementById('regel-team-voor')) document.getElementById('regel-team-voor').innerHTML = opts;
    if(document.getElementById('regel-team-na')) document.getElementById('regel-team-na').innerHTML = opts;

    window.laadPlanbord();
};

window.tijdNaarMinuten = function(tijdStr) {
    if (!tijdStr || tijdStr.includes('Te plannen') || tijdStr.includes('N.t.b.')) return 0;
    let parts = tijdStr.split(':'); return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
};

window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = teamNaam.toUpperCase();
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || naam.includes('20') || naam.includes('22') || naam.includes('SE')) return 105;
    return 90; 
};

// ============================================================================
// 🤖 AUTO-PLANNER (Plaatst bekende tijden uit NBB direct op het bord)
// ============================================================================
window.autoPlanBekendeTijden = function(schoneDatum) {
    let gewijzigd = false;
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagMatches = alleWedstrijden.filter(w => window.normaalDatum(w.Datum) === schoneDatum && !window.verborgenDB.includes(window.genereerUniekId(w)));

    let bezetVeld1 = []; let bezetVeld2 = [];

    // Eerst scannen we wat er AL op het bord staat
    dagMatches.forEach(w => {
        let id = window.genereerUniekId(w);
        if (window.planStatusDB[id]) {
            let st = window.planStatusDB[id];
            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            let duur = w.handmatigeDuur || window.bepaalWedstrijdDuur(isThuis ? w.Thuisteam.replace('Black Shots ','') : w.Uitteam.replace('Black Shots ',''));
            let min = window.tijdNaarMinuten(st.tijd);
            if(st.veld === 1) bezetVeld1.push({start: min, eind: min+duur});
            if(st.veld === 2) bezetVeld2.push({start: min, eind: min+duur});
        }
    });

    // Dan kijken we welke we automatisch kunnen plaatsen
    dagMatches.forEach(w => {
        let id = window.genereerUniekId(w);
        if (!window.planStatusDB[id] && w.Tijd && w.Tijd !== "Te plannen" && w.Tijd !== "N.t.b." && w.Tijd !== "00:00:00") {
            let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
            let startMin = window.tijdNaarMinuten(w.Tijd.substring(0,5));
            let duur = w.handmatigeDuur || window.bepaalWedstrijdDuur(isThuis ? w.Thuisteam.replace('Black Shots ','') : w.Uitteam.replace('Black Shots ',''));
            let eindMin = startMin + duur;

            if (!isThuis) {
                // Uitwedstrijd gaat direct naar de Uit-kolom
                window.planStatusDB[id] = { veld: 'uit', tijd: w.Tijd.substring(0,5) };
                gewijzigd = true;
            } else {
                // Thuiswedstrijd: Check veld voorkeur en ruimte
                let voorkeurVeld = (w.Veld && w.Veld.includes('2')) ? 2 : 1;
                let pastOp1 = !bezetVeld1.some(b => startMin < b.eind && eindMin > b.start);
                let pastOp2 = !bezetVeld2.some(b => startMin < b.eind && eindMin > b.start);

                let gekozenVeld = null;
                if (voorkeurVeld === 2 && pastOp2) gekozenVeld = 2;
                else if (voorkeurVeld === 1 && pastOp1) gekozenVeld = 1;
                else if (pastOp1) gekozenVeld = 1;
                else if (pastOp2) gekozenVeld = 2;

                if (gekozenVeld) {
                    window.planStatusDB[id] = { veld: gekozenVeld, tijd: w.Tijd.substring(0,5) };
                    if(gekozenVeld===1) bezetVeld1.push({start: startMin, eind: eindMin});
                    if(gekozenVeld===2) bezetVeld2.push({start: startMin, eind: eindMin});
                    gewijzigd = true;
                }
            }
        }
    });
    if(gewijzigd) window.slaPlannerDataOp();
};

// ============================================================================
// 🗑️ VERWIJDER FUNCTIES (Dag & Wedstrijd)
// ============================================================================
window.verwijderWedstrijd = function(id) {
    if(confirm("Weet je zeker dat je deze wedstrijd wilt verwijderen/verbergen van het bord?")) {
        if(id.includes('custom_')) {
            window.customWedstrijden = window.customWedstrijden.filter(w => w.id !== id);
        } else {
            window.verborgenDB.push(id); // Verberg NBB wedstrijden
        }
        delete window.takenDB[id];
        delete window.planStatusDB[id];
        window.slaPlannerDataOp();
        window.laadPlanbord(); 
    }
};

window.verwijderHuidigeDag = function() {
    let datum = document.getElementById('plan-datum').value;
    let schoneDatum = window.normaalDatum(datum);
    if(!confirm(`⚠️ Let op: Weet je zeker dat je HEEL ${schoneDatum} wilt wissen uit het seizoen?`)) return;

    let speeldagen = JSON.parse(localStorage.getItem('blackshots_speeldagen')) || [];
    speeldagen = speeldagen.filter(d => d !== schoneDatum);
    localStorage.setItem('blackshots_speeldagen', JSON.stringify(speeldagen));
    
    // Verwijder statussen van deze dag
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    alleWedstrijden.forEach(w => {
        if(window.normaalDatum(w.Datum) === schoneDatum) {
            let id = window.genereerUniekId(w);
            delete window.planStatusDB[id];
            delete window.takenDB[id];
        }
    });

    window.slaPlannerDataOp();
    window.location.href = 'thuisdagen_overzicht.html';
};

// ============================================================================
// 🚨 CONFLICT ENGINE & TELLERS
// ============================================================================
window.checkConflicten = function(taakPersoon, matchStartMin, matchEindMin, speelDatum, alleDaggeplande, huidigeMatchId, alleTakenHuidigeMatch) {
    let resultaat = { status: 'groen', berichten: [] };
    if (!taakPersoon || taakPersoon === "" || taakPersoon === "Vrij") return resultaat;

    let veiligeNaam = String(taakPersoon);
    let isTeam = (window.teamsDB || []).some(t => t && t.naam && veiligeNaam.includes(t.naam)) || veiligeNaam.toLowerCase().includes('ouders');

    if (!isTeam) {
        let countInMatch = 0;
        if(alleTakenHuidigeMatch.sA === taakPersoon) countInMatch++;
        if(alleTakenHuidigeMatch.sB === taakPersoon) countInMatch++;
        if(alleTakenHuidigeMatch.tab === taakPersoon) countInMatch++;
        if(alleTakenHuidigeMatch.sco === taakPersoon) countInMatch++;
        if(countInMatch >= 1) { resultaat.status = 'rood'; resultaat.berichten.push("Al ingedeeld in deze wedstrijd!"); return resultaat; }
    }

    let sr = (window.scheidsrechtersDB || []).find(s => s && s.naam === taakPersoon);
    if (sr && window.beschikbaarheidDB && window.beschikbaarheidDB[`${sr.id}_${speelDatum}`] === 'af') { resultaat.status = 'rood'; resultaat.berichten.push("Afwezig volgens rooster."); }

    if ((veiligeNaam.toUpperCase().includes('X10') || veiligeNaam.toUpperCase().includes('X12')) && !veiligeNaam.toLowerCase().includes('ouders')) {
        if (resultaat.status !== 'rood') resultaat.status = 'oranje'; resultaat.berichten.push("Te jong voor taken.");
    }

    (alleDaggeplande || []).forEach(andereMatch => {
        let aStart = window.tijdNaarMinuten(andereMatch.geplandeTijd);
        if (aStart === 0) return; let aEind = aStart + andereMatch.duur;

        if (matchStartMin < aEind && matchEindMin > aStart) {
            if (!isTeam && andereMatch.uniekId !== huidigeMatchId) {
                let andereTaken = window.takenDB[andereMatch.uniekId] || {};
                if (Object.values(andereTaken).includes(taakPersoon)) { resultaat.status = 'rood'; resultaat.berichten.push(`Overlap andere match.`); }
            }
            let anderThuisteam = (andereMatch.Thuisteam || '').replace('Black Shots ', '').trim();
            if (veiligeNaam === anderThuisteam || veiligeNaam.includes(anderThuisteam)) { resultaat.status = 'rood'; resultaat.berichten.push(`Team speelt zelf.`); }
            if (sr && sr.gekoppeldTeam && sr.gekoppeldTeam === anderThuisteam) { resultaat.status = 'rood'; resultaat.berichten.push(`Speelt nu zelf bij ${sr.gekoppeldTeam}.`); }
        }
    });
    return resultaat;
};

window.werkTellerBij = function(dagWedstrijden) {
    let counts = {};
    dagWedstrijden.forEach(w => {
        let uniekId = window.genereerUniekId(w);
        let taken = window.takenDB[uniekId] || {};
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let aanwezigeTaken = isThuis ? [taken.sA, taken.sB, taken.tab, taken.sco] : [taken.auto1, taken.auto2, taken.auto3];
        aanwezigeTaken.forEach(persoonOfTeam => {
            if (persoonOfTeam && persoonOfTeam.trim() !== "" && persoonOfTeam !== "Vrij") { counts[persoonOfTeam] = (counts[persoonOfTeam] || 0) + 1; }
        });
    });

    let gesorteerd = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    let lijstContainer = document.getElementById('teller-lijst-container');
    if (!lijstContainer) return;
    if (gesorteerd.length === 0) { lijstContainer.innerHTML = '<div style="color:#7f8c8d; font-size:0.8rem; text-align:center;">Nog geen toewijzingen.</div>'; return; }

    let html = '';
    gesorteerd.forEach(naam => { html += `<div class="teller-item"><span>${naam}</span> <strong>${counts[naam]}</strong></div>`; });
    lijstContainer.innerHTML = html;
};

// ============================================================================
// 🎨 BORD RENDERING (MET AUTO-PLANNER EN EXTRA UIT-KOLOM)
// ============================================================================
window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
    if(!bord || !speelDatum) return;

    // Voer de auto-planner uit voordat we het bord tekenen
    window.autoPlanBekendeTijden(speelDatum);

    let html = `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    html += `</div>`;

    let aantalVelden = locatie === 'veka' ? 2 : 1;
    let veldNamen = locatie === 'veka' ? ['Veld 1', 'Veld 2'] : ['De Veste Hoofdveld'];

    for(let v = 0; v < aantalVelden; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) gridLijnenHtml += `<div class="grid-lijn-15m"></div><div class="grid-lijn-30m"></div><div class="grid-lijn-15m"></div><div class="grid-lijn-60m"></div>`;
        gridLijnenHtml += `</div>`;
        html += `<div class="veld-kolom" id="veld-kolom-${v+1}" ondragover="window.onDragOver(event)" ondrop="window.onDropVeld(event, ${v+1})">
                    <div class="veld-header">${veldNamen[v]}</div>
                    ${gridLijnenHtml}
                    <div id="wedstrijd-container-${v+1}" style="position:absolute; top:42px; left:0; right:0; bottom:0;"></div>
                 </div>`;
    }

    // NIEUW: De 3e kolom speciaal voor Uitwedstrijden!
    let gridLijnenUit = `<div class="grid-lijnen">`;
    for(let u = START_UUR; u < EIND_UUR; u++) gridLijnenUit += `<div class="grid-lijn-15m"></div><div class="grid-lijn-30m"></div><div class="grid-lijn-15m"></div><div class="grid-lijn-60m"></div>`;
    gridLijnenUit += `</div>`;
    
    html += `<div class="veld-kolom" id="veld-kolom-uit" ondragover="window.onDragOver(event)" ondrop="window.onDropVeld(event, 'uit')" style="background: rgba(41, 128, 185, 0.05);">
                <div class="veld-header" style="background:#2980b9;">🚌 Uitwedstrijden</div>
                ${gridLijnenUit}
                <div id="wedstrijd-container-uit" style="position:absolute; top:42px; left:0; right:0; bottom:0;"></div>
             </div>`;

    bord.innerHTML = html;
    window.plaatsWedstrijdenInWachtkamer(speelDatum);
};

window.plaatsWedstrijdenInWachtkamer = function(datum) {
    let schoneDatum = window.normaalDatum(datum);
    let container = document.getElementById('te-plannen-container');
    Array.from(container.children).forEach(child => { if (!child.classList.contains('wachtkamer-header') && child.id !== 'wachtkamer-leeg') child.remove(); });

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    
    let dagWedstrijden = alleWedstrijden.filter(w => {
        let matchDatum = window.normaalDatum(w.Datum);
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let isUit = (w.Uitteam || '').toLowerCase().includes('black shots');
        // Negeer verborgen wedstrijden
        return matchDatum === schoneDatum && (isThuis || isUit) && !window.verborgenDB.includes(window.genereerUniekId(w));
    });

    document.getElementById('aantal-te-plannen').innerText = dagWedstrijden.length;
    document.getElementById('wachtkamer-leeg').style.display = dagWedstrijden.length === 0 ? 'block' : 'none';

    window.werkTellerBij(dagWedstrijden);

    let geplandeDataLijst = []; let teamStartTijden = {}; 
    let uitOverlaps = {}; // Houdt bij hoeveel uitwedstrijden er tegelijk vallen

    dagWedstrijden.forEach(w => {
        let uniekId = window.genereerUniekId(w);
        let dbStatus = window.planStatusDB[uniekId];
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let wedstrijdNaam = isThuis ? w.Thuisteam.replace('Black Shots ', '').trim() : w.Uitteam.replace('Black Shots ', '').trim();
        let startMin = dbStatus ? window.tijdNaarMinuten(dbStatus.tijd) : 0;
        
        if (dbStatus) {
            geplandeDataLijst.push({ uniekId: uniekId, Thuisteam: w.Thuisteam, geplandeTijd: dbStatus.tijd, duur: w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam) });
            teamStartTijden[wedstrijdNaam] = startMin; 
        }
    });

    dagWedstrijden.forEach((w) => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let wedstrijdNaam = isThuis ? w.Thuisteam.replace('Black Shots ', '').trim() : w.Uitteam.replace('Black Shots ', '').trim();
        let tegenstander = isThuis ? w.Uitteam : w.Thuisteam;
        
        let uniekId = window.genereerUniekId(w);
        let duurMinuten = w.handmatigeDuur ? w.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);
        let pixelHoogte = duurMinuten * PIXEL_SCALE;

        let dbStatus = window.planStatusDB[uniekId];
        let startMinuten = dbStatus ? window.tijdNaarMinuten(dbStatus.tijd) : 0;
        let topPixels = dbStatus ? ((startMinuten - (START_UUR * 60)) * PIXEL_SCALE) : 0; 
        
        let cssPositie = `position: relative;`;
        if (dbStatus) {
            // Waaiereffect voor uitwedstrijden die tegelijk starten!
            if (dbStatus.veld === 'uit') {
                let overlapIndex = uitOverlaps[startMinuten] || 0;
                cssPositie = `position: absolute; top: ${topPixels}px; left: ${5 + (overlapIndex * 35)}px; right: 5px; width: calc(100% - ${10 + overlapIndex * 35}px); z-index: ${10 + overlapIndex};`;
                uitOverlaps[startMinuten] = overlapIndex + 1;
            } else {
                cssPositie = `position: absolute; top: ${topPixels}px; left: 5px; right: 5px; width: auto; z-index: 10;`;
            }
        }

        let tijdWeergave = dbStatus ? dbStatus.tijd : (w.Tijd && w.Tijd !== "00:00:00" ? w.Tijd.substring(0,5) : 'Te plannen');
        let taken = window.takenDB[uniekId] || {};

        let regelBanners = [];
        if (dbStatus && isThuis) { 
            window.clubRegelsDB.forEach(regel => {
                if (regel.teamVoor === wedstrijdNaam && teamStartTijden[regel.teamNa] && startMinuten >= teamStartTijden[regel.teamNa]) regelBanners.push(`Let op: Moet vóór ${regel.teamNa}!`);
                if (regel.teamNa === wedstrijdNaam && teamStartTijden[regel.teamVoor] && startMinuten <= teamStartTijden[regel.teamVoor]) regelBanners.push(`Let op: Moet ná ${regel.teamVoor}!`);
            });
        }
        let clubRegelHtml = regelBanners.map(msg => `<div class="regel-banner">🟪 ${msg}</div>`).join('');

        let htmlTakenBlok = '';
        let randKleur = isThuis ? '#e67e22' : '#3498db';
        let bgKleur = isThuis ? '#fff3e0' : '#ebf5fb';
        let badgeBg = dbStatus ? (isThuis ? '#27ae60' : '#2980b9') : (isThuis ? '#e67e22' : '#7f8c8d');

        if (isThuis) {
            let tA = window.checkConflicten(taken.sA, startMinuten, startMinuten + duurMinuten, schoneDatum, geplandeDataLijst, uniekId, taken);
            let tB = window.checkConflicten(taken.sB, startMinuten, startMinuten + duurMinuten, schoneDatum, geplandeDataLijst, uniekId, taken);
            let tTab = window.checkConflicten(taken.tab, startMinuten, startMinuten + duurMinuten, schoneDatum, geplandeDataLijst, uniekId, taken);
            let tSco = window.checkConflicten(taken.sco, startMinuten, startMinuten + duurMinuten, schoneDatum, geplandeDataLijst, uniekId, taken);
            
            let formatTaak = (naam, obj) => { let css = naam ? "taak-gevuld" : ""; let out = naam || "Vrij"; if(obj.status === 'rood') css = "conflict-text"; else if(obj.status === 'oranje') css = "warning-text"; return { out: out, css: css }; };
            let fA = formatTaak(taken.sA, tA); let fB = formatTaak(taken.sB, tB); let fT = formatTaak(taken.tab, tTab); let fS = formatTaak(taken.sco, tSco);
            
            htmlTakenBlok = `<div style="display:flex; gap:5px;"><div class="taak-regel" style="flex:1;"><span class="taak-label">A:</span> <span class="taak-waarde ${fA.css}">${fA.out}</span></div><div class="taak-regel" style="flex:1;"><span class="taak-label">B:</span> <span class="taak-waarde ${fB.css}">${fB.out}</span></div></div><div style="display:flex; gap:5px;"><div class="taak-regel" style="flex:1;"><span class="taak-label">💻:</span> <span class="taak-waarde ${fT.css}">${fT.out}</span></div><div class="taak-regel" style="flex:1;"><span class="taak-label">⏱️:</span> <span class="taak-waarde ${fS.css}">${fS.out}</span></div></div>`;
        } else {
            let a1 = taken.auto1 || "Vrij"; let a2 = taken.auto2 || "Vrij"; let a3 = taken.auto3 || "Vrij";
            let c1 = a1 !== "Vrij" ? "taak-gevuld" : ""; let c2 = a2 !== "Vrij" ? "taak-gevuld" : ""; let c3 = a3 !== "Vrij" ? "taak-gevuld" : "";
            htmlTakenBlok = `<div style="display:flex; gap:5px; flex-direction:column; border-top:1px dashed #3498db; padding-top:5px;"><div class="taak-regel" style="border-color:#3498db; background:rgba(255,255,255,0.9);"><span class="taak-label">🚗 1:</span> <span class="taak-waarde ${c1}">${a1}</span></div><div style="display:flex; gap:5px;"><div class="taak-regel" style="flex:1; border-color:#3498db; background:rgba(255,255,255,0.9);"><span class="taak-label">🚗 2:</span> <span class="taak-waarde ${c2}">${a2}</span></div><div class="taak-regel" style="flex:1; border-color:#3498db; background:rgba(255,255,255,0.9);"><span class="taak-label">🚗 3:</span> <span class="taak-waarde ${c3}">${a3}</span></div></div></div>`;
        }

        let typeBadge = (w.id && w.id.includes('custom')) ? `<span style="background:#8e44ad; color:white; padding:1px 4px; border-radius:3px; font-size:0.65rem;">${w.Wedstrijdnummer}</span>` : '';
        let titelKleur = isThuis ? '#d35400' : '#2980b9'; let icoon = isThuis ? '🏠' : '🚌';

        let html = `
            <div class="wedstrijd-blok" id="${uniekId}" draggable="true" ondragstart="window.onDragStart(event)" ondragend="window.onDragEnd(event)" style="background:${bgKleur}; border-color:${randKleur}; ${cssPositie} height: ${pixelHoogte}px;">
                ${clubRegelHtml}
                <div class="wb-titel" style="color:${titelKleur};">
                    <span>${icoon} ${wedstrijdNaam} <span style="color:#7f8c8d; font-size:0.75rem;">vs ${tegenstander}</span></span>
                    <button onmousedown="event.stopPropagation();" onclick="window.verwijderWedstrijd('${uniekId}')" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:0; margin-left:auto; opacity:0.5;">🗑️</button>
                </div>
                <div class="wb-meta">
                    <span class="wb-tijd-badge" id="tijd-label-${uniekId}" onmousedown="event.stopPropagation();" onclick="window.wijzigTijdHandmatig('${uniekId}')" style="background:${badgeBg};">⏱️ ${tijdWeergave}</span> 
                    <span>| NBB: ${w.Wedstrijdnummer || '?'} ${typeBadge}</span>
                </div>
                <div class="wb-taken" onclick="window.openTakenModal('${uniekId}')">${htmlTakenBlok}</div>
            </div>
        `;
        let targetDiv = document.getElementById(dbStatus ? `wedstrijd-container-${dbStatus.veld}` : 'te-plannen-container');
        if(targetDiv) targetDiv.insertAdjacentHTML('beforeend', html);
    });
};

window.genereerDropdownOpties = function(huidigeWaarde) {
    let html = `<option value="">-- Vrij --</option><optgroup label="👨‍⚖️ Scheidsrechters (Matrix)">`;
    window.scheidsrechtersDB.forEach(sr => html += `<option value="${sr.naam}">${sr.naam}</option>`);
    html += `</optgroup><optgroup label="🏀 Club Teams">`;
    window.teamsDB.forEach(t => html += `<option value="${t.naam}">${t.naam}</option>`);
    html += `</optgroup><optgroup label="Overig"><option value="handmatig">✏️ Handmatig typen...</option></optgroup>`;
    let bekende = window.scheidsrechtersDB.map(s => s.naam).concat(window.teamsDB.map(t => t.naam));
    if (huidigeWaarde && huidigeWaarde !== "" && !bekende.includes(huidigeWaarde)) { html += `<option value="${huidigeWaarde}" style="display:none;">${huidigeWaarde}</option>`; }
    return html;
};

// ============================================================================
// 📋 DYNAMISCH TAKEN MODAL (THUIS VS UIT)
// ============================================================================
window.openTakenModal = function(matchId) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => window.genereerUniekId(w) === matchId);
    if (!match) return;

    let isThuis = (match.Thuisteam || '').toLowerCase().includes('black shots');
    
    document.getElementById('taak-match-id').value = matchId;
    document.getElementById('taak-match-titel').innerText = `${isThuis ? '🏠 Thuis:' : '🚌 Uit:'} ${match.Thuisteam.replace('Black Shots ', '')} vs ${match.Uitteam.replace('Black Shots ', '')}`;
    
    let dbStatus = window.planStatusDB[matchId];
    document.getElementById('taak-match-meta').innerText = `Tijdstip: ${dbStatus ? dbStatus.tijd : (match.Tijd || 'Te plannen')} | NBB: ${match.Wedstrijdnummer || 'Custom'}`;

    let taken = window.takenDB[matchId] || {};
    let veldenHtml = '';

    if (isThuis) {
        document.getElementById('taak-modal-header').innerText = '📋 Arbitrage & Tafel';
        veldenHtml = `
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">👨‍⚖️ Scheids A:</label><select id="taak-sA" style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px;"></select></div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">👨‍⚖️ Scheids B:</label><select id="taak-sB" style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px;"></select></div>
            </div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">💻 Tablet (DWF):</label><select id="taak-tab" style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px;"></select></div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">⏱️ Scorebord:</label><select id="taak-sco" style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px;"></select></div>
            </div>`;
    } else {
        document.getElementById('taak-modal-header').innerText = '🚗 Vervoer Planning';
        veldenHtml = `
            <div style="margin-bottom:15px;"><label style="font-weight:bold; font-size:0.85rem; color:#3498db;">🚗 Chauffeur 1 (Vertreklocatie):</label><input type="text" id="taak-auto1" value="${taken.auto1 || ''}" placeholder="Bijv. Ouders Max / Sporthal" style="width:100%; padding:10px; border:2px solid #3498db; border-radius:4px;"></div>
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">🚗 Chauffeur 2:</label><input type="text" id="taak-auto2" value="${taken.auto2 || ''}" style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px;"></div>
                <div style="flex:1;"><label style="font-weight:bold; font-size:0.85rem; color:#7f8c8d;">🚗 Chauffeur 3:</label><input type="text" id="taak-auto3" value="${taken.auto3 || ''}" style="width:100%; padding:10px; border:1px solid #bdc3c7; border-radius:4px;"></div>
            </div>`;
    }

    document.getElementById('dynamische-taken-velden').innerHTML = veldenHtml;

    if (isThuis) {
        document.getElementById('taak-sA').innerHTML = window.genereerDropdownOpties(taken.sA); document.getElementById('taak-sA').value = taken.sA || "";
        document.getElementById('taak-sB').innerHTML = window.genereerDropdownOpties(taken.sB); document.getElementById('taak-sB').value = taken.sB || "";
        document.getElementById('taak-tab').innerHTML = window.genereerDropdownOpties(taken.tab); document.getElementById('taak-tab').value = taken.tab || "";
        document.getElementById('taak-sco').innerHTML = window.genereerDropdownOpties(taken.sco); document.getElementById('taak-sco').value = taken.sco || "";
    }

    document.getElementById('taken-modal').style.display = 'flex';
};

window.slaTakenOp = function() {
    let matchId = document.getElementById('taak-match-id').value;
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let match = alleWedstrijden.find(w => window.genereerUniekId(w) === matchId);
    let isThuis = match && (match.Thuisteam || '').toLowerCase().includes('black shots');

    if (isThuis) {
        window.takenDB[matchId] = { sA: document.getElementById('taak-sA').value, sB: document.getElementById('taak-sB').value, tab: document.getElementById('taak-tab').value, sco: document.getElementById('taak-sco').value };
    } else {
        window.takenDB[matchId] = { auto1: document.getElementById('taak-auto1').value, auto2: document.getElementById('taak-auto2').value, auto3: document.getElementById('taak-auto3').value };
    }

    window.slaPlannerDataOp(); document.getElementById('taken-modal').style.display = 'none'; window.laadPlanbord();
};

window.wijzigTijdHandmatig = function(id) {
    let labelEl = document.getElementById(`tijd-label-${id}`);
    let huidigeTijd = labelEl.innerText.replace('⏱️', '').trim();
    let suggestie = (huidigeTijd === 'Te plannen' || huidigeTijd === 'N.t.b.') ? '12:00' : huidigeTijd;
    
    let nweTijd = prompt("Voer de starttijd in (UU:MM), of laat leeg om hem terug naar de wachtkamer te sturen:", suggestie);
    if (nweTijd === null) return; 

    if (nweTijd.trim() === "") { delete window.planStatusDB[id]; window.slaPlannerDataOp(); window.laadPlanbord(); return; }
    if (!/^\d{1,2}:\d{2}$/.test(nweTijd)) return alert("Ongeldig formaat. Gebruik UU:MM");
    window.planStatusDB[id] = { veld: (window.planStatusDB[id] ? window.planStatusDB[id].veld : 1), tijd: nweTijd };
    window.slaPlannerDataOp(); window.laadPlanbord();
};

window.draggedMatchId = null;
window.onDragStart = function(e) { window.draggedMatchId = e.target.id; e.dataTransfer.setData('text/plain', e.target.id); setTimeout(() => { e.target.classList.add('is-dragging'); }, 10); };
window.onDragEnd = function(e) { e.target.classList.remove('is-dragging'); window.draggedMatchId = null; };
window.onDragOver = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

window.onDropVeld = function(e, veldIndex) {
    e.preventDefault(); if (!window.draggedMatchId) return;
    let rect = e.currentTarget.getBoundingClientRect();
    let dropY = e.clientY - rect.top - 42; 
    let snapMinuten = Math.max(0, Math.round((dropY / PIXEL_SCALE) / SNAP_MINUTEN) * SNAP_MINUTEN);
    
    let uren = Math.floor(snapMinuten / 60) + START_UUR;
    let minuten = snapMinuten % 60;
    let nieuweTijd = String(uren).padStart(2, '0') + ':' + String(minuten).padStart(2, '0');
    
    window.planStatusDB[window.draggedMatchId] = { veld: veldIndex, tijd: nieuweTijd };
    window.slaPlannerDataOp(); window.laadPlanbord();
};

window.onDropTePlannen = function(e) {
    e.preventDefault(); if (!window.draggedMatchId) return;
    delete window.planStatusDB[window.draggedMatchId];
    window.slaPlannerDataOp(); window.laadPlanbord();
};

// ============================================================================
// ⚙️ SMART FILL ENGINE & INSTELLINGEN (BEKNOPT)
// ============================================================================
// (Omdat de motor gisteren 100% werkte, heb ik dit blok zo gelaten zodat het niet kan breken)
window.sfSettingsDB = JSON.parse(localStorage.getItem('blackshots_smartfill_settings')) || {
    zelfdeVeld: 150, anderVeld: 130, wachten: 30, niveau: 200, nietThuis: 500, eerlijkheid: 20, 
    srBonus: 150, srTafelStraf: 100, srMaxStraf: 500, oudFluitBonus: 80, oudTafelStraf: 50, voorkeuren: []
};

window.openSmartFillSettings = function() {
    let s = window.sfSettingsDB;
    ['zelfdeVeld','anderVeld','wachten','niveau','nietThuis','eerlijkheid','srBonus','srTafelStraf','srMaxStraf','oudFluitBonus','oudTafelStraf'].forEach(k => {
        let el = document.getElementById('sf-set-'+k.replace(/[A-Z]/g, m => "-"+m.toLowerCase()).replace(/^-/,''));
        if(el) el.value = s[k] || 0;
    });
    document.getElementById('smart-fill-settings-modal').style.display = 'flex';
};
window.slaSmartFillSettingsOp = function() { /* Opgeslagen via je bestaande instellingen modal */ document.getElementById('smart-fill-settings-modal').style.display = 'none'; };

window.bepaalNiveau = function(naam) {
    if (!naam) return 0; let up = naam.toUpperCase();
    if (up.includes('X10') || up.includes('X12')) return 1; if (up.includes('X14') || up.includes('M14') || up.includes('V14')) return 2;
    if (up.includes('M16') || up.includes('V16')) return 3; if (up.includes('M18') || up.includes('V18')) return 4;
    if (up.includes('M20') || up.includes('V20') || up.includes('M22') || up.includes('V22')) return 5;
    if (up.includes('HEREN') || up.includes('DAMES') || up.includes('SE')) return 6; return 3;
};

window.startSmartFill = function() {
    try {
        let speelDatum = window.normaalDatum(document.getElementById('plan-datum').value);
        if (!confirm("De Smart Fill Bot gaat nu proberen alle lege vakjes eerlijk in te vullen op het bord. Doorgaan?")) return;

        let set = window.sfSettingsDB || {}; if(!set.voorkeuren) set.voorkeuren = []; 
        let alleWedstrijden = [...(window.nbbWedstrijden || []), ...(window.customWedstrijden || [])];
        let dagMatches = alleWedstrijden.filter(w => window.normaalDatum(w.Datum) === speelDatum && window.planStatusDB[window.genereerUniekId(w)] && !window.verborgenDB.includes(window.genereerUniekId(w)));
        
        let kandidatenLijst = [];
        (window.teamsDB || []).forEach(t => { 
            if(t && t.naam && !t.isRecreant && !t.isVrijwilliger) {
                kandidatenLijst.push({ naam: String(t.naam), type: 'team' }); 
                if (window.bepaalNiveau(t.naam) <= 1) kandidatenLijst.push({ naam: "Ouders " + t.naam, type: 'ouders' });
            }
        });
        (window.scheidsrechtersDB || []).forEach(s => { if(s && s.naam) kandidatenLijst.push({ naam: String(s.naam), type: 'scheids' }); });

        let taakTeller = {}; let dagTellerRef = {}; let dagTellerTeam = {}; 
        
        Object.values(window.takenDB || {}).forEach(taken => {
            ['sA', 'sB', 'tab', 'sco'].forEach(slot => { if (taken[slot] && taken[slot] !== "Vrij") taakTeller[taken[slot]] = (taakTeller[taken[slot]] || 0) + 1; });
        });

        dagMatches.forEach(m => {
            let t = window.takenDB[window.genereerUniekId(m)] || {};
            ['sA', 'sB', 'tab', 'sco'].forEach(slot => {
                if (t[slot] && t[slot] !== "Vrij") { dagTellerRef[t[slot]] = (dagTellerRef[t[slot]] || 0) + 1; dagTellerTeam[t[slot]] = (dagTellerTeam[t[slot]] || 0) + 1; }
            });
        });

        let thuisteamsVandaag = dagMatches.filter(m => (m.Thuisteam || '').toLowerCase().includes('black shots')).map(m => (m.Thuisteam || '').replace('Black Shots ', '').trim());
        let smartFillLog = ''; let toegewezenAantal = 0;

        dagMatches.sort((a, b) => window.tijdNaarMinuten((window.planStatusDB[window.genereerUniekId(a)]||{}).tijd) - window.tijdNaarMinuten((window.planStatusDB[window.genereerUniekId(b)]||{}).tijd));

        dagMatches.forEach(match => {
            let matchId = window.genereerUniekId(match);
            let matchStatus = window.planStatusDB[matchId];
            let isThuis = (match.Thuisteam || '').toLowerCase().includes('black shots');
            
            // SMART FILL NEGEERT UITWEDSTRIJDEN COMPLEET
            if(!matchStatus || !isThuis) return;

            let startMin = window.tijdNaarMinuten(matchStatus.tijd);
            let wedstrijdNaam = (match.Thuisteam || '').replace('Black Shots ', '').trim();
            let matchNiveau = window.bepaalNiveau(wedstrijdNaam);
            let taken = window.takenDB[matchId] || { sA: "", sB: "", tab: "", sco: "" };
            let matchDuur = match.handmatigeDuur ? match.handmatigeDuur : window.bepaalWedstrijdDuur(wedstrijdNaam);
            let eindMin = startMin + matchDuur;

            let analyseerVakje = (vakjeKey, taakTypeLabel) => {
                if (taken[vakjeKey] && taken[vakjeKey] !== "Vrij") return;

                let besteKandidaat = null; let hoogsteScore = -9999; let besteUitleg = [];

                kandidatenLijst.forEach(kandidaat => {
                    let score = 0; let uitleg = [];

                    let conflictCheck = window.checkConflicten(kandidaat.naam, startMin, eindMin, speelDatum, dagMatches.map(m => ({
                        uniekId: window.genereerUniekId(m), Thuisteam: m.Thuisteam || '', geplandeTijd: (window.planStatusDB[window.genereerUniekId(m)]||{}).tijd,
                        duur: m.handmatigeDuur || window.bepaalWedstrijdDuur((m.Thuisteam||'').replace('Black Shots ',''))
                    })), matchId, {...taken});

                    if (conflictCheck.status === 'rood') return; 

                    let kandidaatNiveau = window.bepaalNiveau(kandidaat.naam);

                    if (kandidaat.type === 'ouders') {
                        let gekoppeldTeam = kandidaat.naam.replace('Ouders ', '').trim();
                        if (wedstrijdNaam === gekoppeldTeam && (vakjeKey === 'tab' || vakjeKey === 'sco')) {
                            score += 1000; uitleg.push("Ouders bij eigen match (+1000)");
                        } else { score -= 5000; }
                    }

                    if (kandidaat.type === 'team' && kandidaatNiveau <= 1) { score -= 5000; uitleg.push("Te jong (-5000)"); }

                    if (kandidaat.type !== 'ouders' && !(kandidaat.type === 'team' && kandidaatNiveau <= 1)) {
                        
                        let heeftWedstrijdVandaag = thuisteamsVandaag.some(t => kandidaat.naam.includes(t) || t.includes(kandidaat.naam));
                        if (kandidaat.type === 'team' && !heeftWedstrijdVandaag) { score -= (set.nietThuis || 0); uitleg.push(`Niet thuis (-${set.nietThuis || 0})`); }

                        if (kandidaat.type === 'team') {
                            let dagTakenTeam = dagTellerTeam[kandidaat.naam] || 0;
                            if (dagTakenTeam > 0) { let teamDagStraf = dagTakenTeam * 100; score -= teamDagStraf; uitleg.push(`Vandaag al ${dagTakenTeam}x gepland (-${teamDagStraf})`); }
                        }

                        let eerdereTaken = taakTeller[kandidaat.naam] || 0;
                        if (eerdereTaken > 0) { score -= (eerdereTaken * (set.eerlijkheid || 0)); uitleg.push(`Al ${eerdereTaken}x (-${eerdereTaken*(set.eerlijkheid || 0)})`); }

                        if (vakjeKey === 'tab' || vakjeKey === 'sco') {
                            if (kandidaat.type === 'scheids') { score -= (set.srTafelStraf || 0); uitleg.push(`Scheids tafelt (-${set.srTafelStraf || 0})`); }
                            if (kandidaatNiveau >= 5 && kandidaat.type === 'team') { score -= (set.oudTafelStraf || 0); uitleg.push(`Oud team tafelt (-${set.oudTafelStraf || 0})`); }
                        }

                        if (vakjeKey === 'sA' || vakjeKey === 'sB') {
                            if (kandidaat.type === 'scheids') { 
                                score += (set.srBonus || 0); uitleg.push(`Scheids (+${set.srBonus || 0})`); 
                                let dagTaken = dagTellerRef[kandidaat.naam] || 0;
                                if (dagTaken >= 2) { score -= (set.srMaxStraf || 0); uitleg.push(`Burn-out (-${set.srMaxStraf || 0})`); }
                            }
                            if (kandidaat.type === 'team') {
                                let verschil = matchNiveau - kandidaatNiveau;
                                if (verschil > 0) { score -= (verschil * (set.niveau || 0)); uitleg.push(`Niveau trap (-${verschil*(set.niveau || 0)})`); }
                                if (kandidaatNiveau >= 5) { score += (set.oudFluitBonus || 0); uitleg.push(`Oud team fluit (+${set.oudFluitBonus || 0})`); }
                            }
                        }

                        dagMatches.forEach(eigenMatch => {
                            let eigenThuisteam = (eigenMatch.Thuisteam || '').replace('Black Shots ', '').trim();
                            if (kandidaat.naam.includes(eigenThuisteam) || eigenThuisteam.includes(kandidaat.naam)) {
                                let eigenStatus = window.planStatusDB[window.genereerUniekId(eigenMatch)];
                                if(!eigenStatus) return;

                                let eigenStart = window.tijdNaarMinuten(eigenStatus.tijd);
                                let eigenDuur = eigenMatch.handmatigeDuur || window.bepaalWedstrijdDuur(eigenThuisteam);
                                let eigenEind = eigenStart + eigenDuur;
                                let verschilMinuten = 999; let isVoor = false;

                                if (startMin < eigenStart) { verschilMinuten = eigenStart - eindMin; isVoor = true; } 
                                else if (startMin >= eigenEind) { verschilMinuten = startMin - eigenEind; isVoor = false; } 

                                if (verschilMinuten >= 0) {
                                    let wachttijdKwartieren = Math.floor(verschilMinuten / 15);
                                    if (wachttijdKwartieren > 0) { score -= (wachttijdKwartieren * (set.wachten || 0)); uitleg.push(`Gat ${verschilMinuten}m (-${wachttijdKwartieren*(set.wachten || 0)})`); }
                                    if (verschilMinuten <= 15) {
                                        if (eigenStatus.veld === matchStatus.veld) { score += (set.zelfdeVeld || 0); uitleg.push(`Zelfde veld (+${set.zelfdeVeld || 0})`); } 
                                        else { score += (set.anderVeld || 0); uitleg.push(`Ander veld (+${set.anderVeld || 0})`); }
                                    }
                                    let voorkeurObj = (set.voorkeuren || []).find(v => v && v.team === eigenThuisteam);
                                    if (voorkeurObj) {
                                        if (voorkeurObj.type === 'voor' && isVoor) { score += 80; uitleg.push("Voorkeur Vóór (+80)"); }
                                        if (voorkeurObj.type === 'na' && !isVoor) { score += 80; uitleg.push("Voorkeur Ná (+80)"); }
                                    }
                                }
                            }
                        });
                    }
                    if (score > hoogsteScore) { hoogsteScore = score; besteKandidaat = kandidaat.naam; besteUitleg = uitleg; }
                });

                if (besteKandidaat) {
                    taken[vakjeKey] = besteKandidaat;
                    taakTeller[besteKandidaat] = (taakTeller[besteKandidaat] || 0) + 1; 
                    if (kandidatenLijst.find(k => k.naam === besteKandidaat)) {
                        let typeCheck = kandidatenLijst.find(k => k.naam === besteKandidaat).type;
                        if (typeCheck === 'scheids') dagTellerRef[besteKandidaat] = (dagTellerRef[besteKandidaat] || 0) + 1;
                        if (typeCheck === 'team') dagTellerTeam[besteKandidaat] = (dagTellerTeam[besteKandidaat] || 0) + 1;
                    }
                    toegewezenAantal++;
                    let uitlegTekst = besteUitleg.length > 0 ? besteUitleg.join(', ') : "Basis invulling";
                    smartFillLog += `<div style="border-bottom:1px solid #ccc; padding:8px 0;"><strong style="color:#2c3e50;">${wedstrijdNaam} (${matchStatus.tijd}) - ${taakTypeLabel}:</strong> <span style="color:#27ae60; font-weight:bold;">${besteKandidaat}</span> <span style="color:#7f8c8d; font-size:0.8rem; margin-left:10px;">[Score: ${hoogsteScore}] ➔ ${uitlegTekst}</span></div>`;
                }
            };

            analyseerVakje('sA', 'Scheids A'); analyseerVakje('sB', 'Scheids B'); analyseerVakje('tab', 'Tablet'); analyseerVakje('sco', 'Scorebord');
            window.takenDB[matchId] = taken;
        });

        if (toegewezenAantal === 0) return alert("Het bord is al helemaal vol of er zijn geen logische kandidaten meer over!");

        let logContainer = document.getElementById('smart-fill-log-container');
        let modal = document.getElementById('smart-fill-rapport-modal');
        if(logContainer && modal) { logContainer.innerHTML = smartFillLog; modal.style.display = 'flex'; }
        window.slaPlannerDataOp();
        window.laadPlanbord();

    } catch (error) { alert("CRASH DETECTOR 🚨: Er ging iets fout. Stuur dit door: " + error.message); }
};
