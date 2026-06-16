// --- BASKETBAL_GEBRUIKERS.JS: TRAINER RECHTEN & CLOUD SYNC ---

let ingelogdeGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
if(!ingelogdeGebruiker || ingelogdeGebruiker.rol !== 'admin') {
    window.location.href = '../index.html';
}

// --- CLOUD SYNC MOTOR ---
window.slaDataOp = function(sleutel, data) {
    localStorage.setItem(sleutel, JSON.stringify(data));
    if (typeof window.opslaanInFirebase === 'function') window.opslaanInFirebase(sleutel, data);
    else if (typeof window.bewaarNaarFirebase === 'function') window.bewaarNaarFirebase(sleutel, data);
    else document.dispatchEvent(new CustomEvent('cloudSync', { detail: { sleutel: sleutel, data: data } }));
};

// Luisteren naar binnenkomende Firebase data
window.ontvangCloudDataGebruikers = function(sleutel, data) {
    if (sleutel === 'blackshots_gebruikers' && data) {
        localStorage.setItem('blackshots_gebruikers', JSON.stringify(data)); 
        window.renderGebruikers();
    }
};

window.renderGebruikers = function() {
    let gebruikers = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [];
    let container = document.getElementById('gebruikers-lijst-container');
    if(!container) return;
    
    container.innerHTML = '';

    gebruikers.forEach((g, index) => {
        let isMijzelf = (g.id === ingelogdeGebruiker.id);
        let deleteBtn = isMijzelf ? `<span style="color:#7f8c8d; font-size:0.85rem; font-weight:bold;">🔒 Huidig Account</span>` : `<button onclick="window.verwijderGebruiker(${index})" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; font-weight:bold; cursor:pointer;">⚠️ Wissen</button>`;

        let randKleur = g.rol === 'admin' ? '#f1c40f' : (g.rol === 'bestuur' ? '#9b59b6' : '#3498db');

        let teamVinkjes = '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
        if (window.teamsDB) {
            window.teamsDB.forEach(t => {
                let isChecked = (g.teams && (g.teams.includes('all') || g.teams.includes(t.id))) ? 'checked' : '';
                let disabled = (g.teams && g.teams.includes('all')) ? 'disabled' : '';
                teamVinkjes += `
                    <label style="display:inline-flex; align-items:center; font-size:0.85rem; background:#eef2f5; padding:6px 10px; border-radius:6px; border:1px solid #bdc3c7;">
                        <input type="checkbox" ${isChecked} ${disabled} onchange="window.toggleTeamRecht(${index}, '${t.id}', this.checked)" style="margin-right:6px;"> ${t.naam}
                    </label>`;
            });
        } else {
            teamVinkjes += '<span style="color:#7f8c8d; font-size:0.85rem;">Geen teams geladen</span>';
        }
        teamVinkjes += '</div>';

        // HIER STAAN DE CHECKBOXEN! Netjes afgestemd op je menu-IDs
        let paginaOpties = [
            {id:'dashboard', n:'📊 Dashboard'}, 
            {id:'jaarplanning', n:'📅 Jaarplanning'},  
            {id:'agenda', n:'📅 Weekagenda'}, 
            {id:'team', n:'👥 Teams'}, 
            {id:'spelers', n:'👤 Spelers'}, 
            {id:'oefeningen', n:'📋 Oefeningen'}, 
            {id:'pouleindeling', n:'⛹️ Pouleindeling'}, 
            {id:'zaalhuur', n:'🏟️ Zaalhuur'},
            {id:'toernooien', n:'🏆 Interne Competitie'}, 
            {id:'bestuur', n:'📁 Bestuur'}, 
            {id:'gebruikers', n:'🔐 Trainer Beheer'}
        ];

        let paginaVinkjes = '<div style="display:flex; flex-wrap:wrap; gap:8px;">';
        paginaOpties.forEach(p => {
            let isChecked = (g.paginas && (g.paginas.includes('all') || g.paginas.includes(p.id))) ? 'checked' : '';
            let disabled = (g.paginas && g.paginas.includes('all')) ? 'disabled' : '';
            paginaVinkjes += `
                <label style="display:inline-flex; align-items:center; font-size:0.85rem; background:#eaf2f8; padding:6px 10px; border-radius:6px; border:1px solid #aed6f1;">
                    <input type="checkbox" ${isChecked} ${disabled} onchange="window.togglePaginaRecht(${index}, '${p.id}', this.checked)" style="margin-right:6px;"> ${p.n}
                </label>`;
        });
        paginaVinkjes += '</div>';

        container.innerHTML += `
            <div style="border:1px solid #ddd; border-radius:8px; padding:20px; margin-bottom:20px; background:#fafafa; border-left:6px solid ${randKleur}; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:12px; margin-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong style="font-size:1.3rem; color:var(--secondary-color);">${g.naam}</strong> 
                        <span style="background:${randKleur}; color:white; padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; text-transform:uppercase;">${g.rol}</span>
                    </div>
                    ${deleteBtn}
                </div>
                
                <div style="margin-bottom:15px;">
                    <strong style="display:block; font-size:0.95rem; color:#34495e; margin-bottom:8px;">Toegestane Pagina's:</strong>
                    ${paginaVinkjes}
                </div>

                <div>
                    <strong style="display:block; font-size:0.95rem; color:#34495e; margin-bottom:8px;">Ziet data van deze teams:</strong>
                    ${teamVinkjes}
                </div>
            </div>
        `;
    });
};

