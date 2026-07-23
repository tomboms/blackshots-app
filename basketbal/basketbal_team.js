// --- BASKETBAL_TEAM.JS: MET STRENGE UNIVERSELE ALIAS-VERTALER & WEDSTRIJDEN LADING ---

window.getCanonicalTeam = function(identifier) {
    if (!identifier) return null;
    let zoekTerm = String(identifier).toLowerCase().trim();
    if (!Array.isArray(window.teamsDB)) return null;

    return window.teamsDB.find(team => {
        let tId = String(team.id || '').toLowerCase().trim();
        let tNaam = String(team.naam || '').toLowerCase().trim();
        if (zoekTerm === tId || zoekTerm === tNaam) return true;
        if (team.aliassen) {
            let aliasArray = team.aliassen.toLowerCase().split(',').map(a => a.trim()).filter(Boolean);
            if (aliasArray.includes(zoekTerm)) return true;
        }
        return false;
    });
};

// --- Hulpfunctie: Datum Format ---
window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10);
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) { let delen = str.split('-'); return `${delen[2]}-${delen[1]}-${delen[0]}`; }
    return str;
};

// --- Hulpfunctie: Genereer de keuzelijst voor Coaches & Trainers ---
window.vulPersoonDropdowns = function() {
    let personenLijst = [];
    let spelers = window.spelersDB || JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
    let scheids = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
    
    spelers.forEach(s => personenLijst.push({id: s.id, naam: s.naam, type: 'Lid'}));
    scheids.forEach(s => { if(!s.gekoppeldLid) personenLijst.push({id: s.id, naam: s.naam, type: 'Kader'}); });
    
    personenLijst.sort((a,b) => a.naam.localeCompare(b.naam));
    
    let optiesHtml = '';
    personenLijst.forEach(p => {
        optiesHtml += `<label style="display:flex; align-items:center; gap:5px; font-size:0.85rem; padding:3px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;"><input type="checkbox" value="${p.id}" data-naam="${p.naam}"> <span>${p.naam} <span style="font-size:0.7rem; color:#7f8c8d;">(${p.type})</span></span></label>`;
    });

    ['nieuw-team-coach', 'nieuw-team-trainer', 'edit-team-coach', 'edit-team-trainer'].forEach(id => {
        let el = document.getElementById(id + '-container');
        if (el) el.innerHTML = optiesHtml;
    });
};

window.naamUitId = function(pId, fallbackTitel) {
    if (!pId) return fallbackTitel;
    let spelers = window.spelersDB || JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
    let scheids = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
    let persoon = spelers.find(s => s.id === pId) || scheids.find(s => s.id === pId);
    return persoon ? persoon.naam : pId; // Als het ID toch nog oude tekst was ("Martin"), toon die tekst.
};

