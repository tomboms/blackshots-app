// --- BASKETBAL_DATA.JS: DE DATABASE VOOR BLACK SHOTS ---

if (!localStorage.getItem('blackshots_init_v3')) {
    localStorage.removeItem('blackshots_oefeningen');
    localStorage.removeItem('blackshots_teams');
    localStorage.removeItem('blackshots_categorieen');
    localStorage.setItem('blackshots_init_v3', 'true');
}

const clubData = { naam: "Black Shots", locatie: "Helmond (Brandevoort)", zalen: ["De Veste", "Westwijzer", "Veka"] };

// --- DYNAMISCHE CATEGORIEËN ---
const standaardCategorieen = ["Warming-up", "Shooting", "Dribbling", "Passing", "Defense", "Conditioning", "Partijvorm"];
window.categorieenDB = JSON.parse(localStorage.getItem('blackshots_categorieen'));
if (!window.categorieenDB || window.categorieenDB.length === 0) {
    window.categorieenDB = standaardCategorieen;
    localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
}

// --- DYNAMISCHE TEAMS ---
const standaardTeams = [
    { id: "x10", naam: "X10-1", spelers: 12, trainingen: [{ dag: 1, start: "17:00", eind: "18:00", zaal: "De Veste", duur: 60 }] },
    { id: "x12", naam: "X12-1", spelers: 12, trainingen: [{ dag: 1, start: "17:00", eind: "18:00", zaal: "De Veste", duur: 60 }, { dag: 3, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 }] },
    { id: "x14", naam: "X14-1", spelers: 10, trainingen: [{ dag: 1, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 }, { dag: 5, start: "18:00", eind: "19:30", zaal: "Veka", duur: 90 }] },
    { id: "m16", naam: "M16-1", spelers: 10, trainingen: [{ dag: 1, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 }, { dag: 5, start: "18:00", eind: "19:30", zaal: "Veka", duur: 90 }] },
    { id: "m18", naam: "M18-1", spelers: 12, trainingen: [{ dag: 3, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 }, { dag: 5, start: "19:30", eind: "21:00", zaal: "Veka", duur: 90 }] },
    { id: "m22", naam: "M22", spelers: 12, trainingen: [{ dag: 3, start: "19:15", eind: "20:30", zaal: "De Veste", duur: 75 }] }
];
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams'));
if (!window.teamsDB || window.teamsDB.length === 0) {
    window.teamsDB = standaardTeams;
    localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
}

// --- OEFENINGEN ---
const standaardOefeningen = [
    { id: "oef_1", naam: "Dynamische Warming-up + Rekken", duur: 10, aantalSpelers: "Alle", spullen: "Geen ballen nodig", uitleg: "2 rijen op de achterlijn. Joggen tot de middellijn, knieheffen, hakken-billen. Daarna in een cirkel dynamisch rekken.", makkelijker: "", moeilijker: "Toevoegen van sprintjes op fluitsignaal.", doelgroepen: ["x10", "x12", "x14", "m16", "m18", "m22"], categorieen: ["Warming-up", "Conditioning"] },
    { id: "oef_2", naam: "3-Man Weave (Lakers)", duur: 10, aantalSpelers: "Minimaal 6", spullen: "2 ballen", uitleg: "Start met 3 spelers op de achterlijn. Passen en achter je pass aan rennen. Eindigt met een lay-up zonder dat de bal de grond raakt.", makkelijker: "Bal mag 1 keer stuiteren.", moeilijker: "Terugweg 2 tegen 1 verdedigen.", doelgroepen: ["x12", "x14", "m16", "m18"], categorieen: ["Passing", "Conditioning"] },
    { id: "oef_3", naam: "Shell Drill (4v4)", duur: 15, aantalSpelers: "8 of 12 (veelvoud van 4)", spullen: "1 bal", uitleg: "4 aanvallers rond de driepuntslijn, 4 verdedigers. Aanval passt de bal rond. Verdediging schuift mee (Ball, Deny, Help, Help).", makkelijker: "Aanvallers staan stil.", moeilijker: "Aanvallers mogen snijden na een pass.", doelgroepen: ["x14", "m16", "m18", "m22"], categorieen: ["Defense"] },
    { id: "oef_4", naam: "5v5 Scrimmage (Partijvorm)", duur: 20, aantalSpelers: "10", spullen: "Wedstrijdbal, hesjes", uitleg: "Onderling partijtje. Focus op de transitie van aanval naar verdediging.", makkelijker: "", moeilijker: "Alleen scoren toegestaan na minimaal 3 passes.", doelgroepen: ["x10", "x12", "x14", "m16", "m18", "m22"], categorieen: ["Partijvorm"] }
];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || standaardOefeningen;

