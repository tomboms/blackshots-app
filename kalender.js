// --- KALENDER, DAGPLANNER EN SLIMME DOBBELSTEEN LOGICA ---

window.getIsoDatumS = function(dateObj) {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 10);
    return localISOTime;
}

let huidigeDatum = new Date();
let agendaWeergave = 'week';

window.setAgendaWeergave = function(val) { agendaWeergave = val; window.renderAgenda(); }

window.schoonPlanningOp = function() {
    let gewijzigd = false;
    for (const [datum, data] of Object.entries(weekPlanning)) {
        let isLeeg = true;
        ['ontbijt', 'lunch', 'diner', 'extra'].forEach(m => {
            if (data[m]) {
                if (data[m].type === 'Samen' && data[m].samenRecept && data[m].samenRecept.trim() !== '') isLeeg = false;
                if (data[m].type === 'Apart' && ((data[m].tomRecept && data[m].tomRecept.trim() !== '') || (data[m].ikeRecept && data[m].ikeRecept.trim() !== ''))) isLeeg = false;
                if (data[m].samenNotitie || data[m].tomNotitie || data[m].ikeNotitie) isLeeg = false;
            }
        });
        if (isLeeg) { delete weekPlanning[datum]; gewijzigd = true; }
    }
    if(gewijzigd) localStorage.setItem('avondeet_planning', JSON.stringify(weekPlanning));
}

window.renderAgenda = function() {
    window.schoonPlanningOp(); 
    const container = document.getElementById('agenda-container'); const titel = document.getElementById('agenda-titel');
    if(!container) return; container.innerHTML = '';
    
    let startDatum = new Date(huidigeDatum); startDatum.setHours(0,0,0,0);
    
    if (agendaWeergave === 'week') {
        const dagVanDeWeek = startDatum.getDay() === 0 ? 6 : startDatum.getDay() - 1;
        startDatum.setDate(startDatum.getDate() - dagVanDeWeek);
        let eindDatum = new Date(startDatum); eindDatum.setDate(eindDatum.getDate() + 6);
        titel.innerText = `Week: ${startDatum.toLocaleDateString('nl-NL', {day:'numeric', month:'short'})} - ${eindDatum.toLocaleDateString('nl-NL', {day:'numeric', month:'short'})}`;
        
        container.style.gridTemplateColumns = 'repeat(7, 1fr)';
        for (let i = 0; i < 7; i++) {
            let loopDatum = new Date(startDatum); loopDatum.setDate(loopDatum.getDate() + i);
            container.appendChild(maakDagKaart(loopDatum));
        }
    } else {
        startDatum.setDate(1);
        const maandNaam = startDatum.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
        titel.innerText = maandNaam.charAt(0).toUpperCase() + maandNaam.slice(1);
        
        container.style.gridTemplateColumns = 'repeat(7, 1fr)';
        const startDagGrid = startDatum.getDay() === 0 ? 6 : startDatum.getDay() - 1;
        const dagenHeader = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
        dagenHeader.forEach(d => { const h = document.createElement('div'); h.innerText = d; h.style.fontWeight = 'bold'; h.style.textAlign = 'center'; h.style.padding = '5px 0'; container.appendChild(h); });
        for(let i = 0; i < startDagGrid; i++) { const leeg = document.createElement('div'); container.appendChild(leeg); }
        const dagenInMaand = new Date(startDatum.getFullYear(), startDatum.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= dagenInMaand; i++) { let loopDatum = new Date(startDatum.getFullYear(), startDatum.getMonth(), i); container.appendChild(maakKleineDagKaart(loopDatum)); }
    }
}

document.getElementById('agenda-prev-btn')?.addEventListener('click', () => { if (agendaWeergave === 'week') huidigeDatum.setDate(huidigeDatum.getDate() - 7); else huidigeDatum.setMonth(huidigeDatum.getMonth() - 1); window.renderAgenda(); });
document.getElementById('agenda-next-btn')?.addEventListener('click', () => { if (agendaWeergave === 'week') huidigeDatum.setDate(huidigeDatum.getDate() + 7); else huidigeDatum.setMonth(huidigeDatum.getMonth() + 1); window.renderAgenda(); });
document.getElementById('agenda-vandaag-btn')?.addEventListener('click', () => { huidigeDatum = new Date(); window.renderAgenda(); });

