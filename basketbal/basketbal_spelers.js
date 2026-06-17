// --- BASKETBAL_SPELERS.JS: MET CUSTOM TEAM REGELS ---

window.getCanonicalTeam = function(identifier) {
    if (!identifier) return null;
    let zoekTerm = String(identifier).toLowerCase().trim();
    if (!Array.isArray(window.teamsDB)) return null;

    return window.teamsDB.find(team => {
        let tId = String(team.id || '').toLowerCase().trim();
        let tNaam = String(team.naam || '').toLowerCase().trim();
        if (zoekTerm === tId || zoekTerm === tNaam) return true;
        if (team.aliassen) {
            let aliasArray = team.aliassen.toLowerCase().split(',').map(a => a.trim()).filter(Boolean);
            if (aliasArray.includes(zoekTerm)) return true;
        }
        return false;
    });
};

// DE VERNIEUWDE SLIMME CHECKER
window.checkNBBTeOud = function(geboorteDatum, teamNaam, teamObj) {
    if (!geboorteDatum || !teamNaam || geboorteDatum === "-") return false; 
    let gebJaar = parseInt(geboorteDatum.split('-')[0]); 
    
    // 1. Controleer of het team een AANGEPASTE regel heeft ingesteld
    if (teamObj && teamObj.leeftijdRegel && teamObj.leeftijdRegel.trim() !== "") {
        let regel = teamObj.leeftijdRegel.trim().replace(/\s+/g, ''); // Verwijder spaties
        
        if (regel.startsWith('-')) {
            // Bijv: -2019 (Iedereen jonger, dus geboren in 2019, 2020, 2021 etc)
            let grens = parseInt(regel.substring(1));
            return gebJaar < grens; // Als je geboren bent in 2018 (dus < 2019), vlag je als TE OUD (true)
            
        } else if (regel.startsWith('+')) {
            // Bijv: +2004 (Iedereen ouder, dus geboren in 2004, 2003, 1999 etc)
            let grens = parseInt(regel.substring(1));
            return gebJaar > grens; // Als je geboren bent in 2005 (dus > 2004), vlag je als TE JONG (true)
            
        } else {
            // Bijv: 2013,2014 (Specifieke lijst)
            let toegestaan = regel.split(',').map(y => parseInt(y));
            return !toegestaan.includes(gebJaar); // Als het jaar er niet in staat, vlaggen (true)
        }
    }
    
    // 2. Geen aangepaste regel? Gebruik de standaard NBB Formule
    let match = teamNaam.match(/(?:U|X|M|V|J)(\d{2})/i); 
    if (!match) return false; 
    
    let categorie = parseInt(match[1]); 
    
    // --- NIEUW: Lees het NBB Peiljaar uit de centrale instellingen ---
    let instellingen = JSON.parse(localStorage.getItem('blackshots_instellingen')) || {};
    let actiefSeizoen = instellingen.seizoen || "2025-2026"; 
    let startJaarNBB = parseInt(actiefSeizoen.split('-')[0]); 
    
    // NBB Peiljaar is altijd het tweede jaar van het seizoen (bijv. 2026 voor seizoen 2025-2026)
    let peilJaar = startJaarNBB + 1; 
    
    let minGeboorteJaar = peilJaar - categorie; 
    
    return gebJaar < minGeboorteJaar;
};

