// --- BASKETBAL_BESTUUR.JS: LOGICA VOOR VERGADERINGEN, LIVE-MODUS & PDF ---

// 1. DATA INITIALISATIE
window.bestuurDB = JSON.parse(localStorage.getItem('blackshots_bestuur')) || [];
window.standaardSjabloon = JSON.parse(localStorage.getItem('blackshots_bestuur_sjabloon')) || [
    "Opening en vaststellen agendapunten",
    "Mededelingen en ledenmutaties",
    "Actielijst",
    "Ingekomen stukken",
    "Financiën",
    "Jaarplanning",
    "Rondvraag",
    "Vaststellen volgende vergaderdatum en sluiting"
];
window.actieveVergaderingId = null;
window.isLiveModus = false;

// 2. OVERZICHT SCHERM
window.tekenOverzicht = function() {
    let container = document.getElementById('vergaderingen-lijst');
    if (!container) return;
    container.innerHTML = '';
    
    if (window.bestuurDB.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Nog geen vergaderingen gepland. Klik op de groene knop!</p>';
        return;
    }

    let gesorteerd = [...window.bestuurDB].reverse();
    gesorteerd.forEach(v => {
        container.innerHTML += `
            <div onclick="openVergadering('${v.id}')" class="card" style="cursor:pointer; transition:0.2s; border-left:6px solid #3498db; margin-bottom:10px;" onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                <strong style="font-size:1.2rem; color:var(--secondary-color);">📅 ${v.datum || 'Nieuwe Vergadering'}</strong>
                <div style="color:#7f8c8d; font-size:0.9rem; margin-top:5px;">🕒 ${v.tijd || '?'} | 📍 ${v.adres || '?'}</div>
            </div>
        `;
    });
};

// 3. VERGADERING AANMAKEN & OPENEN
window.nieuweVergadering = function() {
    let startPunten = window.standaardSjabloon.map(titel => {
        return { id: 'p_' + Math.random().toString(36).substr(2, 9), titel: titel, prep: '', verslag: '' };
    });

    let nw = { 
        id: 'verg_' + Date.now(), 
        datum: '', tijd: '20:00 uur', adres: '', aanwezig: 'Martin, Izaac, Jolanda, Tom', 
        punten: startPunten
    };

    window.bestuurDB.push(nw);
    slaOpEnHerlaad();
    openVergadering(nw.id);
};

window.openVergadering = function(id) {
    window.actieveVergaderingId = id;
    let v = window.bestuurDB.find(x => x.id === id);
    if (!v) return;

    // Reparatie voor zeeeeer oude tests
    if(!v.punten) {
        v.punten = [];
        if(v.notitiesStandaard) {
            ["Opening", "Mededelingen", "Actielijst", "Ingekomen stukken", "Financiën", "Jaarplanning"].forEach((t, i) => {
                v.punten.push({id: 'old_'+i, titel: t, prep: v.notitiesStandaard[i]||'', verslag: (v.verslagStandaard && v.verslagStandaard[i])||''});
            });
        }
        if(v.extraPunten) {
            v.extraPunten.forEach((ex, i) => v.punten.push({id: 'old_ex_'+i, titel: ex.titel||'Extra', prep: ex.notitie||'', verslag: ex.verslag||''}));
        }
        if(v.notitiesEind) {
            ["Rondvraag", "Sluiting"].forEach((t, i) => {
                v.punten.push({id: 'old_end_'+i, titel: t, prep: v.notitiesEind[i]||'', verslag: (v.verslagEind && v.verslagEind[i])||''});
            });
        }
    }

    document.getElementById('overzicht-scherm').style.display = 'none';
    document.getElementById('editor-scherm').style.display = 'block';

    document.getElementById('v_datum').value = v.datum || '';
    document.getElementById('v_tijd').value = v.tijd || '';
    document.getElementById('v_adres').value = v.adres || '';
    document.getElementById('v_aanwezig').value = v.aanwezig || '';

    tekenAgendaPunten();
};

window.sluitEditor = function() {
    window.actieveVergaderingId = null;
    document.getElementById('editor-scherm').style.display = 'none';
    document.getElementById('overzicht-scherm').style.display = 'block';
    if (window.isLiveModus) toggleLiveModus();
    tekenOverzicht();
};

// 4. LIVE MODUS TOGGLE
window.toggleLiveModus = function() {
    window.isLiveModus = !window.isLiveModus;
    document.getElementById('live-header').style.display = window.isLiveModus ? 'flex' : 'none';
    
    if (window.isLiveModus) {
        document.body.classList.add('live-modus-actief');
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(e=>e);
    } else {
        document.body.classList.remove('live-modus-actief');
        if (document.exitFullscreen) document.exitFullscreen().catch(e=>e);
    }
    tekenAgendaPunten(); 
};

