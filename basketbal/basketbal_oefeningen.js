// --- BASKETBAL_OEFENINGEN.JS: OEFENINGEN TOEVOEGEN & BEHEREN ---

let editOefeningId = null;

// --- TACTIEKBORD LOGICA ---
let canvas, ctx;
let isTekenen = false;
let actieveTool = 'tekenen';
let laatsteX = 0, laatsteY = 0;
let actieveTekenKnop = null;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('tactiek-canvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        canvas.addEventListener('mousedown', startActie);
        canvas.addEventListener('mousemove', tekenLijn);
        canvas.addEventListener('mouseup', stopTekenen);
        canvas.addEventListener('mouseout', stopTekenen);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startActie(e.touches[0]); }, {passive: false});
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); tekenLijn(e.touches[0]); }, {passive: false});
        canvas.addEventListener('touchend', stopTekenen);
    }
});

function safeImage(imgStr) {
    if (!imgStr || imgStr === "null" || imgStr === "undefined" || imgStr.trim() === "") return null;
    return imgStr;
}

window.openTactiekModal = function(btnElement) {
    actieveTekenKnop = btnElement;
    document.getElementById('tactiek-modal').style.display = 'flex';
    window.wisTactiekBord();

    let bestaandeImg = safeImage(actieveTekenKnop.dataset.tekening);
    if (bestaandeImg) {
        let img = new Image();
        img.onload = function() { ctx.drawImage(img, 0, 0); };
        img.src = bestaandeImg;
    }
};

window.sluitTactiekModal = function() {
    document.getElementById('tactiek-modal').style.display = 'none';
    actieveTekenKnop = null;
};

window.slaTactiekOp = function() {
    if (!actieveTekenKnop || !canvas) return;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8); 
    actieveTekenKnop.dataset.tekening = dataUrl;
    actieveTekenKnop.style.background = '#27ae60'; 
    window.sluitTactiekModal();
};

window.wisTactiekBord = function() {
    if(!ctx) return;
    const w = canvas.width; const h = canvas.height;
    ctx.fillStyle = '#f4c28d'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.strokeRect(10, 10, w - 20, h - 20); 
    ctx.strokeRect(w/2 - 60, 10, 120, 140); 
    ctx.beginPath(); ctx.arc(w/2, 150, 40, 0, Math.PI); ctx.stroke(); 
    ctx.beginPath(); ctx.arc(w/2, 30, 160, 0, Math.PI); ctx.stroke(); 
    ctx.fillStyle = 'white'; ctx.fillRect(w/2 - 25, 20, 50, 4); 
    ctx.beginPath(); ctx.arc(w/2, 32, 10, 0, Math.PI * 2); ctx.stroke(); 
};

window.kiesTool = function(tool) {
    actieveTool = tool;
    const tools = ['tekenen', 'O', 'X', 'pion', 'bal'];
    tools.forEach(t => {
        let btn = document.getElementById('tool-' + t);
        if(btn) {
            btn.style.background = (t === tool) ? '#f39c12' : 'white';
            btn.style.color = (t === tool) ? 'white' : 'black';
            btn.style.border = (t === tool) ? 'none' : '1px solid #bdc3c7';
        }
    });
};

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
}

function startActie(e) {
    const pos = getMousePos(e);
    if (actieveTool === 'tekenen') {
        isTekenen = true; laatsteX = pos.x; laatsteY = pos.y;
    } else {
        ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let symbool = '';
        if (actieveTool === 'O') symbool = '🔵';
        if (actieveTool === 'X') symbool = '❌';
        if (actieveTool === 'pion') symbool = '🔺';
        if (actieveTool === 'bal') symbool = '🏀';
        ctx.fillText(symbool, pos.x, pos.y);
    }
}
function tekenLijn(e) {
    if (!isTekenen || actieveTool !== 'tekenen') return;
    const pos = getMousePos(e);
    ctx.beginPath(); ctx.moveTo(laatsteX, laatsteY); ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 3; ctx.stroke();
    laatsteX = pos.x; laatsteY = pos.y;
}
function stopTekenen() { isTekenen = false; }