function getReceptNaam(id) {
    if(!id) return "-";
    if(id.startsWith('status_')) return `<em>[${id.replace('status_', '')}]</em>`;
    if(id.startsWith('kliekje_')) return `<span style="color:#8e44ad; font-weight:bold;">🥣 ${id.replace('kliekje_', '')}</span>`;
    const r = receptenDB.find(x => x.id === id); return r ? r.naam : "-";
}

function maakKleineDagKaart(datum) {
    const isoDatum = window.getIsoDatumS(datum); const pl = weekPlanning[isoDatum] || {};
    const div = document.createElement('div'); const isVandaag = isoDatum === window.getIsoDatumS(new Date());
    div.className = `dag-kaart ${isVandaag ? 'vandaag' : ''}`; div.style.cursor = 'pointer'; div.style.padding = '5px'; div.onclick = () => window.openDagPlanner(isoDatum);

    let contentHtml = ''; const mt = [ {k:'ontbijt', l:'🍞'}, {k:'lunch', l:'🥪'}, {k:'diner', l:'🍽️'}, {k:'extra', l:'🍰'} ];
    mt.forEach(m => {
        if(pl[m.k]) {
            if(pl[m.k].type === 'Samen') {
                if(pl[m.k].samenRecept) contentHtml += `<div style="font-size:0.7rem; color:#bdc3c7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">${m.l} ${getReceptNaam(pl[m.k].samenRecept)}</div>`;
            } else {
                let p1 = pl[m.k].tomRecept ? `👨‍🍳` : ''; let p2 = pl[m.k].ikeRecept ? `👩‍🍳` : '';
                if(p1 || p2) contentHtml += `<div style="font-size:0.7rem; color:#bdc3c7; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">${m.l} ${p1}${p2}</div>`;
            }
        }
    });
    div.innerHTML = `<div style="font-weight:bold; font-size:1rem; margin-bottom:5px; text-align:center; color:var(--text-main);">${datum.getDate()}</div>${contentHtml}`; return div;
}

function maakDagKaart(datum) {
    const isoDatum = window.getIsoDatumS(datum); const pl = weekPlanning[isoDatum] || {};
    const div = document.createElement('div'); const isVandaag = isoDatum === window.getIsoDatumS(new Date());
    div.className = `dag-kaart ${isVandaag ? 'vandaag' : ''}`; div.style.background = 'var(--card-bg)'; div.style.borderLeft = '4px solid var(--primary-color)'; div.style.borderRadius = '6px'; div.style.padding = '12px'; div.style.cursor = 'pointer'; div.onclick = () => window.openDagPlanner(isoDatum);
    const dgn = ['ZO','MA','DI','WO','DO','VR','ZA']; const titel = `${dgn[datum.getDay()]} <span style="font-size:0.85rem; font-weight:normal; color:#7f8c8d;">${String(datum.getDate()).padStart(2,'0')}-${String(datum.getMonth()+1).padStart(2,'0')}</span>`;

    let contentHtml = ''; const mt = [ {k:'ontbijt', l:'🍞 Ontbijt'}, {k:'lunch', l:'🥪 Lunch'}, {k:'diner', l:'🍽️ Diner'}, {k:'extra', l:'🍰 Extra'} ];
    mt.forEach(m => {
        if(m.k === 'ontbijt' && !appInstellingen.toonOntbijt) return; if(m.k === 'lunch' && !appInstellingen.toonLunch) return;
        let subHtml = `<div style="color: #7f8c8d; font-size: 0.85rem; font-style:italic; margin-top:2px;">Niets gepland</div>`;
        if(pl[m.k]) {
            if(pl[m.k].type === 'Samen') {
                if(pl[m.k].samenRecept) { let rNaam = getReceptNaam(pl[m.k].samenRecept); subHtml = `<div style="font-weight:bold; color:var(--text-main); font-size:0.9rem; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${rNaam}</div>`; }
            } else {
                let p1 = pl[m.k].tomRecept ? `<div style="color:#3498db; font-weight:bold; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">T: ${getReceptNaam(pl[m.k].tomRecept)}</div>` : '';
                let p2 = pl[m.k].ikeRecept ? `<div style="color:#9b59b6; font-weight:bold; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">I: ${getReceptNaam(pl[m.k].ikeRecept)}</div>` : '';
                if(p1 || p2) subHtml = `<div style="display:flex; flex-direction:column; margin-top:2px;">${p1}${p2}</div>`;
            }
        }
        contentHtml += `<div style="margin-bottom:10px;"><div style="font-size:0.8rem; color:#bdc3c7; font-weight:bold;">${m.l}</div>${subHtml}</div>`;
    });
    div.innerHTML = `<h3 style="color:var(--primary-color); margin:0 0 10px 0; font-size:1.1rem; border-bottom:1px dotted var(--border-color); padding-bottom:8px;">${titel}</h3>${contentHtml}`; return div;
}

