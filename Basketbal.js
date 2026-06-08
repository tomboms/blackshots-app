// --- BASKETBAL.JS: DATABASE EN LOGICA VOOR BLACK SHOTS ---

// 1. DATABASE: TEAMS & VASTE TRAININGSTIJDEN
// Dagen: 1=Maandag, 2=Dinsdag, 3=Woensdag, 4=Donderdag, 5=Vrijdag
const teamsDB = [
    { id: "x10", naam: "X10-1", basket: 2.60, balmaat: 5, jury: "Ouders",
      trainingen: [{ dag: 1, start: "17:00", eind: "18:00", zaal: "De Veste", duur: 60 }] },
      
    { id: "x12", naam: "X12-1", basket: 2.60, balmaat: 5, jury: "Ouders",
      trainingen: [
          { dag: 1, start: "17:00", eind: "18:00", zaal: "De Veste", duur: 60 },
          { dag: 3, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 }
      ] },
      
    { id: "x14", naam: "X14-1", basket: 3.05, balmaat: 6, jury: "Zelf",
      trainingen: [
          { dag: 1, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 },
          { dag: 5, start: "18:00", eind: "19:30", zaal: "Veka", duur: 90 }
      ] },
      
    { id: "m16", naam: "M16-1", basket: 3.05, balmaat: 7, jury: "Zelf (Fluiten)",
      trainingen: [
          { dag: 1, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 },
          { dag: 5, start: "18:00", eind: "19:30", zaal: "Veka", duur: 90 }
      ] },
      
    { id: "m18", naam: "M18-1", basket: 3.05, balmaat: 7, jury: "Zelf (Fluiten)",
      trainingen: [
          { dag: 3, start: "18:00", eind: "19:15", zaal: "De Veste", duur: 75 },
          { dag: 5, start: "19:30", eind: "21:00", zaal: "Veka", duur: 90 }
      ] },
      
    { id: "m22", naam: "M22", basket: 3.05, balmaat: 7, divisie: 4,
      trainingen: [{ dag: 3, start: "19:15", eind: "20:30", zaal: "De Veste", duur: 75 }] }
];

// Opslag voor de oefeningen die je straks gaat toevoegen
let oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];

// 2. NAVIGATIE LOGICA
window.switchTab = function(tabId) {
    document.querySelectorAll('.content-sectie').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const actiefScherm = document.getElementById(tabId);
    if(actiefScherm) actiefScherm.classList.add('active');
    
    // Zoek de juiste knop op om actief te maken
    document.querySelectorAll(`.tab-btn`).forEach(btn => {
        if(btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });

    // Voer specifieke acties uit bij het openen van een tabblad
    if (tabId === 'agenda') renderWeekAgenda();
};

// 3. DASHBOARD RENDEREN
function laadDashboardData() {
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        teamsDB.forEach(team => {
            teamLijst.innerHTML += `
                <li style="margin-bottom:8px;">
                    <strong>${team.naam}</strong> 
                    <span style="font-size:0.85rem; background:#bdc3c7; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">Bal ${team.balmaat}</span>
                </li>`;
        });
    }
    
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = oefeningenDB.length;
}

// 4. WEEKAGENDA RENDEREN (Automatisch de trainingen inplannen)
window.renderWeekAgenda = function() {
    const container = document.getElementById('week-agenda-container');
    if (!container) return;
    container.innerHTML = '';

    const dagenNamen = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"];
    
    // Maak voor elke dag een kolom aan
    for (let i = 1; i <= 5; i++) {
        const kolom = document.createElement('div');
        kolom.className = 'dag-kolom';
        kolom.innerHTML = `<div class="dag-titel">${dagenNamen[i-1]}</div>`;
        
        // Zoek alle trainingen die op deze dag vallen
        let trainingenVandaag = [];
        teamsDB.forEach(team => {
            if (team.trainingen) {
                team.trainingen.forEach(tr => {
                    if (tr.dag === i) {
                        trainingenVandaag.push({ teamNaam: team.naam, start: tr.start, eind: tr.eind, zaal: tr.zaal, duur: tr.duur, teamId: team.id });
                    }
                });
            }
        });

        // Sorteer trainingen op starttijd
        trainingenVandaag.sort((a, b) => a.start.localeCompare(b.start));

        // Zet de trainingen als klikbare blokken in de kolom
        if (trainingenVandaag.length === 0) {
            kolom.innerHTML += `<p style="text-align:center; color:#bdc3c7; font-size:0.9rem; margin-top:20px;">Geen trainingen</p>`;
        } else {
            trainingenVandaag.forEach(tr => {
                kolom.innerHTML += `
                    <div class="training-blok" onclick="openTrainingsPlanner('${tr.teamId}', '${tr.start}')">
                        <strong style="display:block; font-size:1.1rem; color:var(--secondary-color);">${tr.teamNaam}</strong>
                        <div style="color:#e67e22; font-weight:bold; font-size:0.9rem; margin:3px 0;">🕒 ${tr.start} - ${tr.eind}</div>
                        <div style="font-size:0.8rem; color:#7f8c8d;">📍 ${tr.zaal} (${tr.duur} min)</div>
                    </div>
                `;
            });
        }

        container.appendChild(kolom);
    }
};

// Tijdelijke functie: Wat gebeurt er als je op een training klikt?
window.openTrainingsPlanner = function(teamId, startTijd) {
    alert(`Je klikte op de training van ${teamId} om ${startTijd}. Hier gaan we dadelijk de Drag & Drop trainingsplanner voor bouwen!`);
};

// 5. START DE APP
document.addEventListener('DOMContentLoaded', () => {
    laadDashboardData();
});