window.renderSpelers = function() {
    const tbody = document.getElementById('spelers-tabel-body');
    const teamSelect = document.getElementById('nw-speler-team');
    const filterTeam = document.getElementById('filter-team');

    if (!tbody) return;

    if(teamSelect && teamSelect.options.length <= 1) {
        teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
        if(filterTeam) filterTeam.innerHTML = '<option value="all">-- Toon Alle Spelers --</option><option value="vrij">Zonder Team (Zwervers)</option><option value="aliasfout">⚠️ Alias Fouten (Onbekende Code)</option>';
        
        if (Array.isArray(window.teamsDB)) {
            window.teamsDB.forEach(t => {
                teamSelect.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
                if(filterTeam) filterTeam.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
            });
        }
    }

    let zoekterm = (document.getElementById('zoek-speler') ? document.getElementById('zoek-speler').value.toLowerCase() : "");
    let selTeam = filterTeam ? filterTeam.value : 'all';
    let selType = document.getElementById('filter-type') ? document.getElementById('filter-type').value : 'all';

    let html = '';
    let gesorteerdeSpelers = window.spelersDB.map((speler, index) => ({ ...speler, origineleIndex: index }));

    gesorteerdeSpelers.sort((a, b) => {
        if (a.isProeflid && !b.isProeflid) return -1;
        if (!a.isProeflid && b.isProeflid) return 1;
        
        let aRec = a.isRecreant === true;
        let bRec = b.isRecreant === true;
        if (aRec && !bRec) return 1;   
        if (!aRec && bRec) return -1;  
        return (a.naam || '').localeCompare(b.naam || ''); 
    });

    gesorteerdeSpelers.forEach((speler) => {
        let isRec = speler.isRecreant === true;
        let isProef = speler.isProeflid === true;

        let teamNaam = "Vrije Speler";
        let teamBadge = "background:#bdc3c7; color:white;";
        let matchTeamId = "vrij";
        let isAliasFout = false;
        let actueelTeamObj = null;
        
        if(speler.teamId) {
            actueelTeamObj = window.getCanonicalTeam(speler.teamId);
            if(actueelTeamObj) {
                teamNaam = actueelTeamObj.naam;
                teamBadge = `background:${actueelTeamObj.kleur || 'var(--primary-color)'}; color:white; border: 1px solid rgba(0,0,0,0.1);`;
                matchTeamId = actueelTeamObj.id;
            } else {
                teamNaam = speler.teamId; 
                teamBadge = "background:#e74c3c; color:white; font-weight:bold;";
                matchTeamId = "aliasfout";
                isAliasFout = true;
            }
        }

        let passTeam = false;
        if (selTeam === 'all') passTeam = true;
        else if (selTeam === 'vrij' && matchTeamId === 'vrij') passTeam = true;
        else if (selTeam === 'aliasfout' && isAliasFout) passTeam = true;
        else if (selTeam === matchTeamId) passTeam = true;

        let passType = false;
        if (selType === 'all') passType = true;
        else if (selType === 'recreant' && isRec) passType = true;
        else if (selType === 'wedstrijd' && !isRec && !isProef) passType = true;
        else if (selType === 'proef' && isProef) passType = true;

        let matchText = `${speler.naam} ${speler.bondsnummer || ''} ${teamNaam}`.toLowerCase();
        let passSearch = matchText.includes(zoekterm);

        if (passTeam && passType && passSearch) {
            let recBadge = isRec ? `<span style="background:#f1c40f; color:#2c3e50; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:5px; border:1px solid #e67e22;">REC</span>` : '';
            let proefBadge = isProef ? `<span style="background:#2ecc71; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:5px;">🟢 PROEF</span>` : '';
            
            let leeftijdWaarschuwing = '';
            // GEEF HET TEAM OBJECT MEE AAN DE CHECKER!
            if (window.checkNBBTeOud(speler.geboorteDatum, teamNaam, actueelTeamObj)) {
                if (speler.dispensatie) {
                    leeftijdWaarschuwing = `<button onclick="window.toggleDispensatie('${speler.id}')" title="Dispensatie OK. Klik om in te trekken." style="background:none; border:none; cursor:pointer; padding:0; margin-left:5px;">✅</button>`;
                } else {
                    leeftijdWaarschuwing = `<button onclick="window.toggleDispensatie('${speler.id}')" title="Let op: Speler voldoet niet aan de leeftijdsregel voor ${teamNaam}! Klik om dispensatie te geven." style="background:none; border:none; cursor:pointer; padding:0; margin-left:5px; font-size:1.2rem;">⚠️</button>`;
                }
            }

            let kaderBadge = speler.kaderRol ? `<div style="color:#8e44ad; font-size:0.8rem; font-weight:bold; margin-top:2px;">⭐ ${speler.kaderRol}</div>` : '';

            let weergaveLeeftijd = '-';
            if (speler.geboorteDatum && speler.geboorteDatum !== '-') {
                let gebDate = new Date(speler.geboorteDatum);
                let vandaag = new Date();
                let berekendeLeeftijd = vandaag.getFullYear() - gebDate.getFullYear();
                let m = vandaag.getMonth() - gebDate.getMonth();
                if (m < 0 || (m === 0 && vandaag.getDate() < gebDate.getDate())) {
                    berekendeLeeftijd--; 
                }
                
                let mooieDatum = gebDate.toLocaleDateString('nl-NL');
                weergaveLeeftijd = `<strong>${berekendeLeeftijd} jr</strong> <span style="font-size:0.75rem; color:#7f8c8d; display:block;">(${mooieDatum})</span>`;
            }

            let maakLidKnop = isProef ? `<button onclick="window.maakOfficieelLid(${speler.origineleIndex})" style="background:#27ae60; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem; margin-right:5px;" title="Zet om naar officieel lid">✔️ Lid Maken</button>` : '';

            html += `
                <tr style="border-bottom:1px solid #eee; font-size:0.95rem; ${isProef ? 'background:#f0fbf4;' : ''}">
                    <td style="padding:12px; color:#7f8c8d; font-family:monospace;">${speler.bondsnummer || 'N.n.b.'}</td>
                    <td style="padding:12px; font-weight:bold; color:var(--secondary-color);">
                        ${speler.naam} ${proefBadge}
                        ${kaderBadge}
                    </td>
                    <td style="padding:12px;">${weergaveLeeftijd}</td>
                    <td style="padding:12px; font-weight:bold; color:#d35400;">${speler.rugnummer ? `#${speler.rugnummer}` : '-'}</td>
                    <td style="padding:12px; white-space:nowrap;">
                        <span style="${teamBadge} padding:4px 8px; border-radius:4px; font-size:0.85rem;">${teamNaam}</span>${leeftijdWaarschuwing}${recBadge}
                    </td>
                    <td style="padding:12px; color:#7f8c8d; font-size:0.85rem;">${speler.lidSinds || '-'}</td>
                    <td style="padding:12px; font-size:0.85rem; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <div style="font-weight:bold; color:#2c3e50;" title="${speler.clubLidmaatschap || '-'}">🏠 ${speler.clubLidmaatschap || '-'}</div>
                        <div style="color:#7f8c8d; font-style:italic;" title="${speler.bondLidmaatschap || '-'}">🏀 ${speler.bondLidmaatschap || '-'}</div>
                    </td>
                    <td style="padding:12px; white-space:nowrap;">
                        ${maakLidKnop}
                        <button onclick="window.openBewerkSpelerModal(${speler.origineleIndex})" style="background:#f39c12; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem; margin-right:5px;">✏️</button>
                        <button onclick="window.verwijderSpeler(${speler.origineleIndex})" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">X</button>
                    </td>
                </tr>
            `;
        }
    });

    if(html === '') html = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#7f8c8d;">Geen spelers gevonden voor dit filter.</td></tr>';
    tbody.innerHTML = html;
};

// --- NIEUWE FUNCTIES VOOR TEAM LEEFTIJD REGELS MODAL ---
window.openLeeftijdRegelsModal = function() {
    let lijstDiv = document.getElementById('leeftijd-regels-lijst');
    lijstDiv.innerHTML = '';

    if (!window.teamsDB || window.teamsDB.length === 0) {
        lijstDiv.innerHTML = '<div style="color:#7f8c8d; font-style:italic;">Geen teams gevonden. Maak eerst teams aan op de Teampagina.</div>';
    } else {
        window.teamsDB.forEach(team => {
            let badgeKleur = team.kleur || '#3498db';
            let huidigeRegel = team.leeftijdRegel || "";
            
            lijstDiv.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8f9fa; padding:10px 15px; border-radius:6px; border:1px solid #ddd; border-left:4px solid ${badgeKleur};">
                    <div style="font-weight:bold; color:#2c3e50; min-width:120px;">${team.naam}</div>
                    <input type="text" class="team-regel-input" data-teamid="${team.id}" value="${huidigeRegel}" placeholder="Standaard NBB (Laat leeg)" style="flex:1; padding:8px; border:1px solid #bdc3c7; border-radius:4px; font-family:monospace; margin-left:10px; max-width:250px;">
                </div>
            `;
        });
    }

    document.getElementById('leeftijd-regels-modal').style.display = 'flex';
};

