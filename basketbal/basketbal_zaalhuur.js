// --- BASKETBAL_ZAALHUUR.JS ---

// Haal data uit lokaal geheugen. Firebase pakt de 'blackshots_' prefix direct op!
window.zaalhuurData = JSON.parse(localStorage.getItem('blackshots_zaalhuur_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    if (window.zaalhuurData.length > 0) {
        document.getElementById('label-zaalhuur').innerText = `✅ Zaalhuur geladen (${window.zaalhuurData.length} regels)`;
        tekenZaalhuurResultaten();
    }
});

// ============================================================================
// EXCEL / CSV UITLEZEN EN SLIM VERWERKEN
// ============================================================================
window.verwerkZaalhuurBestand = function(e) {
    const file = e.target.files[0]; 
    if (!file) return;
    
    document.getElementById('label-zaalhuur').innerText = `⏳ Bestand scannen...`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        let ruweData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {defval: ""});
        
        window.zaalhuurData = [];

        ruweData.forEach(rij => {
            // Voeg alle waarden van de rij samen tot één lange zin om makkelijk te zoeken
            let rijTekst = Object.values(rij).join(' ').toLowerCase();
            
            // Sla compleet lege regels over
            if (!rijTekst.trim()) return;

            // Zoek de belangrijkste kolommen (ongeacht hoe de gemeente ze exact noemt)
            let datum = vindWaarde(rij, ['datum', 'date', 'dag']);
            let startTijd = vindWaarde(rij, ['start', 'van', 'begin', 'tijd']);
            let eindTijd = vindWaarde(rij, ['eind', 'tot']);
            let accommodatie = vindWaarde(rij, ['accommodatie', 'locatie', 'complex', 'zaal', 'sport']);
            
            // Soms staat de tijd in 1 kolom als "19:00 - 20:30". Dat splitsen we hier op:
            if (startTijd && startTijd.includes('-') && !eindTijd) {
                let parts = startTijd.split('-');
                startTijd = parts[0].trim();
                eindTijd = parts[1].trim();
            }

            // Bepaal de status (Geboekt / Geannuleerd / Gefactureerd)
            let status = "Onbekend";
            let isGeannuleerd = false;

            if (rijTekst.includes('geannuleerd') || rijTekst.includes('vervallen') || rijTekst.includes('cancel')) {
                status = "Geannuleerd";
                isGeannuleerd = true;
            } else if (rijTekst.includes('gefactureerd')) {
                status = "Gefactureerd";
            } else if (rijTekst.includes('geboekt') || rijTekst.includes('definitief')) {
                status = "Geboekt";
            }

            // Bereken de actieve uren
            let uren = 0;
            if (!isGeannuleerd && startTijd && eindTijd) {
                uren = berekenVerschilInUren(startTijd, eindTijd);
            }

            // Voeg alleen toe als we minimaal een datum en een tijd hebben
            if (datum && startTijd && /\d/.test(startTijd)) {
                window.zaalhuurData.push({
                    datum: datum,
                    startTijd: startTijd,
                    eindTijd: eindTijd,
                    accommodatie: accommodatie || "Onbekend",
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

// Hulpscript om flexibel kolomnamen te zoeken
function vindWaarde(rij, zoektermen) {
    let gevondenKey = Object.keys(rij).find(key => 
        zoektermen.some(term => key.toLowerCase().includes(term))
    );
    return gevondenKey ? rij[gevondenKey].toString().trim() : "";
}

// Hulpscript om uren correct te berekenen (bijv. "19:00" tot "20:30" = 1.5)
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
        container.innerHTML = '<p style="color:#7f8c8d; font-style:italic;">Geen data gevonden. Weet je zeker dat het bestand de juiste kolommen heeft?</p>';
        return;
    }

    // Statistieken berekenen
    let totaalReserveringen = window.zaalhuurData.length;
    let aantalGeannuleerd = window.zaalhuurData.filter(z => z.status === "Geannuleerd").length;
    let aantalGefactureerd = window.zaalhuurData.filter(z => z.status === "Gefactureerd").length;
    let totaalUren = window.zaalhuurData.reduce((som, z) => som + z.uren, 0);

    document.getElementById('stat-totaal').innerText = totaalReserveringen;
    document.getElementById('stat-annuleringen').innerText = aantalGeannuleerd;
    document.getElementById('stat-gefactureerd').innerText = aantalGefactureerd;
    document.getElementById('stat-uren').innerText = totaalUren.toFixed(1) + " u";

    // Tabel opbouwen
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