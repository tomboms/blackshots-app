// --- BASKETBAL_DATA.JS: DASHBOARD ENGINE, LIVE CLOUD LISTENERS & RECHTENBEVEILIGING ---

window.toggleDarkMode = function() {
    let body = document.body;
    body.classList.toggle('dark-mode');
    let isDark = body.classList.contains('dark-mode');
    localStorage.setItem('bs_darkmode', isDark); 
    let btn = document.getElementById('dark-mode-toggle');
    if(btn) btn.innerText = isDark ? '☀️' : '🌙';
};

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('bs_darkmode') === 'true') {
        document.body.classList.add('dark-mode');
        let btn = document.getElementById('dark-mode-toggle');
        if(btn) btn.innerText = '☀️';
    }
});

const clubData = { naam: "Black Shots", locatie: "Helmond (Brandevoort)", zalen: ["De Veste", "Westwijzer", "Veka"] };

window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
window.spelersDB = JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
window.oefeningenDB = JSON.parse(localStorage.getItem('blackshots_oefeningen')) || [];
window.categorieenDB = JSON.parse(localStorage.getItem('blackshots_categorieen')) || ["Warming-up", "Shooting", "Dribbling", "Passing", "Defense", "Conditioning", "Partijvorm"];
window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};

// ============================================================================
// 📊 DASHBOARD ENGINE (MET LIVE COUNTERS, VERJAARDAGEN & BESTUURS LOCK)
// ============================================================================
window.laadDashboardData = function() {
    // 0. CONTROLEER GEBRUIKER & RECHTEN
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    if (!actieveGebruiker) return;

    // 1. VUL LIVE COUNTERS BOVENAAN
    if (document.getElementById('stat-leden')) document.getElementById('stat-leden').innerText = window.spelersDB.length;
    if (document.getElementById('stat-teams')) document.getElementById('stat-teams').innerText = window.teamsDB.length;
    if (document.getElementById('stat-oefeningen')) document.getElementById('stat-oefeningen').innerText = window.oefeningenDB.length;

    // 2. FILTREER RECHTENBEVEILIGING VOOR BESTUUR-WIDGET
    let bestuurWidget = document.getElementById('dash-widget-bestuur');
    if (bestuurWidget) {
        if (actieveGebruiker.rol === 'admin' || actieveGebruiker.rol === 'bestuur' || actieveGebruiker.paginas.includes('bestuur') || actieveGebruiker.paginas.includes('all')) {
            bestuurWidget.style.display = 'block';
            window.laadVolgendeVergaderingDashboard();
        } else {
            bestuurWidget.style.display = 'none';
        }
    }

    // 3. RECHTENBEVEILIGING VOOR DE PORTAAL KNOPPEN
    window.laadSnelkoppelingenDashboard(actieveGebruiker);

    // 4. LAAD DE AUTOMATISCHE VERJAARDAGENWIDGET
    window.laadVerjaardagenDashboard();
};

// --- DYNAMISCH DE RECHTENKNOPPEN GENEREREN ---
window.laadSnelkoppelingenDashboard = function(user) {
    let container = document.getElementById('dash-snelkoppelingen-container');
    if (!container) return;
    container.innerHTML = '';

    // Alle mogelijke opties met hun vereiste pagina-ID's
    const opties = [
        { id: 'jaarplanning', n: '📅 Master Jaarplanning', url: 'jaarplanning.html', c: '#e74c3c' },
        { id: 'zaalhuur', n: '🏟️ Zaalhuur Beheer', url: 'zaalhuur.html', c: '#27ae60' },
        { id: 'pouleindeling', n: '⛹️ Poule-indelingen', url: 'pouleindeling.html', c: '#e67e22' },
        { id: 'agenda', n: '🗓️ Weekagenda Teams', url: 'agenda.html', c: '#3498db' },
        { id: 'spelers', n: '👤 Spelers Database', url: 'spelers.html', c: '#1abc9c' },
        { id: 'team', n: '👥 Team Beheer', url: 'team.html', c: '#f39c12' },
        { id: 'oefeningen', n: '📋 Oefeningenbank', url: 'oefeningen.html', c: '#9b59b6' },
        { id: 'bestuur', n: '📁 Bestuur & Agenda', url: 'bestuur.html', c: '#2c3e50' },
        { id: 'gebruikers', n: '🔐 Trainer Beheer', url: 'gebruikers.html', c: '#7f8c8d' },
        { id: 'instellingen', n: '⚙️ Instellingen', url: 'instellingen.html', c: '#d35400' }
    ];

    opties.forEach(o => {
        // Mag de ingelogde persoon deze specifieke knop zien?
        let magZien = user.paginas.includes('all') || user.paginas.includes(o.id);
        if (o.id === 'instellingen' && user.rol === 'trainer') magZien = false; // Extra harde check voor trainers

        if (magZien) {
            container.innerHTML += `
                <button onclick="window.location.href='${o.url}'" class="primary-btn" style="background:${o.c}; margin:0; border:none; padding:10px 15px; border-radius:4px; color:white; font-weight:bold; cursor:pointer; transition:0.2s;">
                    ${o.n}
                </button>
            `;
        }
    });
};

