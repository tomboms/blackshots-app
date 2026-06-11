// --- BASKETBAL_POULEINDELING.JS: FIREBASE CLOUD SYNC ACTIEF ---

// ============================================================================
// CLOUD SYNC MOTOR
// ============================================================================
window.slaDataOp = function(sleutel, data) {
    localStorage.setItem(sleutel, JSON.stringify(data));
    if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase(sleutel, data);
    else if (typeof window.bewaarNaarFirebase === 'function') window.bewaarNaarFirebase(sleutel, data);
    else document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: sleutel, data: data } }));
};

// Luisteraar voor binnenkomende Cloud data!
window.ontvangCloudDataPoule = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_poule_teams') {
        window.bsTeams = data;
        if (window.bsTeams.length > 0) {
            let s2 = document.getElementById('stap-2-box');
            if(s2) { s2.style.opacity = '1'; s2.style.pointerEvents = 'all'; }
        }
    }
    if (sleutel === 'blackshots_wedstrijden_json') {
        window.nbbWedstrijden = data;
        let lbl = document.getElementById('label-json');
        if(lbl) lbl.innerText = `✅ JSON Definitief ingeladen vanuit Cloud!`;
    }
    tekenPouleResultaten();
};

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
function maakNetteConceptDatum(ruweTekst) {
    if (!ruweTekst) return "TBA / Datum onbekend";
    let val = ruweTekst.toString().trim();

    let schoongemaakt = val
        .replace(/Monday/ig, 'maandag').replace(/Tuesday/ig, 'dinsdag').replace(/Wednesday/ig, 'woensdag').replace(/Thursday/ig, 'donderdag').replace(/Friday/ig, 'vrijdag').replace(/Saturday/ig, 'zaterdag').replace(/Sunday/ig, 'zondag')
        .replace(/\bMon\b/ig, 'ma').replace(/\bTue\b/ig, 'di').replace(/\bWed\b/ig, 'wo').replace(/\bThu\b/ig, 'do').replace(/\bFri\b/ig, 'vr').replace(/\bSat\b/ig, 'za').replace(/\bSun\b/ig, 'zo')
        .replace(/January/ig, 'januari').replace(/February/ig, 'februari').replace(/March/ig, 'maart').replace(/April/ig, 'april').replace(/June/ig, 'juni').replace(/July/ig, 'juli').replace(/August/ig, 'augustus').replace(/September/ig, 'september').replace(/October/ig, 'oktober').replace(/November/ig, 'november').replace(/December/ig, 'december')
        .replace(/\bJan\b/ig, 'januari').replace(/\bFeb\b/ig, 'februari').replace(/\bMar\b/ig, 'maart').replace(/\bApr\b/ig, 'april').replace(/\bMay\b/ig, 'mei').replace(/\bJun\b/ig, 'juni').replace(/\bJul\b/ig, 'juli').replace(/\bAug\b/ig, 'augustus').replace(/\bSep\b/ig, 'september').replace(/\bOct\b/ig, 'oktober').replace(/\bNov\b/ig, 'november').replace(/\bDec\b/ig, 'december')
        .replace(/,/g, '').replace(/-/g, ' ').replace(/weekend van/ig, '').replace(/weekend/ig, '').replace(/\s+/g, ' ').trim();

    schoongemaakt = schoongemaakt.replace(/\b(januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+(\d{1,2})\b/ig, '$2 $1');
    schoongemaakt = schoongemaakt.charAt(0).toUpperCase() + schoongemaakt.slice(1);

    if (schoongemaakt.toLowerCase().startsWith('week')) return "Speelronde: " + schoongemaakt;
    else if (schoongemaakt.match(/(Maandag|Dinsdag|Woensdag|Donderdag|Vrijdag|Zaterdag|Zondag|Ma|Di|Wo|Do|Vr|Za|Zo)/i)) return schoongemaakt; 
    else return "Weekend van " + schoongemaakt; 
}

function maakMooieDatum(datumStr, tijdStr, accommodatie) {
    if (!datumStr) return "Datum onbekend";
    try {
        let d = new Date(datumStr);
        const dagen = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
        let dag = dagen[d.getDay()]; let dagNummer = d.getDate().toString().padStart(2, '0'); let maandNummer = (d.getMonth() + 1).toString().padStart(2, '0'); let jaar = d.getFullYear();
        let tijd = tijdStr ? tijdStr.substring(0, 5) : ''; let locatie = accommodatie ? ` in ${accommodatie}` : '';
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

        // HIER IS HET AANGEPAST NAAR DE CLOUD OPSLAG
        window.slaDataOp('blackshots_poule_teams', window.bsTeams);
        
        document.getElementById('stap-2-box').style.opacity = '1';
        document.getElementById('stap-2-box').style.pointerEvents = 'all';
        document.getElementById('label-indeling').innerText = `✅ Ingeladen: ${file.name}`;
        tekenPouleResultaten();
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL IN HET RAM GEHEUGEN
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
        document.getElementById('label-plantool').style.color = '#8e44ad';
        tekenPouleResultaten(); 
    };
    reader.readAsArrayBuffer(file);
};

window.genereerSchemaVoorTeam = function(index) {
    let selectEl = document.getElementById(`plantool-select-${index}`);
    if (!selectEl) return;
    let sheetNaam = selectEl.value;
    
    if (!sheetNaam) return alert("Kies eerst een tabblad uit het dropdown menu!");

    let bsData = window.bsTeams[index];
    let sheetGrid = window.plantoolJSON[sheetNaam];
    let berekendeWedstrijden = [];
    let onzeCode = parseInt(bsData.onzeCode);
    let huidigWeekend = "TBA / Onbekend"; 

    sheetGrid.forEach((row) => {
        let tempDatum = "";
        row.slice(0, 6).forEach(cel => {
            if (!cel) return;
            let val = cel.toString().trim();
            if (val.length < 3 || val.match(/^\d+\s*-\s*\d+$/)) return;
            let lw = val.toLowerCase();
            
            if (lw.includes('inhaal') || lw.includes('beker') || lw.includes('vakantie') || lw.includes('reserve') || lw.includes('geen wed')) return; 

            if (lw.match(/(jan|feb|mar|mrt|apr|may|mei|jun|jul|aug|sep|oct|okt|nov|dec|week|monday|saturday|sunday)/) || val.match(/\d{1,2}[-/]\d{1,2}/)) {
                tempDatum = val;
            }
        });
        
        if (tempDatum.length > 2) huidigWeekend = tempDatum;

        let heeftMatch = false;
        row.forEach((cel, colIdx) => { 
            if (colIdx >= 6 && typeof cel === 'string' && cel.match(/^(\d+)\s*-\s*(\d+)$/)) heeftMatch = true; 
        });

        if (heeftMatch) {
            row.forEach((cel, colIdx) => {
                if (colIdx < 6) return; 
                if(typeof cel === 'string') {
                    let match = cel.match(/^(\d+)\s*-\s*(\d+)$/); 
                    if (match) {
                        let codeA = parseInt(match[1]); let codeB = parseInt(match[2]);
                        if (codeA === onzeCode || codeB === onzeCode) {
                            let tegenstanderCode = (codeA === onzeCode) ? codeB : codeA;
                            let thuisSpelend = (codeA === onzeCode);
                            let tegTeam = bsData.tegenstanders.find(t => parseInt(t.Code||t.code||0) === tegenstanderCode);
                            let tegNaam = tegTeam ? (tegTeam.Vereniging || tegTeam.vereniging) : `Team ${tegenstanderCode}`;
                            if (!tegNaam || tegNaam.trim() === '') tegNaam = "--- VRIJE PLEK ---";

                            berekendeWedstrijden.push({ 
                                type: "concept", weekend: maakNetteConceptDatum(huidigWeekend), 
                                thuis: thuisSpelend, tegenstander: tegNaam
                            });
                        }
                    }
                }
            });
        }
    });

    if (berekendeWedstrijden.length === 0) return alert(`Geen wedstrijden gevonden op "${sheetNaam}". Verkeerd tabblad?`);

    window.bsTeams[index].conceptSchema = berekendeWedstrijden;
    // HIER IS HET AANGEPAST NAAR DE CLOUD OPSLAG
    window.slaDataOp('blackshots_poule_teams', window.bsTeams);
    
    alert(`✅ Succes! ${berekendeWedstrijden.length} wedstrijden berekend voor ${bsData.teamNaam}.`);
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
        
        // HIER IS HET AANGEPAST NAAR DE CLOUD OPSLAG
        window.slaDataOp('blackshots_wedstrijden_json', window.nbbWedstrijden);
        
        document.getElementById('label-json').innerText = `✅ Ingeladen!`;
        tekenPouleResultaten(); 
    };
    reader.readAsText(file);
};

