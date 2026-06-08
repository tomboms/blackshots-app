// --- VOORRAAD.JS: VOORRAADKAST, WASTE & KLIEKJES BEHEER ---

window.voorraadDB = JSON.parse(localStorage.getItem('avondeet_voorraad')) || [];
window.wasteDB = JSON.parse(localStorage.getItem('avondeet_waste')) || [];

let actueelVoorraadId = null;

// 1. VOORRAAD RENDEREN (MET DATUMS, MERKEN, EN GROEPEN)
window.renderVoorraad = function() {
    const select = document.getElementById('voorraad-handmatig-select');
    if (select) {
        let huidigeSelectie = select.value;
        select.innerHTML = '<option value="">-- Kies product uit database --</option>';
        const gesorteerd = [...ingredientenDB].sort((a,b) => a.naam.localeCompare(b.naam));
        gesorteerd.forEach(ing => { select.innerHTML += `<option value="${ing.id}">${ing.naam} (${ing.verpAantal}${ing.eenheid})</option>`; });
        if(huidigeSelectie) select.value = huidigeSelectie;
    }

    const lijst = document.getElementById('voorraad-lijst'); if (!lijst) return; lijst.innerHTML = '';

    if (window.voorraadDB.length === 0) {
        lijst.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Je voorraadkast en koelkast zijn momenteel leeg.</p>';
        return;
    }

    // Auto-fix: Oude items die geen 'toegevoegdOp' hebben, krijgen vandaag als datum.
    window.voorraadDB.forEach(v => {
        if(!v.toegevoegdOp) v.toegevoegdOp = window.getIsoDatumS(new Date());
        if(v.extraDagen === undefined) v.extraDagen = 0;
    });

    // NIEUW: Groepeer nu op Locatie!
    let kliekjes = window.voorraadDB.filter(v => v.isKliekje);
    let koelkast = window.voorraadDB.filter(v => !v.isKliekje && (ingredientenDB.find(i => i.id === v.ingId)?.locatie === 'Koelkast' || (!ingredientenDB.find(i => i.id === v.ingId)?.locatie && ingredientenDB.find(i => i.id === v.ingId)?.soort === 'Vers')));
    let vriezer = window.voorraadDB.filter(v => !v.isKliekje && ingredientenDB.find(i => i.id === v.ingId)?.locatie === 'Diepvries');
    let plank = window.voorraadDB.filter(v => !v.isKliekje && (ingredientenDB.find(i => i.id === v.ingId)?.locatie === 'Voorraadkast' || (!ingredientenDB.find(i => i.id === v.ingId)?.locatie && ingredientenDB.find(i => i.id === v.ingId)?.soort !== 'Vers')));

    const renderGroep = (items, titel, icoon, kleur) => {
        if(items.length === 0) return;
        lijst.innerHTML += `<h3 style="color:${kleur}; border-bottom:2px solid ${kleur}; padding-bottom:5px; margin-top:20px;">${icoon} ${titel}</h3>`;
        
        items.forEach(item => {
            let li = document.createElement('li');
            li.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border-color); padding:15px; border-radius:8px; margin-bottom:10px; flex-wrap:wrap; gap:10px;";
            
            if (item.isKliekje) {
                let dagenOud = Math.floor((new Date() - new Date(item.toegevoegdOp)) / (1000 * 60 * 60 * 24));
                let versheid = dagenOud === 0 ? "Vandaag gemaakt" : (dagenOud === 1 ? "Gisteren gemaakt" : `${dagenOud} dagen geleden gemaakt`);

                li.innerHTML = `
                    <div style="flex:2; min-width:200px;">
                        <span style="background:#8e44ad; color:white; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold;">🥣 Kliekje</span>
                        <strong style="font-size:1.1rem; display:block; margin-top:5px;">${item.naam}</strong>
                        <small style="color:#7f8c8d; font-weight:bold; display:block;">${item.aantal} porties over | ${versheid}</small>
                    </div>
                    <div style="flex:1; display:flex; gap:10px; justify-content:flex-end;">
                        <button onclick="window.openVoorraadModal('${item.id}')" style="background:#3498db; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">Beheren</button>
                    </div>
                `;
            } else {
                const dbIng = ingredientenDB.find(i => i.id === item.ingId);
                let eenheid = dbIng ? dbIng.eenheid : 'stuks';
                let naam = dbIng ? dbIng.naam : 'Onbekend product';
                let winkel = dbIng && dbIng.winkel && dbIng.winkel !== "Overig" ? `<span style="background:#e67e22; color:white; font-size:0.7rem; padding:2px 6px; border-radius:4px;">🏢 ${dbIng.winkel}</span>` : '';
                let merk = dbIng && dbIng.merk ? `<span style="background:#3498db; color:white; font-size:0.7rem; padding:2px 6px; border-radius:4px;">🏷️ ${dbIng.merk}</span>` : '';
                
                let versheidsTekst = ''; let verlengKnop = '';
                
                // Datum rekenmachine
                if (dbIng && (dbIng.locatie === 'Koelkast' || dbIng.soort === 'Vers')) {
                    let maxDagen = (dbIng.houdbaarheid || 0) + (item.extraDagen || 0);
                    let toegevoegdDatum = new Date(item.toegevoegdOp);
                    let vervalDatum = new Date(toegevoegdDatum); vervalDatum.setDate(vervalDatum.getDate() + maxDagen);
                    
                    let vandaag = new Date(); vandaag.setHours(0,0,0,0);
                    let verschilMs = vervalDatum.setHours(0,0,0,0) - vandaag;
                    let dagenTeGaan = Math.ceil(verschilMs / (1000 * 60 * 60 * 24));

                    if (dagenTeGaan > 1) { versheidsTekst = `<span style="color:#27ae60; font-weight:bold; font-size:0.85rem;">⏳ Nog ${dagenTeGaan} dagen vers</span>`; } 
                    else if (dagenTeGaan === 1) { versheidsTekst = `<span style="color:#e67e22; font-weight:bold; font-size:0.85rem;">⏳ Morgen opeten!</span>`; } 
                    else if (dagenTeGaan === 0) { versheidsTekst = `<span style="color:#e67e22; font-weight:bold; font-size:0.85rem;">⚠️ Vandaag opeten!</span>`; } 
                    else {
                        versheidsTekst = `<span style="color:#e74c3c; font-weight:bold; font-size:0.85rem;">🚨 THT Verstreken (${Math.abs(dagenTeGaan)} dgn)</span>`;
                        verlengKnop = `<button onclick="window.verlengHoudbaarheid('${item.id}', 3)" style="background:#f39c12; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold; margin-top:5px; display:block; width:100%; box-shadow:0 2px 4px rgba(0,0,0,0.1);">👁️👃👅 Kijk, Ruik, Proef (Verleng +3 dgn)</button>`;
                    }
                } else {
                    versheidsTekst = `<span style="color:#7f8c8d; font-weight:bold; font-size:0.85rem;">🥫 Lang Houdbaar</span>`;
                }

                let datumOmgekeerd = item.toegevoegdOp.split('-').reverse().join('-');
                
                li.innerHTML = `
                    <div style="flex:2; min-width:200px;">
                        <strong style="font-size:1.1rem; display:block;">${naam}</strong>
                        <div style="margin:4px 0;">${winkel} ${merk}</div>
                        <span style="display:block; color:#27ae60; font-weight:bold; margin-top:3px; font-size:1.1rem;">${Math.round(item.aantal * 10)/10} ${eenheid}</span>
                    </div>
                    <div style="flex:1.5; min-width:180px;">
                        ${versheidsTekst}
                        ${verlengKnop}
                        <small style="color:#bdc3c7; display:block; margin-top:3px;">Toegevoegd op: ${datumOmgekeerd}</small>
                    </div>
                    <div style="flex:0.5; display:flex; justify-content:flex-end;">
                        <button onclick="window.openVoorraadModal('${item.id}')" style="background:#3498db; color:white; border:none; padding:10px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">Beheren</button>
                    </div>
                `;
            }
            lijst.appendChild(li);
        });
    };

    renderGroep(koelkast, 'In de Koelkast', '❄️', '#3498db');
    renderGroep(plank, 'Voorraadkast (Plank)', '🥫', '#e67e22');
    renderGroep(vriezer, 'In de Diepvries', '🧊', '#2980b9');
    renderGroep(kliekjes, 'Mijn Kliekjes', '🥣', '#8e44ad');

    window.berekenWaste();
};

