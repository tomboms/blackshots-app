// --- STATISTIEKEN & DATA LOGICA ---

window.aankoopDB = JSON.parse(localStorage.getItem('avondeet_aankopen')) || [];

window.renderStatistieken = function() {
    const container = document.getElementById('statistieken-container');
    if(!container) return;

    let dStartInput = document.getElementById('stats-start');
    let dEindInput = document.getElementById('stats-eind');

    let dStartStr = dStartInput ? dStartInput.value : '';
    let dEindStr = dEindInput ? dEindInput.value : '';

    if(!dStartStr) {
        let d = new Date(); d.setDate(1); dStartStr = window.getIsoDatumS(d);
    }
    if(!dEindStr) {
        let d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); dEindStr = window.getIsoDatumS(d);
    }

    let startDatum = new Date(dStartStr); startDatum.setHours(0,0,0,0);
    let eindDatum = new Date(dEindStr); eindDatum.setHours(23,59,59,999);

    // 1. Bereken Uitgaven in deze periode
    window.aankoopDB = JSON.parse(localStorage.getItem('avondeet_aankopen')) || [];
    let uitgavenWaarde = 0;
    window.aankoopDB.forEach(a => {
        let aDatum = new Date(a.datum);
        if(aDatum >= startDatum && aDatum <= eindDatum) {
            uitgavenWaarde += (a.kosten || 0);
        }
    });

    // 2. Tel de basis data
    const aantalProducten = typeof ingredientenDB !== 'undefined' ? ingredientenDB.length : 0;
    const aantalRecepten = typeof receptenDB !== 'undefined' ? receptenDB.length : 0;
    
    // CORRECTIE: Check alle lagen van de dag (Ontbijt, Lunch, Diner, Extra)
    let ingeplandeDagen = 0;
    if (typeof weekPlanning !== 'undefined') {
        for (const [datum, data] of Object.entries(weekPlanning)) {
            let isGepland = false;
            ['ontbijt', 'lunch', 'diner', 'extra'].forEach(m => {
                if(data[m]) {
                    if (data[m].type === 'Samen' && data[m].samenRecept && data[m].samenRecept.trim() !== '') isGepland = true;
                    if (data[m].type === 'Apart' && ((data[m].tomRecept && data[m].tomRecept.trim() !== '') || (data[m].ikeRecept && data[m].ikeRecept.trim() !== ''))) isGepland = true;
                }
            });
            if (isGepland) ingeplandeDagen++;
        }
    }

    // 3. Bereken Geld in Voorraadkast
    let voorraadWaarde = 0;
    if (window.voorraadDB) {
        window.voorraadDB.forEach(v => {
            if (v.waardePerEenheid && v.aantal) voorraadWaarde += (v.waardePerEenheid * v.aantal);
        });
    }

    // 4. Bereken Totale Waste
    let wasteWaarde = 0;
    let wasteLijstHTML = "";
    
    if (window.wasteDB && window.wasteDB.length > 0) {
        window.wasteDB.sort((a,b) => new Date(b.datum) - new Date(a.datum)).forEach(w => {
            wasteWaarde += (w.kosten || 0);
            wasteLijstHTML += `
                <li style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border-color);">
                    <span><strong>${w.naam}</strong> <span style="color:#7f8c8d; font-size:0.85rem;">(${w.reden})</span></span>
                    <span style="color:#e74c3c; font-weight:bold;">- €${(w.kosten || 0).toFixed(2)}</span>
                </li>
            `;
        });
    } else {
        wasteLijstHTML = "<p style='color:#7f8c8d; font-style:italic; padding:10px 0;'>Je hebt nog niets weggegooid! Goed bezig! 🌍</p>";
    }

    // 5. Teken het Dashboard 
    container.innerHTML = `
        <div style="background:var(--card-bg); border-radius:8px; padding:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05); border: 1px solid var(--border-color); margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:10px;">
                <h3 style="color:#34495e; margin:0;">💳 Uitgaven (Gekochte Boodschappen)</h3>
                <div style="display:flex; gap:10px; align-items:center; background:var(--bg-color); padding:6px 10px; border-radius:6px;">
                    <input type="date" id="stats-start" value="${dStartStr}" onchange="window.renderStatistieken()" style="border:none; background:transparent; font-weight:bold;">
                    <span style="color:#7f8c8d;">t/m</span>
                    <input type="date" id="stats-eind" value="${dEindStr}" onchange="window.renderStatistieken()" style="border:none; background:transparent; font-weight:bold;">
                </div>
            </div>
            <p style="font-size:2.5rem; font-weight:bold; margin:15px 0 5px 0; color:var(--primary-color);">€${uitgavenWaarde.toFixed(2)}</p>
            <p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Totaal besteed aan afgevinkte artikelen in deze periode. (Let op: de app meet dit pas vanaf het moment van deze update!)</p>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:30px;">
            <div style="background:var(--card-bg); border-left:4px solid #3498db; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <h4 style="margin:0; color:#7f8c8d;">Aantal Producten</h4>
                <p style="font-size:2rem; font-weight:bold; color:var(--text-main); margin:10px 0 0 0;">${aantalProducten}</p>
            </div>
            <div style="background:var(--card-bg); border-left:4px solid #9b59b6; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <h4 style="margin:0; color:#7f8c8d;">Aantal Recepten</h4>
                <p style="font-size:2rem; font-weight:bold; color:var(--text-main); margin:10px 0 0 0;">${aantalRecepten}</p>
            </div>
            <div style="background:var(--card-bg); border-left:4px solid #f39c12; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <h4 style="margin:0; color:#7f8c8d;">Dagen Ingepland</h4>
                <p style="font-size:2rem; font-weight:bold; color:var(--text-main); margin:10px 0 0 0;">${ingeplandeDagen}</p>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px;">
            <div style="background:var(--card-bg); border-radius:8px; padding:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05); border: 1px solid var(--border-color);">
                <h3 style="color:#27ae60; margin-top:0;">💰 Geld in Voorraadkast</h3>
                <p style="font-size:2.5rem; font-weight:bold; margin:10px 0;">€${voorraadWaarde.toFixed(2)}</p>
                <p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Dit is de actuele waarde van alles wat er nu in je koelkast en kastjes ligt.</p>
            </div>

            <div style="background:var(--card-bg); border-radius:8px; padding:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e74c3c;">
                <h3 style="color:#e74c3c; margin-top:0;">🗑️ Totale Waarde Weggegooid</h3>
                <p style="font-size:2.5rem; font-weight:bold; margin:10px 0;">€${wasteWaarde.toFixed(2)}</p>
                <p style="color:#7f8c8d; font-size:0.9rem; margin:0;">Zonde! Hier is een logboek van wat er precies de prullenbak in is gegaan:</p>
                
                <div style="margin-top:15px; max-height:200px; overflow-y:auto; background:var(--bg-color); padding:10px; border-radius:6px;">
                    <ul style="list-style:none; padding:0; margin:0; font-size:0.95rem;">
                        ${wasteLijstHTML}
                    </ul>
                </div>
            </div>
        </div>
    `;
};