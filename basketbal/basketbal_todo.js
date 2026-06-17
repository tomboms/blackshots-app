// --- BASKETBAL_TODO.JS: DE SMART KANBAN ENGINE ---

window.todoDB = JSON.parse(localStorage.getItem('blackshots_todo')) || [];
window.actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker')) || { naam: "Onbekend" };

window.initTodoModule = function() {
    window.genereerSlimmeTaken();
    window.renderKanbanBord();
};

// ============================================================================
// 🤖 1. DE SLIMME INBOX (DATABASE SCANNER)
// ============================================================================
window.slimmeSuggesties = [];

window.genereerSlimmeTaken = function() {
    window.slimmeSuggesties = [];
    
    let spelers = JSON.parse(localStorage.getItem('blackshots_spelers')) || [];
    let teams = JSON.parse(localStorage.getItem('blackshots_teams')) || [];
    let trainingen = JSON.parse(localStorage.getItem('blackshots_trainingen')) || {};
    let toernooien = JSON.parse(localStorage.getItem('blackshots_toernooi')) || {};
    
    // Check 1: Proefleden die langer dan 14 dagen meedraaien
    let vandaag = new Date();
    spelers.forEach(s => {
        if (s.isProeflid && s.lidSinds && s.lidSinds !== 'Proefperiode') {
            // Dit is even een simpele check, je zou hier nog echt datumverschil kunnen rekenen
            window.slimmeSuggesties.push({
                titel: `Vraag ${s.naam} voor officieel lidmaatschap`,
                omschrijving: `${s.naam} staat nog als proeflid in het systeem.`,
                urgentie: 'normaal', verantwoordelijke: 'Bestuur', link: 'spelers.html'
            });
        }
    });

    // Check 2: Teams zonder Coach of Trainer
    teams.forEach(t => {
        if (!t.isVrijwilliger && !t.isRecreant) {
            if (!t.coach || t.coach.trim() === '') {
                window.slimmeSuggesties.push({
                    titel: `Zoek coach voor ${t.naam}`, omschrijving: `Er is nog geen coach geregistreerd voor team ${t.naam}.`,
                    urgentie: 'hoog', verantwoordelijke: 'Bestuur', link: 'team.html'
                });
            }
        }
    });

    // Check 3: JOUW WENS -> Naderende Training ZONDER Oefeningen (Binnen 3 dagen)
    let over3Dagen = new Date(); over3Dagen.setDate(vandaag.getDate() + 3);
    let over3DagenIso = over3Dagen.toISOString().split('T')[0];
    let vandaagIso = vandaag.toISOString().split('T')[0];

    teams.forEach(team => {
        if (team.trainer && team.trainer.toLowerCase().includes(window.actieveGebruiker.naam.toLowerCase())) {
            if (Array.isArray(team.trainingen)) {
                team.trainingen.forEach(tr => {
                    // Simpele check: Valt deze trainingsdag in de komende 3 dagen?
                    let komendeDatum = new Date(vandaag);
                    let afstand = (tr.dag - vandaag.getDay() + 7) % 7;
                    if (afstand === 0) afstand = 7; // Vandaag is 0, maar we kijken vooruit
                    
                    if (afstand <= 3) {
                        komendeDatum.setDate(vandaag.getDate() + afstand);
                        let checkIso = komendeDatum.toISOString().split('T')[0];
                        let agendaSleutel = `${checkIso}_${team.id}`;
                        
                        let gepland = trainingen[agendaSleutel];
                        if (!gepland || gepland.length === 0) {
                            window.slimmeSuggesties.push({
                                titel: `Plan training voor ${team.naam}`, 
                                omschrijving: `Je geeft over ${afstand} dag(en) training, maar hebt nog geen oefeningen in de agenda gezet.`,
                                tijdvak: `Voorafgaand aan de training om ${tr.start}`,
                                urgentie: 'hoog', verantwoordelijke: window.actieveGebruiker.naam, link: 'agenda.html'
                            });
                        }
                    }
                });
            }
        }
    });

    window.renderSlimmeInbox();
};

window.renderSlimmeInbox = function() {
    let container = document.getElementById('smart-inbox-container');
    let lijst = document.getElementById('smart-inbox-lijst');
    if (!container || !lijst) return;

    // Filter suggesties eruit die toevallig al letterlijk als taak op het bord staan
    let openTitels = window.todoDB.map(t => t.titel.toLowerCase());
    let actieveSuggesties = window.slimmeSuggesties.filter(s => !openTitels.includes(s.titel.toLowerCase()));

    if (actieveSuggesties.length > 0) {
        container.style.display = 'block';
        let html = '';
        actieveSuggesties.forEach((sug, index) => {
            let uKleur = sug.urgentie === 'hoog' ? '#c0392b' : '#d35400';
            html += `
                <div class="smart-kaart">
                    <div>
                        <strong style="color:#2c3e50; font-size:0.95rem; display:block;">💡 ${sug.titel}</strong>
                        <span style="font-size:0.8rem; color:#7f8c8d;">Voor: <strong>${sug.verantwoordelijke}</strong> | Urgentie: <span style="color:${uKleur};">${sug.urgentie.toUpperCase()}</span></span>
                    </div>
                    <button onclick="window.accepteerSuggestie(${index})" style="background:#27ae60; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:0.85rem;">Toevoegen</button>
                </div>
            `;
        });
        lijst.innerHTML = html;
    } else {
        container.style.display = 'none';
    }
};

