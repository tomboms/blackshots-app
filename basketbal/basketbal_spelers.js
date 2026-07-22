// --- BASKETBAL_SPELERS.JS: MET TAKEN, GEZINSKOPPELING & ZAALWACHT ---

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

window.checkNBBTeOud = function(geboorteDatum, teamNaam, teamObj) {
    if (!geboorteDatum || !teamNaam || geboorteDatum === "-") return false; 
    let gebJaar = parseInt(geboorteDatum.split('-')[0]); 
    
    if (teamObj && teamObj.leeftijdRegel && teamObj.leeftijdRegel.trim() !== "") {
        let regel = teamObj.leeftijdRegel.trim().replace(/\s+/g, ''); 
        
        if (regel.startsWith('-')) {
            let grens = parseInt(regel.substring(1));
            return gebJaar < grens; 
        } else if (regel.startsWith('+')) {
            let grens = parseInt(regel.substring(1));
            return gebJaar > grens; 
        } else {
            let toegestaan = regel.split(',').map(y => parseInt(y));
            return !toegestaan.includes(gebJaar); 
        }
    }
    
    let match = teamNaam.match(/(?:U|X|M|V|J)(\d{2})/i); 
    if (!match) return false; 
    
    let categorie = parseInt(match[1]); 
    let instellingen = JSON.parse(localStorage.getItem('blackshots_instellingen')) || {};
    let actiefSeizoen = instellingen.seizoen || "2025-2026"; 
    let startJaarNBB = parseInt(actiefSeizoen.split('-')[0]); 
    let peilJaar = startJaarNBB + 1; 
    let minGeboorteJaar = peilJaar - categorie; 
    
    return gebJaar < minGeboorteJaar;
};

