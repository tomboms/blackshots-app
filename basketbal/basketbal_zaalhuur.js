// --- BASKETBAL_ZAALHUUR.JS: SMART MERGE & HANDMATIGE STATUS ---

window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.zaalhuurData.length > 0) {
        document.getElementById('label-zaalhuur').innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    }
});

// Functie om een onzichtbare unieke ID te maken per reservering
function genereerZaalID(datum, startTijd, zaal, zaaldeel) {
    return `${datum}-${startTijd}-${zaal}-${zaaldeel}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

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
    } catch(e) { return 0; }
}

// ============================================================================
// EXCEL BEREKENING (SMART MERGE / UPSERT)
// ============================================================================
window.verwerkZaalhuurBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    document.getElementById('label-zaalhuur').innerText = `⏳ Samenvoegen...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
        
        // 1. Maak een slimme Map van BESTAANDE data (zodat we updaten ipv overschrijven)
        let dataMap = {};
        window.zaalhuurData.forEach(item => {
            dataMap[item.id] = item;
        });

        let updateCount = 0;
        let nieuwCount = 0;

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

            let startTijd = tijdStr.split('-')[0].trim();
            let eindTijd = tijdStr.split('-')[1].trim();

            let cleanBedrag = bedragRaw.replace(/[€\s]/g, '');
            if (cleanBedrag.includes(',') && cleanBedrag.includes('.')) {
                cleanBedrag = cleanBedrag.replace(/\./g, '').replace(',', '.');
            } else if (cleanBedrag.includes(',')) {
                cleanBedrag = cleanBedrag.replace(',', '.');
            }
            let bedrag = parseFloat(cleanBedrag) || 0;

            let status = "Geboekt";
            let isGeannuleerd = false;
            let stLower = statusRaw.toLowerCase();

            if (stLower.includes('annuleer') || stLower.includes('verval') || stLower.includes('cancel')) {
                status = "Geannuleerd";
                isGeannuleerd = true;
            } else if (stLower.includes('factureer')) {
                status = "Gefactureerd";
            }

            let berekendeUren = isGeannuleerd ? 0 : berekenVerschilInUren(startTijd, eindTijd);
            let uren = isNaN(berekendeUren) ? 0 : berekendeUren;
            
            // 2. Genereer een uniek ID
            let id = genereerZaalID(datum, startTijd, zaal, zaaldeel);

            // 3. Update of Voeg toe
            if(dataMap[id]) updateCount++; else nieuwCount++;

            dataMap[id] = {
                id: id,
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
            };
        });

        // 4. Zet de Map weer terug naar de array
        window.zaalhuurData = Object.values(dataMap);

        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('label-zaalhuur').innerText = `✅ Database bijgewerkt!`;
        
        let banner = document.getElementById('notification-banner');
        if (banner) {
            banner.innerHTML = `<strong>🏟️ Database Succesvol Bijgewerkt!</strong><br>✅ ${nieuwCount} nieuwe reserveringen toegevoegd.<br>🔄 ${updateCount} bestaande reserveringen geüpdatet.`;
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
// HANDMATIGE STATUS UPDATE FUNCTIE (Direct in UI opslaan!)
// ============================================================================
window.updateGroepStatus = function(idsString, nieuweStatus) {
    let ids = idsString.split(',');
    
    window.zaalhuurData.forEach(z => {
        if(ids.includes(z.id)) {
            z.status = nieuweStatus;
            z.geannuleerd = (nieuweStatus === 'Geannuleerd');
            z.uren = z.geannuleerd ? 0 : berekenVerschilInUren(z.startTijd, z.eindTijd); // Rekent direct uren opnieuw uit
        }
    });

    localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
    tekenZaalhuurResultaten(); // Herteken direct om rekensommen live te updaten
};

// ============================================================================
// INTERACTIEVE UI TEKENEN
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
        document.getElementById('stat-klokuren').innerText = "0.0 u";
        document.getElementById('stat-gehuurd').innerText = "0.0 u";
        document.getElementById('stat-kosten').innerText = "€ 0,00";
        document.getElementById('stat-gefactureerd').innerText = "0";
        document.getElementById('stat-annuleringen').innerText = "0";
        return;
    }

    let totaalKosten = gefilterdeData.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
    let totaalGehuurdeUren = gefilterdeData.reduce((som, z) => som + (z.geannuleerd ? 0 : (Number(z.uren) || 0)), 0);
    let aantalGeannuleerd = gefilterdeData.filter(z => z.status === "Geannuleerd").length;
    let aantalGefactureerd = gefilterdeData.filter(z => z.status === "Gefactureerd").length;

    let uniekeTijdvakken = new Set();
    gefilterdeData.forEach(z => {
        if (!z.geannuleerd) uniekeTijdvakken.add(`${z.datum}|${z.startTijd}|${z.eindTijd}`);
    });
    let totaalKlokuren = 0;
    uniekeTijdvakken.forEach(vak => {
        let parts = vak.split('|');
        totaalKlokuren += berekenVerschilInUren(parts[1], parts[2]);
    });

    document.getElementById('stat-totaal').innerText = gefilterdeData.length;
    document.getElementById('stat-klokuren').innerText = totaalKlokuren.toFixed(1) + " u";
    document.getElementById('stat-gehuurd').innerText = totaalGehuurdeUren.toFixed(1) + " u";
    document.getElementById('stat-kosten').innerText = "€ " + totaalKosten.toFixed(2).replace('.', ',');
    document.getElementById('stat-gefactureerd').innerText = aantalGefactureerd;
    document.getElementById('stat-annuleringen').innerText = aantalGeannuleerd;

    let groepenPerDag = {};
    gefilterdeData.forEach(z => {
        if (!groepenPerDag[z.datum]) groepenPerDag[z.datum] = [];
        groepenPerDag[z.datum].push(z);
    });

    let html = '';
    Object.keys(groepenPerDag).forEach(dagKey => {
        let ruweItems = groepenPerDag[dagKey];
        
        let uniekeTijdsloten = {};
        ruweItems.forEach(zaal => {
            let slotKey = `${zaal.startTijd}-${zaal.eindTijd}-${zaal.status}-${zaal.zaal}`;
            if (!uniekeTijdsloten[slotKey]) {
                uniekeTijdsloten[slotKey] = { ...zaal, zaaldeelLijst: [zaal.zaaldeel], idLijst: [zaal.id], aantalZalen: 1 };
            } else {
                let uniekeNaam = zaal.zaaldeel;
                if (!uniekeTijdsloten[slotKey].zaaldeelLijst.includes(uniekeNaam)) {
                    uniekeTijdsloten[slotKey].zaaldeelLijst.push(uniekeNaam);
                }
                uniekeTijdsloten[slotKey].idLijst.push(zaal.id); // Bewaar alle IDs om ze in 1x te kunnen updaten!
                uniekeTijdsloten[slotKey].bedrag += zaal.bedrag;
                uniekeTijdsloten[slotKey].uren += zaal.uren;
                uniekeTijdsloten[slotKey].aantalZalen += 1;
            }
        });
        
        let samengevoegdeItems = Object.values(uniekeTijdsloten);
        samengevoegdeItems.sort((a, b) => a.startTijd.localeCompare(b.startTijd));
        
        let dagTotaalKosten = samengevoegdeItems.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
        let dagTotaalGehuurd = samengevoegdeItems.reduce((som, z) => som + (z.geannuleerd ? 0 : (Number(z.uren) || 0)), 0);
        
        let dagUniekeVakken = new Set();
        ruweItems.forEach(z => { if(!z.geannuleerd) dagUniekeVakken.add(`${z.startTijd}|${z.eindTijd}`); });
        let dagTotaalKlok = 0;
        dagUniekeVakken.forEach(vak => {
            let parts = vak.split('|');
            dagTotaalKlok += berekenVerschilInUren(parts[0], parts[1]);
        });

        html += `
            <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:20px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.02); font-family:Arial, sans-serif;">
                <div style="background:#2c3e50; color:white; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:5px;">
                    <span style="font-size:1.1rem; font-weight:bold;">📅 ${dagKey}</span>
                    <span style="font-size:0.9rem; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:15px;">
                        Totaal: <strong>${dagTotaalKlok.toFixed(1)} Klokuren</strong> (${dagTotaalGehuurd.toFixed(1)} gehuurd) | <strong>€ ${dagTotaalKosten.toFixed(2).replace('.', ',')}</strong>
                    </span>
                </div>
                <table style="width:100%; border-collapse:collapse; margin:0;">
        `;

        samengevoegdeItems.forEach(zaal => {
            let bgClass = "bg-onbekend";
            if (zaal.status === "Geboekt") bgClass = "bg-geboekt";
            if (zaal.status === "Geannuleerd") bgClass = "bg-geannuleerd";
            if (zaal.status === "Gefactureerd") bgClass = "bg-gefactureerd";

            let rowStyle = zaal.geannuleerd ? 'background:#fef2f2; color:#b91c1c; opacity:0.8;' : '';
            let textDeco = zaal.geannuleerd ? 'text-decoration:line-through;' : '';
            let zaaldeelWeergave = zaal.zaaldeelLijst.join(' & ');
            
            let weergaveUren = zaal.aantalZalen > 1 
                ? `<span style="color:#e67e22; font-weight:bold; ${textDeco}">${(zaal.uren / zaal.aantalZalen).toFixed(1)} Klokuur</span><br><small style="color:#7f8c8d; ${textDeco}">(x${zaal.aantalZalen} zalen = ${zaal.uren.toFixed(1)} gehuurd)</small>` 
                : `<span style="font-weight:bold; ${textDeco}">${zaal.uren.toFixed(1)} u</span>`;

            // HIER ZIT HET NIEUWE DROPDOWN MENU
            let dropdownHtml = `
                <select onchange="updateGroepStatus('${zaal.idLijst.join(',')}', this.value)" class="status-select ${bgClass}">
                    <option value="Geboekt" ${zaal.status === 'Geboekt' ? 'selected' : ''}>Geboekt</option>
                    <option value="Gefactureerd" ${zaal.status === 'Gefactureerd' ? 'selected' : ''}>Gefactureerd</option>
                    <option value="Geannuleerd" ${zaal.status === 'Geannuleerd' ? 'selected' : ''}>Geannuleerd</option>
                </select>
            `;

            html += `
                <tr style="border-bottom:1px solid #e2e8f0; ${rowStyle}">
                    <td style="padding:12px 20px; font-weight:bold; width:150px; vertical-align:top; ${textDeco}">⏰ ${zaal.startTijd} - ${zaal.eindTijd}</td>
                    <td style="padding:12px 20px; vertical-align:top;">
                        <span style="font-size:1rem; font-weight:bold; color:#2c3e50; ${textDeco}">${zaal.zaal}</span><br>
                        <small style="color:#64748b; font-style:italic; ${textDeco}">${zaaldeelWeergave} ${zaal.opmerking !== '-' ? '<br>💬 ' + zaal.opmerking : ''}</small>
                    </td>
                    <td style="padding:12px 20px; text-align:right; width:160px; vertical-align:top;">
                        ${weergaveUren}
                    </td>
                    <td style="padding:12px 20px; text-align:right; font-weight:bold; width:100px; vertical-align:top; ${textDeco}">
                        ${zaal.geannuleerd ? '€ 0,00' : '€ ' + zaal.bedrag.toFixed(2).replace('.', ',')}
                    </td>
                    <td style="padding:12px 20px; text-align:right; width:150px; text-decoration:none !important; vertical-align:top;">
                        ${dropdownHtml}
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