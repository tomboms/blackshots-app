// --- BASKETBAL_RAPPORTEN.JS ---

window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

// Databases inladen
window.teamsDB = window.veiligeArray('blackshots_teams');
window.spelersDB = window.veiligeArray('blackshots_spelers');
window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.nbbWedstrijden = window.veiligeArray('blackshots_wedstrijden_json');
window.customWedstrijden = window.veiligeArray('blackshots_custom_wedstrijden');
window.planStatusDB = window.veiligObject('blackshots_plan_status');
window.persoonsTakenDB = window.veiligObject('blackshots_persoons_taken');
window.speeldagenDB = window.veiligeArray('blackshots_speeldagen');

// Helpers
window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10); 
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) { let delen = str.split('-'); return `${delen[2]}-${delen[1]}-${delen[0]}`; }
    return str;
};

window.genereerUniekId = function(w) {
    if (w.ID) return `nbb-${w.ID}`; 
    if (w.id) return w.id; 
    let thuisteam = w.Thuisteam ? String(w.Thuisteam) : ''; let uitteam = w.Uitteam ? String(w.Uitteam) : '';
    let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (thuisteam + uitteam).replace(/[^a-zA-Z0-9]/g, '');
    return `match-${window.normaalDatum(w.Datum)}-${clean}`;
};

// ============================================================================
// INITIALISATIE & DROPDOWNS VULLEN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    vulDropdowns();
});

function vulDropdowns() {
    // 1. Teams vullen
    let selTeam = document.getElementById('select-team');
    if (selTeam) {
        window.teamsDB.forEach(t => {
            if (!t.isVrijwilliger && !t.isRecreant) {
                selTeam.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
            }
        });
    }

    // 2. Personen vullen (Spelers + Scheidsrechters)
    let selPersoon = document.getElementById('select-persoon');
    if (selPersoon) {
        let allePersonen = [];
        window.spelersDB.forEach(s => allePersonen.push({ id: s.id, naam: s.naam, type: 'Speler' }));
        window.scheidsrechtersDB.forEach(sr => {
            if (!sr.gekoppeldLid) allePersonen.push({ id: sr.id, naam: sr.naam, type: 'Scheidsrechter' });
        });
        
        allePersonen.sort((a,b) => a.naam.localeCompare(b.naam));
        allePersonen.forEach(p => {
            selPersoon.innerHTML += `<option value="${p.id}">${p.naam} (${p.type})</option>`;
        });
    }

    // 3. Weken en Dagen vullen
    let selWeek = document.getElementById('select-week');
    let selDag = document.getElementById('select-dag-registratie');
    let gesorteerdeDagen = [...window.speeldagenDB].sort();
    
    gesorteerdeDagen.forEach(dag => {
        let d = new Date(dag);
        let weergaveDatum = isNaN(d) ? dag : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (selWeek) selWeek.innerHTML += `<option value="${dag}">Speelweek: ${weergaveDatum}</option>`;
        if (selDag) selDag.innerHTML += `<option value="${dag}">${weergaveDatum}</option>`;
    });
}