let actieveDagPlannerDatum = null;
window.openDagPlanner = function(isoDatum) {
    if(!isoDatum) isoDatum = window.getIsoDatumS(new Date()); actieveDagPlannerDatum = isoDatum;
    if (!weekPlanning[isoDatum]) { weekPlanning[isoDatum] = { ontbijt: { type: 'Samen', samenRecept: '', tomRecept: '', ikeRecept: '' }, lunch: { type: 'Samen', samenRecept: '', tomRecept: '', ikeRecept: '' }, diner: { type: 'Samen', samenRecept: '', tomRecept: '', ikeRecept: '' }, extra: { type: 'Samen', samenRecept: '', tomRecept: '', ikeRecept: '' } }; } 
    else { ['ontbijt', 'lunch', 'diner', 'extra'].forEach(m => { if(!weekPlanning[isoDatum][m]) weekPlanning[isoDatum][m] = { type: 'Samen', samenRecept: '', tomRecept: '', ikeRecept: '' }; }); }
    window.switchTab('dagplanner');
}

window.filterPlannerSelect = function(inputEl, selectId) {
    let term = inputEl.value; let selectEl = document.getElementById('select_' + selectId); if(!selectEl) return;
    let huidigeWaarde = selectEl.value; selectEl.innerHTML = genereerReceptOpties(huidigeWaarde, term);
}

