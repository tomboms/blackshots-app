let editOefeningId = null;
let filterAlleenFavorieten = false;

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


// --- FORMULIER & DATA LOGICA ---
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
        <textarea class="prog-week-text" rows="2" style="flex:1; border:1px solid #f39c12; border-radius:4px; margin:0;" placeholder="Wat is de focus / uitleg voor deze week?">${bestaandeTekst}</textarea>
        <button type="button" class="btn-teken-week" onclick="window.openTactiekModal(this)" data-tekening="${safeImg || ''}" style="${btnStyle} color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Teken voor deze week">🖍️</button>
        <button type="button" onclick="this.parentElement.remove(); window.hernummerWeken();" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">X</button>
    `;
    container.appendChild(div);
};

window.hernummerWeken = function() {
    const container = document.getElementById('progressie-container');
    Array.from(container.children).forEach((div, index) => { div.querySelector('.week-nummer').innerText = index + 1; });
};

window.voegTeamVariatieToe = function(geselecteerdeTeams = [], tekst = "", tekening = "") {
    const container = document.getElementById('team-variaties-container');
    const div = document.createElement('div');
    
    let teamCheckboxesHtml = window.teamsDB.map(t => {
        let isChecked = geselecteerdeTeams.includes(t.id) ? 'checked' : '';
        return `<label style="white-space:nowrap; margin-right:10px; font-size:0.85rem;"><input type="checkbox" class="var-team-cb" value="${t.id}" ${isChecked}> ${t.naam}</label>`;
    }).join('');

    let safeImg = safeImage(tekening);
    let btnStyle = safeImg ? 'background:#27ae60;' : 'background:#1abc9c;';
    
    div.style.background = "white"; div.style.padding = "10px"; div.style.borderRadius = "4px"; div.style.border = "1px dashed #1abc9c";
    div.innerHTML = `
        <div style="margin-bottom:8px;"><strong>Vink de teams aan:</strong><br><div style="display:flex; flex-wrap:wrap; background:#f9f9f9; padding:5px; border-radius:4px; border:1px solid #eee;">${teamCheckboxesHtml}</div></div>
        <div style="display:flex; gap:10px; align-items:flex-start;">
            <textarea class="var-team-text" rows="2" style="flex:1; border:1px solid #1abc9c; border-radius:4px; margin:0;" placeholder="Specifieke regel/aandachtspunt voor deze teams...">${tekst}</textarea>
            <button type="button" class="btn-teken-team" onclick="window.openTactiekModal(this)" data-tekening="${safeImg || ''}" style="${btnStyle} color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Teken voor deze teams">🖍️</button>
            <button type="button" onclick="this.parentElement.parentElement.remove();" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;">X</button>
        </div>
    `;
    container.appendChild(div);
};

window.slaOefeningOp = function() {
    const naam = document.getElementById('oef-naam').value.trim();
    const duur = parseInt(document.getElementById('oef-duur').value);
    
    const minSpelers = parseInt(document.getElementById('oef-min-spelers').value); 
    const groepering = document.getElementById('oef-groepering').value.trim();
    
    const spullen = document.getElementById('oef-spullen').value.trim();
    const video = document.getElementById('oef-video').value.trim();
    const uitleg = document.getElementById('oef-uitleg').value.trim();
    const aandacht = document.getElementById('oef-aandacht').value.trim();
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

    let teamVariaties = [];
    Array.from(document.getElementById('team-variaties-container').children).forEach(rij => {
        let geselecteerdeTeams = [];
        rij.querySelectorAll('.var-team-cb:checked').forEach(cb => geselecteerdeTeams.push(cb.value));
        let txt = rij.querySelector('.var-team-text').value.trim();
        let img = safeImage(rij.querySelector('.btn-teken-team').dataset.tekening);
        if (geselecteerdeTeams.length > 0 && (txt || img)) {
            teamVariaties.push({ teams: geselecteerdeTeams, tekst: txt, tekening: img });
        }
    });

    let doelgroepen = []; document.querySelectorAll('.doel-cb:checked').forEach(cb => doelgroepen.push(cb.value));
    let categorieen = []; document.querySelectorAll('.cat-cb:checked').forEach(cb => categorieen.push(cb.value));

    let bestaandeOef = editOefeningId ? window.oefeningenDB.find(o => o.id === editOefeningId) : null;
    let isFav = bestaandeOef ? bestaandeOef.isFavoriet : false;

    const oefeningData = {
        id: editOefeningId || 'oef_' + Date.now() + Math.floor(Math.random() * 1000),
        isFavoriet: isFav,
        naam, duur, 
        minSpelers: isNaN(minSpelers) ? 1 : minSpelers,
        groepering, 
        spullen, videoLink: video, 
        uitleg, aandachtspunten: aandacht, makkelijker, moeilijker, 
        progressie, teamVariaties, doelgroepen, categorieen,
        tekening: tekeningBasis 
    };

    if (editOefeningId) window.oefeningenDB = window.oefeningenDB.map(o => o.id === editOefeningId ? oefeningData : o);
    else window.oefeningenDB.push(oefeningData);

    localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
    window.resetOefeningFormulier();
    window.renderOefeningenLijst();
};

window.toggleFavorietenFilter = function() {
    filterAlleenFavorieten = !filterAlleenFavorieten;
    let btn = document.getElementById('btn-filter-fav');
    if (filterAlleenFavorieten) {
        btn.style.background = '#f1c40f'; btn.style.color = 'white'; btn.innerText = "⭐ Favorieten (AAN)";
    } else {
        btn.style.background = 'white'; btn.style.color = '#f1c40f'; btn.innerText = "⭐ Toon Favorieten";
    }
    window.renderOefeningenLijst();
};

window.toggleFavoriet = function(id) {
    let oef = window.oefeningenDB.find(o => o.id === id);
    if(oef) {
        oef.isFavoriet = !oef.isFavoriet;
        localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
        window.renderOefeningenLijst();
    }
};

window.renderOefeningenLijst = function() {
    // ---- DE AUTO-FIXER (Repareert oude oefeningen tijdelijk in het geheugen) ----
    window.oefeningenDB.forEach(o => {
        if (!o.id) o.id = 'oef_' + Date.now() + Math.floor(Math.random() * 10000);
        if (!o.naam) o.naam = "Naamloze Oefening";
        if (!Array.isArray(o.categorieen)) o.categorieen = [];
        
        if (o.aantalSpelers && o.minSpelers === undefined) {
            o.groepering = o.aantalSpelers; 
            let match = String(o.aantalSpelers).match(/\d+/);
            o.minSpelers = match ? parseInt(match[0]) : 1;
        }
        if (o.minSpelers === undefined || o.minSpelers === null) o.minSpelers = 1;
        if (o.isFavoriet === undefined) o.isFavoriet = false;
    });
    // -----------------------------------------------------------------------------

    const grid = document.getElementById('oefeningen-grid');
    const zoekterm = document.getElementById('zoek-oefening') ? document.getElementById('zoek-oefening').value.toLowerCase().trim() : "";
    if(!grid) return; grid.innerHTML = '';

    const countEl = document.getElementById('dash-oef-count'); 
    if(countEl) countEl.innerText = window.oefeningenDB.length;

    let gefilterd = window.oefeningenDB.filter(o => {
        if (filterAlleenFavorieten && !o.isFavoriet) return false;
        let catText = o.categorieen.join(' ').toLowerCase();
        return (!zoekterm) || o.naam.toLowerCase().includes(zoekterm) || catText.includes(zoekterm);
    });

    if(gefilterd.length === 0) { grid.innerHTML = '<p style="color:#7f8c8d; font-style:italic; grid-column: 1 / -1;">Geen oefeningen gevonden...</p>'; return; }

    gefilterd.sort((a,b) => a.naam.localeCompare(b.naam)).forEach((oef) => {
        let catTags = ''; if(oef.categorieen) oef.categorieen.forEach(c => catTags += `<span style="background:#3498db; color:white; font-size:0.75rem; padding:2px 6px; border-radius:4px; margin-right:5px; margin-bottom:5px; display:inline-block;">${c}</span>`);
        let favIcoon = oef.isFavoriet ? '⭐' : '☆';
        let opstellingTekst = oef.groepering ? oef.groepering : 'Vrij';
        
        let div = document.createElement('div');
        div.style.cssText = "background:white; border:1px solid var(--border-color); border-radius:8px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 2px 4px rgba(0,0,0,0.05);";
        
        div.innerHTML = `
            <div style="background:#f8f9fa; padding:15px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 style="margin:0; font-size:1.1rem; color:var(--secondary-color);">${oef.naam}</h3>
                <button onclick="window.toggleFavoriet('${oef.id}')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;" title="Maak favoriet">${favIcoon}</button>
            </div>
            <div style="padding:15px; flex:1;">
                <div style="margin-bottom:10px;">${catTags}</div>
                <div style="color:#7f8c8d; font-size:0.9rem; margin-bottom:10px;">⏱ ${oef.duur} min | 👥 Min. ${oef.minSpelers} | 📋 ${opstellingTekst}</div>
            </div>
            <div style="padding:10px 15px; background:#fcfcfc; border-top:1px solid #eee; display:flex; gap:5px; flex-wrap:wrap;">
                <button onclick="window.openOefeningPopup('${oef.id}')" style="flex:2; background:#3498db; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">👁️ Bekijk</button>
                <button onclick="window.bewerkOefening('${oef.id}')" style="flex:1; background:#f39c12; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Bewerken">✏️</button>
                <button onclick="window.dupliceerOefening('${oef.id}')" style="flex:1; background:#2c3e50; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Kopieer oefening">📄</button>
                <button onclick="window.printOefening('${oef.id}')" style="flex:1; background:#95a5a6; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;" title="Print naar PDF">🖨️</button>
                <button onclick="window.verwijderOefening('${oef.id}')" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;" title="Verwijder">X</button>
            </div>
        `;
        grid.appendChild(div);
    });
};

window.dupliceerOefening = function(id) {
    let bronOef = window.oefeningenDB.find(o => o.id === id);
    if(!bronOef) return;
    
    let nieuweOef = JSON.parse(JSON.stringify(bronOef));
    nieuweOef.id = 'oef_' + Date.now() + Math.floor(Math.random() * 1000);
    nieuweOef.naam = bronOef.naam + " (Kopie)";
    nieuweOef.isFavoriet = false;

    window.oefeningenDB.push(nieuweOef);
    localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
    window.renderOefeningenLijst();
    window.bewerkOefening(nieuweOef.id);
};

window.printOefening = function(id) {
    let oef = window.oefeningenDB.find(o => o.id === id);
    if(!oef) return;

    let imgHtml = oef.tekening ? `<img src="${oef.tekening}" style="max-width:100%; border:2px solid #333; border-radius:8px; margin-top:20px;">` : '';
    let aandachtHtml = oef.aandachtspunten ? `<h3>💡 Aandachtspunten</h3><p style="white-space:pre-wrap;">${oef.aandachtspunten}</p>` : '';
    let makHtml = oef.makkelijker ? `<div style="padding:10px; border-left:4px solid #27ae60; background:#f0fbf4; margin-bottom:10px;"><strong>🟢 Makkelijker:</strong> ${oef.makkelijker}</div>` : '';
    let moeiHtml = oef.moeilijker ? `<div style="padding:10px; border-left:4px solid #e74c3c; background:#fdedec;"><strong>🔴 Moeilijker:</strong> ${oef.moeilijker}</div>` : '';

    let printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${oef.naam} - Black Shots</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                h1 { color: #2c3e50; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                h3 { color: #2980b9; margin-top: 20px; }
                .meta { color: #7f8c8d; font-weight: bold; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <h1>🏀 ${oef.naam}</h1>
            <div class="meta">⏱ ${oef.duur} min | 👥 Min. ${oef.minSpelers} (${oef.groepering || 'Vrij'}) | 🎒 Spullen: ${oef.spullen || '-'}</div>
            
            <div style="display:flex; gap:20px; align-items:flex-start;">
                <div style="flex:1;">
                    <h3>📝 Uitleg</h3>
                    <p style="white-space:pre-wrap;">${oef.uitleg || 'Geen uitleg opgegeven.'}</p>
                    ${aandachtHtml}
                    ${makHtml}
                    ${moeiHtml}
                </div>
                <div style="flex:1; text-align:center;">
                    ${imgHtml}
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};

window.openOefeningPopup = function(id) {
    let oef = window.oefeningenDB.find(o => o.id === id);
    if(!oef) return;

    let modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
    let huidigeWeekIndex = 0;

    function renderModalInhoud() {
        let isLeerlijn = oef.progressie && oef.progressie.length > 0;
        let weekData = isLeerlijn ? (typeof oef.progressie[huidigeWeekIndex] === 'string' ? oef.progressie[huidigeWeekIndex] : oef.progressie[huidigeWeekIndex].tekst) : "Geen leerlijn beschikbaar.";
        let weekImg = isLeerlijn ? (typeof oef.progressie[huidigeWeekIndex] === 'object' ? oef.progressie[huidigeWeekIndex].tekening : null) : null;
        let finalImg = weekImg || oef.tekening;

        let videoBtn = oef.videoLink ? `<a href="${oef.videoLink}" target="_blank" style="display:inline-block; background:#e74c3c; color:white; padding:8px 12px; border-radius:4px; text-decoration:none; font-weight:bold; margin-bottom:15px;">▶️ Bekijk Video</a>` : '';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:800px; width:95%; padding:0; background:white; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; max-height:90vh;">
                <div style="background:#2c3e50; color:white; padding:15px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0; font-size:1.4rem;">${oef.naam}</h2>
                    <div>
                        <button onclick="window.printOefening('${oef.id}')" style="background:#ecf0f1; color:#2c3e50; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; margin-right:10px;">🖨️ Print</button>
                        <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
                    </div>
                </div>
                
                <div style="padding:20px; overflow-y:auto; flex:1;">
                    <div style="color:#7f8c8d; font-weight:bold; margin-bottom:15px; font-size:0.9rem;">⏱ ${oef.duur} min | 👥 Min. ${oef.minSpelers} (${oef.groepering || 'Vrij'}) | 🎒 ${oef.spullen || 'Geen extra spullen'}</div>
                    ${videoBtn}
                    
                    <div style="display:grid; grid-template-columns: ${finalImg ? '1fr 1fr' : '1fr'}; gap:20px;">
                        <div>
                            <h4 style="margin-top:0; color:#2980b9;">📝 Uitleg</h4>
                            <p style="white-space:pre-wrap; margin-bottom:15px;">${oef.uitleg || '-'}</p>
                            
                            ${oef.aandachtspunten ? `<h4 style="margin-top:0; color:#d35400;">💡 Aandachtspunten</h4><p style="white-space:pre-wrap; margin-bottom:15px;">${oef.aandachtspunten}</p>` : ''}
                            
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                ${oef.makkelijker ? `<div style="background:#f0fbf4; border-left:4px solid #27ae60; padding:10px; border-radius:4px;"><strong>🟢 Makkelijker:</strong><br>${oef.makkelijker}</div>` : ''}
                                ${oef.moeilijker ? `<div style="background:#fdf2e9; border-left:4px solid #e67e22; padding:10px; border-radius:4px;"><strong>🔴 Moeilijker:</strong><br>${oef.moeilijker}</div>` : ''}
                            </div>
                        </div>
                        
                        ${finalImg ? `
                        <div style="display:flex; justify-content:center; align-items:flex-start;">
                            <img src="${finalImg}" style="max-width:100%; border-radius:8px; border:2px solid #bdc3c7;">
                        </div>` : ''}
                    </div>

                    ${isLeerlijn ? `
                        <div style="background:#fdf2e9; padding:15px; border-radius:6px; margin-top:20px; border:1px solid #f39c12;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <button onclick="window.changeWeek(-1)" ${huidigeWeekIndex === 0 ? 'disabled' : ''} style="padding:6px 12px; cursor:pointer;">◀ Vorige</button>
                                <strong>Week ${huidigeWeekIndex + 1} van ${oef.progressie.length}</strong>
                                <button onclick="window.changeWeek(1)" ${huidigeWeekIndex === oef.progressie.length - 1 ? 'disabled' : ''} style="padding:6px 12px; cursor:pointer;">Volgende ▶</button>
                            </div>
                            <p style="white-space:pre-wrap;">${weekData}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    window.changeWeek = function(richting) { huidigeWeekIndex += richting; renderModalInhoud(); };
    renderModalInhoud();
    document.body.appendChild(modal);
};

