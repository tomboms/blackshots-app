// --- BASKETBAL_ZAALHUUR.JS ---

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
window.activiteitenDB = JSON.parse(localStorage.getItem('blackshots_activiteiten')) || [];
window.geplandeTrainingen = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};
// NIEUW: Laad het vaste team-schema in
window.teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];

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
                    id: id, datum: mailDatumStr, isoDatum: mailIsoDatum, startTijd: startTijd, eindTijd: eindTijd, 
                    zaaldeel: zaaldeel, zaal: zaalNaam, bedrag: bedrag, opmerking: "Via mail toegevoegd", 
                    status: "Geboekt", geannuleerd: false, uren: berekenVerschilInUren(startTijd, eindTijd), 
                    type: "Overig", legitiemZonderAgenda: false, legitiemReden: "" 
                });
                nieuwCount++;
            }
        }
    }

    if(matchCount > 0) {
        localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
        document.getElementById('mail-plakbox').value = ""; 
        alert(`✅ Er zijn ${matchCount} tijden verwerkt.\nNieuw: ${nieuwCount}\nUpdate: ${updateCount}`);
        updateZaalDropdown();
        tekenZaalhuurResultaten();
    } else {
        alert("❌ Er zijn geen geldige datums/tijden gevonden in de tekst.");
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
                    status: status, geannuleerd: isGeannuleerd, uren: uren, type: "Overig",
                    legitiemZonderAgenda: false, legitiemReden: ""
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
        if(!confirm("⚠️ LET OP: Heb je deze zaal ook ECHT geannuleerd in het portaal van de gemeente?")) { 
            tekenZaalhuurResultaten(); return; 
        }
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
    window.runZaalScanner(); // Update de scanner
};

