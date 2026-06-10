// --- BASKETBAL_WEDSTRIJDEN.JS: DIRECTE BEREKENING & SLIM GEHEUGEN ---

// 1. DATA INLADEN (Zonder de zware Plantool!)
window.bsTeams = JSON.parse(localStorage.getItem('blackshots_poule_teams')) || [];
window.pouleData = JSON.parse(localStorage.getItem('blackshots_poule_data')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.bsTeams.length > 0) {
        document.getElementById('stap-2-box').style.opacity = '1';
        document.getElementById('stap-2-box').style.pointerEvents = 'all';
    }
    // Check of we al berekende schema's hebben
    let heeftSchema = window.bsTeams.some(t => t.conceptSchema && t.conceptSchema.length > 0);
    if (heeftSchema) {
        document.getElementById('label-plantool').innerText = `✅ Wedstrijden succesvol berekend!`;
        document.getElementById('label-plantool').style.color = '#8e44ad';
    }
    if (window.nbbWedstrijden.length > 0) {
        document.getElementById('label-json').innerText = `✅ JSON Definitief ingeladen!`;
    }
    tekenPouleResultaten();
});

// Mooie Datums Maken
function maakMooieDatum(datumStr, tijdStr, accommodatie) {
    if (!datumStr) return "Datum onbekend";
    try {
        let d = new Date(datumStr);
        const dagen = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
        let dag = dagen[d.getDay()];
        let dagNummer = d.getDate().toString().padStart(2, '0');
        let maandNummer = (d.getMonth() + 1).toString().padStart(2, '0');
        let jaar = d.getFullYear();
        let tijd = tijdStr ? tijdStr.substring(0, 5) : ''; 
        let locatie = accommodatie ? ` in ${accommodatie}` : '';
        return `${dag} ${dagNummer}-${maandNummer}-${jaar}${tijd ? ' om ' + tijd : ''}${locatie}`;
    } catch(e) { return datumStr; }
}

// ============================================================================
// STAP 1: LEES DE POULE INDELING (CSV / Excel)
// ============================================================================
window.verwerkPouleBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-indeling').innerText = `⏳ Lade...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        window.pouleData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        localStorage.setItem('blackshots_poule_data', JSON.stringify(window.pouleData));
        zoekBlackShotsInPoules();
        document.getElementById('label-indeling').innerText = `✅ Ingeladen: ${file.name}`;
    };
    reader.readAsArrayBuffer(file);
};

