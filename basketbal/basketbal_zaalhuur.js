// --- BASKETBAL_ZAALHUUR.JS ---

// ============================================================================
// CLOUD ONTVANGER
// ============================================================================
window.ontvangCloudDataZaalhuur = function(sleutel, data) {
    if (sleutel === 'blackshots_zaalhuur_data' && data) {
        window.zaalhuurData = data;
        let lbl = document.getElementById('label-zaalhuur');
        if (lbl && window.zaalhuurData.length > 0) {
            lbl.innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        }
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    }
};

window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.zaalhuurData.length > 0) {
        let lbl = document.getElementById('label-zaalhuur');
        if(lbl) lbl.innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    }
});

function genereerZaalID(datum, startTijd, zaal, zaaldeel) {
    return `${datum}-${startTijd}-${zaal}-${zaaldeel}`.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

window.downloadSjabloon = function() {
    const wb = XLSX.utils.book_new();
    const sjabloonData = [
        ["Datum", "Tijd", "Zaaldeel", "Zaal", "Bedrag", "Opmerking", "Status", "Gehuurd op"],
        ["Vrijdag 12 jun 2026", "18:00 - 19:30", "Sporthal VEKA zaaldeel A", "Sporthal VEKA", "27.81", "-", "Geboekt", "10-4-2025 09:56"]
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
// MAGIC MAIL SCANNER 
// ============================================================================
window.verwerkMailTekst = function(actie) {
    let tekst = document.getElementById('mail-plakbox').value;
    if(!tekst.trim()) return alert("Plak eerst de tekst uit je mail in het vakje!");

    let isAnnulering = (actie === 'annuleer');
    let nieuweStatus = isAnnulering ? "Geannuleerd" : "Geboekt";
    
    let lines = tekst.split('\n');
    let matchCount = 0;
    let nieuwCount = 0;
    let updateCount = 0;

    for(let i=0; i<lines.length; i++) {
        let line = lines[i].trim();
        let regex = /(?:€\s*(\d+[,.]\d{2}))?\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\s+van\s+(\d{2}[:.]\d{2})(?:\s*uur)?\s*tot\s+(\d{2}[:.]\d{2})/i;
        let match = regex.exec(line);

        if(match) {
            matchCount++;
            let bedragStr = match[1] || "0,00";
            let dag = match[2];
            let maand = match[3];
            let jaar = match[4];
            let startTijd = match[5].replace('.', ':');
            let eindTijd = match[6].replace('.', ':');

            let mailDatumStr = `${dag} ${maand} ${jaar}`;
            let mailIsoDatum = converteerNaarISODatum(mailDatumStr);
            let bedrag = parseFloat(bedragStr.replace(',', '.'));

            let zaalRaw = "Zaal Onbekend";
            if (i > 0 && lines[i-1].length > 5 && !lines[i-1].includes('€')) zaalRaw = lines[i-1].trim();
            else if (i > 1 && lines[i-2].length > 5 && !lines[i-2].includes('€')) zaalRaw = lines[i-2].trim();

            let zaalNaam = zaalRaw;
            let zaaldeel = "Zaaldeel onbekend";
            
            if(zaalRaw.toLowerCase().includes('veka')) {
                zaalNaam = "Sporthal VEKA";
                if(zaalRaw.toLowerCase().includes('hele zaal')) zaaldeel = "hele zaal";
                else if(zaalRaw.toLowerCase().includes('zaaldeel a')) zaaldeel = "zaaldeel A";
                else if(zaalRaw.toLowerCase().includes('zaaldeel b')) zaaldeel = "zaaldeel B";
            }

            let gevondenInSysteem = false;
            window.zaalhuurData.forEach(z => {
                if(z.isoDatum === mailIsoDatum && z.startTijd === startTijd) {
                    z.status = nieuweStatus;
                    z.geannuleerd = isAnnulering;
                    z.uren = isAnnulering ? 0 : berekenVerschilInUren(z.startTijd, z.eindTijd);
                    gevondenInSysteem = true;
                    updateCount++;
                }
            });

            if(!gevondenInSysteem && !isAnnulering) {
                let id = genereerZaalID(mailDatumStr, startTijd, zaalNaam, zaaldeel);
                window.zaalhuurData.push({
                    id: id,
                    datum: mailDatumStr,
                    isoDatum: mailIsoDatum,
                    startTijd: startTijd,
                    eindTijd: eindTijd,
                    zaaldeel: zaaldeel,
                    zaal: zaalNaam,
                    bedrag: bedrag,
                    opmerking: "Via mail toegevoegd",
                    status: "Geboekt",
                    geannuleerd: false,
                    uren: berekenVerschilInUren(startTijd, eindTijd),
                    type: "Overig" 
                });
                nieuwCount++;
            }
        }
    }

    if(matchCount > 0) {
        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('mail-plakbox').value = ""; 
        
        let msg = `✅ Er zijn ${matchCount} tijden in je tekst gevonden.\n\n`;
        if(isAnnulering) msg += `👉 Er zijn ${updateCount} tijden op 'Geannuleerd' gezet.`;
        else msg += `👉 ${nieuwCount} nieuwe reserveringen toegevoegd.\n👉 ${updateCount} bestaande boekingen geüpdatet.`;
        
        alert(msg);
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    } else {
        alert("❌ Er zijn geen geldige datums of tijden in deze tekst gevonden. Zorg dat je de letterlijke tekst 'van .. tot ..' kopieert.");
    }
};

window.verwerkZaalhuurBestand = function(e) {
    const file = e.target.files[0]; if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
        
        let dataMap = {};
        window.zaalhuurData.forEach(item => { dataMap[item.id] = item; });

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
            if (cleanBedrag.includes(',') && cleanBedrag.includes('.')) cleanBedrag = cleanBedrag.replace(/\./g, '').replace(',', '.');
            else if (cleanBedrag.includes(',')) cleanBedrag = cleanBedrag.replace(',', '.');
            let bedrag = parseFloat(cleanBedrag) || 0;

            let status = "Geboekt";
            let isGeannuleerd = false;
            let stLower = statusRaw.toLowerCase();

            if (stLower.includes('annuleer') || stLower.includes('verval') || stLower.includes('cancel')) {
                status = "Geannuleerd"; isGeannuleerd = true;
            } else if (stLower.includes('factureer')) {
                status = "Gefactureerd";
            }

            let uren = isGeannuleerd ? 0 : berekenVerschilInUren(startTijd, eindTijd);
            let id = genereerZaalID(datum, startTijd, zaal, zaaldeel);

            if(dataMap[id]) {
                dataMap[id].status = status;
                dataMap[id].geannuleerd = isGeannuleerd;
                dataMap[id].bedrag = bedrag;
            } else {
                dataMap[id] = {
                    id: id, datum: datum, isoDatum: converteerNaarISODatum(datum), startTijd: startTijd, 
                    eindTijd: eindTijd, zaaldeel: zaaldeel, zaal: zaal, bedrag: bedrag, opmerking: opmerking, 
                    status: status, geannuleerd: isGeannuleerd, uren: uren, type: "Overig"
                };
            }
        });

        window.zaalhuurData = Object.values(dataMap);
        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('label-zaalhuur').innerText = `✅ Database bijgewerkt!`;
        updateZaalDropdown(); 
        tekenZaalhuurResultaten();
    };
    reader.readAsArrayBuffer(file);
};

