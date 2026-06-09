// --- BASKETBAL_DATA.JS: RECHTSTREEKSE DATABASE KOPPELING ---

const clubData = { naam: "Black Shots", locatie: "Helmond (Brandevoort)", zalen: ["De Veste", "Westwijzer", "Veka"] };

// 1. DATA RECHTSTREEKS EN DYNAMISCH INLADEN UIT HET GEHEUGEN
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.spelersDB = JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.categorieenDB = JSON.parse(localStorage.getItem('blackshots_categorieen')) || ["Warming-up", "Shooting", "Dribbling", "Passing", "Defense", "Conditioning", "Partijvorm"];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// 2. DATA OPSCHONING EN STRINGS-NAAR-ARRAYS REPARATIE
let dataGerepareerd = false;
window.teamsDB.forEach(team => {
    if (typeof team.spelers === 'number' || !Array.isArray(team.spelers)) {
        team.spelers = [];
        dataGerepareerd = true;
    }
    if (!Array.isArray(team.trainingen)) {
        team.trainingen = [];
        dataGerepareerd = true;
    }
});
if (dataGerepareerd) {
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
}

// 3. ALGEMENE DISPLAY FUNCTIES
window.laadDashboardData = function() {
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        window.teamsDB.forEach(team => { 
            let count = Array.isArray(team.spelers) ? team.spelers.length : 0;
            teamLijst.innerHTML += `<li style="margin-bottom:8px;"><strong>${team.naam}</strong> <span style="font-size:0.85rem; background:#bdc3c7; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">👥 ${count} spelers</span></li>`; 
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