// --- BASKETBAL_INSTELLINGEN.JS: SYSTEEM & TARIEVEN ---

window.slaDataOp = function(sleutel, data) {
    localStorage.setItem(sleutel, JSON.stringify(data));
    if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase(sleutel, data);
    else if (typeof window.bewaarNaarFirebase === 'function') window.bewaarNaarFirebase(sleutel, data);
    else document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: sleutel, data: data } }));
};

window.ontvangCloudDataInstellingen = function(sleutel, data) {
    if (sleutel === 'blackshots_instellingen' && data) {
        window.appInstellingen = data;
        window.vulInstellingenScherm();
    }
};

window.appInstellingen = JSON.parse(localStorage.getItem('blackshots_instellingen')) || {
    seizoen: "2025-2026",
    bestuurAanwezigen: "Martin, Izaac, Jolanda, Tom",
    toernooiMailSjabloon: "Beste ouders,\n\nOp maandag gaat de interne competitie weer van start!\nDe trainingen zien er daarom anders uit. Op deze dagen houden we geen traditionele training, maar spelen we wedstrijden onderling.\n\n[TEAMS]\n\nDe wedstrijden beginnen op de geplande tijd met 10 minuten warming-up, met vervolgens 4 keer 10 minuten doorlopende speeltijd.\nHet eerstgenoemde team is het thuisteam en speelt in het zwart, het tweede team speelt in een andere kleur.\n\n[SCHEMA]\n\nBij vragen hoor ik het graag!",
    tarieven: [
        { id: "t1", zaal: "Sporthal VEKA", deel: "hele zaal", prijs: 45.50 },
        { id: "t2", zaal: "Sporthal VEKA", deel: "zaaldeel A", prijs: 27.81 },
        { id: "t3", zaal: "De Veste", deel: "hele zaal", prijs: 35.27 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    window.genereerSeizoenen();
    window.vulInstellingenScherm();
});

window.genereerSeizoenen = function() {
    let select = document.getElementById('inst_seizoen');
    if (!select) return;
    select.innerHTML = '';
    
    let startJaar = 2023;
    let eindJaar = 2050; // De lijst tot 2050 zoals gewenst!
    
    for (let i = startJaar; i <= eindJaar; i++) {
        let seizoenNaam = `${i}-${i+1}`;
        select.innerHTML += `<option value="${seizoenNaam}">${seizoenNaam}</option>`;
    }
};

window.vulInstellingenScherm = function() {
    if (document.getElementById('inst_seizoen')) document.getElementById('inst_seizoen').value = window.appInstellingen.seizoen || "2025-2026";
    if (document.getElementById('inst_bestuur')) document.getElementById('inst_bestuur').value = window.appInstellingen.bestuurAanwezigen || "";
    if (document.getElementById('inst_mail')) document.getElementById('inst_mail').value = window.appInstellingen.toernooiMailSjabloon || "";
    
    window.tekenTarievenLijst();
};

window.slaSysteemInstellingenOp = function() {
    window.appInstellingen.seizoen = document.getElementById('inst_seizoen').value;
    window.appInstellingen.bestuurAanwezigen = document.getElementById('inst_bestuur').value;
    window.appInstellingen.toernooiMailSjabloon = document.getElementById('inst_mail').value;
    
    window.slaDataOp('blackshots_instellingen', window.appInstellingen);
    alert("✅ Systeeminstellingen succesvol opgeslagen!");
};

window.tekenTarievenLijst = function() {
    let container = document.getElementById('tarieven-lijst');
    if (!container) return;
    container.innerHTML = '';

    window.appInstellingen.tarieven.forEach((t, idx) => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:10px 15px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:8px;">
                <div>
                    <strong style="color:var(--secondary-color); font-size:1.05rem;">${t.zaal}</strong> <br>
                    <span style="font-size:0.85rem; color:#7f8c8d;">Deel: ${t.deel}</span>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <strong style="color:#27ae60; font-size:1.1rem;">€ ${parseFloat(t.prijs).toFixed(2).replace('.', ',')} / uur</strong>
                    <button onclick="window.verwijderTarief(${idx})" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">X</button>
                </div>
            </div>
        `;
    });
};

window.voegTariefToe = function() {
    let zaal = document.getElementById('nt_zaal').value.trim();
    let deel = document.getElementById('nt_deel').value.trim() || "hele zaal";
    let prijsStr = document.getElementById('nt_prijs').value.trim().replace(',', '.');
    let prijs = parseFloat(prijsStr);

    if (!zaal || isNaN(prijs)) return alert("Vul in ieder geval een zaalnaam en een geldige prijs in!");

    window.appInstellingen.tarieven.push({
        id: 'tarief_' + Date.now(),
        zaal: zaal,
        deel: deel,
        prijs: prijs
    });

    window.slaDataOp('blackshots_instellingen', window.appInstellingen);
    
    document.getElementById('nt_zaal').value = '';
    document.getElementById('nt_deel').value = '';
    document.getElementById('nt_prijs').value = '';
    
    window.tekenTarievenLijst();
};

window.verwijderTarief = function(idx) {
    window.appInstellingen.tarieven.splice(idx, 1);
    window.slaDataOp('blackshots_instellingen', window.appInstellingen);
    window.tekenTarievenLijst();
};

window.exporteerDatabaseLokaal = function() {
    let exportData = {
        gebruikers: JSON.parse(localStorage.getItem('blackshots_gebruikers') || '[]'),
        teams: JSON.parse(localStorage.getItem('blackshots_teams') || '[]'),
        toernooien: JSON.parse(localStorage.getItem('blackshots_toernooi') || '{}'),
        bestuur: JSON.parse(localStorage.getItem('blackshots_bestuur') || '[]'),
        instellingen: window.appInstellingen
    };
    
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "BlackShots_BackUp_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};