window.sluitLeeftijdRegelsModal = function() {
    document.getElementById('leeftijd-regels-modal').style.display = 'none';
};

window.slaLeeftijdRegelsOp = function() {
    let inputs = document.querySelectorAll('.team-regel-input');
    inputs.forEach(input => {
        let tId = input.getAttribute('data-teamid');
        let regel = input.value.trim();
        
        // Zoek het team in de database en update het
        let team = window.teamsDB.find(t => t.id === tId);
        if (team) {
            team.leeftijdRegel = regel;
        }
    });

    // Opslaan in localstorage
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    
    window.sluitLeeftijdRegelsModal();
    window.renderSpelers(); // Tabel herladen om de nieuwe regels toe te passen
    
    alert("✅ Teamregels opgeslagen! De waarschuwingsicoontjes (⚠️) zijn direct bijgewerkt.");
};

// --- BESTAANDE MODAL / ACTIE FUNCTIES ---
window.maakOfficieelLid = function(index) {
    let speler = window.spelersDB[index];
    if(!speler) return;
    
    if(confirm(`Weet je zeker dat je ${speler.naam} officieel lid wilt maken?`)) {
        speler.isProeflid = false;
        speler.clubLidmaatschap = speler.isRecreant ? 'Recreant (Handmatig)' : 'Spelend lid (Handmatig)';
        speler.lidSinds = new Date().toLocaleDateString('nl-NL');
        
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        window.renderSpelers();
        alert(`${speler.naam} is nu een officieel lid!`);
    }
};

