// --- BASKETBAL_SPELERS.JS: LEDENBESTAND MET AUTOMATISCHE REC-SORTERING ONDERAAN ---

window.renderSpelers = function() {
    const tbody = document.getElementById('spelers-tabel-body');
    const teamSelect = document.getElementById('nw-speler-team');
    const filterTeam = document.getElementById('filter-team');

    if (!tbody) return;

    // Vul de dropdowns als ze nog leeg zijn
    if(teamSelect && teamSelect.options.length <= 1) {
        teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
        if(filterTeam) filterTeam.innerHTML = '<option value="all">-- Alle Teams --</option><option value="vrij">Vrije Spelers (Geen team)</option>';
        
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

    // Maak een tijdelijke kopie inclusief de originele index voor acties (bewerken/verwijderen)
    let gesorteerdeSpelers = window.spelersDB.map((speler, index) => ({ ...speler, origineleIndex: index }));

    // AUTOMATISCHE SORTERING: Wedstrijdspelers eerst, Recreanten ALTIJD onderaan!
    gesorteerdeSpelers.sort((a, b) => {
        let aRec = a.isRecreant === true || (a.clubLidmaatschap && a.clubLidmaatschap.toLowerCase().includes('rec'));
        let bRec = b.isRecreant === true || (b.clubLidmaatschap && b.clubLidmaatschap.toLowerCase().includes('rec'));
        if (aRec && !bRec) return 1;   // a is recreant, dus moet onder b
        if (!aRec && bRec) return -1;  // b is recreant, dus a moet boven b
        return a.naam.localeCompare(b.naam); // Als type gelijk is, sorteer alfabetisch op naam
    });

    gesorteerdeSpelers.forEach((speler) => {
        let isRec = speler.isRecreant === true || (speler.clubLidmaatschap && speler.clubLidmaatschap.toLowerCase().includes('rec'));

        let teamNaam = "Vrije Speler";
        let teamBadge = "background:#bdc3c7;";
        let matchTeamId = "vrij";
        
        if(speler.teamId) {
            let tObj = window.teamsDB.find(t => t.id === speler.teamId || t.naam.toLowerCase() === speler.teamId.toLowerCase());
            if(tObj) {
                teamNaam = tObj.naam;
                teamBadge = "background:var(--primary-color);";
                matchTeamId = tObj.id;
            } else {
                teamNaam = speler.teamId; 
                teamBadge = "background:#e67e22;";
                matchTeamId = speler.teamId;
            }
        }

        // --- FILTER MATCHING ---
        let passTeam = (selTeam === 'all') || (selTeam === matchTeamId);
        let passType = (selType === 'all') || (selType === 'recreant' && isRec) || (selType === 'wedstrijd' && !isRec);
        let matchText = `${speler.naam} ${speler.bondsnummer || ''} ${teamNaam} ${speler.clubLidmaatschap || ''} ${speler.bondLidmaatschap || ''}`.toLowerCase();
        let passSearch = matchText.includes(zoekterm);

        if (passTeam && passType && passSearch) {
            let recBadge = isRec ? `<span style="background:#f1c40f; color:#2c3e50; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:5px; border:1px solid #e67e22;">REC</span>` : '';

            html += `
                <tr style="border-bottom:1px solid #eee; font-size:0.95rem;">
                    <td style="padding:12px; color:#7f8c8d; font-family:monospace;">${speler.bondsnummer || 'Handmatig'}</td>
                    <td style="padding:12px; font-weight:bold; color:var(--secondary-color);">${speler.naam}</td>
                    <td style="padding:12px;">${speler.leeftijd || '-'} jr</td>
                    <td style="padding:12px; font-weight:bold; color:#d35400;">${speler.rugnummer ? `#${speler.rugnummer}` : '-'}</td>
                    <td style="padding:12px;">
                        <span style="${teamBadge} color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:bold;">${teamNaam}</span>${recBadge}
                    </td>
                    <td style="padding:12px; color:#7f8c8d; font-size:0.85rem;">${speler.lidSinds || '-'}</td>
                    <td style="padding:12px; font-size:0.85rem; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <div style="font-weight:bold; color:#2c3e50;">${speler.clubLidmaatschap || '-'}</div>
                        <div style="color:#7f8c8d; font-style:italic;">${speler.bondLidmaatschap || '-'}</div>
                    </td>
                    <td style="padding:12px;">
                        <button onclick="window.bewerkSpeler(${speler.origineleIndex})" style="background:#f39c12; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem; margin-right:5px;">✏️</button>
                        <button onclick="window.verwijderSpeler(${speler.origineleIndex})" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">X</button>
                    </td>
                </tr>
            `;
        }
    });

    if(html === '') html = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#7f8c8d;">Geen spelers gevonden voor dit filter.</td></tr>';
    tbody.innerHTML = html;
};

// --- BEWERK SPELER ---
window.bewerkSpeler = function(index) {
    let speler = window.spelersDB[index];
    if(!speler) return;
    
    let nwNaam = prompt("Pas de naam aan:", speler.naam);
    if (nwNaam === null) return;
    
    let nwLeeftijd = prompt("Pas de leeftijd aan:", speler.leeftijd || "");
    if (nwLeeftijd === null) return;
    
    let nwRugnr = prompt("Pas het rugnummer aan:", speler.rugnummer || "");
    if (nwRugnr === null) return;

    let teamOpties = window.teamsDB.map(t => t.naam).join(", ");
    let nwTeam = prompt(`Koppel aan een team (Kies uit: ${teamOpties})\nLaat leeg voor 'Vrije Speler':`, speler.teamId);
    if (nwTeam === null) return;

    let isRecPrompt = confirm("Is deze speler een Recreant (speelt geen wedstrijden)?\nKlik 'OK' voor JA, 'Annuleren' voor NEE.");

    let matchedTeam = window.teamsDB.find(t => t.naam.toLowerCase() === nwTeam.trim().toLowerCase());
    let finalTeamId = matchedTeam ? matchedTeam.id : nwTeam.trim();

    speler.naam = nwNaam.trim() || speler.naam;
    speler.leeftijd = nwLeeftijd.trim();
    speler.rugnummer = nwRugnr.trim();
    speler.teamId = finalTeamId;
    speler.isRecreant = isRecPrompt;

    localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
    window.renderSpelers();
};

// --- HANDMATIG TOEVOEGEN ---
window.voegSpelerToe = function() {
    let naam = document.getElementById('nw-speler-naam').value.trim();
    let leeftijd = document.getElementById('nw-speler-leeftijd').value;
    let rugnr = document.getElementById('nw-speler-rugnr').value;
    let teamId = document.getElementById('nw-speler-team').value;
    let isRec = document.getElementById('nw-speler-rec').checked;

    if(naam) {
        window.spelersDB.push({
            id: 'p_' + Date.now(),
            bondsnummer: '',
            naam: naam,
            leeftijd: leeftijd,
            rugnummer: rugnr,
            teamId: teamId,
            isRecreant: isRec,
            lidSinds: new Date().toLocaleDateString('nl-NL'),
            clubLidmaatschap: isRec ? 'Recreant (Handmatig)' : 'Spelend lid (Handmatig)',
            bondLidmaatschap: isRec ? 'Niet-spelend' : 'Wedstrijdspelend'
        });
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        
        document.getElementById('nw-speler-naam').value = '';
        document.getElementById('nw-speler-leeftijd').value = '';
        document.getElementById('nw-speler-rugnr').value = '';
        document.getElementById('nw-speler-rec').checked = false;
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

// --- DE SLIMME BOND CSV PARSER ---
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
            
            let berekendeLeeftijd = "-";
            let gebDatumStr = row[idxGeboorte] ? row[idxGeboorte].trim() : "";
            if (gebDatumStr) {
                let parts = gebDatumStr.split('-');
                if (parts.length === 3) {
                    let gebDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    let vandaag = new Date();
                    berekendeLeeftijd = vandaag.getFullYear() - gebDate.getFullYear();
                    let m = vandaag.getMonth() - gebDate.getMonth();
                    if (m < 0 || (m === 0 && vandaag.getDate() < gebDate.getDate())) berekendeLeeftijd--;
                }
            }

            let ruwTeam = idxTeam !== -1 && row[idxTeam] ? row[idxTeam].trim() : "";
            let nwClubLid = idxClubLid !== -1 && row[idxClubLid] ? row[idxClubLid].trim() : "";
            let nwBondLid = idxBondLid !== -1 && row[idxBondLid] ? row[idxBondLid].trim() : "";
            let nwRugnummer = idxRugnr !== -1 && row[idxRugnr] ? row[idxRugnr].trim() : "";

            let isRec = nwClubLid.toLowerCase().includes('rec') || ruwTeam.toLowerCase().includes('rec');
            let opgeschoondTeam = ruwTeam.replace(/rec\s*-?\s*/i, '').replace(/recreanten\s*-?\s*/i, '').trim();

            let matchTeamObj = window.teamsDB.find(t => 
                t.id.toLowerCase() === opgeschoondTeam.toLowerCase() || 
                t.naam.toLowerCase().includes(opgeschoondTeam.toLowerCase())
            );
            let finalTeamId = matchTeamObj ? matchTeamObj.id : opgeschoondTeam;

            let bestaandeSpeler = window.spelersDB.find(s => 
                (bondsnummer !== "" && s.bondsnummer === bondsnummer) || 
                (bondsnummer === "" && s.naam === volledigeNaam)
            );

            if (bestaandeSpeler) {
                let wijzigingen = [];
                if (berekendeLeeftijd !== "-" && bestaandeSpeler.leeftijd !== berekendeLeeftijd) {
                    bestaandeSpeler.leeftijd = berekendeLeeftijd; wijzigingen.push("leeftijd");
                }
                if (finalTeamId !== "" && bestaandeSpeler.teamId !== finalTeamId) {
                    bestaandeSpeler.teamId = finalTeamId; wijzigingen.push(`team (${finalTeamId})`);
                }
                if (isRec !== bestaandeSpeler.isRecreant) {
                    bestaandeSpeler.isRecreant = isRec; wijzigingen.push("recreant-status");
                }
                if (nwClubLid !== "" && bestaandeSpeler.clubLidmaatschap !== nwClubLid) {
                    bestaandeSpeler.clubLidmaatschap = nwClubLid;
                }
                if (nwBondLid !== "" && bestaandeSpeler.bondLidmaatschap !== nwBondLid) {
                    bestaandeSpeler.bondLidmaatschap = nwBondLid;
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
                    leeftijd: berekendeLeeftijd,
                    rugnummer: nwRugnummer,
                    teamId: finalTeamId,
                    isRecreant: isRec,
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