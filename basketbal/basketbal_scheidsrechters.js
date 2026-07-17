// --- BASKETBAL_SCHEIDSRECHTERS.JS ---
window.veiligeArray = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return d ? (Array.isArray(d) ? d : Object.values(d)) : []; } catch(e) { return []; } };
window.veiligObject = function(key) { try { let d = JSON.parse(localStorage.getItem(key)); return (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; } catch(e) { return {}; } };

window.scheidsrechtersDB = window.veiligeArray('blackshots_scheidsrechters');
window.speeldagenDB = window.veiligeArray('blackshots_speeldagen');
window.beschikbaarheidDB = window.veiligObject('blackshots_beschikbaarheid');

// NIEUW: We laden de SpelersDB in om de koppeling te kunnen maken
window.spelersDB = window.veiligeArray('blackshots_spelers');

window.initScheidsMatrix = function() {
    window.renderMatrix();
};

window.slaDataOp = function() {
    localStorage.setItem('blackshots_scheidsrechters', JSON.stringify(window.scheidsrechtersDB));
    localStorage.setItem('blackshots_speeldagen', JSON.stringify(window.speeldagenDB));
    localStorage.setItem('blackshots_beschikbaarheid', JSON.stringify(window.beschikbaarheidDB));

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

window.ontvangCloudData = function(sleutel, data) {
    if (!data) return;
    if (sleutel === 'blackshots_scheidsrechters') window.scheidsrechtersDB = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_speeldagen') window.speeldagenDB = Array.isArray(data) ? data : Object.values(data);
    if (sleutel === 'blackshots_beschikbaarheid') window.beschikbaarheidDB = data;
    window.renderMatrix();
};

// ============================================================================
// ✍️ TOEVOEGEN, BEWERKEN & VERWIJDEREN
// ============================================================================
window.voegScheidsToe = function() {
    let naamInput = document.getElementById('nw-sr-naam');
    let naam = naamInput.value.trim();
    if (!naam) return alert("Vul een naam in.");

    window.scheidsrechtersDB.push({
        id: 'sr_' + Date.now(),
        naam: naam,
        gekoppeldTeam: "", 
        gekoppeldLid: "", // NIEUW: Standaard leeg
        maxPerDag: 2, 
        voorkeur: "" 
    });

    naamInput.value = '';
    window.slaDataOp();
    window.renderMatrix();
};

window.openBewerkScheidsModal = function(id) {
    let sr = window.scheidsrechtersDB.find(s => s.id === id);
    if(!sr) return;

    let teamsDB = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
    let teamSelect = document.getElementById('bewerk-sr-team');
    
    teamSelect.innerHTML = '<option value="">-- Geen (Fluit alleen) --</option>';
    teamsDB.forEach(t => {
        if(!t.isVrijwilliger) {
            teamSelect.innerHTML += `<option value="${t.naam}">${t.naam}</option>`;
        }
    });

    // NIEUW: Vul de Clubleden dropdown
    let lidSelect = document.getElementById('bewerk-sr-lid');
    lidSelect.innerHTML = '<option value="">-- Geen koppeling (Alleen Scheidsrechter) --</option>';
    
    let gesorteerdeSpelers = [...window.spelersDB].sort((a,b) => (a.naam||'').localeCompare(b.naam||''));
    gesorteerdeSpelers.forEach(speler => {
        lidSelect.innerHTML += `<option value="${speler.id}">${speler.naam} (${speler.bondsnummer || 'geen'})</option>`;
    });

    document.getElementById('bewerk-sr-id').value = sr.id;
    document.getElementById('bewerk-sr-naam').value = sr.naam;
    document.getElementById('bewerk-sr-lid').value = sr.gekoppeldLid || ""; // Laad huidige koppeling
    document.getElementById('bewerk-sr-team').value = sr.gekoppeldTeam || "";
    document.getElementById('bewerk-sr-max').value = sr.maxPerDag || 2;
    document.getElementById('bewerk-sr-voorkeur').value = sr.voorkeur || "";

    document.getElementById('bewerk-scheids-modal').style.display = 'flex';
};

window.slaBewerkteScheidsOp = function() {
    let id = document.getElementById('bewerk-sr-id').value;
    let sr = window.scheidsrechtersDB.find(s => s.id === id);
    if(!sr) return;

    let nwNaam = document.getElementById('bewerk-sr-naam').value.trim();
    if(!nwNaam) return alert("Naam mag niet leeg zijn.");

    sr.naam = nwNaam;
    sr.gekoppeldLid = document.getElementById('bewerk-sr-lid').value; // Sla koppeling op
    sr.gekoppeldTeam = document.getElementById('bewerk-sr-team').value; 
    sr.maxPerDag = parseInt(document.getElementById('bewerk-sr-max').value);
    sr.voorkeur = document.getElementById('bewerk-sr-voorkeur').value.trim();

    document.getElementById('bewerk-scheids-modal').style.display = 'none';
    window.slaDataOp();
    window.renderMatrix();
};

window.verwijderScheids = function(id) {
    if(confirm("Weet je zeker dat je deze scheidsrechter wilt verwijderen?")) {
        window.scheidsrechtersDB = window.scheidsrechtersDB.filter(sr => sr.id !== id);
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
        window.speeldagenDB.sort(); 
        document.getElementById('nw-dag-datum').value = '';
        window.slaDataOp();
        window.renderMatrix();
    } else {
        alert("Deze datum staat al in het rooster.");
    }
};

window.verwijderSpeeldag = function(datum) {
    if(confirm(`Wil je de datum ${datum} en alle ingevoerde beschikbaarheid daarvan verwijderen?`)) {
        window.speeldagenDB = window.speeldagenDB.filter(d => d !== datum);
        for (let key in window.beschikbaarheidDB) {
            if (key.endsWith('_' + datum)) delete window.beschikbaarheidDB[key];
        }
        window.slaDataOp();
        window.renderMatrix();
    }
};

// ============================================================================
// 🤖 AUTOMATISCHE THUISDAGEN OPHALEN UIT NBB KALENDER
// ============================================================================
window.haalDagenUitNBB = function() {
    let wedstrijden = JSON.parse(localStorage.getItem('blackshots_wedstrijden_json')) || [];
    let nieuwGevonden = 0;

    wedstrijden.forEach(w => {
        let isThuis = (w.Thuisteam || '').toLowerCase().includes('black shots');
        if (isThuis && w.Datum) {
            let isoDatum = w.Datum; 
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
        alert(`✅ Succes! Er zijn ${nieuwGevonden} nieuwe thuis-speeldagen aan de matrix toegevoegd.`);
    } else {
        alert("Geen nieuwe thuisdagen gevonden in de database.");
    }
};

// ============================================================================
// 🔄 MATRIX INTERACTIE (CELL TOGGLE)
// ============================================================================
window.toggleStatus = function(srId, datum) {
    let key = `${srId}_${datum}`;
    let huidig = window.beschikbaarheidDB[key] || 'nnb';
    
    if (huidig === 'nnb') window.beschikbaarheidDB[key] = 'aan';
    else if (huidig === 'aan') window.beschikbaarheidDB[key] = 'af';
    else window.beschikbaarheidDB[key] = 'nnb';

    window.slaDataOp();
    
    let btn = document.getElementById(`btn-${key}`);
    if (btn) {
        btn.className = 'status-btn';
        let nwStatus = window.beschikbaarheidDB[key];
        if (nwStatus === 'aan') {
            btn.classList.add('status-aan'); btn.innerText = '🟢 Aanwezig';
        } else if (nwStatus === 'af') {
            btn.classList.add('status-af'); btn.innerText = '🔴 Afwezig';
        } else {
            btn.classList.add('status-nnb'); btn.innerText = '⚪ N.N.B.';
        }
    }
};

// ============================================================================
// 🎨 RENDER DE MATRIX TABEL
// ============================================================================
window.renderMatrix = function() {
    let tabel = document.getElementById('beschikbaarheid-tabel');
    if (!tabel) return;

    if (window.scheidsrechtersDB.length === 0 && window.speeldagenDB.length === 0) {
        tabel.innerHTML = '<tr><td style="padding:20px; color:#7f8c8d; font-style:italic;">Voeg hierboven een scheidsrechter en/of een speeldag toe om te beginnen.</td></tr>';
        return;
    }

    let html = '<thead><tr>';
    html += '<th>Scheidsrechter info</th>';
    
    window.speeldagenDB.forEach(datum => {
        let d = new Date(datum);
        let weergaveDatum = isNaN(d) ? datum : d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
        html += `<th style="min-width:130px;">
                    ${weergaveDatum}
                    <button class="actie-btn" style="color:#e74c3c;" onclick="window.verwijderSpeeldag('${datum}')" title="Verwijder datum">🗑️</button>
                 </th>`;
    });
    html += '</tr></thead><tbody>';

    window.scheidsrechtersDB.forEach(sr => {
        let teamWeergave = sr.gekoppeldTeam ? `<span style="color:#c0392b; font-weight:bold;">${sr.gekoppeldTeam}</span>` : 'geen';
        let koppelingWeergave = sr.gekoppeldLid ? `<span title="Gekoppeld aan Spelers-ID" style="color:#8e44ad; font-size:0.9rem; margin-left:5px;">🔗</span>` : '';
        
        html += `<tr>`;
        html += `<td style="border-left: 5px solid #3498db; background:#fdfefe;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <strong style="font-size:1.05rem; color:var(--secondary-color);">${sr.naam}${koppelingWeergave}</strong>
                        <div>
                            <button class="actie-btn" style="color:#f39c12;" onclick="window.openBewerkScheidsModal('${sr.id}')" title="Bewerken">✏️</button>
                            <button class="actie-btn" style="color:#e74c3c;" onclick="window.verwijderScheids('${sr.id}')" title="Verwijder">🗑️</button>
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:#7f8c8d; margin-top:6px; line-height:1.4; text-align:left;">
                        🏃‍♂️ Speler in: <strong>${teamWeergave}</strong><br>
                        ⏱️ Max/dag: <strong>${sr.maxPerDag || 2}</strong> | 💡 Voorkeur: <strong>${sr.voorkeur || 'Geen'}</strong>
                    </div>
                 </td>`;
        
        window.speeldagenDB.forEach(datum => {
            let key = `${sr.id}_${datum}`;
            let status = window.beschikbaarheidDB[key] || 'nnb';
            
            let btnClass = 'status-nnb'; let btnText = '⚪ N.N.B.';
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