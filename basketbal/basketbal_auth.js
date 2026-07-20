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
        // 1. Injecteer eerst de CSS voor de Dropdown als die er nog niet is
        if (!document.getElementById('bs-dropdown-css')) {
            const style = document.createElement('style');
            style.id = 'bs-dropdown-css';
            style.innerHTML = `
                /* FIX: Z-index verhoogt het HELE menu boven de rest van de pagina! */
                .tab-menu { overflow: visible !important; flex-wrap: wrap !important; position: relative !important; z-index: 99999 !important; }
                
                .nav-dropdown { position: relative; display: inline-block; }
                .nav-dropdown-content { display: none; position: absolute; background-color: #fff; min-width: 240px; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); z-index: 999999 !important; border-radius: 8px; top: 100%; left: 0; overflow: hidden; border: 1px solid #cbd5e1; }
                .nav-dropdown:hover .nav-dropdown-content { display: block; }
                
                /* FIX: Buttons expliciet op display: block gezet zodat ze netjes onder elkaar vallen */
                .nav-drop-btn { display: block; width: 100%; text-align: left; background: none; border: none; padding: 12px 15px; cursor: pointer; color: #2c3e50; font-weight: bold; font-size: 0.9rem; border-bottom: 1px solid #eee; transition: 0.2s; }
                .nav-drop-btn:last-child { border-bottom: none; }
                .nav-drop-btn:hover { background-color: #f8f9fa; color: #3498db; }
                .nav-drop-btn.active { background-color: #3498db; color: white; }
                
                /* Dark Mode Ondersteuning */
                .dark-mode .nav-dropdown-content { background-color: #2c3e50; border-color: #1a252f; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.5); }
                .dark-mode .nav-drop-btn { color: #ecf0f1; border-color: #34495e; }
                .dark-mode .nav-drop-btn:hover { background-color: #34495e; color: #3498db; }
                .dark-mode .nav-drop-btn.active { background-color: #3498db; color: white; }
            `;
            document.head.appendChild(style);
        }

        let oudMenu = document.querySelector('.tab-menu');
        if (oudMenu) oudMenu.remove();

        let nieuwMenu = document.createElement('div');
        nieuwMenu.className = 'tab-menu';
        
        // Menu Structuur: Ondersteunt nu "isDropdown" groepen!
        const menuStructuur = [
            { id: 'dashboard', url: 'dashboard.html', icon: '📊', tekst: 'Dashboard' },
            { id: 'todo', url: 'todo.html', icon: '✅', tekst: 'Smart To-Do' },
            { id: 'jaarplanning', url: 'jaarplanning.html', icon: '📆', tekst: 'Jaarplanning' },
            { id: 'agenda', url: 'agenda.html', icon: '📅', tekst: 'Trainingen' },
            { id: 'team', url: 'team.html', icon: '👥', tekst: 'Teams' },
            { id: 'spelers', url: 'spelers.html', icon: '👤', tekst: 'Spelers' },
            { id: 'oefeningen', url: 'oefeningen.html', icon: '📋', tekst: 'Oefeningen' },
            { id: 'pouleindeling', url: 'pouleindeling.html', icon: '⛹️', tekst: 'Poule indeling' },
            {
                isDropdown: true,
                icon: '🏀',
                tekst: 'Wedstrijdzaken ▼',
                items: [
                    { id: 'overzicht', url: 'thuisdagen_overzicht.html', icon: '📊', tekst: 'Seizoens-Overzicht' },
                    { id: 'planner', url: 'planner.html', icon: '📆', tekst: 'Wedstrijd Planner' },
                    { id: 'nameninvullen', url: 'namen_invullen.html', icon: '⛹️', tekst: 'Taken Planner' },
                    { id: 'rapporten', url: 'rapporten.html', icon: '📁', tekst: 'rapporten' }
                    { id: 'scheidsrechters', url: 'scheidsrechters.html', icon: '👨‍⚖️', tekst: 'Scheidsrechters' }
                ]
            },
            { id: 'zaalhuur', url: 'zaalhuur.html', icon: '🏟️', tekst: 'Zaalhuur' },
            { id: 'toernooien', url: 'toernooien.html', icon: '🏆', tekst: 'Interne Toernooien' },
            { id: 'bestuur', url: 'bestuur.html', icon: '📁', tekst: 'Bestuur & Agenda' },
            { id: 'gebruikers', url: 'gebruikers.html', icon: '🔐', tekst: 'Trainer Beheer' },
            { id: 'instellingen', url: 'instellingen.html', icon: '⚙️', tekst: 'Instellingen' }
        ];

        let huidigePagina = window.location.pathname.split('/').pop();

        const checkToegang = (pagId) => {
            if (pagId === 'instellingen' && actieveGebruiker.rol === 'trainer') return false;
            return actieveGebruiker.paginas.includes('all') || actieveGebruiker.paginas.includes(pagId);
        };

        menuStructuur.forEach(item => {
            if (item.isDropdown) {
                // Filter de onderliggende items op basis van de rechten van de gebruiker
                let toegestaneItems = item.items.filter(child => checkToegang(child.id));
                
                if (toegestaneItems.length > 0) {
                    let isEenChildActief = toegestaneItems.some(child => huidigePagina === child.url);
                    
                    let dropContainer = document.createElement('div');
                    dropContainer.className = 'nav-dropdown';
                    
                    let dropToggle = document.createElement('button');
                    dropToggle.className = 'tab-btn' + (isEenChildActief ? ' active' : '');
                    dropToggle.innerHTML = `${item.icon} ${item.tekst}`;
                    dropContainer.appendChild(dropToggle);
                    
                    let dropContent = document.createElement('div');
                    dropContent.className = 'nav-dropdown-content';
                    
                    toegestaneItems.forEach(child => {
                        let btn = document.createElement('button');
                        btn.className = 'nav-drop-btn' + (huidigePagina === child.url ? ' active' : '');
                        btn.innerHTML = `${child.icon} ${child.tekst}`;
                        btn.onclick = () => window.location.href = child.url;
                        dropContent.appendChild(btn);
                    });
                    
                    dropContainer.appendChild(dropContent);
                    nieuwMenu.appendChild(dropContainer);
                }
            } else {
                if (checkToegang(item.id)) {
                    let btn = document.createElement('button');
                    btn.className = 'tab-btn' + (huidigePagina === item.url ? ' active' : '');
                    btn.innerHTML = `${item.icon} ${item.tekst}`;
                    btn.onclick = () => window.location.href = item.url;
                    nieuwMenu.appendChild(btn);
                }
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