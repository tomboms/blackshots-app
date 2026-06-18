// --- BASKETBAL_PLANNER.JS: DE THUISWEDSTRIJD PLANNER MOTOR ---

window.nbbWedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];

// Instellingen voor de grid
const START_UUR = 8; // 08:00
const EIND_UUR = 23; // 23:00
const PIXELS_PER_UUR = 60; // 1 minuut = 1 pixel (60px per uur)

window.initPlanner = function() {
    let datumInput = document.getElementById('plan-datum');
    // Zet datum standaard op komende zaterdag of vandaag
    let vandaag = new Date();
    let dag = vandaag.getDay();
    let verschilZaterdag = (dag <= 6) ? (6 - dag) : 6;
    vandaag.setDate(vandaag.getDate() + verschilZaterdag);
    
    datumInput.value = vandaag.toISOString().split('T')[0];
    window.laadPlanbord();
};

window.laadPlanbord = function() {
    let bord = document.getElementById('planner-bord-container');
    let locatie = document.getElementById('plan-locatie').value;
    let speelDatum = document.getElementById('plan-datum').value;
    
    if(!bord || !speelDatum) return;

    let html = '';

    // 1. Tijd-as opbouwen
    html += `<div class="tijd-as"><div class="veld-header">Tijd</div>`;
    for(let u = START_UUR; u < EIND_UUR; u++) {
        html += `<div class="tijd-slot">${String(u).padStart(2, '0')}:00</div>`;
    }
    html += `</div>`;

    // 2. Bepaal aantal velden (Veka = 2, Veste = 1)
    let aantalVelden = locatie === 'veka' ? 2 : 1;
    let veldNamen = locatie === 'veka' ? ['Veld 1', 'Veld 2'] : ['De Veste Hoofdveld'];

    // 3. Bouw de veld-kolommen en hun grid-lijntjes (30m / 60m)
    for(let v = 0; v < aantalVelden; v++) {
        let gridLijnenHtml = `<div class="grid-lijnen">`;
        for(let u = START_UUR; u < EIND_UUR; u++) {
            gridLijnenHtml += `<div class="grid-lijn-30m"></div><div class="grid-lijn-60m"></div>`;
        }
        gridLijnenHtml += `</div>`;

        html += `
            <div class="veld-kolom" id="veld-kolom-${v+1}">
                <div class="veld-header">${veldNamen[v]}</div>
                ${gridLijnenHtml}
                <div id="wedstrijd-container-${v+1}" style="position:absolute; top:42px; left:0; right:0; bottom:0;">
                    <!-- Wedstrijden komen hier -->
                </div>
            </div>
        `;
    }

    bord.innerHTML = html;
    window.plaatsWedstrijdenOpBord(speelDatum, aantalVelden);
};

window.plaatsWedstrijdenOpBord = function(datum, aantalVelden) {
    // Filter alleen de thuiswedstrijden voor Black Shots op deze datum
    let dagWedstrijden = window.nbbWedstrijden.filter(w => {
        let isDatum = w.Datum === datum || w.Datum.includes(datum);
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        return isDatum && isThuis;
    });

    if(dagWedstrijden.length === 0) return; // Geen wedstrijden vandaag

    dagWedstrijden.sort((a,b) => (a.Tijd || '00:00').localeCompare(b.Tijd || '00:00'));

    let blokHoogteMinuten = 90; // Standaard 1.5 uur = 90px

    dagWedstrijden.forEach((w, index) => {
        let tijdStr = w.Tijd || '12:00';
        let uren = parseInt(tijdStr.split(':')[0]);
        let minuten = parseInt(tijdStr.split(':')[1]);

        // Rekenen: Hoeveel pixels vanaf de top? (Start is 08:00)
        let minutenVanafStart = ((uren - START_UUR) * 60) + minuten;
        let topPositie = minutenVanafStart; // 1 minuut = 1 pixel

        // Verdeel over Veld 1 en 2 (Simpele wisselende verdeling als start, later Drag & Drop)
        let doelVeld = (index % aantalVelden) + 1;
        let container = document.getElementById(`wedstrijd-container-${doelVeld}`);

        if (container) {
            let wedstrijdNaam = w.Thuisteam.replace('Black Shots ', '') || 'Onbekend Team';
            let tegenstander = w.Uitteam || 'Tegenstander';

            // Teken het wedstrijdblokje
            container.innerHTML += `
                <div class="wedstrijd-blok" style="top: ${topPositie}px; height: ${blokHoogteMinuten}px;">
                    <div class="wb-titel">🏀 ${wedstrijdNaam} vs ${tegenstander}</div>
                    <div class="wb-meta">Tijdstip: <strong>${tijdStr}</strong> | Nummer: ${w.Wedstrijdnummer || '?'}</div>
                    <div class="wb-taken">
                        <div class="taak-regel"><span>👨‍⚖️ Scheids:</span> <span>-- N.t.b. --</span></div>
                        <div class="taak-regel"><span>⏱️ Tafel:</span> <span>-- N.t.b. --</span></div>
                    </div>
                </div>
            `;
        }
    });
};