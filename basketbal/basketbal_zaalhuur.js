// --- BASKETBAL_ZAALHUUR.JS: SLIMME GROEPERING & KOGELVRIJE REKENSOMMEN ---

window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.zaalhuurData.length > 0) {
        document.getElementById('label-zaalhuur').innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    }
});

// ============================================================================
// EXCEL SJABLOON DOWNLOADEN 
// ============================================================================
window.downloadSjabloon = function() {
    const wb = XLSX.utils.book_new();
    const sjabloonData = [
        ["Datum", "Tijd", "Zaaldeel", "Zaal", "Bedrag", "Opmerking", "Status", "Gehuurd op"],
        ["Vrijdag 12 jun 2026", "18:00 - 19:30", "Sporthal VEKA zaaldeel A", "Sporthal VEKA", "27.81", "-", "Geboekt", "10-4-2025 09:56"],
        ["Vrijdag 12 jun 2026", "18:00 - 19:30", "Sporthal VEKA zaaldeel B", "Sporthal VEKA", "27.81", "-", "Geboekt", "10-4-2025 09:56"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(sjabloonData);
    XLSX.utils.book_append_sheet(wb, ws, "Sjabloon Zaalhuur");
    XLSX.writeFile(wb, "Zaalhuur_Sjabloon_BlackShots.xlsx");
};

// ============================================================================
// DATUM CONVERSIE VOOR FILTERS (Maakt er "YYYY-MM-DD" van)
// ============================================================================
function converteerNaarISODatum(datumStr) {
    if (!datumStr) return "9999-12-31";
    let str = datumStr.toLowerCase();
    
    let match = str.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
    if (match) {
        let d = match[1].padStart(2, '0');
        let mStr = match[2];
        let y = match[3];
        let m = "01";
        if(mStr.includes('jan')) m="01";
        else if(mStr.includes('feb')) m="02";
        else if(mStr.includes('mrt') || mStr.includes('mar')) m="03";
        else if(mStr.includes('apr')) m="04";
        else if(mStr.includes('mei') || mStr.includes('may')) m="05";
        else if(mStr.includes('jun')) m="06";
        else if(mStr.includes('jul')) m="07";
        else if(mStr.includes('aug')) m="08";
        else if(mStr.includes('sep')) m="09";
        else if(mStr.includes('okt') || mStr.includes('oct')) m="10";
        else if(mStr.includes('nov')) m="11";
        else if(mStr.includes('dec')) m="12";
        return `${y}-${m}-${d}`;
    }
    
    let match2 = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (match2) {
        let d = match2[1].padStart(2, '0');
        let m = match2[2].padStart(2, '0');
        let y = match2[3];
        if (y.length === 2) y = "20" + y;
        return `${y}-${m}-${d}`;
    }
    return "9999-12-31";
}

// ============================================================================
// UREN BEREKENEN 
// ============================================================================
function berekenVerschilInUren(start, eind) {
    try {
        let sMatch = start.match(/(\d{1,2})[:.](\d{2})/);
        let eMatch = eind.match(/(\d{1,2})[:.](\d{2})/);
        if(!sMatch || !eMatch) return 0;
        
        let sUur = parseInt(sMatch[1]);
        let sMin = parseInt(sMatch[2]);
        let eUur = parseInt(eMatch[1]);
        let eMin = parseInt(eMatch[2]);
        
        let diff = (eUur + eMin/60) - (sUur + sMin/60);
        return diff > 0 ? diff : 0;
    } catch(e) {
        return 0;
    }
}

// ============================================================================
// EXCEL BEREKENING MET STRENGE BEDRAG-LEZER
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
            if (!row || row.length < 5 || idx === 0) return; 

            let datum = row[0] ? row[0].toString().trim() : "";
            let tijdStr = row[1] ? row[1].toString().trim() : "";
            let zaaldeel = row[2] ? row[2].toString().trim() : "";
            let zaal = row[3] ? row[3].toString().trim() : "Onbekend";
            let bedragRaw = row[4] ? row[4].toString().trim() : "0";
            let opmerking = row[5] ? row[5].toString().trim() : "-";
            let statusRaw = row[6] ? row[6].toString().trim() : "Geboekt"; 

            if (!datum || !tijdStr || !tijdStr.includes('-')) return;

            let tijdParts = tijdStr.split('-');
            let startTijd = tijdParts[0].trim();
            let eindTijd = tijdParts[1].trim();

            // Kogelvrije conversie van Nederlandse of Engelse bedragen (bijv "27,81" of "2.000,50")
            let cleanBedrag = bedragRaw.replace(/[€\s]/g, '');
            if (cleanBedrag.includes(',') && cleanBedrag.includes('.')) {
                cleanBedrag = cleanBedrag.replace(/\./g, '').replace(',', '.');
            } else if (cleanBedrag.includes(',')) {
                cleanBedrag = cleanBedrag.replace(',', '.');
            }
            let bedrag = parseFloat(cleanBedrag) || 0;

            // Status bepalen via Kolom G
            let status = "Geboekt";
            let isGeannuleerd = false;
            let stLower = statusRaw.toLowerCase();

            if (stLower.includes('annuleer') || stLower.includes('verval') || stLower.includes('cancel')) {
                status = "Geannuleerd";
                isGeannuleerd = true;
                if (!geannuleerdeDatums.includes(datum)) geannuleerdeDatums.push(datum);
            } else if (stLower.includes('factureer')) {
                status = "Gefactureerd";
                if (!toegevoegdeDatums.includes(datum)) toegevoegdeDatums.push(datum);
            } else {
                if (!toegevoegdeDatums.includes(datum)) toegevoegdeDatums.push(datum);
            }

            let berekendeUren = isGeannuleerd ? 0 : berekenVerschilInUren(startTijd, eindTijd);
            let uren = isNaN(berekendeUren) ? 0 : berekendeUren;

            window.zaalhuurData.push({
                datum: datum,
                isoDatum: converteerNaarISODatum(datum),
                startTijd: startTijd, 
                eindTijd: eindTijd, 
                zaaldeel: zaaldeel, 
                zaal: zaal, 
                bedrag: bedrag, 
                opmerking: opmerking, 
                status: status, 
                geannuleerd: isGeannuleerd,
                uren: uren
            });
        });

        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('label-zaalhuur').innerText = `✅ Ingeladen: ${file.name}`;
        
        let banner = document.getElementById('notification-banner');
        if (banner) {
            let msg = `<strong>🏟️ Zaalhuur Update Succesvol Verwerkt!</strong><br>`;
            if (toegevoegdeDatums.length > 0) msg += `✅ <strong>Huur gevonden op o.a.:</strong> ${toegevoegdeDatums.slice(0,4).join(', ')}${toegevoegdeDatums.length > 4 ? '...' : ''}<br>`;
            if (geannuleerdeDatums.length > 0) msg += `❌ <strong>Annuleringen verwerkt op:</strong> ${geannuleerdeDatums.slice(0,4).join(', ')}${geannuleerdeDatums.length > 4 ? '...' : ''}`;
            banner.innerHTML = msg;
            banner.style.display = 'block';
        }

        updateZaalDropdown();
        tekenZaalhuurResultaten();
    };
    reader.readAsArrayBuffer(file);
};