// ============================================================================
// DE PRINT / PDF ENGINE
// ============================================================================
window.startPrintJob = function(htmlContent) {
    let printContainer = document.getElementById('print-container');
    
    // Voeg algemene print-styling toe (gebaseerd op jouw voorbeelden)
    let printStyle = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            #print-wrapper {
                font-family: 'Roboto', Arial, sans-serif;
                color: #000;
                background: white;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                font-size: 11pt;
            }
            .print-header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
            .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .print-table th, .print-table td { padding: 8px; border-bottom: 1px solid #ccc; text-align: left; vertical-align: top; }
            .print-table th { background-color: #f8f9fa; font-weight: bold; border-bottom: 2px solid #000; }
            .page-break { page-break-before: always; }
        </style>
    `;

    printContainer.innerHTML = printStyle + '<div id="print-wrapper">' + htmlContent + '</div>';
    
    // Wacht een fractie van een seconde tot de DOM het heeft gerenderd, open dan printscherm
    setTimeout(() => {
        window.print();
        // Na het printen de container weer leegmaken
        setTimeout(() => { printContainer.innerHTML = ''; }, 1000);
    }, 250);
};

// ============================================================================
// RAPPORT 3: PERSOONLIJKE TAKENBRIEF (VOLLEDIG GEBOUWD!)
// ============================================================================
window.genereerPersoonlijkeBrief = function() {
    let pId = document.getElementById('select-persoon').value;
    if (!pId) return alert("Kies eerst een persoon uit de lijst.");

    let persoon = window.spelersDB.find(s => s.id === pId) || window.scheidsrechtersDB.find(sr => sr.id === pId);
    let isSpeler = !!persoon.teamId;

    // Verzamel alle taken voor deze persoon
    let mijnTaken = [];
    let totaalTaken = 0;
    let totaalZaalwacht = 0; // Hier kun je later nog een specifieke teller voor inbouwen

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    
    Object.keys(window.persoonsTakenDB).forEach(matchId => {
        let takenObj = window.persoonsTakenDB[matchId];
        let rollen = Object.keys(takenObj).filter(rol => takenObj[rol] === pId);
        
        if (rollen.length > 0) {
            let match = alleWedstrijden.find(w => window.genereerUniekId(w) === matchId);
            if (match) {
                let status = window.planStatusDB[matchId] || { tijd: "Onbekend" };
                rollen.forEach(rol => {
                    totaalTaken++;
                    if (rol === 'zaalwacht') totaalZaalwacht++; // Als zaalwacht in de db zit
                    
                    let taakNaam = "";
                    if (rol === 'sA' || rol === 'sB') taakNaam = "Scheidsrechter";
                    else if (rol === 'tab') taakNaam = "Tafelaar (Tablet)";
                    else if (rol === 'sco') taakNaam = "Scorer (Bord)";
                    else if (rol.includes('auto')) taakNaam = "Vervoer / Auto";

                    mijnTaken.push({
                        datumStr: window.normaalDatum(match.Datum),
                        tijd: status.tijd,
                        thuis: match.Thuisteam.replace('Black Shots', 'BS'),
                        uit: match.Uitteam.replace('Black Shots', 'BS'),
                        taak: taakNaam,
                        isThuiswedstrijd: (match.Thuisteam || '').toLowerCase().includes('black shots')
                    });
                });
            }
        }
    });

    // Sorteer de taken chronologisch
    mijnTaken.sort((a, b) => a.datumStr.localeCompare(b.datumStr));

    // HTML opbouw die precies lijkt op jouw PDF (Takenoverzicht_Tom Stommels.pdf)
    let html = `
        <div class="print-header">
            <h1 style="margin:0 0 5px 0; font-size:1.6rem;">${persoon.naam}</h1>
            ${isSpeler ? `<strong>Team:</strong> ${persoon.teamId || '-'} <br>` : ''}
            <div style="display:flex; gap:30px; margin-top:10px; font-size:0.9rem;">
                <div><strong>Geboortedatum:</strong> ${persoon.geboorteDatum || '-'}</div>
                <div><strong>Lid sinds:</strong> ${persoon.lidSinds || '-'}</div>
                <div><strong>NBB Nummer:</strong> ${persoon.bondsnummer || '-'}</div>
            </div>
            <div style="display:flex; gap:30px; margin-top:5px; font-size:0.9rem;">
                <div><strong>Aantal taken:</strong> ${totaalTaken}</div>
                <div><strong>Aantal taken zaalwacht:</strong> ${totaalZaalwacht}</div>
            </div>
        </div>

        <div style="margin-bottom:20px; line-height:1.5;">
            Beste ${persoon.naam.split(' ')[0]},<br><br>
            Voor je ligt jouw persoonlijke wedstrijd- en takenlijst voor het seizoen.<br>
            Indien je de taak niet kunt vervullen, probeer dan eerst ZELF en TIJDIG voor vervanging te zorgen. Dit kan bijvoorbeeld door in de groepsapp te vragen of iemand kan ruilen.<br>
            Voor de spelers: Kan je niet aanwezig zijn bij een wedstrijd, geef dit TIJDIG door bij je Coach.<br><br>
            Met sportieve groet,<br>
            Wedstrijdsecretaris Black Shots
        </div>
    `;

    if (mijnTaken.length === 0) {
        html += `<p style="font-style:italic;">Er zijn momenteel geen taken of wedstrijden aan jou toegewezen in het systeem.</p>`;
    } else {
        html += `<table class="print-table">
            <thead>
                <tr>
                    <th style="width:120px;">Datum</th>
                    <th style="width:100px;">Tijd</th>
                    <th style="width:80px;">Locatie</th>
                    <th>Wedstrijd</th>
                    <th style="width:150px;">Jouw Taak</th>
                </tr>
            </thead>
            <tbody>`;
        
        mijnTaken.forEach(taak => {
            let d = new Date(taak.datumStr);
            let mooieDatum = isNaN(d) ? taak.datumStr : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            
            html += `
                <tr>
                    <td>${mooieDatum}</td>
                    <td>${taak.tijd}</td>
                    <td>${taak.isThuiswedstrijd ? 'Thuis' : 'Uit'}</td>
                    <td><strong>${taak.thuis}</strong> - ${taak.uit}</td>
                    <td style="font-weight:bold; color:#d35400;">${taak.taak}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
    }

    // Stuur de opgebouwde HTML naar de print-engine
    window.startPrintJob(html);
};

// ============================================================================
// DE ANDERE RAPPORTEN (KLAARZETTEN VOOR VOLGENDE UPDATE)
// ============================================================================
window.genereerWeekOverzicht = function() {
    alert("Deze module gaan we als volgende bouwen! De data wordt al ingeladen.");
};

window.genereerTeamOverzicht = function() {
    alert("Deze module gaan we als volgende bouwen! De data wordt al ingeladen.");
};

window.genereerRegistratieFormulier = function() {
    alert("Deze module gaan we als volgende bouwen! De data wordt al ingeladen.");
};