window.verwijderOefening = function(id) {
    if(confirm("Weet je zeker dat je deze oefening wilt verwijderen?")) {
        window.oefeningenDB = window.oefeningenDB.filter(o => o.id !== id);
        localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
        window.renderOefeningenLijst();
    }
};

window.bewerkOefening = function(id) {
    let oef = window.oefeningenDB.find(o => o.id === id);
    if(!oef) return;

    editOefeningId = oef.id;
    document.getElementById('form-titel').innerText = "✏️ Oefening Bewerken";
    document.getElementById('opslaan-btn').innerText = "💾 Wijzigingen Opslaan";
    document.getElementById('opslaan-btn').style.background = "#f39c12";
    document.getElementById('annuleer-btn').style.display = "block";

    document.getElementById('oef-naam').value = oef.naam || '';
    document.getElementById('oef-duur').value = oef.duur || '';
    document.getElementById('oef-min-spelers').value = oef.minSpelers || '';
    document.getElementById('oef-groepering').value = oef.groepering || '';
    document.getElementById('oef-spullen').value = oef.spullen || '';
    document.getElementById('oef-video').value = oef.videoLink || '';
    document.getElementById('oef-uitleg').value = oef.uitleg || '';
    document.getElementById('oef-aandacht').value = oef.aandachtspunten || '';
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
        if (Array.isArray(oef.teamVariaties)) {
            oef.teamVariaties.forEach(varData => window.voegTeamVariatieToe(varData.teams || [], varData.tekst || "", varData.tekening || ""));
        } else {
            Object.keys(oef.teamVariaties).forEach(tId => {
                let varData = oef.teamVariaties[tId];
                let txt = typeof varData === 'string' ? varData : varData.tekst;
                let img = typeof varData === 'object' ? varData.tekening : '';
                window.voegTeamVariatieToe([tId], txt, img);
            });
        }
    }

    window.vulDynamischeFormulieren();
    document.querySelectorAll('.doel-cb').forEach(cb => { cb.checked = (oef.doelgroepen && oef.doelgroepen.includes(cb.value)); });
    document.querySelectorAll('.cat-cb').forEach(cb => { cb.checked = (oef.categorieen && oef.categorieen.includes(cb.value)); });

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.resetOefeningFormulier = function() {
    editOefeningId = null;
    document.getElementById('form-titel').innerText = "✨ Nieuwe Oefening Toevoegen";
    document.getElementById('opslaan-btn').innerText = "💾 Oefening Opslaan in Bibliotheek";
    document.getElementById('opslaan-btn').style.background = "#27ae60";
    document.getElementById('annuleer-btn').style.display = "none";

    document.getElementById('oef-naam').value = ''; document.getElementById('oef-duur').value = '';
    document.getElementById('oef-min-spelers').value = ''; document.getElementById('oef-groepering').value = ''; 
    document.getElementById('oef-spullen').value = '';
    document.getElementById('oef-video').value = ''; document.getElementById('oef-uitleg').value = '';
    document.getElementById('oef-aandacht').value = ''; document.getElementById('oef-makkelijker').value = '';
    document.getElementById('oef-moeilijker').value = ''; 
    
    let basisBtn = document.getElementById('btn-teken-basis');
    basisBtn.dataset.tekening = ''; basisBtn.style.background = '#2c3e50';

    document.getElementById('progressie-container').innerHTML = ''; document.getElementById('team-variaties-container').innerHTML = '';
    document.querySelectorAll('.doel-cb').forEach(cb => cb.checked = false); document.querySelectorAll('.cat-cb').forEach(cb => cb.checked = false);
};