// --- NORMALE OEFENINGEN LOGICA ---
window.vulDynamischeFormulieren = function() {
    const doelContainer = document.getElementById('doelgroep-container');
    if(doelContainer) {
        doelContainer.innerHTML = '';
        window.teamsDB.forEach(team => { doelContainer.innerHTML += `<label><input type="checkbox" class="doel-cb" value="${team.id}"> ${team.naam}</label>`; });
    }
    const catContainer = document.getElementById('categorie-container');
    if(catContainer) {
        catContainer.innerHTML = '';
        window.categorieenDB.forEach(cat => { catContainer.innerHTML += `<label><input type="checkbox" class="cat-cb" value="${cat}"> ${cat}</label>`; });
    }
    const plannerFilter = document.getElementById('planner-cat-filter');
    if(plannerFilter) {
        plannerFilter.innerHTML = '<option value="">Alle Thema\'s</option>';
        window.categorieenDB.forEach(cat => { plannerFilter.innerHTML += `<option value="${cat}">${cat}</option>`; });
    }
};

window.voegWeekToe = function(bestaandeTekst = "", bestaandeTekening = "") {
    const container = document.getElementById('progressie-container');
    const weekNummer = container.children.length + 1;
    const div = document.createElement('div');
    
    let safeImg = safeImage(bestaandeTekening);
    let btnStyle = safeImg ? 'background:#27ae60;' : 'background:#f39c12;';
    
    div.style.display = 'flex'; div.style.gap = '10px'; div.style.alignItems = 'flex-start';
    div.innerHTML = `
        <strong style="color:#d35400; padding-top:8px; min-width:60px;">Week <span class="week-nummer">${weekNummer}</span>:</strong>
        <textarea class="prog-week-text" rows="2" style="flex:1; border-color:#f39c12; margin:0;" placeholder="Wat is de focus / uitleg voor deze week?">${bestaandeTekst}</textarea>
        <button type="button" class="btn-teken-week" onclick="window.openTactiekModal(this)" data-tekening="${safeImg || ''}" style="${btnStyle} color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Teken voor deze week">🖍️</button>
        <button type="button" onclick="this.parentElement.remove(); window.hernummerWeken();" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">X</button>
    `;
    container.appendChild(div);
};

window.hernummerWeken = function() {
    const container = document.getElementById('progressie-container');
    Array.from(container.children).forEach((div, index) => { div.querySelector('.week-nummer').innerText = index + 1; });
};

window.voegTeamVariatieToe = function(teamId = "", tekst = "", tekening = "") {
    const container = document.getElementById('team-variaties-container');
    let teamOpties = window.teamsDB.map(t => `<option value="${t.id}" ${t.id === teamId ? 'selected' : ''}>${t.naam}</option>`).join('');
    const div = document.createElement('div');
    
    let safeImg = safeImage(tekening);
    let btnStyle = safeImg ? 'background:#27ae60;' : 'background:#1abc9c;';
    
    div.style.display = 'flex'; div.style.gap = '10px'; div.style.alignItems = 'flex-start'; div.style.width = '100%';
    div.innerHTML = `
        <select class="var-team-select" style="width:150px; padding:8px; border:1px solid #1abc9c; border-radius:4px; margin:0;"><option value="">-- Kies Team --</option>${teamOpties}</select>
        <textarea class="var-team-text" rows="2" style="flex:1; width:100%; min-width:150px; padding:8px; border:1px solid #1abc9c; border-radius:4px; margin:0;" placeholder="Specifieke regel voor dit team...">${tekst}</textarea>
        <button type="button" class="btn-teken-team" onclick="window.openTactiekModal(this)" data-tekening="${safeImg || ''}" style="${btnStyle} color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Teken voor dit team">🖍️</button>
        <button type="button" onclick="this.parentElement.remove();" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">X</button>
    `;
    container.appendChild(div);
};

