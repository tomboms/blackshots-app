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
    let selTeamTaken = document.getElementById('select-team-taken'); 

    // Teams vullen in alle drie de dropdowns
    if (selTeam || selTeamBrief || selTeamTaken) {
        window.teamsDB.forEach(t => {
            if (!t.isVrijwilliger && !t.isRecreant) {
                if(selTeam) selTeam.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
                if(selTeamBrief) selTeamBrief.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
                if(selTeamTaken) selTeamTaken.innerHTML += `<option value="${t.id}">${t.naam}</option>`; 
            }
        });
    }

    // Personen vullen
    let selPersoon = document.getElementById('select-persoon');
    if (selPersoon) {
        let allePersonen = [];
        window.spelersDB.forEach(s => allePersonen.push({ id: s.id, naam: s.naam, type: 'Speler' }));
        window.scheidsrechtersDB.forEach(sr => { if (!sr.gekoppeldLid) allePersonen.push({ id: sr.id, naam: sr.naam, type: 'Scheidsrechter' }); });
        allePersonen.sort((a,b) => a.naam.localeCompare(b.naam));
        allePersonen.forEach(p => { selPersoon.innerHTML += `<option value="${p.id}">${p.naam} (${p.type})</option>`; });
    }

    // Dagen en Weken vullen voor Registratie én WhatsApp
    let selDag = document.getElementById('select-dag-registratie');
    let selDagWa = document.getElementById('select-dag-whatsapp');
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
        
        // Vul beide datum-dropdowns in één soepele beweging
        if (selDag) selDag.innerHTML += `<option value="${dag}">${weergaveDatum}</option>`;
        if (selDagWa) selDagWa.innerHTML += `<option value="${dag}">${weergaveDatum}</option>`; 
    });
}

