// --- BASKETBAL_POULEINDELING.JS: VOLLEDIG NEDERLANDS & KOGELVRIJ ---

window.bsTeams = JSON.parse(localStorage.getItem('blackshots_poule_teams')) || [];
window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
window.plantoolJSON = null; 

document.addEventListener('DOMContentLoaded', () => {
    if (window.bsTeams.length > 0) {
        document.getElementById('stap-2-box').style.opacity = '1';
        document.getElementById('stap-2-box').style.pointerEvents = 'all';
    }
    if (window.nbbWedstrijden.length > 0) {
        document.getElementById('label-json').innerText = `✅ JSON Definitief ingeladen!`;
    }
    tekenPouleResultaten();
});

// ============================================================================
// DE NEDERLANDSE DATUM VERTALERS
// ============================================================================

// 1. Voor het Concept Schema (Plantool Excel)
function maakDatumTekst(ruweTekst) {
    if (!ruweTekst) return "Datum onbekend";
    let val = ruweTekst.toString().trim();

    if (val.toLowerCase().includes('week')) {
        let weekNr = val.replace(/week/ig, '').trim();
        return "Speelronde: Week " + weekNr;
    }

    let vertaald = val.replace(/-/g, ' ');
    vertaald = vertaald.replace(/\bJan\b/ig, 'januari')
                       .replace(/\bFeb\b/ig, 'februari')
                       .replace(/\bMar\b/ig, 'maart')
                       .replace(/\bApr\b/ig, 'april')
                       .replace(/\bMay\b/ig, 'mei')
                       .replace(/\bJun\b/ig, 'juni')
                       .replace(/\bJul\b/ig, 'juli')
                       .replace(/\bAug\b/ig, 'augustus')
                       .replace(/\bSep\b/ig, 'september')
                       .replace(/\bOct\b/ig, 'oktober')
                       .replace(/\bNov\b/ig, 'november')
                       .replace(/\bDec\b/ig, 'december');

    return "Weekend van " + vertaald;
}

// 2. Voor het Definitieve Schema (JSON)
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
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        window.bsTeams = [];
        ruweData.forEach(rij => {
            let vereniging = (rij['Vereniging'] || rij['vereniging'] || '').toString();
            if (vereniging.toLowerCase().includes('black shots')) {
                let pouleNaam = rij['Poule'] || rij['poule'] || 'Onbekend';
                let teamNaam = rij['Team'] || rij['team'] || 'Onbekend Team';
                
                if (!window.bsTeams.find(t => t.pouleNaam === pouleNaam && t.teamNaam === teamNaam)) {
                    let tegenstanders = ruweData.filter(r => (r['Poule'] || r['poule']) === pouleNaam);
                    tegenstanders.sort((a, b) => parseInt(a['Code'] || a['code'] || 0) - parseInt(b['Code'] || b['code'] || 0));
                    window.bsTeams.push({
                        teamNaam, pouleNaam, onzeCode: rij['Code'] || rij['code'] || '?',
                        schemaType: rij['Speelschema'] || rij['speelschema'] || 'Onbekend',
                        pouleGrootte: tegenstanders.length, tegenstanders, conceptSchema: [] 
                    });
                }
            }
        });
        localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams));
        document.getElementById('stap-2-box').style.opacity = '1';
        document.getElementById('stap-2-box').style.pointerEvents = 'all';
        document.getElementById('label-indeling').innerText = `✅ Ingeladen: ${file.name}`;
        tekenPouleResultaten();
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL
// ============================================================================
window.verwerkPlantoolBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-plantool').innerText = `⏳ Macro ontcijferen...`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        window.plantoolJSON = {};
        workbook.SheetNames.forEach(name => {
            window.plantoolJSON[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {header: 1, raw: false, defval: ""});
        });
        document.getElementById('label-plantool').innerText = `✅ Klaar! Selecteer tabbladen.`;
        tekenPouleResultaten(); 
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// DE KRAKER (Zoekt in A t/m F naar de datum, in G+ naar de wedstrijd)
// ============================================================================
window.genereerSchemaVoorTeam = function(index) {
    let selectEl = document.getElementById(`plantool-select-${index}`);
    if (!selectEl) return;
    let sheetNaam = selectEl.value;
    if (!sheetNaam) return alert("Kies een tabblad!");

    let bsData = window.bsTeams[index];
    let sheetGrid = window.plantoolJSON[sheetNaam];
    let berekendeWedstrijden = [];
    let onzeCode = parseInt(bsData.onzeCode);
    let huidigWeekend = "Geen datum gevonden"; 

    sheetGrid.forEach((row) => {
        row.slice(0, 6).forEach(cel => {
            if (!cel) return;
            let val = cel.toString().trim();
            let lw = val.toLowerCase();
            if (lw.match(/(jan|feb|mar|mrt|apr|may|mei|jun|jul|aug|sep|oct|okt|nov|dec|week)/) || val.match(/\d{1,2}[-/]\d{1,2}/)) {
                huidigWeekend = val;
            }
        });

        let heeftMatch = false;
        row.slice(6).forEach(cel => {
            if(typeof cel === 'string' && cel.match(/^(\d+)\s*-\s*(\d+)$/)) heeftMatch = true;
        });

        if (heeftMatch) {
            row.slice(6).forEach(cel => {
                if(typeof cel === 'string') {
                    let match = cel.match(/^(\d+)\s*-\s*(\d+)$/);
                    if (match) {
                        let codeA = parseInt(match[1]);
                        let codeB = parseInt(match[2]);
                        
                        if (codeA === onzeCode || codeB === onzeCode) {
                            let tegenstanderCode = (codeA === onzeCode) ? codeB : codeA;
                            let tegTeam = bsData.tegenstanders.find(t => parseInt(t.Code||t.code||0) === tegenstanderCode);
                            let tegNaam = tegTeam ? (tegTeam.Vereniging || tegTeam.vereniging) : `Team ${tegenstanderCode}`;
                            
                            berekendeWedstrijden.push({ 
                                weekend: maakDatumTekst(huidigWeekend), 
                                thuis: (codeA === onzeCode), 
                                tegenstander: tegNaam || "--- VRIJE PLEK ---"
                            });
                        }
                    }
                }
            });
        }
    });

    window.bsTeams[index].conceptSchema = berekendeWedstrijden;
    localStorage.setItem('blackshots_poule_teams', JSON.stringify(window.bsTeams));
    alert(`✅ ${berekendeWedstrijden.length} wedstrijden gevonden en vertaald!`);
    tekenPouleResultaten();
};

