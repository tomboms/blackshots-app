// --- DATABASE BEHEER LOGICA (INCL. ZOEKFUNCTIES EN TAGS) ---

const veiligeWinkelLijst = typeof winkelLijst !== 'undefined' ? winkelLijst : (typeof winkelsLijst !== 'undefined' ? winkelsLijst : []);

window.tagsLijst = JSON.parse(localStorage.getItem('avondeet_tags')) || [
    {naam: 'Pasta', isStijl: true}, {naam: 'Rijst', isStijl: true}, 
    {naam: 'AVG', isStijl: true}, {naam: 'Soep', isStijl: true},
    {naam: 'Snel', isStijl: false}, {naam: 'Makkelijk', isStijl: false}, {naam: 'Goedkoop', isStijl: false}
];

function vulDynamischeDropdowns() {
    const arrays = [
        { lijst: veiligeWinkelLijst, elementId: 'db-ing-winkel' }, { lijst: categorieLijst, elementId: 'db-ing-categorie' },
        { lijst: categorieLijst, elementId: 'handmatig-categorie' }, { lijst: eenhedenLijst, elementId: 'db-ing-eenheid' },
        { lijst: gezinsLijst, elementId: 'handmatig-wie' }, { lijst: gezinsLijst, elementId: 'extra-db-wie' },
        { lijst: apparatuurLijst, elementId: 'nieuwe-apparatuur-naam' }
    ];
    arrays.forEach(({ lijst, elementId }) => {
        const selectElement = document.getElementById(elementId);
        if (selectElement && selectElement.tagName === 'SELECT') {
            selectElement.innerHTML = '';
            const veiligeLijst = Array.isArray(lijst) ? lijst : []; 
            veiligeLijst.forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; selectElement.appendChild(option); });
            if(elementId === 'handmatig-wie' || elementId === 'extra-db-wie') {
                const samenOpt = document.createElement('option'); samenOpt.value = 'Samen'; samenOpt.textContent = 'Samen';
                selectElement.insertBefore(samenOpt, selectElement.firstChild); selectElement.value = 'Samen';
            }
        }
    });
    if (typeof renderApparatuurCheckboxes === 'function') renderApparatuurCheckboxes();
    renderReceptTagsCheckboxes();
}

function renderApparatuurCheckboxes() {
    const container = document.getElementById('apparatuur-checkboxes-container');
    if (!container) return; container.innerHTML = '';
    apparatuurLijst.forEach(app => {
        const label = document.createElement('label'); label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '5px';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = app; checkbox.className = 'recept-apparatuur-cb';
        checkbox.addEventListener('change', () => {
            if(app.toLowerCase().includes('oven')) document.getElementById('oven-extras').style.display = checkbox.checked ? 'flex' : 'none';
            if(app.toLowerCase().includes('airfryer')) document.getElementById('airfryer-extras').style.display = checkbox.checked ? 'flex' : 'none';
        });
        label.appendChild(checkbox); label.appendChild(document.createTextNode(app)); container.appendChild(label);
    });
}

function renderReceptTagsCheckboxes() {
    const container = document.getElementById('recept-tags-container');
    if (!container) return; container.innerHTML = '';
    window.tagsLijst.forEach(tag => {
        const label = document.createElement('label'); label.style.display = 'flex'; label.style.alignItems = 'center'; label.style.gap = '5px';
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = tag.naam; checkbox.className = 'recept-tags-cb';
        label.appendChild(checkbox); 
        let badge = tag.isStijl ? `<span style="background:#e74c3c; color:white; font-size:0.6rem; padding:1px 4px; border-radius:10px;">Stijl</span>` : '';
        label.innerHTML += `<span>${tag.naam} ${badge}</span>`;
        container.appendChild(label);
    });
}

// Aangepast zodat hij beide selects in het formulier kan updaten
window.updateSelectMetIngredienten = function(selectId, zoekterm = "") {
    const select = document.getElementById(selectId); if (!select) return;
    let huidigeSelectie = select.value; 
    
    if (selectId === 'recept-ing-alt-select') {
        select.innerHTML = '<option value="">-- Geen alternatief --</option>';
    } else {
        select.innerHTML = '<option value="">-- Selecteer product --</option>';
    }

    let term = zoekterm.toLowerCase().trim();
    const gesorteerd = [...ingredientenDB].sort((a,b) => a.naam.localeCompare(b.naam));
    
    gesorteerd.forEach(ing => {
        let n = ing.naam ? ing.naam.toLowerCase() : ""; let m = ing.merk ? ing.merk.toLowerCase() : "";
        if (term && !n.includes(term) && !m.includes(term)) return; 
        const option = document.createElement('option');
        option.value = ing.id; option.textContent = `${ing.naam} (${ing.merk || 'Merkloos'}) - ${ing.verpAantal}${ing.eenheid}`;
        select.appendChild(option);
    });
    if(huidigeSelectie && Array.from(select.options).some(o => o.value === huidigeSelectie)) select.value = huidigeSelectie;
}

// --- INGREDIËNTEN BEHEER ---
let actieveVerpakkingRij = 1;
document.getElementById('voeg-formaat-toe-btn')?.addEventListener('click', () => {
    actieveVerpakkingRij++;
    const rij = document.getElementById(`verpakking-optie-${actieveVerpakkingRij}`); if (rij) rij.style.display = 'flex';
    if (actieveVerpakkingRij >= 5) document.getElementById('voeg-formaat-toe-btn').style.display = 'none';
});

