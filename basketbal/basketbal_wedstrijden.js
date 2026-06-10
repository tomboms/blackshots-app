// --- BASKETBAL_WEDSTRIJDEN.JS: DE POULE & SCHEMA KRAKER ---

window.pouleData = []; // De ruwe data uit de Indeling
window.bsTeams = [];   // Gevonden Black Shots teams en hun poules
window.plantoolWorkbook = null; // Het ingeladen NBB Macro bestand

// ============================================================================
// STAP 1: LEES DE POULE INDELING (CSV / Excel)
// ============================================================================
window.verwerkPouleBestand = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('label-indeling').innerText = `✅ Ingeladen: ${file.name}`;
    document.getElementById('label-indeling').style.color = '#27ae60';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        // Pak het eerste tabblad
        const firstSheetNaam = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetNaam];
        
        // Zet om naar een werkbare JSON lijst
        window.pouleData = XLSX.utils.sheet_to_json(worksheet);
        
        // Start de zoektocht!
        zoekBlackShotsInPoules();
    };
    reader.readAsArrayBuffer(file);
};

window.zoekBlackShotsInPoules = function() {
    window.bsTeams = [];
    
    window.pouleData.forEach(rij => {
        let vereniging = rij['Vereniging'] || rij['vereniging'] || '';
        
        // Zoek naar ons cluppie!
        if (vereniging.toLowerCase().includes('black shots')) {
            let pouleNaam = rij['Poule'] || rij['poule'] || 'Onbekend';
            let teamNaam = rij['Team'] || rij['team'] || 'Onbekend Team';
            let onzeCode = rij['Code'] || rij['code'] || '?';
            let schemaType = rij['Speelschema'] || rij['speelschema'] || 'Onbekend';

            // Nu we weten in welke poule dit team zit, zoeken we ALLE tegenstanders in deze poule op
            let tegenstanders = window.pouleData.filter(r => (r['Poule'] || r['poule']) === pouleNaam);
            
            // Sorteer ze netjes op Code (1 t/m 12)
            tegenstanders.sort((a, b) => parseInt(a['Code'] || a['code']) - parseInt(b['Code'] || b['code']));

            window.bsTeams.push({
                teamNaam: teamNaam,
                pouleNaam: pouleNaam,
                onzeCode: onzeCode,
                schemaType: schemaType,
                pouleGrootte: tegenstanders.length, // Zo weten we of het een poule van 6, 8 of 12 is!
                tegenstanders: tegenstanders
            });
        }
    });

    tekenPouleResultaten();
    
    // Ontgrendel stap 2!
    document.getElementById('stap-2-box').style.opacity = '1';
    document.getElementById('stap-2-box').style.pointerEvents = 'all';
};

