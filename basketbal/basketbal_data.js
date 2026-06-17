// --- BASKETBAL_DATA.JS: MODERN DASHBOARD ENGINE MET GEAVANCEERDE FILTERS EN POP-UPS ---

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
// 📊 DASHBOARD ENGINE INITIALISATIE
// ============================================================================
window.laadDashboardData = function() {
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    if (!actieveGebruiker) return;

    if (document.getElementById('stat-leden')) document.getElementById('stat-leden').innerText = window.spelersDB.length;
    if (document.getElementById('stat-teams')) document.getElementById('stat-teams').innerText = window.teamsDB.length;
    if (document.getElementById('stat-oefeningen')) document.getElementById('stat-oefeningen').innerText = window.oefeningenDB.length;

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

    window.laadSnelkoppelingenDashboard(actieveGebruiker);
    window.laadVerjaardagenDashboard();
    window.laadJaarplanningWeekDashboard();
    window.laadCompetitieWidget();
    window.laadPouleWidget();
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
            container.innerHTML += `<button onclick="window.location.href='${o.url}'" class="primary-btn" style="background:${o.c}; margin:0; border:none; padding:10px 15px; border-radius:4px; color:white; font-weight:bold; cursor:pointer; transition:0.2s; font-size:0.9rem;">${o.n}</button>`;
        }
    });
};