window.importeerOefening = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            let nieuweOefeningen = Array.isArray(data) ? data : [data];
            let toegevoegd = 0;
            nieuweOefeningen.forEach(nieuweOef => {
                if (nieuweOef.naam && nieuweOef.duur) {
                    nieuweOef.id = 'oef_' + Date.now() + Math.floor(Math.random() * 1000);
                    window.oefeningenDB.push(nieuweOef);
                    toegevoegd++;
                }
            });
            if (toegevoegd > 0) {
                localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
                window.renderOefeningenLijst();
                alert(`🏀 Succes! ${toegevoegd} oefening(en) toegevoegd aan je bibliotheek.`);
            } else { alert("Dit bestand bevat geen geldige oefening(en)."); }
        } catch (err) { alert("Fout bij het inlezen van bestand."); console.error(err); }
        event.target.value = '';
    };
    reader.readAsText(file);
};

// --- NIEUWE FUNCTIE: Sla alles handmatig op ---
window.syncAlleOefeningen = function() {
    if(confirm("Weet je zeker dat je alle oefeningen opnieuw wilt opslaan en synchroniseren met de cloud? Dit repareert permanent ontbrekende velden bij oude oefeningen.")) {
        localStorage.setItem('blackshots_oefeningen', JSON.stringify(window.oefeningenDB));
        alert("✅ Alle oefeningen zijn succesvol gerepareerd en gesynchroniseerd met de cloud!");
        window.renderOefeningenLijst();
    }
};