// --- BASKETBAL_SPELERS.JS: LOGICA VOOR LEDENBESTAND & CSV IMPORT ---

window.renderSpelers = function() {
    const tbody = document.getElementById('spelers-tabel-body');
    const teamSelect = document.getElementById('nw-speler-team');
    if (!tbody) return;

    if(teamSelect && teamSelect.options.length <= 1) {
        teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
        window.teamsDB.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
        });
    }

    let zoekterm = (document.getElementById('zoek-speler') ? document.getElementById('zoek-speler').value.toLowerCase() : "");
    let html = '';

    window.spelersDB.forEach((speler, index) => {
        let teamNaam = "Vrije Speler";
        let teamBadge = "background:#bdc3c7;";
        
        if(speler.teamId) {
            let tObj = window.teamsDB.find(t => t.id === speler.teamId || t.naam.toLowerCase() === speler.teamId.toLowerCase());
            if(tObj) {
                teamNaam = tObj.naam;
                teamBadge = "background:var(--primary-color);";
            } else {
                teamNaam = speler.teamId; 
                teamBadge = "background:#e67e22;";
            }
        }

        let matchText = `${speler.naam} ${speler.bondsnummer || ''} ${teamNaam} ${speler.clubLidmaatschap || ''} ${speler.bondLidmaatschap || ''}`.toLowerCase();

        if (matchText.includes(zoekterm)) {
            html += `
                <tr style="border-bottom:1px solid #eee; font-size:0.95rem;">
                    <td style="padding:12px; color:#7f8c8d; font-family:monospace;">${speler.bondsnummer || 'Handmatig'}</td>
                    <td style="padding:12px; font-weight:bold; color:var(--secondary-color);">${speler.naam}</td>
                    <td style="padding:12px;">${speler.leeftijd || '-'} jaar</td>
                    <td style="padding:12px; font-weight:bold; color:#d35400;">${speler.rugnummer ? `#${speler.rugnummer}` : '-'}</td>
                    <td style="padding:12px;">
                        <span style="${teamBadge} color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:bold;">${teamNaam}</span>
                    </td>
                    <td style="padding:12px; color:#7f8c8d;">${speler.lidSinds || '-'}</td>
                    <td style="padding:12px; font-size:0.85rem; max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <div style="font-weight:bold; color:#2c3e50;">${speler.clubLidmaatschap || '-'}</div>
                        <div style="color:#7f8c8d; font-style:italic;">${speler.bondLidmaatschap || '-'}</div>
                    </td>
                    <td style="padding:12px;">
                        <button onclick="window.bewerkSpeler(${index})" style="background:#f39c12; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem; margin-right:5px;">✏️</button>
                        <button onclick="window.verwijderSpeler(${index})" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">X</button>
                    </td>
                </tr>
            `;
        }
    });

    if(html === '') html = '<tr><td colspan="8" style="padding:20px; text-align:center; color:#7f8c8d;">Geen spelers gevonden.</td></tr>';
    tbody.innerHTML = html;
};

// --- NIEUW: BEWERK SPELER ---
window.bewerkSpeler = function(index) {
    let speler = window.spelersDB[index];
    
    let nwNaam = prompt("Pas de naam aan:", speler.naam);
    if (nwNaam === null) return;
    
    let nwLeeftijd = prompt("Pas de leeftijd aan:", speler.leeftijd || "");
    if (nwLeeftijd === null) return;
    
    let nwRugnr = prompt("Pas het rugnummer aan:", speler.rugnummer || "");
    if (nwRugnr === null) return;

    let teamOpties = window.teamsDB.map(t => t.naam).join(", ");
    let nwTeam = prompt(`Koppel aan een teamnaam (Kies uit: ${teamOpties})\nOf laat leeg om als Vrije Speler in te stellen:`, speler.teamId);
    if (nwTeam === null) return;

    // Converteer de ingevoerde teamnaam (bijv "X12-1") naar het juiste ID ("x121")
    let matchedTeam = window.teamsDB.find(t => t.naam.toLowerCase() === nwTeam.trim().toLowerCase());
    let finalTeamId = matchedTeam ? matchedTeam.id : nwTeam.trim();

    speler.naam = nwNaam.trim() || speler.naam;
    speler.leeftijd = nwLeeftijd.trim();
    speler.rugnummer = nwRugnr.trim();
    speler.teamId = finalTeamId;

    localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
    window.renderSpelers();
};

// --- HANDMATIG TOEVOEGEN ---
window.voegSpelerToe = function() {
    let naam = document.getElementById('nw-speler-naam').value.trim();
    let leeftijd = document.getElementById('nw-speler-leeftijd').value;
    let rugnr = document.getElementById('nw-speler-rugnr').value;
    let teamId = document.getElementById('nw-speler-team').value;

    if(naam) {
        window.spelersDB.push({
            id: 'p_' + Date.now(),
            bondsnummer: '',
            naam: naam,
            leeftijd: leeftijd,
            rugnummer: rugnr,
            teamId: teamId,
            lidSinds: new Date().toLocaleDateString('nl-NL'),
            clubLidmaatschap: 'Spelend lid (Handmatig)',
            bondLidmaatschap: 'Wedstrijdspelend'
        });
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        
        document.getElementById('nw-speler-naam').value = '';
        document.getElementById('nw-speler-leeftijd').value = '';
        document.getElementById('nw-speler-rugnr').value = '';
        window.renderSpelers();
    } else {
        alert("Vul minimaal een naam in!");
    }
};

window.verwijderSpeler = function(index) {
    if(confirm("Weet je zeker dat je deze speler permanent wilt verwijderen?")) {
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

        if (idxVoornaam === -1 || idxAchternaam === -1) {
            return alert("Fout: Dit bestand heeft niet het juiste formaat van de bond.");
        }

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

            let nwRugnummer = idxRugnr !== -1 && row[idxRugnr] ? row[idxRugnr].trim() : "";
            let nwTeam = idxTeam !== -1 && row[idxTeam] ? row[idxTeam].trim() : "";
            let nwClubLid = idxClubLid !== -1 && row[idxClubLid] ? row[idxClubLid].trim() : "";
            let nwBondLid = idxBondLid !== -1 && row[idxBondLid] ? row[idxBondLid].trim() : "";

            let bestaandeSpeler = window.spelersDB.find(s => 
                (bondsnummer !== "" && s.bondsnummer === bondsnummer) || 
                (bondsnummer === "" && s.naam === volledigeNaam)
            );

            if (bestaandeSpeler) {
                let wijzigingen = [];

                if (berekendeLeeftijd !== "-" && bestaandeSpeler.leeftijd !== berekendeLeeftijd) {
                    bestaandeSpeler.leeftijd = berekendeLeeftijd; wijzigingen.push("leeftijd");
                }
                if (nwTeam !== "" && bestaandeSpeler.teamId !== nwTeam) {
                    bestaandeSpeler.teamId = nwTeam; wijzigingen.push("team");
                }
                if (nwClubLid !== "" && bestaandeSpeler.clubLidmaatschap !== nwClubLid) {
                    bestaandeSpeler.clubLidmaatschap = nwClubLid; wijzigingen.push("club-lid");
                }
                if (nwBondLid !== "" && bestaandeSpeler.bondLidmaatschap !== nwBondLid) {
                    bestaandeSpeler.bondLidmaatschap = nwBondLid; wijzigingen.push("bond-status");
                }
                if (nwRugnummer !== "" && bestaandeSpeler.rugnummer !== nwRugnummer) {
                    bestaandeSpeler.rugnummer = nwRugnummer; wijzigingen.push("rugnummer");
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
                    teamId: nwTeam,
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
            alert("✅ Import voltooid. Er waren geen wijzigingen.");
        }
        
        event.target.value = ''; 
    };
    reader.readAsText(file);
};