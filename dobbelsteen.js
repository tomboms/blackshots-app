// --- DOBBELSTEEN.JS: DE SLIMME SUGGESTIE MODULE ---

let actueleDobbelSessie = { datum: null, maaltijd: null, wie: null };

// We slaan de huidige keuzes op, zodat we ze per stuk kunnen 'herdobbelen'
let dobbelState = {
    voorraad: null, boodschappen: null, kliekje: null, stijl: null, gok: null
};

// We houden bij welke we al hebben weggedrukt (herdobbelt), zodat ze niet meer terugkomen
let geweigerdeIds = new Set();
let geplandeReceptenDezeWeek = new Set();

window.kiesSlimmeDobbelsteen = function(datum, maaltijd, wie) {
    if (!receptenDB || receptenDB.length === 0) return alert("Je hebt nog geen gerechten in je database!");
    
    actueleDobbelSessie = { datum, maaltijd, wie };
    geweigerdeIds.clear(); 
    bepaalGeplandeRecepten(datum);

    // Eerste keer alles berekenen
    dobbelState.voorraad = berekenVoorraadMatch();
    dobbelState.boodschappen = berekenBoodschappenMatch();
    dobbelState.kliekje = berekenKliekjeMatch();
    dobbelState.stijl = berekenStijlMatch(datum);
    dobbelState.gok = berekenGokMatch();

    renderDobbelsteenUI();
    document.getElementById('dobbelsteen-modal').style.display = 'flex';
}

// --- DE HERDOBBEL FUNCTIES (RE-ROLL) ---
window.herdobbel = function(categorie) {
    // Voeg het huidige recept toe aan de 'zwarte lijst' zodat hij niet wéér gekozen wordt
    if (dobbelState[categorie] && dobbelState[categorie].recept) {
        geweigerdeIds.add(dobbelState[categorie].recept.id);
    }

    // Bereken alleen de gekozen categorie opnieuw
    if (categorie === 'voorraad') dobbelState.voorraad = berekenVoorraadMatch();
    if (categorie === 'boodschappen') dobbelState.boodschappen = berekenBoodschappenMatch();
    if (categorie === 'stijl') dobbelState.stijl = berekenStijlMatch(actueleDobbelSessie.datum);
    if (categorie === 'gok') dobbelState.gok = berekenGokMatch();
    
    renderDobbelsteenUI();
}

// --- DE BEREKENINGEN ---
function getExcludeSet() {
    let exclude = new Set([...geplandeReceptenDezeWeek, ...geweigerdeIds]);
    // Voeg ook de actueel getoonde recepten toe (om dubbele suggesties IN het scherm te voorkomen)
    if(dobbelState.voorraad && dobbelState.voorraad.recept) exclude.add(dobbelState.voorraad.recept.id);
    if(dobbelState.boodschappen && dobbelState.boodschappen.recept) exclude.add(dobbelState.boodschappen.recept.id);
    if(dobbelState.stijl && dobbelState.stijl.recept) exclude.add(dobbelState.stijl.recept.id);
    if(dobbelState.gok && dobbelState.gok.recept) exclude.add(dobbelState.gok.recept.id);
    return exclude;
}

function bepaalGeplandeRecepten(datum) {
    geplandeReceptenDezeWeek.clear();
    let startVanWeek = new Date(datum);
    const dagVanDeWeek = startVanWeek.getDay() === 0 ? 6 : startVanWeek.getDay() - 1;
    startVanWeek.setDate(startVanWeek.getDate() - dagVanDeWeek);

    for (let i = 0; i < 7; i++) {
        let loopDatum = new Date(startVanWeek); loopDatum.setDate(loopDatum.getDate() + i);
        let iso = window.getIsoDatumS(loopDatum);
        if (weekPlanning[iso]) {
            ['ontbijt', 'lunch', 'diner', 'extra'].forEach(m => {
                let d = weekPlanning[iso][m];
                if (d && d.type === 'Samen' && d.samenRecept && !d.samenRecept.startsWith('status_')) geplandeReceptenDezeWeek.add(d.samenRecept);
                if (d && d.type === 'Apart') {
                    if (d.tomRecept && !d.tomRecept.startsWith('status_')) geplandeReceptenDezeWeek.add(d.tomRecept);
                    if (d.ikeRecept && !d.ikeRecept.startsWith('status_')) geplandeReceptenDezeWeek.add(d.ikeRecept);
                }
            });
        }
    }
    
    // VANGNET: Als we te weinig recepten hebben, laten we dubbele recepten toch toe.
    if (receptenDB.filter(r => !geplandeReceptenDezeWeek.has(r.id)).length === 0) {
        geplandeReceptenDezeWeek.clear();
    }
}

