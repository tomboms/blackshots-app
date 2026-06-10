// --- BASKETBAL_WEDSTRIJDEN.JS: CLOUD SYNC & DE WEDSTRIJD MATCHMAKER ---

// 1. DATA INLADEN UIT CLOUD/GEHEUGEN (Let op de 'blackshots_' prefix voor Firebase!)
window.bsTeams = JSON.parse(localStorage.getItem('blackshots_poule_teams')) || [];
window.pouleData = JSON.parse(localStorage.getItem('blackshots_poule_data')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];

window.plantoolJSON = JSON.parse(localStorage.getItem('bs_temp_plantool')) || null; // Deze gaat NIET naar firebase (te groot)

document.addEventListener('DOMContentLoaded', () => {
    if (window.bsTeams.length > 0) {
        document.getElementById('stap-2-box').style.opacity = '1';
        document.getElementById('stap-2-box').style.pointerEvents = 'all';
    }
    if (window.plantoolJSON) {
        document.getElementById('label-plantool').innerText = `✅ Plantool zit in geheugen!`;
    }
    if (window.nbbWedstrijden.length > 0) {
        document.getElementById('label-json').innerText = `✅ JSON Definitief ingeladen!`;
    }
    tekenPouleResultaten();
});

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
        
        localStorage.setItem('blackshots_poule_data', JSON.stringify(window.pouleData)); // FIREBASE SYNC!
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
                    conceptSchema: [] // Hierin gaan we de matches opslaan!
                });
            }
        }
    });

    localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams)); // FIREBASE SYNC!
    document.getElementById('stap-2-box').style.opacity = '1';
    document.getElementById('stap-2-box').style.pointerEvents = 'all';
    
    if (window.plantoolJSON) koppelSchemaAanTeams();
    tekenPouleResultaten();
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL (.xlsm)
// ============================================================================
window.verwerkPlantoolBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-plantool').innerText = `⏳ Lade (Dit kan even duren)...`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        window.plantoolJSON = {};
        
        workbook.SheetNames.forEach(name => {
            // We lezen hem als een 2D grid in ('header: 1') zodat we makkelijk over rijen kunnen lopen
            window.plantoolJSON[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {header: 1});
        });
        
        try { localStorage.setItem('bs_temp_plantool', JSON.stringify(window.plantoolJSON)); } catch(err) { console.warn("Te groot voor cache"); }
        document.getElementById('label-plantool').innerText = `✅ Ingeladen!`;
        koppelSchemaAanTeams();
    };
    reader.readAsArrayBuffer(file);
};

window.koppelSchemaAanTeams = function() {
    if (!window.plantoolJSON || window.bsTeams.length === 0) return;
    let tabNamen = Object.keys(window.plantoolJSON);

    window.bsTeams.forEach((bsData, index) => {
        let sectie = document.getElementById(`plantool-sectie-${index}`);
        if(!sectie) return;

        let schemaGezocht = bsData.schemaType.toLowerCase().trim();
        let besteTab = tabNamen.find(t => t.toLowerCase().trim() === schemaGezocht) || 
                       tabNamen.find(t => schemaGezocht.includes(t.toLowerCase().trim()) || t.toLowerCase().trim().includes(schemaGezocht));

        if (besteTab) {
            sectie.innerHTML = `
                <div style="background:#fdf2e9; padding:12px; border-radius:6px; border:1px solid #e67e22; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:0.8rem; color:#d35400; font-weight:bold; display:block;">Tabblad: ${besteTab}</span>
                    </div>
                    <button onclick="genereerSchemaVoorTeam(${index}, '${besteTab}')" style="background:#8e44ad; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">📅 Bereken</button>
                </div>
            `;
        }
    });
};

