// --- BASKETBAL_SPELERS.JS: LOGICA VOOR HET LEDENBESTAND ---

window.renderSpelers = function() {
    const tbody = document.getElementById('spelers-tabel-body');
    const teamSelect = document.getElementById('nw-speler-team');
    if (!tbody) return;

    // Vul de dropdown met actuele teams
    if(teamSelect && teamSelect.options.length <= 1) {
        teamSelect.innerHTML = '<option value="">-- Geen (Vrije Speler) --</option>';
        window.teamsDB.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.id}">${t.naam}</option>`;
        });
    }

    let zoekterm = (document.getElementById('zoek-speler') ? document.getElementById('zoek-speler').value.toLowerCase() : "");
    let html = '';

    window.spelersDB.forEach((speler, index) => {
        let teamNaam = "Vrije Speler";
        let teamBadge = "background:#bdc3c7;";
        
        if(speler.teamId) {
            let tObj = window.teamsDB.find(t => t.id === speler.teamId);
            if(tObj) {
                teamNaam = tObj.naam;
                teamBadge = "background:var(--primary-color);";
            }
        }

        if (speler.naam.toLowerCase().includes(zoekterm) || teamNaam.toLowerCase().includes(zoekterm)) {
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:12px; font-weight:bold;">${speler.naam}</td>
                    <td style="padding:12px;">${speler.leeftijd || '-'}</td>
                    <td style="padding:12px;">${speler.rugnummer ? `<strong>#${speler.rugnummer}</strong>` : '-'}</td>
                    <td style="padding:12px;">
                        <span style="${teamBadge} color:white; padding:4px 8px; border-radius:4px; font-size:0.85rem; font-weight:bold;">${teamNaam}</span>
                    </td>
                    <td style="padding:12px;">
                        <button onclick="window.verwijderSpeler(${index})" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.8rem;">X Uitschrijven</button>
                    </td>
                </tr>
            `;
        }
    });

    if(html === '') html = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#7f8c8d;">Geen spelers gevonden.</td></tr>';
    tbody.innerHTML = html;
};

window.voegSpelerToe = function() {
    let naam = document.getElementById('nw-speler-naam').value.trim();
    let leeftijd = document.getElementById('nw-speler-leeftijd').value;
    let rugnr = document.getElementById('nw-speler-rugnr').value;
    let teamId = document.getElementById('nw-speler-team').value;

    if(naam) {
        window.spelersDB.push({
            id: 'p_' + Date.now(),
            naam: naam,
            leeftijd: leeftijd,
            rugnummer: rugnr,
            teamId: teamId
        });
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        
        // Formulier leegmaken
        document.getElementById('nw-speler-naam').value = '';
        document.getElementById('nw-speler-leeftijd').value = '';
        document.getElementById('nw-speler-rugnr').value = '';
        
        window.renderSpelers();
    } else {
        alert("Vul minimaal de naam in!");
    }
};

window.verwijderSpeler = function(index) {
    if(confirm("Weet je zeker dat je deze speler uit de club wilt uitschrijven?")) {
        window.spelersDB.splice(index, 1);
        localStorage.setItem('blackshots_spelers', JSON.stringify(window.spelersDB));
        window.renderSpelers();
    }
};