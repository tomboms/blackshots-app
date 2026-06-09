// --- BASKETBAL_AUTH.JS: DYNAMISCH MENU & BEVEILIGING ---

document.head.insertAdjacentHTML('beforeend', '<style>.terug-knop, a[href*="index.html"] { display: none !important; }</style>');

window.gebruikersDB = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [
    { id: "tom", naam: "Tom", wachtwoord: "AdminTom26", rol: "admin", teams: ["all"], paginas: ["all"] },
    { id: "thijmen", naam: "Thijmen", wachtwoord: "Thijmen26", rol: "trainer", teams: ["x121", "x141", "m221"], paginas: ["agenda", "oefeningen", "toernooien"] },
    { id: "marc", naam: "Marc", wachtwoord: "Marc26", rol: "trainer", teams: ["m181"], paginas: ["toernooien"] },
    { id: "izaac", naam: "Izaac", wachtwoord: "Izaac26", rol: "bestuur", teams: ["all"], paginas: ["dashboard", "agenda", "team", "spelers", "oefeningen", "toernooien"] }
];

if (!localStorage.getItem('blackshots_gebruikers')) {
    localStorage.setItem('blackshots_gebruikers', JSON.stringify(window.gebruikersDB));
}

window.checkBeveiliging = function() {
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    if (!actieveGebruiker) {
        window.location.href = '../index.html';
        return;
    }

    const bouwScherm = () => {
        // --- 1. SCHOON DE BOVENSTE BALK OP ---
        let topNav = document.querySelector('.top-nav');
        if (topNav) {
            Array.from(topNav.children).forEach(child => {
                if (child.tagName !== 'H1') child.remove();
            });

            let navH1 = topNav.querySelector('h1');
            if (navH1 && !document.getElementById('welkom-badge')) {
                let rolBadge = actieveGebruiker.rol === 'admin' ? '👑' : (actieveGebruiker.rol === 'bestuur' ? '💼' : '🏀');
                navH1.innerHTML += ` <span id="welkom-badge" style="font-size:0.8rem; background:rgba(255,255,255,0.2); padding:5px 12px; border-radius:15px; margin-left:20px; vertical-align:middle; font-weight:normal; letter-spacing:0.5px;">Welkom, ${actieveGebruiker.naam} ${rolBadge}</span>`;
            }

            const uitlogBtn = document.createElement('button');
            uitlogBtn.innerHTML = '🚪 Uitloggen';
            uitlogBtn.style.cssText = 'background:#e74c3c; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; margin-left:auto; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:0.2s; display:block;';
            uitlogBtn.onclick = function() {
                localStorage.removeItem('bs_actieve_gebruiker');
                localStorage.removeItem('bs_rol');
                window.location.href = '../index.html';
            };
            topNav.appendChild(uitlogBtn);
        }

        // --- 2. HET MENU COMPLEET DYNAMISCH BOUWEN (Geen geflikker meer!) ---
        let tabMenu = document.querySelector('.tab-menu');
        if (tabMenu) {
            tabMenu.innerHTML = ''; // Sloop alle oude hard-coded knoppen uit de HTML

            const allePaginas = [
                { id: 'dashboard', url: 'dashboard.html', icon: '📊', tekst: 'Dashboard' },
                { id: 'agenda', url: 'agenda.html', icon: '📅', tekst: 'Weekagenda' },
                { id: 'team', url: 'team.html', icon: '👥', tekst: 'Teams' },
                { id: 'spelers', url: 'spelers.html', icon: '👤', tekst: 'Spelers' },
                { id: 'oefeningen', url: 'oefeningen.html', icon: '📋', tekst: 'Oefeningen' },
                { id: 'toernooien', url: 'toernooien.html', icon: '🏆', tekst: 'Interne Toernooien' },
                { id: 'gebruikers', url: 'gebruikers.html', icon: '🔐', tekst: 'Trainer Beheer' },
                { id: 'instellingen', url: 'instellingen.html', icon: '⚙️', tekst: 'Instellingen' }
            ];

            let huidigePagina = window.location.pathname.split('/').pop();

            allePaginas.forEach(pag => {
                let magZien = actieveGebruiker.paginas.includes('all') || actieveGebruiker.paginas.includes(pag.id);
                if (pag.id === 'instellingen' && actieveGebruiker.rol === 'trainer') magZien = false; // Trainers nooit in instellingen

                if (magZien) {
                    let btn = document.createElement('button');
                    btn.className = 'tab-btn' + (huidigePagina === pag.url ? ' active' : '');
                    btn.innerHTML = `${pag.icon} ${pag.tekst}`;
                    btn.onclick = () => window.location.href = pag.url;
                    tabMenu.appendChild(btn);
                }
            });
        }

        // --- 3. VERBERG ADMIN KNOPPEN ---
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

window.checkBeveiliging();