function berekenVoorraadMatch() {
    let exclude = getExcludeSet();
    let inHuisDict = {};
    if(window.voorraadDB) { window.voorraadDB.forEach(v => { if(!inHuisDict[v.ingId]) inHuisDict[v.ingId] = 0; inHuisDict[v.ingId] += v.aantal; }); }
    
    let matches = [];
    receptenDB.forEach(r => {
        if (exclude.has(r.id) || !r.ingredienten || r.ingredienten.length === 0) return;
        let inHuis = 0;
        r.ingredienten.forEach(ing => { if (inHuisDict[ing.ingId] && inHuisDict[ing.ingId] > 0) inHuis++; });
        matches.push({ recept: r, pct: Math.round((inHuis / r.ingredienten.length) * 100) });
    });
    matches.sort((a, b) => b.pct - a.pct);
    return matches.length > 0 ? matches[0] : null;
}

function berekenBoodschappenMatch() {
    let exclude = getExcludeSet();
    let geplandeIngIds = new Set();
    
    // Zoek overlap in toekomstige planning
    for (const [dag, data] of Object.entries(weekPlanning)) {
        if(new Date(dag) >= new Date().setHours(0,0,0,0)) {
            ['ontbijt', 'lunch', 'diner', 'extra'].forEach(m => {
                if(data[m] && data[m].type === 'Samen' && data[m].samenRecept && !data[m].samenRecept.startsWith('status_')) {
                    const plR = receptenDB.find(x => x.id === data[m].samenRecept);
                    if(plR) plR.ingredienten.forEach(i => geplandeIngIds.add(i.ingId));
                }
            });
        }
    }
    
    let matches = [];
    receptenDB.forEach(r => {
        if (exclude.has(r.id) || !r.ingredienten || r.ingredienten.length === 0) return;
        let overlap = 0;
        r.ingredienten.forEach(ing => { if (geplandeIngIds.has(ing.ingId)) overlap++; });
        if(overlap > 0) matches.push({ recept: r, pct: Math.round((overlap / r.ingredienten.length) * 100) });
    });
    matches.sort((a,b) => b.pct - a.pct);
    return matches.length > 0 ? matches[0] : null;
}

function berekenKliekjeMatch() {
    if(!window.voorraadDB) return null;
    let kliekjes = window.voorraadDB.filter(v => v.isKliekje);
    return kliekjes.length > 0 ? kliekjes[0] : null;
}

function berekenStijlMatch(datum) {
    let exclude = getExcludeSet();
    let gisteren = new Date(datum); gisteren.setDate(gisteren.getDate() - 1);
    let gisterenIso = window.getIsoDatumS(gisteren);
    let gisterenStijlTags = [];
    
    if(weekPlanning[gisterenIso] && weekPlanning[gisterenIso].diner && weekPlanning[gisterenIso].diner.samenRecept) {
        let rG = receptenDB.find(r => r.id === weekPlanning[gisterenIso].diner.samenRecept);
        if(rG && rG.tags) {
            rG.tags.forEach(tagNaam => {
                let t = window.tagsLijst && window.tagsLijst.find(x => x.naam === tagNaam);
                if (t && t.isStijl) gisterenStijlTags.push(tagNaam);
            });
        }
    }
    
    let andereStyleRecepten = receptenDB.filter(r => {
        if(exclude.has(r.id)) return false;
        if(!r.tags || r.tags.length === 0) return true;
        return !r.tags.some(tagNaam => gisterenStijlTags.includes(tagNaam));
    });
    
    return andereStyleRecepten.length > 0 ? { recept: andereStyleRecepten[Math.floor(Math.random() * andereStyleRecepten.length)] } : null;
}

function berekenGokMatch() {
    let exclude = getExcludeSet();
    let mogelijkeRandoms = receptenDB.filter(r => !exclude.has(r.id));
    return mogelijkeRandoms.length > 0 ? { recept: mogelijkeRandoms[Math.floor(Math.random() * mogelijkeRandoms.length)] } : null;
}

