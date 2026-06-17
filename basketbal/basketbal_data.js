// --- BASKETBAL_DATA.JS: COMPLETE DASHBOARD ENGINE MET SLIMME FILTERS & KOSTENSCANNER ---

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
// 📊 DASHBOARD ENGINE
// ============================================================================
window.laadDashboardData = function() {
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    if (!actieveGebruiker) return;

    // 1. LIVE COUNTERS
    if (document.getElementById('stat-leden')) document.getElementById('stat-leden').innerText = window.spelersDB.length;
    if (document.getElementById('stat-teams')) document.getElementById('stat-teams').innerText = window.teamsDB.length;
    if (document.getElementById('stat-oefeningen')) document.getElementById('stat-oefeningen').innerText = window.oefeningenDB.length;

    // 2. RECHTENBEVEILIGING BESTUURSBLOK
    let isBestuurslid = userHasAccess(actieveGebruiker, 'bestuur');
    let bestuurWidget = document.getElementById('dash-widget-bestuur');
    if (bestuurWidget) {
        if (isBestuurslid) {
            bestuurWidget.style.display = 'block';
            window.laadVolgendeVergaderingDashboard();
            window.berekenZaalhuurKostenWeek();
        } else {
            bestuurWidget.style.display = 'none';
        }
    }

    // 3. GENEREREN WIDGETS
    window.laadSnelkoppelingenDashboard(actieveGebruiker);
    window.laadVerjaardagenDashboard();
    window.laadJaarplanningWeekDashboard();
    window.laadCompetitieWidget();
};

function userHasAccess(user, pageId) {
    return user.paginas.includes('all') || user.paginas.includes(pageId) || user.rol === 'admin' || user.rol === 'bestuur';
}

// --- DYNAMISCHE SNELKOPPELINGEN ---
window.laadSnelkoppelingenDashboard = function(user) {
    let container = document.getElementById('dash-snelkoppelingen-container');
    if (!container) return;
    container.innerHTML = '';

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
        let magZien = user.paginas.includes('all') || user.paginas.includes(o.id);
        if (o.id === 'instellingen' && user.rol === 'trainer') magZien = false;

        if (magZien) {
            container.innerHTML += `
                <button onclick="window.location.href='${o.url}'" class="primary-btn" style="background:${o.c}; margin:0; border:none; padding:10px 15px; border-radius:4px; color:white; font-weight:bold; cursor:pointer; transition:0.2s; font-size:0.9rem;">
                    ${o.n}
                </button>
            `;
        }
    });
};

// --- AUTOMATISCHE VOLGENDE VERGADERING ---
window.laadVolgendeVergaderingDashboard = function() {
    let container = document.getElementById('dash-vergadering-inhoud');
    if (!container) return;

    let bestuurDB = JSON.parse(localStorage.getItem('blackshots_bestuur')) || [];
    let vandaagIso = new Date().toISOString().split('T')[0];
    let aankomend = boardroom = scarcity = bestuurDB.filter(v => v.isoDatum && v.isoDatum >= vandaagIso);
    
    aankomend.sort((a,b) => a.isoDatum.localeCompare(b.isoDatum));

    if (aankomend.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen aankomende vergaderingen gepland.</p>';
        return;
    }

    let volgende = aankomend[0];
    let typeIcoon = volgende.type === 'ALV' ? '👥' : (volgende.type === 'Commissie' ? '📋' : '💼');

    container.innerHTML = `
        <div style="background:#f4f6f8; border-left:4px solid #2c3e50; padding:12px; border-radius:6px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;">
                <strong style="color:var(--secondary-color); font-size:0.95rem;">${typeIcoon} Eerstvolgende ${volgende.type || 'Bestuur'}</strong>
                <span style="background:#2c3e50; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; font-weight:bold;">AGENDA</span>
            </div>
            <div style="font-size:0.85rem; color:#34495e; margin-bottom:8px;">
                📅 <strong>${volgende.datum}</strong> om <strong>${volgende.tijd || '20:00'}</strong><br>
                📍 Locatie: <strong>${volgende.adres || 'De Veste'}</strong>
            </div>
            <button onclick="window.location.href='bestuur.html'" style="width:100%; background:#2c3e50; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.8rem;">✏️ Voorbereiding & Notulen</button>
        </div>
    `;
};

