// --- BASKETBAL_DATA.JS: DATABASE, MIGRATIE & DASHBOARD ---

const clubData = { naam: "Black Shots", locatie: "Helmond (Brandevoort)", zalen: ["De Veste", "Westwijzer", "Veka"] };

// 1. DATA RECHTSTREEKS INLADEN UIT DE NIEUWE LADES
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.spelersDB = JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.categorieenDB = JSON.parse(localStorage.getItem('blackshots_categorieen')) || ["Warming-up", "Shooting", "Dribbling", "Passing", "Defense", "Conditioning", "Partijvorm"];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// 2. MIGRATIE: OUDE DATA REDDEN EN NAAR DE NIEUWE LADES VERPLAATSEN
if (localStorage.getItem('clubdata')) {
    let oudeData = JSON.parse(localStorage.getItem('clubdata'));
    let isGemigreerd = false;

    if (window.teamsDB.length === 0 && oudeData.blackshots_teams) {
        window.teamsDB = oudeData.blackshots_teams;
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        isGemigreerd = true;
    }
    if (window.spelersDB.length === 0 && oudeData.blackshots_spelers) {
        window.spelersDB = oudeData.blackshots_spelers;
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        isGemigreerd = true;
    }
    // Red de weekagenda!
    if (Object.keys(window.geplandeTrainingenDB).length === 0 && oudeData.blackshots_trainingen) {
        window.geplandeTrainingenDB = oudeData.blackshots_trainingen;
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        isGemigreerd = true;
    }
    
    if (isGemigreerd) {
        localStorage.removeItem('clubdata'); // Gooi de oude grote doos weg
    }
}

// 3. ALGEMENE DISPLAY FUNCTIES (Dashboard repareert 0-spelers bug)
window.laadDashboardData = function() {
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        window.teamsDB.forEach(team => { 
            // Tellen hoeveel spelers echt gekoppeld zijn via de spelers database
            let teamSpelers = window.spelersDB.filter(s => s.teamId === team.id || s.teamId === team.naam);
            let count = teamSpelers.length;
            
            // Controleer of het team een Kader/Vrijwilligers groep is
            let kaderBadge = team.isVrijwilliger ? ' <span style="font-size:0.7rem; background:#9b59b6; padding:2px 5px; border-radius:4px; color:white; margin-left:5px;">KADER</span>' : '';
            
            teamLijst.innerHTML += `<li style="margin-bottom:8px;"><strong>${team.naam}</strong>${kaderBadge} <span style="font-size:0.85rem; background:#bdc3c7; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">👥 ${count} leden</span></li>`; 
        });
    }
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = window.oefeningenDB.length;
};

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