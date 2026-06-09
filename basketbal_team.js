// --- BASKETBAL_TEAM.JS: LOGICA VOOR HET BEHEREN VAN DE VERENIGINGSTEAMS ---

window.renderTeamBeheer = function() {
    const lijst = document.getElementById('team-beheer-lijst');
    if (!lijst) return;
    
    let lijstHTML = '';
    const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag"};

    window.teamsDB.forEach((team, index) => {
        // 1. Spelers (Pool) HTML bouwen
        let spelersHtml = '';
        if (team.spelers && team.spelers.length > 0) {
            team.spelers.forEach((speler, spIdx) => {
                spelersHtml += `
                    <span style="display:inline-flex; align-items:center; background:#eef2f5; padding:6px 12px; border-radius:20px; font-size:0.9rem; margin-right:8px; margin-bottom:8px; font-weight:bold; color:var(--secondary-color); border:1px solid #bdc3c7;">
                        ${speler}
                        <button onclick="window.verwijderClubSpeler(${index}, ${spIdx})" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; margin-left:8px; font-size:1.1rem; padding:0;">&times;</button>
                    </span>
                `;
            });
        } else {
            spelersHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.9rem;">Nog geen spelers toegevoegd aan dit team.</span>';
        }

        // 2. Trainingstijden HTML bouwen
        let trainingenHtml = '';
        if (team.trainingen && team.trainingen.length > 0) {
            team.trainingen.forEach((tr, trIndex) => {
                trainingenHtml += `
                    <div style="display:inline-flex; align-items:center; background:#fff8e1; border:1px solid #f1c40f; padding:4px 10px; border-radius:4px; font-size:0.85rem; margin-right:5px; margin-bottom:5px;">
                        <strong>${dagenMap[tr.dag]}</strong>&nbsp; ${tr.start}-${tr.eind} (${tr.zaal})
                        <button onclick="window.verwijderVasteTraining(${index}, ${trIndex})" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; margin-left:5px;">X</button>
                    </div>
                `;
            });
        } else {
            trainingenHtml = '<span style="color:#bdc3c7; font-style:italic; font-size:0.85rem;">Geen vaste tijden.</span>';
        }

        // 3. De Team Kaart
        lijstHTML += `
            <li style="background:white; border-radius:8px; border:1px solid var(--border-color); overflow:hidden; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                <div style="background:#fafafa; padding:15px 20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <h3 style="margin:0; color:var(--primary-color); font-size:1.4rem;">${team.naam}</h3>
                        <div style="font-size:0.95rem; color:#34495e; margin-top:5px;">
                            👨‍💼 Coach: <strong>${team.coach || 'N.n.b.'}</strong> &nbsp;|&nbsp; 🏃‍♂️ Trainer: <strong>${team.trainer || 'N.n.b.'}</strong>
                        </div>
                    </div>
                    <button onclick="window.verwijderTeam(${index})" style="background:transparent; color:#e74c3c; border:1px solid #e74c3c; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.85rem;">Team Opheffen</button>
                </div>
                
                <div style="padding:20px; display:flex; gap:20px; flex-wrap:wrap;">
                    
                    <div style="flex:2; min-width:250px;">
                        <h4 style="margin-top:0; color:var(--secondary-color); border-bottom:2px solid #eee; padding-bottom:5px;">👥 Spelerspool (${team.spelers ? team.spelers.length : 0})</h4>
                        <div style="margin-bottom:15px; display:flex; flex-wrap:wrap;">${spelersHtml}</div>
                        
                        <div style="display:flex; gap:5px; max-width:300px;">
                            <input type="text" id="add-speler-input-${index}" placeholder="Nieuwe speler naam..." style="flex:1; padding:8px; border:1px solid #bdc3c7; border-radius:4px;">
                            <button onclick="window.voegClubSpelerToe(${index})" style="background:#3498db; color:white; border:none; padding:0 15px; border-radius:4px; font-weight:bold; cursor:pointer;">Toevoegen</button>
                        </div>
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
};

// --- FUNCTIES ---

window.voegTeamToe = function() {
    const naam = document.getElementById('nieuw-team-naam').value.trim();
    const coach = document.getElementById('nieuw-team-coach').value.trim();
    const trainer = document.getElementById('nieuw-team-trainer').value.trim();
    
    if(naam) {
        let nieuwId = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
        window.teamsDB.push({ id: nieuwId, naam: naam, coach: coach, trainer: trainer, spelers: [], trainingen: [] });
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        
        document.getElementById('nieuw-team-naam').value = '';
        document.getElementById('nieuw-team-coach').value = '';
        document.getElementById('nieuw-team-trainer').value = '';
        window.renderTeamBeheer();
    }
};

window.verwijderTeam = function(index) {
    if(confirm("Weet je zeker dat je dit team wilt wissen? Alle spelers in deze pool worden ook verwijderd!")) {
        window.teamsDB.splice(index, 1);
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        window.renderTeamBeheer();
    }
};

window.voegClubSpelerToe = function(teamIndex) {
    const input = document.getElementById(`add-speler-input-${teamIndex}`);
    const naam = input.value.trim();
    if(naam) {
        if(!window.teamsDB[teamIndex].spelers) window.teamsDB[teamIndex].spelers = [];
        window.teamsDB[teamIndex].spelers.push(naam);
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        input.value = '';
        window.renderTeamBeheer();
    }
};

window.verwijderClubSpeler = function(teamIndex, spelerIndex) {
    window.teamsDB[teamIndex].spelers.splice(spelerIndex, 1);
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

window.snelleTrainingToevoegen = function(teamIndex) {
    const dag = parseInt(document.getElementById(`tr-dag-${teamIndex}`).value);
    const start = document.getElementById(`tr-start-${teamIndex}`).value;
    const zaal = document.getElementById(`tr-zaal-${teamIndex}`).value.trim();
    
    if(!start || !zaal) return alert("Vul een starttijd en zaal in.");

    // Automatisch 1,5 uur (90 min) erbij optellen voor de eindtijd
    let startParts = start.split(':');
    let startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let eindMin = startMin + 90;
    
    let eindUur = Math.floor(eindMin / 60);
    let eindRestMin = eindMin % 60;
    let eind = `${eindUur.toString().padStart(2, '0')}:${eindRestMin.toString().padStart(2, '0')}`;

    if (!window.teamsDB[teamIndex].trainingen) window.teamsDB[teamIndex].trainingen = [];
    window.teamsDB[teamIndex].trainingen.push({ dag, start, eind, zaal, duur: 90 });
    
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};

window.verwijderVasteTraining = function(teamIndex, trIndex) {
    window.teamsDB[teamIndex].trainingen.splice(trIndex, 1);
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
    window.renderTeamBeheer();
};