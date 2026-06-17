// --- BASKETBAL_AUTH.JS: BEVEILIGING, MENU & DARKMODE ---

// Check Darkmode direct bij opstarten (voorkomt witte flits)
if (localStorage.getItem('bs_darkmode') === 'true') {
    document.documentElement.classList.add('dark-mode');
    document.addEventListener('DOMContentLoaded', () => document.body.classList.add('dark-mode'));
}

window.gebruikersDB = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [
    { id: "tom", naam: "Tom", wachtwoord: "AdminTom26", rol: "admin", teams: ["all"], paginas: ["all"] },
    { id: "thijmen", naam: "Thijmen", wachtwoord: "Thijmen26", rol: "trainer", teams: ["x121", "x141", "m221"], paginas: ["agenda", "oefeningen", "toernooien"] },
    { id: "marc", naam: "Marc", wachtwoord: "Marc26", rol: "trainer", teams: ["m181"], paginas: ["toernooien"] },
    { id: "izaac", naam: "Izaac", wachtwoord: "Izaac26", rol: "bestuur", teams: ["all"], paginas: ["dashboard", "agenda", "team", "spelers", "oefeningen", "toernooien"] }
];

if (!localStorage.getItem('blackshots_gebruikers')) {
    localStorage.setItem('blackshots_gebruikers', JSON.stringify(window.gebruikersDB));
}

window.checkBeveiligingEnBouwMenu = function() {
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    
    if (!actieveGebruiker) {
        window.location.href = '../index.html';
        return;
    }

    const bouwScherm = () => {
        let topNav = document.querySelector('.top-nav');
        if (!topNav) return;

        // --- A. TOP NAV OPSCHONEN ---
        Array.from(topNav.children).forEach(child => {
            if (child.tagName !== 'H1') child.remove();
        });

        // --- B. WELKOMSTBADGE ---
        let navH1 = topNav.querySelector('h1');
        if (navH1 && !document.getElementById('welkom-badge')) {
            let rolBadge = actieveGebruiker.rol === 'admin' ? '👑' : (actieveGebruiker.rol === 'bestuur' ? '💼' : '🏀');
            navH1.innerHTML += ` <span id="welkom-badge" style="font-size:0.8rem; background:rgba(255,255,255,0.2); padding:5px 12px; border-radius:15px; margin-left:20px; vertical-align:middle; font-weight:normal; letter-spacing:0.5px; color:white;">Welkom, ${actieveGebruiker.naam} ${rolBadge}</span>`;
        }

        // Een div container maken zodat de knoppen rechts netjes naast elkaar staan
        let knoppenContainer = document.createElement('div');
        knoppenContainer.style.cssText = 'display:flex; gap:10px; margin-left:auto; align-items:center;';

        // --- C. DARK MODE KNOP ---
        const dmBtn = document.createElement('button');
        dmBtn.id = 'darkmode-toggle';
        let isDark = localStorage.getItem('bs_darkmode') === 'true';
        dmBtn.innerHTML = isDark ? '☀️ Licht' : '🌙 Donker';
        dmBtn.style.cssText = 'background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.3); padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; transition:0.2s;';
        
        dmBtn.onmouseover = () => dmBtn.style.background = 'rgba(255,255,255,0.2)';
        dmBtn.onmouseout = () => dmBtn.style.background = 'rgba(255,255,255,0.1)';
        
        dmBtn.onclick = function() {
            let nuDark = document.body.classList.toggle('dark-mode');
            document.documentElement.classList.toggle('dark-mode', nuDark);
            localStorage.setItem('bs_darkmode', nuDark);
            dmBtn.innerHTML = nuDark ? '☀️ Licht' : '🌙 Donker';
        };

        // --- D. UITLOG KNOP ---
        const uitlogBtn = document.createElement('button');
        uitlogBtn.innerHTML = '🚪 Uitloggen';
        uitlogBtn.style.cssText = 'background:#e74c3c; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:0.2s;';
        uitlogBtn.onmouseover = () => uitlogBtn.style.background = '#c0392b';
        uitlogBtn.onmouseout = () => uitlogBtn.style.background = '#e74c3c';
        uitlogBtn.onclick = function() {
            localStorage.removeItem('bs_actieve_gebruiker');
            localStorage.removeItem('bs_rol');
            window.location.href = '../index.html';
        };

        knoppenContainer.appendChild(dmBtn);
        knoppenContainer.appendChild(uitlogBtn);
        topNav.appendChild(knoppenContainer);

        // --- E. HET MENU VAN SCRATCH OPBOUWEN ---
        let oudMenu = document.querySelector('.tab-menu');
        if (oudMenu) oudMenu.remove();

        let nieuwMenu = document.createElement('div');
        nieuwMenu.className = 'tab-menu';
        
        const allePaginas = [
            { id: 'dashboard', url: 'dashboard.html', icon: '📊', tekst: 'Dashboard' },
            { id: 'todo', url: 'todo.html', icon: '✅', tekst: 'Smart To-Do' }, // <-- DEZE REGEL IS NIEUW
            { id: 'jaarplanning', url: 'jaarplanning.html', icon: '📆', tekst: 'Jaarplanning' },
            { id: 'agenda', url: 'agenda.html', icon: '📅', tekst: 'Trainingen' },
            { id: 'team', url: 'team.html', icon: '👥', tekst: 'Teams' },
            { id: 'spelers', url: 'spelers.html', icon: '👤', tekst: 'Spelers' },
            { id: 'oefeningen', url: 'oefeningen.html', icon: '📋', tekst: 'Oefeningen' },
            { id: 'pouleindeling', url: 'pouleindeling.html', icon: '⛹️', tekst: 'Poule indeling' },            
            { id: 'zaalhuur', url: 'zaalhuur.html', icon: '🏟️', tekst: 'Zaalhuur' },
            { id: 'toernooien', url: 'toernooien.html', icon: '🏆', tekst: 'Interne Toernooien' },
            { id: 'bestuur', url: 'bestuur.html', icon: '📁', tekst: 'Bestuur & Agenda' },
            { id: 'gebruikers', url: 'gebruikers.html', icon: '🔐', tekst: 'Trainer Beheer' },
            { id: 'instellingen', url: 'instellingen.html', icon: '⚙️', tekst: 'Instellingen' }
        ];

        let huidigePagina = window.location.pathname.split('/').pop();

        allePaginas.forEach(pag => {
            let magZien = actieveGebruiker.paginas.includes('all') || actieveGebruiker.paginas.includes(pag.id);
            if (pag.id === 'instellingen' && actieveGebruiker.rol === 'trainer') magZien = false;

            if (magZien) {
                let btn = document.createElement('button');
                btn.className = 'tab-btn' + (huidigePagina === pag.url ? ' active' : '');
                btn.innerHTML = `${pag.icon} ${pag.tekst}`;
                btn.onclick = () => window.location.href = pag.url;
                nieuwMenu.appendChild(btn);
            }
        });

        topNav.parentNode.insertBefore(nieuwMenu, topNav.nextSibling);

        // --- F. VERBERG ADMIN-ONLY KNOPPEN OP DE PAGINA ---
        if (actieveGebruiker.rol !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bouwScherm);
    } else {
        bouwScherm();
    }
};

window.checkBeveiligingEnBouwMenu();