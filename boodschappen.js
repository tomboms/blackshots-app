// --- BOODSCHAPPENLIJST LOGICA (MET KOGELVRIJE CATEGORIEËN & VEILIGE DATUMS) ---

window.handmatigeBoodschappen = JSON.parse(localStorage.getItem('avondeet_handmatig')) || [];
window.extraDBItems = JSON.parse(localStorage.getItem('avondeet_extra_db_items')) || [];

document.getElementById('voeg-extra-db-toe-btn')?.addEventListener('click', () => {
    const ingId = document.getElementById('extra-db-select').value;
    const aantal = parseFloat(document.getElementById('extra-db-aantal').value);
    const wie = document.getElementById('extra-db-wie').value;
    if (!ingId || !aantal) return alert("Selecteer een product en vul een aantal in.");
    window.extraDBItems.push({ ingId, aantal, wie });
    localStorage.setItem('avondeet_extra_db_items', JSON.stringify(window.extraDBItems));
    document.getElementById('extra-db-select').value = ''; 
    document.getElementById('extra-db-aantal').value = ''; 
    window.berekenBoodschappen();
});

document.getElementById('voeg-handmatig-toe-btn')?.addEventListener('click', () => {
    const naam = document.getElementById('handmatig-item').value.trim();
    const categorie = document.getElementById('handmatig-categorie').value;
    const prijs = parseFloat(document.getElementById('handmatig-prijs').value) || 0;
    const wie = document.getElementById('handmatig-wie').value;
    if (!naam) return alert("Vul een naam in.");
    window.handmatigeBoodschappen.push({ naam, categorie, prijs, wie });
    localStorage.setItem('avondeet_handmatig', JSON.stringify(window.handmatigeBoodschappen));
    document.getElementById('handmatig-item').value = ''; 
    document.getElementById('handmatig-prijs').value = '';
    window.berekenBoodschappen();
});

window.verwijderExtraDBItem = function(index) { 
    window.extraDBItems.splice(index, 1);
    localStorage.setItem('avondeet_extra_db_items', JSON.stringify(window.extraDBItems)); 
    window.berekenBoodschappen(); 
};

window.verwijderHandmatigItem = function(index) { 
    window.handmatigeBoodschappen.splice(index, 1);
    localStorage.setItem('avondeet_handmatig', JSON.stringify(window.handmatigeBoodschappen)); 
    window.berekenBoodschappen(); 
};

window.markeerHandmatigGekocht = function(index) {
    let item = window.handmatigeBoodschappen[index];
    window.aankoopDB = JSON.parse(localStorage.getItem('avondeet_aankopen')) || [];
    window.aankoopDB.push({
        datum: window.getIsoDatumS(new Date()),
        kosten: item.prijs,
        naam: item.naam
    });
    localStorage.setItem('avondeet_aankopen', JSON.stringify(window.aankoopDB));

    window.handmatigeBoodschappen.splice(index, 1);
    localStorage.setItem('avondeet_handmatig', JSON.stringify(window.handmatigeBoodschappen));
    window.berekenBoodschappen();
};

// HIER IS DE ONTBREKENDE GEKOCHT-KNOP FUNCTIE
window.markeerAlsGekocht = function(ingId, totaalGekochtAantal) {
    if (!window.voorraadDB) window.voorraadDB = [];
    let bestaand = window.voorraadDB.find(v => v.ingId === ingId && !v.isKliekje);
    if (bestaand) {
        bestaand.aantal += totaalGekochtAantal;
    } else {
        window.voorraadDB.push({
            id: 'voorraad_' + Date.now(),
            ingId: ingId,
            aantal: totaalGekochtAantal,
            isKliekje: false
        });
    }
    localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB));
    
    // Optioneel in de achtergrond opslaan voor je kassa/uitgaven statistieken
    const dbIng = ingredientenDB.find(i => i.id === ingId);
    if (dbIng) {
        window.aankoopDB = JSON.parse(localStorage.getItem('avondeet_aankopen')) || [];
        let geschatteKosten = 0;
        if (dbIng.verpAantal && dbIng.verpPrijs) {
            geschatteKosten = Math.ceil(totaalGekochtAantal / dbIng.verpAantal) * dbIng.verpPrijs;
        }
        window.aankoopDB.push({
            datum: window.getIsoDatumS(new Date()),
            kosten: geschatteKosten,
            naam: dbIng.naam
        });
        localStorage.setItem('avondeet_aankopen', JSON.stringify(window.aankoopDB));
    }
    
    // Herlaad de lijst: doordat het nu in je voorraad ligt, verdwijnt het direct van je lijstje!
    window.berekenBoodschappen();
};