// ============================================================================
// SCHERM OPBOUW (UI)
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

        let heeftConcept = bsData.conceptSchema && bsData.conceptSchema.length > 0;
        let teamWedstrijden = window.nbbWedstrijden.filter(w => 
            (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots') && w.Thuisteam.includes(bsData.teamNaam)) || 
            (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots') && w.Uitteam.includes(bsData.teamNaam))
        );
        let heeftDefinitief = teamWedstrijden.length > 0;

        let actieSectieHtml = '';
        if (window.plantoolJSON) {
            let opties = '<option value="">-- Kies NBB Tabblad --</option>';
            Object.keys(window.plantoolJSON).forEach(sheet => {
                let selected = (bsData.schemaType.toLowerCase().includes(sheet.toLowerCase())) ? 'selected' : '';
                opties += `<option value="${sheet}" ${selected}>${sheet}</option>`;
            });

            actieSectieHtml = `
                <div style="margin-top:15px; background:#fdf2e9; padding:12px; border-radius:6px; border:1px solid #e67e22;">
                    <label style="font-size:0.8rem; font-weight:bold; color:#d35400;">Koppel handmatig aan Plantool schema:</label>
                    <div style="display:flex; gap:10px; margin-top:5px;">
                        <select id="plantool-select-${index}" style="flex:1; padding:8px; border-radius:4px; border:1px solid #bdc3c7;">${opties}</select>
                        <button onclick="genereerSchemaVoorTeam(${index})" style="background:#e67e22; color:white; border:none; padding:8px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">📅 Bereken</button>
                    </div>
                </div>
            `;
        } else if (!heeftConcept && !heeftDefinitief) {
            actieSectieHtml = `
                <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;">
                    <p style="font-size:0.85rem; color:#e74c3c; font-style:italic; margin:0;">Upload de Plantool of JSON hierboven om de kalender te genereren...</p>
                </div>
            `;
        }

        let modalKnopHtml = '';
        if (heeftConcept || heeftDefinitief) {
            modalKnopHtml = `<button onclick="openSchemaModal(${index})" style="width:100%; margin-top:10px; background:#3498db; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; font-size:1.1rem; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1); transition:0.2s;" onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">👀 Bekijk Speelschema</button>`;
        }

        container.innerHTML += `
            <div class="poule-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 5px 0; color:var(--secondary-color); font-size:1.4rem;">${bsData.teamNaam}</h3>
                        <div style="font-size:0.9rem; color:#7f8c8d; margin-bottom:15px;">
                            <strong>Poule:</strong> ${bsData.pouleNaam} <br>
                            <strong>NBB Advies:</strong> ${bsData.schemaType} <br>
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
                ${modalKnopHtml}
            </div>
        `;
    });
};

