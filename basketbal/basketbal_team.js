// --- BASKETBAL_TEAM.JS: KOGELVRIJE LOGICA VOOR TEAM BEHEER ---

window.renderTeamBeheer = function() {
    try {
        const lijst = document.getElementById('team-beheer-lijst');
        if (!lijst) return;

        let lijstHTML = '';
        const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag"};

        // Veiligheidscheck: Zorg dat de databases in ieder geval bestaan
        if (!Array.isArray(window.teamsDB)) window.teamsDB = [];
        if (!Array.isArray(window.spelersDB)) window.spelersDB = [];

        window.teamsDB.forEach((team, index) => {
            if (!team) return; // Sla corrupte lege teams over

            // Veilig spelers ophalen
            let teamSpelers = window.spelersDB.filter(s => {
                if (!s) return false;
                return s.teamId === team.id || (team.naam && s.teamId === team.naam);
            });

            let spelersHtml = '';
            if (teamSpelers.length > 0) {
                teamSpelers.forEach(speler => {
                    spelersHtml += `
                        <span style="display:inline-flex; align-items:center; background:#eef2f5; padding:6px 12px; border-radius:20px; font-size:0.9rem; margin-right:8px; margin-bottom:8px; font-weight:bold; color:var(--secondary-color); border:1px solid #bdc3c7;">
                            ${speler.naam || 'Onbekend'} ${speler.rugnummer ? `&nbsp; <span style="color:#e67e22;">(#${speler.rugnummer})</span>` : ''}
                            <button onclick="window.haalSpelerUitTeam('${speler.id}')" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; margin-left:8px; font-size:1.1rem; padding:0;">&times;</button>
                        </span>
                    `;
                });
            } else {
                spelersHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.9rem;">Geen spelers in dit team. Voeg ze toe via de Spelers-pagina of importeer de bonds-CSV.</span>';
            }

            // Veilig trainingen ophalen
            let trainingenHtml = '';
            if (Array.isArray(team.trainingen) && team.trainingen.length > 0) {
                team.trainingen.forEach((tr, trIndex) => {
                    trainingenHtml += `
                        <div style="display:inline-flex; align-items:center; background:#fff8e1; border:1px solid #f1c40f; padding:4px 10px; border-radius:4px; font-size:0.85rem; margin-right:5px; margin-bottom:5px;">
                            <strong>${dagenMap[tr.dag] || 'Dag'}</strong>&nbsp; ${tr.start || '?'}-${tr.eind || '?'} (${tr.zaal || 'Geen zaal'})
                            <button onclick="window.verwijderVasteTraining(${index}, ${trIndex})" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; margin-left:5px;">X</button>
                        </div>
                    `;
                });
            } else {
                trainingenHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.85rem;">Geen vaste tijden.</span>';
            }

            // HTML Kaart opbouwen
            lijstHTML += `
                <li style="background:white; border-radius:8px; border:1px solid var(--border-color); overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
                    <div style="background:#fafafa; padding:15px 20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <h3 style="margin:0; color:var(--primary-color); font-size:1.4rem;">${team.naam || 'Naamloos Team'}</h3>
                            <div style="font-size:0.95rem; color:#34495e; margin-top:5px;">
                                👨‍💼 Coach: <strong>${team.coach || 'N.n.b.'}</strong> &nbsp;|&nbsp; 🏃‍♂️ Trainer: <strong>${team.trainer || 'N.n.b.'}</strong>
                            </div>
                        </div>
                        <div>
                            <button onclick="window.bewerkTeam(${index})" style="background:transparent; color:#e67e22; border:1px solid #e67e22; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem; margin-right:5px;">✏️ Team Bewerken</button>
                            <button onclick="window.verwijderTeam(${index})" style="background:transparent; color:#e74c3c; border:1px solid #e74c3c; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Team Opheffen</button>
                        </div>
                    </div>

                    <div style="padding:20px; display:flex; gap:20px; flex-wrap:wrap;">
                        <div style="flex:2; min-width:250px;">
                            <h4 style="margin-top:0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">👥 Spelerspool (${teamSpelers.length})</h4>
                            <div style="margin-bottom:15px; display:flex; flex-wrap:wrap;">${spelersHtml}</div>
                            <button onclick="window.location.href='spelers.html'" style="background:#3498db; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.85rem;">+ Beheer via Spelers-pagina</button>
                        </div>

                        <div style="flex:1; min-width:250px; border-left:1px dashed #eee; padding-left:20px;">
                            <h4 style="margin-top:0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">🗓️ Trainingen</h4>
                            <div style="margin-bottom:15px;">${trainingenHtml}</div>

                            <div style="display:flex; flex-direction:column; gap:5px; background:#f9f9f9; padding:10px; border-radius:6px; border:1px solid #eee;">
                                <strong style="font-size:0.85rem;">+ Tijd toevoegen:</strong>
                                <div style="display:flex; gap:5px;">
                                    <select id="tr-dag-${index}" style="padding:6px; flex:1; font-size:0.8rem;"><option value="1">Ma</option><option value="2">Di</option><option value="3">Wo</option><option value="4">Do</option><option value="5">Vr</option></select>
                                    <input type="time" id="tr-start-${index}" style="padding:6px; flex:1; font-size:0.8rem;">
                                </div>
                                <div style="display:flex; gap:5px;">
                                    <input type="text" id="tr-zaal-${index}" placeholder="Zaal..." style="padding:6px; flex:2; font-size:0.8rem;">
                                    <button onclick="window.snelleTrainingToevoegen(${index})" style="background:#27ae60; color:white; border:none; padding:6px; flex:1; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.8rem;">Vastzetten</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        });

        lijst.innerHTML = lijstHTML;

    } catch(error) {
        // Mocht er toch iets fout gaan, dan print hij dit op het scherm in plaats van te crashen
        console.error("Fout tijdens renderen teams:", error);
        let lijst = document.getElementById('team-beheer-lijst');
        if (lijst) lijst.innerHTML = `<li style="padding:20px; color:red; font-weight:bold;">Er is een fout opgetreden bij het laden van de teams. Bekijk de console voor details.</li>`;
    }
};

// --- ACTIE FUNCTIES ---

window.bewerkTeam = function(index) {
    let team = window.teamsDB[index];
    if (!team) return;
    
    let nieuweNaam = prompt("Pas de teamnaam aan:", team.naam);
    if (nieuweNaam === null) return; 
    nieuweNaam = nieuweNaam.trim();
    if (!nieuweNaam) return alert("Teamnaam mag niet leeg zijn.");

    let nieuweCoach = prompt("Pas de coach aan:", team.coach || "");
    if (nieuweCoach === null) return;

    let nieuweTrainer = prompt("Pas de trainer aan:", team.trainer || "");
    if (nieuweTrainer === null) return;

    team.naam = nieuweNaam;
    team.coach = nieuweCoach.trim();
    team.trainer = nieuweTrainer.trim();

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

window.voegTeamToe = function() {
    const naamEl = document.getElementById('nieuw-team-naam');
    const coachEl = document.getElementById('nieuw-team-coach');
    const trainerEl = document.getElementById('nieuw-team-trainer');

    if (!naamEl) return alert("Invoerveld voor teamnaam ontbreekt op de pagina!");

    const naam = naamEl.value.trim();
    const coach = coachEl ? coachEl.value.trim() : "";
    const trainer = trainerEl ? trainerEl.value.trim() : "";

    if (naam) {
        let nieuwId = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!Array.isArray(window.teamsDB)) window.teamsDB = [];
        
        window.teamsDB.push({ id: nieuwId, naam: naam, coach: coach, trainer: trainer, trainingen: [] });
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));

        naamEl.value = '';
        if(coachEl) coachEl.value = '';
        if(trainerEl) trainerEl.value = '';
        window.renderTeamBeheer();
    } else {
        alert("Vul in ieder geval een teamnaam in!");
    }
};

window.verwijderTeam = function(index) {
    if (confirm("Weet je zeker dat je dit team wilt wissen? De spelers worden niet verwijderd, maar worden 'Vrije Speler'.")) {
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
    if(confirm("Wil je deze speler uit dit team halen? (Hij/zij wordt dan een 'Vrije Speler')")) {
        let speler = window.spelersDB.find(s => s.id === spelerId);
        if(speler) {
            speler.teamId = ""; 
            localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
            window.renderTeamBeheer();
        }
    }
};

window.snelleTrainingToevoegen = function(teamIndex) {
    const dagEl = document.getElementById(`tr-dag-${teamIndex}`);
    const startEl = document.getElementById(`tr-start-${teamIndex}`);
    const zaalEl = document.getElementById(`tr-zaal-${teamIndex}`);

    if (!dagEl || !startEl || !zaalEl) return;

    const dag = parseInt(dagEl.value);
    const start = startEl.value;
    const zaal = zaalEl.value.trim();

    if (!start || !zaal) return alert("Vul een starttijd en zaal in.");

    let startParts = start.split(':');
    let startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let eindMin = startMin + 90; // 90 minuten duur

    let eindUur = Math.floor(eindMin / 60);
    let eindRestMin = eindMin % 60;
    let eind = `${eindUur.toString().padStart(2, '0')}:${eindRestMin.toString().padStart(2, '0')}`;

    if (!Array.isArray(window.teamsDB[teamIndex].trainingen)) window.teamsDB[teamIndex].trainingen = [];
    window.teamsDB[teamIndex].trainingen.push({ dag, start, eind, zaal, duur: 90 });

    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

window.verwijderVasteTraining = function(teamIndex, trIndex) {
    window.teamsDB[teamIndex].trainingen.splice(trIndex, 1);
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};