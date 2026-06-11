// --- BASKETBAL_DATA.JS: RUSTIGE DATABASE, DASHBOARD ENGINE & DARK MODE ---

// ============================================================================
// UNIVERSEEL DARK MODE SYSTEEM
// ============================================================================
window.toggleDarkMode = function() {
    let body = document.body;
    body.classList.toggle('dark-mode');
    
    let isDark = body.classList.contains('dark-mode');
    localStorage.setItem('bs_darkmode', isDark); // Gekoppeld aan basketbal_auth.js key!
    
    let btn = document.getElementById('dark-mode-toggle');
    if(btn) btn.innerText = isDark ? '☀️' : '🌙';
};

// Controleer direct bij het inladen of de donkere stand geactiveerd was
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
    // 1. Teams en spelerstellingen inladen
    const teamLijst = document.getElementById('dash-teams-lijst');
    if (teamLijst) {
        teamLijst.innerHTML = '';
        if (window.teamsDB.length === 0) {
            teamLijst.innerHTML = '<li style="list-style:none; color:var(--text-muted); font-style:italic; margin-left:-20px;">Nee geen actieve teams aanwezig.</li>';
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

    // 2. Basis statistieken vullen (Oefeningen & Totaal aantal unieke leden)
    const oefCount = document.getElementById('dash-oef-count');
    if (oefCount) oefCount.innerText = window.oefeningenDB.length;

    const ledenCount = document.getElementById('dash-leden-count');
    if (ledenCount) ledenCount.innerText = window.spelersDB.length;

    // 3. NIEUW: Bereken de huidige kalenderweek van de JAARPLANNING
    const jaarplanningWeekContainer = document.getElementById('dash-jaarplanning-week');
    if (jaarplanningWeekContainer) {
        let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];
        
        // Bereken maandag t/m zondag van de huidige week
        let vandaag = new Date();
        let huidigeDag = vandaag.getDay(); 
        let afstandTotMaandag = huidigeDag === 0 ? -6 : 1 - huidigeDag;
        
        let maandag = new Date(vandaag);
        maandag.setDate(vandaag.getDate() + afstandTotMaandag);
        maandag.setHours(0,0,0,0);
        
        let zondag = new Date(maandag);
        zondag.setDate(maandag.getDate() + 6);
        zondag.setHours(23,59,59,999);

        // Filter alle jaarplanning items die in deze week vallen
        let weekItems = jaarplanningData.filter(item => {
            if(!item.isoDatum) return false;
            let start = item.isoDatum;
            let eind = item.eindDatum || item.isoDatum;
            
            let isoMaandag = maandag.toISOString().split('T')[0];
            let isoZondag = zondag.toISOString().split('T')[0];
            
            // Check op overlap van datums
            return (start <= isoZondag && eind >= isoMaandag);
        });

        if (weekItems.length === 0) {
            jaarplanningWeekContainer.innerHTML = '<p style="color: var(--text-muted); font-style: italic; margin: 0;">Geen clubactiviteiten gepland voor deze week.</p>';
        } else {
            // Sorteer de items chronologisch op startdatum
            weekItems.sort((a,b) => a.isoDatum.localeCompare(b.isoDatum));
            
            let html = '';
            weekItems.forEach(item => {
                let typeId = (item.type || 'memo').toLowerCase();
                let cat = kalenderCategorieen.find(c => c.id === typeId);
                let kleur = cat ? cat.kleur : '#3498db';
                
                // Formatteer de datum naar iets moois (bijv: "14 jun")
                let dObj = new Date(item.isoDatum);
                let datumTekst = `${dObj.getDate()} ${dObj.toLocaleString('nl-NL', { month: 'short' })}`;
                if(item.eindDatum && item.eindDatum !== item.isoDatum) {
                    let eObj = new Date(item.eindDatum);
                    datumTekst += ` t/m ${eObj.getDate()} ${eObj.toLocaleString('nl-NL', { month: 'short' })}`;
                }

                let extraMeta = [];
                if(item.tijd) extraMeta.push(`⏰ ${item.tijd}`);
                if(item.locatie) extraMeta.push(`📍 ${item.locatie}`);
                let metaString = extraMeta.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">${extraMeta.join(' | ')}</div>` : '';

                html += `
                    <div style="background:var(--bg-color); padding:10px 12px; border-radius:6px; border-left:5px solid ${kleur}; margin-bottom:10px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <strong style="font-size:0.95rem; color:var(--text-color);">${item.titel}</strong>
                            <span style="font-size:0.75rem; background:rgba(0,0,0,0.05); padding:2px 6px; border-radius:10px; font-weight:bold; color:var(--text-muted); white-space:nowrap;">${datumTekst}</span>
                        </div>
                        ${metaString}
                    </div>
                `;
            });
            jaarplanningWeekContainer.innerHTML = html;
        }
    }
};

// Start de dashboard lading direct bij inladen op de achtergrond
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(window.laadDashboardData, 200);
});

// ============================================================================
// INSTELLINGEN COMPONENTEN (HOUDEN WE INTACT)
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