// 2. KIJK RUIK PROEF (Houdbaarheid verlengen)
window.verlengHoudbaarheid = function(id, dagen) {
    let item = window.voorraadDB.find(v => v.id === id);
    if(item) {
        item.extraDagen += dagen;
        localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB));
        window.renderVoorraad();
        alert(`Geweldig! Je hebt zojuist verspilling voorkomen. Houdbaarheid is met ${dagen} dagen verlengd.`);
    }
};

window.voegHandmatigAanVoorraadToe = function() {
    let ingId = document.getElementById('voorraad-handmatig-select').value;
    let aantal = parseFloat(document.getElementById('voorraad-handmatig-aantal').value);
    
    if (!ingId || isNaN(aantal) || aantal <= 0) return alert("Kies een product en vul een geldig aantal in.");
    
    const dbIng = ingredientenDB.find(i => i.id === ingId);
    if (!dbIng) return;

    let bestaand = window.voorraadDB.find(v => v.ingId === ingId && !v.isKliekje);
    if (bestaand) {
        bestaand.aantal += aantal;
        bestaand.toegevoegdOp = window.getIsoDatumS(new Date()); 
        bestaand.extraDagen = 0;
    } else {
        window.voorraadDB.push({
            id: 'voorraad_' + Date.now(),
            ingId: ingId,
            aantal: aantal,
            isKliekje: false,
            toegevoegdOp: window.getIsoDatumS(new Date()),
            extraDagen: 0
        });
    }
    
    localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB));
    document.getElementById('voorraad-handmatig-aantal').value = ''; document.getElementById('voorraad-handmatig-select').value = '';
    window.renderVoorraad();
};

