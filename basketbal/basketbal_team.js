// --- BASKETBAL_TEAM.JS: MET STRENGE UNIVERSELE ALIAS-VERTALER ---

// ============================================================================
// 🌐 DE UNIVERSELE VERTALER (Overal in de app herbruikbaar!)
// ============================================================================
// Stop hier een teamnaam, ID of alias in (bijv. "M10-1"), 
// en je krijgt EXACT het bijbehorende team terug, zonder gokwerk.
window.getCanonicalTeam = function(identifier) {
    if (!identifier) return null;
    let zoekTerm = String(identifier).toLowerCase().trim();
    if (!Array.isArray(window.teamsDB)) return null;

    return window.teamsDB.find(team => {
        let tId = String(team.id || '').toLowerCase().trim();
        let tNaam = String(team.naam || '').toLowerCase().trim();
        
        // 1. 100% EXACTE match op ID of officiële naam
        if (zoekTerm === tId || zoekTerm === tNaam) return true;
        
        // 2. 100% EXACTE match op 1 van de aliassen
        if (team.aliassen) {
            let aliasArray = team.aliassen.toLowerCase().split(',').map(a => a.trim()).filter(Boolean);
            if (aliasArray.includes(zoekTerm)) return true;
        }
        
        return false;
    });
};
// ============================================================================
// TEAM BEHEER RENDEREN
// ============================================================================
w// ============================================================================
// TEAM BEHEER RENDEREN
// ============================================================================
window.renderTeamBeheer = function() {
    try {
        const lijst = document.getElementById('team-beheer-lijst');
        if (!lijst) return;

        // --- NIEUW: Lees het actieve seizoen direct uit de instellingen! ---
        let instellingen = JSON.parse(localStorage.getItem('blackshots_instellingen')) || {};
        let actiefSeizoen = instellingen.seizoen || "2025-2026";
        // Nu "weet" deze pagina dat we in seizoen 2025-2026 zitten!

        let lijstHTML = '';
        const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag"};

        if (!Array.isArray(window.teamsDB)) window.teamsDB = [];
        if (!Array.isArray(window.spelersDB)) window.spelersDB = [];
        
        let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        
        let vandaag = new Date();
        let vandaagIso = vandaag.toISOString().split('T')[0];
        
        // Lees de datumprikker uit
        let horizonInput = document.getElementById('team-event-horizon-date');
        let maxDatumIso = horizonInput ? horizonInput.value : '';

        // Als het veld nog leeg is (bij de eerste keer inladen), zet hem op +60 dagen
        if (!maxDatumIso) {
            let standaardMax = new Date();
            standaardMax.setDate(vandaag.getDate() + 60);
            maxDatumIso = standaardMax.toISOString().split('T')[0];
            if (horizonInput) horizonInput.value = maxDatumIso; 
        }


        window.teamsDB.forEach((team, index) => {
            if (!team) return;

            // --- SPELERS LADEN ---
            let teamSpelers = window.spelersDB.filter(s => {
                if (!s || !s.teamId) return false;
                let gevondenTeam = window.getCanonicalTeam(s.teamId);
                return gevondenTeam && gevondenTeam.id === team.id;
            });

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

            // --- AANKOMENDE EVENEMENTEN FILTEREN ---
            // --- AANKOMENDE EVENEMENTEN FILTEREN ---
            // Haal de categorieën uit de database zodat we de échte naam kunnen tonen
            let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];

            let aankomendeEvenementen = jaarplanningData.filter(item => {
                let start = item.isoDatum;
                let eind = item.eindDatum || item.isoDatum;
                
                // 1. Verleden negeren
                if (!eind || eind < vandaagIso) return false; 
                
                // 2. Valt het na onze gekozen datum in de kalender?
                if (start > maxDatumIso) return false;
                
                // 3. Toon ALLEEN als dit team is aangevinkt
                return item.teams && item.teams.includes(team.id);
            });

            aankomendeEvenementen.sort((a, b) => (a.isoDatum > b.isoDatum) ? 1 : -1);
            aankomendeEvenementen = aankomendeEvenementen.slice(0, 5); 

            let evenementenHtml = '';
            if (aankomendeEvenementen.length > 0) {
                aankomendeEvenementen.forEach(ev => {
                    let dParts = ev.isoDatum.split('-');
                    let mooieDatum = `${dParts[2]}-${dParts[1]}`; 
                    let badgeKleur = team.kleur || '#3498db';
                    
                    // --- NIEUW: Dynamische subtitel (Categorie | Tijd | Locatie) ---
                    // Zoek de juiste categorienaam op (of gebruik 'Taak' als fallback)
                    let catObj = kalenderCategorieen.find(c => c.id === ev.type);
                    let catNaam = catObj ? catObj.naam : 'Taak/Event';
                    
                    // Bouw het slimme zinnetje op
                    let metaInfo = [`📌 ${catNaam}`];
                    if (ev.tijd) metaInfo.push(`⏰ ${ev.tijd}`);
                    if (ev.locatie) metaInfo.push(`📍 ${ev.locatie}`);
                    
                    let subtitelTekst = metaInfo.join(' | ');
                    
                    evenementenHtml += `
                        <div style="background:#fff; border:1px solid #eee; border-left:4px solid ${badgeKleur}; padding:8px; border-radius:4px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                            <div style="flex:1; overflow:hidden; margin-right:10px;">
                                <strong style="color:var(--secondary-color); display:block; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ev.titel || "Activiteit"}</strong>
                                <span style="font-size:0.75rem; color:#7f8c8d; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${subtitelTekst}">${subtitelTekst}</span>
                            </div>
                            <div style="background:#f8f9fa; padding:4px 6px; border-radius:4px; font-weight:bold; color:#2c3e50; font-size:0.8rem; border:1px solid #e2e8f0; white-space:nowrap;">
                                📅 ${mooieDatum}
                            </div>
                        </div>
                    `;
                });
            } else {
                evenementenHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.85rem;">Geen speciale team-taken gepland in deze periode.</span>';
            }
           // --- OPMAAK VAN DE KAART ---
            let kaderBadge = team.isVrijwilliger ? '<span style="background:#9b59b6; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; margin-left:10px; vertical-align:middle;">KADER</span>' : '';
            let recreantBadge = team.isRecreant ? '<span style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem; margin-left:10px; vertical-align:middle;">RECREANTEN</span>' : '';
            let ringColor = team.kleur || (team.isVrijwilliger ? '#9b59b6' : 'var(--primary-color)');
            let aliasTekst = team.aliassen ? ` &nbsp;|&nbsp; 🔗 Aliassen: <strong>${team.aliassen}</strong>` : '';

            lijstHTML += `
                <li style="background:white; border-radius:8px; border:1px solid var(--border-color); border-top: 4px solid ${ringColor}; overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
                    <div style="background:#fafafa; padding:15px 20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <h3 style="margin:0; color:${ringColor}; font-size:1.4rem; display:inline-block;">${team.naam || 'Groep'}</h3>${kaderBadge}${recreantBadge}
                            <div style="font-size:0.95rem; color:#34495e; margin-top:5px;">
                                👨‍💼 Coach: <strong>${team.coach || 'N.n.b.'}</strong> &nbsp;|&nbsp; 🏃‍♂️ Trainer: <strong>${team.trainer || 'N.n.b.'}</strong>${aliasTekst}
                            </div>
                        </div>
                        <div>
                            <button onclick="window.bewerkTeam(${index})" style="background:transparent; color:#e67e22; border:1px solid #e67e22; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem; margin-right:5px;">✏️ Bewerken</button>
                            <button onclick="window.verwijderTeam(${index})" style="background:transparent; color:#e74c3c; border:1px solid #e74c3c; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Opheffen</button>
                        </div>
                    </div>

                    <div style="padding:20px; display:flex; gap:20px; flex-wrap:wrap;">
                        
                        <div style="flex:1.5; min-width:250px;">
                            <h4 style="margin-top:0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">👥 Ledenpool (${teamSpelers.length})</h4>
                            <div style="margin-bottom:15px; display:flex; flex-wrap:wrap;">${spelersHtml}</div>
                            <button onclick="window.location.href='spelers.html'" style="background:#3498db; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.85rem;">+ Beheer via Spelers-pagina</button>
                        </div>

                        <div style="flex:1; min-width:220px; border-left:1px dashed #eee; padding-left:20px;">
                            <h4 style="margin-top:0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">🗓️ Planning</h4>
                            <div style="margin-bottom:15px;">${trainingenHtml}</div>

                            <div style="display:flex; flex-direction:column; gap:5px; background:#f9f9f9; padding:10px; border-radius:6px; border:1px solid #eee;">
                                <strong style="font-size:0.85rem;">+ Tijd toevoegen:</strong>
                                <div style="display:flex; gap:5px;">
                                    <select id="tr-dag-${index}" style="padding:6px; flex:1; font-size:0.8rem;"><option value="1">Ma</option><option value="2">Di</option><option value="3">Wo</option><option value="4">Do</option><option value="5">Vr</option></select>
                                    <input type="time" id="tr-start-${index}" style="padding:6px; flex:1; font-size:0.8rem;">
                                    <input type="number" id="tr-duur-${index}" placeholder="Duur (min)" value="90" style="padding:6px; width:80px; font-size:0.8rem;">
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <input type="text" id="tr-zaal-${index}" placeholder="Locatie/Zaal..." style="padding:6px; flex:2; font-size:0.8rem;">
                                    <input type="text" id="tr-veld-${index}" placeholder="Veld..." style="padding:6px; width:70px; font-size:0.8rem;">
                                    <button onclick="window.snelleTrainingToevoegen(${index})" style="background:#27ae60; color:white; border:none; padding:6px; flex:1; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.8rem;">Vastzetten</button>
                                </div>
                            </div>
                        </div>

                        <div style="flex:1; min-width:220px; border-left:1px dashed #eee; padding-left:20px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #eee; padding-bottom:5px; margin-bottom:10px;">
                                <h4 style="margin:0; color:var(--secondary-color);">📌 Komende Team-taken</h4>
                                <button onclick="window.openSnelEventModal('${team.id}')" style="background:#27ae60; color:white; border:none; width:24px; height:24px; border-radius:50%; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center; font-size:1.1rem; box-shadow:0 2px 4px rgba(0,0,0,0.1);" title="Nieuwe taak/event voor dit team">+</button>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px;">
                                ${evenementenHtml}
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
    const veldEl = document.getElementById(`tr-veld-${teamIndex}`);

    if (!dagEl || !startEl || !zaalEl) return;

    const dag = parseInt(dagEl.value);
    const start = startEl.value;
    const duur = parseInt(duurEl.value) || 90;
    const zaal = zaalEl.value.trim();
    const veld = veldEl ? veldEl.value.trim() : "";

    if (!start || !zaal) return alert("Vul een starttijd en zaal in.");

    let startParts = start.split(':');
    let startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let eindMin = startMin + duur;

    let eindUur = Math.floor(eindMin / 60) % 24;
    let eindRestMin = eindMin % 60;
    let eind = `${eindUur.toString().padStart(2, '0')}:${eindRestMin.toString().padStart(2, '0')}`;

    if (!Array.isArray(window.teamsDB[teamIndex].trainingen)) window.teamsDB[teamIndex].trainingen = [];
    window.teamsDB[teamIndex].trainingen.push({ dag, start, eind, zaal, veld, duur });

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

window.kiesTeamKleur = function(kleurCode) {
    document.getElementById('edit-team-kleur').value = kleurCode;
    
    // Reset alle bolletjes
    let swatches = document.querySelectorAll('.kleur-swatch');
    swatches.forEach(s => { 
        if (s.id !== 'custom-kleur-knop') {
            s.style.border = '2px solid transparent'; 
            s.style.transform = 'scale(1)'; 
        }
    });
    
    // Zet een randje om de geselecteerde
    let actieveSwatch = document.querySelector(`.kleur-swatch[data-kleur="${kleurCode}"]`);
    if (actieveSwatch) {
        actieveSwatch.style.border = '2px solid #2c3e50';
        actieveSwatch.style.transform = 'scale(1.1)';
    }

    // Reset de plus-knop visueel
    let customKnop = document.getElementById('custom-kleur-knop');
    if (customKnop) {
        customKnop.style.backgroundColor = '#fff';
        customKnop.style.border = '2px dashed #bdc3c7';
        customKnop.style.color = '#7f8c8d';
    }
};

window.kiesEigenKleur = function(kleurCode) {
    document.getElementById('edit-team-kleur').value = kleurCode;
    
    // Reset vaste bolletjes
    let swatches = document.querySelectorAll('.kleur-swatch');
    swatches.forEach(s => { 
        s.style.border = '2px solid transparent'; 
        s.style.transform = 'scale(1)'; 
    });
    
    // Geef de plus-knop de gekozen kleur en haal het plusje tijdelijk weg
    let customKnop = document.getElementById('custom-kleur-knop');
    if (customKnop) {
        customKnop.style.backgroundColor = kleurCode;
        customKnop.style.border = '2px solid #2c3e50';
        customKnop.style.color = 'transparent'; 
    }
};

window.bewerkTeam = function(index) {
    let team = window.teamsDB[index];
    if (!team) return;
    
    document.getElementById('edit-team-index').value = index;
    document.getElementById('edit-team-naam').value = team.naam || '';
    document.getElementById('edit-team-aliassen').value = team.aliassen || '';
    document.getElementById('edit-team-coach').value = team.coach || '';
    document.getElementById('edit-team-trainer').value = team.trainer || '';
    
    document.getElementById('edit-team-vrijwilliger').checked = team.isVrijwilliger || false;
    document.getElementById('edit-team-recreant').checked = team.isRecreant || false;

    // Slim inladen van de kleuren
    let opgeslagenKleur = team.kleur || '#3498db';
    let standaardKleuren = ['#f1c40f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#2980b9', '#1abc9c', '#2ecc71', '#34495e'];
    
    if (standaardKleuren.includes(opgeslagenKleur)) {
        window.kiesTeamKleur(opgeslagenKleur);
    } else {
        // Hij was custom, zet hem op de plus-knop!
        window.kiesEigenKleur(opgeslagenKleur);
        document.getElementById('edit-team-custom-kleur').value = opgeslagenKleur; 
    }

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
    team.coach = document.getElementById('edit-team-coach').value.trim();
    team.trainer = document.getElementById('edit-team-trainer').value.trim();
    team.kleur = document.getElementById('edit-team-kleur').value; // Nieuw!
    team.isVrijwilliger = document.getElementById('edit-team-vrijwilliger').checked;
    team.isRecreant = document.getElementById('edit-team-recreant').checked;

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
    window.sluitTeamModal();
};

window.voegTeamToe = function() {
    const naamEl = document.getElementById('nieuw-team-naam');
    const coachEl = document.getElementById('nieuw-team-coach');
    const trainerEl = document.getElementById('nieuw-team-trainer');
    const kaderCheckbox = document.getElementById('nieuw-team-is-vrijwilliger');

    if (!naamEl) return alert("Invoerveld voor naam ontbreekt op de pagina!");

    const naam = naamEl.value.trim();
    const coach = coachEl ? coachEl.value.trim() : "";
    const trainer = trainerEl ? trainerEl.value.trim() : "";
    const isKader = kaderCheckbox ? kaderCheckbox.checked : false;

    if (naam) {
        let nieuwId = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!Array.isArray(window.teamsDB)) window.teamsDB = [];
        
        window.teamsDB.push({ 
            id: nieuwId, 
            naam: naam, 
            coach: coach, 
            trainer: trainer, 
            isVrijwilliger: isKader,
            trainingen: [] 
        });
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));

        naamEl.value = '';
        if(coachEl) coachEl.value = '';
        if(trainerEl) trainerEl.value = '';
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
            window.spelersDB.forEach(speler => {
                if (speler.teamId === teamId) speler.teamId = ""; 
            });
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


// ============================================================================
// JAARPLANNING SNEL-TOEVOEGEN FUNCTIES
// ============================================================================

window.openSnelEventModal = function(teamId) {
    const team = window.teamsDB.find(t => t.id === teamId);
    if(!team) return;

    document.getElementById('snel-event-team-id').value = teamId;
    document.getElementById('snel-event-header').style.background = team.kleur || '#2c3e50';
    document.getElementById('snel-event-titel').value = '';
    document.getElementById('snel-event-tijd').value = '';
    document.getElementById('snel-event-locatie').value = '';
    
    // Zet de datum standaard op vandaag
    document.getElementById('snel-event-datum').value = new Date().toISOString().split('T')[0];

    // Laad de categorieën uit de jaarplanning dynamisch in
    let cats = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];
    let typeSelect = document.getElementById('snel-event-type');
    if (typeSelect) {
        typeSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.naam}</option>`).join('');
    }

    document.getElementById('snel-event-modal').style.display = 'flex';
};