window.laadVolgendeVergaderingDashboard = function() {
    let container = document.getElementById('dash-vergadering-inhoud');
    if (!container) return;
    let bestuurDB = JSON.parse(localStorage.getItem('blackshots_bestuur')) || [];
    let vandaagIso = new Date().toISOString().split('T')[0];
    let aankomend = bestuurDB.filter(v => v.isoDatum && v.isoDatum >= vandaagIso);
    aankomend.sort((a,b) => a.isoDatum.localeCompare(b.isoDatum));

    if (aankomend.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen aankomende vergaderingen gepland.</p>'; return;
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
            <button onclick="window.location.href='bestuur.html'" style="width:100%; background:#2c3e50; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.8rem;">✏️ Open Notulen</button>
        </div>
    `;
};

// --- ECHTE ZAALHUUR DATA BEREKENING (KIJKT NAAR ZAALHUUR TABLAD) ---
window.berekenZaalhuurKostenWeek = function() {
    let kostenDiv = document.getElementById('dash-zaalhuur-kosten');
    let periodeSelect = document.getElementById('filter-zaalhuur-periode');
    let labelEl = document.getElementById('dash-zaalhuur-label');
    if (!kostenDiv) return;

    // Converteer de oude value (1, 4.33, etc.) naar harde dagen vooruitkijken
    let factor = periodeSelect ? parseFloat(periodeSelect.value) : 4.33; 
    let dagenVooruit = 30;
    let lblText = "de komende maand";
    
    if (factor === 1) { dagenVooruit = 7; lblText = "de komende week"; }
    else if (factor === 13) { dagenVooruit = 91; lblText = "het komende kwartaal"; }
    else if (factor === 26) { dagenVooruit = 182; lblText = "het komende halfjaar"; }
    else if (factor === 52) { dagenVooruit = 365; lblText = "het komende jaar"; }

    if(labelEl) labelEl.innerText = lblText;

    let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
    
    let vandaag = new Date();
    let vandaagIso = vandaag.toISOString().split('T')[0];
    
    let eindDatum = new Date();
    eindDatum.setDate(vandaag.getDate() + dagenVooruit);
    let eindIso = eindDatum.toISOString().split('T')[0];

    let totaleKosten = 0;

    // Scan door de echte zaalhuur database
    zaalhuurData.forEach(z => {
        if (z.isoDatum && z.isoDatum >= vandaagIso && z.isoDatum <= eindIso && !z.geannuleerd) {
            // Zoek naar het veld 'bedrag', 'kosten' of 'prijs' in jouw database structuur
            let bedrag = parseFloat(z.bedrag || z.kosten || z.prijs || 0);
            if (!isNaN(bedrag)) {
                totaleKosten += bedrag;
            }
        }
    });

    kostenDiv.innerText = `€ ${totaleKosten.toFixed(2).replace('.', ',')}`;
};

window.laadVerjaardagenDashboard = function() {
    let container = document.getElementById('dash-verjaardagen-inhoud');
    let filterEl = document.getElementById('filter-verjaardag-periode');
    if (!container || !filterEl) return;

    let maxDagen = parseInt(filterEl.value) || 30;
    let vandaag = new Date(); vandaag.setHours(0,0,0,0);
    let resultaten = [];

    window.spelersDB.forEach(s => {
        if (s.geboorteDatum && s.geboorteDatum !== '-') {
            let parts = s.geboorteDatum.split('-');
            if (parts.length === 3) {
                let bMonth = parseInt(parts[1]) - 1, bDay = parseInt(parts[2]), bYear = parseInt(parts[0]);
                let bdayDitJaar = new Date(vandaag.getFullYear(), bMonth, bDay);
                if (bdayDitJaar < vandaag) bdayDitJaar.setFullYear(vandaag.getFullYear() + 1);
                let diffDagen = Math.ceil((bdayDitJaar - vandaag) / (1000 * 60 * 60 * 24));
                if (diffDagen <= maxDagen) {
                    resultaten.push({ naam: s.naam, team: s.teamId || "Vrij", dagen: diffDagen, type: 'verjaardag', label: `Wordt <strong>${bdayDitJaar.getFullYear() - bYear}</strong> jaar`, datumText: bdayDitJaar.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) });
                }
            }
        }
        if (s.lidSinds && s.lidSinds !== '-') {
            let slashParts = s.lidSinds.split('-');
            if (slashParts.length === 3) {
                let lDay = parseInt(slashParts[0]), lMonth = parseInt(slashParts[1]) - 1, lYear = parseInt(slashParts[2]);
                if (!isNaN(lDay) && !isNaN(lMonth) && !isNaN(lYear)) {
                    let jubDitJaar = new Date(vandaag.getFullYear(), lMonth, lDay);
                    if (jubDitJaar < vandaag) jubDitJaar.setFullYear(vandaag.getFullYear() + 1);
                    let diffDagenJub = Math.ceil((jubDitJaar - vandaag) / (1000 * 60 * 60 * 24));
                    let aantalJaarLid = jubDitJaar.getFullYear() - lYear;
                    if (diffDagenJub <= maxDagen && aantalJaarLid > 0) {
                        resultaten.push({ naam: s.naam, team: s.teamId || "Vrij", dagen: diffDagenJub, type: 'jubileum', label: `🏅 🎉 <strong>${aantalJaarLid} jaar</strong> lid!`, datumText: jubDitJaar.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) });
                    }
                }
            }
        }
    });

    resultaten.sort((a,b) => a.dagen - b.dagen);
    if (resultaten.length === 0) { container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; margin:0; padding:10px; text-align:center;">Geen verjaardagen of jubilea in deze periode.</p>`; return; }

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
                <div style="${bgKleur} padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold; white-space:nowrap;">${dagenLabel}</div>
            </div>`;
    });
};

// --- INTERACTIEVE WEEK NAVIGATIE MOTOR ---
window.dashboardWeekOffset = 0;
window.veranderDashboardWeek = function(wijziging) {
    if (wijziging === 0) window.dashboardWeekOffset = 0; else window.dashboardWeekOffset += wijziging;
    window.laadJaarplanningWeekDashboard();
};

window.toonActiviteitDetails = function(titel, tijd, locatie, omschrijving, url, isGeannuleerd, isTraining) {
    document.getElementById('dash-act-titel').innerText = isGeannuleerd ? '❌ ' + titel + ' (Geannuleerd)' : titel;
    document.getElementById('dash-act-tijd').innerText = '⏰ Tijdstip: ' + tijd;
    document.getElementById('dash-act-locatie').innerText = '📍 Locatie: ' + locatie;
    
    let omsVeld = document.getElementById('dash-act-omschrijving');
    if (omschrijving && omschrijving.trim() !== '' && omschrijving !== 'undefined') {
        omsVeld.innerText = omschrijving;
        omsVeld.style.display = 'block';
    } else {
        omsVeld.style.display = 'none';
    }

    let linkKnop = document.getElementById('dash-act-link');
    linkKnop.onclick = () => window.location.href = url;
    if(isTraining) {
        linkKnop.innerText = "Naar Trainingsagenda 🔗"; linkKnop.style.background = "#3498db";
    } else {
        linkKnop.innerText = "Naar Jaarplanning 🔗"; linkKnop.style.background = "var(--primary-color)";
    }
    
    document.getElementById('dash-activiteit-modal').style.display = 'flex';
};

// --- 5. DE LIVE WEEK-VIEW (7 KOLOMMEN) MET ECHTE AGENDA ANNULERINGS LOGICA ---
window.laadJaarplanningWeekDashboard = function() {
    const jaarplanningWeekContainer = document.getElementById('dash-jaarplanning-week');
    const weekLabel = document.getElementById('dash-week-label');
    if (jaarplanningWeekContainer) {
        let jaarplanningData = JSON.parse(localStorage.getItem('blackshots_jaarplanning_data')) || [];
        let kalenderCategorieen = JSON.parse(localStorage.getItem('blackshots_jaarplanning_categorieen')) || [];
        let nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
        let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
        window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {}; // Haal actuele trainingen op
        
        if (weekLabel) {
            if (window.dashboardWeekOffset === 0) weekLabel.innerText = "(Deze Week)";
            else if (window.dashboardWeekOffset === 1) weekLabel.innerText = "(Volgende Week)";
            else if (window.dashboardWeekOffset === -1) weekLabel.innerText = "(Vorige Week)";
            else weekLabel.innerText = `(${window.dashboardWeekOffset > 0 ? '+' : ''}${window.dashboardWeekOffset} Weken)`;
        }

        let echteVandaag = new Date();
        let echteVandaagIso = `${echteVandaag.getFullYear()}-${String(echteVandaag.getMonth()+1).padStart(2,'0')}-${String(echteVandaag.getDate()).padStart(2,'0')}`;
        let kalenderDatum = new Date(); kalenderDatum.setDate(kalenderDatum.getDate() + (window.dashboardWeekOffset * 7));
        let huidigeDag = kalenderDatum.getDay(); let afstandTotMaandag = huidigeDag === 0 ? -6 : 1 - huidigeDag;
        let maandag = new Date(kalenderDatum); maandag.setDate(kalenderDatum.getDate() + afstandTotMaandag);

        let dagenLijst = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
        let weekHtml = `<div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; min-height:260px;">`;

        for(let i=0; i<7; i++) {
            let loopDag = new Date(maandag); loopDag.setDate(maandag.getDate() + i);
            let isoDag = `${loopDag.getFullYear()}-${String(loopDag.getMonth()+1).padStart(2,'0')}-${String(loopDag.getDate()).padStart(2,'0')}`;
            let isVandaag = (isoDag === echteVandaagIso);
            let dagVanDeWeekBS = i + 1; 

            // Handmatige activiteiten ophalen
            let dagItems = jaarplanningData.filter(item => {
                if(!item.isoDatum) return false;
                let start = item.isoDatum; let eind = item.eindDatum || item.isoDatum;
                return (start <= isoDag && eind >= isoDag);
            });

            // VASTE TRAININGEN VERWERKEN INCLUSIEF AGENDA CHECK
            if (Array.isArray(window.teamsDB)) {
                window.teamsDB.forEach(team => {
                    // Check de echte trainingsagenda database voor annuleringen
                    let trainingsSleutel = `${isoDag}_${team.id}`;
                    let dagAgenda = window.geplandeTrainingenDB[trainingsSleutel];
                    let isGeannuleerdViaAgenda = false;
                    let annuleringsReden = "";

                    // Als het eerste item in de agenda 'geannuleerd' is
                    if (dagAgenda && Array.isArray(dagAgenda) && dagAgenda.length > 0) {
                        if (dagAgenda[0].type === "geannuleerd") {
                            isGeannuleerdViaAgenda = true;
                            annuleringsReden = dagAgenda[0].reden || "Geannuleerd via trainingsagenda";
                        }
                    }

                    if (Array.isArray(team.trainingen)) {
                        team.trainingen.forEach(tr => {
                            if (parseInt(tr.dag) === dagVanDeWeekBS) {
                                dagItems.push({
                                    titel: `🏀 Training ${team.naam}`,
                                    tijd: tr.start,
                                    locatie: tr.veld ? `Veld ${tr.veld}` : (tr.zaal || "De Veste"),
                                    isVasteTraining: true,
                                    omschrijving: isGeannuleerdViaAgenda ? `❌ Training is GEANNULEERD.\nReden: ${annuleringsReden}` : `Vaste trainingstijd voor ${team.naam}.\nZaal: ${tr.zaal || 'Onbekend'}\nStart: ${tr.start}`,
                                    forceerGeannuleerd: isGeannuleerdViaAgenda
                                });
                            }
                        });
                    }
                });
            }

            let wedstrijdenOpDag = nbbWedstrijden.filter(w => w.Datum && w.Datum.startsWith(isoDag));
            if (wedstrijdenOpDag.length > 0) {
                let thuisTeams = [], uitTeams = [];
                wedstrijdenOpDag.forEach(w => {
                    if (w.Thuisteam && w.Thuisteam.toLowerCase().includes('black shots')) thuisTeams.push(w.Thuisteam.replace(/Black Shots/ig, '').trim()||"?");
                    else if (w.Uitteam && w.Uitteam.toLowerCase().includes('black shots')) uitTeams.push(w.Uitteam.replace(/Black Shots/ig, '').trim()||"?");
                });
                if (thuisTeams.length > 0) dagItems.push({ titel: `🏠 Thuis: ${[...new Set(thuisTeams)].join(', ')}`, type: 'thuis' });
                if (uitTeams.length > 0) dagItems.push({ titel: `🚀 Uit: ${[...new Set(uitTeams)].join(', ')}`, type: 'uit' });
            }

            dagItems.sort((a,b) => (a.tijd || '00:00').localeCompare(b.tijd || '00:00'));

            let isVakantieDag = dagItems.some(item => { let typeId = (item.type || 'memo').toLowerCase(); let cat = kalenderCategorieen.find(c => c.id === typeId); return cat && cat.isVakantie; });
            let cardBg = isVakantieDag ? 'rgba(231, 76, 60, 0.04)' : 'var(--card-bg)';
            let borderCol = isVandaag ? 'var(--primary-color)' : (isVakantieDag ? 'rgba(231, 76, 60, 0.3)' : 'var(--border-color)');
            let headerBg = isVandaag ? 'var(--primary-color)' : (isVakantieDag ? '#e74c3c' : 'var(--secondary-color)');

            let itemsHtml = '';
            if(dagItems.length > 0) {
                dagItems.forEach(item => {
                    let isGeannuleerd = item.forceerGeannuleerd === true || (String(item.geannuleerd) === 'true') || (item.titel && (item.titel.toLowerCase().includes('geannuleerd') || item.titel.toLowerCase().includes('vervalt')));
                    let kleur = '#3498db', tekstKleur = '#ffffff', borderLink = 'transparent';
                    
                    let linkUrl = item.isVasteTraining ? 'agenda.html' : 'jaarplanning.html';
                    if (item.type === 'thuis' || item.type === 'uit') linkUrl = 'pouleindeling.html';

                    if (isGeannuleerd) {
                        kleur = '#fdedec'; tekstKleur = '#c0392b'; borderLink = '#e74c3c';
                    } else if (item.isVasteTraining) {
                        kleur = '#eef2f5'; tekstKleur = '#34495e'; borderLink = '#bdc3c7';
                    } else {
                        let typeId = (item.type || 'memo').toLowerCase(); let cat = kalenderCategorieen.find(c => c.id === typeId);
                        if (cat) { kleur = cat.kleur; if (cat.tekstKleur) tekstKleur = cat.tekstKleur; }
                    }

                    let extraMeta = [];
                    if(item.tijd) extraMeta.push(`⏰ ${item.tijd}`); if(item.locatie) extraMeta.push(`📍 ${item.locatie}`);
                    let metaString = extraMeta.length > 0 ? `<div style="font-size:0.7rem; opacity:0.85; margin-top:3px; font-weight:normal;">${extraMeta.join(' | ')}</div>` : '';

                    let safeTitel = (item.titel || '').replace(/'/g, "\\'");
                    let safeTijd = (item.tijd || 'Hele dag').replace(/'/g, "\\'");
                    let safeLoc = (item.locatie || 'Onbekend').replace(/'/g, "\\'");
                    let safeOmschrijving = (item.omschrijving || '').replace(/'/g, "\\'").replace(/\n/g, '\\n');

                    let klikActie = `window.toonActiviteitDetails('${safeTitel}', '${safeTijd}', '${safeLoc}', '${safeOmschrijving}', '${linkUrl}', ${isGeannuleerd}, ${item.isVasteTraining ? 'true' : 'false'})`;

                    itemsHtml += `
                        <div onclick="${klikActie}" 
                             style="background:${kleur}; color:${tekstKleur}; padding:6px 8px; border-radius:4px; margin-bottom:5px; font-size:0.78rem; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); border-left: 3px solid ${borderLink}; transition:0.2s;"
                             onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" title="${item.titel}">
                            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:bold; line-height:1.2;">${isGeannuleerd ? '❌ ' : ''}${item.titel}</div>
                            ${metaString}
                        </div>
                    `;
                });
            } else { itemsHtml = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:20px 0; font-style:italic;">Geen clubtaken</div>`; }

            let zalenOpDag = zaalhuurData.filter(z => z.isoDatum === isoDag && !z.geannuleerd);
            let zaalBalkHtml = zalenOpDag.length > 0 ? `<div class="kalender-zaal-balk" style="background: var(--hover-bg); color: var(--text-muted); font-size: 0.65rem; text-align: center; padding: 4px; font-weight: bold; border-top: 1px solid var(--border-color); text-transform: uppercase; margin-top: auto;">${[...new Set(zalenOpDag.map(z => z.zaal.replace('Sporthal ', '').replace('Sportzaal ', '').trim()))].join(' & ')}</div>` : '';

            weekHtml += `
                <div style="flex: 1; min-width: 145px; background: ${cardBg}; border: 2px solid ${borderCol}; border-radius: 6px; display: flex; flex-direction: column; overflow: hidden; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                    <div style="background: ${headerBg}; color: white; text-align: center; padding: 6px 0; font-weight: bold; border-bottom: 1px solid ${borderCol};">${dagenLijst[i]} <span style="font-size:1.2rem; display:block; color: #ffffff; font-weight:800;">${loopDag.getDate()}</span></div>
                    <div style="padding: 8px; flex: 1; display:flex; flex-direction:column; background: transparent; overflow-y:auto; max-height:220px;">${itemsHtml}${zaalBalkHtml}</div>
                </div>`;
        }
        weekHtml += `</div>`; jaarplanningWeekContainer.innerHTML = weekHtml;
    }
};

// --- POULE-INDELING SPECIFIEK WIDGET ---
window.laadPouleWidget = function() {
    let container = document.getElementById('dash-poule-inhoud');
    if(!container) return;
    let toernooiData = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
    let poulesKeys = Object.keys(toernooiData).filter(k => toernooiData[k] && typeof toernooiData[k] === 'object');
    
    if(poulesKeys.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen poules of toernooien in het systeem gevonden.</p>`; return;
    }

    let html = '';
    poulesKeys.slice(0,3).forEach(k => {
        let t = toernooiData[k]; let aantalTeams = (t.teams && Array.isArray(t.teams)) ? t.teams.length : 0;
        html += `<div style="background:#fdfdfd; border:1px solid #eee; padding:10px 12px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#2c3e50;">${t.naam || k}</strong> <span style="background:#f39c12; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">${aantalTeams} Teams</span>
        </div>`;
    });
    container.innerHTML = html;
};

// --- MULTI-TOERNOOI SCANNER MET DROPDOWN ---
window.laadCompetitieWidget = function() {
    let container = document.getElementById('dash-competitie-inhoud');
    let select = document.getElementById('filter-toernooi-select');
    if (!container) return;

    let toernooiData = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
    let poulesKeys = Object.keys(toernooiData).filter(k => toernooiData[k] && typeof toernooiData[k] === 'object');

    if (poulesKeys.length === 0) {
        container.innerHTML = `<div style="background:#fff3e0; border-left:4px solid #e67e22; padding:12px; border-radius:6px; font-size:0.85rem; color:#d35400;">📢 Geen wedstrijden gevonden. Open 'Interne Toernooien' om speelrondes te genereren.</div>`;
        return;
    }

    if (select && select.options.length === 0) {
        poulesKeys.forEach(k => { select.innerHTML += `<option value="${k}">${toernooiData[k].naam || k}</option>`; });
    }

    let actieveKey = select ? select.value : poulesKeys[0];
    let geselecteerdToernooi = toernooiData[actieveKey];
    let alleWedstrijden = [];

    if (geselecteerdToernooi) {
        let teamMap = {}; if (Array.isArray(geselecteerdToernooi.teams)) { geselecteerdToernooi.teams.forEach(tm => teamMap[tm.id] = tm.naam); }
        let wLijst = [];
        if (geselecteerdToernooi.wedstrijden) wLijst.push(...geselecteerdToernooi.wedstrijden);
        if (geselecteerdToernooi.rondes) geselecteerdToernooi.rondes.forEach(r => { if(r.wedstrijden) wLijst.push(...r.wedstrijden); });

        wLijst.forEach(w => {
            let thuisNaam = teamMap[w.thuis] || w.thuis; let uitNaam = teamMap[w.uit] || w.uit;
            if (thuisNaam === 'nr1') thuisNaam = '1e Plaats'; if (thuisNaam === 'nr2') thuisNaam = '2e Plaats'; if (thuisNaam === 'nr3') thuisNaam = '3e Plaats'; if (thuisNaam === 'nr4') thuisNaam = '4e Plaats';
            if (uitNaam === 'nr1') uitNaam = '1e Plaats'; if (uitNaam === 'nr2') uitNaam = '2e Plaats'; if (uitNaam === 'nr3') uitNaam = '3e Plaats'; if (uitNaam === 'nr4') uitNaam = '4e Plaats';
            alleWedstrijden.push({ ...w, thuisNaam, uitNaam });
        });
    }

    let aankomend = alleWedstrijden.filter(w => w.scoreThuis === null || w.scoreThuis === undefined || w.scoreThuis === "" || w.scoreThuis === 0);
    if (aankomend.length === 0) aankomend = alleWedstrijden.reverse();

    let wedstrijdenHtml = '';
    aankomend.slice(0, 4).forEach(w => {
        wedstrijdenHtml += `
            <div style="font-size:0.85rem; background:white; padding:6px 12px; border:1px solid #e2e8f0; border-radius:4px; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">🏀 <strong>${w.thuisNaam}</strong> vs. <strong>${w.uitNaam}</strong> <span style="color:#7f8c8d; font-size:0.75rem; margin-left:5px;">${w.datum||''}</span></span>
                <span style="color:#e67e22; font-weight:bold; background:#fff3e0; padding:2px 6px; border-radius:4px; font-size:0.75rem; white-space:nowrap;">${w.tijd || '18:00'} (${w.veld || 'A'})</span>
            </div>
        `;
    });

    container.innerHTML = `<div style="background:#fdf6f0; border-left:4px solid #e67e22; padding:12px; border-radius:6px;"><strong style="color:#d35400; font-size:0.9rem; display:block; margin-bottom:8px;">🔥 Aankomende / Recente Wedstrijden:</strong><div style="display:flex; flex-direction:column; gap:2px;">${wedstrijdenHtml || '<i>Geen data</i>'}</div></div>`;
};

// --- CATEGORIE LOGICA ---
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