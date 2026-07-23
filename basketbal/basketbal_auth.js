// --- BASKETBAL_AUTH.JS: BEVEILIGING, MENU & MODERN DESIGN ---

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

        // --- A. TOP NAV MODERNISEREN ---
        topNav.style.cssText = `
            background: rgba(44, 62, 80, 1); 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px 20px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.1);
        `;

        Array.from(topNav.children).forEach(child => {
            if (child.tagName !== 'H1') child.remove();
        });

        let navH1 = topNav.querySelector('h1');
        if (navH1) {
            navH1.style.margin = '0';
            navH1.style.fontSize = '1.4rem';
            navH1.style.color = '#fff';
            navH1.style.display = 'flex';
            navH1.style.alignItems = 'center';
            navH1.style.gap = '10px';
        }

        // --- B. PROFIEL DROPDOWN (Rechtsboven) ---
        let rolBadge = actieveGebruiker.rol === 'admin' ? '👑' : (actieveGebruiker.rol === 'bestuur' ? '💼' : '🏀');
        let isDark = localStorage.getItem('bs_darkmode') === 'true';

        let profielContainer = document.createElement('div');
        profielContainer.className = 'nav-dropdown';
        profielContainer.style.cssText = 'margin-left: auto; cursor: pointer;';

        profielContainer.innerHTML = `
            <div style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 20px; color: white; font-weight: bold; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.2); transition: 0.3s; display:flex; align-items:center; gap:8px;">
                <span>${rolBadge} ${actieveGebruiker.naam}</span> <span style="font-size:0.7rem;">▼</span>
            </div>
            <div class="nav-dropdown-content" style="right: 0; left: auto; min-width: 180px; margin-top: 10px;">
                <button id="darkmode-toggle" class="nav-drop-btn" style="text-align:left;">${isDark ? '☀️ Licht Thema' : '🌙 Donker Thema'}</button>
                <button id="uitlog-btn" class="nav-drop-btn" style="text-align:left; color:#e74c3c;">🚪 Uitloggen</button>
            </div>
        `;
        topNav.appendChild(profielContainer);

        setTimeout(() => {
            let dmBtn = document.getElementById('darkmode-toggle');
            let uitlogBtn = document.getElementById('uitlog-btn');
            
            if (dmBtn) {
                dmBtn.onclick = function() {
                    let nuDark = document.body.classList.toggle('dark-mode');
                    document.documentElement.classList.toggle('dark-mode', nuDark);
                    localStorage.setItem('bs_darkmode', nuDark);
                    dmBtn.innerHTML = nuDark ? '☀️ Licht Thema' : '🌙 Donker Thema';
                };
            }
            if (uitlogBtn) {
                uitlogBtn.onclick = function() {
                    localStorage.removeItem('bs_actieve_gebruiker');
                    localStorage.removeItem('bs_rol');
                    window.location.href = '../index.html';
                };
            }
        }, 100);

        // --- C. CSS INJECTEREN VOOR HET MODERNE MENU ---
        if (!document.getElementById('bs-dropdown-css')) {
            const style = document.createElement('style');
            style.id = 'bs-dropdown-css';
            style.innerHTML = `
                /* Sticky navigatie balk bovenaan */
                .tab-menu { 
                    display: flex; flex-wrap: wrap; background: #fff; padding: 10px 20px; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-bottom: 2px solid var(--primary-color);
                    gap: 5px; position: sticky; top: 0; z-index: 999998; 
                }
                
                .tab-btn {
                    background: transparent; border: 1px solid transparent; color: #34495e; 
                    padding: 8px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; 
                    transition: 0.2s; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;
                }
                .tab-btn:hover { background: #f8f9fa; color: var(--primary-color); }
                .tab-btn.active { background: var(--primary-color); color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                
                .nav-dropdown { position: relative; display: inline-block; }
                
                /* De brug om het gat tussen de knop en het menu te dichten */
                .nav-dropdown-content { 
                    display: none; position: absolute; background-color: #fff; min-width: 220px; 
                    box-shadow: 0px 10px 25px rgba(0,0,0,0.15); z-index: 999999; border-radius: 8px; 
                    top: 100%; left: 0; border: 1px solid #e2e8f0; 
                    margin-top: -5px; padding-top: 5px; 
                }
                
                .nav-dropdown:hover .nav-dropdown-content { display: block; animation: fadeIn 0.2s ease-out; }
                
                .nav-drop-btn { 
                    display: block; width: 100%; text-align: left; background: none; border: none; 
                    padding: 12px 15px; cursor: pointer; color: #2c3e50; font-weight: 600; 
                    font-size: 0.9rem; border-bottom: 1px solid #f1f5f9; transition: 0.2s; 
                }
                .nav-drop-btn:last-child { border-bottom: none; }
                .nav-drop-btn:hover { background-color: #f1f5f9; color: var(--primary-color); padding-left: 20px; }
                .nav-drop-btn.active { background-color: var(--primary-color); color: white; }
                
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

                /* Dark Mode Ondersteuning */
                .dark-mode .tab-menu { background: var(--card-bg); border-bottom-color: var(--primary-color); }
                .dark-mode .tab-btn { color: #ecf0f1; }
                .dark-mode .tab-btn:hover { background: #34495e; color: #3498db; }
                .dark-mode .tab-btn.active { background: var(--primary-color); color: white; }
                .dark-mode .nav-dropdown-content { background-color: var(--card-bg); border-color: #1a252f; box-shadow: 0px 10px 25px rgba(0,0,0,0.5); }
                .dark-mode .nav-drop-btn { color: #ecf0f1; border-color: #34495e; }
                .dark-mode .nav-drop-btn:hover { background-color: #34495e; color: #3498db; }
                .dark-mode .nav-drop-btn.active { background-color: var(--primary-color); color: white; }
            `;
            document.head.appendChild(style);
        }

        let oudMenu = document.querySelector('.tab-menu');
        if (oudMenu) oudMenu.remove();

        let nieuwMenu = document.createElement('div');
        nieuwMenu.className = 'tab-menu';
        
        // --- D. GESTRUCTUREERDE MENU OPBOUW ---
        const menuStructuur = [
            { id: 'dashboard', url: 'dashboard.html', icon: '📊', tekst: 'Dashboard' },
            { id: 'todo', url: 'todo.html', icon: '✅', tekst: 'Smart To-Do' },
            {
                isDropdown: true, icon: '📆', tekst: 'Planning ▼',
                items: [
                    { id: 'jaarplanning', url: 'jaarplanning.html', icon: '📅', tekst: 'Jaarplanning' },
                    { id: 'agenda', url: 'agenda.html', icon: '🏀', tekst: 'Trainingen Agenda' }
                ]
            },
            {
                isDropdown: true, icon: '👥', tekst: 'Leden & Teams ▼',
                items: [
                    { id: 'team', url: 'team.html', icon: '🛡️', tekst: 'Team Beheer' },
                    { id: 'spelers', url: 'spelers.html', icon: '👤', tekst: 'Spelers Database' }
                ]
            },
            {
                isDropdown: true, icon: '🏆', tekst: 'Wedstrijdzaken ▼',
                items: [
                    { id: 'overzicht', url: 'thuisdagen_overzicht.html', icon: '📊', tekst: 'Seizoens-Overzicht' },
                    { id: 'planner', url: 'planner.html', icon: '📆', tekst: 'Wedstrijd Planner' },
                    { id: 'nameninvullen', url: 'namen_invullen.html', icon: '⛹️', tekst: 'Taken Planner' },
                    { id: 'rapporten', url: 'rapporten.html', icon: '📁', tekst: 'Dagrapporten' },
                    { id: 'dagoverzicht', url: 'dagoverzicht.html', icon: '⏱️', tekst: 'Live Zaalwacht' },
                    { id: 'scheidsrechters', url: 'scheidsrechters.html', icon: '👨‍⚖️', tekst: 'Scheidsrechters' }
                ]
            },
            {
                isDropdown: true, icon: '⛹️', tekst: 'Competities ▼',
                items: [
                    { id: 'pouleindeling', url: 'pouleindeling.html', icon: '📈', tekst: 'NBB Poule-indeling' },
                    { id: 'toernooien', url: 'toernooien.html', icon: '🏆', tekst: 'Interne Toernooien' }
                ]
            },
            { id: 'oefeningen', url: 'oefeningen.html', icon: '📋', tekst: 'Oefeningen' },
            {
                isDropdown: true, icon: '💼', tekst: 'Beheer ▼',
                items: [
                    { id: 'zaalhuur', url: 'zaalhuur.html', icon: '🏟️', tekst: 'Zaalhuur' },
                    { id: 'bestuur', url: 'bestuur.html', icon: '📁', tekst: 'Bestuur & Agenda' },
                    { id: 'gebruikers', url: 'gebruikers.html', icon: '🔐', tekst: 'Trainer Beheer' },
                    { id: 'instellingen', url: 'instellingen.html', icon: '⚙️', tekst: 'Instellingen' }
                ]
            }
        ];

        let huidigePagina = window.location.pathname.split('/').pop();

        const checkToegang = (pagId) => {
            if (pagId === 'instellingen' && actieveGebruiker.rol === 'trainer') return false;
            return actieveGebruiker.paginas.includes('all') || actieveGebruiker.paginas.includes(pagId);
        };

        menuStructuur.forEach(item => {
            if (item.isDropdown) {
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

        // --- E. VERBERG ADMIN-ONLY KNOPPEN OP DE PAGINA ---
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