window.berekenBoodschappen = function() {
    const startDateInput = document.getElementById('boodschappen-start');
    const eindDateInput = document.getElementById('boodschappen-eind');
    const winkelFilter = document.getElementById('boodschappen-winkel-filter') ? document.getElementById('boodschappen-winkel-filter').value : 'Alle';

    let startDatum, eindDatum;

    if (!startDateInput.value) { startDateInput.value = window.getIsoDatumS(new Date()); }
    let sParts = startDateInput.value.split('-');
    startDatum = new Date(sParts[0], sParts[1]-1, sParts[2]);

    if (!eindDateInput.value) {
        let defEind = new Date(startDatum);
        defEind.setDate(defEind.getDate() + 6); 
        eindDateInput.value = window.getIsoDatumS(defEind);
    }
    let eParts = eindDateInput.value.split('-');
    eindDatum = new Date(eParts[0], eParts[1]-1, eParts[2]);

    const extraLijst = document.getElementById('extra-db-lijst');
    if(extraLijst) {
        extraLijst.innerHTML = '';
        window.extraDBItems.forEach((item, index) => {
            const dbIng = ingredientenDB.find(i => i.id === item.ingId); 
            if(!dbIng) return;
            extraLijst.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--primary-color); border-radius:6px; padding:10px; margin-bottom:10px;">
                <span style="color:var(--primary-color); font-weight:bold; font-size:1.05rem;">➕ ${item.aantal} ${dbIng.eenheid} ${dbIng.naam} <small style="color:#7f8c8d;">(${item.wie})</small></span> 
                <button class="delete-btn" onclick="window.verwijderExtraDBItem(${index})">X</button>
            </li>`;
        });
    }

    const boodschappenLijst = {}; 
    const voegToeAanLijst = (ingId, benodigdAantal, wie) => {
        if (!boodschappenLijst[ingId]) boodschappenLijst[ingId] = { totaalBenodigd: 0, wieHeeftNodig: new Set() };
        boodschappenLijst[ingId].totaalBenodigd += benodigdAantal;
        boodschappenLijst[ingId].wieHeeftNodig.add(wie);
    };

    let loopDatum = new Date(startDatum); loopDatum.setHours(0,0,0,0);
    let eindDatumCheck = new Date(eindDatum); eindDatumCheck.setHours(0,0,0,0);

    while (loopDatum <= eindDatumCheck) {
        const isoDatum = window.getIsoDatumS(loopDatum);
        const dagData = weekPlanning[isoDatum];
        if (dagData) {
            ['ontbijt', 'lunch', 'diner', 'extra'].forEach(mltd => {
                if(mltd === 'ontbijt' && appInstellingen.toonOntbijt === false) return;
                if(mltd === 'lunch' && appInstellingen.toonLunch === false) return;
                const mData = dagData[mltd];
                if(!mData) return;

                const verwerkRecept = (recId, pers, wie) => {
                    if (recId && !recId.startsWith('status_')) {
                        const recept = receptenDB.find(r => r.id === recId);
                        if (recept) {
                            const factor = pers / recept.standaardPersonen;
                            recept.ingredienten.forEach(ing => voegToeAanLijst(ing.ingId, ing.aantal * factor, wie));
                        }
                    }
                };

                let standaardPersonen = (typeof appInstellingen !== 'undefined' && appInstellingen.personen) ? appInstellingen.personen : 2;
                if (mData.type === 'Samen') verwerkRecept(mData.samenRecept, mData.samenPersonen || standaardPersonen, 'Samen');
                else { verwerkRecept(mData.tomRecept, 1, 'Tom'); verwerkRecept(mData.ikeRecept, 1, 'Ike'); }
            });
        }
        loopDatum.setDate(loopDatum.getDate() + 1);
    }

    window.extraDBItems.forEach(item => voegToeAanLijst(item.ingId, item.aantal, item.wie));

    const actueleVoorraad = {};
    if(window.voorraadDB) {
        window.voorraadDB.forEach(v => {
            if(!actueleVoorraad[v.ingId]) actueleVoorraad[v.ingId] = 0;
            actueleVoorraad[v.ingId] += v.aantal;
        });
    }

    let totaalKosten = 0;
    let kostenPerPersoon = { Samen: 0, Tom: 0, Ike: 0 };
    
    const renderLijst = {};
    categorieLijst.forEach(c => renderLijst[c] = []);
    if (!renderLijst['Overig']) renderLijst['Overig'] = []; 

    for (const ingId in boodschappenLijst) {
        const item = boodschappenLijst[ingId];
        const dbIng = ingredientenDB.find(i => i.id === ingId);
        if(!dbIng) continue;
        
        let itemWinkel = (dbIng.winkel || 'Overig').trim().toLowerCase();
        let zoekWinkel = winkelFilter.trim().toLowerCase();
        if (winkelFilter !== 'Alle' && itemWinkel !== zoekWinkel) continue;

        let nodig = item.totaalBenodigd;
        let inHuis = actueleVoorraad[ingId] || 0;
        let tekort = nodig - inHuis;

        if (tekort <= 0) continue; 

        const verpakkingen = [
            { a: dbIng.verpAantal, p: dbIng.verpPrijs }, { a: dbIng.verpAantal2, p: dbIng.verpPrijs2 },
            { a: dbIng.verpAantal3, p: dbIng.verpPrijs3 }, { a: dbIng.verpAantal4, p: dbIng.verpPrijs4 },
            { a: dbIng.verpAantal5, p: dbIng.verpPrijs5 }
        ].filter(v => v.a && v.p).sort((x, y) => (x.p / x.a) - (y.p / y.a));

        let resterend = tekort; let itemKosten = 0; let aankoopDetails = []; let totaalGekochtAantal = 0;

        if (verpakkingen.length > 0) {
            for (let i = 0; i < verpakkingen.length; i++) {
                const v = verpakkingen[i];
                if (i === verpakkingen.length - 1) {
                    const stuks = Math.ceil(resterend / v.a);
                    if (stuks > 0) { itemKosten += stuks * v.p; totaalGekochtAantal += stuks * v.a; aankoopDetails.push(`${stuks}x ${v.a}${dbIng.eenheid}`); }
                } else {
                    const stuks = Math.floor(resterend / v.a);
                    if (stuks > 0) { itemKosten += stuks * v.p; resterend -= stuks * v.a; totaalGekochtAantal += stuks * v.a; aankoopDetails.push(`${stuks}x ${v.a}${dbIng.eenheid}`); }
                }
            }
        }

        totaalKosten += itemKosten;
        const verdeling = Array.from(item.wieHeeftNodig);
        if (verdeling.length === 1 && kostenPerPersoon[verdeling[0]] !== undefined) kostenPerPersoon[verdeling[0]] += itemKosten;
        else kostenPerPersoon['Samen'] += itemKosten;

        const cat = categorieLijst.includes(dbIng.categorie) ? dbIng.categorie : 'Overig';
        if (!renderLijst[cat]) renderLijst[cat] = [];

        let inHuisTekst = inHuis > 0 ? `<br><small style="color:#27ae60;">🏠 In voorraad: ${Math.round(inHuis * 10)/10} ${dbIng.eenheid} (Nog ${Math.round(tekort * 10)/10} extra nodig)</small>` : '';
        
        let winkelTag = '';
        if (dbIng.winkel && dbIng.winkel !== 'Overig' && winkelFilter === 'Alle') {
            winkelTag = `<span style="font-size:0.75rem; background:#8e44ad; color:white; padding:2px 6px; border-radius:4px; margin-left:5px;">${dbIng.winkel}</span>`;
        }
        let merkTag = dbIng.merk ? `<span style="font-size:0.75rem; background:#3498db; color:white; padding:2px 6px; border-radius:4px;">${dbIng.merk}</span>` : '';

        renderLijst[cat].push(`
            <li class="boodschap-export-item" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--border-color); padding:12px 0;">
                <div>
                    <strong class="b-naam" style="font-size:1.1rem;">${dbIng.naam}</strong> ${merkTag} ${winkelTag}
                    ${inHuisTekst}
                    <br><span class="b-info" style="color:#e67e22; font-weight:bold;">🛒 Koop: ${aankoopDetails.join(' + ')} (€${itemKosten.toFixed(2)})</span>
                </div>
                <button onclick="window.markeerAlsGekocht('${ingId}', ${totaalGekochtAantal})" style="background:#27ae60; color:white; border:none; padding:10px 15px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: 0.2s;">✅ Gekocht</button>
            </li>
        `);
    }

    window.handmatigeBoodschappen.forEach((h, index) => {
        totaalKosten += h.prijs;
        if(kostenPerPersoon[h.wie] !== undefined) kostenPerPersoon[h.wie] += h.prijs;
        else kostenPerPersoon['Samen'] += h.prijs;
        
        const cat = categorieLijst.includes(h.categorie) ? h.categorie : 'Overig';
        if (!renderLijst[cat]) renderLijst[cat] = [];

        renderLijst[cat].push(`
            <li class="boodschap-export-item" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed var(--border-color); padding:12px 0;">
                <div>
                    <strong class="b-naam" style="font-size:1.1rem;">${h.naam}</strong> <small style="color:#e67e22; font-weight:bold;">(${h.wie})</small><br>
                    <span class="b-info" style="color:#7f8c8d;">Vrije Invoer (€${h.prijs.toFixed(2)})</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="window.markeerHandmatigGekocht(${index})" style="background:#27ae60; color:white; border:none; padding:10px 15px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">✅ Gekocht</button>
                    <button class="delete-btn" onclick="window.verwijderHandmatigItem(${index})" style="padding:10px 15px;">🗑️</button>
                </div>
            </li>
        `);
    });

    const container = document.getElementById('gegroepeerde-boodschappen-container'); 
    if(container) {
        container.innerHTML = '';
        Object.keys(renderLijst).forEach(cat => {
            if (renderLijst[cat] && renderLijst[cat].length > 0) {
                container.innerHTML += `<h4 class="b-cat-titel" style="color:var(--primary-color); border-bottom:2px solid var(--primary-color); margin-top:20px; font-size:1.2rem; padding-bottom:5px;">${cat}</h4><ul class="b-cat-lijst" style="list-style:none; padding:0;">${renderLijst[cat].join('')}</ul>`;
            }
        });
    }

    const dEl = document.getElementById('totaal-prijs'); if(dEl) dEl.innerText = `€${totaalKosten.toFixed(2)}`;
    const splitContainer = document.getElementById('kosten-splitsing-container');
    if(splitContainer) {
        let baseSplit = kostenPerPersoon['Samen'] / 2;
        splitContainer.innerText = `Splitsing: Tom €${(baseSplit + kostenPerPersoon['Tom']).toFixed(2)} | Ike €${(baseSplit + kostenPerPersoon['Ike']).toFixed(2)}`;
    }
};

function bouwExportTekst() {
    const start = document.getElementById('boodschappen-start').value;
    const eind = document.getElementById('boodschappen-eind').value;
    const winkel = document.getElementById('boodschappen-winkel-filter').value;
    let winkelTekst = winkel !== 'Alle' ? `\n🏢 Winkel: ${winkel}` : '';
    
    let tekst = `🛒 *Boodschappenlijst*${winkelTekst}\n📅 Periode: ${start} t/m ${eind}\n\n`;

    const lijsten = document.querySelectorAll('.b-cat-lijst');
    if(lijsten.length === 0) return null;

    document.querySelectorAll('.b-cat-titel').forEach(h4 => {
        tekst += `\n📦 *${h4.innerText}*\n`;
        let ul = h4.nextElementSibling;
        ul.querySelectorAll('.boodschap-export-item').forEach(li => {
            let naam = li.querySelector('.b-naam').innerText;
            let info = li.querySelector('.b-info').innerText.replace('🛒 Koop:', '').trim();
            tekst += `[  ] ${naam} - ${info}\n`;
        });
    });

    tekst += `\n💰 Kassa-totaal: ${document.getElementById('totaal-prijs').innerText}\n`;
    tekst += `💳 ${document.getElementById('kosten-splitsing-container').innerText}\n`;
    return tekst;
}

document.getElementById('whatsapp-btn')?.addEventListener('click', () => {
    let tekst = bouwExportTekst();
    if(!tekst) return alert("Er staan geen artikelen op je lijst!");
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(tekst)}`, '_blank');
});

document.getElementById('txt-btn')?.addEventListener('click', () => {
    let tekst = bouwExportTekst();
    if(!tekst) return alert("Er staan geen artikelen op je lijst!");
    const blob = new Blob([tekst], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Boodschappen_${document.getElementById('boodschappen-start').value}.txt`;
    link.click();
});