window.voegGebruikerToe = function() {
    let naam = document.getElementById('g_naam').value.trim();
    let ww = document.getElementById('g_ww').value.trim();
    let rol = document.getElementById('g_rol').value;

    if(!naam || !ww) return alert("Vul een naam en wachtwoord in.");

    let gebruikers = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [];
    
    if (gebruikers.find(g => g.id === naam.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        return alert("Deze gebruikersnaam bestaat al!");
    }
    
    let nw = {
        id: naam.toLowerCase().replace(/[^a-z0-9]/g, ''),
        naam: naam,
        wachtwoord: ww,
        rol: rol,
        teams: rol === 'admin' || rol === 'bestuur' ? ["all"] : [],
        paginas: rol === 'admin' ? ["all"] : []
    };

    gebruikers.push(nw);
    window.slaDataOp('blackshots_gebruikers', gebruikers);
    
    document.getElementById('g_naam').value = '';
    document.getElementById('g_ww').value = '';
    
    window.renderGebruikers();
};

window.verwijderGebruiker = function(index) {
    if(confirm("Weet je zeker dat je dit account definitief wilt intrekken?")) {
        let gebruikers = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [];
        gebruikers.splice(index, 1);
        window.slaDataOp('blackshots_gebruikers', gebruikers);
        window.renderGebruikers();
    }
};

window.toggleTeamRecht = function(gIdx, teamId, checked) {
    let gebruikers = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [];
    if(!gebruikers[gIdx].teams) gebruikers[gIdx].teams = [];
    
    if(checked) {
        if(!gebruikers[gIdx].teams.includes(teamId)) gebruikers[gIdx].teams.push(teamId);
    } else {
        gebruikers[gIdx].teams = gebruikers[gIdx].teams.filter(id => id !== teamId);
    }
    window.slaDataOp('blackshots_gebruikers', gebruikers);
};

window.togglePaginaRecht = function(gIdx, pagId, checked) {
    let gebruikers = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [];
    if(!gebruikers[gIdx].paginas) gebruikers[gIdx].paginas = [];
    
    if(checked) {
        if(!gebruikers[gIdx].paginas.includes(pagId)) gebruikers[gIdx].paginas.push(pagId);
    } else {
        gebruikers[gIdx].paginas = gebruikers[gIdx].paginas.filter(id => id !== pagId);
    }
    window.slaDataOp('blackshots_gebruikers', gebruikers);
};

setTimeout(() => window.renderGebruikers(), 300);