window.zoekBlackShotsInPoules = function() {
    window.bsTeams = [];
    window.pouleData.forEach(rij => {
        let vereniging = (rij['Vereniging'] || rij['vereniging'] || '').toString();
        if (vereniging.toLowerCase().includes('black shots')) {
            let pouleNaam = rij['Poule'] || rij['poule'] || 'Onbekend';
            let teamNaam = rij['Team'] || rij['team'] || 'Onbekend Team';
            
            if (!window.bsTeams.find(t => t.pouleNaam === pouleNaam && t.teamNaam === teamNaam)) {
                let tegenstanders = window.pouleData.filter(r => (r['Poule'] || r['poule']) === pouleNaam);
                tegenstanders.sort((a, b) => parseInt(a['Code'] || a['code'] || 0) - parseInt(b['Code'] || b['code'] || 0));
                
                window.bsTeams.push({
                    teamNaam: teamNaam, pouleNaam: pouleNaam, 
                    onzeCode: rij['Code'] || rij['code'] || '?',
                    schemaType: rij['Speelschema'] || rij['speelschema'] || 'Onbekend',
                    pouleGrootte: tegenstanders.length,
                    tegenstanders: tegenstanders,
                    conceptSchema: [] 
                });
            }
        }
    });

    localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams));
    document.getElementById('stap-2-box').style.opacity = '1';
    document.getElementById('stap-2-box').style.pointerEvents = 'all';
    tekenPouleResultaten();
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL EN BEREKEN ALLES DIRECT! (GEEN DATA OPSLAAN)
// ============================================================================
window.verwerkPlantoolBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-plantool').innerText = `⏳ Lade en Berekenen...`;
    document.getElementById('label-plantool').style.color = '#e67e22';

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        let tempPlantool = {};
        workbook.SheetNames.forEach(name => {
            tempPlantool[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {header: 1, raw: false, defval: ""});
        });
        
        // DIRECT BEREKENEN VOOR ALLE TEAMS
        let tabNamen = Object.keys(tempPlantool);
        let schemasBerekend = 0;

        window.bsTeams.forEach((bsData, index) => {
            let schemaGezocht = bsData.schemaType.toLowerCase().trim();
            let besteTab = tabNamen.find(t => t.toLowerCase().trim() === schemaGezocht) || 
                           tabNamen.find(t => schemaGezocht.includes(t.toLowerCase().trim()) || t.toLowerCase().trim().includes(schemaGezocht));

            if (besteTab) {
                let sheetGrid = tempPlantool[besteTab];
                let berekendeWedstrijden = [];
                let onzeCode = parseInt(bsData.onzeCode);

                sheetGrid.forEach((row) => {
                    let heeftMatch = false;
                    row.forEach(cel => { if(typeof cel === 'string' && cel.match(/(\d+)\s*-\s*(\d+)/)) heeftMatch = true; });

                    if (heeftMatch) {
                        let weekendLabel = (row[0] || row[1] || row[2] || "Onbekend").toString().trim();
                        
                        row.forEach(cel => {
                            if(typeof cel === 'string') {
                                let match = cel.match(/(\d+)\s*-\s*(\d+)/);
                                if (match) {
                                    let codeA = parseInt(match[1]);
                                    let codeB = parseInt(match[2]);

                                    if (codeA === onzeCode || codeB === onzeCode) {
                                        let tegenstanderCode = (codeA === onzeCode) ? codeB : codeA;
                                        let thuisSpelend = (codeA === onzeCode);
                                        
                                        let tegTeam = bsData.tegenstanders.find(t => parseInt(t.Code||t.code||0) === tegenstanderCode);
                                        let tegNaam = tegTeam ? (tegTeam.Vereniging || tegTeam.vereniging) : `Team ${tegenstanderCode}`;
                                        if (!tegNaam || tegNaam.trim() === '') tegNaam = "--- VRIJE PLEK ---";

                                        berekendeWedstrijden.push({ weekend: weekendLabel, thuis: thuisSpelend, tegenstander: tegNaam });
                                    }
                                }
                            }
                        });
                    }
                });

                window.bsTeams[index].conceptSchema = berekendeWedstrijden;
                schemasBerekend++;
            }
        });

        // SLA ALLEEN DE RESULTATEN OP (Dit is superklein en crasht niet!)
        localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams));
        document.getElementById('label-plantool').innerText = `✅ ${schemasBerekend} Teams Berekend!`;
        document.getElementById('label-plantool').style.color = '#8e44ad';
        tekenPouleResultaten();
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// STAP 3: LEES DE DEFINITIEVE NBB JSON
// ============================================================================
window.verwerkNBBJson = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-json').innerText = `⏳ Lade...`;

    const reader = new FileReader();
    reader.onload = function(e) {
        window.nbbWedstrijden = JSON.parse(e.target.result);
        localStorage.setItem('blackshots_wedstrijden_json', JSON.stringify(window.nbbWedstrijden));
        document.getElementById('label-json').innerText = `✅ JSON Definitief ingeladen!`;
        tekenPouleResultaten(); 
    };
    reader.readAsText(file);
};