// 3. VOORRAAD BEHEREN (De Pop-up functies)
window.openVoorraadModal = function(id) {
    actueelVoorraadId = id; let item = window.voorraadDB.find(v => v.id === id); if (!item) return;

    let naam = item.isKliekje ? item.naam : (ingredientenDB.find(i => i.id === item.ingId)?.naam || "Onbekend");
    let eenheid = item.isKliekje ? 'porties' : (ingredientenDB.find(i => i.id === item.ingId)?.eenheid || "stuks");

    document.getElementById('modal-titel').innerText = `Beheer: ${naam}`;
    document.getElementById('modal-desc').innerText = `Huidige voorraad: ${Math.round(item.aantal * 10)/10} ${eenheid}`;
    document.getElementById('modal-verbruik-aantal').value = ''; document.getElementById('modal-waste-reden').value = '';
    document.getElementById('voorraad-modal').style.display = 'flex';
};

window.voerVoorraadActieUit = function(actie) {
    if (!actueelVoorraadId) return;
    let itemIndex = window.voorraadDB.findIndex(v => v.id === actueelVoorraadId); if (itemIndex === -1) return;
    let item = window.voorraadDB[itemIndex];

    if (actie === 'op') {
        window.voorraadDB.splice(itemIndex, 1);
    } 
    else if (actie === 'verbruik') {
        let verbruik = parseFloat(document.getElementById('modal-verbruik-aantal').value);
        if (isNaN(verbruik) || verbruik <= 0) return alert("Vul een geldig aantal in om te verbruiken.");
        if (verbruik >= item.aantal) window.voorraadDB.splice(itemIndex, 1);
        else item.aantal -= verbruik;
    } 
    else if (actie === 'weggooien') {
        let reden = document.getElementById('modal-waste-reden').value.trim() || "Weggegooid"; let kosten = 0;
        if (item.isKliekje) {
            if(item.waarde) kosten = (item.waarde / item.aantal) * item.aantal;
        } else {
            const dbIng = ingredientenDB.find(i => i.id === item.ingId);
            if (dbIng && dbIng.verpAantal && dbIng.verpPrijs) {
                let prijsPerEenheid = dbIng.verpPrijs / dbIng.verpAantal;
                kosten = item.aantal * prijsPerEenheid;
            }
        }
        window.wasteDB.push({ datum: window.getIsoDatumS(new Date()), naam: item.isKliekje ? item.naam : (ingredientenDB.find(i => i.id === item.ingId)?.naam || "Onbekend"), kosten: kosten, reden: reden });
        localStorage.setItem('avondeet_waste', JSON.stringify(window.wasteDB));
        window.voorraadDB.splice(itemIndex, 1);
    }

    localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB)); document.getElementById('voorraad-modal').style.display = 'none'; window.renderVoorraad();
};

window.berekenWaste = function() {
    let totaal = 0; let dertigDagenGeleden = new Date(); dertigDagenGeleden.setDate(dertigDagenGeleden.getDate() - 30);
    window.wasteDB.forEach(w => { let wDatum = new Date(w.datum); if (wDatum >= dertigDagenGeleden) totaal += w.kosten; });
    const wasteEl = document.getElementById('waste-totaal'); if (wasteEl) wasteEl.innerText = `€${totaal.toFixed(2)}`;
};

// 4. KLIEKJES OPSLAAN (Na het koken)
window.opslaanKliekje = function() {
    let aantal = parseFloat(document.getElementById('modal-kliekje-aantal').value);
    if (isNaN(aantal) || aantal <= 0) return alert("Vul een geldig aantal porties in.");
    if (!window.voorraadDB) window.voorraadDB = [];

    let kliekjeNaam = window.laatstGekooktReceptNaam || "Onbekend Gerecht"; let kostenPerPortie = window.laatstGekookteKostenPerPortie || 0;

    window.voorraadDB.push({
        id: 'kliekje_' + Date.now(), ingId: 'kliekje_' + Date.now(),
        naam: kliekjeNaam, aantal: aantal, isKliekje: true,
        toegevoegdOp: window.getIsoDatumS(new Date()), waarde: kostenPerPortie * aantal
    });

    localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB)); document.getElementById('kliekje-modal').style.display = 'none';
    alert("💾 Kliekje succesvol in de koelkast gezet!"); if (typeof window.renderVoorraad === 'function') window.renderVoorraad();
};

window.sluitKliekjeModal = function() { document.getElementById('kliekje-modal').style.display = 'none'; };