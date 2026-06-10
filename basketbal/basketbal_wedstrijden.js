// --- BASKETBAL_WEDSTRIJDEN.JS: DE SLIMME POULE & SCHEMA KRAKER ---

// 1. DATA INLADEN UIT GEHEUGEN (Zodat het overleeft bij een Refresh!)
window.pouleData = JSON.parse(localStorage.getItem('bs_poule_data')) || [];
window.bsTeams = JSON.parse(localStorage.getItem('bs_poule_teams')) || [];
window.plantoolJSON = JSON.parse(localStorage.getItem('bs_plantool_json')) || null;

// Zodra de pagina laadt, teken alles wat we nog in het geheugen hebben
document.addEventListener('DOMContentLoaded', () => {
    if (window.bsTeams.length > 0) {
        tekenPouleResultaten();
        document.getElementById('stap-2-box').style.opacity = '1';
        document.getElementById('stap-2-box').style.pointerEvents = 'all';
    }
    if (window.plantoolJSON) {
        document.getElementById('label-plantool').innerText = `✅ Plantool zit in het geheugen!`;
        document.getElementById('label-plantool').style.color = '#8e44ad';
        koppelSchemaAanTeams();
    }
});

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
        
        const firstSheetNaam = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetNaam];
        
        window.pouleData = XLSX.utils.sheet_to_json(worksheet);
        localStorage.setItem('bs_poule_data', JSON.stringify(window.pouleData)); // Opslaan voor refresh
        
        zoekBlackShotsInPoules();
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
            
            // Voorkom dubbele teams als de Excel gekke dingen doet
            if (!window.bsTeams.find(t => t.pouleNaam === pouleNaam && t.teamNaam === teamNaam)) {
                let tegenstanders = window.pouleData.filter(r => (r['Poule'] || r['poule']) === pouleNaam);
                tegenstanders.sort((a, b) => parseInt(a['Code'] || a['code'] || 0) - parseInt(b['Code'] || b['code'] || 0));
                
                window.bsTeams.push({
                    teamNaam: teamNaam,
                    pouleNaam: pouleNaam,
                    onzeCode: rij['Code'] || rij['code'] || '?',
                    schemaType: rij['Speelschema'] || rij['speelschema'] || 'Onbekend',
                    pouleGrootte: tegenstanders.length,
                    tegenstanders: tegenstanders
                });
            }
        }
    });

    localStorage.setItem('bs_poule_teams', JSON.stringify(window.bsTeams)); // Opslaan voor refresh
    tekenPouleResultaten();
    
    document.getElementById('stap-2-box').style.opacity = '1';
    document.getElementById('stap-2-box').style.pointerEvents = 'all';
    
    // Als de plantool er al in zat, koppel ze direct!
    if (window.plantoolJSON) koppelSchemaAanTeams();
};

window.tekenPouleResultaten = function() {
    let container = document.getElementById('poule-resultaten');
    container.innerHTML = '';

    if (window.bsTeams.length === 0) {
        container.innerHTML = '<div style="background:#fdedec; border:1px solid #e74c3c; padding:20px; border-radius:8px; color:#c0392b;"><strong>Geen Black Shots gevonden!</strong> Weet je zeker dat je het juiste bestand hebt geüpload?</div>';
        return;
    }

    window.bsTeams.forEach((bsData, index) => {
        let lijstHtml = `<table class="team-lijst"><tr><th>Code</th><th>Vereniging</th><th>Team</th></tr>`;
        
        bsData.tegenstanders.forEach(tg => {
            let vNaam = tg['Vereniging'] || tg['vereniging'];
            
            // FIX: Vang lege plekken in de poule perfect op (bijv. als Code 5 mist)
            let isLeeg = (!vNaam || vNaam.trim() === '');
            let isOns = (!isLeeg && vNaam.toLowerCase().includes('black shots'));
            
            let weergaveVereniging = isLeeg ? '<span style="color:#e74c3c; font-weight:bold; font-style:italic;">--- VRIJE PLEK ---</span>' : vNaam;
            let weergaveTeam = isLeeg ? '-' : (tg['Team'] || tg['team'] || '?');

            lijstHtml += `
                <tr class="${isOns ? 'is-ons-team' : ''}">
                    <td><strong>${tg['Code'] || tg['code'] || '?'}</strong></td>
                    <td>${weergaveVereniging}</td>
                    <td>${weergaveTeam}</td>
                </tr>`;
        });
        lijstHtml += `</table>`;

        // De lege container waar straks de berekende knoppen in komen
        let plantoolSectieHtml = `
            <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;" id="plantool-sectie-${index}">
                <p style="font-size:0.85rem; color:#e74c3c; font-style:italic;">Upload de Plantool hierboven om de wedstrijden te genereren...</p>
            </div>
        `;

        container.innerHTML += `
            <div class="poule-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h3 style="margin:0 0 5px 0; color:var(--secondary-color); font-size:1.4rem;">${bsData.teamNaam}</h3>
                        <div style="font-size:0.9rem; color:#7f8c8d; margin-bottom:15px;">
                            <strong>Poule:</strong> ${bsData.pouleNaam} <br>
                            <strong>NBB Schema:</strong> ${bsData.schemaType} <br>
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
                
                ${plantoolSectieHtml}
                
                <div id="schema-uitslag-${index}" style="margin-top:15px;"></div>
            </div>
        `;
    });
};