window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// --- INSTELLINGEN LOGICA ---
window.vulInstellingenLijsten = function() {
    const tLijst = document.getElementById('instellingen-teams-lijst');
    const teamSelect = document.getElementById('nieuw-tr-team');
    
    let lijstHTML = '';
    let selectHTML = '<option value="">-- Selecteer Team --</option>';

    const dagenMap = {1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag"};

    window.teamsDB.forEach((team, index) => {
        // Vul dropdown netjes op de achtergrond
        selectHTML += `<option value="${team.id}">${team.naam}</option>`;

        // Bouw de trainingstijden op voor de weergave
        let trainingenHtml = '';
        if (team.trainingen && team.trainingen.length > 0) {
            team.trainingen.forEach((tr, trIndex) => {
                trainingenHtml += `
                    <div style="display:inline-flex; align-items:center; background:white; border:1px solid var(--primary-color); padding:6px 10px; border-radius:4px; font-size:0.9rem; margin-top:8px; margin-right:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <strong style="color:var(--primary-color); margin-right:5px;">${dagenMap[tr.dag]}</strong> ${tr.start}-${tr.eind} 
                        <span style="color:#7f8c8d; font-size:0.8rem; margin-left:5px;">(${tr.zaal})</span>
                        <button onclick="window.verwijderVasteTraining(${index}, ${trIndex})" style="background:#e74c3c; border:none; color:white; border-radius:3px; cursor:pointer; font-weight:bold; margin-left:10px; padding:2px 6px;" title="Verwijder tijd">X</button>
                    </div>
                `;
            });
        } else {
            trainingenHtml = '<div style="font-size:0.85rem; color:#bdc3c7; font-style:italic; margin-top:5px;">Nog geen vaste trainingstijden in het rooster.</div>';
        }

        lijstHTML += `
            <li style="padding:15px; border-bottom:1px solid var(--border-color); background:#fafafa; margin-bottom:10px; border-radius:6px; border-left:4px solid var(--primary-color);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:1.1rem;"><strong>${team.naam}</strong> <span style="color:#7f8c8d; font-size:0.9rem;">(Standaard: ${team.spelers} spelers)</span></span>
                    <button onclick="window.verwijderTeam(${index})" style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">Team Wissen</button>
                </div>
                <div>${trainingenHtml}</div>
            </li>
        `;
    });

    if (tLijst) tLijst.innerHTML = lijstHTML;
    if (teamSelect) teamSelect.innerHTML = selectHTML;

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

window.voegTeamToe = function() {
    const naam = document.getElementById('nieuw-team-naam').value.trim();
    const spelers = parseInt(document.getElementById('nieuw-team-spelers').value) || 12;
    if(naam) {
        let nieuwId = naam.toLowerCase().replace(/[^a-z0-9]/g, '');
        window.teamsDB.push({ id: nieuwId, naam: naam, spelers: spelers, trainingen: [] });
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        document.getElementById('nieuw-team-naam').value = '';
        document.getElementById('nieuw-team-spelers').value = '';
        window.vulInstellingenLijsten();
        if(window.vulDynamischeFormulieren) window.vulDynamischeFormulieren();
    }
};

window.verwijderTeam = function(index) {
    if(confirm("Weet je zeker dat je dit team wilt wissen? Ze verdwijnen dan direct uit de agenda.")) {
        window.teamsDB.splice(index, 1);
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        window.vulInstellingenLijsten();
        if(window.vulDynamischeFormulieren) window.vulDynamischeFormulieren();
        if(window.renderWeekAgenda) window.renderWeekAgenda();
    }
};

window.voegVasteTrainingToe = function() {
    const teamId = document.getElementById('nieuw-tr-team').value;
    const dag = parseInt(document.getElementById('nieuw-tr-dag').value);
    const start = document.getElementById('nieuw-tr-start').value;
    const eind = document.getElementById('nieuw-tr-eind').value;
    const zaal = document.getElementById('nieuw-tr-zaal').value.trim();

    if (!teamId || !start || !eind || !zaal) return alert("Vul alle velden in (Team, Starttijd, Eindtijd en Zaal).");

    let startParts = start.split(':');
    let eindParts = eind.split(':');
    let startMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    let eindMin = parseInt(eindParts[0]) * 60 + parseInt(eindParts[1]);
    let duur = eindMin - startMin;

    if (duur <= 0) return alert("Fout: De eindtijd moet ná de starttijd liggen!");

    let teamIndex = window.teamsDB.findIndex(t => t.id === teamId);
    if (teamIndex > -1) {
        if (!window.teamsDB[teamIndex].trainingen) window.teamsDB[teamIndex].trainingen = [];
        
        window.teamsDB[teamIndex].trainingen.push({ dag, start, eind, zaal, duur });
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        
        document.getElementById('nieuw-tr-start').value = '';
        document.getElementById('nieuw-tr-eind').value = '';
        document.getElementById('nieuw-tr-zaal').value = '';
        
        window.vulInstellingenLijsten();
        if (window.renderWeekAgenda) window.renderWeekAgenda(); 
    }
};

window.verwijderVasteTraining = function(teamIndex, trIndex) {
    if(confirm("Wil je deze vaste trainingstijd uit het rooster van dit team verwijderen?")) {
        window.teamsDB[teamIndex].trainingen.splice(trIndex, 1);
        localStorage.setItem('blackshots_teams', JSON.stringify(window.teamsDB));
        window.vulInstellingenLijsten();
        if (window.renderWeekAgenda) window.renderWeekAgenda(); 
    }
};

window.voegCategorieToe = function() {
    const naam = document.getElementById('nieuwe-cat-naam').value.trim();
    if(naam && !window.categorieenDB.includes(naam)) {
        window.categorieenDB.push(naam);
        localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
        document.getElementById('nieuwe-cat-naam').value = '';
        window.vulInstellingenLijsten();
        if(window.vulDynamischeFormulieren) window.vulDynamischeFormulieren();
    }
};

window.verwijderCategorie = function(index) {
    if(confirm("Thema verwijderen?")) {
        window.categorieenDB.splice(index, 1);
        localStorage.setItem('blackshots_categorieen', JSON.stringify(window.categorieenDB));
        window.vulInstellingenLijsten();
        if(window.vulDynamischeFormulieren) window.vulDynamischeFormulieren();
    }
};

function laadDashboardData() {
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        window.teamsDB.forEach(team => { 
            let spelerTekst = team.spelers ? `<span style="font-size:0.85rem; background:#bdc3c7; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">👥 ${team.spelers}</span>` : '';
            teamLijst.innerHTML += `<li style="margin-bottom:8px;"><strong>${team.naam}</strong> ${spelerTekst}</li>`; 
        });
    }
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = window.oefeningenDB.length;
}

// 🌟 MAGIE: Deze fix zorgt dat het dropdown-menu ALTIJD geladen is, zelfs als je ververst!
document.addEventListener('DOMContentLoaded', () => {
    laadDashboardData();
    if(window.vulInstellingenLijsten) window.vulInstellingenLijsten();
    if(window.vulDynamischeFormulieren) window.vulDynamischeFormulieren();
});

// --- EXPORT & IMPORT ---
window.exporteerDatabase = function() {
    const exportData = { oefeningen: window.oefeningenDB, trainingen: window.geplandeTrainingenDB, teams: window.teamsDB, categorieen: window.categorieenDB };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2)); 
    const downloadAnchorNode = document.createElement('a'); 
    downloadAnchorNode.setAttribute("href", dataStr); 
    downloadAnchorNode.setAttribute("download", `blackshots_backup_${Date.now()}.json`); 
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
};