// ============================================================================
// DE INTELLIGENTE KRAKER: ZOEK ONZE WEDSTRIJDEN IN DE PLANTOOL!
// ============================================================================
window.genereerSchemaVoorTeam = function(index, sheetNaam) {
    let bsData = window.bsTeams[index];
    let sheetGrid = window.plantoolJSON[sheetNaam];
    let berekendeWedstrijden = [];
    let onzeCode = parseInt(bsData.onzeCode);

    // Loop door elke rij in het Excel bestand
    sheetGrid.forEach((row) => {
        // We zoeken naar een "Datum" of "Speelweekend" in de eerste paar cellen
        let weekendLabel = row[0] || row[1] || "";
        if (typeof weekendLabel !== 'string') weekendLabel = weekendLabel.toString();
        
        let bevatDatum = weekendLabel.toLowerCase().includes('jan') || weekendLabel.toLowerCase().includes('feb') || 
                         weekendLabel.toLowerCase().includes('mrt') || weekendLabel.toLowerCase().includes('apr') || 
                         weekendLabel.toLowerCase().includes('mei') || weekendLabel.toLowerCase().includes('jun') || 
                         weekendLabel.toLowerCase().includes('jul') || weekendLabel.toLowerCase().includes('aug') || 
                         weekendLabel.toLowerCase().includes('sep') || weekendLabel.toLowerCase().includes('okt') || 
                         weekendLabel.toLowerCase().includes('nov') || weekendLabel.toLowerCase().includes('dec') ||
                         weekendLabel.toLowerCase().includes('weekend');

        if (bevatDatum) {
            // Nu zoeken we in deze rij naar een match notatie (bijv "1-6" of "12 - 4")
            row.forEach(cel => {
                if(typeof cel === 'string') {
                    // Regex die zoekt naar [cijfer] streepje [cijfer]
                    let match = cel.match(/(\d+)\s*-\s*(\d+)/);
                    if (match) {
                        let codeA = parseInt(match[1]);
                        let codeB = parseInt(match[2]);

                        // Spelen wij in deze cel?
                        if (codeA === onzeCode || codeB === onzeCode) {
                            let tegenstanderCode = (codeA === onzeCode) ? codeB : codeA;
                            let thuisSpelend = (codeA === onzeCode);
                            
                            // Zoek de naam van de tegenstander op
                            let tegTeam = bsData.tegenstanders.find(t => parseInt(t.Code||t.code||0) === tegenstanderCode);
                            let tegNaam = tegTeam ? (tegTeam.Vereniging || tegTeam.vereniging) : `Team ${tegenstanderCode}`;
                            if (!tegNaam || tegNaam.trim() === '') tegNaam = "--- VRIJE PLEK ---";

                            berekendeWedstrijden.push({
                                weekend: weekendLabel,
                                thuis: thuisSpelend,
                                tegenstander: tegNaam
                            });
                        }
                    }
                }
            });
        }
    });

    // Sla het resultaat op en bewaar in Firebase!
    window.bsTeams[index].conceptSchema = berekendeWedstrijden;
    localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams));
    tekenPouleResultaten();
};


// ============================================================================
// STAP 3: LEES DE DEFINITIEVE NBB JSON (DE PLANNING FAZE)
// ============================================================================
window.verwerkNBBJson = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-json').innerText = `⏳ Lade...`;

    const reader = new FileReader();
    reader.onload = function(e) {
        window.nbbWedstrijden = JSON.parse(e.target.result);
        localStorage.setItem('blackshots_wedstrijden_json', JSON.stringify(window.nbbWedstrijden)); // FIREBASE SYNC!
        document.getElementById('label-json').innerText = `✅ Ingeladen!`;
        tekenPouleResultaten(); // UI updaten
    };
    reader.readAsText(file);
};