// ============================================================================
// STAP 3: DEFINITIEVE NBB JSON
// ============================================================================
window.verwerkNBBJson = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        window.nbbWedstrijden = JSON.parse(e.target.result);
        localStorage.setItem('blackshots_wedstrijden_json', JSON.stringify(window.nbbWedstrijden));
        tekenPouleResultaten(); 
    };
    reader.readAsText(file);
};

// ============================================================================
// UI TEKENEN
// ============================================================================
window.tekenPouleResultaten = function() {
    let container = document.getElementById('poule-resultaten');
    container.innerHTML = '';
    
    if (window.bsTeams.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Upload eerst de Poule Indeling...</p>';
        return;
    }

    window.bsTeams.forEach((bsData, index) => {
        let heeftConcept = bsData.conceptSchema && bsData.conceptSchema.length > 0;
        
        let schemaHtml = '';
        if (window.plantoolJSON) {
            let opties = '<option value="">-- Kies NBB Tabblad --</option>';
            Object.keys(window.plantoolJSON).forEach(sheet => {
                let selected = (bsData.schemaType.toLowerCase().includes(sheet.toLowerCase())) ? 'selected' : '';
                opties += `<option value="${sheet}" ${selected}>${sheet}</option>`;
            });
            schemaHtml = `<div style="margin-top:15px;"><select id="plantool-select-${index}" style="width:100%; padding:8px;">${opties}</select><button onclick="genereerSchemaVoorTeam(${index})" style="margin-top:5px; width:100%; background:#e67e22; color:white; border:none; padding:8px; cursor:pointer;">📅 Bereken</button></div>`;
        }

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

        container.innerHTML += `
            <div class="poule-card">
                <h3 style="margin: 0 0 5px 0;">${bsData.teamNaam}</h3>
                <p style="margin: 0 0 15px 0; color: #7f8c8d; font-size: 0.9rem;">Poule: ${bsData.pouleNaam} | Code: <strong style="color:#e67e22;">${bsData.onzeCode}</strong></p>
                ${schemaHtml}
                ${heeftConcept ? `<button onclick="openSchemaModal(${index})" style="width:100%; margin-top:10px; background:#3498db; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer;">👀 Bekijk Schema</button>` : ''}
            </div>
        `;
    });
};

window.openSchemaModal = function(index) {
    let bsData = window.bsTeams[index];
    document.getElementById('modal-titel').innerText = `Schema: ${bsData.teamNaam}`;
    document.getElementById('modal-inhoud').innerHTML = '<ul class="schema-lijst">' + 
        bsData.conceptSchema.map(m => `
            <li style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <strong style="color:#34495e;">${m.weekend}</strong><br>
                ${m.thuis ? '🏠 Thuis' : '🚌 Uit'} tegen <strong>${m.tegenstander}</strong>
            </li>
        `).join('') + 
        '</ul>';
    document.getElementById('schema-modal').style.display = 'flex';
};

window.sluitSchemaModal = function() { document.getElementById('schema-modal').style.display = 'none'; };
window.wisAlleData = function() { localStorage.clear(); location.reload(); };