window.importeerDatabase = function(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data && data.oefeningen) {
                localStorage.setItem('blackshots_oefeningen', JSON.stringify(data.oefeningen)); 
                if(data.trainingen) localStorage.setItem('blackshots_trainingen', JSON.stringify(data.trainingen)); 
                if(data.teams) localStorage.setItem('blackshots_teams', JSON.stringify(data.teams)); 
                if(data.categorieen) localStorage.setItem('blackshots_categorieen', JSON.stringify(data.categorieen)); 
                alert("🏀 Database succesvol geïmporteerd! De app herlaadt nu."); location.reload();
            } else alert("Ongeldig back-up bestand.");
        } catch (err) { alert("Fout bij het inlezen van bestand."); console.error(err); }
    }; reader.readAsText(file);
};

window.wisAlleTrainingen = function() {
    if(confirm("Geschiedenis van trainingen wissen? (Oefeningen en teams blijven bewaard!)")) {
        window.geplandeTrainingenDB = {};
        localStorage.setItem('blackshots_trainingen', JSON.stringify(window.geplandeTrainingenDB));
        alert("Geschiedenis gewist!"); if(window.renderWeekAgenda) window.renderWeekAgenda();
    }
};

// Voeg dit toe aan basketbal_data.js
window.interneCompetitieDB = {
    naam: "Black Shots Zomercompetitie 2026",
    teams: ["x10", "x12", "x14"], // ID's uit je teamsDB
    wedstrijden: [
        // Voorbeeld: datum, team1, team2, uitslag1, uitslag2
        { id: "match_1", datum: "2026-06-08", team1: "x10", team2: "x12", uitslag1: null, uitslag2: null }
    ]
};

