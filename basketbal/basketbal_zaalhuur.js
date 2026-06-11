// --- BASKETBAL_ZAALHUUR.JS: DE INHOUDS-SCANNER ---

window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.zaalhuurData.length > 0) {
        document.getElementById('label-zaalhuur').innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        tekenZaalhuurResultaten();
    }
});

// ============================================================================
// EXCEL / CSV UITLEZEN (ZONDER KOPJES!)
// ============================================================================
window.verwerkZaalhuurBestand = function(e) {
    const file = e.target.files[0]; 
    if (!file) return;
    
    document.getElementById('label-zaalhuur').innerText = `⏳ Bestand scannen...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        // We lezen het bestand in als losse rijen (header: 1), we kijken dus niet meer naar kolomnamen!
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
        
        window.zaalhuurData = [];

        ruweData.forEach(row => {
            if (!row || row.length === 0) return; // Lege rij skippen

            let rijTekst = row.join(' ').toLowerCase();
            if (!rijTekst.trim()) return;

            let datum = "";
            let startTijd = "";
            let eindTijd = "";
            let accommodatie = "";

            // Loop door elke cel in de rij en kijk of de INHOUD lijkt op wat we zoeken
            row.forEach(cel => {
                if (!cel) return;
                let celStr = cel.toString().trim();
                let lw = celStr.toLowerCase();
                
                // 1. Zoek naar een Datum (bijv: 12-10-2026, 12/10/26 of 12 oktober 2026)
                if (lw.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/) || lw.match(/\d{1,2}\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\s+\d{4}/)) {
                    datum = celStr;
                }
                
                // 2. Zoek naar een Tijd (bijv: 19:00 - 20:30 of 19.00-20.30)
                if (lw.match(/\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2}/)) {
                    let parts = celStr.split('-');
                    startTijd = parts[0].trim();
                    eindTijd = parts[1].trim();
                } 
                // Als start en eindtijd in losse kolommen staan (bijv cel 1: 19:00, cel 2: 20:30)
                else if (lw.match(/^\d{1,2}[:.]\d{2}$/)) {
                    if (!startTijd) startTijd = celStr;
                    else if (!eindTijd) eindTijd = celStr;
                }

                // 3. Zoek naar de Locatie/Accommodatie
                if (lw.match(/(sporthal|gymzaal|sportcentrum|veka|brandevoort|braak|veld|zaal)/)) {
                    accommodatie = celStr;
                }
            });

            // Fallback: Als accommodatie leeg is, pak de eerste tekst die geen datum/tijd is
            if (!accommodatie) {
                let mogelijkeNamen = row.filter(c => {
                    let s = c ? c.toString().toLowerCase() : "";
                    return s.length > 3 && !s.match(/\d/) && !s.includes('geannuleerd') && !s.includes('geboekt') && !s.includes('gefactureerd');
                });
                if (mogelijkeNamen.length > 0) accommodatie = mogelijkeNamen[0].toString().trim();
            }

            // Bepaal Status
            let status = "Geboekt"; // Standaard aanname
            let isGeannuleerd = false;

            if (rijTekst.includes('geannuleerd') || rijTekst.includes('vervallen') || rijTekst.includes('cancel') || rijTekst.includes('doorgehaald')) {
                status = "Geannuleerd";
                isGeannuleerd = true;
            } else if (rijTekst.includes('gefactureerd')) {
                status = "Gefactureerd";
            } else if (rijTekst.includes('optie') || rijTekst.includes('concept')) {
                status = "Optie";
            }

            // Bereken uren
            let uren = 0;
            if (!isGeannuleerd && startTijd && eindTijd) {
                uren = berekenVerschilInUren(startTijd, eindTijd);
            }

            // Voeg toe aan ons systeem ALS we tenminste een datum en een tijd hebben gevonden
            if (datum && startTijd) {
                window.zaalhuurData.push({
                    datum: datum,
                    startTijd: startTijd,
                    eindTijd: eindTijd || "?",
                    accommodatie: accommodatie || "Zaal onbekend",
                    uren: uren,
                    status: status,
                    geannuleerd: isGeannuleerd
                });
            }
        });

        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('label-zaalhuur').innerText = `✅ Ingeladen: ${file.name}`;
        tekenZaalhuurResultaten();
    };
    reader.readAsArrayBuffer(file);
};

function berekenVerschilInUren(start, eind) {
    try {
        let [startUur, startMin] = start.replace('.', ':').split(':').map(Number);
        let [eindUur, eindMin] = eind.replace('.', ':').split(':').map(Number);
        let startTotaal = startUur + (startMin / 60);
        let eindTotaal = eindUur + (eindMin / 60);
        let verschil = eindTotaal - startTotaal;
        return verschil > 0 ? verschil : 0;
    } catch(e) {
        return 0;
    }
}

// ============================================================================
// UI TABEL TEKENEN
// ============================================================================
window.tekenZaalhuurResultaten = function() {
    let container = document.getElementById('zaalhuur-resultaten');
    
    if (window.zaalhuurData.length === 0) {
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen geldige rijen gevonden. Staan er datums en tijden in de Excel?</p>';
        return;
    }

    // Statistieken
    let totaalReserveringen = window.zaalhuurData.length;
    let aantalGeannuleerd = window.zaalhuurData.filter(z => z.status === "Geannuleerd").length;
    let aantalGefactureerd = window.zaalhuurData.filter(z => z.status === "Gefactureerd").length;
    let totaalUren = window.zaalhuurData.reduce((som, z) => som + z.uren, 0);

    document.getElementById('stat-totaal').innerText = totaalReserveringen;
    document.getElementById('stat-annuleringen').innerText = aantalGeannuleerd;
    document.getElementById('stat-gefactureerd').innerText = aantalGefactureerd;
    document.getElementById('stat-uren').innerText = totaalUren.toFixed(1) + " u";

    // Tabel
    let tabelHtml = `
        <table class="zaal-lijst">
            <thead>
                <tr>
                    <th>Datum</th>
                    <th>Tijd</th>
                    <th>Accommodatie</th>
                    <th>Uren</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    window.zaalhuurData.forEach(zaal => {
        let badgeClass = "status-onbekend";
        if (zaal.status === "Geboekt") badgeClass = "status-geboekt";
        if (zaal.status === "Geannuleerd") badgeClass = "status-geannuleerd";
        if (zaal.status === "Gefactureerd") badgeClass = "status-gefactureerd";
        if (zaal.status === "Optie") badgeClass = "status-te-plannen"; // Oranje
            
        let rowClass = "";
        if (zaal.status === "Geannuleerd") rowClass = "rij-geannuleerd";
        if (zaal.status === "Gefactureerd") rowClass = "rij-gefactureerd";

        tabelHtml += `
            <tr class="${rowClass}">
                <td><strong>${zaal.datum}</strong></td>
                <td>${zaal.startTijd} - ${zaal.eindTijd}</td>
                <td>${zaal.accommodatie}</td>
                <td>${zaal.uren > 0 ? zaal.uren.toFixed(1) + ' u' : '-'}</td>
                <td><span class="status-badge ${badgeClass}">${zaal.status}</span></td>
            </tr>
        `;
    });

    tabelHtml += `</tbody></table>`;
    container.innerHTML = tabelHtml;
};

// ============================================================================
// GEHEUGEN WISSEN
// ============================================================================
window.wisZaalhuur = function() {
    if(confirm("Weet je zeker dat je alle zaalhuur data wilt wissen?")) {
        localStorage.removeItem('blackshots_zaalhuur_data');
        location.reload();
    }
};