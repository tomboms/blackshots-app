// --- BASKETBAL_SPELERS.JS: MET NBB CHECKER, KLEUREN & DISPENSATIES ---

// 1. Slimme vertaler (Kopie van Teampagina, zodat we hem hier ook kunnen gebruiken)
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

// 2. De NBB Leeftijdschecker (Seizoen 26/27)
window.checkNBBTeOud = function(geboorteJaar, teamNaam) {
    if (!geboorteJaar || !teamNaam || geboorteJaar === "-") return false; 
    let match = teamNaam.match(/(?:U|X|M|V|J)(\d{2})/i); // Zoekt naar 10, 12, 14 etc.
    if (!match) return false; // Geen jeugdteam (bijv Heren 1 of Recreanten)
    
    let categorie = parseInt(match[1]); // Bijv: 12
    let minGeboorteJaar = 2027 - categorie; // Bij U12 in 26/27 is dit: 2027 - 12 = 2015
    
    // NBB Regel: Spelers in U12 moeten in 2015 of 2016 geboren zijn. 
    // Geboren in 2014 (of eerder)? Dan ben je te oud!
    return parseInt(geboorteJaar) < minGeboorteJaar;
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
        let aRec = a.isRecreant === true || (a.clubLidmaatschap && a.clubLidmaatschap.toLowerCase().includes('rec'));
        let bRec = b.isRecreant === true || (b.clubLidmaatschap && b.clubLidmaatschap.toLowerCase().includes('rec'));
        if (aRec && !bRec) return 1;   
        if (!aRec && bRec) return -1;  
        return (a.naam || '').localeCompare(b.naam || ''); 
    });

    gesorteerdeSpelers.forEach((speler) => {
        let isRec = speler.isRecreant === true || (speler.clubLidmaatschap && speler.clubLidmaatschap.toLowerCase().includes('rec'));

        let teamNaam = "Vrije Speler";
        let teamBadge = "background:#bdc3c7; color:white;";
        let matchTeamId = "vrij";
        let isAliasFout = false;
        
        if(speler.teamId) {
            let tObj = window.getCanonicalTeam(speler.teamId);
            if(tObj) {
                teamNaam = tObj.naam;
                teamBadge = `background:${tObj.kleur || 'var(--primary-color)'}; color:white; border: 1px solid rgba(0,0,0,0.1);`;
                matchTeamId = tObj.id;
            } else {
                teamNaam = speler.teamId; 
                teamBadge = "background:#e74c3c; color:white; font-weight:bold;"; // Rood wegens alias fout
                matchTeamId = "aliasfout";
                isAliasFout = true;
            }
        }

        // --- FILTER MATCHING ---
        let passTeam = false;
        if (selTeam === 'all') passTeam = true;
        else if (selTeam === 'vrij' && matchTeamId === 'vrij') passTeam = true;
        else if (selTeam === 'aliasfout' && isAliasFout) passTeam = true;
        else if (selTeam === matchTeamId) passTeam = true;

        let passType = (selType === 'all') || (selType === 'recreant' && isRec) || (selType === 'wedstrijd' && !isRec);
        let matchText = `${speler.naam} ${speler.bondsnummer || ''} ${teamNaam} ${speler.clubLidmaatschap || ''} ${speler.kaderRol || ''}`.toLowerCase();
        let passSearch = matchText.includes(zoekterm);

        if (passTeam && passType && passSearch) {
            let recBadge = isRec ? `<span style="background:#f1c40f; color:#2c3e50; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold; margin-left:5px; border:1px solid #e67e22;">REC</span>` : '';
            
            // --- NBB LEEFTIJD CHECKER ---
            let leeftijdWaarschuwing = '';
            if (window.checkNBBTeOud(speler.geboorteJaar, teamNaam)) {
                if (speler.dispensatie) {
                    leeftijdWaarschuwing = `<button onclick="window.toggleDispensatie('${speler.id}')" title="Dispensatie OK. Klik om in te trekken." style="background:none; border:none; cursor:pointer; padding:0; margin-left:5px;">✅</button>`;
                } else {
                    leeftijdWaarschuwing = `<button onclick="window.toggleDispensatie('${speler.id}')" title="Let op: Speler is NBB te oud voor ${teamNaam}! Klik om dispensatie te geven." style="background:none; border:none; cursor:pointer; padding:0; margin-left:5px; font-size:1.2rem; filter: drop-shadow(0 0 2px red);">⚠️</button>`;
                }
            }

            let kaderBadge = speler.kaderRol ? `<div style="color:#8e44ad; font-size:0.8rem; font-weight:bold; margin-top:2px;">⭐ ${speler.kaderRol}</div>` : '';

            // --- BEREKEN ACTUELE LEEFTIJD VOOR WEERGAVE ---
            let weergaveLeeftijd = '-';
            if (speler.geboorteJaar && speler.geboorteJaar !== '-') {
                let huidigJaar = new Date().getFullYear();
                let berekendeLeeftijd = huidigJaar - parseInt(speler.geboorteJaar);
                weergaveLeeftijd = `<strong>${berekendeLeeftijd} jr</strong> <span style="font-size:0.8rem; color:#7f8c8d;">(${speler.geboorteJaar})</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid #eee; font-size:0.95rem;">
                    <td style="padding:12px; color:#7f8c8d; font-family:monospace;">${speler.bondsnummer || 'Handmatig'}</td>
                    <td style="padding:12px; font-weight:bold; color:var(--secondary-color);">
                        ${speler.naam}
                        ${kaderBadge}
                    </td>
                    <td style="padding:12px;">${weergaveLeeftijd}</td>
                    <td style="padding:12px; font-weight:bold; color:#d35400;">${speler.rugnummer ? `#${speler.rugnummer}` : '-'}</td>
                    <td style="padding:12px; white-space:nowrap;">
                        <span style="${teamBadge} padding:4px 8px; border-radius:4px; font-size:0.85rem;">${teamNaam}</span>${leeftijdWaarschuwing}${recBadge}
                    </td>
                    <td style="padding:12px; color:#7f8c8d; font-size:0.85rem;">${speler.lidSinds || '-'}</td>
                    <td style="padding:12px; font-size:0.85rem; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <div style="font-weight:bold; color:#2c3e50;">${speler.clubLidmaatschap || '-'}</div>
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

// --- NIEUW: DISPENSATIE SCHAKELAAR ---
window.toggleDispensatie = function(spelerId) {
    let speler = window.spelersDB.find(s => s.id === spelerId);
    if (speler) {
        speler.dispensatie = !speler.dispensatie; // Zet aan als uit stond, en andersom
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        window.renderSpelers();
    }
};

// --- BEWERK SPELER ---
window.bewerkSpeler = function(index) {
    let speler = window.spelersDB[index];
    if(!speler) return;
    
    let nwNaam = prompt("Pas de naam aan:", speler.naam);
    if (nwNaam === null) return;
    
    let nwGebJaar = prompt("Pas het geboortejaar aan (bijv 2014):", speler.geboorteJaar || "");
    if (nwGebJaar === null) return;
    
    let nwRugnr = prompt("Pas het rugnummer aan:", speler.rugnummer || "");
    if (nwRugnr === null) return;

    let nwRol = prompt("Heeft deze persoon een rol? (bijv Coach X10-1). Laat leeg voor geen:", speler.kaderRol || "");
    if (nwRol === null) return;

    let teamOpties = window.teamsDB.map(t => t.naam).join(", ");
    let nwTeam = prompt(`Koppel aan een team (Kies uit: ${teamOpties})\nLaat leeg voor 'Vrije Speler':`, speler.teamId);
    if (nwTeam === null) return;

    let isRecPrompt = confirm("Is deze speler een Recreant (speelt geen wedstrijden)?\nKlik 'OK' voor JA, 'Annuleren' voor NEE.");

    let matchedTeam = window.getCanonicalTeam(nwTeam);
    let finalTeamId = matchedTeam ? matchedTeam.id : nwTeam.trim();

    speler.naam = nwNaam.trim() || speler.naam;
    speler.geboorteJaar = nwGebJaar.trim();
    speler.rugnummer = nwRugnr.trim();
    speler.kaderRol = nwRol.trim();
    speler.teamId = finalTeamId;
    speler.isRecreant = isRecPrompt;

    localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
    window.renderSpelers();
};

// --- HANDMATIG TOEVOEGEN ---
window.voegSpelerToe = function() {
    let naam = document.getElementById('nw-speler-naam').value.trim();
    let gebJaar = document.getElementById('nw-speler-gebjaar').value;
    let rugnr = document.getElementById('nw-speler-rugnr').value;
    let rol = document.getElementById('nw-speler-rol').value.trim();
    let teamId = document.getElementById('nw-speler-team').value;
    let isRec = document.getElementById('nw-speler-rec').checked;

    if(naam) {
        window.spelersDB.push({
            id: 'p_' + Date.now(),
            bondsnummer: '',
            naam: naam,
            geboorteJaar: gebJaar,
            rugnummer: rugnr,
            kaderRol: rol,
            teamId: teamId,
            isRecreant: isRec,
            dispensatie: false,
            lidSinds: new Date().toLocaleDateString('nl-NL'),
            clubLidmaatschap: isRec ? 'Recreant (Handmatig)' : 'Spelend lid (Handmatig)',
            bondLidmaatschap: isRec ? 'Niet-spelend' : 'Wedstrijdspelend'
        });
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        
        document.getElementById('nw-speler-naam').value = '';
        document.getElementById('nw-speler-gebjaar').value = '';
        document.getElementById('nw-speler-rugnr').value = '';
        document.getElementById('nw-speler-rol').value = '';
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
            
            // Haal geboortejaar uit CSV (Datum is DD-MM-YYYY)
            let gebJaarStr = "-";
            let gebDatumRuweStr = row[idxGeboorte] ? row[idxGeboorte].trim() : "";
            if (gebDatumRuweStr) {
                let parts = gebDatumRuweStr.split('-');
                if (parts.length === 3) gebJaarStr = parts[2]; // Pak het jaar
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
                // UPDATE: Controleer nu geboortejaar i.p.v. leeftijd
                if (gebJaarStr !== "-" && bestaandeSpeler.geboorteJaar !== gebJaarStr) {
                    bestaandeSpeler.geboorteJaar = gebJaarStr; wijzigingen.push("geboortejaar");
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
                    geboorteJaar: gebJaarStr,
                    rugnummer: nwRugnummer,
                    teamId: finalTeamId,
                    isRecreant: isRec,
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