// --- DE WEERGAVE (UI) ---
function renderDobbelsteenUI() {
    const container = document.getElementById('dobbel-opties-container');
    container.innerHTML = '';

    // Helper functie om een kaartje te maken
    const maakKaartje = (categorie, titel, kleur, icoon, matchData, subTekst) => {
        if (!matchData || !matchData.recept) {
            return `
            <div style="background:var(--bg-color); border:1px dashed var(--border-color); padding:12px; border-radius:8px; text-align:left; opacity:0.6; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="background:#7f8c8d; color:white; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:bold; margin-bottom:5px; display:inline-block;">${icoon} ${titel}</span>
                    <strong style="font-size:1.1rem; color:var(--text-main); display:block;">Geen extra opties gevonden</strong>
                </div>
            </div>`;
        }

        return `
        <div style="display:flex; gap:10px; margin-bottom:10px;">
            <div onclick="window.toepasDobbelKeuze('${matchData.recept.id}')" style="flex:1; background:var(--card-bg); border:2px solid ${kleur}; padding:12px; border-radius:8px; cursor:pointer; text-align:left; transition:0.2s;">
                <span style="background:${kleur}; color:white; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:bold; margin-bottom:5px; display:inline-block;">${icoon} ${titel}</span>
                <strong style="font-size:1.1rem; color:var(--text-main); display:block;">${matchData.recept.naam}</strong>
                <small style="color:#7f8c8d; font-size:0.85rem; display:block; margin-top:3px;">${subTekst}</small>
            </div>
            <button onclick="window.herdobbel('${categorie}')" title="Geef me een andere optie" style="background:var(--bg-color); border:1px solid ${kleur}; color:${kleur}; border-radius:8px; width:45px; cursor:pointer; font-size:1.2rem; font-weight:bold; transition:0.2s;">🔄</button>
        </div>`;
    };

    container.innerHTML += maakKaartje('voorraad', 'De Voorraad Koning', '#27ae60', '📦', dobbelState.voorraad, dobbelState.voorraad ? `Je hebt al <strong>${dobbelState.voorraad.pct}%</strong> in huis!` : '');
    container.innerHTML += maakKaartje('boodschappen', 'De Boodschappen Koning', '#3498db', '🛒', dobbelState.boodschappen, dobbelState.boodschappen ? `Deelt <strong>${dobbelState.boodschappen.pct}%</strong> met je rest van je week.` : '');
    
    // Kliekjes (geen reroll nodig, je eet ze gewoon op)
    if (dobbelState.kliekje) {
        container.innerHTML += `
        <div onclick="window.toepasDobbelKeuzeKliekje('${dobbelState.kliekje.naam}')" style="background:var(--card-bg); border:2px solid #8e44ad; padding:12px; border-radius:8px; cursor:pointer; text-align:left; transition:0.2s; margin-bottom:10px;">
            <span style="background:#8e44ad; color:white; font-size:0.75rem; padding:3px 8px; border-radius:12px; font-weight:bold; margin-bottom:5px; display:inline-block;">🥣 Kliekjes Koning</span>
            <strong style="font-size:1.1rem; color:var(--text-main); display:block;">${dobbelState.kliekje.naam}</strong>
            <small style="color:#7f8c8d; font-size:0.85rem; display:block; margin-top:3px;">Er liggen nog <strong>${dobbelState.kliekje.aantal} porties</strong> in de koelkast!</small>
        </div>`;
    }

    container.innerHTML += maakKaartje('stijl', 'Een Andere Stijl', '#f39c12', '🌶️', dobbelState.stijl, 'Gegarandeerd een andere smaak dan gisteren.');
    container.innerHTML += maakKaartje('gok', 'Blinde Gok', '#e74c3c', '❓', dobbelState.gok, 'Laat je verrassen!');
}

// --- TOEPASSEN IN AGENDA ---
window.toepasDobbelKeuze = function(receptId) {
    const { datum, maaltijd, wie } = actueleDobbelSessie;
    if (wie === 'samen') weekPlanning[datum][maaltijd].samenRecept = receptId;
    if (wie === 'tom') weekPlanning[datum][maaltijd].tomRecept = receptId;
    if (wie === 'ike') weekPlanning[datum][maaltijd].ikeRecept = receptId;
    window.slaPlanningOp(); window.renderDagPlanner(); window.renderAgenda(); 
    if(typeof window.renderDashboardDrieDagen === "function") window.renderDashboardDrieDagen();
    document.getElementById('dobbelsteen-modal').style.display = 'none';
}

window.toepasDobbelKeuzeKliekje = function(kliekjeNaam) {
    const { datum, maaltijd, wie } = actueleDobbelSessie;
    const statusNaam = `status_${kliekjeNaam}`;
    if (wie === 'samen') weekPlanning[datum][maaltijd].samenRecept = statusNaam;
    if (wie === 'tom') weekPlanning[datum][maaltijd].tomRecept = statusNaam;
    if (wie === 'ike') weekPlanning[datum][maaltijd].ikeRecept = statusNaam;
    window.slaPlanningOp(); window.renderDagPlanner(); window.renderAgenda(); 
    document.getElementById('dobbelsteen-modal').style.display = 'none';
}