window.openBewerkSpelerModal = function(index) {
    let speler = window.spelersDB[index];
    if(!speler) return;

    document.getElementById('bewerk-speler-index').value = index;
    document.getElementById('bewerk-speler-naam').value = speler.naam || "";
    document.getElementById('bewerk-speler-gebdatum').value = (speler.geboorteDatum && speler.geboorteDatum !== '-') ? speler.geboorteDatum : "";
    document.getElementById('bewerk-speler-rugnr').value = speler.rugnummer || "";
    document.getElementById('bewerk-speler-rol').value = speler.kaderRol || "";
    document.getElementById('bewerk-speler-rec').checked = speler.isRecreant === true;
    
    let proefCheck = document.getElementById('bewerk-speler-proef');
    if(proefCheck) proefCheck.checked = speler.isProeflid === true;

    document.getElementById('bewerk-speler-clublid').value = speler.clubLidmaatschap || "";
    document.getElementById('bewerk-speler-bondlid').value = speler.bondLidmaatschap || "";

    let teamSelect = document.getElementById('bewerk-speler-team');
    teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
    if (Array.isArray(window.teamsDB)) {
        window.teamsDB.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
        });
    }
    
    let matchedTeam = window.getCanonicalTeam(speler.teamId);
    teamSelect.value = matchedTeam ? matchedTeam.id : "";

    document.getElementById('bewerk-speler-modal').style.display = 'flex';
};

window.sluitBewerkSpelerModal = function() {
    document.getElementById('bewerk-speler-modal').style.display = 'none';
};