window.renderDagPlanner = function() {
    if (!actieveDagPlannerDatum) { actieveDagPlannerDatum = window.getIsoDatumS(new Date()); }
    if (!weekPlanning[actieveDagPlannerDatum]) window.openDagPlanner(actieveDagPlannerDatum);
    
    const pl = weekPlanning[actieveDagPlannerDatum]; const container = document.getElementById('dagplanner-container'); if(!container) return; container.innerHTML = '';
    let d = new Date(actieveDagPlannerDatum); const dgn = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
    document.getElementById('dagplanner-titel').innerText = `${dgn[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('nl-NL', {month:'long'})}`;

    const mt = [ {k:'ontbijt', l:'🍞 Ontbijt'}, {k:'lunch', l:'🥪 Lunch'}, {k:'diner', l:'🍽️ Avondeten'}, {k:'extra', l:'🍰 Extra / Snack'} ];

    mt.forEach(m => {
        if(m.k === 'ontbijt' && !appInstellingen.toonOntbijt) return; if(m.k === 'lunch' && !appInstellingen.toonLunch) return;

        const blok = document.createElement('div');
        blok.style.background = 'var(--card-bg)'; blok.style.padding = '20px'; blok.style.borderRadius = '8px'; blok.style.marginBottom = '20px'; blok.style.borderLeft = '4px solid var(--primary-color)'; blok.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
        
        let typeSelect = `<select onchange="window.veranderMaaltijdType('${m.k}', this.value)" style="margin:0; font-weight:bold; background:var(--input-bg); color:var(--text-main); border:1px solid var(--border-color); padding:5px; border-radius:4px;"><option value="Samen" ${pl[m.k].type === 'Samen' ? 'selected' : ''}>Samen eten</option><option value="Apart" ${pl[m.k].type === 'Apart' ? 'selected' : ''}>Apart eten</option></select>`;
        
        let contentHtml = '';
        if (pl[m.k].type === 'Samen') {
            contentHtml = `
            <div style="display:flex; gap:10px; align-items:flex-start; margin-top:15px; flex-wrap:wrap;">
                <div style="flex:3; min-width:200px;">
                    <label style="color:var(--text-main); font-weight:bold; margin-bottom:5px; display:block;">Kies Gerecht / Status:</label>
                    <input type="text" placeholder="🔎 Typ om te zoeken..." onkeyup="window.filterPlannerSelect(this, '${m.k}_samen')" style="width:100%; box-sizing:border-box; margin-bottom:5px; padding:6px; font-size:0.85rem; border-radius:4px; border:1px solid var(--border-color);">
                    <div style="display:flex; gap:5px;">
                        <select id="select_${m.k}_samen" onchange="window.updateDagPlannerVeld('${m.k}', 'samenRecept', this.value)" style="width:100%;">${genereerReceptOpties(pl[m.k].samenRecept)}</select>
                        <button onclick="window.kiesSlimmeDobbelsteen('${actieveDagPlannerDatum}', '${m.k}', 'samen')" title="Hulp bij kiezen!" style="background:#8e44ad; color:white; border:none; border-radius:4px; padding:0 10px; cursor:pointer; font-size:1.2rem;">🎲</button>
                    </div>
                </div>
                <div style="flex:1; min-width:100px;">
                    <label style="color:var(--text-main); font-weight:bold; margin-bottom:5px; display:block;">Notitie:</label>
                    <input type="text" placeholder="Bijv. Restjes opmaken..." value="${pl[m.k].samenNotitie || ''}" onchange="window.updateDagPlannerVeld('${m.k}', 'samenNotitie', this.value)" style="width:100%;">
                </div>
            </div>`;
        } else {
            contentHtml = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-top:15px;">
                <div style="background:var(--li-bg); padding:10px; border-radius:6px; border-left: 3px solid #3498db;">
                    <strong style="color:#3498db; display:block; margin-bottom:5px;">Voor Tom</strong>
                    <input type="text" placeholder="🔎 Zoek..." onkeyup="window.filterPlannerSelect(this, '${m.k}_tom')" style="width:100%; box-sizing:border-box; margin-bottom:5px; padding:6px; font-size:0.85rem; border-radius:4px; border:1px solid var(--border-color);">
                    <div style="display:flex; gap:5px; margin-bottom:10px;">
                        <select id="select_${m.k}_tom" onchange="window.updateDagPlannerVeld('${m.k}', 'tomRecept', this.value)" style="width:100%;">${genereerReceptOpties(pl[m.k].tomRecept)}</select>
                        <button onclick="window.kiesSlimmeDobbelsteen('${actieveDagPlannerDatum}', '${m.k}', 'tom')" style="background:#3498db; color:white; border:none; border-radius:4px; padding:0 8px; cursor:pointer;">🎲</button>
                    </div>
                    <input type="text" placeholder="Notitie Tom..." value="${pl[m.k].tomNotitie || ''}" onchange="window.updateDagPlannerVeld('${m.k}', 'tomNotitie', this.value)" style="width:100%;">
                </div>
                <div style="background:var(--li-bg); padding:10px; border-radius:6px; border-left: 3px solid #9b59b6;">
                    <strong style="color:#9b59b6; display:block; margin-bottom:5px;">Voor Ike</strong>
                    <input type="text" placeholder="🔎 Zoek..." onkeyup="window.filterPlannerSelect(this, '${m.k}_ike')" style="width:100%; box-sizing:border-box; margin-bottom:5px; padding:6px; font-size:0.85rem; border-radius:4px; border:1px solid var(--border-color);">
                    <div style="display:flex; gap:5px; margin-bottom:10px;">
                        <select id="select_${m.k}_ike" onchange="window.updateDagPlannerVeld('${m.k}', 'ikeRecept', this.value)" style="width:100%;">${genereerReceptOpties(pl[m.k].ikeRecept)}</select>
                        <button onclick="window.kiesSlimmeDobbelsteen('${actieveDagPlannerDatum}', '${m.k}', 'ike')" style="background:#9b59b6; color:white; border:none; border-radius:4px; padding:0 8px; cursor:pointer;">🎲</button>
                    </div>
                    <input type="text" placeholder="Notitie Ike..." value="${pl[m.k].ikeNotitie || ''}" onchange="window.updateDagPlannerVeld('${m.k}', 'ikeNotitie', this.value)" style="width:100%;">
                </div>
            </div>`;
        }
        blok.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--border-color); padding-bottom:10px;"><h3 style="margin:0; color:var(--primary-color);">${m.l}</h3>${typeSelect}</div>${contentHtml}`;
        container.appendChild(blok);
    });
}

function genereerReceptOpties(geselecteerdeWaarde, zoekterm = "") {
    let html = `<option value="">-- Kies of zoek --</option>`;
    let term = zoekterm.toLowerCase().trim();

    let statussen = statussenLijst.filter(s => !term || s.toLowerCase().includes(term));
    if(statussen.length > 0) {
        html += `<optgroup label="📋 Speciale Statussen">`;
        statussen.forEach(s => { html += `<option value="status_${s}" ${geselecteerdeWaarde === 'status_'+s ? 'selected' : ''}>[Status] ${s}</option>`; });
        html += `</optgroup>`;
    }
    
    // NIEUW: Laat beschikbare kliekjes ALTIJD zien, ook als hij leeg is.
    let actueleVoorraad = window.voorraadDB || JSON.parse(localStorage.getItem('avondeet_voorraad')) || [];
    let kliekjes = actueleVoorraad.filter(v => v.isKliekje && (!term || v.naam.toLowerCase().includes(term)));
    
    html += `<optgroup label="🥣 Beschikbare Kliekjes">`;
    if(kliekjes.length > 0) {
        kliekjes.forEach(k => {
            let val = `kliekje_${k.naam}`;
            html += `<option value="${val}" ${geselecteerdeWaarde === val ? 'selected' : ''}>${k.naam} (${k.aantal} porties over)</option>`;
        });
    } else {
        if(!term) html += `<option disabled>Geen kliekjes in koelkast/vriezer</option>`;
    }
    html += `</optgroup>`;
    
    let recepten = receptenDB.filter(r => !term || (r.naam && r.naam.toLowerCase().includes(term)));
    if(recepten.length > 0) {
        html += `<optgroup label="📖 Mijn Gerechten">`;
        recepten.sort((a,b) => a.naam.localeCompare(b.naam)).forEach(r => { html += `<option value="${r.id}" ${geselecteerdeWaarde === r.id ? 'selected' : ''}>${r.naam}</option>`; });
        html += `</optgroup>`;
    }
    return html;
}

window.veranderMaaltijdType = function(maaltijd, type) { weekPlanning[actieveDagPlannerDatum][maaltijd].type = type; window.slaPlanningOp(); window.renderDagPlanner(); }
window.updateDagPlannerVeld = function(maaltijd, veld, waarde) { weekPlanning[actieveDagPlannerDatum][maaltijd][veld] = waarde; window.slaPlanningOp(); }

window.slaPlanningOp = function() {
    window.schoonPlanningOp(); 
    localStorage.setItem('avondeet_planning', JSON.stringify(weekPlanning));
    const melding = document.getElementById('opslaan-melding'); if(melding) { melding.classList.add('toon'); setTimeout(() => melding.classList.remove('toon'), 2000); }
}

document.getElementById('dag-prev-btn')?.addEventListener('click', () => { 
    if(!actieveDagPlannerDatum) actieveDagPlannerDatum = window.getIsoDatumS(new Date());
    let d = new Date(actieveDagPlannerDatum); d.setDate(d.getDate() - 1); window.openDagPlanner(window.getIsoDatumS(d)); 
});
document.getElementById('dag-next-btn')?.addEventListener('click', () => { 
    if(!actieveDagPlannerDatum) actieveDagPlannerDatum = window.getIsoDatumS(new Date());
    let d = new Date(actieveDagPlannerDatum); d.setDate(d.getDate() + 1); window.openDagPlanner(window.getIsoDatumS(d)); 
});

window.kopieerVorigeWeek = function() {
    if (!confirm("Weet je zeker dat je het plan van precies 7 dagen geleden wilt kopiëren naar de aankomende 7 dagen? (Bestaande planning in die dagen wordt overschreven!)")) return;
    let startDatum = new Date(); startDatum.setHours(0,0,0,0);
    for (let i = 0; i < 7; i++) {
        let bronDatum = new Date(startDatum); bronDatum.setDate(bronDatum.getDate() - 7 + i);
        let doelDatum = new Date(startDatum); doelDatum.setDate(doelDatum.getDate() + i);
        let bronIso = window.getIsoDatumS(bronDatum); let doelIso = window.getIsoDatumS(doelDatum);
        if (weekPlanning[bronIso]) weekPlanning[doelIso] = JSON.parse(JSON.stringify(weekPlanning[bronIso]));
        else weekPlanning[doelIso] = { ontbijt:{type:'Samen'}, lunch:{type:'Samen'}, diner:{type:'Samen'}, extra:{type:'Samen'} };
    }
    localStorage.setItem('avondeet_planning', JSON.stringify(weekPlanning)); window.renderAgenda(); alert("Week succesvol gekopieerd!");
}

window.renderDashboardDrieDagen = function() {
    const container = document.getElementById('dashboard-3daagse-container'); if(!container) return; container.innerHTML = '';
    const vandaag = new Date();
    for(let i=0; i<3; i++) {
        let d = new Date(vandaag); d.setDate(vandaag.getDate() + i);
        const isoDatum = window.getIsoDatumS(d); const pl = weekPlanning[isoDatum] || {};
        let label = i===0 ? "Vandaag" : (i===1 ? "Morgen" : "Overmorgen");
        
        const div = document.createElement('div'); div.style.background = 'var(--card-bg)'; div.style.padding = '15px'; div.style.borderRadius = '8px'; div.style.borderTop = `4px solid ${i===0?'#e74c3c':'#3498db'}`; div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        
        let dHtml = '<p style="color:#7f8c8d; margin:0; font-style:italic;">Nog niet gepland</p>';
        if(pl.diner) {
            if(pl.diner.type === 'Samen' && pl.diner.samenRecept) dHtml = `<p style="margin:0; font-weight:bold; color:#e67e22;">🍽️ ${getReceptNaam(pl.diner.samenRecept)}</p>`;
            else if(pl.diner.type === 'Apart') {
                let t = pl.diner.tomRecept ? `👨‍🍳 ${getReceptNaam(pl.diner.tomRecept)}` : '';
                let ik = pl.diner.ikeRecept ? `👩‍🍳 ${getReceptNaam(pl.diner.ikeRecept)}` : '';
                if(t||ik) dHtml = `<div style="font-size:0.9rem;">${t ? `<div style="color:#3498db; margin-bottom:3px;">${t}</div>`:''}${ik ? `<div style="color:#9b59b6;">${ik}</div>`:''}</div>`;
            }
        }
        div.innerHTML = `<h3 style="margin-top:0; margin-bottom:10px; color:var(--text-main); font-size:1.1rem; border-bottom:1px dashed var(--border-color); padding-bottom:5px;">${label} <span style="font-size:0.8rem; font-weight:normal; color:#7f8c8d;">(${d.toLocaleDateString('nl-NL',{weekday:'short'})})</span></h3>${dHtml}`;
        div.style.cursor = 'pointer'; div.onclick = () => window.openDagPlanner(isoDatum);
        container.appendChild(div);
    }
}