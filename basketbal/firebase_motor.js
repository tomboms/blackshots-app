// --- FIREBASE_MOTOR.JS: DE GEDISTRIBUEERDE ENGINE (V6 - PLANNER FIX) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

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

// Status-updates voor de gebruiker
function updateStatus(status) {
    let wolkje = document.getElementById('cloud-status-indicator');
    if(!wolkje) return;
    if (status === 'online') { wolkje.innerText = "☁️ Cloud Actief"; wolkje.style.background = "#27ae60"; }
    else if (status === 'opslaan') { wolkje.innerText = "⏳ Opslaan..."; wolkje.style.background = "#3498db"; }
    else if (status === 'bijgewerkt') { wolkje.innerText = "🟣 Bijgewerkt!"; wolkje.style.background = "#9b59b6"; setTimeout(() => updateStatus('online'), 2000); }
}

// 1. DYNAMISCHE UPLOAD
window.autoUpload = async function(key, value) {
    if (!navigator.onLine || window.isDownloading) return;

    try {
        updateStatus('opslaan');
        await setDoc(doc(db, "blackshots", key), { data: value }, { merge: true });
        updateStatus('online');
    } catch(e) { console.error("Upload fout:", e); }
};

// 2. DYNAMISCHE DOWNLOAD (NU MET DE PLANNER EN AGENDA ERIN!)
window.forceerCloudCheck = async function() {
    if (!navigator.onLine || window.isDownloading) return;
    
    // KOPPELING HERSTELD: blackshots_trainingen is toegevoegd aan de lades!
    const onderdelen = ['blackshots_teams', 'blackshots_spelers', 'blackshots_oefeningen', 'blackshots_toernooi', 'blackshots_trainingen'];
    window.isDownloading = true;

    for (let key of onderdelen) {
        try {
            const docSnap = await getDoc(doc(db, "blackshots", key));
            if (docSnap.exists()) {
                let cloudData = JSON.stringify(docSnap.data().data);
                if (localStorage.getItem(key) !== cloudData) {
                    localStorage.setItem(key, cloudData);
                    
                    // Live de database variabelen vullen
                    if (key === 'blackshots_teams') window.teamsDB = JSON.parse(cloudData);
                    if (key === 'blackshots_spelers') window.spelersDB = JSON.parse(cloudData);
                    if (key === 'blackshots_trainingen') window.geplandeTrainingenDB = JSON.parse(cloudData);
                    if (key === 'blackshots_oefeningen') window.oefeningenDB = JSON.parse(cloudData);
                    if (key === 'blackshots_toernooi') window.toernooiDB = JSON.parse(cloudData);
                    
                    updateStatus('bijgewerkt');
                }
            }
        } catch(e) { console.error("Sync fout voor " + key, e); }
    }
    
    window.isDownloading = false;
    
    // Schermen live en geruisloos hertekenen
    if(typeof window.laadDashboardData === 'function') window.laadDashboardData();
    if(typeof window.renderTeamBeheer === 'function') window.renderTeamBeheer();
    if(typeof window.renderSpelers === 'function') window.renderSpelers();
    if(typeof window.renderToernooi === 'function') window.renderToernooi();
    if(typeof window.renderWeekAgenda === 'function') window.renderWeekAgenda(); // Zorgt dat de planner direct inlaadt!
};

// 3. STORAGE INTERCEPTOR
const origineleSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    origineleSetItem.apply(this, arguments);
    if (window.isDownloading || !key.startsWith('blackshots_')) return;
    
    window.autoUpload(key, JSON.parse(value));
};

// Start de sync bij opstarten
setTimeout(window.forceerCloudCheck, 1000);