window.slaBewerkteSpelerOp = function() {
    let index = document.getElementById('bewerk-speler-index').value;
    let speler = window.spelersDB[index];
    if(!speler) return;

    let nwNaam = document.getElementById('bewerk-speler-naam').value.trim();
    if (!nwNaam) return alert("Een naam is verplicht!");

    speler.naam = nwNaam;
    speler.geboorteDatum = document.getElementById('bewerk-speler-gebdatum').value || "-";
    speler.rugnummer = document.getElementById('bewerk-speler-rugnr').value;
    speler.kaderRol = document.getElementById('bewerk-speler-rol').value.trim();
    speler.teamId = document.getElementById('bewerk-speler-team').value;
    speler.isRecreant = document.getElementById('bewerk-speler-rec').checked;
    
    let proefCheck = document.getElementById('bewerk-speler-proef');
    if(proefCheck) speler.isProeflid = proefCheck.checked;
    
    speler.clubLidmaatschap = document.getElementById('bewerk-speler-clublid').value.trim() || "-";
    speler.bondLidmaatschap = document.getElementById('bewerk-speler-bondlid').value.trim() || "-";

    localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
    window.sluitBewerkSpelerModal();
    window.renderSpelers();
};
window.voegSpelerToe = function() {
    let naam = document.getElementById('nw-speler-naam').value.trim();
    let gebDatum = document.getElementById('nw-speler-gebdatum').value;
    let rugnr = document.getElementById('nw-speler-rugnr').value;
    
    // FIX: Controleer of het rol-veld bestaat, anders is het gewoon leeg
    let rolVeld = document.getElementById('nw-speler-rol');
    let rol = rolVeld ? rolVeld.value.trim() : "";
    
    let teamId = document.getElementById('nw-speler-team').value;
    
    let isRec = document.getElementById('nw-speler-rec') ? document.getElementById('nw-speler-rec').checked : false;
    let isProef = document.getElementById('nw-speler-proef') ? document.getElementById('nw-speler-proef').checked : false;

    if(naam) {
        window.spelersDB.push({
            id: 'p_' + Date.now(),
            bondsnummer: '',
            naam: naam,
            geboorteDatum: gebDatum || '-',
            rugnummer: rugnr,
            kaderRol: rol,
            teamId: teamId,
            isRecreant: isRec,
            isProeflid: isProef,
            dispensatie: false,
            lidSinds: isProef ? 'Proefperiode' : new Date().toLocaleDateString('nl-NL'),
            clubLidmaatschap: isProef ? 'Proeftrainer' : (isRec ? 'Recreant (Handmatig)' : 'Spelend lid (Handmatig)'),
            bondLidmaatschap: 'Niet-spelend'
        });
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        
        document.getElementById('nw-speler-naam').value = '';
        document.getElementById('nw-speler-gebdatum').value = '';
        document.getElementById('nw-speler-rugnr').value = '';
        if(rolVeld) rolVeld.value = '';
        if(document.getElementById('nw-speler-rec')) document.getElementById('nw-speler-rec').checked = false;
        if(document.getElementById('nw-speler-proef')) document.getElementById('nw-speler-proef').checked = true;
        window.renderSpelers();
    } else {
        alert("Vul minimaal een naam in!");
    }
};

window.verwijderSpeler = function(index) {
    if(confirm("Weet je zeker dat je deze speler wilt wissen?")) {
        window.spelersDB.splice(index, 1);
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        window.renderSpelers();
    }
};