// 5. AGENDAPUNTEN TEKENEN
window.tekenAgendaPunten = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    let container = document.getElementById('agenda-punten-container');
    container.innerHTML = '';

    v.punten.forEach((punt, index) => {
        let htmlVakken = '';

        if (window.isLiveModus) {
            let prepDisplay = punt.prep ? punt.prep.replace(/\n/g, '<br>') : '<i style="color:#bdc3c7;">Geen voorbereiding genoteerd...</i>';
            htmlVakken = `
            <div style="margin-top:15px;">
                <div class="spiekbrief-lees-blok">
                    <strong style="color:#d35400; font-size:0.85rem; display:block; margin-bottom:8px; text-transform:uppercase;">🤫 Jouw Spiekbrief / Punten:</strong>
                    ${prepDisplay}
                </div>
                <div>
                    <textarea class="notitie-veld live-veld" style="min-height:150px; font-size:1.05rem;" placeholder="✍️ KLADBLOK: Typ hier snel wat er besproken of besloten is tijdens de vergadering..." onchange="slaVerslagOp('${punt.id}', this.value)">${punt.verslag}</textarea>
                </div>
            </div>`;
        } else {
            htmlVakken = `
            <div style="display:flex; gap:15px; flex-wrap:wrap; margin-top:10px;">
                <div style="flex:1; min-width:250px;">
                    <label class="veld-label label-prep">🤫 Voorbereiding / Wat wil ik zeggen?</label>
                    <textarea class="notitie-veld prep-veld" placeholder="Zet hier jouw spiekbriefje neer..." onchange="slaPrepOp('${punt.id}', this.value)">${punt.prep}</textarea>
                </div>
                <div style="flex:1; min-width:250px;">
                    <label class="veld-label label-live">✍️ Uitgewerkte Notulen (Definitief)</label>
                    <textarea class="notitie-veld live-veld" placeholder="Werk hier je kladjes na de vergadering netjes uit..." onchange="slaVerslagOp('${punt.id}', this.value)">${punt.verslag}</textarea>
                </div>
            </div>`;
        }

        let deleteBtn = window.isLiveModus ? '' : `<button onclick="verwijderPunt('${punt.id}')" style="background:none; border:none; color:#e74c3c; font-weight:bold; cursor:pointer; font-size:1.2rem; margin-left:10px;" title="Verwijder dit blok">&times;</button>`;

        container.innerHTML += `
            <div class="agenda-punt" style="border-left-color:${index%2===0 ? '#3498db' : '#9b59b6'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span style="font-size:1.2rem; font-weight:bold; color:#bdc3c7; margin-right:10px; margin-top:5px;">${index+1}.</span>
                    <input type="text" class="agenda-titel-input" value="${punt.titel}" placeholder="Naam van dit agendapunt..." onchange="slaTitelOp('${punt.id}', this.value)">
                    ${deleteBtn}
                </div>
                ${htmlVakken}
            </div>`;
    });
};

// 6. BEWERKEN EN OPSLAAN
window.slaOp = function() {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    v.datum = document.getElementById('v_datum').value; v.tijd = document.getElementById('v_tijd').value;
    v.adres = document.getElementById('v_adres').value; v.aanwezig = document.getElementById('v_aanwezig').value;
    slaOpEnHerlaad();
};

window.slaTitelOp = function(puntId, val) { window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId).titel = val; slaOpEnHerlaad(); };
window.slaPrepOp = function(puntId, val) { window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId).prep = val; slaOpEnHerlaad(); };
window.slaVerslagOp = function(puntId, val) { window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.find(p => p.id === puntId).verslag = val; slaOpEnHerlaad(); };

window.voegPuntToe = function() {
    window.bestuurDB.find(x => x.id === window.actieveVergaderingId).punten.push({ id: 'p_' + Math.random().toString(36).substr(2, 9), titel: 'Nieuw Agendapunt', prep: '', verslag: '' });
    slaOpEnHerlaad(); tekenAgendaPunten();
};

window.verwijderPunt = function(puntId) {
    if(confirm("Weet je zeker dat je dit hele agendapunt wilt wissen?")) {
        let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
        v.punten = v.punten.filter(p => p.id !== puntId);
        slaOpEnHerlaad(); tekenAgendaPunten();
    }
};

window.verwijderVergadering = function() {
    if(confirm("Weet je zeker dat je deze vergadering en alle notulen definitief wilt wissen?")) {
        window.bestuurDB = window.bestuurDB.filter(x => x.id !== window.actieveVergaderingId);
        slaOpEnHerlaad(); sluitEditor();
    }
}

function slaOpEnHerlaad() { localStorage.setItem('blackshots_bestuur', JSON.stringify(window.bestuurDB)); }

// 7. SJABLOON BEHEERDER
window.tempSjabloon = [];
window.openSjabloonInstellingen = function() {
    window.tempSjabloon = [...window.standaardSjabloon];
    tekenSjabloonLijst();
    document.getElementById('sjabloon-modal').style.display = 'flex';
};

window.sluitSjabloonInstellingen = function() { document.getElementById('sjabloon-modal').style.display = 'none'; };