// ============================================================================
// DE PRINT / PDF ENGINE (Nu met anti-afbreek logica voor blokken en tabellen)
// ============================================================================
window.startPrintJob = function(htmlContent) {
    let printContainer = document.getElementById('print-container');
    
    let printStyle = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            #print-wrapper { font-family: 'Roboto', Arial, sans-serif; color: #000; background: white; padding: 20px; max-width: 900px; margin: 0 auto; font-size: 11pt; }
            
            /* Tabellen instellen zodat rijen NIET halverwege afbreken */
            .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.95rem; page-break-inside: auto; }
            .print-table tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            .print-table th, .print-table td { padding: 6px 8px; border-bottom: 1px solid #ccc; text-align: left; vertical-align: top; }
            .print-table th { background-color: #f8f9fa; font-weight: bold; border-bottom: 2px solid #000; color: #2c3e50; }
            
            /* Voor losse blokken (zoals wedstrijden in teamoverzicht) */
            .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; margin-bottom: 15px; }
            
            /* Forceer een harde pagina break (gebruikt tussen personen) */
            .page-break { page-break-before: always; height: 1px; width: 100%; display: block; margin: 0; padding: 0; border: none; }
            
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
// ============================================================================
// RAPPORT 1: WEEK- EN TAKENOVERZICHT (Zonder wedstrijdnummer)
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

        html += `<h2 style="border-bottom:2px solid #e2e8f0; color:#2c3e50; margin-top:25px; padding-bottom:5px; font-size:1.3rem;">${mooieDatum}</h2>`;

        // ================== THUIS WEDSTRIJDEN ==================
        if(obj.thuis.length > 0) {
            obj.thuis.sort((a,b) => window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd));
            
            html += `<h3 style="color:#2c3e50; margin-bottom:10px; font-size:1.1rem;">Thuis</h3>`;
            html += `<table class="print-table">
                <thead>
                    <tr>
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

                let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
                let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();

                let sA = window.naamWeergave(pt.sA, tt.sA);
                let sB = window.naamWeergave(pt.sB, tt.sB);
                let scheidsStr = [sA, sB].filter(x => x !== '-').join('<br>');

                let tab = window.naamWeergave(pt.tab, tt.tab);
                let sco = window.naamWeergave(pt.sco, tt.sco);
                let tafelStr = [tab, sco].filter(x => x !== '-').join('<br>');

                let accommodatie = w.Accommodatie || w.Locatie || w.Plaats || 'De Veste';
                let veldWeergave = (st.veld && st.veld !== 'uit') ? `<br><small style="color:#7f8c8d; font-weight:bold;">Veld ${st.veld}</small>` : '';

                html += `<tr>
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
            
            html += `<h3 style="color:#2c3e50; margin-bottom:10px; font-size:1.1rem; margin-top:20px;">Uit</h3>`;
            html += `<table class="print-table">
                <thead>
                    <tr>
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

                let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
                let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();

                let a1 = window.naamWeergave(pt.auto1, "Auto 1");
                let a2 = window.naamWeergave(pt.auto2, "Auto 2");
                let a3 = window.naamWeergave(pt.auto3, "Auto 3");
                let autoStr = [a1, a2, a3].filter(x => x !== '-' && !x.includes('Auto')).join('<br>');
                if(!autoStr) autoStr = `<span style="color:#e74c3c; font-style:italic;">Nog in te vullen</span>`;

                let plaats = w.Accommodatie || w.Locatie || w.Plaats || 'Onbekend';

                html += `<tr>
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
// RAPPORT 3: PERSOONLIJKE TAKENBRIEF
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

        // We kijken nu ALLEEN of je Coach bent voor de taak-koppeling bij wedstrijden
        let mijnCoachTeams = [];
        window.teamsDB.forEach(t => {
            let coachStr = (t.coach || '').toLowerCase();
            let pNaam = persoon.naam.toLowerCase();
            if (coachStr.includes(pNaam)) mijnCoachTeams.push(t.id);
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

            // Controleert of je specifiek de COACH bent van het team (en dus niet alleen trainer)
            let ikBenCoach = false;
            if ((mCanonThuis && mijnCoachTeams.includes(mCanonThuis.id)) || 
                (mCanonUit && mijnCoachTeams.includes(mCanonUit.id))) ikBenCoach = true;

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
                
                totaleHtml += `
                    <tr class="avoid-break">
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
// RAPPORT 2: TEAM ROSTER & PROGRAMMA (Nu met 'Spelers' en onbreekbare blokken)
// ============================================================================
window.genereerTeamOverzicht = function() {
    let teamId = document.getElementById('select-team').value;
    if (!teamId) return alert("Kies eerst een team voor dit rapport.");

    let tCanon = window.getCanonicalTeam(teamId);
    if (!tCanon) return alert("Team niet gevonden in de database.");

    // Verzamel spelers van dit team (en negeer recreanten expliciet!)
    let teamSpelers = window.spelersDB.filter(s => s.teamId === tCanon.id && !s.isRecreant);
    teamSpelers.sort((a, b) => a.naam.localeCompare(b.naam));

    let seizoenNaam = window.appInstellingen.seizoen || "2025-2026";
    let nuMooi = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let html = `
        <div class="print-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h1 style="margin:0 0 5px 0; font-size:1.6rem; color:#2c3e50;">Teamindeling: ${tCanon.naam}</h1>
                <div style="font-size:1.1rem; color:#34495e; font-weight:bold;">Teaminformatie Black Shots seizoen ${seizoenNaam}</div>
                <div style="font-size:0.9rem; color:#7f8c8d; margin-top:5px;">Aangemaakt op: ${nuMooi}</div>
            </div>
            <img src="Logo Zwart.png" style="width:110px; height:auto; object-fit:contain;">
        </div>
    `;

    // --- DEEL 1: ROSTER & STAF ---
    html += `<div style="display:flex; gap:40px; margin-bottom:30px; page-break-inside: avoid; break-inside: avoid;">`;
    
    // Spelerslijst
    html += `<div style="flex:2;">
        <h3 style="margin-top:0; color:#2c3e50; border-bottom:1px solid #ccc; padding-bottom:5px;">Spelers</h3>
        <ul style="list-style:none; padding:0; margin:0; font-size:0.95rem; line-height:1.6;">`;
    teamSpelers.forEach(s => {
        let rugnr = s.rugnummer || s.leeftijd || '-';
        let bondsNr = s.bondsnummer || 'Onbekend';
        html += `<li><span style="color:#7f8c8d; display:inline-block; width:90px;">${bondsNr}</span> <strong style="display:inline-block; width:30px;">${rugnr}</strong> ${s.naam}</li>`;
    });
    if (teamSpelers.length === 0) html += `<li><i style="color:#7f8c8d;">Nog geen spelers gekoppeld aan dit team.</i></li>`;
    html += `</ul></div>`;

    // Staf Info
    html += `<div style="flex:1;">
        <h3 style="margin-top:0; color:#2c3e50; border-bottom:1px solid #ccc; padding-bottom:5px;">Staf</h3>
        <div style="font-size:0.95rem; line-height:1.6;">
            <strong>Coach:</strong> ${tCanon.coach || 'Niet ingevuld'}<br>
            <strong>Trainer:</strong> ${tCanon.trainer || 'Niet ingevuld'}
        </div>
    </div></div>`;

    // --- DEEL 2: WEDSTRIJD PROGRAMMA ---
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let mijnWedstrijden = alleWedstrijden.filter(w => {
        let mCanonThuis = window.getCanonicalTeam(w.Thuisteam.replace(/Black Shots\s*-?\s*/i, '').trim());
        let mCanonUit = window.getCanonicalTeam(w.Uitteam.replace(/Black Shots\s*-?\s*/i, '').trim());
        let matchId = window.genereerUniekId(w);
        return window.planStatusDB[matchId] && ((mCanonThuis && mCanonThuis.id === tCanon.id) || (mCanonUit && mCanonUit.id === tCanon.id));
    });

    mijnWedstrijden.sort((a, b) => {
        let dA = window.normaalDatum(a.Datum); let dB = window.normaalDatum(b.Datum);
        if (dA !== dB) return dA.localeCompare(dB);
        return window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd);
    });

    html += `<h3 style="color:#2c3e50; border-bottom:2px solid #2c3e50; padding-bottom:5px; margin-top:30px;">Wedstrijdprogramma</h3>`;
    
    mijnWedstrijden.forEach(w => {
        let id = window.genereerUniekId(w);
        let st = window.planStatusDB[id];
        let pt = window.persoonsTakenDB[id] || {};
        let tt = window.teamTakenDB[id] || {};
        
        let d = new Date(window.normaalDatum(w.Datum));
        let mooieDatum = isNaN(d) ? w.Datum : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
        let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
        let accommodatie = w.Accommodatie || w.Locatie || w.Plaats || (isThuis ? 'De Veste' : 'Onbekend');
        let veldTekst = (st.veld && st.veld !== 'uit') ? `(Veld ${st.veld})` : '';

        let takenHtml = '';
        if (isThuis) {
            let sA = window.naamWeergave(pt.sA, tt.sA); let sB = window.naamWeergave(pt.sB, tt.sB);
            let tab = window.naamWeergave(pt.tab, tt.tab); let sco = window.naamWeergave(pt.sco, tt.sco);
            let scheidsStr = [sA, sB].filter(x => x !== '-').join(', ');
            let tafelStr = [tab, sco].filter(x => x !== '-').join(', ');
            
            takenHtml = `
                <div style="font-size:0.9rem; color:#555;"><strong>Scheidsrechter(s):</strong> ${scheidsStr || '-'}</div>
                <div style="font-size:0.9rem; color:#555;"><strong>Tafel / Scorer:</strong> ${tafelStr || '-'}</div>
            `;
        } else {
            let a1 = window.naamWeergave(pt.auto1, "Auto 1"); let a2 = window.naamWeergave(pt.auto2, "Auto 2"); let a3 = window.naamWeergave(pt.auto3, "Auto 3");
            let autoStr = [a1, a2, a3].filter(x => x !== '-' && !x.includes('Auto')).join(', ');
            takenHtml = `<div style="font-size:0.9rem; color:#555;"><strong>Vervoer:</strong> ${autoStr || '<i style="color:#e74c3c;">Nog in te vullen</i>'}</div>`;
        }

        // TOEGEVOEGD: class="avoid-break" zorgt ervoor dat dit blokje nooit doormidden wordt geknipt door de printer
        html += `
            <div class="avoid-break" style="padding-bottom:10px; border-bottom:1px dashed #ccc;">
                <div style="font-weight:bold; color:#2c3e50; font-size:1.05rem; margin-bottom:3px;">${mooieDatum}</div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:2;">
                        <span style="display:inline-block; width:50px; font-weight:bold;">${st.tijd}</span>
                        <span style="display:inline-block; width:50px; color:#7f8c8d;">${isThuis ? 'Thuis' : 'Uit'}</span>
                        <span style="font-weight:bold;">${thuisNaam} - ${uitNaam}</span>
                    </div>
                    <div style="flex:1; text-align:right; font-size:0.9rem; color:#7f8c8d;">${accommodatie} ${veldTekst}</div>
                </div>
                <div style="margin-top:5px; padding-left:100px;">
                    ${takenHtml}
                </div>
            </div>
        `;
    });

    window.startPrintJob(html);
};

// ============================================================================
// RAPPORT 4: TAKENOVERZICHT PER TEAMLID (Voor Coach/Manager)
// ============================================================================
window.genereerTakenPerTeam = function() {
    let teamId = document.getElementById('select-team-taken').value;
    if (!teamId) return alert("Kies eerst een team voor dit rapport.");

    let spelersLijst = [];
    if (teamId === "ALL") {
        spelersLijst = window.spelersDB.filter(s => s.teamId); 
    } else {
        spelersLijst = window.spelersDB.filter(s => s.teamId === teamId);
    }
    
    if (spelersLijst.length === 0) return alert("Geen spelers gevonden voor deze selectie.");
    spelersLijst.sort((a, b) => a.naam.localeCompare(b.naam));

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let html = `
        <div class="print-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h1 style="margin:0 0 5px 0; font-size:1.6rem; color:#2c3e50;">Alle taken voor team: ${teamId === 'ALL' ? 'Volledige Club' : window.getCanonicalTeam(teamId).naam}</h1>
                <div style="font-size:0.9rem; color:#7f8c8d; margin-top:5px;">Aangemaakt op: ${new Date().toLocaleDateString('nl-NL')}</div>
            </div>
            <img src="Logo Zwart.png" style="width:90px; height:auto; object-fit:contain;">
        </div>
    `;

    // Loop door elke speler in de lijst
    spelersLijst.forEach(persoon => {
        let mijnTaken = [];
        
        alleWedstrijden.forEach(match => {
            let matchId = window.genereerUniekId(match);
            if (!window.planStatusDB[matchId]) return;

            let pTaken = window.persoonsTakenDB[matchId] || {};
            let isThuis = (match.Thuisteam || '').toLowerCase().includes('black shots');
            let taakLabel = null;
            
            if (pTaken.sA === persoon.id || pTaken.sB === persoon.id) taakLabel = "Scheidsrechter";
            else if (pTaken.tab === persoon.id) taakLabel = "Tafelaar";
            else if (pTaken.sco === persoon.id) taakLabel = "Scorer";
            else if (pTaken.auto1 === persoon.id || pTaken.auto2 === persoon.id || pTaken.auto3 === persoon.id) taakLabel = "Vervoer";

            if (taakLabel) {
                mijnTaken.push({
                    isoDatum: window.normaalDatum(match.Datum),
                    tijd: window.planStatusDB[matchId].tijd,
                    thuis: match.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim(),
                    uit: match.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim(),
                    taak: taakLabel
                });
            }
        });

        mijnTaken.sort((a, b) => {
            if (a.isoDatum !== b.isoDatum) return a.isoDatum.localeCompare(b.isoDatum);
            return a.tijd.localeCompare(b.tijd);
        });

        // HTML per speler (Dikgedrukte naam, daaronder een lijst)
        html += `<div style="margin-top:20px; page-break-inside: avoid;">
            <div style="font-weight:bold; font-size:1.15rem; color:#2c3e50; border-bottom:1px solid #ccc; margin-bottom:8px; padding-bottom:3px;">${persoon.naam}</div>`;

        if (mijnTaken.length === 0) {
            html += `<div style="font-size:0.9rem; color:#7f8c8d; margin-bottom:10px;">Geen taken</div>`;
        } else {
            html += `<table style="width:100%; border-collapse:collapse; font-size:0.9rem; margin-bottom:15px;">
                <tbody>`;
            
            mijnTaken.forEach(t => {
                let d = new Date(t.isoDatum);
                let datumWeergave = isNaN(d) ? t.isoDatum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                
                html += `<tr>
                    <td style="width:90px; padding:3px 0;">${datumWeergave}</td>
                    <td style="width:60px; padding:3px 0; font-weight:bold;">${t.tijd}</td>
                    <td style="padding:3px 0;">${t.thuis} - ${t.uit}</td>
                    <td style="width:120px; padding:3px 0; font-weight:bold; color:#2c3e50; text-align:right;">${t.taak}</td>
                </tr>`;
            });
            
            html += `</tbody></table>`;
        }
        html += `</div>`;
    });

    window.startPrintJob(html);
};

// ============================================================================
// HULPFUNCTIE VOOR TIJD/DUUR BEREKENING (Voor Zaalhuur & Formulieren)
// ============================================================================
window.tijdNaarMinuten = function(tijdStr) {
    if (!tijdStr || !tijdStr.includes(':')) return 0;
    let p = tijdStr.split(':'); return (parseInt(p[0]) * 60) + parseInt(p[1]);
};
window.minutenNaarTijd = function(minuten) {
    let u = Math.floor(minuten / 60); let m = minuten % 60;
    return `${String(u).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};
window.bepaalWedstrijdDuur = function(teamNaam) {
    let naam = (teamNaam || '').toUpperCase();
    if (naam.includes('14') || naam.includes('16') || naam.includes('18') || naam.includes('20') || naam.includes('22') || naam.includes('SE')) return 105;
    return 90; 
};

// ============================================================================
// RAPPORT 5: REGISTRATIE WEDSTRIJDEN (ZAALWACHT FORMULIER)
// ============================================================================
window.genereerRegistratieFormulier = function() {
    let speeldag = document.getElementById('select-dag-registratie').value;
    if (!speeldag) return alert("Kies eerst een speeldag voor het registratieformulier.");

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => {
        let id = window.genereerUniekId(w);
        let d = window.normaalDatum(w.Datum);
        // Alleen actieve thuiswedstrijden op de geselecteerde dag
        return d === speeldag && window.planStatusDB[id] && (w.Thuisteam || '').toLowerCase().includes('black shots');
    });

    if(dagWedstrijden.length === 0) return alert("Er zijn geen thuiswedstrijden gepland op deze dag.");

    // Sorteer op tijd
    dagWedstrijden.sort((a, b) => window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd));

    let seizoenNaam = window.appInstellingen.seizoen || "2025-2026";
    let datumMooi = new Date(speeldag).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let html = `
        <div class="print-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h1 style="margin:0 0 5px 0; font-size:1.6rem; color:#2c3e50;">Registratie wedstrijden Black Shots</h1>
                <div style="font-size:1.1rem; color:#34495e;">Seizoen ${seizoenNaam}</div>
                <div style="font-size:1rem; margin-top:5px; font-weight:bold;">Zaalwacht: ___________________________</div>
            </div>
            <div style="text-align:right;">
                <img src="Logo Zwart.png" style="width:100px; height:auto; object-fit:contain; margin-bottom:5px;">
                <div style="font-size:1.1rem; font-weight:bold; color:#2c3e50;">${datumMooi}</div>
            </div>
        </div>
    `;

    dagWedstrijden.forEach((w, index) => {
        let id = window.genereerUniekId(w);
        let st = window.planStatusDB[id];
        let pt = window.persoonsTakenDB[id] || {};
        let tt = window.teamTakenDB[id] || {};

        let wedstNr = w.Wedstrijdnummer || w.wedstrijdnummer || w.WedstrijdNummer || '-';
        let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
        let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();

        let sA = window.naamWeergave(pt.sA, tt.sA);
        let sB = window.naamWeergave(pt.sB, tt.sB);
        let tab = window.naamWeergave(pt.tab, tt.tab);
        let sco = window.naamWeergave(pt.sco, tt.sco);

        // Zorgt ervoor dat blokken niet knippen in de PDF
        if (index > 0 && index % 3 === 0) html += `<div class="page-break"></div>`;

        html += `
            <div class="avoid-break" style="border:2px solid #2c3e50; border-radius:6px; padding:15px; margin-bottom:20px; font-size:0.95rem;">
                
                <table style="width:100%; margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px;">
                    <tr>
                        <td style="width:25%;"><strong>Competitie:</strong><br>${w.Poule || '-'}</td>
                        <td style="width:25%;"><strong>Wedstrijdnr:</strong><br>${wedstNr}</td>
                        <td style="width:25%;"><strong>Veld:</strong><br>${st.veld || '-'}</td>
                        <td style="width:25%;"><strong>Tijd:</strong><br><span style="font-size:1.2rem; font-weight:bold;">${st.tijd}</span></td>
                    </tr>
                </table>

                <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:1.05rem;">
                    <div style="flex:1;"><strong>Thuis:</strong> ${thuisNaam}</div>
                    <div style="flex:1;"><strong>Uit:</strong> ${uitNaam}</div>
                    <div style="flex:1; text-align:right;"><strong>Uitslag:</strong> ____ - ____</div>
                </div>

                <table style="width:100%; border-collapse:collapse;">
                    <tr style="border-top:1px solid #eee;">
                        <td style="padding:8px 0; width:100px;"><strong>Tafel:</strong></td>
                        <td style="padding:8px 0; width:220px;">${tab}</td>
                        <td style="padding:8px 0;">Aanwezig? [ &nbsp; ] &nbsp; Zo nee, wie wel? ____________________</td>
                    </tr>
                    <tr style="border-top:1px dashed #eee;">
                        <td style="padding:8px 0;"><strong>Scorer:</strong></td>
                        <td style="padding:8px 0;">${sco}</td>
                        <td style="padding:8px 0;">Aanwezig? [ &nbsp; ] &nbsp; Zo nee, wie wel? ____________________</td>
                    </tr>
                    <tr style="border-top:1px dashed #eee;">
                        <td style="padding:8px 0;"><strong>24-sec:</strong></td>
                        <td style="padding:8px 0;">-</td>
                        <td style="padding:8px 0;">Aanwezig? [ &nbsp; ] &nbsp; Zo nee, wie wel? ____________________</td>
                    </tr>
                    <tr style="border-top:1px solid #eee;">
                        <td style="padding:8px 0;"><strong>Scheids 1:</strong></td>
                        <td style="padding:8px 0;">${sA}</td>
                        <td style="padding:8px 0;">Aanwezig? [ &nbsp; ] &nbsp; Zo nee, wie wel? ____________________</td>
                    </tr>
                    <tr style="border-top:1px dashed #eee;">
                        <td style="padding:8px 0;"><strong>Scheids 2:</strong></td>
                        <td style="padding:8px 0;">${sB}</td>
                        <td style="padding:8px 0;">Aanwezig? [ &nbsp; ] &nbsp; Zo nee, wie wel? ____________________</td>
                    </tr>
                </table>
            </div>
        `;
    });

    window.startPrintJob(html);
};

// ============================================================================
// RAPPORT 6: ZAALHUUR OVERZICHT (Met check op niet aansluitende tijden!)
// ============================================================================
window.genereerZaalhuurOverzicht = function() {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let thuisWedstrijden = alleWedstrijden.filter(w => {
        let id = window.genereerUniekId(w);
        return window.planStatusDB[id] && (w.Thuisteam || '').toLowerCase().includes('black shots');
    });

    if(thuisWedstrijden.length === 0) return alert("Geen geplande thuiswedstrijden gevonden.");

    // Groepeer op datum en vervolgens op veld
    let perDagEnVeld = {};
    thuisWedstrijden.forEach(w => {
        let d = window.normaalDatum(w.Datum);
        let id = window.genereerUniekId(w);
        let st = window.planStatusDB[id];
        let veld = st.veld || '1';
        let hal = w.Accommodatie || w.Locatie || w.Plaats || 'Veka-sportcentrum';
        
        let startMin = window.tijdNaarMinuten(st.tijd);
        let duur = w.handmatigeDuur || window.bepaalWedstrijdDuur(w.Thuisteam.replace(/Black Shots\s*-?\s*/i, '').trim());
        let eindMin = startMin + duur;

        if(!perDagEnVeld[d]) perDagEnVeld[d] = {};
        if(!perDagEnVeld[d][veld]) perDagEnVeld[d][veld] = { hal: hal, blokken: [] };
        
        perDagEnVeld[d][veld].blokken.push({ start: startMin, eind: eindMin });
    });

    let html = `
        <div class="print-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h1 style="margin:0 0 5px 0; font-size:1.6rem; color:#2c3e50;">Zaalhuur Overzicht</h1>
                <div style="font-size:0.9rem; color:#7f8c8d; margin-top:5px;">Aangemaakt op: ${new Date().toLocaleDateString('nl-NL')}</div>
            </div>
            <img src="Logo Zwart.png" style="width:90px; height:auto; object-fit:contain;">
        </div>

        <table class="print-table">
            <thead>
                <tr>
                    <th style="width:160px;">Datum</th>
                    <th style="width:200px;">Tijd</th>
                    <th style="width:70px;">Veld</th>
                    <th style="width:150px;">Hal</th>
                    <th>Opmerking</th>
                </tr>
            </thead>
            <tbody>
    `;

    let gesorteerdeDagen = Object.keys(perDagEnVeld).sort();

    gesorteerdeDagen.forEach(dag => {
        let veldenOpDag = perDagEnVeld[dag];
        let mooieDatum = new Date(dag).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        
        // Loop per veld
        Object.keys(veldenOpDag).sort().forEach((veldId, veldIdx) => {
            let data = veldenOpDag[veldId];
            data.blokken.sort((a,b) => a.start - b.start);

            let tijdenStr = "";
            let opmerking = "";
            let vorigEind = null;

            data.blokken.forEach((blok, idx) => {
                tijdenStr += `${window.minutenNaarTijd(blok.start)}-${window.minutenNaarTijd(blok.eind)}`;
                if (idx < data.blokken.length - 1) tijdenStr += "<br>";
                
                // Slimme check: Sluit de eindtijd aan op de volgende starttijd? (Marge van 5 minuten toegestaan)
                if (vorigEind !== null && (blok.start - vorigEind) > 5) {
                    opmerking = `<span style="color:#e74c3c; font-weight:bold;">Tijden sluiten niet aan</span>`;
                }
                vorigEind = blok.eind;
            });

            // Alleen de datum tonen bij de allereerste rij van die dag
            let toonDatum = veldIdx === 0 ? `<strong>${mooieDatum}</strong>` : '';
            
            html += `
                <tr class="avoid-break">
                    <td>${toonDatum}</td>
                    <td style="font-family:monospace; font-size:0.95rem;">${tijdenStr}</td>
                    <td>Veld ${veldId}</td>
                    <td>${data.hal}</td>
                    <td>${opmerking}</td>
                </tr>
            `;
        });
    });

    html += `</tbody></table>`;
    window.startPrintJob(html);
};

// ============================================================================
// RAPPORT 7: WHATSAPP HERINNERINGEN & FOTO EXPORT
// ============================================================================
window.genereerWhatsAppBerichten = function() {
    let speeldag = document.getElementById('select-dag-whatsapp').value;
    if (!speeldag) return alert("Kies eerst een speeldag voor de WhatsApp herinneringen.");

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => {
        return window.normaalDatum(w.Datum) === speeldag && window.planStatusDB[window.genereerUniekId(w)];
    });

    if (dagWedstrijden.length === 0) return alert("Geen wedstrijden gevonden op deze dag.");

    let takenPerTeam = {}; // Hier slaan we op: { 'M16-1': ['Armin', 'Jamian'], 'X14-1': ['Tom'] }

    // Zoek uit wie er allemaal een taak hebben op deze dag
    dagWedstrijden.forEach(match => {
        let matchId = window.genereerUniekId(match);
        let pTaken = window.persoonsTakenDB[matchId] || {};
        
        let actieveRollen = [pTaken.sA, pTaken.sB, pTaken.tab, pTaken.sco, pTaken.auto1, pTaken.auto2, pTaken.auto3];
        
        actieveRollen.forEach(pId => {
            if (pId && pId !== "Vrij") {
                let speler = window.spelersDB.find(s => s.id === pId);
                // Als het een speler is (met een team), voeg hem toe aan de lijst van dat team
                if (speler && speler.teamId) {
                    if (!takenPerTeam[speler.teamId]) takenPerTeam[speler.teamId] = new Set();
                    takenPerTeam[speler.teamId].add(speler.naam.split(' ')[0]); // We gebruiken alleen de voornaam voor WhatsApp
                }
            }
        });
    });

    if (Object.keys(takenPerTeam).length === 0) {
        return alert("Er zijn voor deze dag nog geen spelers ingedeeld voor taken.");
    }

    let d = new Date(speeldag);
    let dagNaam = isNaN(d) ? speeldag : d.toLocaleDateString('nl-NL', { weekday: 'long' });
    let mooieDatum = isNaN(d) ? speeldag : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // Bouw de Modal (Pop-up) UI
    let modalHtml = `
        <div id="wa-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:9999; display:flex; justify-content:center; align-items:center;">
            <div style="background:white; border-radius:12px; width:90%; max-width:800px; max-height:90vh; overflow-y:auto; padding:30px; position:relative;">
                <button onclick="document.getElementById('wa-modal').remove()" style="position:absolute; top:15px; right:15px; background:#e74c3c; color:white; border:none; border-radius:50%; width:35px; height:35px; font-weight:bold; cursor:pointer; font-size:1.2rem;">&times;</button>
                
                <h2 style="margin-top:0; color:#25D366; display:flex; align-items:center; gap:10px;">
                    💬 WhatsApp Export <span style="font-size:1rem; color:#7f8c8d; font-weight:normal;">(${mooieDatum})</span>
                </h2>
                
                <div style="background:#e8f8f5; border:1px solid #25D366; padding:15px; border-radius:8px; margin-bottom:25px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#2c3e50;">1. Foto van het dagschema genereren</strong><br>
                        <span style="font-size:0.85rem; color:#7f8c8d;">Download het overzicht als PNG-foto om in de groepsapp te sturen.</span>
                    </div>
                    <button onclick="window.downloadSchemaAlsFoto('${speeldag}')" style="background:#25D366; color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">📸 Download Foto</button>
                </div>

                <h3 style="color:#2c3e50; border-bottom:2px solid #eee; padding-bottom:10px;">2. Teksten per team kopiëren</h3>
    `;

    // Genereer de tekst per team
    Object.keys(takenPerTeam).sort().forEach(teamId => {
        let namenArray = Array.from(takenPerTeam[teamId]);
        let namenStr = namenArray.map(n => '@' + n).join(', ');
        
        // Vervang de laatste komma door " en " voor goed Nederlands
        if (namenArray.length > 1) {
            let lastComma = namenStr.lastIndexOf(', ');
            namenStr = namenStr.substring(0, lastComma) + ' en ' + namenStr.substring(lastComma + 2);
        }

        let appTekst = `Het takenschema van aankomende ${dagNaam}! ${namenStr} jullie hebben een taak. Graag 15 min voor je taak aanwezig. Tot ${dagNaam}!`;

        modalHtml += `
            <div style="background:#f8f9fa; border:1px solid #cbd5e1; border-radius:8px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="color:#34495e; font-size:1.1rem;">Team: ${window.getCanonicalTeam(teamId) ? window.getCanonicalTeam(teamId).naam : teamId}</strong>
                    <button onclick="navigator.clipboard.writeText(document.getElementById('wa-text-${teamId}').value); alert('Tekst gekopieerd!');" style="background:#3498db; color:white; border:none; padding:6px 15px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.9rem;">📋 Kopieer</button>
                </div>
                <textarea id="wa-text-${teamId}" style="width:100%; height:60px; padding:10px; border:1px solid #ccc; border-radius:4px; font-family:inherit; resize:none;" readonly>${appTekst}</textarea>
            </div>
        `;
    });

    modalHtml += `</div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ============================================================================
// HULPFUNCTIE: SCHEMA RENDEREN EN DOWNLOADEN ALS FOTO
// ============================================================================
window.downloadSchemaAlsFoto = function(speeldag) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => window.normaalDatum(w.Datum) === speeldag && window.planStatusDB[window.genereerUniekId(w)]);
    
    dagWedstrijden.sort((a,b) => window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd));

    let mooieDatum = new Date(speeldag).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

    // We bouwen een tijdelijk, strak, wit element dat we 'fotograferen'
    let tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #2c3e50; padding-bottom:10px; margin-bottom:20px;">
            <h2 style="margin:0; color:#2c3e50; font-size:2rem;">${mooieDatum}</h2>
            <h2 style="margin:0; color:#2c3e50; font-size:2rem;">Thuis</h2>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:1rem;">
            <thead>
                <tr style="border-bottom:2px solid #ccc;">
                    <th style="text-align:left; padding:8px;">Tijd</th>
                    <th style="text-align:left; padding:8px;">Wedstrijd</th>
                    <th style="text-align:left; padding:8px;">Hal / Veld</th>
                    <th style="text-align:left; padding:8px;">Scheidsrechter(s)</th>
                    <th style="text-align:left; padding:8px;">Tafel / Scorer</th>
                </tr>
            </thead>
            <tbody>
    `;

    dagWedstrijden.forEach(w => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        if (!isThuis) return; // Voor deze foto vaak alleen thuiswedstrijden relevant (zoals in jouw screenshot)

        let id = window.genereerUniekId(w);
        let st = window.planStatusDB[id];
        let pt = window.persoonsTakenDB[id] || {};
        let tt = window.teamTakenDB[id] || {};

        let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
        let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();

        let sA = window.naamWeergave(pt.sA, tt.sA); let sB = window.naamWeergave(pt.sB, tt.sB);
        let tab = window.naamWeergave(pt.tab, tt.tab); let sco = window.naamWeergave(pt.sco, tt.sco);

        html += `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px 8px; font-weight:bold;">${st.tijd}</td>
                <td style="padding:10px 8px;"><strong>${thuisNaam}</strong> - ${uitNaam}</td>
                <td style="padding:10px 8px;">Veld ${st.veld}</td>
                <td style="padding:10px 8px;">${[sA, sB].filter(x=>x!=='-').join('<br>')}</td>
                <td style="padding:10px 8px;">${[tab, sco].filter(x=>x!=='-').join('<br>')}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    tempContainer.innerHTML = html;
    document.body.appendChild(tempContainer);

    // Maak de foto met html2canvas
    html2canvas(tempContainer, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
        let link = document.createElement('a');
        link.download = `Taken_Schema_${speeldag}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        // Verwijder het tijdelijke element
        document.body.removeChild(tempContainer);
    }).catch(err => {
        alert("Fout bij genereren van de foto: " + err);
        document.body.removeChild(tempContainer);
    });
};