// --- FIREBASE CLOUD SYNC LOGICA ---

window.uploadNaarCloud = async function() {
    let btn = event.target;
    let oudeTekst = btn.innerText;
    btn.innerText = "⏳ Uploaden...";

    // Verzamel al je lokale data
    let data = {
        oefeningen: localStorage.getItem('blackshots_oefeningen') || "",
        toernooi: localStorage.getItem('blackshots_toernooi') || "",
        trainingen: localStorage.getItem('blackshots_trainingen') || ""
    };
    
    try {
        // Schrijf naar de Firestore database (collectie 'blackshots', document 'clubdata')
        await window.fireSetDoc(window.fireDoc(window.firebaseDB, "blackshots", "clubdata"), data);
        
        btn.style.background = "#2ecc71";
        btn.innerText = "✅ Veilig in de Cloud!";
    } catch(e) {
        console.error("Firebase upload fout:", e);
        alert('❌ Er ging iets mis met uploaden naar Firebase. Bekijk de console voor details.');
        btn.innerText = oudeTekst;
    }
    
    setTimeout(() => { btn.innerText = oudeTekst; btn.style.background = "#3498db"; }, 2500);
};

window.downloadUitCloud = async function() {
    if(!confirm("Weet je zeker dat je de data op dit apparaat wilt overschrijven met de laatste Cloud-versie?")) return;
    
    let btn = event.target;
    let oudeTekst = btn.innerText;
    btn.innerText = "⏳ Ophalen...";

    try {
        // Haal de data op uit Firestore
        const docSnap = await window.fireGetDoc(window.fireDoc(window.firebaseDB, "blackshots", "clubdata"));
        
        if (docSnap.exists()) {
            let result = docSnap.data();
            
            if(result.oefeningen) localStorage.setItem('blackshots_oefeningen', result.oefeningen);
            if(result.toernooi) localStorage.setItem('blackshots_toernooi', result.toernooi);
            if(result.trainingen) localStorage.setItem('blackshots_trainingen', result.trainingen);
            
            alert('✅ Data succesvol gedownload uit de Cloud! De app herlaadt nu om de nieuwe standen te tonen.');
            location.reload();
        } else {
            alert("❌ Geen data gevonden in de cloud. Heb je al eens op Upload geklikt?");
            btn.innerText = oudeTekst;
        }
    } catch(e) {
        console.error("Firebase download fout:", e);
        alert('❌ Kon de data niet ophalen uit de cloud. Controleer je internetverbinding.');
        btn.innerText = oudeTekst;
    }
};