window.tekenSjabloonLijst = function() {
    let c = document.getElementById('sjabloon-lijst');
    c.innerHTML = '';
    window.tempSjabloon.forEach((punt, idx) => {
        c.innerHTML += `
            <div style="display:flex; gap:10px; margin-bottom:10px;">
                <span style="font-weight:bold; color:#7f8c8d; padding-top:8px;">${idx+1}.</span>
                <input type="text" value="${punt}" onchange="window.tempSjabloon[${idx}] = this.value" style="flex:1; padding:8px; border:1px solid #bdc3c7; border-radius:4px; font-family:inherit; background:transparent; color:inherit;">
                <button onclick="window.tempSjabloon.splice(${idx}, 1); window.tekenSjabloonLijst()" style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:0 12px; font-weight:bold; cursor:pointer;">X</button>
            </div>`;
    });
}

window.voegSjabloonPuntToe = function() { window.tempSjabloon.push('Nieuw punt...'); tekenSjabloonLijst(); };

window.slaSjabloonOp = function() {
    window.standaardSjabloon = window.tempSjabloon.filter(x => x.trim() !== '');
    localStorage.setItem('blackshots_bestuur_sjabloon', JSON.stringify(window.standaardSjabloon));
    sluitSjabloonInstellingen();
    alert("✅ Sjabloon succesvol bijgewerkt! Nieuwe vergaderingen krijgen vanaf nu deze indeling.");
};

// 8. DE PDF EXPORT (STRIKT GESCHEIDEN!)
window.genereerDocument = function(soort) {
    let v = window.bestuurDB.find(x => x.id === window.actieveVergaderingId);
    
    let hoofdtitel = soort === 'notulen' ? "Notulen Bestuursvergadering" : "Bestuursvergadering";
    let subtitelDoc = soort === 'notulen' ? "Definitieve Besluiten & Notulen" : (soort === 'spiekbrief' ? "Agenda & Voorbereiding (Tom's Versie)" : "Officiële Agenda");

    let htmlDoc = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${hoofdtitel} Black Shots</title>
        <style>
            @page { margin: 0; size: A4 portrait; }
            body { font-family: 'Arial', sans-serif; color: #000; line-height: 1.5; padding: 2cm; background: white; margin: 0; }
            .logo-box { text-align: center; margin-bottom: 30px; }
            .logo-box img { max-width: 180px; }
            h1 { text-align: left; font-size: 18px; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; }
            .meta-tabel { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            .meta-tabel td { padding: 3px 0; vertical-align: top; }
            .meta-tabel td:first-child { width: 100px; font-weight: bold; }
            h2 { font-size: 16px; margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333; }
            
            .agenda-lijst { list-style-type: decimal; padding-left: 20px; font-size: 14px; font-weight: bold; margin-top: 0; }
            .agenda-lijst > li { margin-bottom: 20px; }
            .tekst-blok { font-weight: normal; font-size: 13px; margin-top: 5px; padding-left: 15px; display: block; color: #333; white-space: pre-wrap; }
            .prep-label { font-size: 11px; color: #d35400; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; }
            
            @media print { .print-btn { display: none !important; } }
        </style>
    </head>
    <body>
        <button class="print-btn" onclick="window.print()" style="position:fixed; top:20px; right:20px; padding:12px 24px; background:#27ae60; color:white; border:none; border-radius:6px; font-size:16px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.3);">📥 Opslaan als PDF</button>

        <div class="logo-box"><img src="Logo Zwart.png" alt="Black Shots Logo" onerror="this.style.display='none'"></div>
        <h1>${hoofdtitel} Black Shots</h1>
        
        <table class="meta-tabel">
            <tr><td>Datum:</td><td>${v.datum || '...'}</td></tr>
            <tr><td>Tijd:</td><td>${v.tijd || '...'}</td></tr>
            <tr><td>Adres:</td><td>${v.adres || '...'}</td></tr>
            <tr><td>Aanwezig:</td><td>${v.aanwezig || '...'}</td></tr>
        </table>

        <h2>${subtitelDoc}</h2>
        <ol class="agenda-lijst">
    `;

    v.punten.forEach((punt) => {
        htmlDoc += `<li>${punt.titel || 'Onbenoemd punt'}`;
        if (soort === 'spiekbrief' && punt.prep) {
            htmlDoc += `<div class="tekst-blok"><div class="prep-label">Jouw Voorbereiding:</div>${punt.prep}</div>`;
        }
        if (soort === 'notulen' && punt.verslag) {
            htmlDoc += `<div class="tekst-blok">${punt.verslag}</div>`;
        }
        htmlDoc += `</li>`;
    });

    htmlDoc += `</ol></body></html>`;

    let printTab = window.open('', '_blank'); printTab.document.write(htmlDoc); printTab.document.close();
    setTimeout(() => { printTab.print(); }, 500);
};

// Start 
setTimeout(window.tekenOverzicht, 200);