function updateZaalDropdown() {
    let zalen = [...new Set(window.zaalhuurData.map(z => z.zaal))];
    let select = document.getElementById('filter-zaal');
    select.innerHTML = '<option value="">-- Alle Zalen --</option>';
    zalen.forEach(z => { if(z) select.innerHTML += `<option value="${z}">${z}</option>`; });
}

window.wisFilters = function() {
    document.getElementById('filter-zaal').value = "";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-datum-van').value = "";
    document.getElementById('filter-datum-tot').value = "";
    tekenZaalhuurResultaten();
};

// ============================================================================
// INTERACTIEVE UI TEKENEN & SLIMME GROEPERING
// ============================================================================
window.tekenZaalhuurResultaten = function() {
    let container = document.getElementById('zaalhuur-resultaten');
    
    let fZaal = document.getElementById('filter-zaal').value.toLowerCase();
    let fStatus = document.getElementById('filter-status').value.toLowerCase();
    let fVan = document.getElementById('filter-datum-van').value;
    let fTot = document.getElementById('filter-datum-tot').value;

    let gefilterdeData = window.zaalhuurData.filter(z => {
        let matchZaal = !fZaal || z.zaal.toLowerCase().includes(fZaal);
        let matchStatus = !fStatus || z.status.toLowerCase() === fStatus;
        let matchVan = !fVan || z.isoDatum >= fVan;
        let matchTot = !fTot || z.isoDatum <= fTot;

        return matchZaal && matchStatus && matchVan && matchTot;
    });

    if (gefilterdeData.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen reserveringen gevonden die voldoen aan de filters...</p>';
        document.getElementById('stat-totaal').innerText = "0";
        document.getElementById('stat-annuleringen').innerText = "0";
        document.getElementById('stat-gefactureerd').innerText = "0";
        document.getElementById('stat-uren').innerText = "0.0 u";
        document.getElementById('stat-kosten').innerText = "€ 0,00";
        return;
    }

    let totaalKosten = gefilterdeData.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
    let totaalUren = gefilterdeData.reduce((som, z) => som + (Number(z.uren) || 0), 0);
    let aantalGeannuleerd = gefilterdeData.filter(z => z.status === "Geannuleerd").length;
    let aantalGefactureerd = gefilterdeData.filter(z => z.status === "Gefactureerd").length;

    // Aantal is nu het aantal rijen in Excel, we noemen dat netjes 'Reserveringen'
    document.getElementById('stat-totaal').innerText = gefilterdeData.length;
    document.getElementById('stat-annuleringen').innerText = aantalGeannuleerd;
    document.getElementById('stat-gefactureerd').innerText = aantalGefactureerd;
    document.getElementById('stat-uren').innerText = totaalUren.toFixed(1) + " u";
    document.getElementById('stat-kosten').innerText = "€ " + totaalKosten.toFixed(2).replace('.', ',');

    // 1. EERST GROEPEREN PER DAG
    let groepenPerDag = {};
    gefilterdeData.forEach(z => {
        if (!groepenPerDag[z.datum]) groepenPerDag[z.datum] = [];
        groepenPerDag[z.datum].push(z);
    });

    let html = '';
    Object.keys(groepenPerDag).forEach(dagKey => {
        let ruweItems = groepenPerDag[dagKey];
        
        // 2. SLIM SAMENVOEGEN VAN DEZELFDE TIJDEN BINNEN DE DAG
        let uniekeTijdsloten = {};
        ruweItems.forEach(zaal => {
            // Unieke sleutel is: Tijd + Status + Hoofdzaal
            let slotKey = `${zaal.startTijd}-${zaal.eindTijd}-${zaal.status}-${zaal.zaal}`;
            
            if (!uniekeTijdsloten[slotKey]) {
                uniekeTijdsloten[slotKey] = { 
                    ...zaal, 
                    zaaldeelLijst: [zaal.zaaldeel], 
                    aantalZalen: 1 
                };
            } else {
                let uniekeNaam = zaal.zaaldeel;
                if (!uniekeTijdsloten[slotKey].zaaldeelLijst.includes(uniekeNaam)) {
                    uniekeTijdsloten[slotKey].zaaldeelLijst.push(uniekeNaam);
                }
                uniekeTijdsloten[slotKey].bedrag += zaal.bedrag;
                uniekeTijdsloten[slotKey].uren += zaal.uren;
                uniekeTijdsloten[slotKey].aantalZalen += 1;
            }
        });
        
        let samengevoegdeItems = Object.values(uniekeTijdsloten);
        samengevoegdeItems.sort((a, b) => a.startTijd.localeCompare(b.startTijd));
        
        // Dag Totalen Berekenen
        let dagTotaalKosten = samengevoegdeItems.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
        let dagTotaalUren = samengevoegdeItems.reduce((som, z) => som + (Number(z.uren) || 0), 0);

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

        samengevoegdeItems.forEach(zaal => {
            let badgeClass = "status-onbekend";
            if (zaal.status === "Geboekt") badgeClass = "status-geboekt";
            if (zaal.status === "Geannuleerd") badgeClass = "status-geannuleerd";
            if (zaal.status === "Gefactureerd") badgeClass = "status-gefactureerd";

            let rowStyle = zaal.geannuleerd ? 'background:#fef2f2; color:#b91c1c; text-decoration:line-through; opacity:0.7;' : '';
            
            // Slimme weergave voor gecombineerde zalen (bijv: "Zaaldeel A & Zaaldeel B")
            let zaaldeelWeergave = zaal.zaaldeelLijst.join(' & ');
            
            // Als er meerdere zalen op 1 tijd zijn, geef de 'Klok-uren' weer
            let weergaveUren = zaal.aantalZalen > 1 
                ? `<span style="color:#e67e22; font-weight:bold;">${(zaal.uren / zaal.aantalZalen).toFixed(1)} u</span> <small style="color:#7f8c8d;">(x${zaal.aantalZalen} zalen)</small>` 
                : `${zaal.uren.toFixed(1)} u`;

            html += `
                <tr style="border-bottom:1px solid #e2e8f0; ${rowStyle}">
                    <td style="padding:12px 20px; font-weight:bold; width:150px;">⏰ ${zaal.startTijd} - ${zaal.eindTijd}</td>
                    <td style="padding:12px 20px;">
                        <span style="font-size:1rem; font-weight:bold; color:#2c3e50;">${zaal.zaal}</span><br>
                        <small style="color:#64748b; font-style:italic;">${zaaldeelWeergave} ${zaal.opmerking !== '-' ? '| 💬 ' + zaal.opmerking : ''}</small>
                    </td>
                    <td style="padding:12px 20px; text-align:right; width:140px;">
                        ${weergaveUren}
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

window.wisZaalhuur = function() {
    if(confirm("Weet je zeker dat je alle zaalhuur data wilt wissen?")) {
        localStorage.removeItem('blackshots_zaalhuur_data');
        location.reload();
    }
};