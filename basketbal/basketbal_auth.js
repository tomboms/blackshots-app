// --- BASKETBAL_AUTH.JS: BEVEILIGING, INLOGGEN & MENU RECHTEN ---

// 0. ANTI-SPOOK EFFECT: Verberg oude hard-coded knoppen onmiddellijk tijdens het laden!
document.head.insertAdjacentHTML('beforeend', '<style>.terug-knop, a[href*="index.html"] { display: none !important; }</style>');

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

// 2. DE PORTIER (CONTROLEERT ELKE PAGINA)
window.checkBeveiliging = function() {
    let actieveGebruiker = JSON.parse(localStorage.getItem('bs_actieve_gebruiker'));
    
    // Niet ingelogd? Trap ze direct terug naar de voordeur (index.html)
    if (!actieveGebruiker) {
        window.location.href = '../index.html';
        return;
    }

    const pasPaginaAan = () => {
        let topNav = document.querySelector('.top-nav');

        if (topNav) {
            // --- A. DE BULLDOZER ---
            // Gooi letterlijk álle knoppen (Terug, dubbele Uitloggen) uit de bovenste balk, 
            // behalve de hoofdtitel (H1).
            Array.from(topNav.children).forEach(child => {
                if (child.tagName !== 'H1') {
                    child.remove();
                }
            });

            // --- B. De Welkomstbadge toevoegen aan de titel ---
            let navH1 = topNav.querySelector('h1');
            if (navH1 && !document.getElementById('welkom-badge')) {
                let rolBadge = actieveGebruiker.rol === 'admin' ? '👑' : (actieveGebruiker.rol === 'bestuur' ? '💼' : '🏀');
                navH1.innerHTML += ` <span id="welkom-badge" style="font-size:0.8rem; background:rgba(255,255,255,0.2); padding:5px 12px; border-radius:15px; margin-left:20px; vertical-align:middle; font-weight:normal; letter-spacing:0.5px;">Welkom, ${actieveGebruiker.naam} ${rolBadge}</span>`;
            }

            // --- C. Plant EXACT één perfecte Uitlog-knop ---
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
        }

        // --- D. Menu Filteren op Rechten ---
        if (!actieveGebruiker.paginas.includes('all')) {
            const tabMenu = document.querySelector('.tab-menu');
            if (tabMenu) {
                const knoppen = Array.from(tabMenu.querySelectorAll('.tab-btn'));
                knoppen.forEach(knop => {
                    let magZien = false;
                    let onclickTekst = knop.getAttribute('onclick') || '';
                    
                    actieveGebruiker.paginas.forEach(p => {
                        if (onclickTekst.includes(p + '.html')) magZien = true;
                    });

                    // Geen recht op deze pagina? Verberg de knop!
                    if (!magZien) {
                        knop.style.display = 'none';
                    }
                });
            }
        }

        // --- E. Verberg "Admin-Only" knoppen voor trainers ---
        if (actieveGebruiker.rol !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    };

    // Voer direct uit als de pagina al geladen is, wacht anders een tel
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', pasPaginaAan);
    } else {
        pasPaginaAan();
    }
};

// Start de beveiligingscheck
window.checkBeveiliging();