window.accepteerSuggestie = function(index) {
    let sug = window.slimmeSuggesties[index];
    if (!sug) return;

    window.todoDB.push({
        id: 'td_' + Date.now(),
        titel: sug.titel,
        omschrijving: sug.omschrijving,
        tijdvak: sug.tijdvak || "",
        deadline: "",
        urgentie: sug.urgentie,
        verantwoordelijke: sug.verantwoordelijke,
        status: 'todo',
        link: sug.link || ""
    });

    localStorage.setItem('blackshots_todo', JSON.stringify(window.todoDB));
    window.genereerSlimmeTaken(); // Herberekenen
    window.renderKanbanBord();
};

// ============================================================================
// 📋 2. HET KANBAN BORD
// ============================================================================
window.renderKanbanBord = function() {
    let kTodo = document.getElementById('kolom-todo');
    let kDoing = document.getElementById('kolom-doing');
    let kDone = document.getElementById('kolom-done');
    if (!kTodo || !kDoing || !kDone) return;

    kTodo.innerHTML = ''; kDoing.innerHTML = ''; kDone.innerHTML = '';
    let cTodo = 0, cDoing = 0, cDone = 0;

    let filterType = document.getElementById('filter-verantwoordelijke').value;
    let mijnNaam = window.actieveGebruiker.naam.toLowerCase();

    window.todoDB.forEach(taak => {
        // Filter logica
        if (filterType === 'ik') {
            let verantw = (taak.verantwoordelijke || "").toLowerCase();
            if (!verantw.includes(mijnNaam) && !verantw.includes("iedereen")) return;
        }

        // Labels en kleuren
        let badgeClass = taak.urgentie === 'hoog' ? 'badge-urgentie-hoog' : (taak.urgentie === 'laag' ? 'badge-urgentie-laag' : 'badge-urgentie-normaal');
        let urgentieTekst = taak.urgentie.toUpperCase();
        let borderKleur = taak.urgentie === 'hoog' ? '#e74c3c' : (taak.urgentie === 'laag' ? '#2ecc71' : '#f39c12');
        if (taak.status === 'done') borderKleur = '#bdc3c7'; // Grijs als het klaar is

        // JOUW WENS: Tijdsvenster prominent tonen
        let tijdvakHtml = taak.tijdvak ? `<div style="background:#fef5e7; padding:4px 6px; border-radius:4px; font-size:0.75rem; color:#d35400; font-weight:bold; margin-bottom:5px; display:inline-block;">⏱️ ${taak.tijdvak}</div><br>` : '';
        let deadlineHtml = taak.deadline ? `📅 ${taak.deadline} | ` : '';
        let linkHtml = taak.link ? `<button onclick="window.location.href='${taak.link}'" style="background:none; border:none; color:#3498db; cursor:pointer; font-size:0.8rem; padding:0; font-weight:bold; margin-bottom:5px;">🔗 Naar Pagina</button><br>` : '';

        // Status Verplaats Knoppen
        let moveKnoppen = '';
        if (taak.status === 'todo') {
            moveKnoppen = `<button onclick="window.veranderStatus('${taak.id}', 'doing')" style="background:#f39c12; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold; width:100%;">STARTEN ▶</button>`;
            cTodo++;
        } else if (taak.status === 'doing') {
            moveKnoppen = `
                <button onclick="window.veranderStatus('${taak.id}', 'todo')" style="background:#bdc3c7; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold; width:48%;">◀ TERUG</button>
                <button onclick="window.veranderStatus('${taak.id}', 'done')" style="background:#27ae60; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold; width:48%;">AFRONDEN ✅</button>
            `;
            cDoing++;
        } else {
            moveKnoppen = `<button onclick="window.veranderStatus('${taak.id}', 'doing')" style="background:#bdc3c7; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem; font-weight:bold; width:100%;">◀ HEROPENEN</button>`;
            cDone++;
        }

        let kaartHtml = `
            <div class="taak-kaart" style="border-left-color: ${borderKleur}; opacity: ${taak.status === 'done' ? '0.7' : '1'};">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;">
                    <span class="${badgeClass}">${urgentieTekst}</span>
                    <button onclick="window.openTodoModal('${taak.id}')" style="background:none; border:none; color:#7f8c8d; cursor:pointer; font-size:1rem; padding:0;">✏️</button>
                </div>
                <div class="taak-titel">${taak.titel}</div>
                ${tijdvakHtml}
                ${linkHtml}
                <div class="taak-meta">
                    ${deadlineHtml}
                    👤 <strong>${taak.verantwoordelijke || 'Iedereen'}</strong>
                </div>
                <div class="taak-acties" style="display:flex; justify-content:space-between; gap:5px;">
                    ${moveKnoppen}
                </div>
            </div>
        `;

        if (taak.status === 'todo') kTodo.innerHTML += kaartHtml;
        else if (taak.status === 'doing') kDoing.innerHTML += kaartHtml;
        else if (taak.status === 'done') kDone.innerHTML += kaartHtml;
    });

    document.getElementById('count-todo').innerText = cTodo;
    document.getElementById('count-doing').innerText = cDoing;
    document.getElementById('count-done').innerText = cDone;
};

