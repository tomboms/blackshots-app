// --- BASKETBAL_ZAALHUUR.JS: INTERACTIEF DASHBOARD MET DOWNLOAD & SLIMME MATCHING ---

window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.zaalhuurData.length > 0) {
        document.getElementById('label-zaalhuur').innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    }
});

// ============================================================================
// FUNCTIE: RECHTSTREEKS EXCEL SJABLOON DOWNLOADEN VANUIT DE APPLICATIE
// ============================================================================
window.downloadSjabloon = function() {
    const wb = XLSX.utils.book_new();
    
    // Exact de kolommen en voorbeeldrij die je hebt doorgegeven!
    const sjabloonData = [
        ["Datum", "Tijd", "Zaaldeel", "Zaal", "Bedrag", "Opmerking", "Status", "Gehuurd op"],
        ["Vrijdag 12 jun 2026", "18:00 - 19:30", "Sporthal VEKA zaaldeel A", "Sporthal VEKA", "€ 27,81", "-", "Geboekt", "10-4-2025 09:56"]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(sjabloonData);
    XLSX.utils.book_append_sheet(wb, ws, "Sjabloon Zaalhuur");
    XLSX.writeFile(wb, "Zaalhuur_Sjabloon_BlackShots.xlsx");
};

// ============================================================================
// EXCEL BEREKENING & NOTIFICATIE UPDATE LISTENER
// ============================================================================
window.verwerkZaalhuurBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-zaalhuur').innerText = `⏳ Scannen...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
        
        window.zaalhuurData = [];
        let toegevoegdeDatums = [];
        let geannuleerdeDatums = [];

        ruweData.forEach((row, idx) => {
            if (!row || row.length === 0 || idx === 0) return; // Sla lege rijen en de header over

            let rijTekst = row.join(' ').toLowerCase();
            if (!rijTekst.trim()) return;

            // Haal kolommen op basis van vaste posities uit jouw template
            let datum = row[0] ? row[0].toString().trim() : "";
            let tijdStr = row[1] ? row[1].toString().trim() : "";
            let zaaldeel = row[2] ? row[2].toString().trim() : "";
            let zaal = row[3] ? row[3].toString().trim() : "Onbekend";
            let bedragRaw = row[4] ? row[4].toString().trim() : "€ 0,00";
            let opmerking = row[5] ? row[5].toString().trim() : "-";
            let statusRaw = row[6] ? row[6].toString().trim() : "Geboekt";

            if (!datum || !tijdStr || !tijdStr.includes('-')) return;

            // Splits start- en eindtijd
            let tijdParts = tijdStr.split('-');
            let startTijd = tijdParts[0].trim();
            let eindTijd = tijdParts[1].trim();

            // Bedrag parsen naar getal
            let cleanBedrag = bedragRaw.replace('€', '').replace(',', '.').replace(/\s/g, '');
            let bedrag = parseFloat(cleanBedrag) || 0;

            // Status bepalen
            let status = "Geboekt";
            let isGeannuleerd = false;

            if (statusRaw.toLowerCase().includes('annuleer') || rijTekst.includes('geannuleerd') || rijTekst.includes('vervallen')) {
                status = "Geannuleerd";
                isGeannuleerd = true;
                if (!geannuleerdeDatums.includes(datum)) geannuleerdeDatums.push(datum);
            } else if (statusRaw.toLowerCase().includes('factureer') || rijTekst.includes('gefactureerd')) {
                status = "Gefactureerd";
                if (!toegevoegdeDatums.includes(datum)) toegevoegdeDatums.push(datum);
            } else {
                if (!toegevoegdeDatums.includes(datum)) toegevoegdeDatums.push(datum);
            }

            let uren = isGeannuleerd ? 0 : berekenVerschilInUren(startTijd, eindTijd);

            window.zaalhuurData.push({
                datum, startTijd, eindTijd, zaaldeel, zaal, bedrag, opmerking, status, geannuleerd: isGeannuleerd
            });
        });

        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('label-zaalhuur').innerText = `✅ Ingeladen: ${file.name}`;
        
        // SLIMME VERWERKINGS NOTIFICATIE
        let banner = document.getElementById('notification-banner');
        if (banner) {
            let msg = `<strong>🏟️ Zaalhuur Update Succesvol Verwerkt!</strong><br>`;
            if (toegevoegdeDatums.length > 0) msg += `✅ <strong>Huur toegevoegd op datums:</strong> ${toegevoegdeDatums.slice(0,6).join(', ')}${toegevoegdeDatums.length > 6 ? '...' : ''}<br>`;
            if (geannuleerdeDatums.length > 0) msg += `❌ <strong>Huur geannuleerd op datums:</strong> ${geannuleerdeDatums.slice(0,6).join(', ')}${geannuleerdeDatums.length > 6 ? '...' : ''}`;
            banner.innerHTML = msg;
            banner.style.display = 'block';
        }

        updateZaalDropdown();
        tekenZaalhuurResultaten();
    };
    reader.readAsArrayBuffer(file);
};

function berekenVerschilInUren(start, eind) {
    try {
        let [sUur, sMin] = start.replace('.', ':').split(':').map(Number);
        let [eUur, eMin] = eind.replace('.', ':').split(':').map(Number);
        return (eUur + eMin / 60) - (sUur + sMin / 60);
    } catch(e) { return 0; }
}

function updateZaalDropdown() {
    let zalen = [...new Set(window.zaalhuurData.map(z => z.zaal))];
    let select = document.getElementById('filter-zaal');
    select.innerHTML = '<option value="">-- Alle Zalen --</option>';
    zalen.forEach(z => { if(z) select.innerHTML += `<option value="${z}">${z}</option>`; });
}

