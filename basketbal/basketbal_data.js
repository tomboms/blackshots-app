// --- BASKETBAL_DATA.JS: DE DATABASE & DATA FIXER ---

// 1. Data inladen uit het geheugen
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.categorieenDB = JSON.parse(localStorage.getItem('blackshots_categorieen')) || ["Warming-up", "Shooting", "Dribbling", "Passing", "Defense", "Conditioning", "Partijvorm"];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// 2. DATA MIGRATIE (DE CRASH FIX!)
let dataMoetOpslaan = false;

if (window.teamsDB.length === 0) {
    // Als de database helemaal leeg is, laden we de standaard test-teams in
    window.teamsDB = [
        { id: "x10", naam: "X10-1", coach: "Tom", trainer: "Martin", spelers: ["Filip", "Jack", "Semih Kaan"], trainingen: [] },
        { id: "x12", naam: "X12-1", coach: "Erik", trainer: "Monique", spelers: ["Sem", "Lody", "Roan", "Lucas"], trainingen: [] },
        { id: "x14", naam: "X14-1", coach: "Vesna", trainer: "Tom", spelers: ["Bledi", "Artun", "Tim", "Wout"], trainingen: [] }
    ];
    dataMoetOpslaan = true;
} else {
    // Hier zit de magie: we repareren de oude teams!
    window.teamsDB.forEach(team => {
        // Als 'spelers' vroeger een getal was (bijv. 12), maken we er nu een lege namenlijst van
        if (typeof team.spelers === 'number' || !Array.isArray(team.spelers)) {
            team.spelers = [];
            dataMoetOpslaan = true;
        }
        // Zorg dat de trainingen lijst ook altijd bestaat
        if (!Array.isArray(team.trainingen)) {
            team.trainingen = [];
            dataMoetOpslaan = true;
        }
    });
}

// Als we iets hebben gerepareerd, slaan we het direct op
if (dataMoetOpslaan) {
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
}


// 3. Algemene functies voor Dashboard & Instellingen (Categorieën)
window.laadDashboardData = function() {
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        window.teamsDB.forEach(team => { 
            // Bereken het aantal spelers nu het een echte namenlijst is
            let count = Array.isArray(team.spelers) ? team.spelers.length : 0;
            teamLijst.innerHTML += `<li style="margin-bottom:8px;"><strong>${team.naam}</strong> <span style="font-size:0.85rem; background:#bdc3c7; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">👥 ${count} spelers</span></li>`; 
        });
    }
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = window.oefeningenDB.length;
};

window.voegCategorieToe = function() {
    const naam = document.getElementById('nieuwe-cat-naam').value.trim();
    if(naam && !window.categorieenDB.includes(naam)) {
        window.categorieenDB.push(naam);
        localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
        document.getElementById('nieuwe-cat-naam').value = '';
        if(window.vulInstellingenLijsten) window.vulInstellingenLijsten();
    }
};

window.verwijderCategorie = function(index) {
    window.categorieenDB.splice(index, 1);
    localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
    if(window.vulInstellingenLijsten) window.vulInstellingenLijsten();
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