window.openSchemaModal = function(index) {
    let bsData = window.bsTeams[index];
    document.getElementById('modal-titel').innerText = `Schema: ${bsData.teamNaam}`;
    document.getElementById('modal-subtitel').innerText = `Poule: ${bsData.pouleNaam} | Code: ${bsData.onzeCode}`;
    
    let modalInhoud = document.getElementById('modal-inhoud');
    modalInhoud.innerHTML = '';

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

    if (bsData.conceptSchema && bsData.conceptSchema.length > 0) {
        let conceptHtml = `<h3 style="margin:0 0 10px 0; color:#3498db; border-bottom:2px solid #3498db; padding-bottom:5px;">📅 Concept Schema (Plantool)</h3><ul class="schema-lijst">`;
        bsData.conceptSchema.forEach(match => {
            let statusBadge = match.tegenstander === "--- VRIJE PLEK ---" 
                ? `<span class="status-badge" style="background:#e74c3c;">VRIJ</span>` 
                : `<span class="status-badge status-concept">Concept</span>`;
            
            conceptHtml += `
                <li>
                    <div style="flex:1;">
                        <strong style="color:#34495e; font-size:1.1rem;">${match.weekend}</strong><br>
                        <span style="font-size:1rem;">
                            ${match.thuis ? '🏠 Thuis tegen:' : '🚌 Uit tegen:'} 
                            <strong>${match.tegenstander}</strong>
                        </span>
                    </div>
                    <div>${statusBadge}</div>
                </li>`;
        });
        conceptHtml += `</ul>`;
        
        if (teamWedstrijden.length > 0) conceptHtml = `<div style="margin-top:20px; padding:15px; background:#f8f9fa; border-radius:8px;">${conceptHtml}</div>`;
        modalInhoud.innerHTML += conceptHtml;
    }

    document.getElementById('schema-modal').style.display = 'flex';
};

window.sluitSchemaModal = function() {
    document.getElementById('schema-modal').style.display = 'none';
};

window.wisAlleData = function() {
    if(confirm("Weet je zeker dat je alle Poules en Schema's uit het geheugen wilt wissen?")) {
        window.bsTeams = [];
        window.nbbWedstrijden = [];
        window.slaDataOp('blackshots_poule_teams', window.bsTeams);
        window.slaDataOp('blackshots_wedstrijden_json', window.nbbWedstrijden);
        location.reload();
    }
};