window.importeerBondCSV = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return alert("Het CSV bestand is leeg!");

        const headers = lines[0].split(',');
        const idxBondsnummer = headers.indexOf('Bondsnummer');
        const idxClubLid = headers.indexOf('Club lidmaatschap naam');
        const idxBondLid = headers.indexOf('Bond lidmaatschapstype');
        const idxLidSinds = headers.indexOf('Lid sinds');
        const idxVoornaam = headers.indexOf('Voornaam');
        const idxTussen = headers.indexOf('Tussenvoegsel');
        const idxAchternaam = headers.indexOf('Achternaam');
        const idxGeboorte = headers.indexOf('Geboortedatum');
        const idxRugnr = headers.indexOf('_Rug nummer');
        const idxTeam = headers.indexOf('_Team');

        if (idxVoornaam === -1 || idxAchternaam === -1) return alert("Fout: CSV formaat komt niet overeen met Sportlink.");

        let rapportToegevoegd = [];
        let rapportAangepast = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            let row = lines[i].split(',');
            if (row.length < headers.length) continue;

            let voornaam = row[idxVoornaam] ? row[idxVoornaam].trim() : "";
            let tussen = row[idxTussen] ? row[idxTussen].trim() : "";
            let achternaam = row[idxAchternaam] ? row[idxAchternaam].trim() : "";
            let volledigeNaam = `${voornaam} ${tussen ? tussen + ' ' : ''}${achternaam}`.replace(/\s+/g, ' ').trim();
            if (!volledigeNaam) continue;

            let bondsnummer = row[idxBondsnummer] ? row[idxBondsnummer].trim() : "";
            
            let gebDatumStr = "-";
            let gebDatumRuweStr = row[idxGeboorte] ? row[idxGeboorte].trim() : "";
            if (gebDatumRuweStr) {
                let parts = gebDatumRuweStr.split('-');
                if (parts.length === 3) {
                    gebDatumStr = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                }
            }

            let ruwTeam = idxTeam !== -1 && row[idxTeam] ? row[idxTeam].trim() : "";
            let nwClubLid = idxClubLid !== -1 && row[idxClubLid] ? row[idxClubLid].trim() : "";
            let nwBondLid = idxBondLid !== -1 && row[idxBondLid] ? row[idxBondLid].trim() : "";
            let nwRugnummer = idxRugnr !== -1 && row[idxRugnr] ? row[idxRugnr].trim() : "";

            let isRec = nwClubLid.toLowerCase().includes('rec') || ruwTeam.toLowerCase().includes('rec');
            let opgeschoondTeam = ruwTeam.replace(/rec\s*-?\s*/i, '').replace(/recreanten\s*-?\s*/i, '').trim();

            let matchTeamObj = window.getCanonicalTeam(opgeschoondTeam);
            let finalTeamId = matchTeamObj ? matchTeamObj.id : opgeschoondTeam;

            let bestaandeSpeler = window.spelersDB.find(s => 
                (bondsnummer !== "" && s.bondsnummer === bondsnummer) || 
                (bondsnummer === "" && s.naam === volledigeNaam)
            );

            if (bestaandeSpeler) {
                let wijzigingen = [];
                
                if (bestaandeSpeler.isProeflid) {
                    bestaandeSpeler.isProeflid = false;
                    wijzigingen.push("status naar officieel lid");
                }
                
                if (gebDatumStr !== "-" && bestaandeSpeler.geboorteDatum !== gebDatumStr) {
                    bestaandeSpeler.geboorteDatum = gebDatumStr; wijzigingen.push("geboortedatum");
                }
                if (finalTeamId !== "" && bestaandeSpeler.teamId !== finalTeamId) {
                    bestaandeSpeler.teamId = finalTeamId; wijzigingen.push(`team (${finalTeamId})`);
                }
                if (isRec !== bestaandeSpeler.isRecreant) {
                    bestaandeSpeler.isRecreant = isRec; wijzigingen.push("recreant-status");
                }
                if (nwClubLid !== "" && bestaandeSpeler.clubLidmaatschap !== nwClubLid) {
                    bestaandeSpeler.clubLidmaatschap = nwClubLid; wijzigingen.push("clubcontributie");
                }
                if (nwBondLid !== "" && bestaandeSpeler.bondLidmaatschap !== nwBondLid) {
                    bestaandeSpeler.bondLidmaatschap = nwBondLid; wijzigingen.push("bondcontributie");
                }
                if (nwRugnummer !== "" && bestaandeSpeler.rugnummer !== nwRugnummer) {
                    bestaandeSpeler.rugnummer = nwRugnummer; wijzigingen.push(`rugnummer (#${nwRugnummer})`);
                }

                if (wijzigingen.length > 0) {
                    rapportAangepast.push(`- ${volledigeNaam} (${wijzigingen.join(', ')})`);
                }

            } else {
                window.spelersDB.push({
                    id: 'p_bond_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                    bondsnummer: bondsnummer,
                    naam: volledigeNaam,
                    geboorteDatum: gebDatumStr,
                    rugnummer: nwRugnummer,
                    teamId: finalTeamId,
                    isRecreant: isRec,
                    isProeflid: false, 
                    dispensatie: false, 
                    kaderRol: "", 
                    lidSinds: idxLidSinds !== -1 && row[idxLidSinds] ? row[idxLidSinds].trim() : "",
                    clubLidmaatschap: nwClubLid,
                    bondLidmaatschap: nwBondLid
                });
                rapportToegevoegd.push(`- ${volledigeNaam}`);
            }
        }

        if (rapportToegevoegd.length > 0 || rapportAangepast.length > 0) {
            localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
            window.renderSpelers();

            let eindBericht = "✅ Import Succesvol!\n\n";
            if (rapportToegevoegd.length > 0) eindBericht += `Nieuw (${rapportToegevoegd.length}):\n${rapportToegevoegd.join('\n')}\n\n`;
            if (rapportAangepast.length > 0) eindBericht += `Geüpdatet (${rapportAangepast.length}):\n${rapportAangepast.join('\n')}`;
            alert(eindBericht);
        } else {
            alert("✅ Import voltooid. Er waren geen nieuwe wijzigingen in de bondsexport.");
        }
        
        event.target.value = ''; 
    };
    reader.readAsText(file);
};