// --- NIEUW: SLIMME ZAALHUUR-KOSTEN BEREKENING (DEZE WEEK) ---
window.berekenZaalhuurKostenWeek = function() {
    let kostenDiv = document.getElementById('dash-zaalhuur-kosten');
    if (!kostenDiv) return;

    let instellingen = JSON.parse(localStorage.getItem('blackshots_instellingen')) || {};
    let tarieven = instellingen.tarieven || [];
    let totaleKosten = 0;

    window.teamsDB.forEach(team => {
        if (Array.isArray(team.trainingen)) {
            team.trainingen.forEach(tr => {
                let uren = (tr.duur || 90) / 60;
                let zaalNaam = (tr.zaal || "").toLowerCase();
                
                // Zoek het juiste tarief op basis van zaalnaam
                let matchedTarief = tarieven.find(t => zaalNaam.includes(t.zaal.toLowerCase()));
                let uurPrijs = matchedTarief ? parseFloat(matchedTarief.prijs) : 35.00; // 35 euro standaard fallback
                
                totaleKosten += (uren * uurPrijs);
            });
        }
    });

    kostenDiv.innerText = `€ ${totaleKosten.toFixed(2).replace('.', ',')}`;
};

// --- VERJAARDAGEN & JUBILEA WITH FILTER-HORIZON ---
window.laadVerjaardagenDashboard = function() {
    let container = document.getElementById('dash-verjaardagen-inhoud');
    let filterEl = document.getElementById('filter-verjaardag-periode');
    if (!container || !filterEl) return;

    let maxDagen = parseInt(filterEl.value) || 30;
    let vandaag = new Date();
    vandaag.setHours(0,0,0,0);
    
    let resultaten = [];

    window.spelersDB.forEach(s => {
        // 1. VERJAARDAGEN VERWERKEN
        if (s.geboorteDatum && s.geboorteDatum !== '-') {
            let parts = s.geboorteDatum.split('-');
            if (parts.length === 3) {
                let bMonth = parseInt(parts[1]) - 1;
                let bDay = parseInt(parts[2]);
                let bYear = parseInt(parts[0]);

                let bdayDitJaar = new Date(vandaag.getFullYear(), bMonth, bDay);
                if (bdayDitJaar < vandaag) bdayDitJaar.setFullYear(vandaag.getFullYear() + 1);

                let diffDagen = Math.ceil((bdayDitJaar - vandaag) / (1000 * 60 * 60 * 24));
                
                if (diffDagen <= maxDagen) {
                    resultaten.push({
                        naam: s.naam,
                        team: s.teamId || "Vrij",
                        dagen: diffDagen,
                        type: 'verjaardag',
                        label: `Wordt <strong>${bdayDitJaar.getFullYear() - bYear}</strong> jaar`,
                        datumText: bdayDitJaar.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                    });
                }
            }
        }

        // 2. JUBILEA VERWERKEN (ELK JAAR EEN MILSTONE OP BASIS VAN LIDSINDS)
        if (s.lidSinds && s.lidSinds !== '-') {
            let slashParts = s.lidSinds.split('-');
            if (slashParts.length === 3) {
                let lDay = parseInt(slashParts[0]);
                let lMonth = parseInt(slashParts[1]) - 1;
                let lYear = parseInt(slashParts[2]);

                if (!isNaN(lDay) && !isNaN(lMonth) && !isNaN(lYear)) {
                    let jubDitJaar = new Date(vandaag.getFullYear(), lMonth, lDay);
                    if (jubDitJaar < vandaag) jubDitJaar.setFullYear(vandaag.getFullYear() + 1);

                    let diffDagenJub = Math.ceil((jubDitJaar - vandaag) / (1000 * 60 * 60 * 24));
                    let aantalJaarLid = jubDitJaar.getFullYear() - lYear;

                    if (diffDagenJub <= maxDagen && aantalJaarLid > 0) {
                        resultaten.push({
                            naam: s.naam,
                            team: s.teamId || "Vrij",
                            dagen: diffDagenJub,
                            type: 'jubileum',
                            label: `🏅 🎉 <strong>${aantalJaarLid} jaar</strong> lid!`,
                            datumText: jubDitJaar.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                        });
                    }
                }
            }
        }
    });

    resultaten.sort((a,b) => a.dagen - b.dagen);

    if (resultaten.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen verjaardagen of jubilea in de komende ${maxDagen} dagen.</p>`;
        return;
    }

    container.innerHTML = '';
    resultaten.forEach(v => {
        let dagenLabel = v.dagen === 0 ? '🎉 VANDAAG!' : (v.dagen === 1 ? 'Morgen' : `Over ${v.dagen} dg`);
        let stripKleur = v.type === 'jubileum' ? '#9b59b6' : '#f1c40f';
        let bgKleur = v.dagen === 0 ? 'background:#e74c3c; color:white; font-weight:bold;' : 'background:#f1f5f9; color:#2c3e50;';

        container.innerHTML += `
            <div class="dash-rij" style="border-left-color: ${stripKleur}; padding:8px 12px; margin-bottom:6px;">
                <div>
                    <strong style="color:var(--secondary-color);">${v.naam}</strong>
                    <span style="font-size:0.7rem; background:#e2e8f0; padding:1px 5px; border-radius:4px; font-weight:bold;">${v.team.toUpperCase()}</span>
                    <br><span style="font-size:0.8rem; color:#7f8c8d;">${v.label} op ${v.datumText}</span>
                </div>
                <div style="${bgKleur} padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; white-space:nowrap;">
                    ${dagenLabel}
                </div>
            </div>
        `;
    });
};

// --- GEAUTOMATISEERD INTERACTIEF WEEK OVERZICHT (MET KNOPPEN) ---
window.laadJaarplanningWeekDashboard = function(wijziging = 0) {
    let container = document.getElementById('dash-jaarplanning-week');
    if (!container) return;

    // Houd bij in welke week we zitten (0 = deze week, -1 = vorige, 1 = volgende)
    if (typeof window.dashWeekOffset === 'undefined') window.dashWeekOffset = 0;
    window.dashWeekOffset += wijziging;

    let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
    
    // Bereken de exacte start van de te tonen week (Maandag)
    let vandaag = new Date();
    let huidigeDag = vandaag.getDay();
    let verschilMetMaandag = vandaag.getDate() - huidigeDag + (huidigeDag === 0 ? -6 : 1);
    
    let startVanWeek = new Date(vandaag.setDate(verschilMetMaandag));
    startVanWeek.setDate(startVanWeek.getDate() + (window.dashWeekOffset * 7));

    let eindVanWeek = new Date(startVanWeek);
    eindVanWeek.setDate(startVanWeek.getDate() + 6);

    const dagenNamen = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
    const maandenKort = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

    // De titel in het midden van de knoppen
    let weekTitel = `${startVanWeek.getDate()} ${maandenKort[startVanWeek.getMonth()]} - ${eindVanWeek.getDate()} ${maandenKort[eindVanWeek.getMonth()]}`;
    if (window.dashWeekOffset === 0) weekTitel = "Deze Week (" + weekTitel + ")";

    // Teken de knoppen-balk
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; background:#f8f9fa; padding:10px; border-radius:6px; border:1px solid #cbd5e1;">
            <button onclick="window.laadJaarplanningWeekDashboard(-1)" style="background:white; border:1px solid #bdc3c7; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; color:var(--secondary-color);">&larr; Vorige</button>
            <strong style="color:var(--primary-color); font-size:1rem;">${weekTitel}</strong>
            <button onclick="window.laadJaarplanningWeekDashboard(1)" style="background:white; border:1px solid #bdc3c7; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; color:var(--secondary-color);">Volgende &rarr;</button>
        </div>
    `;

    // Loop precies de 7 dagen van Maandag t/m Zondag af
    let heeftActiviteiten = false;

    for (let i = 0; i < 7; i++) {
        let loopDatum = new Date(startVanWeek);
        loopDatum.setDate(startVanWeek.getDate() + i);
        let loopIso = loopDatum.toISOString().split('T')[0];
        let dagVanDeWeek = loopDatum.getDay();

        // 1. Speciale evenementen op deze dag
        let dagEvents = jaarplanningData.filter(item => item.isoDatum === loopIso);
        dagEvents.sort((a,b) => (a.tijd || '00:00').localeCompare(b.tijd || '00:00'));
        
        // 2. Vaste trainingen op deze dag
        let dagTrainingen = [];
        window.teamsDB.forEach(team => {
            if (Array.isArray(team.trainingen)) {
                team.trainingen.forEach(tr => {
                    if (parseInt(tr.dag) === dagVanDeWeek) {
                        dagTrainingen.push({
                            teamNaam: team.naam,
                            tijd: tr.start,
                            zaal: tr.zaal || "De Veste"
                        });
                    }
                });
            }
        });
        dagTrainingen.sort((a,b) => a.tijd.localeCompare(b.tijd));

        // Toon de dag als er events of trainingen zijn
        if (dagEvents.length > 0 || dagTrainingen.length > 0) {
            heeftActiviteiten = true;
            let echteVandaag = new Date().toISOString().split('T')[0];
            let kopKleur = loopIso === echteVandaag ? '#e74c3c' : 'var(--secondary-color)';
            let kopTekst = loopIso === echteVandaag ? `📍 VANDAAG: ${dagenNamen[dagVanDeWeek]} ${loopDatum.getDate()} ${maandenKort[loopDatum.getMonth()]}` : `${dagenNamen[dagVanDeWeek]} ${loopDatum.getDate()} ${maandenKort[loopDatum.getMonth()]}`;
            
            html += `<div style="margin-bottom:15px;"><strong style="font-size:0.95rem; color:${kopKleur}; display:block; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px;">${kopTekst}</strong>`;
            
            // Render de grote event-kaarten
            dagEvents.forEach(ev => {
                let tijdLabel = ev.tijd ? `⏰ ${ev.tijd}` : '🕒 Hele dag';
                let locLabel = ev.locatie ? ` | 📍 ${ev.locatie}` : '';
                
                html += `
                    <div style="background:white; border:1px solid #e2e8f0; border-left:4px solid #e74c3c; padding:8px 12px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:var(--secondary-color); font-size:0.9rem;">${ev.titel}</span>
                        <span style="font-size:0.75rem; color:#7f8c8d; font-weight:500;">${tijdLabel}${locLabel}</span>
                    </div>
                `;
            });

            // Render de compacte training-tags
            if (dagTrainingen.length > 0) {
                let trainingTags = dagTrainingen.map(tr => 
                    `<span style="background:#eef2f5; color:#34495e; padding:3px 8px; border-radius:4px; font-size:0.75rem; border:1px solid #cbd5e1; display:inline-block; font-weight:bold;">${tr.teamNaam} <span style="color:#7f8c8d; font-weight:normal;">(${tr.tijd})</span></span>`
                ).join(' ');

                html += `
                    <div style="background:#f8f9fa; border:1px dashed #cbd5e1; padding:8px 12px; border-radius:6px; margin-bottom:6px; display:flex; gap:10px;">
                        <span style="font-size:1rem; margin-top:2px;">🏀</span>
                        <div>
                            <div style="display:flex; flex-wrap:wrap; gap:5px;">${trainingTags}</div>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
        }
    }

    if (!heeftActiviteiten) {
        html += `
        <div style="background:#fdfdfd; padding:20px; text-align:center; border:1px dashed #cbd5e1; border-radius:6px;">
            <span style="font-size:1.5rem; display:block; margin-bottom:10px;">🏖️</span>
            <p style="color: #7f8c8d; font-style: italic; margin: 0; font-size:0.9rem;">Er staan in deze specifieke week geen clubtaken of vaste trainingen in het systeem.</p>
        </div>`;
    }

    container.innerHTML = html;
};

// --- NIEUW: INTERNE COMPETITIE & POULE-INDELINGEN QUICK-WIDGET ---
window.laadCompetitieWidget = function() {
    let container = document.getElementById('dash-competitie-inhoud');
    if (!container) return;

    let toernooiData = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
    let rondes = toernooiData.rondes || [];

    if (rondes.length === 0) {
        container.innerHTML = `
            <div style="background:#fff3e0; border-left:4px solid #e67e22; padding:12px; border-radius:6px; font-size:0.85rem; color:#d35400;">
                📢 Er staat momenteel geen actieve Interne Competitie open. Ga naar 'Interne Toernooien' om een nieuw schema op te zetten of poules in te delen!
            </div>
        `;
        return;
    }

    // Pak de eerstvolgende ronde die nog gespeeld moet worden of de meest recente
    let actueleRonde = rondes[rondes.length - 1]; 
    let wedstrijdenHtml = '';

    if (actueleRonde && Array.isArray(actueleRonde.wedstrijden)) {
        actueleRonde.wedstrijden.slice(0, 3).forEach(w => {
            wedstrijdenHtml += `
                <div style="font-size:0.8rem; background:white; padding:6px 10px; border:1px solid #eee; border-radius:4px; display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span>🏀 <strong>${w.thuis}</strong> vs. <strong>${w.uit}</strong></span>
                    <span style="color:#e67e22; font-weight:bold;">${w.tijd || '18:00'} (${w.veld || 'A'})</span>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div style="background:#fdf6f0; border-left:4px solid #e67e22; padding:12px; border-radius:6px;">
            <strong style="color:#d35400; font-size:0.9rem; display:block; margin-bottom:8px;">🔥 Laatst Gegenereerde Speelronde:</strong>
            ${wedstrijdenHtml}
            <span style="font-size:0.75rem; color:#7f8c8d; display:block; margin-top:5px;">Open de Toernooi- of Poule-pagina om de volledige stand en alle teams te bekijken.</span>
        </div>
    `;
};

// --- BESTAANDE INSTELLINGEN LOGICA ---
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