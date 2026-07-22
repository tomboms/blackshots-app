// --- BASKETBAL_DAGOVERZICHT.JS ---

window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

// Database inladen
window.spelersDB = window.veiligeArray('blackshots_spelers');
window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.nbbWedstrijden = window.veiligeArray('blackshots_wedstrijden_json');
window.customWedstrijden = window.veiligeArray('blackshots_custom_wedstrijden');
window.planStatusDB = window.veiligObject('blackshots_plan_status');
window.persoonsTakenDB = window.veiligObject('blackshots_persoons_taken');
window.speeldagenDB = window.veiligeArray('blackshots_speeldagen');

// NIEUW: Database speciaal voor uitslagen
window.uitslagenDB = window.veiligObject('blackshots_uitslagen');

window.normaalDatum = function(d) {
    if(!d) return "";
    let str = String(d).trim().substring(0, 10); 
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) { let delen = str.split('-'); return `${delen[2]}-${delen[1]}-${delen[0]}`; }
    return str;
};

window.genereerUniekId = function(w) {
    if (w.ID) return `nbb-${w.ID}`; 
    if (w.id) return w.id; 
    let thuisteam = w.Thuisteam ? String(w.Thuisteam) : ''; let uitteam = w.Uitteam ? String(w.Uitteam) : '';
    let clean = w.Wedstrijdnummer ? String(w.Wedstrijdnummer).replace(/[^a-zA-Z0-9]/g, '') : (thuisteam + uitteam).replace(/[^a-zA-Z0-9]/g, '');
    return `match-${window.normaalDatum(w.Datum)}-${clean}`;
};

window.naamWeergave = function(pId) {
    if (pId && pId !== "Vrij" && pId !== "") {
        let s = window.spelersDB.find(x => x.id === pId);
        let sr = window.scheidsrechtersDB.find(x => x.id === pId);
        return s ? s.naam : (sr ? sr.naam : pId);
    }
    return `<span style="color:#e74c3c;">Nog invullen</span>`;
};

document.addEventListener('DOMContentLoaded', () => {
    vulDagenDropdown();
    genereerPersoonOpties();
});

function vulDagenDropdown() {
    let selDag = document.getElementById('select-live-dag');
    selDag.innerHTML = '<option value="">-- Kies een Speeldag --</option>';
    let gesorteerdeDagen = [...window.speeldagenDB].sort();
    
    gesorteerdeDagen.forEach(dag => {
        let d = new Date(dag);
        let weergaveDatum = isNaN(d) ? dag : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        selDag.innerHTML += `<option value="${dag}">${weergaveDatum}</option>`;
    });
}

// Genereert de <option> HTML voor alle dropdowns in de bewerk-modal
let persoonOptiesHtml = '<option value="Vrij">-- Vrij / Geen --</option>';
function genereerPersoonOpties() {
    let allePersonen = [];
    window.spelersDB.forEach(s => allePersonen.push({ id: s.id, naam: s.naam }));
    window.scheidsrechtersDB.forEach(sr => { if (!sr.gekoppeldLid) allePersonen.push({ id: sr.id, naam: sr.naam }); });
    
    allePersonen.sort((a,b) => a.naam.localeCompare(b.naam));
    allePersonen.forEach(p => {
        persoonOptiesHtml += `<option value="${p.id}">${p.naam}</option>`;
    });
    
    // Vul de modal dropdowns alvast
    ['bewerk-sA', 'bewerk-sB', 'bewerk-tab', 'bewerk-sco'].forEach(id => {
        document.getElementById(id).innerHTML = persoonOptiesHtml;
    });
}