// ============================================================================
// STAP 2: LEES DE PLANTOOL EN BEWAAR DE TABBLADEN
// ============================================================================
window.verwerkPlantoolBestand = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('label-plantool').innerText = `✅ Ingeladen: ${file.name}`;
    document.getElementById('label-plantool').style.color = '#8e44ad';

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        window.plantoolJSON = {};
        
        // We slaan alle tabbladen direct op als platte data (beter voor de browser)
        workbook.SheetNames.forEach(name => {
            window.plantoolJSON[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {header: 1});
        });
        
        // Probeer het gigantische bestand op te slaan in de cache
        try {
            localStorage.setItem('bs_plantool_json', JSON.stringify(window.plantoolJSON));
        } catch(err) {
            console.warn("Plantool te groot voor localStorage cache, we gebruiken hem alleen in het tijdelijke geheugen.");
        }

        koppelSchemaAanTeams();
        alert("NBB Plantool succesvol ingeladen en gekraakt!");
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// STAP 3: DE INTELLIGENTE TABBLAD MATCHER
// ============================================================================
window.koppelSchemaAanTeams = function() {
    if (!window.plantoolJSON || window.bsTeams.length === 0) return;
    
    let tabNamen = Object.keys(window.plantoolJSON);

    window.bsTeams.forEach((bsData, index) => {
        let sectie = document.getElementById(`plantool-sectie-${index}`);
        if(!sectie) return;

        let schemaGezocht = bsData.schemaType.toLowerCase().trim();
        
        // Zoek naar een exacte match ("Schema 12 1e helft comp" enz.)
        let besteTab = tabNamen.find(t => t.toLowerCase().trim() === schemaGezocht);
        
        // Als het nét iets anders geschreven is, zoek dan naar een tabblad dat de naam bevat
        if (!besteTab) {
            besteTab = tabNamen.find(t => schemaGezocht.includes(t.toLowerCase().trim()) || t.toLowerCase().trim().includes(schemaGezocht));
        }

        // PERFECTE MATCH GEVONDEN: Verberg de dropdown en laat een mooie knop zien
        if (besteTab) {
            sectie.innerHTML = `
                <div style="background:#fdf2e9; padding:12px; border-radius:6px; border:1px solid #e67e22; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:0.8rem; color:#d35400; font-weight:bold; display:block;">Tabblad automatisch gevonden:</span>
                        <span style="color:#2c3e50; font-weight:bold; font-size:1.1rem;">📄 ${besteTab}</span>
                    </div>
                    <button onclick="genereerSchemaVoorTeam(${index}, '${besteTab}')" style="background:#8e44ad; color:white; border:none; padding:10px 15px; border-radius:4px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:0.2s;" onmouseover="this.style.background='#9b59b6'" onmouseout="this.style.background='#8e44ad'">📅 Bereken Schema</button>
                </div>
            `;
        } else {
            // Noodoplossing (Fallback): Mocht hij hem écht niet vinden, toon dan toch nog even een lijstje
            let opties = '<option value="">-- Kies handmatig --</option>';
            tabNamen.forEach(t => opties += `<option value="${t}">${t}</option>`);
            sectie.innerHTML = `
                <div style="background:#fdedec; padding:10px; border-radius:6px; border:1px solid #e74c3c;">
                    <span style="font-size:0.8rem; color:#c0392b; font-weight:bold; display:block; margin-bottom:5px;">Kon tabblad niet automatisch raden. Kies er één uit de Plantool:</span>
                    <select id="handmatig-tab-${index}" style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px;">${opties}</select>
                    <button onclick="genereerSchemaVoorTeam(${index}, document.getElementById('handmatig-tab-${index}').value)" style="width:100%; background:#e74c3c; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer;">📅 Bereken Wedstrijden</button>
                </div>
            `;
        }
    });
};

// ============================================================================
// STAP 4: DE BEREKENING (WORDT IN DE VOLGENDE STAP AFGEMAAKT)
// ============================================================================
window.genereerSchemaVoorTeam = function(index, sheetNaam) {
    if(!sheetNaam) return alert("Selecteer of controleer het tabblad!");
    let bsData = window.bsTeams[index];
    
    let uitslagVak = document.getElementById(`schema-uitslag-${index}`);
    uitslagVak.innerHTML = `
        <div style="background:#e8f8f5; border:1px solid #27ae60; padding:15px; border-radius:6px; margin-top:15px; animation: popIn 0.3s ease-out;">
            <strong style="color:#27ae60; font-size:1.1rem;">✅ Matchmaker Klaar Voor Actie!</strong><br>
            Het automatische tabblad <strong>"${sheetNaam}"</strong> wordt nu uitgelezen voor <strong>Code ${bsData.onzeCode}</strong> (Poule van ${bsData.pouleGrootte}).<br><br>
            <em>De volgende stap is het bouwen van de Zaalhuur Check & Datum verdeler!</em>
        </div>
    `;
};