window.sluitSnelEventModal = function() {
    document.getElementById('snel-event-modal').style.display = 'none';
};

window.slaSnelEventOp = function() {
    let teamId = document.getElementById('snel-event-team-id').value;
    let titel = document.getElementById('snel-event-titel').value.trim();
    let datum = document.getElementById('snel-event-datum').value;
    let type = document.getElementById('snel-event-type').value;
    let tijd = document.getElementById('snel-event-tijd').value;
    let locatie = document.getElementById('snel-event-locatie').value.trim();

    if(!titel || !datum) return alert("Vul op z'n minst een titel en datum in.");

    // Pak de bestaande data uit de jaarplanning
    let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];

    // Maak het nieuwe item aan
    let nieuwItem = {
        id: "snel_" + Date.now(),
        isoDatum: datum,
        eindDatum: datum,
        type: type,
        tijd: tijd,
        locatie: locatie,
        titel: titel,
        omschrijving: "Toegevoegd via Teampagina",
        teams: [teamId] // Koppel hem DIRECT aan dit team!
    };

    // Opslaan
    jaarplanningData.push(nieuwItem);
    localStorage.setItem('blackshots_jaarplanning_data', JSON.stringify(jaarplanningData));

    // UI verversen
    window.sluitSnelEventModal();
    window.renderTeamBeheer();
    
    // Kleine visuele bevestiging
    console.log("Item succesvol toegevoegd aan Jaarplanning voor team: " + teamId);
};

window.verwijderVasteTraining = function(teamIndex, trIndex) {
    window.teamsDB[teamIndex].trainingen.splice(trIndex, 1);
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        let modal = document.getElementById('team-edit-modal');
        if (modal && modal.style.display === 'flex') window.sluitTeamModal();
    }
});

