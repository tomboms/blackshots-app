// --- BASKETBAL_WEDSTRIJDEN.JS: CLOUD SYNC, POP-UPS, MATCHMAKER & MOOIE DATUMS ---

window.bsTeams = JSON.parse(localStorage.getItem('blackshots_poule_teams')) || [];
window.pouleData = JSON.parse(localStorage.getItem('blackshots_poule_data')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.plantoolJSON = JSON.parse(localStorage.getItem('bs_temp_plantool')) || null; 

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
// HULPFUNCTIE: DATUMS MOOI MAKEN (Menselijke weergave)
// ============================================================================
function maakMooieDatum(datumStr, tijdStr, accommodatie) {
    if (!datumStr) return "Datum onbekend";
    try {
        let d = new Date(datumStr);
        const dagen = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
        let dag = dagen[d.getDay()];
        
        // Zorg voor voorloopnullen (bijv. 01 ipv 1)
        let dagNummer = d.getDate().toString().padStart(2, '0');
        let maandNummer = (d.getMonth() + 1).toString().padStart(2, '0');
        let jaar = d.getFullYear();
        
        let tijd = tijdStr ? tijdStr.substring(0, 5) : ''; // "10:30" ipv "10:30:00"
        let locatie = accommodatie ? ` in ${accommodatie}` : '';
        
        return `${dag} ${dagNummer}-${maandNummer}-${jaar}${tijd ? ' om ' + tijd : ''}${locatie}`;
    } catch(e) {
        return datumStr; // Fallback als datum onleesbaar is
    }
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
    
    if (window.plantoolJSON) koppelSchemaAanTeams();
    tekenPouleResultaten();
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL (.xlsm) (FIX: raw false dwingt tekst ipv excel cijfers!)
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
            // raw: false is cruciaal! Hierdoor worden datums als "13-sep" gelezen ipv "45182"
            window.plantoolJSON[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {header: 1, raw: false, defval: ""});
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
            genereerSchemaVoorTeam(index, besteTab);
        }
    });
};

// ============================================================================
// DE ECHTE KRAKER (FIX: Scant rijen zonder te verdwalen in lege cellen)
// ============================================================================
window.genereerSchemaVoorTeam = function(index, sheetNaam) {
    let bsData = window.bsTeams[index];
    let sheetGrid = window.plantoolJSON[sheetNaam];
    let berekendeWedstrijden = [];
    let onzeCode = parseInt(bsData.onzeCode);

    sheetGrid.forEach((row) => {
        let heeftMatch = false;
        
        // Scan of deze rij überhaupt een wedstrijd in zich heeft ("1-6")
        row.forEach(cel => {
            if(typeof cel === 'string' && cel.match(/(\d+)\s*-\s*(\d+)/)) heeftMatch = true;
        });

        // Zo ja, dan plukken we de datum eruit (meestal de eerste of tweede cel op de rij)
        if (heeftMatch) {
            let weekendLabel = (row[0] || row[1] || row[2] || "Weekend onbekend").toString().trim();
            
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
    localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams));
    tekenPouleResultaten();
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
        document.getElementById('label-json').innerText = `✅ Ingeladen!`;
        tekenPouleResultaten(); 
    };
    reader.readAsText(file);
};