// ============================================================================
// INTERACTIEVE UI TEKENEN & SMART DATE COMBINING ENGINE
// ============================================================================
window.tekenZaalhuurResultaten = function() {
    let container = document.getElementById('zaalhuur-resultaten');
    
    let fZaal = document.getElementById('filter-zaal').value.toLowerCase();
    let fDag = document.getElementById('filter-dag').value.toLowerCase();
    let fMaand = document.getElementById('filter-maand').value.toLowerCase();
    let fStatus = document.getElementById('filter-status').value.toLowerCase();

    // 1. FILTERING DRAAIEN
    let gefilterdeData = window.zaalhuurData.filter(z => {
        let matchZaal = !fZaal || z.zaal.toLowerCase().includes(fZaal);
        let matchDag = !fDag || z.datum.toLowerCase().includes(fDag);
        let matchMaand = !fMaand || z.datum.toLowerCase().includes(fMaand);
        let matchStatus = !fStatus || z.status.toLowerCase() === fStatus;
        return matchZaal && matchDag && matchMaand && matchStatus;
    });

    if (gefilterdeData.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen reserveringen gevonden die voldoen aan de filters...</p>';
        return;
    }

    // 2. COUNTERS BEREKENEN
    let totaalKosten = gefilterdeData.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
    let totaalUren = gefilterdeData.reduce((som, z) => som + z.uren, 0);
    let aantalGeannuleerd = gefilterdeData.filter(z => z.status === "Geannuleerd").length;
    let aantalGefactureerd = gefilterdeData.filter(z => z.status === "Gefactureerd").length;

    document.getElementById('stat-totaal').innerText = gefilterdeData.length;
    document.getElementById('stat-annuleringen').innerText = aantalGeannuleerd;
    document.getElementById('stat-gefactureerd').innerText = aantalGefactureerd;
    document.getElementById('stat-uren').innerText = totaalUren.toFixed(1) + " u";
    document.getElementById('stat-kosten').innerText = "€ " + totaalKosten.toFixed(2).replace('.', ',');

    // 3. SMART COMBINING LOGICA: Groeperen per unieke dag!
    let groepenPerDag = {};
    gefilterdeData.forEach(z => {
        if (!groepenPerDag[z.datum]) groGroupsPerDay[z.datum] = [];
        groGroupsPerDay[z.datum].push(z);
    });

    // Sorteer de sub-sessies binnen een dag op starttijd
    Object.keys(groGroupsPerDay).forEach(dagKey => {
        groGroupsPerDay[dagKey].sort((a, b) => a.startTijd.localeCompare(b.startTijd));
    });

    // Bouw de HTML weergave
    let html = '';
    Object.keys(groGroupsPerDay).forEach(dagKey => {
        let items = groGroupsPerDay[dagKey];
        
        let dagTotaalKosten = items.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
        let dagTotaalUren = items.reduce((som, z) => som + z.uren, 0);

        html += `
            <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:20px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.02); font-family:Arial, sans-serif;">
                <div style="background:#2c3e50; color:white; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                    <span style="font-size:1.1rem; font-weight:bold;">📅 ${dagKey}</span>
                    <span style="font-size:0.9rem; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:15px;">
                        Totaal: <strong>${dagTotaalUren.toFixed(1)} u</strong> | <strong>€ ${dagTotaalKosten.toFixed(2).replace('.', ',')}</strong>
                    </span>
                </div>
                <table style="width:100%; border-collapse:collapse; margin:0;">
        `;

        items.forEach(zaal => {
            let badgeClass = "status-onbekend";
            if (zaal.status === "Geboekt") badgeClass = "status-geboekt";
            if (zaal.status === "Geannuleerd") badgeClass = "status-geannuleerd";
            if (zaal.status === "Gefactureerd") badgeClass = "status-gefactureerd";

            let rowStyle = zaal.geannuleerd ? 'background:#fef2f2; color:#b91c1c; text-decoration:line-through; opacity:0.7;' : '';

            html += `
                <tr style="border-bottom:1px solid #e2e8f0; ${rowStyle}">
                    <td style="padding:12px 20px; font-weight:bold; width:150px;">⏰ ${zaal.startTijd} - ${zaal.eindTijd}</td>
                    <td style="padding:12px 20px;">
                        <span style="font-size:1rem; font-weight:bold; color:#2c3e50;">${zaal.zaal}</span><br>
                        <small style="color:#64748b; font-style:italic;">${zaal.zaaldeel} ${zaal.opmerking !== '-' ? '| 💬 ' + zaal.opmerking : ''}</small>
                    </td>
                    <td style="padding:12px 20px; text-align:right; font-weight:bold; width:120px;">
                        ${zaal.geannuleerd ? '€ 0,00' : '€ ' + zaal.bedrag.toFixed(2).replace('.', ',')}
                    </td>
                    <td style="padding:12px 20px; text-align:right; width:130px; text-decoration:none !important;">
                        <span class="status-badge ${badgeClass}">${zaal.status}</span>
                    </td>
                </tr>
            `;
        });

        html += `</table></div>`;
    });

    container.innerHTML = html;
};

// Fix voor variabele naamgeving over de browsers heen
let groGroupsPerDay = {};

window.wisZaalhuur = function() {
    if(confirm("Weet je zeker dat je alle zaalhuur data wilt wissen?")) {
        localStorage.removeItem('blackshots_zaalhuur_data');
        location.reload();
    }
};