// --- AUTOMATISCHE VERJAARDAGEN ASSISTENT ---
window.laadVerjaardagenDashboard = function() {
    let container = document.getElementById('dash-verjaardagen-inhoud');
    if (!container) return;

    if (!window.spelersDB || window.spelersDB.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen spelers aanwezig om verjaardagen te berekenen.</p>';
        return;
    }

    let vandaag = new Date();
    vandaag.setHours(0,0,0,0);
    let verjaardagenLijst = [];

    window.spelersDB.forEach(s => {
        if (!s.geboorteDatum || s.geboorteDatum === '-') return;
        
        let parts = s.geboorteDatum.split('-'); // Verwacht YYYY-MM-DD
        if (parts.length !== 3) return;

        let bMonth = parseInt(parts[1]) - 1;
        let bDay = parseInt(parts[2]);
        let bYear = parseInt(parts[0]);

        // Maak verjaardag voor dit kalenderjaar
        let bdayDitJaar = new Date(vandaag.getFullYear(), bMonth, bDay);
        
        // Als de verjaardag dit jaar al is geweest, verplaats hem naar volgend jaar
        if (bdayDitJaar < vandaag) {
            bdayDitJaar.setFullYear(vandaag.getFullYear() + 1);
        }

        let diffTijd = bdayDitJaar - vandaag;
        let diffDagen = Math.ceil(diffTijd / (1000 * 60 * 60 * 24));
        let wordtLeeftijd = bdayDitJaar.getFullYear() - bYear;

        let maandenNamen = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        let mooieDatum = `${bDay} ${maandenNamen[bMonth]}`;

        verjaardagenLijst.push({
            naam: s.naam,
            team: s.teamId || "Vrij",
            dagenResteer: diffDagen,
            datumTekst: mooieDatum,
            wordt: wordtLeeftijd
        });
    });

    // Sorteer op wie het eerste jarig is (minste resterende dagen)
    verjaardagenLijst.sort((a,b) => a.dagenResteer - b.dagenResteer);
    let top5 = verjaardagenLijst.slice(0, 5);

    if (top5.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen geldige geboortedatums gevonden.</p>';
        return;
    }

    container.innerHTML = '';
    top5.forEach(v => {
        let dagenLabel = v.dagenResteer === 0 ? '🎉 VANDAAG!' : (v.dagenResteer === 1 ? '明日 Morgen' : `nog ${v.dagenResteer} dagen`);
        let badgeKleur = v.dagenResteer === 0 ? '#e74c3c; color:white; font-weight:bold; animation: pulse 1s infinite;' : '#f1c40f; color:#2c3e50;';
        
        container.innerHTML += `
            <div class="verjaardag-rij" style="border-left-color: ${v.dagenResteer === 0 ? '#e74c3c' : '#f1c40f'}">
                <div>
                    <strong style="color:var(--secondary-color);">${v.naam}</strong>
                    <span style="font-size:0.75rem; background:#cbd5e1; padding:2px 6px; border-radius:10px; margin-left:5px; font-weight:bold; text-transform:uppercase;">${v.team.toUpperCase()}</span>
                    <br><span style="font-size:0.8rem; color:#7f8c8d;">Wordt <strong>${v.wordt}</strong> jaar op ${v.datumTekst}</span>
                </div>
                <div style="background:${badgeKleur} padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:bold;">
                    ${dagenLabel}
                </div>
            </div>
        `;
    });
};

// --- AUTOMATISCHE VERGADER-ASSISTENT (AANKOMENDE SCOUT) ---
window.laadVolgendeVergaderingDashboard = function() {
    let container = document.getElementById('dash-vergadering-inhoud');
    if (!container) return;

    let bestuurDB = JSON.parse(localStorage.getItem('blackshots_bestuur')) || [];
    let vandaagIso = new Date().toISOString().split('T')[0];

    // Filter alleen vergaderingen die vandaag of in de toekomst plaatsvinden
    let aankomend = boardroom = scarcity = bestuurDB.filter(v => v.isoDatum && v.isoDatum >= vandaagIso);
    
    // Sorteer chronologisch oplopend (dichtstbijzijnde eerst)
    aankomend.sort((a,b) => a.isoDatum.localeCompare(b.isoDatum));

    if (aankomend.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen aankomende vergaderingen gepland.</p>';
        return;
    }

    let volgende = aankomend[0];
    let typeIcoon = volgende.type === 'ALV' ? '👥' : (volgende.type === 'Commissie' ? '📋' : '💼');

    container.innerHTML = `
        <div style="background:#f4f6f8; border-left:4px solid #2c3e50; padding:15px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <strong style="font-size:1.15rem; color:var(--secondary-color);">${typeIcoon} ${volgende.type || 'Bestuur'} Overleg</strong>
                <span style="background:#2c3e50; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">EERSTVOLGENDE</span>
            </div>
            <div style="font-size:0.95rem; color:#34495e; margin-bottom:12px; line-height:1.4;">
                📅 <strong>${volgende.datum}</strong> <br>
                🕒 Tijd: <strong>${volgende.tijd || '20:00 uur'}</strong> <br>
                📍 Locatie: <strong>${volgende.adres || 'De Veste'}</strong>
            </div>
            <button onclick="window.location.href='bestuur.html'" style="width:100%; background:#2c3e50; color:white; border:none; padding:10px; border-radius:4px; font-weight:bold; cursor:pointer; transition:0.2s;">
                📝 Open Notulen / Bereid Voor
            </button>
        </div>
    `;
};

// ============================================================================
// INSTELLINGEN COMPONENTEN
// ============================================================================
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
            cLijst.innerHTML += `<li style="background:var(--secondary-color); color:white; padding:6px 12px; border-radius:20px; display:flex; align-items:center; gap:10px;">${cat} <button onclick="window.verwijderCategorie(${index})" style="background:transparent; color:white; border:none; cursor:pointer; font-weight:bold;">X</button></li>`;
        });
    }
};