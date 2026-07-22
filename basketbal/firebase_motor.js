// --- FIREBASE_MOTOR.JS: LIVE SYNC & KOGELVRIJE OPSLAG (GEÜPDATET VOOR PLANNER) ---

const APP_VERSIE = "22-7 18:12 "; // Versie eentje omhoog gezet voor de nieuwe planner!

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZXtE9MSgveV8kYlh68rpMZvKh5_oLhBc",
    authDomain: "tomsdata-87267.firebaseapp.com",
    projectId: "tomsdata-87267",
    storageBucket: "tomsdata-87267.firebasestorage.app",
    messagingSenderId: "241271213707",
    appId: "1:241271213707:web:d853c52ac0afcfa1f90e8e",
    measurementId: "G-RCVH31FL97"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.isDownloading = false;

document.addEventListener('DOMContentLoaded', () => {
    let titel = document.querySelector('.top-nav h1');
    if (titel && !document.getElementById('versie-badge')) {
        titel.innerHTML += ` <span id="versie-badge" style="font-size:0.75rem; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:12px; margin-left:10px; vertical-align:middle;">${APP_VERSIE}</span>`;
    }
});

function updateStatus(status) {
    let wolkje = document.getElementById('cloud-status-indicator');
    if (!wolkje) return;
    
    wolkje.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    wolkje.style.pointerEvents = "none";

    if (status === 'verborgen' || status === 'online') { 
        wolkje.style.opacity = "0"; wolkje.style.transform = "translateY(30px)";
    }
    else if (status === 'offline') {
        wolkje.innerText = "❌ Geen Verbinding"; wolkje.style.background = "#e74c3c";
        wolkje.style.opacity = "1"; wolkje.style.transform = "translateY(0)";
    }
    else if (status === 'opslaan') { 
        wolkje.innerText = "⏳ Opslaan..."; wolkje.style.background = "#3498db"; 
        wolkje.style.opacity = "1"; wolkje.style.transform = "translateY(0)";
    }
    else if (status === 'bijgewerkt') { 
        wolkje.innerText = "🟣 Nieuwe Data!"; wolkje.style.background = "#9b59b6"; 
        wolkje.style.opacity = "1"; wolkje.style.transform = "translateY(0)";
        setTimeout(() => updateStatus('verborgen'), 2500); 
    }
}

window.addEventListener('offline', () => updateStatus('offline'));
window.addEventListener('online', () => updateStatus('verborgen'));
setTimeout(() => updateStatus('verborgen'), 100);

window.autoUpload = async function(key, value) {
    if (!navigator.onLine || window.isDownloading) return;
    try {
        updateStatus('opslaan');
        await setDoc(doc(db, "blackshots", key), { data: value });
        setTimeout(() => updateStatus('verborgen'), 500);
    } catch(e) { console.error("Upload fout:", e); }
};

window.startLiveSync = function() {
    if (!navigator.onLine) return;
    
    // NIEUW: Alle nieuwe planner, matrix en overzicht databases zijn hier toegevoegd!
    const onderdelen = [
        'blackshots_teams', 'blackshots_spelers', 'blackshots_oefeningen', 
        'blackshots_toernooi', 'blackshots_trainingen', 'blackshots_gebruikers', 
        'blackshots_bestuur', 'blackshots_jaarplanning_data', 
        'blackshots_zaalhuur_data', 'blackshots_jaarplanning_categorieen',
        'blackshots_poule_teams', 'blackshots_wedstrijden_json',
        'blackshots_scheidsrechters', 'blackshots_speeldagen', 
        'blackshots_custom_wedstrijden', 'blackshots_wedstrijd_taken', 
        'blackshots_plan_status', 'blackshots_clubregels', 'blackshots_beschikbaarheid'
    ];

    onderdelen.forEach(key => {
        onSnapshot(doc(db, "blackshots", key), (docSnap) => {
            if (docSnap.exists()) {
                let cloudData = JSON.stringify(docSnap.data().data);
                
                if (localStorage.getItem(key) !== cloudData) {
                    window.isDownloading = true; 
                    localStorage.setItem(key, cloudData);
                    window.isDownloading = false;
                    
                    let parsedData = JSON.parse(cloudData);
                    
                    // Oude koppelingen
                    if (key === 'blackshots_teams') window.teamsDB = parsedData;
                    if (key === 'blackshots_spelers') window.spelersDB = parsedData;
                    if (key === 'blackshots_trainingen') window.geplandeTrainingenDB = parsedData;
                    if (key === 'blackshots_oefeningen') window.oefeningenDB = parsedData;
                    if (key === 'blackshots_toernooi') window.toernooiDB = parsedData;
                    
                    // Nieuwe koppelingen: Geef het door via ontvangCloudData (Voor Planner & Overzicht)
                    if (['blackshots_jaarplanning_data', 'blackshots_jaarplanning_categorieen', 
                         'blackshots_scheidsrechters', 'blackshots_speeldagen', 
                         'blackshots_custom_wedstrijden', 'blackshots_wedstrijd_taken', 
                         'blackshots_plan_status', 'blackshots_clubregels', 'blackshots_beschikbaarheid'].includes(key)) {
                        if (typeof window.ontvangCloudData === 'function') window.ontvangCloudData(key, parsedData);
                    }

                    if (key === 'blackshots_zaalhuur_data') {
                        if (typeof window.ontvangCloudDataZaalhuur === 'function') window.ontvangCloudDataZaalhuur(key, parsedData);
                    }
                    if (key === 'blackshots_poule_teams' || key === 'blackshots_wedstrijden_json') {
                        if (typeof window.ontvangCloudDataPoule === 'function') window.ontvangCloudDataPoule(key, parsedData);
                    }
                    
                    updateStatus('bijgewerkt');
                    
                    // Herlaad de schermen als de functies bestaan
                    if(typeof window.laadDashboardData === 'function') window.laadDashboardData();
                    if(typeof window.renderTeamBeheer === 'function') window.renderTeamBeheer();
                    if(typeof window.renderSpelers === 'function') window.renderSpelers();
                    if(typeof window.renderWeekAgenda === 'function') window.renderWeekAgenda();
                    if(typeof window.renderGebruikers === 'function') window.renderGebruikers();
                    if(typeof window.tekenKalender === 'function') window.tekenKalender();
                    if(typeof window.tekenZaalhuurResultaten === 'function') window.tekenZaalhuurResultaten();
                    if(typeof window.tekenPouleResultaten === 'function') window.tekenPouleResultaten();
                    
                    // NIEUW: Ververs de Planner, Overzicht en Matrix live
                    if(typeof window.laadPlanbord === 'function') window.laadPlanbord();
                    if(typeof window.berekenEnRenderOverzicht === 'function') window.berekenEnRenderOverzicht();
                    if(typeof window.renderMatrix === 'function') window.renderMatrix();
                }
            }
        });
    });
};

// KOGELVRIJE OPSLAG INTERCEPTIE (Jouw eigen briljante code!)
const origineleSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    origineleSetItem.call(localStorage, key, value); 
    if (window.isDownloading || !key.startsWith('blackshots_')) return;
    try {
        window.autoUpload(key, JSON.parse(value));
    } catch(e) {
        console.warn("Kon " + key + " niet direct uploaden (geen valide JSON)");
    }
};

setTimeout(window.startLiveSync, 1000);1