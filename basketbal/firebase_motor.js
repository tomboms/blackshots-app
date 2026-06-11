// --- FIREBASE_MOTOR.JS: LIVE SYNC & VERSIE CONTROLE ---

// 👇 VERANDER DIT NUMMER BIJ ELKE GITHUB PUSH 👇
const APP_VERSIE = "3.5214";

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

// 1. ZET DE VERSIE IN DE NAVIGATIEBALK
document.addEventListener('DOMContentLoaded', () => {
    let titel = document.querySelector('.top-nav h1');
    if (titel && !document.getElementById('versie-badge')) {
        titel.innerHTML += ` <span id="versie-badge" style="font-size:0.75rem; background:rgba(255,255,255,0.2); padding:3px 8px; border-radius:12px; margin-left:10px; vertical-align:middle;">${APP_VERSIE}</span>`;
    }
});

// 2. DE SLIMME, VERBORGEN STATUS-WOLK
function updateStatus(status) {
    let wolkje = document.getElementById('cloud-status-indicator');
    if (!wolkje) return;
    
    wolkje.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    wolkje.style.pointerEvents = "none";

    if (status === 'verborgen' || status === 'online') { 
        wolkje.style.opacity = "0";
        wolkje.style.transform = "translateY(30px)";
    }
    else if (status === 'offline') {
        wolkje.innerText = "❌ Geen Verbinding"; 
        wolkje.style.background = "#e74c3c";
        wolkje.style.opacity = "1";
        wolkje.style.transform = "translateY(0)";
    }
    else if (status === 'opslaan') { 
        wolkje.innerText = "⏳ Opslaan..."; 
        wolkje.style.background = "#3498db"; 
        wolkje.style.opacity = "1";
        wolkje.style.transform = "translateY(0)";
    }
    else if (status === 'bijgewerkt') { 
        wolkje.innerText = "🟣 Nieuwe Data!"; 
        wolkje.style.background = "#9b59b6"; 
        wolkje.style.opacity = "1";
        wolkje.style.transform = "translateY(0)";
        setTimeout(() => updateStatus('verborgen'), 2500); 
    }
}

window.addEventListener('offline', () => updateStatus('offline'));
window.addEventListener('online', () => updateStatus('verborgen'));
setTimeout(() => updateStatus('verborgen'), 100);

// ============================================================================
// OPSLAAN NAAR FIREBASE
// ============================================================================
window.autoUpload = async function(key, value) {
    if (!navigator.onLine || window.isDownloading) return;
    try {
        updateStatus('opslaan');
        await setDoc(doc(db, "blackshots", key), { data: value });
        setTimeout(() => updateStatus('verborgen'), 500);
    } catch(e) { console.error("Upload fout:", e); }
};

// ============================================================================
// LIVE LUISTEREN NAAR FIREBASE (VERVANGT DE OUDE GETDOC)
// ============================================================================
window.startLiveSync = function() {
    if (!navigator.onLine) return;
    
    // Al jouw app-onderdelen (inclusief gebruikers!)
    const onderdelen = [
        'blackshots_teams', 'blackshots_spelers', 'blackshots_oefeningen', 
        'blackshots_toernooi', 'blackshots_trainingen', 'blackshots_gebruikers', 
        'blackshots_bestuur', 'blackshots_jaarplanning_data', 
        'blackshots_zaalhuur_data', 'blackshots_jaarplanning_categorieen',
        'blackshots_poule_teams', 'blackshots_wedstrijden_json'
    ];

    onderdelen.forEach(key => {
        // onSnapshot is de magische live-luisteraar. Triggert bij laden én bij elke cloud-wijziging!
        onSnapshot(doc(db, "blackshots", key), (docSnap) => {
            if (docSnap.exists()) {
                let cloudData = JSON.stringify(docSnap.data().data);
                
                // Alleen updaten als de cloud écht verschilt van wat er op het scherm staat
                if (localStorage.getItem(key) !== cloudData) {
                    
                    // 1. Blokkeer tijdelijk de upload, anders ontstaat er een oneindige loop!
                    window.isDownloading = true; 
                    localStorage.setItem(key, cloudData);
                    window.isDownloading = false;
                    
                    // 2. Data is veilig lokaal opgeslagen, nu uitpakken
                    let parsedData = JSON.parse(cloudData);
                    
                    if (key === 'blackshots_teams') window.teamsDB = parsedData;
                    if (key === 'blackshots_spelers') window.spelersDB = parsedData;
                    if (key === 'blackshots_trainingen') window.geplandeTrainingenDB = parsedData;
                    if (key === 'blackshots_oefeningen') window.oefeningenDB = parsedData;
                    if (key === 'blackshots_toernooi') window.toernooiDB = parsedData;
                    
                    // Stuur door naar de juiste modules als die toevallig open staan op het scherm
                    if (key === 'blackshots_jaarplanning_data' || key === 'blackshots_jaarplanning_categorieen') {
                        if (typeof window.ontvangCloudData === 'function') window.ontvangCloudData(key, parsedData);
                    }
                    if (key === 'blackshots_zaalhuur_data') {
                        if (typeof window.ontvangCloudDataZaalhuur === 'function') window.ontvangCloudDataZaalhuur(key, parsedData);
                    }
                    if (key === 'blackshots_poule_teams' || key === 'blackshots_wedstrijden_json') {
                        if (typeof window.ontvangCloudDataPoule === 'function') window.ontvangCloudDataPoule(key, parsedData);
                    }
                    
                    updateStatus('bijgewerkt');
                    
                    // Schermen hertekenen
                    if(typeof window.laadDashboardData === 'function') window.laadDashboardData();
                    if(typeof window.renderTeamBeheer === 'function') window.renderTeamBeheer();
                    if(typeof window.renderSpelers === 'function') window.renderSpelers();
                    if(typeof window.renderWeekAgenda === 'function') window.renderWeekAgenda();
                    if(typeof window.renderGebruikers === 'function') window.renderGebruikers();
                    if(typeof window.tekenKalender === 'function') window.tekenKalender();
                    if(typeof window.tekenZaalhuurResultaten === 'function') window.tekenZaalhuurResultaten();
                    if(typeof window.tekenPouleResultaten === 'function') window.tekenPouleResultaten();
                }
            }
        });
    });
};

// ============================================================================
// ONDERSCHEP ALLE LOKALE OPSLAG ACTIES
// ============================================================================
const origineleSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    origineleSetItem.apply(this, arguments);
    // Als we zelf data opslaan (en niet aan het downloaden zijn), stuur het naar de cloud!
    if (window.isDownloading || !key.startsWith('blackshots_')) return;
    window.autoUpload(key, JSON.parse(value));
};

// Start de live verbinding 1 seconde na het inladen van de pagina
setTimeout(window.startLiveSync, 1000);