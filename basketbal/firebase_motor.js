// --- FIREBASE_MOTOR.JS: VERBORGEN WOLK & VERSIE CONTROLE ---

// 👇 VERANDER DIT NUMMER BIJ ELKE GITHUB PUSH (bijv. v2.1, v2.2) 👇
const APP_VERSIE = "3.5";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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

window.autoUpload = async function(key, value) {
    if (!navigator.onLine || window.isDownloading) return;
    try {
        updateStatus('opslaan');
        await setDoc(doc(db, "blackshots", key), { data: value });
        setTimeout(() => updateStatus('verborgen'), 500);
    } catch(e) { console.error("Upload fout:", e); }
};

window.forceerCloudCheck = async function() {
    if (!navigator.onLine || window.isDownloading) return;
    // Inclusief de nieuwe gebruikers map!
    const onderdelen = ['blackshots_teams', 'blackshots_spelers', 'blackshots_oefeningen', 'blackshots_toernooi', 'blackshots_trainingen', 'blackshots_gebruikers', 'blackshots_bestuur'];
    window.isDownloading = true;

    let heeftNieuweData = false;

    for (let key of onderdelen) {
        try {
            const docSnap = await getDoc(doc(db, "blackshots", key));
            if (docSnap.exists()) {
                let cloudData = JSON.stringify(docSnap.data().data);
                if (localStorage.getItem(key) !== cloudData) {
                    localStorage.setItem(key, cloudData);
                    if (key === 'blackshots_teams') window.teamsDB = JSON.parse(cloudData);
                    if (key === 'blackshots_spelers') window.spelersDB = JSON.parse(cloudData);
                    if (key === 'blackshots_trainingen') window.geplandeTrainingenDB = JSON.parse(cloudData);
                    if (key === 'blackshots_oefeningen') window.oefeningenDB = JSON.parse(cloudData);
                    if (key === 'blackshots_toernooi') window.toernooiDB = JSON.parse(cloudData);
                    
                    heeftNieuweData = true; 
                }
            }
        } catch(e) { console.error("Sync fout:", e); }
    }
    
    window.isDownloading = false;
    
    if (heeftNieuweData) {
        updateStatus('bijgewerkt');
        if(typeof window.laadDashboardData === 'function') window.laadDashboardData();
        if(typeof window.renderTeamBeheer === 'function') window.renderTeamBeheer();
        if(typeof window.renderSpelers === 'function') window.renderSpelers();
        if(typeof window.renderWeekAgenda === 'function') window.renderWeekAgenda();
        if(typeof window.renderGebruikers === 'function') window.renderGebruikers();
    }
};

const origineleSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    origineleSetItem.apply(this, arguments);
    if (window.isDownloading || !key.startsWith('blackshots_')) return;
    window.autoUpload(key, JSON.parse(value));
};

setTimeout(window.forceerCloudCheck, 1000);