// ============================================================================
// SCHERM OPBOUW: ALLES SAMENVOEGEN
// ============================================================================
window.tekenPouleResultaten = function() {
    let container = document.getElementById('poule-resultaten');
    container.innerHTML = '';

    if (window.bsTeams.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Upload eerst de Poule Indeling...</p>';
        return;
    }

    window.bsTeams.forEach((bsData, index) => {
        // --- 1. TEGENSTANDERS LIJST ---
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

        // --- 2. HET BEREKENDE CONCEPT SCHEMA (PLANTOOL) ---
        let conceptHtml = '';
        if (bsData.conceptSchema && bsData.conceptSchema.length > 0) {
            conceptHtml = `<h4 style="margin:20px 0 5px 0; color:#3498db;">📅 Concept Schema (Plantool)</h4><ul class="schema-lijst">`;
            bsData.conceptSchema.forEach(match => {
                let statusBadge = match.tegenstander === "--- VRIJE PLEK ---" 
                    ? `<span class="status-badge" style="background:#e74c3c;">VRIJ</span>` 
                    : `<span class="status-badge status-concept">Concept</span>`;
                
                conceptHtml += `
                    <li>
                        <div style="flex:1;">
                            <strong style="color:#34495e;">${match.weekend}</strong><br>
                            <span style="font-size:0.9rem;">
                                ${match.thuis ? '🏠 Thuis tegen:' : '🚌 Uit tegen:'} 
                                <strong>${match.tegenstander}</strong>
                            </span>
                        </div>
                        <div>${statusBadge}</div>
                    </li>`;
            });
            conceptHtml += `</ul>`;
        }

        // --- 3. DE DEFINITIEVE JSON WEDSTRIJDEN (NBB) ---
        let defHtml = '';
        if (window.nbbWedstrijden.length > 0) {
            // Zoek in de JSON of dit team erin zit (bijv "Black Shots - X12-1")
            let teamWedstrijden = window.nbbWedstrijden.filter(w => 
                (w.Thuisteam && w.Thuisteam.includes(bsData.teamNaam)) || 
                (w.Uitteam && w.Uitteam.includes(bsData.teamNaam))
            );

            if (teamWedstrijden.length > 0) {
                defHtml = `<h4 style="margin:20px 0 5px 0; color:#9b59b6;">✅ Definitieve Planning (NBB)</h4><ul class="schema-lijst">`;
                
                teamWedstrijden.forEach(w => {
                    let isThuis = w.Thuisteam.includes(bsData.teamNaam);
                    let tegenstander = isThuis ? w.Uitteam : w.Thuisteam;
                    
                    let badgeClass = w.Status === 'Te plannen' ? 'status-te-plannen' : 'status-gepland';
                    let weergaveDatum = w.Datum ? w.Datum.substring(0,10) : 'Ntb'; // Alleen de YYYY-MM-DD
                    
                    defHtml += `
                        <li style="border-left: 4px solid #9b59b6;">
                            <div style="flex:1;">
                                <strong style="color:#34495e;">${weergaveDatum} om ${w.Tijd || '?'}</strong><br>
                                <span style="font-size:0.9rem;">
                                    ${isThuis ? '🏠 Thuis tegen:' : '🚌 Uit tegen:'} 
                                    <strong>${tegenstander}</strong>
                                </span>
                            </div>
                            <div style="text-align:right;">
                                <span class="status-badge ${badgeClass}">${w.Status}</span>
                                <div style="font-size:0.75rem; color:#7f8c8d; margin-top:3px;">📍 ${w.Accommodatie}</div>
                            </div>
                        </li>`;
                });
                defHtml += `</ul>`;
                
                // Als we definitieve wedstrijden hebben, overschrijft dit eigenlijk het concept
                conceptHtml = `<div style="margin-top:15px; font-size:0.85rem; color:#7f8c8d; font-style:italic;">Concept schema verborgen omdat de definitieve JSON actief is.</div>`;
            }
        }

        // De fallback als stap 2 of 3 nog niet is gedaan
        let actieSectieHtml = `<div id="plantool-sectie-${index}" style="margin-top:15px;"></div>`;
        if (conceptHtml === '' && defHtml === '') {
            actieSectieHtml = `
                <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;" id="plantool-sectie-${index}">
                    <p style="font-size:0.85rem; color:#e74c3c; font-style:italic;">Upload de Plantool of JSON hierboven om de kalender te genereren...</p>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="poule-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 5px 0; color:var(--secondary-color); font-size:1.4rem;">${bsData.teamNaam}</h3>
                        <div style="font-size:0.9rem; color:#7f8c8d; margin-bottom:15px;">
                            <strong>Poule:</strong> ${bsData.pouleNaam} <br>
                            <strong>NBB Schema:</strong> ${bsData.schemaType} <br>
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
                
                ${actieSectieHtml}
                ${conceptHtml}
                ${defHtml}
            </div>
        `;
    });
};

window.wisAlleData = function() {
    if(confirm("Weet je zeker dat je alle Poules en Schema's uit het geheugen wilt wissen?")) {
        localStorage.removeItem('blackshots_poule_data');
        localStorage.removeItem('blackshots_poule_teams');
        localStorage.removeItem('blackshots_wedstrijden_json');
        localStorage.removeItem('bs_temp_plantool');
        location.reload();
    }
};