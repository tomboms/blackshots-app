// --- BASKETBAL_AUTH.JS: BEVEILIGING, INLOGGEN & MENU RECHTEN ---

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

    // Wel ingelogd? Pas de pagina aan!
    document.addEventListener('DOMContentLoaded', () => {
        
        // --- A. Welkomstbericht & Uitloggen ---
        let navH1 = document.querySelector('.top-nav h1');
        if (navH1) {
            // Geef een leuk icoontje op basis van de rol
            let rolBadge = actieveGebruiker.rol === 'admin' ? '👑' : (actieveGebruiker.rol === 'bestuur' ? '💼' : '🏀');
            
            navH1.innerHTML += ` <span style="font-size:0.8rem; background:rgba(255,255,255,0.2); padding:5px 12px; border-radius:15px; margin-left:20px; vertical-align:middle; font-weight:normal; letter-spacing:0.5px;">Welkom, ${actieveGebruiker.naam} ${rolBadge}</span>`;
            
            // Maak de uitlog knop
            const uitlogBtn = document.createElement('button');
            uitlogBtn.innerHTML = '🚪 Uitloggen';
            uitlogBtn.style.cssText = 'background:#e74c3c; color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; margin-left:auto; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition:0.2s;';
            uitlogBtn.onmouseover = () => uitlogBtn.style.background = '#c0392b';
            uitlogBtn.onmouseout = () => uitlogBtn.style.background = '#e74c3c';
            uitlogBtn.onclick = function() {
                localStorage.removeItem('bs_actieve_gebruiker');
                localStorage.removeItem('bs_rol');
                window.location.href = '../index.html';
            };
            document.querySelector('.top-nav').appendChild(uitlogBtn);
        }

        // --- B. Menu Filteren op Rechten ---
        if (!actieveGebruiker.paginas.includes('all')) {
            const tabMenu = document.querySelector('.tab-menu');
            if (tabMenu) {
                const knoppen = Array.from(tabMenu.querySelectorAll('.tab-btn'));
                knoppen.forEach(knop => {
                    let magZien = false;
                    let onclickTekst = knop.getAttribute('onclick') || '';
                    
                    actieveGebruiker.paginas.forEach(p => {
                        // Kijkt of de knop verwijst naar een pagina die hij mag zien (bijv. 'agenda.html')
                        if (onclickTekst.includes(p + '.html')) magZien = true;
                    });

                    // Geen recht op deze pagina? Verberg de knop!
                    if (!magZien) {
                        knop.style.display = 'none';
                    }
                });
            }
        }

        // --- C. Verberg "Admin-Only" knoppen voor trainers ---
        if (actieveGebruiker.rol !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    });
};

// Start de beveiligingscheck direct bij het inladen van het script
window.checkBeveiliging();