window.slaOefeningOp = function() {
    const naam = document.getElementById('oef-naam').value.trim();
    const duur = parseInt(document.getElementById('oef-duur').value);
    const aantalSpelers = document.getElementById('oef-spelers').value.trim(); 
    const spullen = document.getElementById('oef-spullen').value.trim();
    const uitleg = document.getElementById('oef-uitleg').value.trim();
    const makkelijker = document.getElementById('oef-makkelijker').value.trim();
    const moeilijker = document.getElementById('oef-moeilijker').value.trim();

    if (!naam || isNaN(duur)) return alert("Vul in ieder geval een naam en de duur in minuten in.");

    let btnBasis = document.getElementById('btn-teken-basis');
    let tekeningBasis = safeImage(btnBasis.dataset.tekening);

    let progressie = []; 
    Array.from(document.getElementById('progressie-container').children).forEach(rij => { 
        let txt = rij.querySelector('.prog-week-text').value.trim();
        let img = safeImage(rij.querySelector('.btn-teken-week').dataset.tekening);
        if (txt || img) progressie.push({ tekst: txt, tekening: img }); 
    });

    let teamVariaties = {};
    Array.from(document.getElementById('team-variaties-container').children).forEach(rij => {
        let tId = rij.querySelector('.var-team-select').value; 
        let txt = rij.querySelector('.var-team-text').value.trim();
        let img = safeImage(rij.querySelector('.btn-teken-team').dataset.tekening);
        if (tId && (txt || img)) teamVariaties[tId] = { tekst: txt, tekening: img };
    });

    let doelgroepen = []; document.querySelectorAll('.doel-cb:checked').forEach(cb => doelgroepen.push(cb.value));
    let categorieen = []; document.querySelectorAll('.cat-cb:checked').forEach(cb => categorieen.push(cb.value));

    const oefeningData = {
        id: editOefeningId || 'oef_' + Date.now(),
        naam, duur, aantalSpelers, spullen, uitleg, makkelijker, moeilijker, 
        progressie, teamVariaties, doelgroepen, categorieen,
        tekening: tekeningBasis 
    };

    if (editOefeningId) window.oefeningenDB = window.oefeningenDB.map(o => o.id === editOefeningId ? oefeningData : o);
    else window.oefeningenDB.push(oefeningData);

    localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
    const countEl = document.getElementById('dash-oef-count'); if(countEl) countEl.innerText = window.oefeningenDB.length;

    window.resetOefeningFormulier();
    window.renderOefeningenLijst();
};
window.renderOefeningenLijst = function() {
    const lijst = document.getElementById('oefeningen-lijst');
    const zoekterm = document.getElementById('zoek-oefening') ? document.getElementById('zoek-oefening').value.toLowerCase().trim() : "";
    if(!lijst) return; lijst.innerHTML = '';

    let gefilterd = window.oefeningenDB.filter(o => {
        let catText = o.categorieen ? o.categorieen.join(' ').toLowerCase() : '';
        return (!zoekterm) || o.naam.toLowerCase().includes(zoekterm) || catText.includes(zoekterm);
    });

    if(gefilterd.length === 0) { lijst.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen oefeningen gevonden...</p>'; return; }

    gefilterd.sort((a,b) => a.naam.localeCompare(b.naam)).forEach((oef, idx) => {
        let catTags = ''; if(oef.categorieen) oef.categorieen.forEach(c => catTags += `<span style="background:#3498db; color:white; font-size:0.75rem; padding:2px 6px; border-radius:4px; margin-right:5px;">${c}</span>`);
        
        let li = document.createElement('li');
        li.style.cssText = "background:var(--card-bg); border:1px solid var(--border-color); padding:15px; border-radius:8px; margin-bottom:10px;";
        
        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="flex:1;">
                    <strong style="font-size:1.2rem; display:block; margin-bottom:5px;">${oef.naam}</strong>
                    <div style="margin-bottom:8px;">${catTags}</div>
                    <div style="color:#7f8c8d; font-size:0.9rem;">⏱ ${oef.duur} min | 👥 ${oef.aantalSpelers || 'Alle'}</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button onclick="window.openOefeningPopup('${oef.id}')" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">👁️ Bekijk</button>
                    <button onclick="window.bewerkOefening('${oef.id}')" style="background:#f39c12; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">✏️</button>
                    <button onclick="window.exporteerOefening('${oef.id}')" style="background:#9b59b6; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">💾</button>
                </div>
            </div>
        `;
        lijst.appendChild(li);
    });
};

window.openOefeningPopup = function(id) {
    let oef = window.oefeningenDB.find(o => o.id === id);
    if(!oef) return;

    // We bouwen de modal nu inclusief de 'pijltjes' logica
    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    // We slaan de huidige week op in een variabele die we in de pop-up bijhouden
    let huidigeWeekIndex = 0;

    function renderModalInhoud() {
        let isLeerlijn = oef.progressie && oef.progressie.length > 0;
        let weekData = isLeerlijn ? (typeof oef.progressie[huidigeWeekIndex] === 'string' ? oef.progressie[huidigeWeekIndex] : oef.progressie[huidigeWeekIndex].tekst) : "Geen leerlijn beschikbaar.";
        let weekImg = isLeerlijn ? (typeof oef.progressie[huidigeWeekIndex] === 'object' ? oef.progressie[huidigeWeekIndex].tekening : null) : null;
        
        // Kies de juiste afbeelding: week-plaatje of anders basis-plaatje
        let finalImg = weekImg || oef.tekening;

        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px; width:95%; padding:20px; background:white; border-radius:8px; position:relative;">
                <button onclick="this.parentElement.parentElement.remove()" style="position:absolute; top:10px; right:10px; border:none; background:none; cursor:pointer; font-size:1.2rem;">X</button>
                <h2>${oef.naam}</h2>
                <p><strong>Uitleg:</strong> ${oef.uitleg}</p>
                
                <div style="display:flex; gap:10px; margin:15px 0;">
                    <div style="flex:1; background:#e8f8f5; padding:10px; border-radius:4px;"><strong>Makkelijker:</strong><br>${oef.makkelijker || '-'}</div>
                    <div style="flex:1; background:#fdedec; padding:10px; border-radius:4px;"><strong>Moeilijker:</strong><br>${oef.moeilijker || '-'}</div>
                </div>

                ${isLeerlijn ? `
                    <div style="background:#fdf2e9; padding:15px; border-radius:4px; margin-top:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <button onclick="changeWeek(-1)" ${huidigeWeekIndex === 0 ? 'disabled' : ''}>◀ Vorige</button>
                            <strong>Week ${huidigeWeekIndex + 1} / ${oef.progressie.length}</strong>
                            <button onclick="changeWeek(1)" ${huidigeWeekIndex === oef.progressie.length - 1 ? 'disabled' : ''}>Volgende ▶</button>
                        </div>
                        <p>${weekData}</p>
                        ${finalImg ? `<div style="text-align:center;"><img src="${finalImg}" style="max-width:100%; border-radius:4px; margin-top:10px;"></div>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Helper functie om te wisselen
    window.changeWeek = function(richting) {
        huidigeWeekIndex += richting;
        renderModalInhoud();
    };

    renderModalInhoud();
    document.body.appendChild(modal);
};

window.toonWeekInfo = function(index, oefNaam, richting) {
    let oef = window.oefeningenDB.find(o => o.naam === oefNaam);
    let container = document.getElementById(`tijdlijn-info-${index}`);
    
    // We slaan de huidige week op in een data-attribuut
    let huidigeWeek = parseInt(container.dataset.week) || 0;
    let nieuweWeek = huidigeWeek + richting;
    
    // Check grenzen
    if(nieuweWeek < 0) nieuweWeek = 0;
    if(nieuweWeek >= oef.progressie.length) nieuweWeek = oef.progressie.length - 1;
    
    container.dataset.week = nieuweWeek;
    
    // Update de tekst in het blokje
    container.querySelector('.week-tekst').innerText = oef.progressie[nieuweWeek];
    container.querySelector('.week-titel').innerText = `Week ${nieuweWeek + 1}`;
};

window.verwijderOefening = function(id) {
    if(confirm("Weet je zeker dat je deze oefening wilt verwijderen?")) {
        window.oefeningenDB = window.oefeningenDB.filter(o => o.id !== id);
        localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
        const countEl = document.getElementById('dash-oef-count'); if(countEl) countEl.innerText = window.oefeningenDB.length;
        window.renderOefeningenLijst();
    }
};

window.bewerkOefening = function(id) {
    let oef = window.oefeningenDB.find(o => o.id === id);
    if(!oef) return;

    editOefeningId = oef.id;
    document.getElementById('form-titel').innerText = "Oefening Bewerken";
    document.getElementById('opslaan-btn').innerText = "Wijzigingen Opslaan";
    document.getElementById('annuleer-btn').style.display = "block";

    document.getElementById('oef-naam').value = oef.naam;
    document.getElementById('oef-duur').value = oef.duur;
    document.getElementById('oef-spelers').value = oef.aantalSpelers || '';
    document.getElementById('oef-spullen').value = oef.spullen || '';
    document.getElementById('oef-uitleg').value = oef.uitleg || '';
    document.getElementById('oef-makkelijker').value = oef.makkelijker || '';
    document.getElementById('oef-moeilijker').value = oef.moeilijker || '';

    let basisBtn = document.getElementById('btn-teken-basis');
    let safeBasisImg = safeImage(oef.tekening);
    basisBtn.dataset.tekening = safeBasisImg || '';
    basisBtn.style.background = safeBasisImg ? '#27ae60' : '#2c3e50';

    document.getElementById('progressie-container').innerHTML = '';
    if (oef.progressie) {
        oef.progressie.forEach(weekData => {
            let txt = typeof weekData === 'string' ? weekData : weekData.tekst;
            let img = typeof weekData === 'object' ? weekData.tekening : '';
            window.voegWeekToe(txt, img);
        });
    }

    document.getElementById('team-variaties-container').innerHTML = '';
    if (oef.teamVariaties) {
        Object.keys(oef.teamVariaties).forEach(tId => {
            let varData = oef.teamVariaties[tId];
            let txt = typeof varData === 'string' ? varData : varData.tekst;
            let img = typeof varData === 'object' ? varData.tekening : '';
            window.voegTeamVariatieToe(tId, txt, img);
        });
    }

    window.vulDynamischeFormulieren();
    document.querySelectorAll('.doel-cb').forEach(cb => { cb.checked = (oef.doelgroepen && oef.doelgroepen.includes(cb.value)); });
    document.querySelectorAll('.cat-cb').forEach(cb => { cb.checked = (oef.categorieen && oef.categorieen.includes(cb.value)); });

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.resetOefeningFormulier = function() {
    editOefeningId = null;
    document.getElementById('form-titel').innerText = "Nieuwe Oefening Toevoegen";
    document.getElementById('opslaan-btn').innerText = "Oefening Opslaan";
    document.getElementById('annuleer-btn').style.display = "none";

    document.getElementById('oef-naam').value = ''; document.getElementById('oef-duur').value = '';
    document.getElementById('oef-spelers').value = ''; document.getElementById('oef-spullen').value = '';
    document.getElementById('oef-uitleg').value = ''; document.getElementById('oef-makkelijker').value = '';
    document.getElementById('oef-moeilijker').value = ''; 
    
    let basisBtn = document.getElementById('btn-teken-basis');
    basisBtn.dataset.tekening = ''; basisBtn.style.background = '#2c3e50';

    document.getElementById('progressie-container').innerHTML = ''; document.getElementById('team-variaties-container').innerHTML = '';
    document.querySelectorAll('.doel-cb').forEach(cb => cb.checked = false); document.querySelectorAll('.cat-cb').forEach(cb => cb.checked = false);
};

// --- NIEUW: EXPORTEER 1 OEFENING ---
window.exporteerOefening = function(id) {
    const oef = window.oefeningenDB.find(o => o.id === id);
    if(!oef) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([oef], null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    
    let veiligeNaam = oef.naam.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAnchorNode.setAttribute("download", `oefening_${veiligeNaam}.json`);
    
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

// --- NIEUW: IMPORTEER 1 OF MEERDERE OEFENINGEN ---
window.importeerOefening = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // Check of het een array is (1 of meerdere oefeningen) of 1 los object
            let nieuweOefeningen = Array.isArray(data) ? data : [data];
            
            let toegevoegd = 0;
            nieuweOefeningen.forEach(nieuweOef => {
                if (nieuweOef.naam && nieuweOef.duur) {
                    // Maak altijd een nieuw ID aan zodat we niets per ongeluk overschrijven
                    nieuweOef.id = 'oef_' + Date.now() + Math.floor(Math.random() * 1000);
                    window.oefeningenDB.push(nieuweOef);
                    toegevoegd++;
                }
            });

            if (toegevoegd > 0) {
                localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
                const countEl = document.getElementById('dash-oef-count');
                if(countEl) countEl.innerText = window.oefeningenDB.length;
                window.renderOefeningenLijst();
                alert(`🏀 Succes! ${toegevoegd} oefening(en) toegevoegd aan je bibliotheek.`);
            } else {
                alert("Dit bestand bevat geen geldige oefening(en).");
            }
        } catch (err) {
            alert("Fout bij het inlezen van bestand.");
            console.error(err);
        }
        // Reset de file input zodat je hetzelfde bestand nog een keer zou kunnen inladen
        event.target.value = '';
    };
    reader.readAsText(file);
};