// --- BASKETBAL_DATA.JS: DATABASE, AUTO-REPAIR & DASHBOARD ---

const clubData = { naam: "Black Shots", locatie: "Helmond (Brandevoort)", zalen: ["De Veste", "Westwijzer", "Veka"] };

window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.spelersDB = JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.categorieenDB = JSON.parse(localStorage.getItem('blackshots_categorieen')) || ["Warming-up", "Shooting", "Dribbling", "Passing", "Defense", "Conditioning", "Partijvorm"];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// --- DE DEFINITIEVE AUTO-REPAIR MOTOR (NOOIT MEER CONSOLE) ---
window.autoRepairDatabase = function() {
    if (!window.spelersDB || !window.teamsDB) return;
    
    let isAangepast = false;

    window.spelersDB.forEach(speler => {
        if (speler.teamId) {
            let schoonSpelerTeam = speler.teamId.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Zoek extreem soepel naar een passend team (bijv. "X10-1" -> "x101")
            let matchTeam = window.teamsDB.find(t => 
                t.id === speler.teamId || 
                (t.id || '').toLowerCase() === schoonSpelerTeam ||
                (t.naam || '').toLowerCase().replace(/[^a-z0-9]/g, '') === schoonSpelerTeam
            );
            
            if (matchTeam && speler.teamId !== matchTeam.id) {
                speler.teamId = matchTeam.id; // Herstel het ID
                isAangepast = true;
            }
        }
    });

    if (isAangepast) {
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        // Stuur de reparatie ook direct naar de cloud zodat hij niet wordt overschreven!
        if (typeof window.autoUpload === 'function') {
            window.autoUpload('blackshots_spelers', window.spelersDB);
        }
    }
};

// --- DASHBOARD RENDERER ---
// Elke keer als het dashboard tekent, checken we eerst of er iets gerepareerd moet worden.
window.laadDashboardData = function() {
    window.autoRepairDatabase(); // Voer repair uit!

    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        window.teamsDB.forEach(team => { 
            // Een extra soepele telling voor de zekerheid
            let teamSpelers = window.spelersDB.filter(s => {
                if(!s) return false;
                let sId = (s.teamId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                let tId = (team.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                let tNaam = (team.naam || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                return sId === tId || sId === tNaam;
            });
            let count = teamSpelers.length;
            
            let kaderBadge = team.isVrijwilliger ? ' <span style="font-size:0.7rem; background:#9b59b6; padding:2px 5px; border-radius:4px; color:white; margin-left:5px;">KADER</span>' : '';
            
            teamLijst.innerHTML += `<li style="margin-bottom:8px;"><strong>${team.naam}</strong>${kaderBadge} <span style="font-size:0.85rem; background:#bdc3c7; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">👥 ${count} leden</span></li>`; 
        });
    }
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = window.oefeningenDB.length;
};

// --- INSTELLINGEN / CATEGORIEËN ---
window.voegCategorieToe = function() {
    const inputField = document.getElementById('nieuwe-cat-naam');
    if (!inputField) return;
    const naam = inputField.value.trim();
    if (naam && !window.categorieenDB.includes(naam)) {
        window.categorieenDB.push(naam);
        localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
        inputField.value = '';
        if (window.vulInstellingenLijsten) window.vulInstellingenLijsten();
    }
};

window.verwijderCategorie = function(index) {
    window.categorieenDB.splice(index, 1);
    localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
    if (window.vulInstellingenLijsten) window.vulInstellingenLijsten();
};

window.vulInstellingenLijsten = function() {
    const cLijst = document.getElementById('instellingen-cat-lijst');
    if (cLijst) {
        cLijst.innerHTML = '';
        window.categorieenDB.forEach((cat, index) => {
            cLijst.innerHTML += `<li style="background:var(--secondary-color); color:white; padding:6px 12px; border-radius:20px; display:flex; align-items:center; gap:10px;">
                ${cat} <button onclick="window.verwijderCategorie(${index})" style="background:transparent; color:white; border:none; cursor:pointer; font-weight:bold;">X</button>
            </li>`;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.laadDashboardData();
    if (window.vulInstellingenLijsten) window.vulInstellingenLijsten();
});