window.tekenPouleResultaten = function() {
    let container = document.getElementById('poule-resultaten');
    container.innerHTML = '';

    if (window.bsTeams.length === 0) {
        container.innerHTML = '<div style="background:#fdedec; border:1px solid #e74c3c; padding:20px; border-radius:8px; color:#c0392b;"><strong>Geen Black Shots gevonden!</strong> Weet je zeker dat je het juiste bestand hebt geüpload?</div>';
        return;
    }

    window.bsTeams.forEach((bsData, index) => {
        let lijstHtml = `<table class="team-lijst">
            <tr><th>Code</th><th>Vereniging</th><th>Team</th></tr>`;
        
        bsData.tegenstanders.forEach(tg => {
            let isOns = (tg['Vereniging'] || '').toLowerCase().includes('black shots');
            let trClass = isOns ? 'class="is-ons-team"' : '';
            lijstHtml += `
                <tr ${trClass}>
                    <td><strong>${tg['Code'] || tg['code'] || '?'}</strong></td>
                    <td>${tg['Vereniging'] || tg['vereniging'] || '?'}</td>
                    <td>${tg['Team'] || tg['team'] || '?'}</td>
                </tr>`;
        });
        lijstHtml += `</table>`;

        // Een knop voor Stap 2 (Wordt pas actief als de plantool is geladen)
        let plantoolKnopHtml = `
            <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;">
                <label style="font-size:0.85rem; font-weight:bold; color:#7f8c8d; display:block; margin-bottom:5px;">Koppel aan NBB Plantool Tabblad:</label>
                <select id="plantool-select-${index}" style="width:100%; padding:10px; border-radius:4px; border:1px solid #bdc3c7; margin-bottom:10px;" disabled>
                    <option>Upload eerst de Plantool (.xlsm) hierboven!</option>
                </select>
                <button id="plantool-btn-${index}" onclick="genereerSchemaVoorTeam(${index})" style="width:100%; background:#bdc3c7; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:not-allowed;" disabled>📅 Bereken Wedstrijden</button>
            </div>
        `;

        container.innerHTML += `
            <div class="poule-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 5px 0; color:var(--secondary-color); font-size:1.4rem;">${bsData.teamNaam}</h3>
                        <div style="font-size:0.9rem; color:#7f8c8d; margin-bottom:15px;">
                            <strong>Poule:</strong> ${bsData.pouleNaam} <br>
                            <strong>Schema Advies NBB:</strong> ${bsData.schemaType} <br>
                            <strong>Poule Grootte:</strong> ${bsData.pouleGrootte} teams
                        </div>
                    </div>
                    <div style="background:#e67e22; color:white; padding:10px 15px; border-radius:8px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                        <span style="font-size:0.8rem; text-transform:uppercase; font-weight:bold; display:block;">Onze Code</span>
                        <span style="font-size:1.8rem; font-weight:bold;">${bsData.onzeCode}</span>
                    </div>
                </div>
                
                <h4 style="margin:0 0 5px 0; color:#34495e;">Tegenstanders</h4>
                ${lijstHtml}
                
                ${plantoolKnopHtml}
                
                <div id="schema-uitslag-${index}" style="margin-top:15px;"></div>
            </div>
        `;
    });
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL (.xlsm)
// ============================================================================
window.verwerkPlantoolBestand = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('label-plantool').innerText = `✅ Ingeladen: ${file.name}`;
    document.getElementById('label-plantool').style.color = '#8e44ad';

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        // We laden het zware Macro bestand in!
        window.plantoolWorkbook = XLSX.read(data, {type: 'array'});
        
        // Activeer alle dropdowns in de gemaakte kaarten
        window.bsTeams.forEach((bsData, index) => {
            let selectBox = document.getElementById(`plantool-select-${index}`);
            let rekenKnop = document.getElementById(`plantool-btn-${index}`);
            
            if (selectBox) {
                selectBox.innerHTML = '<option value="">-- Kies het juiste schema tabblad --</option>';
                // Vul de dropdown met alle Tabbladen uit de Plantool (Bijv. "Schema 12", "Schema 8")
                window.plantoolWorkbook.SheetNames.forEach(sheetName => {
                    // Probeer slim voor te selecteren
                    let selected = '';
                    if (bsData.schemaType.toLowerCase().includes(sheetName.toLowerCase())) selected = 'selected';
                    
                    selectBox.innerHTML += `<option value="${sheetName}" ${selected}>${sheetName}</option>`;
                });
                selectBox.disabled = false;
            }
            if (rekenKnop) {
                rekenKnop.disabled = false;
                rekenKnop.style.background = '#9b59b6';
                rekenKnop.style.cursor = 'pointer';
            }
        });
        
        alert("NBB Plantool succesvol ingeladen! Je kunt nu per team het schema berekenen.");
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// STAP 3: BEREKEN HET SCHEMA
// ============================================================================
window.genereerSchemaVoorTeam = function(index) {
    let bsData = window.bsTeams[index];
    let sheetNaam = document.getElementById(`plantool-select-${index}`).value;
    
    if(!sheetNaam) return alert("Selecteer eerst een tabblad!");
    
    let sheet = window.plantoolWorkbook.Sheets[sheetNaam];
    // Lees het tabblad uit als een grote matrix (array van arrays)
    let rawData = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
    
    let uitslagVak = document.getElementById(`schema-uitslag-${index}`);
    uitslagVak.innerHTML = `<div style="background:#e8f8f5; border:1px solid #27ae60; padding:15px; border-radius:6px; margin-top:15px;">
        <strong style="color:#27ae60;">Module 1 Geslaagd!</strong><br>
        De plantool is gekraakt. We weten dat ons team <strong>Code ${bsData.onzeCode}</strong> is in een poule van <strong>${bsData.pouleGrootte}</strong>.<br><br>
        <em>Nu de connectie succesvol ligt, kan ik de Matchmaker bouwen om de speeldata in de Agenda te schieten!</em>
    </div>`;
};