window.tekenDagoverzicht = function() {
    let speeldag = document.getElementById('select-live-dag').value;
    let container = document.getElementById('live-wedstrijden-container');
    
    if (!speeldag) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#7f8c8d; background:white; border-radius:8px; border:1px dashed #ccc;">Kies hierboven een speeldag om de wedstrijden te zien.</div>`;
        return;
    }

    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let dagWedstrijden = alleWedstrijden.filter(w => window.normaalDatum(w.Datum) === speeldag && window.planStatusDB[window.genereerUniekId(w)]);

    if(dagWedstrijden.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:#e74c3c; background:white; border-radius:8px; border:1px solid #fadbd8;">Geen geplande wedstrijden op deze dag in het systeem.</div>`;
        return;
    }

    // Sorteer op tijd
    dagWedstrijden.sort((a, b) => window.planStatusDB[window.genereerUniekId(a)].tijd.localeCompare(window.planStatusDB[window.genereerUniekId(b)].tijd));

    let html = '';
    
    dagWedstrijden.forEach(w => {
        let id = window.genereerUniekId(w);
        let st = window.planStatusDB[id];
        let pt = window.persoonsTakenDB[id] || {};
        let score = window.uitslagenDB[id] || { thuis: '-', uit: '-' };
        
        let thuisNaam = w.Thuisteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
        let uitNaam = w.Uitteam.replace(/Black Shots\s*-?\s*/i, 'BS ').trim();
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');

        // Maak de taak badges (scheidsrechters en tafel)
        let takenHtml = '';
        if (isThuis) {
            takenHtml = `
                <div class="taak-badge">🦓 <strong>Scheids:</strong> ${window.naamWeergave(pt.sA)} & ${window.naamWeergave(pt.sB)}</div>
                <div class="taak-badge">⏱️ <strong>Jury:</strong> ${window.naamWeergave(pt.tab)} (Tab) & ${window.naamWeergave(pt.sco)} (Sco)</div>
            `;
        } else {
            let auto1 = window.naamWeergave(pt.auto1); let auto2 = window.naamWeergave(pt.auto2); let auto3 = window.naamWeergave(pt.auto3);
            takenHtml = `<div class="taak-badge">🚗 <strong>Vervoer:</strong> ${[auto1, auto2, auto3].filter(x => !x.includes('Nog invullen')).join(', ') || '<span style="color:#e74c3c;">Nog niet geregeld</span>'}</div>`;
        }

        let weergaveScore = (score.thuis !== '-' && score.uit !== '-') ? `${score.thuis} - ${score.uit}` : '- - -';

        html += `
            <div class="match-card">
                <div class="match-tijd-veld">
                    <div class="match-tijd">${st.tijd}</div>
                    <div class="match-veld">Veld ${st.veld || '?'}</div>
                </div>
                <div class="match-info">
                    <div class="match-teams"><strong>${w.Thuisteam}</strong> vs ${w.Uitteam}</div>
                    <div class="match-taken">${takenHtml}</div>
                </div>
                <div class="match-score">
                    <div style="font-size:0.8rem; font-weight:bold; color:#7f8c8d; margin-bottom:5px;">Uitslag</div>
                    <div class="score-display">${weergaveScore}</div>
                    <button class="btn-bewerk" onclick="window.openBewerkModal('${id}')">✏️ Aanpassen</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

// ============================================================================
// MODAL LOGICA (Bewerken van Taken & Score)
// ============================================================================
window.openBewerkModal = function(matchId) {
    let alleWedstrijden = [...window.nbbWedstrijden, ...window.customWedstrijden];
    let w = alleWedstrijden.find(match => window.genereerUniekId(match) === matchId);
    
    if (!w) return alert("Wedstrijd niet gevonden!");

    document.getElementById('bewerk-match-id').value = matchId;
    document.getElementById('modal-match-titel').innerText = `${w.Thuisteam} - ${w.Uitteam}`;

    // Vul huidige uitslag in (als die er is)
    let score = window.uitslagenDB[matchId] || { thuis: '', uit: '' };
    document.getElementById('bewerk-score-thuis').value = score.thuis === '-' ? '' : score.thuis;
    document.getElementById('bewerk-score-uit').value = score.uit === '-' ? '' : score.uit;

    // Vul huidige taken in de dropdowns
    let pt = window.persoonsTakenDB[matchId] || {};
    document.getElementById('bewerk-sA').value = pt.sA || 'Vrij';
    document.getElementById('bewerk-sB').value = pt.sB || 'Vrij';
    document.getElementById('bewerk-tab').value = pt.tab || 'Vrij';
    document.getElementById('bewerk-sco').value = pt.sco || 'Vrij';

    // Toon het scherm
    document.getElementById('bewerk-modal').style.display = 'flex';
};

window.sluitModal = function() {
    document.getElementById('bewerk-modal').style.display = 'none';
};

window.slaWijzigingenOp = function() {
    let matchId = document.getElementById('bewerk-match-id').value;
    
    // 1. Sla Score Op
    let scoreThuis = document.getElementById('bewerk-score-thuis').value;
    let scoreUit = document.getElementById('bewerk-score-uit').value;
    
    if (scoreThuis !== "" && scoreUit !== "") {
        window.uitslagenDB[matchId] = { thuis: scoreThuis, uit: scoreUit };
    } else {
        delete window.uitslagenDB[matchId]; // Als het leeg is gemaakt, verwijder de score
    }

    // 2. Sla Taken Op
    if (!window.persoonsTakenDB[matchId]) window.persoonsTakenDB[matchId] = {};
    window.persoonsTakenDB[matchId].sA = document.getElementById('bewerk-sA').value;
    window.persoonsTakenDB[matchId].sB = document.getElementById('bewerk-sB').value;
    window.persoonsTakenDB[matchId].tab = document.getElementById('bewerk-tab').value;
    window.persoonsTakenDB[matchId].sco = document.getElementById('bewerk-sco').value;

    // 3. Wegschrijven naar LocalStorage/Firebase
    localStorage.setItem('blackshots_uitslagen', JSON.stringify(window.uitslagenDB));
    localStorage.setItem('blackshots_persoons_taken', JSON.stringify(window.persoonsTakenDB));

    // Firebase Sync Trigger (als je die hebt draaien)
    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_uitslagen', window.uitslagenDB);
        window.opslaanInFirebase('blackshots_persoons_taken', window.persoonsTakenDB);
    } else {
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_uitslagen', data: window.uitslagenDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_persoons_taken', data: window.persoonsTakenDB } }));
    }

    window.sluitModal();
    window.tekenDagoverzicht(); // Ververs het scherm direct!
};