// ============================================================================
// TEAM BEHEER RENDEREN
// ============================================================================
window.renderTeamBeheer = function() {
    try {
        window.vulPersoonDropdowns(); // Zorg dat de dropdowns altijd vol zitten met de laatste leden

        const lijst = document.getElementById('team-beheer-lijst');
        if (!lijst) return;

        let lijstHTML = '';
        const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag"};

        if (!Array.isArray(window.teamsDB)) window.teamsDB = [];
        if (!Array.isArray(window.spelersDB)) window.spelersDB = [];
        
        let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        let nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
        let planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {};

        let vandaag = new Date();
        let vandaagIso = vandaag.toISOString().split('T')[0];
        
        let horizonInput = document.getElementById('team-event-horizon-date');
        let maxDatumIso = horizonInput ? horizonInput.value : '';

        if (!maxDatumIso) {
            let standaardMax = new Date();
            standaardMax.setDate(vandaag.getDate() + 60);
            maxDatumIso = standaardMax.toISOString().split('T')[0];
            if (horizonInput) horizonInput.value = maxDatumIso; 
        }

        window.teamsDB.forEach((team, index) => {
            if (!team) return;

            // Zorg voor de nieuwe instellingen per team
            let maxAutos = team.autoAantal || 3;
            let teamDuur = team.thuisWedstrijdDuur || 90;

            // --- SPELERS LADEN ---
            let teamSpelers = window.spelersDB.filter(s => {
                if (!s || !s.teamId) return false;
                let gevondenTeam = window.getCanonicalTeam(s.teamId);
                return gevondenTeam && gevondenTeam.id === team.id;
            });

            // Slimme Auto Berekening: Als autoAantal nog niet handmatig was overschreven, bereken hem dan (1 auto per 3.5 spelers, max 3)
            if (!team.autoAantal && teamSpelers.length > 0) {
                maxAutos = Math.min(3, Math.ceil(teamSpelers.length / 3.5));
            }

            teamSpelers.sort((a, b) => {
                let aRec = a.isRecreant === true || (a.clubLidmaatschap && a.clubLidmaatschap.toLowerCase().includes('rec'));
                let bRec = b.isRecreant === true || (b.clubLidmaatschap && b.clubLidmaatschap.toLowerCase().includes('rec'));
                if (aRec && !bRec) return 1;  
                if (!aRec && bRec) return -1;  
                return (a.naam || '').localeCompare(b.naam || '');
            });

            let spelersHtml = '';
            if (teamSpelers.length > 0) {
                teamSpelers.forEach(speler => {
                    let isRec = speler.isRecreant === true || (speler.clubLidmaatschap && speler.clubLidmaatschap.toLowerCase().includes('rec'));
                    let recBadge = isRec ? `<span style="background:#f1c40f; color:#2c3e50; padding:2px 4px; border-radius:3px; font-size:0.7rem; margin-left:4px; font-weight:bold; border:1px solid #e67e22;">REC</span>` : '';
                    
                    spelersHtml += `
                        <span style="display:inline-flex; align-items:center; background:#eef2f5; padding:6px 12px; border-radius:20px; font-size:0.9rem; margin-right:8px; margin-bottom:8px; font-weight:bold; color:var(--secondary-color); border:1px solid #bdc3c7;">
                            ${speler.naam || 'Onbekend'} ${speler.rugnummer ? `&nbsp; <span style="color:#e67e22;">(#${speler.rugnummer})</span>` : ''} ${recBadge}
                            <button onclick="window.haalSpelerUitTeam('${speler.id}')" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; margin-left:8px; font-size:1.1rem; padding:0;">&times;</button>
                        </span>
                    `;
                });
            } else {
                spelersHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.9rem;">Geen leden in deze groep gekoppeld.</span>';
            }

            // --- VASTE TRAININGEN LADEN ---
            let trainingenHtml = '';
            if (Array.isArray(team.trainingen) && team.trainingen.length > 0) {
                team.trainingen.forEach((tr, trIndex) => {
                    let veldTekst = tr.veld ? ` - Veld ${tr.veld}` : '';
                    let duurTekst = tr.duur ? ` (${tr.duur} min)` : ' (90 min)';
                    trainingenHtml += `
                        <div style="display:inline-flex; align-items:center; background:#fff8e1; border:1px solid #f1c40f; padding:4px 10px; border-radius:4px; font-size:0.85rem; margin-right:5px; margin-bottom:5px;">
                            <strong>${dagenMap[tr.dag] || 'Dag'}</strong>&nbsp; ${tr.start || '?'}-${tr.eind || '?'} (${tr.zaal || 'Geen zaal'}${veldTekst})${duurTekst}
                            <button onclick="window.verwijderVasteTraining(${index}, ${trIndex})" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; margin-left:5px;">X</button>
                        </div>
                    `;
                });
            } else {
                trainingenHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.85rem;">Geen vaste tijden ingepland.</span>';
            }

            // --- NBB WEDSTRIJDEN LADEN ---
            let actueleWedstrijden = nbbWedstrijden.filter(w => {
                if (!w.Datum || window.normaalDatum(w.Datum) < vandaagIso) return false;
                let thuis = (w.Thuisteam || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                let uit = (w.Uitteam || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                let checkNaam = team.naam.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                return thuis.includes(checkNaam) || uit.includes(checkNaam);
            });
            
            actueleWedstrijden.sort((a,b) => window.normaalDatum(a.Datum).localeCompare(window.normaalDatum(b.Datum)));
            let komendeWedstrijden = actueleWedstrijden.slice(0, 5); // Max 5

            let wedstrijdenHtml = '';
            if (komendeWedstrijden.length > 0) {
                komendeWedstrijden.forEach(w => {
                    let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
                    let wDatum = new Date(window.normaalDatum(w.Datum)).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
                    
                    // Uniek ID genereren om de eventueel geplande tijd op te halen
                    let wIdClean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (w.Thuisteam + w.Uitteam).replace(/[^a-zA-Z0-9]/g, '');
                    let matchId = `match-${window.normaalDatum(w.Datum)}-${wIdClean}`;
                    let geplandeTijd = planStatusDB[matchId] ? planStatusDB[matchId].tijd : '?';

                    let tegenstander = isThuis ? w.Uitteam.replace(/Black Shots/ig, '').trim() : w.Thuisteam.replace(/Black Shots/ig, '').trim();
                    let badgeColor = isThuis ? '#3498db' : '#e67e22';
                    let label = isThuis ? 'Thuis' : 'Uit';

                    wedstrijdenHtml += `
                        <div style="background:#fff; border:1px solid #eee; border-left:4px solid ${badgeColor}; padding:8px; border-radius:4px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="flex:1;">
                                <strong style="color:var(--secondary-color); font-size:0.9rem;">vs ${tegenstander}</strong>
                                <div style="font-size:0.75rem; color:#7f8c8d; margin-top:2px;">
                                    <span style="background:${badgeColor}; color:white; padding:1px 4px; border-radius:3px; font-weight:bold;">${label}</span> 
                                    ⏰ ${geplandeTijd} | 📍 ${isThuis ? 'Thuiszaal' : w.Plaats || 'Uit'}
                                </div>
                            </div>
                            <div style="background:#f8f9fa; padding:4px 6px; border-radius:4px; font-weight:bold; color:#2c3e50; font-size:0.8rem; border:1px solid #e2e8f0; white-space:nowrap;">
                                📅 ${wDatum}
                            </div>
                        </div>
                    `;
                });
            } else {
                wedstrijdenHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.85rem;">Geen komende wedstrijden in Sportlink.</span>';
            }

            // --- AANKOMENDE EVENEMENTEN (Jaarplanning) ---
            let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];
            let aankomendeEvenementen = jaarplanningData.filter(item => {
                let start = item.isoDatum;
                let eind = item.eindDatum || item.isoDatum;
                if (!eind || eind < vandaagIso) return false; 
                if (start > maxDatumIso) return false;
                return item.teams && item.teams.includes(team.id);
            });

            aankomendeEvenementen.sort((a, b) => (a.isoDatum > b.isoDatum) ? 1 : -1);
            aankomendeEvenementen = aankomendeEvenementen.slice(0, 5); 

            let evenementenHtml = '';
            if (aankomendeEvenementen.length > 0) {
                aankomendeEvenementen.forEach(ev => {
                    let dParts = ev.isoDatum.split('-');
                    let mooieDatum = `${dParts[2]}-${dParts[1]}`; 
                    let catObj = kalenderCategorieen.find(c => c.id === ev.type);
                    let catNaam = catObj ? catObj.naam : 'Taak/Event';
                    
                    let metaInfo = [`📌 ${catNaam}`];
                    if (ev.tijd) metaInfo.push(`⏰ ${ev.tijd}`);
                    if (ev.locatie) metaInfo.push(`📍 ${ev.locatie}`);
                    
                    evenementenHtml += `
                        <div style="background:#fff; border:1px dashed #bdc3c7; border-left:4px solid #9b59b6; padding:8px; border-radius:4px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="flex:1; overflow:hidden; margin-right:10px;">
                                <strong style="color:var(--secondary-color); display:block; font-size:0.9rem;">${ev.titel || "Activiteit"}</strong>
                                <span style="font-size:0.75rem; color:#7f8c8d; display:block;">${metaInfo.join(' | ')}</span>
                            </div>
                            <div style="background:#f8f9fa; padding:4px 6px; border-radius:4px; font-weight:bold; color:#2c3e50; font-size:0.8rem; border:1px solid #e2e8f0; white-space:nowrap;">
                                📅 ${mooieDatum}
                            </div>
                        </div>
                    `;
                });
            } else {
                evenementenHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.85rem;">Geen speciale team-taken gepland.</span>';
            }

           // --- OPMAAK VAN DE KAART ---
            let kaderBadge = team.isVrijwilliger ? '<span style="background:#9b59b6; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; margin-left:10px; vertical-align:middle;">KADER</span>' : '';
            let recreantBadge = team.isRecreant ? '<span style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; margin-left:10px; vertical-align:middle;">RECREANTEN</span>' : '';
            let ringColor = team.kleur || (team.isVrijwilliger ? '#9b59b6' : 'var(--primary-color)');
            
            // Koppel ID's naar leesbare namen
            let coachNaam = window.naamUitId(team.coach, 'N.n.b.');
            let trainerNaam = window.naamUitId(team.trainer, 'N.n.b.');

            lijstHTML += `
                <li style="background:white; border-radius:8px; border:1px solid var(--border-color); border-top: 4px solid ${ringColor}; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
                    <div style="background:#fafafa; padding:15px 20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <h3 style="margin:0; color:${ringColor}; font-size:1.4rem; display:inline-block;">${team.naam || 'Groep'}</h3>${kaderBadge}${recreantBadge}
                            <div style="font-size:0.95rem; color:#34495e; margin-top:5px; display:flex; flex-wrap:wrap; gap:10px;">
                                <span>👨‍💼 Coach: <strong>${coachNaam}</strong></span>
                                <span>🏃‍♂️ Trainer: <strong>${trainerNaam}</strong></span>
                                <span>⏱️ Thuisduur: <strong>${teamDuur}m</strong></span>
                                <span>🚗 Auto's Uit: <strong>${maxAutos} max</strong></span>
                            </div>
                        </div>
                        <div>
                            <button onclick="window.bewerkTeam(${index})" style="background:transparent; color:#e67e22; border:1px solid #e67e22; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem; margin-right:5px;">✏️ Bewerken</button>
                            <button onclick="window.verwijderTeam(${index})" style="background:transparent; color:#e74c3c; border:1px solid #e74c3c; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Opheffen</button>
                        </div>
                    </div>

                    <div style="padding:20px; display:flex; gap:20px; flex-wrap:wrap;">
                        
                        <!-- Leden & Planning -->
                        <div style="flex:1.5; min-width:300px;">
                            <h4 style="margin-top:0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">👥 Ledenpool (${teamSpelers.length})</h4>
                            <div style="margin-bottom:15px; display:flex; flex-wrap:wrap;">${spelersHtml}</div>
                            
                            <h4 style="margin-top:20px; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">🗓️ Planning (Trainingen)</h4>
                            <div style="margin-bottom:15px;">${trainingenHtml}</div>

                            <div style="display:flex; flex-direction:column; gap:5px; background:#f9f9f9; padding:10px; border-radius:6px; border:1px solid #eee;">
                                <strong style="font-size:0.85rem;">+ Training toevoegen:</strong>
                                <div style="display:flex; gap:5px;">
                                    <select id="tr-dag-${index}" style="padding:6px; flex:1; font-size:0.8rem;"><option value="1">Ma</option><option value="2">Di</option><option value="3">Wo</option><option value="4">Do</option><option value="5">Vr</option></select>
                                    <input type="time" id="tr-start-${index}" style="padding:6px; flex:1; font-size:0.8rem;">
                                    <input type="number" id="tr-duur-${index}" placeholder="Minuten" value="90" style="padding:6px; width:70px; font-size:0.8rem;">
                                    <input type="text" id="tr-zaal-${index}" placeholder="Locatie..." style="padding:6px; flex:2; font-size:0.8rem;">
                                    <button onclick="window.snelleTrainingToevoegen(${index})" style="background:#27ae60; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.8rem;">Toevoegen</button>
                                </div>
                            </div>
                        </div>

                        <!-- Wedstrijden & Events -->
                        <div style="flex:1; min-width:280px; border-left:1px dashed #eee; padding-left:20px;">
                            <div style="margin-bottom:20px;">
                                <h4 style="margin:0 0 10px 0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">🏀 Komende NBB Wedstrijden</h4>
                                <div style="display:flex; flex-direction:column; gap:4px;">${wedstrijdenHtml}</div>
                            </div>

                            <div>
                                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #eee; padding-bottom:5px; margin-bottom:10px;">
                                    <h4 style="margin:0; color:var(--secondary-color);">📌 Overige Team-taken</h4>
                                    <button onclick="window.openSnelEventModal('${team.id}')" style="background:#27ae60; color:white; border:none; width:24px; height:24px; border-radius:50%; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; font-size:1.1rem; box-shadow:0 2px 4px rgba(0,0,0,0.1);" title="Nieuwe taak/event voor dit team">+</button>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:4px;">${evenementenHtml}</div>
                            </div>
                        </div>

                    </div>
                </li>
            `;
        });

        lijst.innerHTML = lijstHTML;

    } catch(error) {
        console.error("Fout tijdens renderen teams:", error);
    }
};

window.snelleTrainingToevoegen = function(teamIndex) {
    const dagEl = document.getElementById(`tr-dag-${teamIndex}`);
    const startEl = document.getElementById(`tr-start-${teamIndex}`);
    const duurEl = document.getElementById(`tr-duur-${teamIndex}`);
    const zaalEl = document.getElementById(`tr-zaal-${teamIndex}`);

    if (!dagEl || !startEl || !zaalEl) return;

    const dag = parseInt(dagEl.value);
    const start = startEl.value;
    const duur = parseInt(duurEl.value) || 90;
    const zaal = zaalEl.value.trim();

    if (!start || !zaal) return alert("Vul een starttijd en zaal in.");

    let startParts = start.split(':');
    let startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let eindMin = startMin + duur;

    let eindUur = Math.floor(eindMin / 60) % 24;
    let eindRestMin = eindMin % 60;
    let eind = `${eindUur.toString().padStart(2, '0')}:${eindRestMin.toString().padStart(2, '0')}`;

    if (!Array.isArray(window.teamsDB[teamIndex].trainingen)) window.teamsDB[teamIndex].trainingen = [];
    window.teamsDB[teamIndex].trainingen.push({ dag, start, eind, zaal, duur });

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

window.kiesTeamKleur = function(kleurCode) {
    document.getElementById('edit-team-kleur').value = kleurCode;
    let swatches = document.querySelectorAll('.kleur-swatch');
    swatches.forEach(s => { 
        if (s.id !== 'custom-kleur-knop') { s.style.border = '2px solid transparent'; s.style.transform = 'scale(1)'; }
    });
    let actieveSwatch = document.querySelector(`.kleur-swatch[data-kleur="${kleurCode}"]`);
    if (actieveSwatch) { actieveSwatch.style.border = '2px solid #2c3e50'; actieveSwatch.style.transform = 'scale(1.1)'; }
    let customKnop = document.getElementById('custom-kleur-knop');
    if (customKnop) { customKnop.style.backgroundColor = '#fff'; customKnop.style.border = '2px dashed #bdc3c7'; customKnop.style.color = '#7f8c8d'; }
};

window.kiesEigenKleur = function(kleurCode) {
    document.getElementById('edit-team-kleur').value = kleurCode;
    let swatches = document.querySelectorAll('.kleur-swatch');
    swatches.forEach(s => { s.style.border = '2px solid transparent'; s.style.transform = 'scale(1)'; });
    let customKnop = document.getElementById('custom-kleur-knop');
    if (customKnop) { customKnop.style.backgroundColor = kleurCode; customKnop.style.border = '2px solid #2c3e50'; customKnop.style.color = 'transparent'; }
};

window.bewerkTeam = function(index) {
    let team = window.teamsDB[index];
    if (!team) return;
    
    document.getElementById('edit-team-index').value = index;
    document.getElementById('edit-team-naam').value = team.naam || '';
    document.getElementById('edit-team-aliassen').value = team.aliassen || '';
    
    // --- MEERDERE COACHES INLADEN ---
    document.querySelectorAll('#edit-team-coach-container input').forEach(cb => cb.checked = false);
    if (team.coachIds) {
        team.coachIds.forEach(id => {
            let cb = document.querySelector(`#edit-team-coach-container input[value="${id}"]`);
            if(cb) cb.checked = true;
        });
    }
    // Vul tekstvak in (of gebruik oude legacy string als fallback)
    document.getElementById('edit-team-coach-text').value = team.coachHandmatig !== undefined ? team.coachHandmatig : (!team.coachIds ? (team.coach || '') : '');

    // --- MEERDERE TRAINERS INLADEN ---
    document.querySelectorAll('#edit-team-trainer-container input').forEach(cb => cb.checked = false);
    if (team.trainerIds) {
        team.trainerIds.forEach(id => {
            let cb = document.querySelector(`#edit-team-trainer-container input[value="${id}"]`);
            if(cb) cb.checked = true;
        });
    }
    document.getElementById('edit-team-trainer-text').value = team.trainerHandmatig !== undefined ? team.trainerHandmatig : (!team.trainerIds ? (team.trainer || '') : '');

    document.getElementById('edit-team-duur').value = team.thuisWedstrijdDuur || 90;
    document.getElementById('edit-team-autos').value = team.autoAantal || 3;
    
    document.getElementById('edit-team-vrijwilliger').checked = team.isVrijwilliger || false;
    document.getElementById('edit-team-recreant').checked = team.isRecreant || false;

    let opgeslagenKleur = team.kleur || '#3498db';
    let standaardKleuren = ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#2980b9', '#1abc9c', '#2ecc71', '#34495e'];
    
    if (standaardKleuren.includes(opgeslagenKleur)) window.kiesTeamKleur(opgeslagenKleur);
    else { window.kiesEigenKleur(opgeslagenKleur); document.getElementById('edit-team-custom-kleur').value = opgeslagenKleur; }

    document.getElementById('team-edit-modal').style.display = 'flex';
};

window.sluitTeamModal = function() {
    document.getElementById('team-edit-modal').style.display = 'none';
};

window.slaTeamBewerkingOp = function() {
    let index = document.getElementById('edit-team-index').value;
    let team = window.teamsDB[index];
    if (!team) return;

    let nieuweNaam = document.getElementById('edit-team-naam').value.trim();
    if (!nieuweNaam) return alert("Naam mag niet leeg zijn.");

    team.naam = nieuweNaam;
    team.aliassen = document.getElementById('edit-team-aliassen').value.trim();

    // --- MEERDERE COACHES OPSLAAN ---
    let coachIds = []; let coachNamen = [];
    document.querySelectorAll('#edit-team-coach-container input:checked').forEach(cb => { 
        coachIds.push(cb.value); coachNamen.push(cb.getAttribute('data-naam')); 
    });
    let coachHandmatig = document.getElementById('edit-team-coach-text').value.trim();
    if(coachHandmatig) coachNamen.push(coachHandmatig);
    
    team.coachIds = coachIds;
    team.coachHandmatig = coachHandmatig;
    team.coach = coachNamen.join(' & '); // <-- Dit houdt de andere modules werkend!

    // --- MEERDERE TRAINERS OPSLAAN ---
    let trainerIds = []; let trainerNamen = [];
    document.querySelectorAll('#edit-team-trainer-container input:checked').forEach(cb => { 
        trainerIds.push(cb.value); trainerNamen.push(cb.getAttribute('data-naam')); 
    });
    let trainerHandmatig = document.getElementById('edit-team-trainer-text').value.trim();
    if(trainerHandmatig) trainerNamen.push(trainerHandmatig);
    
    team.trainerIds = trainerIds;
    team.trainerHandmatig = trainerHandmatig;
    team.trainer = trainerNamen.join(' & '); // <-- Dit houdt de andere modules werkend!

    team.thuisWedstrijdDuur = parseInt(document.getElementById('edit-team-duur').value) || 90;
    team.autoAantal = parseInt(document.getElementById('edit-team-autos').value) || 3;
    
    team.kleur = document.getElementById('edit-team-kleur').value; 
    team.isVrijwilliger = document.getElementById('edit-team-vrijwilliger').checked;
    team.isRecreant = document.getElementById('edit-team-recreant').checked;

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
    window.sluitTeamModal();
};

window.voegTeamToe = function() {
    const naamEl = document.getElementById('nieuw-team-naam');
    const duurEl = document.getElementById('nieuw-team-duur');
    const autosEl = document.getElementById('nieuw-team-autos');
    const kaderCheckbox = document.getElementById('nieuw-team-is-vrijwilliger');

    if (!naamEl) return alert("Invoerveld voor naam ontbreekt op de pagina!");

    const naam = naamEl.value.trim();
    const isKader = kaderCheckbox ? kaderCheckbox.checked : false;
    const duur = duurEl ? (parseInt(duurEl.value) || 90) : 90;
    const autos = autosEl ? (parseInt(autosEl.value) || 3) : 3;

    // Coaches uithalen
    let coachIds = []; let coachNamen = [];
    document.querySelectorAll('#nieuw-team-coach-container input:checked').forEach(cb => { coachIds.push(cb.value); coachNamen.push(cb.getAttribute('data-naam')); });
    let coachHandmatig = document.getElementById('nieuw-team-coach-text') ? document.getElementById('nieuw-team-coach-text').value.trim() : '';
    if(coachHandmatig) coachNamen.push(coachHandmatig);

    // Trainers uithalen
    let trainerIds = []; let trainerNamen = [];
    document.querySelectorAll('#nieuw-team-trainer-container input:checked').forEach(cb => { trainerIds.push(cb.value); trainerNamen.push(cb.getAttribute('data-naam')); });
    let trainerHandmatig = document.getElementById('nieuw-team-trainer-text') ? document.getElementById('nieuw-team-trainer-text').value.trim() : '';
    if(trainerHandmatig) trainerNamen.push(trainerHandmatig);

    if (naam) {
        let nieuwId = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!Array.isArray(window.teamsDB)) window.teamsDB = [];
        
        window.teamsDB.push({ 
            id: nieuwId, 
            naam: naam, 
            coachIds: coachIds,
            coachHandmatig: coachHandmatig,
            coach: coachNamen.join(' & '), 
            trainerIds: trainerIds,
            trainerHandmatig: trainerHandmatig,
            trainer: trainerNamen.join(' & '), 
            thuisWedstrijdDuur: duur,
            autoAantal: autos,
            isVrijwilliger: isKader,
            trainingen: [] 
        });
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));

        // Reset
        naamEl.value = '';
        if(document.getElementById('nieuw-team-coach-text')) document.getElementById('nieuw-team-coach-text').value = '';
        if(document.getElementById('nieuw-team-trainer-text')) document.getElementById('nieuw-team-trainer-text').value = '';
        document.querySelectorAll('#nieuw-team-coach-container input').forEach(cb => cb.checked = false);
        document.querySelectorAll('#nieuw-team-trainer-container input').forEach(cb => cb.checked = false);
        if(kaderCheckbox) kaderCheckbox.checked = false;
        
        window.renderTeamBeheer();
    } else {
        alert("Vul in ieder geval een groepsnaam in!");
    }
};

window.verwijderTeam = function(index) {
    if (confirm("Weet je zeker dat je dit team wilt wissen? De leden worden 'Vrije Speler'.")) {
        let teamId = window.teamsDB[index].id;
        if (Array.isArray(window.spelersDB)) {
            window.spelersDB.forEach(speler => { if (speler.teamId === teamId) speler.teamId = ""; });
            localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        }
        window.teamsDB.splice(index, 1);
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        window.renderTeamBeheer();
    }
};

window.haalSpelerUitTeam = function(spelerId) {
    if(confirm("Wil je dit lid uit deze groep halen? (Hij/zij wordt dan een 'Vrije Speler')")) {
        let speler = window.spelersDB.find(s => s.id === spelerId);
        if(speler) {
            speler.teamId = ""; 
            localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
            window.renderTeamBeheer();
        }
    }
};

window.openSnelEventModal = function(teamId) {
    const team = window.teamsDB.find(t => t.id === teamId);
    if(!team) return;

    document.getElementById('snel-event-team-id').value = teamId;
    document.getElementById('snel-event-header').style.background = team.kleur || '#2c3e50';
    document.getElementById('snel-event-titel').value = '';
    document.getElementById('snel-event-tijd').value = '';
    document.getElementById('snel-event-locatie').value = '';
    document.getElementById('snel-event-datum').value = new Date().toISOString().split('T')[0];

    let cats = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];
    let typeSelect = document.getElementById('snel-event-type');
    if (typeSelect) {
        typeSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.naam}</option>`).join('');
    }

    document.getElementById('snel-event-modal').style.display = 'flex';
};

window.sluitSnelEventModal = function() { document.getElementById('snel-event-modal').style.display = 'none'; };

window.slaSnelEventOp = function() {
    let teamId = document.getElementById('snel-event-team-id').value;
    let titel = document.getElementById('snel-event-titel').value.trim();
    let datum = document.getElementById('snel-event-datum').value;
    let type = document.getElementById('snel-event-type').value;
    let tijd = document.getElementById('snel-event-tijd').value;
    let locatie = document.getElementById('snel-event-locatie').value.trim();

    if(!titel || !datum) return alert("Vul op z'n minst een titel en datum in.");

    let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
    jaarplanningData.push({
        id: "snel_" + Date.now(), isoDatum: datum, eindDatum: datum,
        type: type, tijd: tijd, locatie: locatie, titel: titel,
        omschrijving: "Toegevoegd via Teampagina", teams: [teamId]
    });

    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(jaarplanningData));
    window.sluitSnelEventModal();
    window.renderTeamBeheer();
};

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        let modal = document.getElementById('team-edit-modal');
        if (modal && modal.style.display === 'flex') window.sluitTeamModal();
    }
});