window.renderSpelers = function() {
    const tbody = document.getElementById('spelers-tabel-body');
    const teamSelect = document.getElementById('nw-speler-team');
    const filterTeam = document.getElementById('filter-team');

    if (!tbody) return;

    // Dropdowns vullen
    if(teamSelect && teamSelect.options.length <= 1) {
        teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
        if(filterTeam) filterTeam.innerHTML = '<option value="all">-- Toon Alle Teams --</option><option value="vrij">Zonder Team (Zwervers)</option><option value="aliasfout">⚠️ Alias Fouten (Onbekende Code)</option>';
        
        if (Array.isArray(window.teamsDB)) {
            window.teamsDB.forEach(t => {
                teamSelect.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
                if(filterTeam) filterTeam.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
            });
        }
    }

    let nwGezin = document.getElementById('nw-speler-gezin');
    if (nwGezin) {
        let huidigeGezinSelectie = nwGezin.value;
        let gezinOpts = '<option value="">-- Geen (Losse speler) --</option>';
        window.spelersDB.forEach(s => {
            gezinOpts += `<option value="${s.id}">${s.naam} (${s.bondsnummer || 'Ouder/Geen'})</option>`;
        });
        nwGezin.innerHTML = gezinOpts;
        nwGezin.value = huidigeGezinSelectie;
    }

    // Waardes ophalen
    let zoekterm = (document.getElementById('zoek-speler') ? document.getElementById('zoek-speler').value.toLowerCase() : "");
    let selTeam = filterTeam ? filterTeam.value : 'all';
    let selType = document.getElementById('filter-type') ? document.getElementById('filter-type').value : 'all';
    let sorteerKeuze = document.getElementById('sorteer-speler') ? document.getElementById('sorteer-speler').value : 'naam_asc';

    let html = '';
    let gesorteerdeSpelers = window.spelersDB.map((speler, index) => ({ ...speler, origineleIndex: index }));

    // Hulpfunctie om datums om te zetten naar een getal voor makkelijk sorteren
    const datumNaarGetal = (d) => {
        if (!d || d === '-' || d.includes('Proef')) return 0;
        let p = d.split('-');
        if (p.length === 3) {
            if (p[0].length <= 2) return parseInt(`${p[2]}${p[1].padStart(2,'0')}${p[0].padStart(2,'0')}`); // DD-MM-YYYY
            return parseInt(`${p[0]}${p[1].padStart(2,'0')}${p[2].padStart(2,'0')}`); // YYYY-MM-DD
        }
        return 0;
    };

    // Hulpfunctie voor de achternaam (alles na de eerste spatie pakken)
    const getAchternaam = (naam) => {
        if (!naam) return "";
        let delen = naam.trim().split(' ');
        return delen.length > 1 ? delen.slice(1).join(' ') : delen[0];
    };

    // DE NIEUWE SLIMME SORTEERMACHINE
    gesorteerdeSpelers.sort((a, b) => {
        switch (sorteerKeuze) {
            case 'achternaam_asc':
                return getAchternaam(a.naam).localeCompare(getAchternaam(b.naam));
            case 'team_asc':
                let tA = window.getCanonicalTeam(a.teamId) ? window.getCanonicalTeam(a.teamId).naam : (a.teamId || "ZZZ");
                let tB = window.getCanonicalTeam(b.teamId) ? window.getCanonicalTeam(b.teamId).naam : (b.teamId || "ZZZ");
                if (tA === tB) return (a.naam || '').localeCompare(b.naam || ''); // Als zelfde team, op naam
                return tA.localeCompare(tB);
            case 'leeftijd_jong': 
                return datumNaarGetal(b.geboorteDatum) - datumNaarGetal(a.geboorteDatum);
            case 'leeftijd_oud': 
                let dA = datumNaarGetal(a.geboorteDatum) || 99999999;
                let dB = datumNaarGetal(b.geboorteDatum) || 99999999;
                return dA - dB;
            case 'lidsinds_nieuw': 
                return datumNaarGetal(b.lidSinds) - datumNaarGetal(a.lidSinds);
            case 'bondsnummer_asc':
                return (a.bondsnummer || 'ZZZ').localeCompare(b.bondsnummer || 'ZZZ');
            case 'naam_asc':
            default:
                if (a.isProeflid && !b.isProeflid) return -1;
                if (!a.isProeflid && b.isProeflid) return 1;
                let aRec = a.isRecreant === true; let bRec = b.isRecreant === true;
                if (aRec && !bRec) return 1; if (!aRec && bRec) return -1;
                return (a.naam || '').localeCompare(b.naam || '');
        }
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
            if (window.checkNBBTeOud(speler.geboorteDatum, teamNaam, actueelTeamObj)) {
                if (speler.dispensatie) {
                    leeftijdWaarschuwing = `<button onclick="window.toggleDispensatie('${speler.id}')" title="Dispensatie OK. Klik om in te trekken." style="background:none; border:none; cursor:pointer; padding:0; margin-left:5px;">✅</button>`;
                } else {
                    leeftijdWaarschuwing = `<button onclick="window.toggleDispensatie('${speler.id}')" title="Let op: Speler voldoet niet aan de leeftijdsregel voor ${teamNaam}! Klik om dispensatie te geven." style="background:none; border:none; cursor:pointer; padding:0; margin-left:5px; font-size:1.2rem;">⚠️</button>`;
                }
            }

            let kaderBadge = speler.kaderRol ? `<div style="color:#8e44ad; font-size:0.8rem; font-weight:bold; margin-top:2px;">⭐ ${speler.kaderRol}</div>` : '';

            let magF = speler.magFluiten === true; 
            let magT = speler.magTafelen !== false; 
            let heeftA = speler.heeftAuto !== false; 
            let magZ = speler.magZaalwacht === true; 
            
            let taakIcons = `
                <span onclick="window.toggleTaak('${speler.id}', 'magFluiten')" title="${magF ? 'Mag Fluiten (Klik om uit te zetten)' : 'Mag NIET fluiten (Klik om aan te zetten)'}" style="opacity:${magF?1:0.2}; cursor:pointer; font-size:1.3rem; margin-right:3px; transition:0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">👨‍⚖️</span>
                <span onclick="window.toggleTaak('${speler.id}', 'magTafelen')" title="${magT ? 'Mag Tafelen (Klik om uit te zetten)' : 'Mag NIET tafelen (Klik om aan te zetten)'}" style="opacity:${magT?1:0.2}; cursor:pointer; font-size:1.3rem; margin-right:3px; transition:0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">💻</span>
                <span onclick="window.toggleTaak('${speler.id}', 'heeftAuto')" title="${heeftA ? 'Heeft Auto (Klik om uit te zetten)' : 'Heeft GEEN auto (Klik om aan te zetten)'}" style="opacity:${heeftA?1:0.2}; cursor:pointer; font-size:1.3rem; margin-right:3px; transition:0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">🚗</span>
                <span onclick="window.toggleTaak('${speler.id}', 'magZaalwacht')" title="${magZ ? 'Mag Zaalwacht (Klik om uit te zetten)' : 'Mag NIET Zaalwacht (Klik om aan te zetten)'}" style="opacity:${magZ?1:0.2}; cursor:pointer; font-size:1.3rem; transition:0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">🔑</span>
            `;
            if(speler.gezinKoppeling) taakIcons += ` <span title="Gekoppeld aan broer/zus (Planner checkt dubbele tijden)" style="color:#8e44ad; margin-left:8px; cursor:default; font-size:1.1rem;">🔗</span>`;

            let weergaveLeeftijd = '-';
            if (speler.geboorteDatum && speler.geboorteDatum !== '-') {
                let gebDate = new Date(speler.geboorteDatum);
                let vandaag = new Date();
                let berekendeLeeftijd = vandaag.getFullYear() - gebDate.getFullYear();
                let m = vandaag.getMonth() - gebDate.getMonth();
                if (m < 0 || (m === 0 && vandaag.getDate() < gebDate.getDate())) berekendeLeeftijd--; 
                
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
                    <td style="padding:12px; white-space:nowrap;">
                        <span style="${teamBadge} padding:4px 8px; border-radius:4px; font-size:0.85rem;">${teamNaam}</span>${leeftijdWaarschuwing}${recBadge}
                    </td>
                    <td style="padding:12px; font-size:1.1rem; letter-spacing:2px; white-space:nowrap; text-align:center;">
                        ${taakIcons}
                    </td>
                    <td style="padding:12px;">${weergaveLeeftijd}</td>
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

// --- FUNCTIES VOOR TEAM LEEFTIJD REGELS MODAL ---
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

window.sluitLeeftijdRegelsModal = function() { document.getElementById('leeftijd-regels-modal').style.display = 'none'; };

window.slaLeeftijdRegelsOp = function() {
    let inputs = document.querySelectorAll('.team-regel-input');
    inputs.forEach(input => {
        let tId = input.getAttribute('data-teamid');
        let regel = input.value.trim();
        let team = window.teamsDB.find(t => t.id === tId);
        if (team) team.leeftijdRegel = regel;
    });

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.sluitLeeftijdRegelsModal();
    window.renderSpelers(); 
    alert("✅ Teamregels opgeslagen! De waarschuwingsicoontjes (⚠️) zijn direct bijgewerkt.");
};

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
    document.getElementById('bewerk-speler-rec').checked = speler.isRecreant === true;
    
    let proefCheck = document.getElementById('bewerk-speler-proef');
    if(proefCheck) proefCheck.checked = speler.isProeflid === true;

    // VINKJES & GEZIN INLADEN (Met de nieuwe defaults!)
    document.getElementById('bewerk-speler-fluit').checked = speler.magFluiten === true;
    document.getElementById('bewerk-speler-tafel').checked = speler.magTafelen !== false;
    document.getElementById('bewerk-speler-auto').checked = speler.heeftAuto !== false;
    document.getElementById('bewerk-speler-zaalwacht').checked = speler.magZaalwacht === true;

    let gezinSelect = document.getElementById('bewerk-speler-gezin');
    if (gezinSelect) {
        gezinSelect.innerHTML = '<option value="">-- Geen koppeling --</option>';
        window.spelersDB.forEach(s => {
            if (s.id !== speler.id) { 
                gezinSelect.innerHTML += `<option value="${s.id}">${s.naam} (${s.bondsnummer || 'geen'})</option>`;
            }
        });
        gezinSelect.value = speler.gezinKoppeling || "";
    }

    let teamSelect = document.getElementById('bewerk-speler-team');
    teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
    if (Array.isArray(window.teamsDB)) {
        window.teamsDB.forEach(t => { teamSelect.innerHTML += `<option value="${t.id}">${t.naam}</option>`; });
    }
    
    let matchedTeam = window.getCanonicalTeam(speler.teamId);
    teamSelect.value = matchedTeam ? matchedTeam.id : "";

    document.getElementById('bewerk-speler-modal').style.display = 'flex';
};

window.sluitBewerkSpelerModal = function() { document.getElementById('bewerk-speler-modal').style.display = 'none'; };

window.slaBewerkteSpelerOp = function() {
    let index = document.getElementById('bewerk-speler-index').value;
    let speler = window.spelersDB[index];
    if(!speler) return;

    let nwNaam = document.getElementById('bewerk-speler-naam').value.trim();
    if (!nwNaam) return alert("Een naam is verplicht!");

    speler.naam = nwNaam;
    speler.geboorteDatum = document.getElementById('bewerk-speler-gebdatum').value || "-";
    speler.rugnummer = document.getElementById('bewerk-speler-rugnr').value;
    speler.teamId = document.getElementById('bewerk-speler-team').value;
    speler.isRecreant = document.getElementById('bewerk-speler-rec').checked;
    
    let proefCheck = document.getElementById('bewerk-speler-proef');
    if(proefCheck) speler.isProeflid = proefCheck.checked;
    
    // TAKEN & GEZIN OPSLAAN
    speler.magFluiten = document.getElementById('bewerk-speler-fluit').checked;
    speler.magTafelen = document.getElementById('bewerk-speler-tafel').checked;
    speler.heeftAuto = document.getElementById('bewerk-speler-auto').checked;
    speler.magZaalwacht = document.getElementById('bewerk-speler-zaalwacht').checked;
    speler.gezinKoppeling = document.getElementById('bewerk-speler-gezin').value;

    localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
    window.sluitBewerkSpelerModal();
    window.renderSpelers();
};

window.voegSpelerToe = function() {
    let naam = document.getElementById('nw-speler-naam').value.trim();
    let gebDatum = document.getElementById('nw-speler-gebdatum').value;
    let teamId = document.getElementById('nw-speler-team').value;
    
    let isRec = document.getElementById('nw-speler-rec') ? document.getElementById('nw-speler-rec').checked : false;
    let isProef = document.getElementById('nw-speler-proef') ? document.getElementById('nw-speler-proef').checked : false;

    // NIEUWE VELDEN MET DE GEVRAAGDE DEFAULTS
    let magF = document.getElementById('nw-speler-fluit') ? document.getElementById('nw-speler-fluit').checked : false;
    let magT = document.getElementById('nw-speler-tafel') ? document.getElementById('nw-speler-tafel').checked : true;
    let auto = document.getElementById('nw-speler-auto') ? document.getElementById('nw-speler-auto').checked : true;
    let magZ = document.getElementById('nw-speler-zaalwacht') ? document.getElementById('nw-speler-zaalwacht').checked : false;
    let gezin = document.getElementById('nw-speler-gezin') ? document.getElementById('nw-speler-gezin').value : "";

    if(naam) {
        window.spelersDB.push({
            id: 'p_' + Date.now(),
            bondsnummer: '',
            naam: naam,
            geboorteDatum: gebDatum || '-',
            rugnummer: '',
            teamId: teamId,
            isRecreant: isRec,
            isProeflid: isProef,
            magFluiten: magF,
            magTafelen: magT,
            heeftAuto: auto,
            magZaalwacht: magZ,
            gezinKoppeling: gezin,
            dispensatie: false,
            lidSinds: isProef ? 'Proefperiode' : new Date().toLocaleDateString('nl-NL'),
            clubLidmaatschap: isProef ? 'Proeftrainer' : (isRec ? 'Recreant' : 'Spelend lid'),
            bondLidmaatschap: 'Niet-spelend'
        });
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        
        document.getElementById('nw-speler-naam').value = '';
        document.getElementById('nw-speler-gebdatum').value = '';
        if(document.getElementById('nw-speler-rec')) document.getElementById('nw-speler-rec').checked = false;
        if(document.getElementById('nw-speler-proef')) document.getElementById('nw-speler-proef').checked = true;
        
        // Reset checkboxjes naar default
        if(document.getElementById('nw-speler-fluit')) document.getElementById('nw-speler-fluit').checked = false;
        if(document.getElementById('nw-speler-tafel')) document.getElementById('nw-speler-tafel').checked = true;
        if(document.getElementById('nw-speler-auto')) document.getElementById('nw-speler-auto').checked = true;
        if(document.getElementById('nw-speler-zaalwacht')) document.getElementById('nw-speler-zaalwacht').checked = false;
        
        if(document.getElementById('nw-speler-gezin')) document.getElementById('nw-speler-gezin').value = "";
        
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
        let csvBondsnummers = []; // Houdt bij wie er in de nieuwe lijst staan

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
            if (bondsnummer !== "") csvBondsnummers.push(bondsnummer); // Voeg toe aan controlelijst
            
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
                    
                    // STANDAARD IMPORT INSTELLINGEN
                    magFluiten: false,  
                    magTafelen: true,  
                    heeftAuto: true,  
                    magZaalwacht: false, 
                    
                    gezinKoppeling: "",
                    dispensatie: false, 
                    lidSinds: idxLidSinds !== -1 && row[idxLidSinds] ? row[idxLidSinds].trim() : "",
                    clubLidmaatschap: nwClubLid,
                    bondLidmaatschap: nwBondLid
                });
                rapportToegevoegd.push(`- ${volledigeNaam}`);
            }
        }

        // DE NIEUWE VERWIJDER CHECK
        let verdwenenSpelers = window.spelersDB.filter(s => s.bondsnummer && s.bondsnummer !== "" && !csvBondsnummers.includes(s.bondsnummer));
        let rapportVerwijderd = [];
        
        if (verdwenenSpelers.length > 0) {
            let namenLijst = verdwenenSpelers.map(s => s.naam).join('\n- ');
            let wilVerwijderen = confirm(`⚠️ Opgelet: De volgende ${verdwenenSpelers.length} speler(s) staan in ons systeem, maar ontbreken in de nieuwe export:\n\n- ${namenLijst}\n\nWil je deze speler(s) DEFINITIEF uit ons systeem verwijderen?`);
            
            if (wilVerwijderen) {
                let teVerwijderenNummers = verdwenenSpelers.map(s => s.bondsnummer);
                window.spelersDB = window.spelersDB.filter(s => !teVerwijderenNummers.includes(s.bondsnummer));
                rapportVerwijderd = verdwenenSpelers.map(s => `- ${s.naam}`);
            }
        }

        // DE GEÜPDATETE EINDMELDING (Inclusief de verwijderde spelers)
        if (rapportToegevoegd.length > 0 || rapportAangepast.length > 0 || rapportVerwijderd.length > 0) {
            localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
            window.renderSpelers();

            let eindBericht = "✅ Import Succesvol!\n\n";
            if (rapportToegevoegd.length > 0) eindBericht += `Nieuw (${rapportToegevoegd.length}):\n${rapportToegevoegd.join('\n')}\n\n`;
            if (rapportAangepast.length > 0) eindBericht += `Geüpdatet (${rapportAangepast.length}):\n${rapportAangepast.join('\n')}\n\n`;
            if (rapportVerwijderd.length > 0) eindBericht += `Verwijderd (${rapportVerwijderd.length}):\n${rapportVerwijderd.join('\n')}`;
            alert(eindBericht.trim());
        } else {
            alert("✅ Import voltooid. Er waren geen nieuwe wijzigingen in de bondsexport.");
        }
        
        event.target.value = ''; 
    };
    reader.readAsText(file);
};

// ============================================================================
// QUICK-TOGGLES (Direct in de tabel klikken)
// ============================================================================

// 1. Dispensatie aan/uit zetten
window.toggleDispensatie = function(spelerId) {
    let speler = window.spelersDB.find(s => s.id === spelerId);
    if (speler) {
        speler.dispensatie = !speler.dispensatie; // Draai de waarde om
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        window.renderSpelers(); // Ververs de tabel direct
    }
};

// 2. Taken aan/uit zetten (Fluiten, Tafel, Auto, Zaalwacht)
window.toggleTaak = function(spelerId, taakVeld) {
    let speler = window.spelersDB.find(s => s.id === spelerId);
    if (speler) {
        // Zorg dat we de juiste startwaarde hebben als het veld nog niet bestond
        if (speler[taakVeld] === undefined) {
            if (taakVeld === 'magTafelen' || taakVeld === 'heeftAuto') speler[taakVeld] = true;
            else speler[taakVeld] = false;
        }
        
        speler[taakVeld] = !speler[taakVeld]; // Draai de waarde om
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        window.renderSpelers(); // Ververs de tabel direct zodat het icoontje oplicht/dimt
    }
};