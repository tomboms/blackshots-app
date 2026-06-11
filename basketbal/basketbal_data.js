// --- BASKETBAL_DATA.JS: RUSTIGE DATABASE, DASHBOARD ENGINE & DARK MODE ---

// ============================================================================
// UNIVERSEEL DARK MODE SYSTEEM
// ============================================================================
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
// DYNAMISCH LIVE DASHBOARD
// ============================================================================
window.laadDashboardData = function() {
    // 1. Teams en spelerstellingen
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        if (window.teamsDB.length === 0) {
            teamLijst.innerHTML = '<li style="list-style:none; color:var(--text-muted); font-style:italic; margin-left:-20px;">Geen actieve teams aanwezig.</li>';
        }
        window.teamsDB.forEach(team => { 
            let count = window.spelersDB.filter(s => {
                if(!s || !s.teamId) return false;
                let sId = s.teamId.toLowerCase().replace(/[^a-z0-9]/g, '');
                let tId = team.id.toLowerCase().replace(/[^a-z0-9]/g, '');
                return sId === tId;
            }).length;
            teamLijst.innerHTML += `<li><strong>${team.naam}</strong>: <span style="color:var(--primary-color);">${count}</span> spelers</li>`;
        });
    }

    // 2. Basis statistieken
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = window.oefeningenDB.length;

    const ledenCount = document.getElementById('dash-leden-count');
    if (ledenCount) ledenCount.innerText = window.spelersDB.length;

    // 3. DE NIEUWE WEEK-VIEW (7 KOLOMMEN) VOOR DE JAARPLANNING
    const jaarplanningWeekContainer = document.getElementById('dash-jaarplanning-week');
    if (jaarplanningWeekContainer) {
        let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];
        let nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
        
        // LOKALE DATUM (Fix voor het timezone/zondagavond probleem!)
        let vandaag = new Date();
        let vandaagIso = `${vandaag.getFullYear()}-${String(vandaag.getMonth()+1).padStart(2,'0')}-${String(vandaag.getDate()).padStart(2,'0')}`;
        
        let huidigeDag = vandaag.getDay(); 
        let afstandTotMaandag = huidigeDag === 0 ? -6 : 1 - huidigeDag;
        
        let maandag = new Date(vandaag);
        maandag.setDate(vandaag.getDate() + afstandTotMaandag);

        let dagenLijst = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
        let weekHtml = `<div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; min-height:220px;">`;

        for(let i=0; i<7; i++) {
            let loopDag = new Date(maandag);
            loopDag.setDate(maandag.getDate() + i);
            
            // Handmatige lokale ISO string om tijdszone verschuivingen te voorkomen
            let isoDag = `${loopDag.getFullYear()}-${String(loopDag.getMonth()+1).padStart(2,'0')}-${String(loopDag.getDate()).padStart(2,'0')}`;
            
            let isVandaag = (isoDag === vandaagIso);
            let headerBg = isVandaag ? 'var(--primary-color)' : 'var(--secondary-color)';
            let headerText = 'white';
            let borderCol = isVandaag ? 'var(--primary-color)' : 'var(--border-color)';

            // Handmatige activiteiten ophalen
            let dagItems = jaarplanningData.filter(item => {
                if(!item.isoDatum) return false;
                let start = item.isoDatum;
                let eind = item.eindDatum || item.isoDatum;
                return (start <= isoDag && eind >= isoDag);
            });

            // NBB data dynamisch ophalen
            let wedstrijdenOpDag = nbbWedstrijden.filter(w => w.Datum && w.Datum.startsWith(isoDag));
            if (wedstrijdenOpDag.length > 0) {
                let thuisTeams = [], uitTeams = [];
                wedstrijdenOpDag.forEach(w => {
                    if (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots')) thuisTeams.push(w.Thuisteam.replace(/Black Shots/ig, '').trim()||"?");
                    else if (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots')) uitTeams.push(w.Uitteam.replace(/Black Shots/ig, '').trim()||"?");
                });
                if (thuisTeams.length > 0) dagItems.push({ titel: `Thuis: ${[...new Set(thuisTeams)].join(', ')}`, type: 'thuis' });
                if (uitTeams.length > 0) dagItems.push({ titel: `Uit: ${[...new Set(uitTeams)].join(', ')}`, type: 'uit' });
            }

            let itemsHtml = '';
            if(dagItems.length > 0) {
                dagItems.forEach(item => {
                    let typeId = (item.type || 'memo').toLowerCase();
                    let cat = kalenderCategorieen.find(c => c.id === typeId);
                    
                    let kleur = cat ? cat.kleur : '#3498db';
                    let tekstKleur = cat && cat.tekstKleur ? cat.tekstKleur : '#ffffff';

                    let extraMeta = [];
                    if(item.tijd) extraMeta.push(`⏰ ${item.tijd}`);
                    if(item.locatie) extraMeta.push(`📍 ${item.locatie}`);
                    let metaString = extraMeta.length > 0 ? `<div style="font-size:0.7rem; opacity:0.9; margin-top:4px; font-weight:normal;">${extraMeta.join('<br>')}</div>` : '';

                    itemsHtml += `
                        <div style="background:${kleur}; color:${tekstKleur}; padding:8px; border-radius:4px; margin-bottom:6px; font-size:0.8rem; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
                            <div style="white-space:normal; line-height:1.2;">${item.titel}</div>
                            ${metaString}
                        </div>
                    `;
                });
            } else {
                itemsHtml = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:10px 0; font-style:italic;">Geen items</div>`;
            }

            weekHtml += `
                <div style="flex: 1; min-width: 120px; background: var(--card-bg); border: 2px solid ${borderCol}; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                    <div style="background: ${headerBg}; color: ${headerText}; text-align: center; padding: 8px 0; font-weight: bold; border-bottom: 1px solid ${borderCol};">
                        ${dagenLijst[i]} <span style="font-size:1.2rem; display:block;">${loopDag.getDate()}</span>
                    </div>
                    <div style="padding: 8px; flex: 1; display:flex; flex-direction:column; background: var(--card-bg);">
                        ${itemsHtml}
                    </div>
                </div>
            `;
        }
        weekHtml += `</div>`;
        jaarplanningWeekContainer.innerHTML = weekHtml;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.laadDashboardData, 200);
});

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
            cLijst.innerHTML += `<li style="background:var(--secondary-color); color:white; padding:6px 12px; border-radius:20px; display:flex; align-items:center; gap:10px;">${cat} <button onclick="window.verwijderCategorie(${index})" style="background:transparent; color:white; border:none; cursor:pointer; font-weight:bold;">&times;</button></li>`;
        });
    }
};