// ============================================================================
// HANDMATIGE UPDATES
// ============================================================================
window.updateGroepStatus = function(idsString, nieuweStatus) {
    if(nieuweStatus === 'Geannuleerd') {
        let akkoord = confirm("⚠️ LET OP: Heb je deze zaal ook ECHT geannuleerd in het portaal van de gemeente?");
        if(!akkoord) { tekenZaalhuurResultaten(); return; }
    }

    let ids = idsString.split(',');
    window.zaalhuurData.forEach(z => {
        if(ids.includes(z.id)) {
            z.status = nieuweStatus;
            z.geannuleerd = (nieuweStatus === 'Geannuleerd');
            z.uren = z.geannuleerd ? 0 : berekenVerschilInUren(z.startTijd, z.eindTijd); 
        }
    });
    localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
    tekenZaalhuurResultaten(); 
};

window.updateGroepType = function(idsString, nieuwType) {
    let ids = idsString.split(',');
    window.zaalhuurData.forEach(z => { if(ids.includes(z.id)) z.type = nieuwType; });
    localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
};

window.verwijderGroep = function(idsString) {
    if(!confirm("Weet je zeker dat je deze reservering definitief wilt verwijderen uit de app?")) return;
    
    let ids = idsString.split(',');
    window.zaalhuurData = window.zaalhuurData.filter(z => !ids.includes(z.id));
    localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
    tekenZaalhuurResultaten();
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
// UI TEKENEN
// ============================================================================
window.tekenZaalhuurResultaten = function() {
    let container = document.getElementById('zaalhuur-resultaten');
    let fZaal = document.getElementById('filter-zaal').value.toLowerCase();
    let fStatus = document.getElementById('filter-status').value.toLowerCase();
    let fVan = document.getElementById('filter-datum-van').value;
    let fTot = document.getElementById('filter-datum-tot').value;

    let gefilterdeData = window.zaalhuurData.filter(z => {
        return (!fZaal || z.zaal.toLowerCase().includes(fZaal)) && 
               (!fStatus || z.status.toLowerCase() === fStatus) && 
               (!fVan || z.isoDatum >= fVan) && 
               (!fTot || z.isoDatum <= fTot);
    });

    if (gefilterdeData.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen reserveringen gevonden...</p>';
        return;
    }

    let totaalKosten = gefilterdeData.reduce((som, z) => som + (z.geannuleerd ? 0 : z.bedrag), 0);
    let totaalGehuurdeUren = gefilterdeData.reduce((som, z) => som + (z.geannuleerd ? 0 : (Number(z.uren) || 0)), 0);
    let aantalGeannuleerd = gefilterdeData.filter(z => z.status === "Geannuleerd").length;
    let aantalGefactureerd = gefilterdeData.filter(z => z.status === "Gefactureerd").length;

    let uniekeTijdvakken = new Set();
    gefilterdeData.forEach(z => { if (!z.geannuleerd) uniekeTijdvakken.add(`${z.datum}|${z.startTijd}|${z.eindTijd}`); });
    let totaalKlokuren = 0;
    uniekeTijdvakken.forEach(vak => {
        let parts = vak.split('|'); totaalKlokuren += berekenVerschilInUren(parts[1], parts[2]);
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
                if (!uniekeTijdsloten[slotKey].zaaldeelLijst.includes(zaal.zaaldeel)) uniekeTijdsloten[slotKey].zaaldeelLijst.push(zaal.zaaldeel);
                uniekeTijdsloten[slotKey].idLijst.push(zaal.id);
                uniekeTijdsloten[slotKey].bedrag += zaal.bedrag;
                uniekeTijdsloten[slotKey].uren += zaal.uren;
                uniekeTijdsloten[slotKey].aantalZalen += 1;
            }
        });
        
        let samengevoegdeItems = Object.values(uniekeTijdsloten);
        samengevoegdeItems.sort((a, b) => a.startTijd.localeCompare(b.startTijd));

        html += `
            <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:20px; overflow:hidden; font-family:Arial, sans-serif;">
                <div style="background:#2c3e50; color:white; padding:12px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:1.1rem; font-weight:bold;">📅 ${dagKey}</span>
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
            
            let typeDropdown = `
                <select onchange="updateGroepType('${zaal.idLijst.join(',')}', this.value)" class="type-select">
                    <option value="Overig" ${zaal.type === 'Overig' ? 'selected' : ''}>Overig</option>
                    <option value="Training" ${zaal.type === 'Training' ? 'selected' : ''}>Training</option>
                    <option value="Wedstrijd" ${zaal.type === 'Wedstrijd' ? 'selected' : ''}>Wedstrijd</option>
                    <option value="Toernooi" ${zaal.type === 'Toernooi' ? 'selected' : ''}>Toernooi</option>
                    <option value="Extra" ${zaal.type === 'Extra' ? 'selected' : ''}>Extra Activiteit</option>
                </select>
            `;

            let dropdownHtml = `
                <select onchange="updateGroepStatus('${zaal.idLijst.join(',')}', this.value)" class="status-select ${bgClass}">
                    <option value="Geboekt" ${zaal.status === 'Geboekt' ? 'selected' : ''}>Geboekt</option>
                    <option value="Gefactureerd" ${zaal.status === 'Gefactureerd' ? 'selected' : ''}>Gefactureerd</option>
                    <option value="Geannuleerd" ${zaal.status === 'Geannuleerd' ? 'selected' : ''}>Geannuleerd</option>
                </select>
            `;

            html += `
                <tr style="border-bottom:1px solid #e2e8f0; ${rowStyle}">
                    <td style="padding:12px 20px; font-weight:bold; width:150px; ${textDeco}">⏰ ${zaal.startTijd} - ${zaal.eindTijd}</td>
                    <td style="padding:12px 20px;">
                        <span style="font-size:1rem; font-weight:bold; color:#2c3e50; ${textDeco}">${zaal.zaal}</span><br>
                        <small style="color:#64748b; font-style:italic; ${textDeco}">${zaal.zaaldeelLijst.join(' & ')}</small>
                    </td>
                    <td style="padding:12px 20px; width:120px;">
                        ${typeDropdown}
                    </td>
                    <td style="padding:12px 20px; text-align:right; font-weight:bold; width:100px; ${textDeco}">
                        ${zaal.geannuleerd ? '€ 0,00' : '€ ' + zaal.bedrag.toFixed(2).replace('.', ',')}
                    </td>
                    <td style="padding:12px 20px; text-align:right; width:150px;">
                        ${dropdownHtml}
                    </td>
                    <td style="padding:12px; width:40px; text-align:center;">
                        <button onclick="verwijderGroep('${zaal.idLijst.join(',')}')" class="btn-verwijder" title="Verwijder reservering">🗑️</button>
                    </td>
                </tr>
            `;
        });

        html += `</table></div>`;
    });

    container.innerHTML = html;
};

window.wisZaalhuur = function() {
    if(confirm("Weet je zeker dat je alle zaalhuur data wilt wissen? Dit wordt ook direct in de cloud verwijderd!")) {
        window.zaalhuurData = [];
        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        location.reload();
    }
};