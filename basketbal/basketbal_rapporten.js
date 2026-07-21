// --- BASKETBAL_RAPPORTEN.JS ---

window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

// Fix voor 'Onbekend': als instellingen leeg zijn, val terug op een logisch standaard seizoen
let opgeslagenInstellingen = JSON.parse(localStorage.getItem('blackshots_instellingen'));
window.appInstellingen = opgeslagenInstellingen || { seizoen: "2025-2026" };

window.teamsDB = window.veiligeArray('blackshots_teams');
window.spelersDB = window.veiligeArray('blackshots_spelers');
window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.nbbWedstrijden = window.veiligeArray('blackshots_wedstrijden_json');
window.customWedstrijden = window.veiligeArray('blackshots_custom_wedstrijden');
window.planStatusDB = window.veiligObject('blackshots_plan_status');
window.persoonsTakenDB = window.veiligObject('blackshots_persoons_taken');
window.teamTakenDB = window.veiligObject('blackshots_wedstrijd_taken');
window.speeldagenDB = window.veiligeArray('blackshots_speeldagen');

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

window.getCanonicalTeam = function(identifier) {
    if (!identifier) return null;
    let cleanZoek = String(identifier).toLowerCase().replace(/[-\s]/g, '');
    return window.teamsDB.find(team => {
        let tId = String(team.id || '').toLowerCase().replace(/[-\s]/g, '');
        let tNaam = String(team.naam || '').toLowerCase().replace(/[-\s]/g, '');
        if (cleanZoek === tId || cleanZoek === tNaam) return true;
        if (team.aliassen) {
            let aliasArray = team.aliassen.toLowerCase().split(',').map(a => a.replace(/[-\s]/g, ''));
            if (aliasArray.includes(cleanZoek)) return true;
        }
        return false;
    });
};

document.addEventListener('DOMContentLoaded', () => { vulDropdowns(); });

function vulDropdowns() {
    let selTeam = document.getElementById('select-team');
    let selTeamBrief = document.getElementById('select-team-brief');
    if (selTeam || selTeamBrief) {
        window.teamsDB.forEach(t => {
            if (!t.isVrijwilliger && !t.isRecreant) {
                if(selTeam) selTeam.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
                if(selTeamBrief) selTeamBrief.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
            }
        });
    }

    let selPersoon = document.getElementById('select-persoon');
    if (selPersoon) {
        let allePersonen = [];
        window.spelersDB.forEach(s => allePersonen.push({ id: s.id, naam: s.naam, type: 'Speler' }));
        window.scheidsrechtersDB.forEach(sr => { if (!sr.gekoppeldLid) allePersonen.push({ id: sr.id, naam: sr.naam, type: 'Scheidsrechter' }); });
        allePersonen.sort((a,b) => a.naam.localeCompare(b.naam));
        allePersonen.forEach(p => { selPersoon.innerHTML += `<option value="${p.id}">${p.naam} (${p.type})</option>`; });
    }

    let selDag = document.getElementById('select-dag-registratie');
    let gesorteerdeDagen = [...window.speeldagenDB].sort();
    
    // Zet datumvelden voor Weekoverzicht standaard op vandaag en +7 dagen
    let inputVan = document.getElementById('week-van');
    let inputTot = document.getElementById('week-tot');
    if (inputVan && inputTot) {
        let nu = new Date();
        let overEenWeek = new Date(); overEenWeek.setDate(nu.getDate() + 7);
        inputVan.value = nu.toISOString().split('T')[0];
        inputTot.value = overEenWeek.toISOString().split('T')[0];
    }

    gesorteerdeDagen.forEach(dag => {
        let d = new Date(dag);
        let weergaveDatum = isNaN(d) ? dag : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        if (selDag) selDag.innerHTML += `<option value="${dag}">${weergaveDatum}</option>`;
    });
}