document.getElementById('sla-ing-op-btn')?.addEventListener('click', () => {
    const id = document.getElementById('sla-ing-op-btn').dataset.editId;
    const naam = document.getElementById('db-ing-naam').value.trim();
    const winkel = document.getElementById('db-ing-winkel').value;
    const merk = document.getElementById('db-ing-merk').value.trim();
    const categorie = document.getElementById('db-ing-categorie').value;
    const soort = document.getElementById('db-ing-soort').value;
    const locatie = document.getElementById('db-ing-locatie').value; 
    const houdbaarheid = parseInt(document.getElementById('db-ing-houdbaarheid').value) || 0; 
    const eenheid = document.getElementById('db-ing-eenheid').value;
    const verpAantal = parseFloat(document.getElementById('db-ing-verpakking-aantal').value);
    const verpPrijs = parseFloat(document.getElementById('db-ing-verpakking-prijs').value);

    if (!naam || !verpAantal || !verpPrijs) return alert("Vul minimaal de naam, grootte en prijs van optie 1 in.");

    const ingData = {
        id: id || 'ing_' + Date.now(), naam, winkel, merk, categorie, soort, locatie, houdbaarheid, eenheid, verpAantal, verpPrijs,
        verpAantal2: parseFloat(document.getElementById('db-ing-verpakking-aantal2').value) || null, verpPrijs2: parseFloat(document.getElementById('db-ing-verpakking-prijs2').value) || null,
        verpAantal3: parseFloat(document.getElementById('db-ing-verpakking-aantal3').value) || null, verpPrijs3: parseFloat(document.getElementById('db-ing-verpakking-prijs3').value) || null,
        verpAantal4: parseFloat(document.getElementById('db-ing-verpakking-aantal4').value) || null, verpPrijs4: parseFloat(document.getElementById('db-ing-verpakking-prijs4').value) || null,
        verpAantal5: parseFloat(document.getElementById('db-ing-verpakking-aantal5').value) || null, verpPrijs5: parseFloat(document.getElementById('db-ing-verpakking-prijs5').value) || null
    };

    if (id) { ingredientenDB = ingredientenDB.map(i => i.id === id ? ingData : i); } else { ingredientenDB.push(ingData); }
    localStorage.setItem('avondeet_ingredienten', JSON.stringify(ingredientenDB));
    resetIngFormulier(); 
    if(document.getElementById('zoek-ingredient')) window.filterIngredienten(); else renderIngredientenLijst(); 
    updateSelectMetIngredienten('recept-ing-select'); 
    updateSelectMetIngredienten('recept-ing-alt-select'); 
    updateSelectMetIngredienten('extra-db-select');
});

window.filterIngredienten = function() {
    let term = document.getElementById('zoek-ingredient') ? document.getElementById('zoek-ingredient').value : "";
    renderIngredientenLijst(term);
}

function renderIngredientenLijst(zoekterm = "") {
    const lijst = document.getElementById('ingredienten-lijst'); if(!lijst) return; lijst.innerHTML = '';
    
    let filterTerm = zoekterm.toLowerCase().trim();
    let gefilterdeLijst = ingredientenDB.filter(i => {
        if (!filterTerm) return true;
        let n = i.naam ? i.naam.toLowerCase() : ""; let m = i.merk ? i.merk.toLowerCase() : "";
        return n.includes(filterTerm) || m.includes(filterTerm);
    });

    gefilterdeLijst.sort((a,b) => a.naam.localeCompare(b.naam)).forEach(ing => {
        let opBewaard = ing.locatie || (ing.soort === 'Vers' ? 'Koelkast' : 'Voorraadkast');
        let locIcon = opBewaard === 'Diepvries' ? '🧊' : (opBewaard === 'Koelkast' ? '❄️' : '🥫');
        const soortTag = ing.soort === 'Vers' ? `<span style="color:#27ae60; font-weight:bold; font-size:0.8rem;">🥬 Vers (${ing.houdbaarheid ? ing.houdbaarheid + 'd' : '?'}) | ${locIcon} ${opBewaard}</span>` : `<span style="color:#7f8c8d; font-weight:bold; font-size:0.8rem;">🥫 Houdbaar (${ing.houdbaarheid ? ing.houdbaarheid + 'd' : '∞'}) | ${locIcon} ${opBewaard}</span>`;
        const li = document.createElement('li');
        li.innerHTML = `<span><strong>${ing.naam}</strong> (${ing.merk}) <br>${soortTag} <br>${ing.verpAantal}${ing.eenheid} à €${ing.verpPrijs.toFixed(2)}</span>
            <div class="actie-knoppen"><button class="edit-btn" onclick="bewerkIngredient('${ing.id}')">✏️</button><button class="delete-btn" onclick="verwijderIngredient('${ing.id}')">X</button></div>`;
        lijst.appendChild(li);
    });
    if (gefilterdeLijst.length === 0 && ingredientenDB.length > 0) lijst.innerHTML = `<p style="color:#7f8c8d; font-style:italic;">Geen producten gevonden voor "${zoekterm}"...</p>`;
}

