// --- BASKETBAL_SCHEIDSRECHTERS.JS ---

// Databanken ophalen uit local storage
window.scheidsrechtersDB = JSON.parse(localStorage.getItem('blackshots_scheidsrechters')) || [];
window.speeldagenDB = JSON.parse(localStorage.getItem('blackshots_speeldagen')) || [];
window.beschikbaarheidDB = JSON.parse(localStorage.getItem('blackshots_beschikbaarheid')) || {};

window.initScheidsMatrix = function() {
    window.renderMatrix();
};

window.slaDataOp = function() {
    localStorage.setItem('blackshots_scheidsrechters', JSON.stringify(window.scheidsrechtersDB));
    localStorage.setItem('blackshots_speeldagen', JSON.stringify(window.speeldagenDB));
    localStorage.setItem('blackshots_beschikbaarheid', JSON.stringify(window.beschikbaarheidDB));

    // Stuur direct door naar de Firebase Cloud!
    if (typeof window.opslaanInFirebase === 'function') {
        window.opslaanInFirebase('blackshots_scheidsrechters', window.scheidsrechtersDB);
        window.opslaanInFirebase('blackshots_speeldagen', window.speeldagenDB);
        window.opslaanInFirebase('blackshots_beschikbaarheid', window.beschikbaarheidDB);
    } else {
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_scheidsrechters', data: window.scheidsrechtersDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_speeldagen', data: window.speeldagenDB } }));
        document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: 'blackshots_beschikbaarheid', data: window.beschikbaarheidDB } }));
    }
};

// ============================================================================
// ✍️ TOEVOEGEN & VERWIJDEREN
// ============================================================================
window.voegScheidsToe = function() {
    let naamInput = document.getElementById('nw-sr-naam');
    let naam = naamInput.value.trim();
    if (!naam) return alert("Vul een naam in.");

    window.scheidsrechtersDB.push({
        id: 'sr_' + Date.now(),
        naam: naam,
        maxPerDag: 2 // Standaardwaarde (kunnen we later eventueel aanpassen in een modal)
    });

    naamInput.value = '';
    window.slaDataOp();
    window.renderMatrix();
};

window.verwijderScheids = function(id) {
    if(confirm("Scheidsrechter verwijderen?")) {
        window.scheidsrechtersDB = window.scheidsrechtersDB.filter(sr => sr.id !== id);
        // Schoon ook de matrix op om ruimte te besparen
        for (let key in window.beschikbaarheidDB) {
            if (key.startsWith(id + '_')) delete window.beschikbaarheidDB[key];
        }
        window.slaDataOp();
        window.renderMatrix();
    }
};

window.voegSpeeldagToe = function() {
    let datum = document.getElementById('nw-dag-datum').value;
    if (!datum) return alert("Kies een datum.");
    
    if(!window.speeldagenDB.includes(datum)) {
        window.speeldagenDB.push(datum);
        window.speeldagenDB.sort(); // Sorteer op tijd
        document.getElementById('nw-dag-datum').value = '';
        window.slaDataOp();
        window.renderMatrix();
    } else {
        alert("Deze datum staat al in het rooster.");
    }
};

window.verwijderSpeeldag = function(datum) {
    if(confirm(`Wil je de datum ${datum} verwijderen?`)) {
        window.speeldagenDB = window.speeldagenDB.filter(d => d !== datum);
        for (let key in window.beschikbaarheidDB) {
            if (key.endsWith('_' + datum)) delete window.beschikbaarheidDB[key];
        }
        window.slaDataOp();
        window.renderMatrix();
    }
};