// ============================================================================
// SCHERM OPBOUW (UI) & MODAL LOGICA
// ============================================================================
window.tekenPouleResultaten = function() {
    let container = document.getElementById('poule-resultaten');
    container.innerHTML = '';

    if (window.bsTeams.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Upload eerst de Poule Indeling...</p>';
        return;
    }

    window.bsTeams.forEach((bsData, index) => {
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

        // Checkt of er iéts is om te laten zien in de pop-up
        let heeftConcept = bsData.conceptSchema && bsData.conceptSchema.length > 0;
        let teamWedstrijden = window.nbbWedstrijden.filter(w => 
            (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots') && w.Thuisteam.includes(bsData.teamNaam)) || 
            (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots') && w.Uitteam.includes(bsData.teamNaam))
        );
        let heeftDefinitief = teamWedstrijden.length > 0;

        let actieSectieHtml = '';
        if (heeftConcept || heeftDefinitief) {
            actieSectieHtml = `<button onclick="openSchemaModal(${index})" style="width:100%; margin-top:20px; background:#3498db; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition:0.2s;" onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">📅 Bekijk Speelschema</button>`;
        } else {
            actieSectieHtml = `
                <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;" id="plantool-sectie-${index}">
                    <p style="font-size:0.85rem; color:#e74c3c; font-style:italic; margin:0;">Upload de Plantool of JSON hierboven om de kalender te genereren...</p>
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
            </div>
        `;
    });
};

// ============================================================================
// MODAL (POP-UP) LOGICA MET MOOIE DATUMS
// ============================================================================
window.openSchemaModal = function(index) {
    let bsData = window.bsTeams[index];
    
    document.getElementById('modal-titel').innerText = `Schema: ${bsData.teamNaam}`;
    document.getElementById('modal-subtitel').innerText = `Poule: ${bsData.pouleNaam} | Code: ${bsData.onzeCode}`;
    
    let modalInhoud = document.getElementById('modal-inhoud');
    modalInhoud.innerHTML = '';

    // Deel 1: Definitieve JSON (Nu met de mooie datum string!)
    let teamWedstrijden = window.nbbWedstrijden.filter(w => 
        (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots') && w.Thuisteam.includes(bsData.teamNaam)) || 
        (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots') && w.Uitteam.includes(bsData.teamNaam))
    );

    if (teamWedstrijden.length > 0) {
        let defHtml = `<h3 style="margin:0 0 10px 0; color:#9b59b6; border-bottom:2px solid #9b59b6; padding-bottom:5px;">✅ Definitieve Planning (NBB JSON)</h3><ul class="schema-lijst" style="margin-bottom:30px;">`;
        
        teamWedstrijden.forEach(w => {
            let isThuis = w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots') && w.Thuisteam.includes(bsData.teamNaam);
            let tegenstander = isThuis ? w.Uitteam : w.Thuisteam;
            let badgeClass = w.Status === 'Te plannen' ? 'status-te-plannen' : 'status-gepland';
            
            // Toepassen van de Vertaler!
            let weergaveDatum = maakMooieDatum(w.Datum, w.Tijd, w.Accommodatie); 
            
            defHtml += `
                <li style="border-left: 4px solid #9b59b6;">
                    <div style="flex:1;">
                        <strong style="color:#34495e; font-size:1rem;">${weergaveDatum}</strong><br>
                        <span style="font-size:1rem;">
                            ${isThuis ? '🏠 Thuis tegen:' : '🚌 Uit tegen:'} 
                            <strong>${tegenstander}</strong>
                        </span>
                    </div>
                    <div style="text-align:right;">
                        <span class="status-badge ${badgeClass}">${w.Status}</span>
                    </div>
                </li>`;
        });
        defHtml += `</ul>`;
        modalInhoud.innerHTML += defHtml;
    }

    // Deel 2: Concept Schema (Plantool)
    if (bsData.conceptSchema && bsData.conceptSchema.length > 0) {
        let conceptHtml = `<h3 style="margin:0 0 10px 0; color:#3498db; border-bottom:2px solid #3498db; padding-bottom:5px;">📅 Concept Schema (Plantool)</h3><ul class="schema-lijst">`;
        
        bsData.conceptSchema.forEach(match => {
            let statusBadge = match.tegenstander === "--- VRIJE PLEK ---" 
                ? `<span class="status-badge" style="background:#e74c3c;">VRIJ</span>` 
                : `<span class="status-badge status-concept">Concept</span>`;
            
            conceptHtml += `
                <li>
                    <div style="flex:1;">
                        <strong style="color:#34495e; font-size:1.1rem;">Weekend van ${match.weekend}</strong><br>
                        <span style="font-size:1rem;">
                            ${match.thuis ? '🏠 Thuis tegen:' : '🚌 Uit tegen:'} 
                            <strong>${match.tegenstander}</strong>
                        </span>
                    </div>
                    <div>${statusBadge}</div>
                </li>`;
        });
        conceptHtml += `</ul>`;
        
        if (teamWedstrijden.length > 0) {
            conceptHtml = `<div style="margin-top:20px; padding:15px; background:#f8f9fa; border-radius:8px;">${conceptHtml}</div>`;
        }
        modalInhoud.innerHTML += conceptHtml;
    }

    document.getElementById('schema-modal').style.display = 'flex';
};

window.sluitSchemaModal = function() {
    document.getElementById('schema-modal').style.display = 'none';
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