// ============================================================================
// DE PRINT / PDF ENGINE
// ============================================================================
window.startPrintJob = function(htmlContent) {
    let printContainer = document.getElementById('print-container');
    
    let printStyle = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            #print-wrapper { font-family: 'Roboto', Arial, sans-serif; color: #000; background: white; padding: 20px; max-width: 900px; margin: 0 auto; font-size: 11pt; }
            .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95rem; }
            .print-table th, .print-table td { padding: 6px 8px; border-bottom: 1px solid #ccc; text-align: left; vertical-align: top; }
            .print-table th { background-color: #f8f9fa; font-weight: bold; border-bottom: 2px solid #000; color: #2c3e50; }
            .page-break { page-break-before: always; height: 1px; width: 100%; display: block; margin: 0; padding: 0; border: none; }
            
            /* Print Specifieke Regels */
            @media print {
                @page { margin: 0 !important; }
                body { margin: 0 !important; padding: 15mm !important; background: white !important; -webkit-print-color-adjust: exact !important; }
                #print-container { display: block !important; position: static !important; background: white !important; width: 100% !important; }
                body > *:not(#print-container) { display: none !important; }
                #print-wrapper { background: white !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
            }
        </style>
    `;
    printContainer.innerHTML = printStyle + '<div id="print-wrapper">' + htmlContent + '</div>';
    setTimeout(() => { window.print(); setTimeout(() => { printContainer.innerHTML = ''; }, 1000); }, 250);
};

// ============================================================================
// HULPFUNCTIES VOOR NAMEN
// ============================================================================
window.naamWeergave = function(pId, defTeam) {
    if (pId && pId !== "Vrij" && pId !== "") {
        let s = window.spelersDB.find(x => x.id === pId);
        let sr = window.scheidsrechtersDB.find(x => x.id === pId);
        return s ? s.naam : (sr ? sr.naam : pId);
    }
    return (!defTeam || defTeam === "Vrij" || defTeam === "") ? "-" : `<span style="color:#7f8c8d; font-style:italic;">[${defTeam}]</span>`;
};

/// ============================================================================
// RAPPORT 1: WEEK- EN TAKENOVERZICHT (Schoon, zonder icoontjes, met Accommodatie)
// ============================================================================
window.genereerWeekOverzicht = function() {
    let van = document.getElementById('week-van').value;
    let tot = document.getElementById('week-tot').value;
    
    if(!van || !tot) return alert("Vul een geldige start- en einddatum in voor het weekoverzicht.");

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    
    let gefilterd = alleWedstrijden.filter(w => {
        let d = window.normaalDatum(w.Datum);
        let id = window.genereerUniekId(w);
        return d >= van && d <= tot && window.planStatusDB[id];
    });

    if(gefilterd.length === 0) return alert("Geen wedstrijden gevonden in deze periode.");

    let perDag = {};
    gefilterd.forEach(w => {
        let d = window.normaalDatum(w.Datum);
        if(!perDag[d]) perDag[d] = { thuis: [], uit: [] };
        
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        if(isThuis) perDag[d].thuis.push(w);
        else perDag[d].uit.push(w);
    });

    let dagenGesorteerd = Object.keys(perDag).sort();
    let seizoenNaam = window.appInstellingen.seizoen || "2025-2026";
    let datumVanMooi = new Date(van).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let datumTotMooi = new Date(tot).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let html = `
        <div class="print-header" style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
                <h1 style="margin:0 0 5px 0; font-size:1.6rem; color:#2c3e50;">Wedstrijd- en takenoverzicht</h1>
                <div style="font-size:1.1rem; color:#34495e; font-weight:bold;">Black Shots seizoen ${seizoenNaam}</div>
                <div style="font-size:0.9rem; color:#7f8c8d; margin-top:5px;">Periode: ${datumVanMooi} t/m ${datumTotMooi}</div>
            </div>
            <img src="Logo Zwart.png" style="width:110px; height:auto; object-fit:contain;">
        </div>
    `;

    dagenGesorteerd.forEach((dag) => {
        let obj = perDag[dag];
        let d = new Date(dag);
        let mooieDatum = isNaN(d) ? dag : d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

        // Geen icoontje meer
        html += `<h2 style="border-bottom:2px solid #e2e8f0; color:#2c3e50; margin-top:25px; padding-bottom:5px; font-size:1.3rem;">${mooieDatum}</h2>`;

        // ================== THUIS WEDSTRIJDEN ==================
        if(obj.thuis.length > 0) {
            obj.thuis.sort((a,b) => window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd));
            
            // Neutrale kleur en geen icoontje
            html += `<h3 style="color:#2c3e50; margin-bottom:10px; font-size:1.1rem;">Thuis</h3>`;
            html += `<table class="print-table">
                <thead>
                    <tr>
                        <th style="width:70px;">Wedst.nr</th>
                        <th style="width:50px;">Tijd</th>
                        <th>Wedstrijd</th>
                        <th style="width:140px;">Hal / Veld</th>
                        <th style="width:160px;">Scheidsrechter(s)</th>
                        <th style="width:160px;">Tafel / Scorer</th>
                    </tr>
                </thead>
                <tbody>`;
            
            obj.thuis.forEach(w => {
                let id = window.genereerUniekId(w);
                let st = window.planStatusDB[id];
                let pt = window.persoonsTakenDB[id] || {};
                let tt = window.teamTakenDB[id] || {};

                let wedstNr = w.Wedstrijdnummer || w.wedstrijdnummer || w.WedstrijdNummer || '-';
                let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
                let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();

                let sA = window.naamWeergave(pt.sA, tt.sA);
                let sB = window.naamWeergave(pt.sB, tt.sB);
                let scheidsStr = [sA, sB].filter(x => x !== '-').join('<br>');

                let tab = window.naamWeergave(pt.tab, tt.tab);
                let sco = window.naamWeergave(pt.sco, tt.sco);
                let tafelStr = [tab, sco].filter(x => x !== '-').join('<br>');

                // Lees accommodatie uit, fallback naar De Veste
                let accommodatie = w.Accommodatie || w.Locatie || w.Plaats || 'De Veste';
                let veldWeergave = (st.veld && st.veld !== 'uit') ? `<br><small style="color:#7f8c8d; font-weight:bold;">Veld ${st.veld}</small>` : '';

                html += `<tr>
                    <td style="font-size:0.8rem; color:#7f8c8d;">${wedstNr}</td>
                    <td style="font-weight:bold; font-size:1.05rem;">${st.tijd}</td>
                    <td><strong>${thuisNaam}</strong> - ${uitNaam}</td>
                    <td>${accommodatie}${veldWeergave}</td>
                    <td>${scheidsStr || '-'}</td>
                    <td>${tafelStr || '-'}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }

        // ================== UIT WEDSTRIJDEN ==================
        if(obj.uit.length > 0) {
            obj.uit.sort((a,b) => window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd));
            
            // Neutrale kleur en geen icoontje
            html += `<h3 style="color:#2c3e50; margin-bottom:10px; font-size:1.1rem; margin-top:20px;">Uit</h3>`;
            html += `<table class="print-table">
                <thead>
                    <tr>
                        <th style="width:70px;">Wedst.nr</th>
                        <th style="width:50px;">Tijd</th>
                        <th>Wedstrijd</th>
                        <th style="width:140px;">Plaats / Hal</th>
                        <th style="width:180px;">Vervoer</th>
                    </tr>
                </thead>
                <tbody>`;
            
            obj.uit.forEach(w => {
                let id = window.genereerUniekId(w);
                let st = window.planStatusDB[id];
                let pt = window.persoonsTakenDB[id] || {};

                let wedstNr = w.Wedstrijdnummer || w.wedstrijdnummer || w.WedstrijdNummer || '-';
                let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
                let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();

                let a1 = window.naamWeergave(pt.auto1, "Auto 1");
                let a2 = window.naamWeergave(pt.auto2, "Auto 2");
                let a3 = window.naamWeergave(pt.auto3, "Auto 3");
                let autoStr = [a1, a2, a3].filter(x => x !== '-' && !x.includes('Auto')).join('<br>');
                if(!autoStr) autoStr = `<span style="color:#e74c3c; font-style:italic;">Nog in te vullen</span>`;

                let plaats = w.Accommodatie || w.Locatie || w.Plaats || 'Onbekend';

                html += `<tr>
                    <td style="font-size:0.8rem; color:#7f8c8d;">${wedstNr}</td>
                    <td style="font-weight:bold; font-size:1.05rem;">${st.tijd}</td>
                    <td>${thuisNaam} - <strong>${uitNaam}</strong></td>
                    <td style="font-size:0.85rem;">${plaats}</td>
                    <td>${autoStr}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
        }
    });

    window.startPrintJob(html);
};
// ============================================================================
// RAPPORT 3: PERSOONLIJKE TAKENBRIEF (Zonder kleuren/icoontjes)
// ============================================================================
window.genereerPersoonlijkeBrief = function() {
    let enkelePersoonId = document.getElementById('select-persoon').value;
    let bulkTeamId = document.getElementById('select-team-brief').value;
    let ruweIntroTekst = document.getElementById('brief-intro').value.replace(/\n/g, '<br>');

    let huidigeMaand = new Date().getMonth(); 
    let seizoensHelft = (huidigeMaand >= 7) ? "eerste helft" : "tweede helft"; 
    let seizoenNaam = window.appInstellingen.seizoen || "huidige";
    
    let introTekst = ruweIntroTekst.replace(/\[HELFT\]/g, seizoensHelft).replace(/\[SEIZOEN\]/g, seizoenNaam);

    if (!enkelePersoonId && !bulkTeamId) return alert("Kies een persoon óf een team/club om te printen.");

    let personenTePrinten = [];

    if (bulkTeamId === "ALL") {
        window.spelersDB.forEach(s => personenTePrinten.push(s));
        window.scheidsrechtersDB.forEach(sr => { if(!sr.gekoppeldLid) personenTePrinten.push(sr); });
    } else if (bulkTeamId) {
        window.spelersDB.forEach(s => { if(s.teamId === bulkTeamId) personenTePrinten.push(s); });
    } else if (enkelePersoonId) {
        let p = window.spelersDB.find(s => s.id === enkelePersoonId) || window.scheidsrechtersDB.find(sr => sr.id === enkelePersoonId);
        if (p) personenTePrinten.push(p);
    }

    if(personenTePrinten.length === 0) return alert("Geen personen gevonden voor deze selectie.");

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let totaleHtml = "";

    personenTePrinten.forEach((persoon, index) => {
        let isSpeler = !!persoon.teamId;
        let mijnCanonTeam = isSpeler ? window.getCanonicalTeam(persoon.teamId) : null;
        let mijnTaken = [];
        let takenTeller = 0;

        let mijnStafTeams = [];
        window.teamsDB.forEach(t => {
            let coachStr = (t.coach || '').toLowerCase();
            let trainerStr = (t.trainer || '').toLowerCase();
            let pNaam = persoon.naam.toLowerCase();
            if (coachStr.includes(pNaam) || trainerStr.includes(pNaam)) mijnStafTeams.push(t.id);
        });

        alleWedstrijden.forEach(match => {
            let matchId = window.genereerUniekId(match);
            if (!window.planStatusDB[matchId]) return;

            let isThuiswedstrijd = (match.Thuisteam || '').toLowerCase().includes('black shots');
            let thuisTeamSchoon = match.Thuisteam.replace(/Black Shots\s*-?\s*/i, '').trim();
            let uitTeamSchoon = match.Uitteam.replace(/Black Shots\s*-?\s*/i, '').trim();
            let mCanonThuis = window.getCanonicalTeam(thuisTeamSchoon);
            let mCanonUit = window.getCanonicalTeam(uitTeamSchoon);

            let ikSpeelZelf = false;
            if (isSpeler && mijnCanonTeam) {
                if ((isThuiswedstrijd && mCanonThuis && mCanonThuis.id === mijnCanonTeam.id) || 
                    (!isThuiswedstrijd && mCanonUit && mCanonUit.id === mijnCanonTeam.id)) ikSpeelZelf = true;
            }

            let ikBenCoach = false;
            if ((mCanonThuis && mijnStafTeams.includes(mCanonThuis.id)) || 
                (mCanonUit && mijnStafTeams.includes(mCanonUit.id))) ikBenCoach = true;

            let pTaken = window.persoonsTakenDB[matchId] || {};
            let taakLabels = [];
            
            if (ikSpeelZelf) taakLabels.push("Speler");
            if (ikBenCoach) taakLabels.push("Coach");
            if (pTaken.sA === persoon.id || pTaken.sB === persoon.id) { taakLabels.push("Scheidsrechter"); takenTeller++; }
            if (pTaken.tab === persoon.id) { taakLabels.push("Tafelaar"); takenTeller++; }
            if (pTaken.sco === persoon.id) { taakLabels.push("Scorer"); takenTeller++; }
            if (pTaken.auto1 === persoon.id || pTaken.auto2 === persoon.id || pTaken.auto3 === persoon.id) { taakLabels.push("Vervoer / Auto"); takenTeller++; }

            if (taakLabels.length > 0) {
                mijnTaken.push({
                    isoDatum: window.normaalDatum(match.Datum),
                    tijd: window.planStatusDB[matchId].tijd,
                    thuis: match.Thuisteam.replace('Black Shots', 'BS'),
                    uit: match.Uitteam.replace('Black Shots', 'BS'),
                    taak: taakLabels.join(', '),
                    isThuiswedstrijd: isThuiswedstrijd
                });
            }
        });

        mijnTaken.sort((a, b) => {
            if (a.isoDatum !== b.isoDatum) return a.isoDatum.localeCompare(b.isoDatum);
            return a.tijd.localeCompare(b.tijd);
        });

        if (index > 0) totaleHtml += `<div class="page-break"></div>`; 

        let stafInfoHtml = '';
        let trainingenHtml = '';

        if (isSpeler && mijnCanonTeam) {
            stafInfoHtml += `<div style="font-size:0.95rem; color:#2c3e50; margin-bottom:2px;"><strong>Team:</strong> ${mijnCanonTeam.naam}</div>`;
            if (mijnCanonTeam.coach) stafInfoHtml += `<div style="font-size:0.95rem; color:#2c3e50; margin-bottom:2px;"><strong>Coach:</strong> ${mijnCanonTeam.coach}</div>`;
            if (mijnCanonTeam.trainer) stafInfoHtml += `<div style="font-size:0.95rem; color:#2c3e50; margin-bottom:2px;"><strong>Trainer:</strong> ${mijnCanonTeam.trainer}</div>`;
            
            if (mijnCanonTeam.trainingen && Array.isArray(mijnCanonTeam.trainingen)) {
                const dagenMap = {1:"Maandag", 2:"Dinsdag", 3:"Woensdag", 4:"Donderdag", 5:"Vrijdag", 6:"Zaterdag", 7:"Zondag", 0:"Zondag"};
                mijnCanonTeam.trainingen.forEach(tr => {
                    let dagNaam = dagenMap[parseInt(tr.dag)] || "Onbekend";
                    let loc = tr.zaal || 'Onbekend';
                    if (tr.veld) loc += ` (Veld ${tr.veld})`;
                    // Geen locatie icoon meer
                    trainingenHtml += `<div style="font-size:0.95rem; color:#2c3e50; margin-bottom:2px;"><strong>Training:</strong> ${dagNaam} ${tr.start || '?'} - ${tr.eind || '?'} | ${loc}</div>`;
                });
            }
        }

        totaleHtml += `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:15px; margin-bottom:20px;">
                <div style="flex:1;">
                    <h1 style="margin:0 0 10px 0; font-size:1.8rem; color:#2c3e50;">${persoon.naam}</h1>
                    <div style="margin-bottom:15px;">
                        ${stafInfoHtml}
                        ${trainingenHtml}
                    </div>
                    <div style="font-size:0.95rem; line-height:1.5; color:#2c3e50;">
                        <div><strong>Geboortedatum:</strong> ${persoon.geboorteDatum || '-'}</div>
                        <div><strong>Lid sinds:</strong> ${persoon.lidSinds || '-'}</div>
                        <div><strong>NBB Nummer:</strong> ${persoon.bondsnummer || '-'}</div>
                        <div><strong>Aantal toegewezen taken:</strong> ${takenTeller}</div>
                    </div>
                </div>
                <div style="width:180px; text-align:right;">
                    <img src="Logo Zwart.png" style="max-width:100%; height:auto;">
                </div>
            </div>
            
            <div style="margin-bottom:20px; line-height:1.5;">
                Beste ${persoon.naam.split(' ')[0]},<br><br>
                ${introTekst}<br><br>
                Met sportieve groet,<br>
                Wedstrijdsecretariaat Black Shots
            </div>
        `;

        if (mijnTaken.length === 0) {
            totaleHtml += `<p style="font-style:italic; color:#7f8c8d;">Er zijn in het systeem nog geen wedstrijden of taken aan jou gekoppeld voor de ingevoerde planning.</p>`;
        } else {
            // Geen felle kleuren meer in de table header
            totaleHtml += `<table class="print-table">
                <thead>
                    <tr>
                        <th style="width:120px;">Datum</th>
                        <th style="width:70px;">Tijd</th>
                        <th style="width:70px;">Locatie</th>
                        <th>Wedstrijd</th>
                        <th style="width:160px;">Jouw Taak</th>
                    </tr>
                </thead>
                <tbody>`;
            
            mijnTaken.forEach(taak => {
                let d = new Date(taak.isoDatum);
                let mooieDatum = isNaN(d) ? taak.isoDatum : d.toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                
                // Geen oranje kleur meer bij 'Jouw Taak'
                totaleHtml += `
                    <tr>
                        <td style="white-space:nowrap;">${mooieDatum}</td>
                        <td style="font-weight:bold; font-size:1.05rem;">${taak.tijd}</td>
                        <td>${taak.isThuiswedstrijd ? 'Thuis' : 'Uit'}</td>
                        <td><strong>${taak.thuis}</strong> - ${taak.uit}</td>
                        <td style="font-weight:bold;">${taak.taak}</td>
                    </tr>
                `;
            });
            
            totaleHtml += `</tbody></table>`;
        }
    });

    window.startPrintJob(totaleHtml);
};

// ============================================================================
// DE ANDERE RAPPORTEN (KLAARZETTEN VOOR VOLGENDE UPDATE)
// ============================================================================
window.genereerTeamOverzicht = function() {
    alert("Klaar voor de volgende update! Data wordt al ingeladen.");
};

window.genereerRegistratieFormulier = function() {
    alert("Klaar voor de volgende update! Data wordt al ingeladen.");
};