// ============================================================================
// 🤖 SLIMME EXTRACTIE UIT NBB
// ============================================================================
window.haalDagenUitNBB = function() {
    let wedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
    let nieuwGevonden = 0;

    wedstrijden.forEach(w => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        if (isThuis && w.Datum) {
            // Check of datum formaat YYYY-MM-DD is, in NBB export is het soms anders
            let isoDatum = w.Datum; 
            // Simpele check of we hem al hebben
            if(!window.speeldagenDB.includes(isoDatum)) {
                window.speeldagenDB.push(isoDatum);
                nieuwGevonden++;
            }
        }
    });

    if (nieuwGevonden > 0) {
        window.speeldagenDB.sort();
        window.slaDataOp();
        window.renderMatrix();
        alert(`✅ Succes! Er zijn ${nieuwGevonden} nieuwe thuis-speeldagen aan het rooster toegevoegd.`);
    } else {
        alert("Geen nieuwe thuisdagen gevonden in de agenda.");
    }
};

// ============================================================================
// 🔄 STATUS WISSELAAR
// ============================================================================
window.toggleStatus = function(srId, datum) {
    let key = `${srId}_${datum}`;
    let huidig = window.beschikbaarheidDB[key] || 'nnb';
    
    // Loop: nnb -> aan -> af -> nnb
    if (huidig === 'nnb') window.beschikbaarheidDB[key] = 'aan';
    else if (huidig === 'aan') window.beschikbaarheidDB[key] = 'af';
    else window.beschikbaarheidDB[key] = 'nnb';

    window.slaDataOp();
    
    // Update alleen de specifieke knop (veel sneller dan hele tabel renderen)
    let btn = document.getElementById(`btn-${key}`);
    if (btn) {
        btn.className = 'status-btn';
        let nwStatus = window.beschikbaarheidDB[key];
        if (nwStatus === 'aan') {
            btn.classList.add('status-aan');
            btn.innerText = '🟢 Aanwezig';
        } else if (nwStatus === 'af') {
            btn.classList.add('status-af');
            btn.innerText = '🔴 Afwezig';
        } else {
            btn.classList.add('status-nnb');
            btn.innerText = '⚪ N.N.B.';
        }
    }
};

// ============================================================================
// 🎨 RENDER DE TABEL
// ============================================================================
window.renderMatrix = function() {
    let tabel = document.getElementById('beschikbaarheid-tabel');
    if (!tabel) return;

    if (window.scheidsrechtersDB.length === 0 && window.speeldagenDB.length === 0) {
        tabel.innerHTML = '<tr><td style="padding:20px; color:#7f8c8d;">Voeg een scheidsrechter en/of een speeldag toe om te beginnen.</td></tr>';
        return;
    }

    let html = '<thead><tr>';
    html += '<th>Scheidsrechter</th>';
    
    // Kolommen voor elke datum
    window.speeldagenDB.forEach(datum => {
        // Maak er een leesbare NL datum van (optioneel)
        let d = new Date(datum);
        let weergaveDatum = isNaN(d) ? datum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
        html += `<th style="min-width:120px;">
                    ${weergaveDatum}
                    <button class="del-btn" onclick="window.verwijderSpeeldag('${datum}')" title="Verwijder datum">🗑️</button>
                 </th>`;
    });
    html += '</tr></thead><tbody>';

    // Rijen voor elke scheidsrechter
    window.scheidsrechtersDB.forEach(sr => {
        html += `<tr>`;
        html += `<td>
                    ${sr.naam}
                    <button class="del-btn" onclick="window.verwijderScheids('${sr.id}')" title="Verwijder scheids">🗑️</button>
                 </td>`;
        
        window.speeldagenDB.forEach(datum => {
            let key = `${sr.id}_${datum}`;
            let status = window.beschikbaarheidDB[key] || 'nnb';
            
            let btnClass = 'status-nnb';
            let btnText = '⚪ N.N.B.';
            
            if (status === 'aan') { btnClass = 'status-aan'; btnText = '🟢 Aanwezig'; }
            if (status === 'af') { btnClass = 'status-af'; btnText = '🔴 Afwezig'; }

            html += `<td>
                        <button id="btn-${key}" class="status-btn ${btnClass}" onclick="window.toggleStatus('${sr.id}', '${datum}')">${btnText}</button>
                     </td>`;
        });
        html += `</tr>`;
    });

    html += '</tbody>';
    tabel.innerHTML = html;
};