window.veranderStatus = function(id, nwStatus) {
    let taak = window.todoDB.find(t => t.id === id);
    if (taak) {
        taak.status = nwStatus;
        localStorage.setItem('blackshots_todo', JSON.stringify(window.todoDB));
        window.renderKanbanBord();
    }
};

// ============================================================================
// ✏️ 3. TAAK AANMAKEN & BEWERKEN
// ============================================================================
window.openTodoModal = function(editId = null) {
    let modal = document.getElementById('todo-modal');
    let delBtn = document.getElementById('btn-verwijder-todo');
    
    if (editId) {
        let taak = window.todoDB.find(t => t.id === editId);
        if(!taak) return;
        document.getElementById('todo-modal-titel').innerText = "Taak Bewerken";
        document.getElementById('todo-id').value = taak.id;
        document.getElementById('todo-titel').value = taak.titel || "";
        document.getElementById('todo-omschrijving').value = taak.omschrijving || "";
        document.getElementById('todo-tijdvak').value = taak.tijdvak || ""; // DE NIEUWE
        document.getElementById('todo-deadline').value = taak.deadline || "";
        document.getElementById('todo-urgentie').value = taak.urgentie || "normaal";
        document.getElementById('todo-verantwoordelijke').value = taak.verantwoordelijke || "";
        delBtn.style.display = 'block';
    } else {
        document.getElementById('todo-modal-titel').innerText = "Nieuwe Taak Aanmaken";
        document.getElementById('todo-id').value = "";
        document.getElementById('todo-titel').value = "";
        document.getElementById('todo-omschrijving').value = "";
        document.getElementById('todo-tijdvak').value = ""; // DE NIEUWE
        document.getElementById('todo-deadline').value = "";
        document.getElementById('todo-urgentie').value = "normaal";
        document.getElementById('todo-verantwoordelijke').value = window.actieveGebruiker.naam || "";
        delBtn.style.display = 'none';
    }
    
    modal.style.display = 'flex';
};

window.slaTodoOp = function() {
    let id = document.getElementById('todo-id').value;
    let titel = document.getElementById('todo-titel').value.trim();
    if (!titel) return alert("Een titel is verplicht!");

    let nwTaak = {
        id: id || ('td_' + Date.now()),
        titel: titel,
        omschrijving: document.getElementById('todo-omschrijving').value.trim(),
        tijdvak: document.getElementById('todo-tijdvak').value.trim(),
        deadline: document.getElementById('todo-deadline').value,
        urgentie: document.getElementById('todo-urgentie').value,
        verantwoordelijke: document.getElementById('todo-verantwoordelijke').value.trim() || "Iedereen",
        status: id ? window.todoDB.find(t => t.id === id).status : 'todo',
        link: id ? (window.todoDB.find(t => t.id === id).link || "") : ""
    };

    if (id) {
        let idx = window.todoDB.findIndex(t => t.id === id);
        if (idx > -1) window.todoDB[idx] = nwTaak;
    } else {
        window.todoDB.push(nwTaak);
    }

    localStorage.setItem('blackshots_todo', JSON.stringify(window.todoDB));
    document.getElementById('todo-modal').style.display = 'none';
    window.genereerSlimmeTaken(); // Zodat suggesties verdwijnen als je ze handmatig oplost
    window.renderKanbanBord();
};

window.verwijderTodo = function() {
    let id = document.getElementById('todo-id').value;
    if (confirm("Weet je zeker dat je deze taak wilt verwijderen?")) {
        window.todoDB = window.todoDB.filter(t => t.id !== id);
        localStorage.setItem('blackshots_todo', JSON.stringify(window.todoDB));
        document.getElementById('todo-modal').style.display = 'none';
        window.genereerSlimmeTaken();
        window.renderKanbanBord();
    }
};