function updateZaalDropdown() {
    let zalen = [...new Set(window.zaalhuurData.map(z => z.zaal))];
    let select = document.getElementById('filter-zaal');
    if(!select) return;
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
// DE SLIMME CROSS-CHECK SCANNER 🤖
// ============================================================================
window.runZaalScanner = function() {
    let lekkenContainer = document.getElementById('scanner-lekken-lijst');
    let tekortContainer = document.getElementById('scanner-tekort-lijst');
    if(!lekkenContainer || !tekortContainer) return;

    let huidigeDatum = new Date().toISOString().split('T')[0];

    // 1. Zoek naar GELDLEKKEN (Zaalhuur gevonden, maar geen Activiteit in de agenda)
    let actieveHuur = window.zaalhuurData.filter(z => !z.geannuleerd && z.isoDatum >= huidigeDatum);
    let lekken = [];

    // Combineer huur per dag/tijdvak om te voorkomen dat 'zaaldeel A' en 'B' als twee lekken tellen
    let huurGroepen = {};
    actieveHuur.forEach(z => {
        let key = `${z.isoDatum}|${z.startTijd}`;
        if (!huurGroepen[key]) huurGroepen[key] = { datum: z.datum, isoDatum: z.isoDatum, startTijd: z.startTijd, ids: [z.id], legitiem: z.legitiemZonderAgenda, reden: z.legitiemReden };
        else {
            huurGroepen[key].ids.push(z.id);
            // Als één zaaldeel legitiem was gemarkeerd, telt het hele vak als legitiem
            if (z.legitiemZonderAgenda) huurGroepen[key].legitiem = true;
        }
    });

    Object.values(huurGroepen).forEach(huur => {
        // 1. Check in de eenmalige Jaarplanning (Wedstrijden etc.)
        let heeftActiviteit = window.activiteitenDB.some(act => {
            if (act.datum !== huur.isoDatum) return false;
            if (!act.tijd) return true; 
            let actUur = parseInt(act.tijd.split(':')[0]);
            let huurUur = parseInt(huur.startTijd.split(':')[0]);
            return Math.abs(actUur - huurUur) <= 2; 
        });

        // 2. Check specifieke trainingsdag (via Firebase structuur)
        let heeftTraining = false;
        if (!heeftActiviteit) {
            let datumPrefix = huur.isoDatum + "_";
            let trainingSleutels = Object.keys(window.geplandeTrainingen);
            heeftTraining = trainingSleutels.some(key => key.startsWith(datumPrefix));
        }

        // 3. NIEUW: Check het vaste trainingsschema (Zelfs als ze nog niet handmatig gepland zijn)
        let heeftVasteTraining = false;
        if (!heeftActiviteit && !heeftTraining) {
            // Converteer datum naar een weekdag-nummer (0=Zondag, 1=Maandag, 5=Vrijdag)
            let d = new Date(huur.isoDatum + 'T12:00:00'); 
            let huurDagNummer = d.getDay(); 

            heeftVasteTraining = window.teamsDB.some(team => {
                if (!team.trainingen || !Array.isArray(team.trainingen)) return false;
                
                return team.trainingen.some(tr => {
                    if (tr.dag !== huurDagNummer) return false; // Niet op dezelfde dag
                    
                    if (!tr.start) return false;
                    let trUur = parseInt(tr.start.split(':')[0]);
                    let huurUur = parseInt(huur.startTijd.split(':')[0]);
                    
                    // Check of het binnen ~1.5 uur van elkaar start
                    return Math.abs(trUur - huurUur) <= 1.5; 
                });
            });
        }

        // Als geen van de 3 systemen een match oplevert, is het een lek!
        if (!heeftActiviteit && !heeftTraining && !heeftVasteTraining) {
            lekken.push(huur);
        }
    });

    // Weergave Geldlekken
    if (lekken.length === 0) {
        lekkenContainer.innerHTML = `<div style="padding:10px; background:#f0fbf4; color:#27ae60; border-radius:4px; font-weight:bold;">✅ Geen geldlekken gevonden. Alle zalen zijn in gebruik!</div>`;
    } else {
        let lekHtml = '';
        lekken.forEach(lek => {
            if (lek.legitiem) {
                lekHtml += `<div class="scanner-card conflict-lek" style="border-left-color:#27ae60; opacity:0.8;">
                    <div class="scanner-card-header"><span>${lek.datum}</span> <span>${lek.startTijd}</span></div>
                    <div style="font-size:0.85rem; color:#27ae60; font-weight:bold;">✓ Geaccepteerd: ${lek.reden}</div>
                    <button onclick="window.markeerHuurLegitiem('${lek.ids.join(',')}', false)" style="margin-top:5px; background:none; border:none; color:#7f8c8d; text-decoration:underline; font-size:0.75rem; cursor:pointer;">Annuleer markering</button>
                </div>`;
            } else {
                lekHtml += `<div class="scanner-card conflict-lek">
                    <div class="scanner-card-header"><span>${lek.datum}</span> <span style="color:#e67e22;">${lek.startTijd}</span></div>
                    <div style="font-size:0.85rem; color:#7f8c8d; margin-bottom:8px;">Wel betaald, geen agenda-item!</div>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="reden-${lek.ids[0]}" placeholder="Reden (bijv: Vrijspelen)" style="flex:1; padding:5px; border:1px solid #bdc3c7; border-radius:4px; font-size:0.8rem;">
                        <button onclick="window.markeerHuurLegitiem('${lek.ids.join(',')}', true, '${lek.ids[0]}')" style="background:#e67e22; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">OK</button>
                    </div>
                </div>`;
            }
        });
        lekkenContainer.innerHTML = lekHtml;
    }

// 2. Zoek naar ZAALTEKORTEN (Alles wat een zaal nodig heeft, maar géén huur heeft)
    let tekorten = [];
    let verwachteZalen = [];

    // Helper: Check of een specifieke datum is gemarkeerd als vakantie/feestdag in de Jaarplanning
    function isDatumEenVakantie(isoDatum) {
        return window.activiteitenDB.some(act => {
            if (act.datum !== isoDatum) return false;
            // Check op de 'isVakantie' boolean, óf of het type/id gelijk is aan 'vakantie'
            if (act.isVakantie === true) return true;
            let typeStr = (act.type || "").toLowerCase();
            return typeStr.includes('vakantie');
        });
    }

    // A. Haal alle eenmalige activiteiten op (Wedstrijden etc. voor VANDAAG of later)
    window.activiteitenDB.forEach(act => {
        if (!act.datum || act.datum < huidigeDatum) return;
        if (isDatumEenVakantie(act.datum)) return; // Sla vakanties over!
        
        let typeStr = (act.type || "").toLowerCase();
        let locStr = (act.locatie || "").toLowerCase();
        
        // Is het een thuiswedstrijd, training, of in één van onze zalen?
        if (typeStr.includes('thuis') || typeStr.includes('training') || locStr.includes('veste') || locStr.includes('veka') || locStr.includes('wijstwijzer')) {
            verwachteZalen.push({
                datum: act.datum,
                tijd: act.tijd || "",
                titel: act.titel || "Activiteit",
                type: act.type || "Activiteit"
            });
        }
    });

    // B. Haal alle VASTE trainingen op (Genereer voor de komende 30 dagen)
    for (let i = 0; i <= 30; i++) {
        let d = new Date();
        d.setDate(d.getDate() + i);
        let isoDatum = d.toISOString().split('T')[0];
        let dagNummer = d.getDay(); // 0=Zondag, 1=Maandag, etc.

        // Als deze dag in de jaarplanning GEEN vakantie/feestdag is, voeg de vaste trainingen toe
        if (!isDatumEenVakantie(isoDatum)) {
            window.teamsDB.forEach(team => {
                if (team.trainingen && Array.isArray(team.trainingen)) {
                    team.trainingen.forEach(tr => {
                        if (tr.dag === dagNummer) {
                            verwachteZalen.push({
                                datum: isoDatum,
                                tijd: tr.start || "",
                                titel: `Training ${team.naam}`,
                                type: "Vaste Training"
                            });
                        }
                    });
                }
            });
        }
    }

    // C. Cross-Check: Is er zaalhuur voor al deze verwachtingen?
    verwachteZalen.forEach(verwacht => {
        let heeftHuur = actieveHuur.some(z => {
            if (z.isoDatum !== verwacht.datum) return false;
            if (!verwacht.tijd || !z.startTijd) return true; // Tijd onbekend? Dan rekenen we de zaal voor die dag goed.
            
            let verwUur = parseInt(verwacht.tijd.split(':')[0]);
            let huurUur = parseInt(z.startTijd.split(':')[0]);
            
            // Check of we binnen 2 uur van elkaar zitten
            return Math.abs(verwUur - huurUur) <= 2; 
        });

        if (!heeftHuur) {
            // Voorkom dubbele meldingen op precies dezelfde dag/tijd
            let dubbel = tekorten.find(t => t.datum === verwacht.datum && t.tijd === verwacht.tijd);
            if (dubbel) {
                if (!dubbel.titel.includes(verwacht.titel)) {
                    dubbel.titel += ` + ${verwacht.titel}`;
                }
            } else {
                tekorten.push(verwacht);
            }
        }
    });

    // Sorteer alles netjes chronologisch
    tekorten.sort((a, b) => a.datum.localeCompare(b.datum) || a.tijd.localeCompare(b.tijd));

    // D. Weergave Zaaltekorten genereren met de Nederlandse datum (DD-MM-YYYY)
    if (tekorten.length === 0) {
        tekortContainer.innerHTML = `<div style="padding:10px; background:#f0fbf4; color:#27ae60; border-radius:4px; font-weight:bold;">✅ Geen tekorten. Voor de komende 30 dagen is overal een zaal voor!</div>`;
    } else {
        let tekortHtml = '';
        tekorten.forEach(tekort => {
            // Zet de datum om van YYYY-MM-DD naar DD-MM-YYYY
            let datumParts = tekort.datum.split('-');
            let weergaveDatum = `${datumParts[2]}-${datumParts[1]}-${datumParts[0]}`;

            tekortHtml += `<div class="scanner-card conflict-tekort">
                <div class="scanner-card-header"><span style="color:#c0392b;">${tekort.type}</span> <span>${tekort.tijd || 'Tijd onbekend'}</span></div>
                <div style="font-size:0.9rem; font-weight:bold;">${tekort.titel}</div>
                <div style="font-size:0.8rem; color:#7f8c8d; margin-top:5px;">Datum: ${weergaveDatum}</div>
            </div>`;
        });
        tekortContainer.innerHTML = tekortHtml;
    }
};

window.markeerHuurLegitiem = function(idsString, isLegitiem, inputId = null) {
    let reden = "";
    if (isLegitiem && inputId) {
        reden = document.getElementById(`reden-${inputId}`).value.trim();
        if (!reden) return alert("Vul even een korte reden in (zoals 'Scheidsrechterscursus' of 'Vrijspelen').");
    }

    let ids = idsString.split(',');
    window.zaalhuurData.forEach(z => {
        if (ids.includes(z.id)) {
            z.legitiemZonderAgenda = isLegitiem;
            z.legitiemReden = reden;
        }
    });

    localStorage.setItem('blackshots_zaalhuur_data', JSON.stringify(window.zaalhuurData));
    window.runZaalScanner(); // Update de lijstjes
};

// ============================================================================
// UI TEKENEN
// ============================================================================
window.tekenZaalhuurResultaten = function() {
    let container = document.getElementById('zaalhuur-resultaten');
    let fZaal = document.getElementById('filter-zaal') ? document.getElementById('filter-zaal').value.toLowerCase() : "";
    let fStatus = document.getElementById('filter-status') ? document.getElementById('filter-status').value.toLowerCase() : "";
    let fVan = document.getElementById('filter-datum-van') ? document.getElementById('filter-datum-van').value : "";
    let fTot = document.getElementById('filter-datum-tot') ? document.getElementById('filter-datum-tot').value : "";

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