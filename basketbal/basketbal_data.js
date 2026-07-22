// --- BASKETBAL_DATA.JS: DASHBOARD ENGINE MET OFFICILE CLUBTEAM (NBB) VIEWER ---

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
    window.laadTeamRosterWidget(); // NIEUW: NBB Team Roster
    window.laadInternePoulesWidget(); // <-- DEZE REGEL TOEVOEGEN
    window.laadNBBPoulesWidget()
    window.laadVolgendeThuisdagWidget();
    window.laadAankomendeWedstrijdenWidget();
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

    let factor = periodeSelect ? parseFloat(periodeSelect.value) : 4.33; 
    let dagenVooruit = 30;
    let lblText = "de komende maand";
    
    if (factor === 1) { dagenVooruit = 7; lblText = "de komende week"; }
    else if (factor === 13) { dagenVooruit = 91; lblText = "het komende kwartaal"; }
    else if (factor === 26) { dagenVooruit = 182; lblText = "het komende halfjaar"; }
    else if (factor === 52) { dagenVooruit = 365; lblText = "het komende jaar"; }

    if(labelEl) labelEl.innerText = lblText;

    let zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];
    let vandaag = new Date(); let vandaagIso = vandaag.toISOString().split('T')[0];
    let eindDatum = new Date(); eindDatum.setDate(vandaag.getDate() + dagenVooruit);
    let eindIso = eindDatum.toISOString().split('T')[0];
    let totaleKosten = 0;

    zaalhuurData.forEach(z => {
        if (z.isoDatum && z.isoDatum >= vandaagIso && z.isoDatum <= eindIso && !z.geannuleerd) {
            let bedrag = parseFloat(z.bedrag || z.kosten || z.prijs || 0);
            if (!isNaN(bedrag)) totaleKosten += bedrag;
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
        window.geplandeTrainingenDB = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {}; 
        
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

            let dagItems = jaarplanningData.filter(item => {
                if(!item.isoDatum) return false;
                let start = item.isoDatum; let eind = item.eindDatum || item.isoDatum;
                return (start <= isoDag && eind >= isoDag);
            });

            if (Array.isArray(window.teamsDB)) {
                window.teamsDB.forEach(team => {
                    let trainingsSleutel = `${isoDag}_${team.id}`;
                    let dagAgenda = window.geplandeTrainingenDB[trainingsSleutel];
                    let isGeannuleerdViaAgenda = false;
                    let annuleringsReden = "";

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
                let ontdubbeldeItems = dagItems.filter(item => {
                    if(!item.isVasteTraining && (String(item.geannuleerd) === 'true' || (item.titel||'').toLowerCase().includes('geannuleerd'))) {
                        return false; 
                    }
                    return true;
                });

                ontdubbeldeItems.forEach(item => {
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

// --- NIEUW: NBB CLUBTEAM ROSTER VIEWER ---
window.dashTeamSelect = null;

window.laadTeamRosterWidget = function() {
    let container = document.getElementById('dash-team-roster-inhoud');
    if(!container) return;

    let teams = window.teamsDB || [];
    if(teams.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen actieve teams gevonden in de database.</p>`;
        return;
    }

    if (!window.dashTeamSelect || !teams.find(t => t.id === window.dashTeamSelect)) {
        window.dashTeamSelect = teams[0].id;
    }

    let teamOptions = teams.map(t => `<option value="${t.id}" ${t.id === window.dashTeamSelect ? 'selected' : ''}>${t.naam}</option>`).join('');

    let html = `
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <select onchange="window.dashTeamSelect = this.value; window.laadTeamRosterWidget()" class="select-schoon" style="flex:1; background:#f8f9fa;">${teamOptions}</select>
        </div>
    `;

    let selectedTeam = teams.find(t => t.id === window.dashTeamSelect);
    let roster = window.spelersDB.filter(s => s.teamId === window.dashTeamSelect);

    // Zoek de eerstvolgende Bondswedstrijd voor dit team!
    let nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
    let vandaagIso = new Date().toISOString().split('T')[0];
    
    let teamMatches = nbbWedstrijden.filter(w => {
        if (!w.Datum || w.Datum < vandaagIso) return false;
        let thuis = (w.Thuisteam || '').toLowerCase();
        let uit = (w.Uitteam || '').toLowerCase();
        
        let checkNaam = selectedTeam.naam.toLowerCase().replace(/[^a-z0-9]/g, ''); 
        let thuisSchoon = thuis.replace(/[^a-z0-9]/g, '');
        let uitSchoon = uit.replace(/[^a-z0-9]/g, '');

        return (thuis.includes('black shots') && thuisSchoon.includes(checkNaam)) || 
               (uit.includes('black shots') && uitSchoon.includes(checkNaam));
    });
    
    teamMatches.sort((a,b) => a.Datum.localeCompare(b.Datum));
    let nextMatchHtml = '';
    
    if (teamMatches.length > 0) {
        let nxt = teamMatches[0];
        let isThuis = (nxt.Thuisteam || '').toLowerCase().includes(selectedTeam.naam.toLowerCase().replace('black shots', '').trim());
        nextMatchHtml = `
            <div style="margin-top:10px; padding:8px; background:#ebf5fb; border-radius:4px; font-size:0.8rem; color:#2980b9; display:flex; justify-content:space-between; align-items:center; border: 1px solid #d6eaf8;">
                <span>📅 <strong>NBB Wedstrijd:</strong> ${isThuis ? '🏠 Thuis' : '🚀 Uit'} vs ${isThuis ? nxt.Uitteam : nxt.Thuisteam}</span>
                <span style="font-weight:bold;">${nxt.Datum.substring(5)}</span>
            </div>
        `;
    }

    let spelersHtml = roster.map(sp => `<span style="background:#eef2f5; color:#34495e; padding:4px 8px; border-radius:4px; font-size:0.8rem; border:1px solid #cbd5e1; display:inline-block; font-weight:bold;">${sp.naam}</span>`).join(' ');
    
    html += `
        <div style="background:#fdfdfd; border:1px solid #eee; padding:12px; border-radius:6px; border-left:4px solid ${selectedTeam.kleur || '#3498db'};">
            <strong style="display:flex; justify-content:space-between; color:#2c3e50; margin-bottom:8px; font-size:0.9rem;">
                <span>👥 Selectie ${selectedTeam.naam}</span>
                <span style="color:#7f8c8d; font-size:0.8rem;">${roster.length} spelers</span>
            </strong>
            <div style="display:flex; flex-wrap:wrap; gap:5px;">${spelersHtml || '<i>Nog geen spelers aan dit team gekoppeld in de database.</i>'}</div>
            ${nextMatchHtml}
        </div>
    `;
    container.innerHTML = html;
};

// --- DYNAMISCHE COMPETITIE STANDENLIJST ---
window.laadCompetitieWidget = function() {
    let container = document.getElementById('dash-competitie-inhoud');
    let select = document.getElementById('filter-toernooi-select');
    if (!container) return;

    let toernooiData = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
    let poulesKeys = Object.keys(toernooiData).filter(k => toernooiData[k] && typeof toernooiData[k] === 'object');

    if (poulesKeys.length === 0) {
        container.innerHTML = `<div style="background:#fff3e0; border-left:4px solid #e67e22; padding:12px; border-radius:6px; font-size:0.85rem; color:#d35400;">📢 Geen actieve toernooien gevonden.</div>`;
        return;
    }

    if (select && select.options.length === 0) {
        poulesKeys.forEach(k => { select.innerHTML += `<option value="${k}">${toernooiData[k].naam || k}</option>`; });
    }

    let actieveKey = select ? select.value : poulesKeys[0];
    let t = toernooiData[actieveKey];
    if (!t) return;

    let standen = {};
    if (Array.isArray(t.teams)) {
        t.teams.forEach(tm => { standen[tm.id] = { id: tm.id, naam: tm.naam, gespeeld: 0, winst: 0, verlies: 0, gelijk: 0, punten: 0, ds: 0 }; });
    }

    let alleWedstrijden = [];
    if (t.wedstrijden) alleWedstrijden.push(...t.wedstrijden);
    if (t.rondes) t.rondes.forEach(r => { if(r.wedstrijden) alleWedstrijden.push(...r.wedstrijden); });

    alleWedstrijden.forEach(w => {
        if (w.scoreThuis !== null && w.scoreUit !== null && w.scoreThuis !== "" && w.scoreUit !== "") {
            let sT = parseInt(w.scoreThuis); let sU = parseInt(w.scoreUit);
            let tId = w.thuis; let uId = w.uit;

            if (tId && tId.startsWith('nr')) return;
            if (!standen[tId]) standen[tId] = { id: tId, naam: tId, gespeeld: 0, winst: 0, verlies: 0, gelijk: 0, punten: 0, ds: 0 };
            if (!standen[uId]) standen[uId] = { id: uId, naam: uId, gespeeld: 0, winst: 0, verlies: 0, gelijk: 0, punten: 0, ds: 0 };

            standen[tId].gespeeld++; standen[uId].gespeeld++;
            standen[tId].ds += (sT - sU); standen[uId].ds += (sU - sT);

            if (sT > sU) { standen[tId].winst++; standen[tId].punten += 2; standen[uId].verlies++; }
            else if (sU > sT) { standen[uId].winst++; standen[uId].punten += 2; standen[tId].verlies++; }
            else { standen[tId].gelijk++; standen[uId].gelijk++; standen[tId].punten += 1; standen[uId].punten += 1; }
        }
    });

    let standArray = Object.values(standen).filter(st => !st.id.startsWith('nr'));
    standArray.sort((a,b) => {
        if (b.punten !== a.punten) return b.punten - a.punten;
        if (b.ds !== a.ds) return b.ds - a.ds;
        return b.winst - a.winst;
    });

    let standHtml = `
        <table style="width:100%; font-size:0.85rem; border-collapse:collapse; text-align:left;">
            <tr style="border-bottom:2px solid #e2e8f0; color:#7f8c8d;">
                <th style="padding:6px 4px; width:20px;">#</th><th style="padding:6px 4px;">Team</th>
                <th style="padding:6px 4px; text-align:center;" title="Gespeeld">G</th>
                <th style="padding:6px 4px; text-align:center; color:var(--primary-color);" title="Punten">P</th>
                <th style="padding:6px 4px; text-align:center;" title="Doelsaldo">DS</th>
            </tr>
    `;
    
    if (standArray.length === 0) {
        standHtml += `<tr><td colspan="5" style="text-align:center; padding:10px; color:#7f8c8d; font-style:italic;">Geen uitslagen bekend.</td></tr>`;
    } else {
        standArray.forEach((st, idx) => {
            let badge = ''; if(idx === 0) badge = '🥇'; else if(idx===1) badge = '🥈'; else if(idx===2) badge = '🥉';
            standHtml += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px 4px; font-weight:bold; color:var(--secondary-color);">${idx+1}</td>
                    <td style="padding:8px 4px; font-weight:bold; color:#34495e;">${st.naam} <span style="font-size:1rem;">${badge}</span></td>
                    <td style="padding:8px 4px; text-align:center; color:#7f8c8d;">${st.gespeeld}</td>
                    <td style="padding:8px 4px; text-align:center; font-weight:bold; color:#e67e22; font-size:1rem;">${st.punten}</td>
                    <td style="padding:8px 4px; text-align:center; color:#7f8c8d;">${st.ds > 0 ? '+'+st.ds : st.ds}</td>
                </tr>
            `;
        });
    }
    standHtml += `</table>`;

    container.innerHTML = `
        <div style="background:#fdf6f0; border-left:4px solid #e67e22; padding:12px; border-radius:6px; overflow-x:auto;">
            <strong style="color:#d35400; font-size:0.9rem; display:block; margin-bottom:8px;">📊 Actuele Stand:</strong>
            ${standHtml}
        </div>
    `;
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

// --- NIEUW: INTERNE POULES (TEAMS & SPELERS) WIDGET ---
window.dashInternePouleSelect = null;

window.laadInternePoulesWidget = function() {
    let container = document.getElementById('dash-interne-poules-inhoud');
    if(!container) return;
    
    let toernooiData = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
    let poulesKeys = Object.keys(toernooiData).filter(k => toernooiData[k] && typeof toernooiData[k] === 'object');

    if(poulesKeys.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; margin:0;">Geen actieve interne toernooien of poules gevonden.</p>`; 
        return;
    }

    // Zorg dat er een toernooi is geselecteerd
    if (!window.dashInternePouleSelect || !poulesKeys.includes(window.dashInternePouleSelect)) {
        window.dashInternePouleSelect = poulesKeys[0];
    }

    // Dropdown om te wisselen tussen toernooien (bijv. Oudere / Jongere jeugd)
    let toernooiOpties = poulesKeys.map(k => `<option value="${k}" ${k === window.dashInternePouleSelect ? 'selected' : ''}>${toernooiData[k].naam || k}</option>`).join('');
    
    let html = `
        <select onchange="window.dashInternePouleSelect = this.value; window.laadInternePoulesWidget()" class="select-schoon" style="width:100%; margin-bottom:15px; background:#f8f9fa;">
            ${toernooiOpties}
        </select>
        <div style="display:flex; flex-direction:column; gap:10px; max-height: 250px; overflow-y: auto; padding-right: 5px;">
    `;

    let t = toernooiData[window.dashInternePouleSelect];
    let teams = t.teams || [];

    if (teams.length === 0) {
        html += `<p style="font-size:0.85rem; color:#7f8c8d; font-style:italic;">Geen teams ingedeeld in dit toernooi.</p>`;
    } else {
        teams.forEach(tm => {
            // Teken de spelers als tags
            let spelersHtml = (tm.spelers || []).map(sp => `<span style="background:#eef2f5; color:#34495e; padding:3px 6px; border-radius:4px; font-size:0.75rem; border:1px solid #cbd5e1; display:inline-block; font-weight:bold;">${sp}</span>`).join(' ');
            
            html += `
                <div style="background:#fdfdfd; border:1px solid #eee; padding:10px; border-radius:6px; border-left:4px solid ${tm.kleur || '#e67e22'};">
                    <strong style="color:#2c3e50; font-size:0.9rem; display:flex; justify-content:space-between; margin-bottom:5px;">
                        <span>${tm.naam}</span>
                        <span style="color:#7f8c8d; font-size:0.75rem; font-weight:normal; background:#f4f6f8; padding:2px 6px; border-radius:10px;">${(tm.spelers || []).length} spelers</span>
                    </strong>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">${spelersHtml || '<i style="color:#bdc3c7; font-size:0.8rem;">Geen spelers</i>'}</div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    container.innerHTML = html;
};

// --- NIEUW: NBB POULES & TEGENSTANDERS WIDGET ---
window.dashNBBPouleSelect = null;

window.laadNBBPoulesWidget = function() {
    let container = document.getElementById('dash-nbb-poules-inhoud');
    if(!container) return;
    
    let bsTeams = JSON.parse(localStorage.getItem('blackshots_poule_teams')) || [];

    if(bsTeams.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; margin:0; background:#fdfdfd; padding:10px; border:1px solid #eee; border-radius:4px;">Geen NBB poules ingeladen. Ga naar 'Poule-indelingen' om een bestand te uploaden.</p>`; 
        return;
    }

    if (!window.dashNBBPouleSelect || !bsTeams.find(t => t.teamNaam === window.dashNBBPouleSelect)) {
        window.dashNBBPouleSelect = bsTeams[0].teamNaam;
    }

    let opties = bsTeams.map(t => `<option value="${t.teamNaam}" ${t.teamNaam === window.dashNBBPouleSelect ? 'selected' : ''}>${t.teamNaam}</option>`).join('');
    
    let html = `
        <select onchange="window.dashNBBPouleSelect = this.value; window.laadNBBPoulesWidget()" class="select-schoon" style="width:100%; margin-bottom:15px; background:#f8f9fa;">
            ${opties}
        </select>
    `;

    let geselecteerdTeam = bsTeams.find(t => t.teamNaam === window.dashNBBPouleSelect);
    
    if (geselecteerdTeam) {
        let tegenstandersHtml = '';
        if(geselecteerdTeam.tegenstanders && geselecteerdTeam.tegenstanders.length > 0) {
            geselecteerdTeam.tegenstanders.forEach(teg => {
                let vereniging = teg['Vereniging'] || teg['vereniging'] || '';
                let team = teg['Team'] || teg['team'] || '';
                let isOns = vereniging.toLowerCase().includes('black shots');
                let isLeeg = (!vereniging || vereniging.trim() === '');
                
                if (isLeeg) {
                    tegenstandersHtml += `<div style="padding:6px 0; border-bottom:1px solid #eee; color:#e74c3c; font-style:italic; font-size:0.85rem;">-- Vrij (Geen tegenstander) --</div>`;
                } else {
                    let rowStyle = isOns ? "font-weight:bold; color:var(--primary-color); background:#ebf5fb; padding:6px; border-radius:4px;" : "color:#34495e; padding:6px 0;";
                    tegenstandersHtml += `
                        <div style="border-bottom:1px solid #eee; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; ${rowStyle}">
                            <span style="display:flex; align-items:center; gap:5px;">${isOns ? '🏀' : '🛡️'} ${vereniging}</span>
                            <span>${team}</span>
                        </div>
                    `;
                }
            });
        } else {
            tegenstandersHtml = '<i style="color:#bdc3c7; font-size:0.8rem;">Geen tegenstanders gevonden</i>';
        }

        html += `
            <div style="background:#fdfdfd; border:1px solid #eee; padding:12px; border-radius:6px; border-left:4px solid #9b59b6;">
                <div style="font-size:0.85rem; color:#7f8c8d; margin-bottom:10px;">
                    <strong>Poule:</strong> ${geselecteerdTeam.pouleNaam} <br>
                    <strong>Onze Code:</strong> <span style="background:#e67e22; color:white; padding:2px 6px; border-radius:4px;">${geselecteerdTeam.onzeCode}</span>
                </div>
                <h4 style="margin:0 0 8px 0; color:#2c3e50; font-size:0.95rem; border-bottom:2px solid #f1f5f9; padding-bottom:4px;">Tegenstanders:</h4>
                <div style="max-height: 180px; overflow-y: auto; padding-right:5px;">
                    ${tegenstandersHtml}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
};

// ============================================================================
// NIEUWE WIDGETS VOOR DASHBOARD
// ============================================================================

// --- Hulpfuncties voor de nieuwe widgets ---
window.krijgVolgendeDatums = function(aantalDagen) {
    let nu = new Date();
    nu.setHours(0,0,0,0);
    let eind = new Date(nu);
    eind.setDate(eind.getDate() + aantalDagen);
    return { start: nu.toISOString().split('T')[0], eind: eind.toISOString().split('T')[0] };
}

window.haalWedstrijdenOp = function() {
    return [...(JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || []), 
            ...(JSON.parse(localStorage.getItem('blackshots_custom_wedstrijden')) || [])];
}

// 1. WIDGET: Volgende Thuiswedstrijd Dag (Met Taken)
window.laadVolgendeThuisdagWidget = function() {
    let container = document.getElementById('dash-thuis-taken-inhoud');
    if(!container) return;

    let alleWedstrijden = window.haalWedstrijdenOp();
    let planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {};
    let persoonsTakenDB = JSON.parse(localStorage.getItem('blackshots_persoons_taken')) || {};
    
    let { start } = window.krijgVolgendeDatums(0); // Zoek vanaf vandaag

    // 1. Filter alleen geplande thuiswedstrijden in de toekomst
    let actieveThuisWedstrijden = alleWedstrijden.filter(w => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let isActief = planStatusDB[window.genereerUniekId(w)];
        let isToekomst = window.normaalDatum(w.Datum) >= start;
        return isThuis && isActief && isToekomst;
    });

    if (actieveThuisWedstrijden.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; padding:10px; background:#fdfdfd; border:1px solid #eee; border-radius:4px;">Geen geplande thuiswedstrijden gevonden.</p>`;
        return;
    }

    // 2. Sorteer op datum en vind de EERSTVOLGENDE speeldag
    actieveThuisWedstrijden.sort((a, b) => window.normaalDatum(a.Datum).localeCompare(window.normaalDatum(b.Datum)));
    let volgendeSpeelDatum = window.normaalDatum(actieveThuisWedstrijden[0].Datum);

    // 3. Pak álle wedstrijden op die specifieke dag
    let wedstrijdenOpDag = actieveThuisWedstrijden.filter(w => window.normaalDatum(w.Datum) === volgendeSpeelDatum);
    wedstrijdenOpDag.sort((a,b) => planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(planStatusDB[window.genereerUniekId(b)].tijd));

    let mooieDatum = new Date(volgendeSpeelDatum).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    
    let html = `
        <div style="background:#eafaf1; border-left:4px solid #27ae60; padding:10px; border-radius:6px; margin-bottom:12px;">
            <strong style="color:#27ae60; font-size:1.1rem;">📅 ${mooieDatum}</strong>
            <div style="font-size:0.85rem; color:#2c3e50; margin-top:2px;">Er staan ${wedstrijdenOpDag.length} thuiswedstrijd(en) gepland.</div>
        </div>
        <div style="max-height: 250px; overflow-y: auto; padding-right:5px;">
    `;

    wedstrijdenOpDag.forEach(w => {
        let id = window.genereerUniekId(w);
        let st = planStatusDB[id];
        let pt = persoonsTakenDB[id] || {};
        
        let uitNaam = w.Uitteam.replace(/Black Shots/ig, '').trim();
        
        // Simpel de namen ophalen, of 'Nog niet gevuld'
        let scheids = [window.naamWeergave(pt.sA), window.naamWeergave(pt.sB)].filter(x=>!x.includes('Vrij') && !x.includes('Nog invullen')).join(' & ') || '<span style="color:#e74c3c; font-size:0.8rem;">Geen scheids</span>';
        let tafel = [window.naamWeergave(pt.tab), window.naamWeergave(pt.sco)].filter(x=>!x.includes('Vrij') && !x.includes('Nog invullen')).join(' & ') || '<span style="color:#e74c3c; font-size:0.8rem;">Geen tafel</span>';

        html += `
            <div style="background:#fdfdfd; border:1px solid #eee; padding:10px; border-radius:6px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px dashed #cbd5e1; padding-bottom:5px;">
                    <strong style="color:#2c3e50;">${st.tijd} | BS vs ${uitNaam}</strong>
                    <span style="font-size:0.8rem; background:#2c3e50; color:white; padding:2px 6px; border-radius:4px;">Veld ${st.veld || '?'}</span>
                </div>
                <div style="font-size:0.85rem; color:#7f8c8d; display:flex; gap:15px;">
                    <div>🦓 ${scheids}</div>
                    <div>⏱️ ${tafel}</div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
};

// 2. WIDGET: Aankomende Wedstrijden (Uit & Thuis per Team)
window.laadAankomendeWedstrijdenWidget = function() {
    let container = document.getElementById('dash-aankomend-inhoud');
    let select = document.getElementById('dash-aankomend-team-select');
    if(!container || !select) return;

    let teams = window.teamsDB || [];
    if(teams.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic;">Geen teams gevonden.</p>`;
        select.style.display = 'none';
        return;
    }

    // Vul de dropdown als die nog leeg is
    if (select.options.length === 0) {
        teams.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
        });
    }

    let geselecteerdTeamId = select.value;
    let tCanon = teams.find(t => t.id === geselecteerdTeamId);
    
    let alleWedstrijden = window.haalWedstrijdenOp();
    let planStatusDB = JSON.parse(localStorage.getItem('blackshots_plan_status')) || {};
    let { start, eind } = window.krijgVolgendeDatums(30); // Kijk 30 dagen vooruit

    let teamMatches = alleWedstrijden.filter(w => {
        let isActief = planStatusDB[window.genereerUniekId(w)];
        let isToekomstEnBinnenMaand = window.normaalDatum(w.Datum) >= start && window.normaalDatum(w.Datum) <= eind;
        
        let mCanonThuis = window.teamsDB.find(t => t.naam.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === w.Thuisteam.replace(/Black Shots/ig, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
        let mCanonUit = window.teamsDB.find(t => t.naam.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === w.Uitteam.replace(/Black Shots/ig, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
        
        return isActief && isToekomstEnBinnenMaand && ((mCanonThuis && mCanonThuis.id === tCanon.id) || (mCanonUit && mCanonUit.id === tCanon.id));
    });

    if (teamMatches.length === 0) {
        container.innerHTML = `<p style="color:#7f8c8d; font-style:italic; padding:10px; background:#fdfdfd; border:1px solid #eee; border-radius:4px;">Geen wedstrijden gepland voor ${tCanon.naam} in de komende 30 dagen.</p>`;
        return;
    }

    teamMatches.sort((a,b) => window.normaalDatum(a.Datum).localeCompare(window.normaalDatum(b.Datum)));

    let html = `<div style="max-height: 250px; overflow-y: auto; padding-right:5px;">`;
    
    teamMatches.forEach(w => {
        let id = window.genereerUniekId(w);
        let st = planStatusDB[id];
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        let mooieDatum = new Date(window.normaalDatum(w.Datum)).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
        
        let badgeColor = isThuis ? '#3498db' : '#e67e22';
        let badgeText = isThuis ? 'Thuis' : 'Uit';

        html += `
            <div style="background:#fdfdfd; border:1px solid #eee; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; align-items:center; gap:12px; border-left: 4px solid ${badgeColor};">
                <div style="text-align:center; min-width: 60px; border-right: 1px solid #eee; padding-right: 10px;">
                    <div style="font-weight:bold; color:#2c3e50; font-size:1.1rem;">${mooieDatum}</div>
                    <div style="font-size:0.8rem; color:#7f8c8d;">${st.tijd}</div>
                </div>
                <div style="flex:1;">
                    <strong style="color:#2c3e50;">${w.Thuisteam.replace(/Black Shots/ig, 'BS')} vs ${w.Uitteam.replace(/Black Shots/ig, 'BS')}</strong>
                    <div style="font-size:0.8rem; color:#7f8c8d; margin-top:3px;">
                        <span style="background:${badgeColor}; color:white; padding:2px 5px; border-radius:4px; font-weight:bold;">${badgeText}</span>
                        📍 ${w.Accommodatie || w.Locatie || w.Plaats || 'Onbekend'}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
};