window.verwijderIngredient = function(id) { if(confirm("Product verwijderen?")) { ingredientenDB = ingredientenDB.filter(i => i.id !== id); localStorage.setItem('avondeet_ingredienten', JSON.stringify(ingredientenDB)); window.filterIngredienten(); updateSelectMetIngredienten('recept-ing-select'); updateSelectMetIngredienten('recept-ing-alt-select'); updateSelectMetIngredienten('extra-db-select'); } }

window.bewerkIngredient = function(id) {
    const ing = ingredientenDB.find(i => i.id === id); if(!ing) return;
    document.getElementById('ing-form-titel').innerText = "Product Bewerken"; document.getElementById('sla-ing-op-btn').dataset.editId = ing.id;
    document.getElementById('sla-ing-op-btn').innerText = "Wijzigingen Opslaan"; document.getElementById('annuleer-ing-edit-btn').style.display = 'block';

    document.getElementById('db-ing-naam').value = ing.naam; document.getElementById('db-ing-winkel').value = ing.winkel;
    document.getElementById('db-ing-merk').value = ing.merk; document.getElementById('db-ing-categorie').value = ing.categorie;
    document.getElementById('db-ing-soort').value = ing.soort || 'Houdbaar'; 
    document.getElementById('db-ing-locatie').value = ing.locatie || (ing.soort === 'Vers' ? 'Koelkast' : 'Voorraadkast');
    document.getElementById('db-ing-houdbaarheid').value = ing.houdbaarheid || '';
    document.getElementById('db-ing-eenheid').value = ing.eenheid; document.getElementById('db-ing-verpakking-aantal').value = ing.verpAantal; document.getElementById('db-ing-verpakking-prijs').value = ing.verpPrijs;

    actieveVerpakkingRij = 1;
    [2,3,4,5].forEach(num => {
        const vA = ing[`verpAantal${num}`]; const vP = ing[`verpPrijs${num}`];
        document.getElementById(`db-ing-verpakking-aantal${num}`).value = vA || ''; document.getElementById(`db-ing-verpakking-prijs${num}`).value = vP || '';
        if(vA && vP) { document.getElementById(`verpakking-optie-${num}`).style.display = 'flex'; actieveVerpakkingRij = num; } else { document.getElementById(`verpakking-optie-${num}`).style.display = 'none'; }
    });
    document.getElementById('voeg-formaat-toe-btn').style.display = actieveVerpakkingRij >= 5 ? 'none' : 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.getElementById('annuleer-ing-edit-btn')?.addEventListener('click', resetIngFormulier);

function resetIngFormulier() {
    document.getElementById('ing-form-titel').innerText = "Nieuw Product aan Database Toevoegen"; document.getElementById('sla-ing-op-btn').dataset.editId = "";
    document.getElementById('sla-ing-op-btn').innerText = "Opslaan in Database"; document.getElementById('annuleer-ing-edit-btn').style.display = 'none';
    document.getElementById('db-ing-naam').value = ''; document.getElementById('db-ing-merk').value = '';
    document.getElementById('db-ing-soort').value = 'Houdbaar'; document.getElementById('db-ing-locatie').value = 'Voorraadkast'; document.getElementById('db-ing-houdbaarheid').value = '';
    document.getElementById('db-ing-verpakking-aantal').value = ''; document.getElementById('db-ing-verpakking-prijs').value = '';
    [2,3,4,5].forEach(num => { document.getElementById(`db-ing-verpakking-aantal${num}`).value = ''; document.getElementById(`db-ing-verpakking-prijs${num}`).value = ''; document.getElementById(`verpakking-optie-${num}`).style.display = 'none'; });
    actieveVerpakkingRij = 1; document.getElementById('voeg-formaat-toe-btn').style.display = 'block';
}

// --- GERECHTEN BEHEER (MET ALTERNATIEVEN) ---
let tijdelijkeIngredienten = []; let tijdelijkeStappen = [];

document.getElementById('voeg-ing-toe-btn')?.addEventListener('click', () => {
    const ingId = document.getElementById('recept-ing-select').value; 
    const altId = document.getElementById('recept-ing-alt-select').value; 
    const aantal = parseFloat(document.getElementById('recept-ing-aantal').value);
    
    if (!ingId || !aantal) return alert("Selecteer een product en vul de benodigde hoeveelheid in.");
    
    // Voeg alternatief toe als het geselecteerd is (en niet toevallig hetzelfde is als het hoofdingrediënt)
    let alternatieven = (altId && altId !== ingId) ? [altId] : [];
    
    tijdelijkeIngredienten.push({ ingId, aantal, alternatieven }); 
    renderTijdelijkeIngredienten();
    
    document.getElementById('zoek-recept-ing').value = ''; 
    window.updateSelectMetIngredienten('recept-ing-select', '');
    window.updateSelectMetIngredienten('recept-ing-alt-select', '');
    document.getElementById('recept-ing-aantal').value = ''; 
    document.getElementById('recept-ing-eenheid-label').innerText = '';
});

function renderTijdelijkeIngredienten() {
    const lijst = document.getElementById('tijdelijke-ingredienten-lijst'); lijst.innerHTML = '';
    tijdelijkeIngredienten.forEach((ing, index) => {
        const dbIng = ingredientenDB.find(i => i.id === ing.ingId); if(!dbIng) return;
        
        let altTekst = '';
        if (ing.alternatieven && ing.alternatieven.length > 0) {
            let altNamen = ing.alternatieven.map(altId => {
                let dbAlt = ingredientenDB.find(i => i.id === altId);
                return dbAlt ? dbAlt.naam : '';
            }).filter(n => n !== '').join(', ');
            if (altNamen) altTekst = `<br><small style="color:#e67e22;">🔄 Alternatief: ${altNamen}</small>`;
        }

        const li = document.createElement('li'); 
        li.innerHTML = `<span>${ing.aantal} ${dbIng.eenheid} <strong>${dbIng.naam}</strong> ${altTekst}</span> <button class="delete-btn" type="button" onclick="verwijderTijdelijkIngredient(${index})">X</button>`;
        lijst.appendChild(li);
    });
}
window.verwijderTijdelijkIngredient = function(index) { tijdelijkeIngredienten.splice(index, 1); renderTijdelijkeIngredienten(); }

document.getElementById('voeg-stap-toe-btn')?.addEventListener('click', () => { tijdelijkeStappen.push({ beschrijving: "", tijd: "" }); renderStappenForm(); });
window.renderStappenForm = function() {
    const container = document.getElementById('recept-stappen-container'); container.innerHTML = '';
    tijdelijkeStappen.forEach((stap, index) => {
        const div = document.createElement('div'); div.style.display = 'flex'; div.style.gap = '10px'; div.style.alignItems = 'flex-start'; div.style.marginBottom = '5px';
        div.innerHTML = `<textarea placeholder="Beschrijf stap ${index + 1}..." style="flex:3; resize:vertical; min-height:60px;" onchange="tijdelijkeStappen[${index}].beschrijving = this.value">${stap.beschrijving}</textarea>
            <div style="flex:1; display:flex; flex-direction:column; gap:5px;"><input type="text" placeholder="Tijd (bijv. 5 min)" value="${stap.tijd || ''}" onchange="tijdelijkeStappen[${index}].tijd = this.value">
            <button type="button" class="delete-btn" onclick="verwijderStap(${index})" style="width:100%;">Verwijder Stap</button></div>`;
        container.appendChild(div);
    });
}
window.verwijderStap = function(index) { tijdelijkeStappen.splice(index, 1); renderStappenForm(); }

document.getElementById('sla-recept-op-btn')?.addEventListener('click', () => {
    const id = document.getElementById('sla-recept-op-btn').dataset.editId; const naam = document.getElementById('recept-naam').value.trim(); const standaardPersonen = parseInt(document.getElementById('recept-personen').value) || appInstellingen.personen;
    if (!naam) return alert("Geef het gerecht een naam!"); if (tijdelijkeIngredienten.length === 0) return alert("Voeg minimaal één product toe.");

    let geselecteerdeApparatuur = []; document.querySelectorAll('.recept-apparatuur-cb:checked').forEach(cb => geselecteerdeApparatuur.push(cb.value));
    let geselecteerdeTags = []; document.querySelectorAll('.recept-tags-cb:checked').forEach(cb => geselecteerdeTags.push(cb.value));

    const receptData = {
        id: id || 'rec_' + Date.now(), naam, standaardPersonen, ingredienten: tijdelijkeIngredienten,
        tijd: parseInt(document.getElementById('recept-tijd').value) || 20, moeilijkheid: parseInt(document.getElementById('recept-moeilijkheid').value) || 2, snijwerk: document.getElementById('recept-snijwerk').value, waardering: parseInt(document.getElementById('recept-waardering').value) || 4,
        tags: geselecteerdeTags, apparatuur: geselecteerdeApparatuur, ovenGraden: document.getElementById('recept-oven-graden').value || null, airfryerGraden: document.getElementById('recept-airfryer-graden').value || null, airfryerTijd: document.getElementById('recept-airfryer-tijd').value || null, instructies: tijdelijkeStappen
    };

    if (id) { receptenDB = receptenDB.map(r => r.id === id ? receptData : r); } else { receptenDB.push(receptData); }
    localStorage.setItem('avondeet_recepten', JSON.stringify(receptenDB)); resetReceptFormulier(); window.filterRecepten();
});

window.filterRecepten = function() {
    let term = document.getElementById('zoek-recept') ? document.getElementById('zoek-recept').value : "";
    renderReceptenLijst(term);
}

function renderReceptenLijst(zoekterm = "") {
    const lijst = document.getElementById('recepten-database-lijst'); if(!lijst) return; lijst.innerHTML = '';
    let filterTerm = zoekterm.toLowerCase().trim();
    let gefilterdeLijst = receptenDB.filter(r => { if (!filterTerm) return true; return r.naam ? r.naam.toLowerCase().includes(filterTerm) : false; });

    gefilterdeLijst.sort((a,b) => a.naam.localeCompare(b.naam)).forEach(r => { 
        const li = document.createElement('li'); 
        li.innerHTML = `<span><strong>${r.naam}</strong> (⏱${r.tijd || 20}m | ⭐${r.waardering || 4})</span>
        <div class="actie-knoppen">
            <button class="edit-btn" onclick="window.leesRecept('${r.id}')" title="Bekijk Recept" style="background:#3498db;">👁️</button>
            <button class="edit-btn" onclick="window.openPlanRecept('${r.id}')" title="Plan dit gerecht in" style="background:#27ae60;">📅</button>
            <button class="edit-btn" onclick="kloonRecept('${r.id}')" title="Kopieer dit gerecht" style="background:#8e44ad;">🐑</button>
            <button class="edit-btn" onclick="bewerkRecept('${r.id}')">✏️</button>
            <button class="delete-btn" onclick="verwijderRecept('${r.id}')">X</button>
        </div>`; 
        lijst.appendChild(li); 
    });
    if (gefilterdeLijst.length === 0 && receptenDB.length > 0) lijst.innerHTML = `<p style="color:#7f8c8d; font-style:italic;">Geen gerechten gevonden voor "${zoekterm}"...</p>`;
}

window.leesRecept = function(id) {
    const r = receptenDB.find(x => x.id === id); if(!r) return;
    document.getElementById('lees-recept-naam').innerText = r.naam; const tagsDiv = document.getElementById('lees-recept-tags'); tagsDiv.innerHTML = '';
    tagsDiv.innerHTML += `<span style="background:#f39c12; color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:bold;">⏱ ${r.tijd || 20}m</span>`;
    tagsDiv.innerHTML += `<span style="background:#9b59b6; color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:bold;">⭐ ${r.waardering || 4}/5</span>`;
    if(r.tags && r.tags.length > 0) r.tags.forEach(t => tagsDiv.innerHTML += `<span style="background:#34495e; color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem;">🏷️ ${t}</span>`);

    const ingLijst = document.getElementById('lees-recept-ing'); ingLijst.innerHTML = '';
    r.ingredienten.forEach(ingRef => {
        const dbIng = ingredientenDB.find(i => i.id === ingRef.ingId); if(!dbIng) return;
        
        let altTekst = '';
        if (ingRef.alternatieven && ingRef.alternatieven.length > 0) {
            let altNamen = ingRef.alternatieven.map(altId => {
                let dbAlt = ingredientenDB.find(i => i.id === altId);
                return dbAlt ? dbAlt.naam : '';
            }).filter(n => n !== '').join(', ');
            if (altNamen) altTekst = ` <span style="color:#e67e22; font-size:0.9rem;">(of ${altNamen})</span>`;
        }

        ingLijst.innerHTML += `<li style="padding:4px 0; border-bottom:1px solid rgba(0,0,0,0.05);"><strong>${ingRef.aantal} ${dbIng.eenheid}</strong> ${dbIng.naam}${altTekst}</li>`;
    });

    const stappenDiv = document.getElementById('lees-recept-stappen'); stappenDiv.innerHTML = '';
    if(r.instructies && r.instructies.length > 0) {
        r.instructies.forEach((stap, index) => {
            let beschrijving = typeof stap === 'string' ? stap : stap.beschrijving;
            let tijd = stap.tijd ? `<span style="color:#e67e22; font-weight:bold; font-size:0.9rem;">(⏱ ${stap.tijd})</span>` : '';
            stappenDiv.innerHTML += `<div style="background:var(--card-bg); padding:10px; border-radius:6px; border:1px solid var(--border-color);"><strong style="color:var(--primary-color);">Stap ${index+1}:</strong> ${beschrijving} ${tijd}</div>`;
        });
    } else stappenDiv.innerHTML = `<p style="font-style:italic; color:#7f8c8d;">Geen instructies toegevoegd.</p>`;
    document.getElementById('bekijk-recept-modal').style.display = 'flex';
}

let planReceptActueelId = null;
window.openPlanRecept = function(id) {
    const r = receptenDB.find(x => x.id === id); if(!r) return;
    planReceptActueelId = id; document.getElementById('plan-recept-naam').innerText = `Gerecht: ${r.naam}`;
    document.getElementById('plan-recept-datum').value = window.getIsoDatumS(new Date()); document.getElementById('plan-recept-modal').style.display = 'flex';
}
window.bevestigPlanRecept = function() {
    if(!planReceptActueelId) return;
    const datum = document.getElementById('plan-recept-datum').value; const maaltijd = document.getElementById('plan-recept-maaltijd').value;
    if(!datum) return alert("Kies een datum.");
    if (!weekPlanning[datum]) weekPlanning[datum] = {};
    if (!weekPlanning[datum][maaltijd]) weekPlanning[datum][maaltijd] = { type: 'Samen', samenRecept: '', tomRecept: '', ikeRecept: '', samenNotitie: '', tomNotitie: '', ikeNotitie: '' };
    weekPlanning[datum][maaltijd].type = 'Samen'; weekPlanning[datum][maaltijd].samenRecept = planReceptActueelId;
    localStorage.setItem('avondeet_planning', JSON.stringify(weekPlanning));
    document.getElementById('plan-recept-modal').style.display = 'none'; alert("Succesvol in de agenda set!");
    if(typeof window.switchTab === 'function') window.switchTab('agenda');
}

window.kloonRecept = function(id) {
    const origineel = receptenDB.find(r => r.id === id); if(!origineel) return;
    const kloon = JSON.parse(JSON.stringify(origineel)); kloon.id = 'rec_' + Date.now(); kloon.naam = kloon.naam + " (Kopie)"; 
    receptenDB.push(kloon); localStorage.setItem('avondeet_recepten', JSON.stringify(receptenDB)); window.filterRecepten(); bewerkRecept(kloon.id); 
}
window.verwijderRecept = function(id) { if(confirm("Gerecht verwijderen?")) { receptenDB = receptenDB.filter(r => r.id !== id); localStorage.setItem('avondeet_recepten', JSON.stringify(receptenDB)); window.filterRecepten(); } }

window.bewerkRecept = function(id) {
    const r = receptenDB.find(x => x.id === id); if(!r) return;
    document.getElementById('recept-form-titel').innerText = "Gerecht Bewerken"; document.getElementById('sla-recept-op-btn').dataset.editId = r.id; document.getElementById('sla-recept-op-btn').innerText = "Wijzigingen Opslaan"; document.getElementById('annuleer-edit-btn').style.display = 'block';
    document.getElementById('recept-naam').value = r.naam; document.getElementById('recept-personen').value = r.standaardPersonen; document.getElementById('recept-tijd').value = r.tijd || 20; document.getElementById('recept-moeilijkheid').value = r.moeilijkheid || 2; document.getElementById('recept-snijwerk').value = r.snijwerk || 'Gemiddeld'; document.getElementById('recept-waardering').value = r.waardering || 4;
    document.querySelectorAll('.recept-tags-cb').forEach(cb => { cb.checked = (r.tags && r.tags.includes(cb.value)); });
    document.querySelectorAll('.recept-apparatuur-cb').forEach(cb => { cb.checked = (r.apparatuur && r.apparatuur.includes(cb.value)); });
    const hasOven = r.apparatuur && r.apparatuur.some(a => a.toLowerCase().includes('oven')); const hasAirfryer = r.apparatuur && r.apparatuur.some(a => a.toLowerCase().includes('airfryer'));
    document.getElementById('oven-extras').style.display = hasOven ? 'flex' : 'none'; document.getElementById('airfryer-extras').style.display = hasAirfryer ? 'flex' : 'none';
    document.getElementById('recept-oven-graden').value = r.ovenGraden || ''; document.getElementById('recept-airfryer-graden').value = r.airfryerGraden || ''; document.getElementById('recept-airfryer-tijd').value = r.airfryerTijd || '';
    tijdelijkeIngredienten = [...r.ingredienten]; renderTijdelijkeIngredienten();
    tijdelijkeStappen = Array.isArray(r.instructies) ? [...r.instructies].map(s => typeof s === 'string' ? {beschrijving: s, tijd: ""} : s) : []; renderStappenForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.getElementById('annuleer-edit-btn')?.addEventListener('click', resetReceptFormulier);

function resetReceptFormulier() {
    document.getElementById('recept-form-titel').innerText = "Nieuw Gerecht Toevoegen"; document.getElementById('sla-recept-op-btn').dataset.editId = ""; document.getElementById('sla-recept-op-btn').innerText = "Gerecht Opslaan"; document.getElementById('annuleer-edit-btn').style.display = 'none';
    document.getElementById('recept-naam').value = ''; document.getElementById('recept-personen').value = appInstellingen.personen; document.getElementById('recept-tijd').value = 20; document.getElementById('recept-moeilijkheid').value = 2;
    document.querySelectorAll('.recept-tags-cb').forEach(cb => cb.checked = false); document.querySelectorAll('.recept-apparatuur-cb').forEach(cb => cb.checked = false);
    document.getElementById('oven-extras').style.display = 'none'; document.getElementById('airfryer-extras').style.display = 'none';
    tijdelijkeIngredienten = []; renderTijdelijkeIngredienten(); tijdelijkeStappen = []; renderStappenForm();
}

// --- INSTELLINGEN BEHEER ---
if(appInstellingen.toonOntbijt === undefined) appInstellingen.toonOntbijt = true; if(appInstellingen.toonLunch === undefined) appInstellingen.toonLunch = true;
const chkOntbijt = document.getElementById('inst-toon-ontbijt'); const chkLunch = document.getElementById('inst-toon-lunch');
if(chkOntbijt) { chkOntbijt.checked = appInstellingen.toonOntbijt; chkOntbijt.addEventListener('change', (e) => { appInstellingen.toonOntbijt = e.target.checked; localStorage.setItem('avondeet_instellingen', JSON.stringify(appInstellingen)); }); }
if(chkLunch) { chkLunch.checked = appInstellingen.toonLunch; chkLunch.addEventListener('change', (e) => { appInstellingen.toonLunch = e.target.checked; localStorage.setItem('avondeet_instellingen', JSON.stringify(appInstellingen)); }); }

document.getElementById('toggle-theme-btn')?.addEventListener('click', () => { appInstellingen.darkMode = !appInstellingen.darkMode; localStorage.setItem('avondeet_instellingen', JSON.stringify(appInstellingen));
    if(appInstellingen.darkMode) { document.body.classList.add('dark-mode'); document.getElementById('toggle-theme-btn').innerText = "☀️ Schakel Light Mode in"; } 
    else { document.body.classList.remove('dark-mode'); document.getElementById('toggle-theme-btn').innerText = "🌙 Schakel Dark Mode in"; }
});
document.getElementById('inst-personen')?.addEventListener('change', (e) => { appInstellingen.personen = parseInt(e.target.value) || 2; localStorage.setItem('avondeet_instellingen', JSON.stringify(appInstellingen)); document.getElementById('recept-personen').value = appInstellingen.personen; });

function voegToeAanLijst(lijst, inputId, opslagKey, renderFunc) { const val = document.getElementById(inputId).value.trim(); if (val && !lijst.includes(val)) { lijst.push(val); localStorage.setItem(opslagKey, JSON.stringify(lijst)); document.getElementById(inputId).value = ''; renderFunc(); vulDynamischeDropdowns(); } }
function verwijderVanLijst(lijst, index, opslagKey, renderFunc) { lijst.splice(index, 1); localStorage.setItem(opslagKey, JSON.stringify(lijst)); renderFunc(); vulDynamischeDropdowns(); }
function renderInstellingenLijst(lijst, elementId, verwijderFuncNaam) { const el = document.getElementById(elementId); if (!el) return; el.innerHTML = ''; const veiligeLijst = Array.isArray(lijst) ? lijst : []; veiligeLijst.forEach((item, index) => { const li = document.createElement('li'); li.innerHTML = `<span>${item}</span><button class="delete-btn" onclick="${verwijderFuncNaam}(${index})">X</button>`; el.appendChild(li); }); }

const lijstenConfig = [
    { id: 'gezin', lijst: gezinsLijst, key: 'avondeet_gezin' }, { id: 'apparatuur', lijst: apparatuurLijst, key: 'avondeet_apparatuur' },
    { id: 'winkel', lijst: veiligeWinkelLijst, key: 'avondeet_winkels' }, { id: 'status', lijst: statussenLijst, key: 'avondeet_statussen' },
    { id: 'eenheid', targetId: 'eenheden-instellingen-lijst', lijst: eenhedenLijst, key: 'avondeet_eenheden' }, { id: 'categorie', lijst: categorieLijst, key: 'avondeet_categorieen' }
];

lijstenConfig.forEach(config => {
    const capId = config.id.charAt(0).toUpperCase() + config.id.slice(1); const listId = config.targetId || `${config.id}-instellingen-lijst`;
    window[`render${capId}Lijst`] = function() { renderInstellingenLijst(config.lijst, listId, `verwijder${capId}`); };
    window[`verwijder${capId}`] = function(index) { verwijderVanLijst(config.lijst, index, config.key, window[`render${capId}Lijst`]); };
    const inputId = config.id === 'gezin' ? 'nieuw-gezin-naam' : `nieuwe-${config.id}-naam`;
    const btn = document.getElementById(`voeg-${config.id}-toe-btn`); if(btn) btn.addEventListener('click', () => voegToeAanLijst(config.lijst, inputId, config.key, window[`render${capId}Lijst`]));
    window[`render${capId}Lijst`]();
});

window.renderTagsInstellingen = function() {
    const el = document.getElementById('tags-instellingen-lijst'); if(!el) return; el.innerHTML = '';
    window.tagsLijst.forEach((tag, index) => {
        const li = document.createElement('li');
        let badge = tag.isStijl ? `<span style="background:#e74c3c; color:white; font-size:0.7rem; padding:2px 6px; border-radius:10px;">Stijl</span>` : '';
        li.innerHTML = `<span>${tag.naam} ${badge}</span><button class="delete-btn" onclick="window.verwijderTag(${index})">X</button>`;
        el.appendChild(li);
    });
}
window.voegTagToe = function() {
    const naam = document.getElementById('nieuwe-tag-naam').value.trim(); const isStijl = document.getElementById('nieuwe-tag-isStijl').checked;
    if(naam && !window.tagsLijst.some(t => t.naam === naam)) { window.tagsLijst.push({naam, isStijl}); localStorage.setItem('avondeet_tags', JSON.stringify(window.tagsLijst)); document.getElementById('nieuwe-tag-naam').value = ''; document.getElementById('nieuwe-tag-isStijl').checked = false; window.renderTagsInstellingen(); renderReceptTagsCheckboxes(); }
}
window.verwijderTag = function(index) { window.tagsLijst.splice(index, 1); localStorage.setItem('avondeet_tags', JSON.stringify(window.tagsLijst)); window.renderTagsInstellingen(); renderReceptTagsCheckboxes(); }
window.renderTagsInstellingen();

// --- EXPORT / IMPORT / CSV ---
document.getElementById('export-btn')?.addEventListener('click', () => {
    const exportData = { tags: window.tagsLijst, recepten: receptenDB, ingredienten: ingredientenDB, planning: weekPlanning, instellingen: appInstellingen, gezin: gezinsLijst, apparatuur: apparatuurLijst, winkels: veiligeWinkelLijst, statussen: statussenLijst, eenheden: eenhedenLijst, categorieen: categorieLijst, handmatig: typeof handmatigeBoodschappen !== 'undefined' ? handmatigeBoodschappen : [], extraDBItems: typeof extraDBItems !== 'undefined' ? extraDBItems : [] };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2)); const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `maaltijdplanner_backup_${Date.now()}.json`); document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
});
document.getElementById('import-btn')?.addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file')?.addEventListener('change', (event) => {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData && (importedData.recepten || importedData.ingredienten)) {
                if(importedData.tags) localStorage.setItem('avondeet_tags', JSON.stringify(importedData.tags)); if(importedData.recepten) localStorage.setItem('avondeet_recepten', JSON.stringify(importedData.recepten)); if(importedData.ingredienten) localStorage.setItem('avondeet_ingredienten', JSON.stringify(importedData.ingredienten)); if(importedData.planning) localStorage.setItem('avondeet_planning', JSON.stringify(importedData.planning)); if(importedData.handmatig) localStorage.setItem('avondeet_handmatig', JSON.stringify(importedData.handmatig)); if(importedData.extraDBItems) localStorage.setItem('avondeet_extra_db_items', JSON.stringify(importedData.extraDBItems));
                const combiInst = { ...appInstellingen, ...(importedData.instellingen || {}) }; localStorage.setItem('avondeet_instellingen', JSON.stringify(combiInst));
                if(importedData.gezin) localStorage.setItem('avondeet_gezin', JSON.stringify(importedData.gezin)); if(importedData.apparatuur) localStorage.setItem('avondeet_apparatuur', JSON.stringify(importedData.apparatuur)); if(importedData.winkels) localStorage.setItem('avondeet_winkels', JSON.stringify(importedData.winkels)); if(importedData.statussen) localStorage.setItem('avondeet_statussen', JSON.stringify(importedData.statussen)); if(importedData.eenheden) localStorage.setItem('avondeet_eenheden', JSON.stringify(importedData.eenheden)); if(importedData.categorieen) localStorage.setItem('avondeet_categorieen', JSON.stringify(importedData.categorieen));
                alert("Database succesvol geïmporteerd! De app laadt nu opnieuw in met al je oude data."); location.reload();
            } else alert("Ongeldig back-up bestand.");
        } catch (err) { alert("Fout bij het inlezen van het bestand."); console.error(err); }
    }; reader.readAsText(file);
});
document.getElementById('download-csv-btn')?.addEventListener('click', () => { const csvContent = "Naam;Winkel;Merk;Categorie;Soort (Vers of Houdbaar);Houdbaarheid in dagen;Eenheid;Standaard Grootte (Aantal);Prijs\nHalfvolle Melk;Albert Heijn;Campina;Zuivel, Eieren & Boter;Vers;7;ml;1000;1.09\n"; const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(blob)); link.setAttribute("download", "Producten_Sjabloon.csv"); document.body.appendChild(link); link.click(); document.body.removeChild(link); });
document.getElementById('upload-csv-btn')?.addEventListener('click', () => document.getElementById('csv-file-input').click());
document.getElementById('csv-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (event) => {
        const regels = event.target.result.split('\n'); let toegevoegd = 0; const scheiding = event.target.result.includes(';') ? ';' : ',';
        for (let i = 1; i < regels.length; i++) {
            const kolommen = regels[i].trim().split(scheiding);
            if (kolommen.length >= 9 && kolommen[0].trim()) { ingredientenDB.push({ id: 'ing_' + Date.now() + Math.random().toString(36).substr(2, 5), naam: kolommen[0].trim(), winkel: kolommen[1].trim() || 'Overig', merk: kolommen[2].trim() || '', categorie: kolommen[3].trim() || 'Overig', soort: kolommen[4].trim() === 'Vers' ? 'Vers' : 'Houdbaar', locatie: kolommen[4].trim() === 'Vers' ? 'Koelkast' : 'Voorraadkast', houdbaarheid: parseInt(kolommen[5]) || 0, eenheid: kolommen[6].trim() || 'stuks', verpAantal: parseFloat(kolommen[7].replace(',', '.')) || 1, verpPrijs: parseFloat(kolommen[8].replace(',', '.')) || 0 }); toegevoegd++; }
        }
        if (toegevoegd > 0) { localStorage.setItem('avondeet_ingredienten', JSON.stringify(ingredientenDB)); window.filterIngredienten(); updateSelectMetIngredienten('recept-ing-select'); updateSelectMetIngredienten('extra-db-select'); alert(`🎉 Succes! ${toegevoegd} producten geïmporteerd.`); } else alert("Niets toegevoegd.");
        e.target.value = '';
    }; reader.readAsText(file);
});
window.resetWaste = function() { if(confirm("Weet je zeker dat je het verspillingsrapport op €0.00 wilt zetten? Alle historie wordt gewist.")) { localStorage.removeItem('avondeet_waste'); window.wasteDB = []; alert("Verspillingskosten zijn succesvol gereset!"); if(typeof window.renderVoorraad === 'function') window.renderVoorraad(); } };
window.wisAlleData = function() { let check = prompt("WAARSCHUWING! Dit wist al je recepten, producten, planning en voorraad permanent. Typ 'WIS' in hoofdletters om te bevestigen:"); if(check === 'WIS') { localStorage.clear(); alert("Alle data is gewist. De applicatie wordt nu herstart."); location.reload(); } else if (check !== null) alert("Wissen geannuleerd."); };

if(document.getElementById('zoek-recept')) window.filterRecepten();
if(document.getElementById('zoek-ingredient')) window.filterIngredienten();