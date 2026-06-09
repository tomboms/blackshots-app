// --- BASKETBAL_AUTH.JS: BEVEILIGING & VOLLEDIG DYNAMISCH MENU ---

// 1. ZET STANDAARD GEBRUIKERS KLAAR (ALS DE DATABASE LEEG IS)
window.gebruikersDB = JSON.parse(localStorage.getItem('blackshots_gebruikers')) || [
    { id: "tom", naam: "Tom", wachtwoord: "AdminTom26", rol: "admin", teams: ["all"], paginas: ["all"] },
    { id: "thijmen", naam: "Thijmen", wachtwoord: "Thijmen26", rol: "trainer", teams: ["x121", "x141", "m221"], paginas: ["agenda", "oefeningen", "toernooien"] },
    { id: "marc", naam: "Marc", wachtwoord: "Marc26", rol: "trainer", teams: ["m181"], paginas: ["toernooien"] },
    { id: "izaac", naam: "Izaac", wachtwoord: "Izaac26", rol: "bestuur", teams: ["all"], paginas: ["dashboard", "agenda", "team", "spelers", "oefeningen", "toernooien"] }
];

if (!localStorage.getItem('blackshots_gebruikers')) {
    localStorage.setItem('blackshots_gebruikers', JSON.stringify(window.gebruikersDB));
}

// 2. DE PORTIER & MENU BOUWER
window.checkBeveiligingEnBouwMenu = function() {
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    
    // Niet ingelogd? Trap ze direct terug naar de voordeur
    if (!actieveGebruiker) {
        window.location.href = '../index.html';
        return;
    }

    const bouwScherm = () => {
        let topNav = document.querySelector('.top-nav');
        if (!topNav) return;

        // --- A. DE BOVENSTE BALK (TOP-NAV) OPSCHONEN ---
        // Verwijder alles behalve de titel (H1)
        Array.from(topNav.children).forEach(child => {
            if (child.tagName !== 'H1') child.remove();
        });

        // Voeg Welkomsttekst toe (als die er nog niet staat)
        let navH1 = topNav.querySelector('h1');
        if (navH1 && !document.getElementById('welkom-badge')) {
            let rolBadge = actieveGebruiker.rol === 'admin' ? '👑' : (actieveGebruiker.rol === 'bestuur' ? '💼' : '🏀');
            navH1.innerHTML += ` <span id="welkom-badge" style="font-size:0.8rem; background:rgba(255,255,255,0.2); padding:5px 12px; border-radius:15px; margin-left:20px; vertical-align:middle; font-weight:normal; letter-spacing:0.5px;">Welkom, ${actieveGebruiker.naam} ${rolBadge}</span>`;
        }

        // Voeg de ENIGE ECHTE Uitlog knop toe
        const uitlogBtn = document.createElement('button');
        uitlogBtn.innerHTML = '🚪 Uitloggen';
        uitlogBtn.style.cssText = 'background:#e74c3c; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; margin-left:auto; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:0.2s; display:block;';
        uitlogBtn.onmouseover = () => uitlogBtn.style.background = '#c0392b';
        uitlogBtn.onmouseout = () => uitlogBtn.style.background = '#e74c3c';
        uitlogBtn.onclick = function() {
            localStorage.removeItem('bs_actieve_gebruiker');
            localStorage.removeItem('bs_rol');
            window.location.href = '../index.html'; // Terug naar login scherm
        };
        topNav.appendChild(uitlogBtn);

        // --- B. HET MENU VAN SCRATCH OPBOUWEN ---
        // Verwijder een eventueel oud HTML menu als het nog bestaat
        let oudMenu = document.querySelector('.tab-menu');
        if (oudMenu) oudMenu.remove();

        // Maak een gloednieuwe menu container
        let nieuwMenu = document.createElement('div');
        nieuwMenu.className = 'tab-menu';
        
        // Alle mogelijke pagina's
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

        // Check rechten en bouw knoppen
        allePaginas.forEach(pag => {
            let magZien = actieveGebruiker.paginas.includes('all') || actieveGebruiker.paginas.includes(pag.id);
            if (pag.id === 'instellingen' && actieveGebruiker.rol === 'trainer') magZien = false; // Trainers nooit in instellingen

            if (magZien) {
                let btn = document.createElement('button');
                btn.className = 'tab-btn' + (huidigePagina === pag.url ? ' active' : '');
                btn.innerHTML = `${pag.icon} ${pag.tekst}`;
                btn.onclick = () => window.location.href = pag.url;
                nieuwMenu.appendChild(btn);
            }
        });

        // Plak het menu direct onder de top-nav
        topNav.parentNode.insertBefore(nieuwMenu, topNav.nextSibling);

        // --- C. VERBERG ADMIN-ONLY KNOPPEN OP DE PAGINA ---
        if (actieveGebruiker.rol !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    };

    // Voer uit
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bouwScherm);
    } else {
        bouwScherm();
    }
};

// Start de motor direct!
window.checkBeveiligingEnBouwMenu();