// ============================================================================
// SCHERM OPBOUW (Directe Weergave)
// ============================================================================
window.tekenPouleResultaten = function() {
    let container = document.getElementById('poule-resultaten');
    container.innerHTML = '';

    if (window.bsTeams.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Upload eerst de Poule Indeling...</p>';
        return;
    }

    window.bsTeams.forEach((bsData, index) => {
        // Tegenstanders Tabel
        let lijstHtml = `<table class="team-lijst"><tr><th>Code</th><th>Vereniging</th><th>Team</th></tr>`;
        bsData.tegenstanders.forEach(tg => {
            let vNaam = tg['Vereniging'] || tg['vereniging'];
            let isLeeg = (!vNaam || vNaam.trim() === '');
            let isOns = (!isLeeg && vNaam.toLowerCase().includes('black shots'));
            lijstHtml += `
                <tr class="${isOns ? 'is-ons-team' : ''}">
                    <td><strong>${tg['Code'] || tg['code'] || '?'}</strong></td>
                    <td>${isLeeg ? '<span style="color:#e74c3c; font-style:italic;">-- Vrij --</span>' : vNaam}</td>
                    <td>${isLeeg ? '-' : (tg['Team'] || tg['team'] || '?')}</td>
                </tr>`;
        });
        lijstHtml += `</table>`;

        // 1. DEFINITIEF SCHEMA (Als JSON is geladen)
        let teamWedstrijden = window.nbbWedstrijden.filter(w => 
            (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots') && w.Thuisteam.includes(bsData.teamNaam)) || 
            (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots') && w.Uitteam.includes(bsData.teamNaam))
        );

        let schemaWeergave = '';

        if (teamWedstrijden.length > 0) {
            schemaWeergave = `<h4 style="margin:20px 0 5px 0; color:#9b59b6;">✅ Definitieve Planning (NBB JSON)</h4><div style="max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px;"><ul class="schema-lijst">`;
            teamWedstrijden.forEach(w => {
                let isThuis = w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots') && w.Thuisteam.includes(bsData.teamNaam);
                let tegenstander = isThuis ? w.Uitteam : w.Thuisteam;
                let badgeClass = w.Status === 'Te plannen' ? 'status-te-plannen' : 'status-gepland';
                let weergaveDatum = maakMooieDatum(w.Datum, w.Tijd, w.Accommodatie); 
                
                schemaWeergave += `
                    <li style="border-left: 4px solid #9b59b6;">
                        <div style="flex:1;">
                            <strong style="color:#34495e; font-size:0.9rem;">${weergaveDatum}</strong><br>
                            <span style="font-size:0.9rem;">${isThuis ? '🏠 Thuis:' : '🚌 Uit:'} <strong>${tegenstander}</strong></span>
                        </div>
                        <div style="text-align:right;"><span class="status-badge ${badgeClass}">${w.Status}</span></div>
                    </li>`;
            });
            schemaWeergave += `</ul></div>`;
        } 
        // 2. OF CONCEPT SCHEMA (Als Plantool is berekend)
        else if (bsData.conceptSchema && bsData.conceptSchema.length > 0) {
            schemaWeergave = `<h4 style="margin:20px 0 5px 0; color:#3498db;">📅 Berekend Schema (Concept)</h4><div style="max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px;"><ul class="schema-lijst">`;
            bsData.conceptSchema.forEach(match => {
                let statusBadge = match.tegenstander === "--- VRIJE PLEK ---" 
                    ? `<span class="status-badge" style="background:#e74c3c;">VRIJ</span>` 
                    : `<span class="status-badge status-concept">Concept</span>`;
                
                schemaWeergave += `
                    <li>
                        <div style="flex:1;">
                            <strong style="color:#34495e; font-size:0.9rem;">Weekend: ${match.weekend}</strong><br>
                            <span style="font-size:0.9rem;">${match.thuis ? '🏠 Thuis:' : '🚌 Uit:'} <strong>${match.tegenstander}</strong></span>
                        </div>
                        <div>${statusBadge}</div>
                    </li>`;
            });
            schemaWeergave += `</ul></div>`;
        }

        container.innerHTML += `
            <div class="poule-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 5px 0; color:var(--secondary-color); font-size:1.4rem;">${bsData.teamNaam}</h3>
                        <div style="font-size:0.9rem; color:#7f8c8d; margin-bottom:15px;">
                            <strong>Poule:</strong> ${bsData.pouleNaam} <br>
                            <strong>Grootte:</strong> ${bsData.pouleGrootte} teams
                        </div>
                    </div>
                    <div style="background:#e67e22; color:white; padding:10px 15px; border-radius:8px; text-align:center;">
                        <span style="font-size:0.8rem; text-transform:uppercase; font-weight:bold; display:block;">Code</span>
                        <span style="font-size:1.8rem; font-weight:bold;">${bsData.onzeCode}</span>
                    </div>
                </div>
                
                <h4 style="margin:0 0 5px 0; color:#34495e;">Tegenstanders</h4>
                ${lijstHtml}
                
                ${schemaWeergave}
            </div>
        `;
    });
};

window.wisAlleData = function() {
    if(confirm("Weet je zeker dat je alles wilt wissen?")) {
        localStorage.removeItem('blackshots_poule_data');
        localStorage.removeItem('blackshots_poule_teams');
        localStorage.removeItem('blackshots_wedstrijden_json');
        location.reload();
    }
};