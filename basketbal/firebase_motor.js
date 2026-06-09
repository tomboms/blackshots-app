// --- FIREBASE_MOTOR.JS: DE GEDEELDE CLOUD ENGINE (V5 - LOOP PROOF) ---
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
window.firebaseDB = db;

// De magische schakelaar om de oneindige loop te blokkeren
window.isDownloading = false;

function updateStatus(status) {
    let wolkje = document.getElementById('cloud-status-indicator');
    if(!wolkje) return;
    
    if (status === 'offline') {
        wolkje.innerText = "❌ Offline (Lokaal)"; wolkje.style.background = "#e74c3c"; 
    } else if (status === 'online') {
        wolkje.innerText = "☁️ Cloud Actief"; wolkje.style.background = "#27ae60"; 
    } else if (status === 'opslaan') {
        wolkje.innerText = "⏳ Opslaan..."; wolkje.style.background = "#3498db"; 
    } else if (status === 'bijgewerkt') {
        wolkje.innerText = "🟣 Cloud Bijgewerkt!"; wolkje.style.background = "#9b59b6"; 
        setTimeout(() => { if(navigator.onLine) updateStatus('online'); }, 3000);
    }
}

window.addEventListener('offline', () => updateStatus('offline'));
window.addEventListener('online', () => updateStatus('online'));
if (!navigator.onLine) updateStatus('offline');

// FORCEER UPDATE FUNCTIE
window.forceerCloudCheck = async function() {
    if (!navigator.onLine || window.isDownloading) return;
    try {
        let collectie = window.location.pathname.includes('koken') ? "koken" : "blackshots";
        let docNaam = window.location.pathname.includes('koken') ? "maaltijddata" : "clubdata";

        const docSnap = await getDoc(doc(db, collectie, docNaam));
        if (docSnap.exists()) {
            let data = docSnap.data();
            let isGewijzigd = false;
            
            // Zet de blokkade aan tijdens het wegschrijven
            window.isDownloading = true;

            Object.keys(data).forEach(key => {
                if (localStorage.getItem(key) !== data[key]) {
                    origineleSetItem.call(localStorage, key, data[key]);
                    isGewijzigd = true;
                }
            });
            
            // Schakel de blokkade weer uit
            window.isDownloading = false;
            
            if (isGewijzigd) {
                updateStatus('bijgewerkt'); 
                if(typeof window.laadDashboardData === 'function') window.laadDashboardData();
                if(typeof window.renderTeamBeheer === 'function') window.renderTeamBeheer();
                if(typeof window.renderSpelers === 'function') window.renderSpelers();
                if(typeof window.renderToernooi === 'function') window.renderToernooi();
            }
        }
    } catch(e) { 
        window.isDownloading = false;
        console.error("Force sync failed:", e); 
        updateStatus('offline'); 
    }
};

// 1. REAL-TIME LUISTERAAR
let luisterCollectie = window.location.pathname.includes('koken') ? "koken" : "blackshots";
let luisterDoc = window.location.pathname.includes('koken') ? "maaltijddata" : "clubdata";

onSnapshot(doc(db, luisterCollectie, luisterDoc), (docSnap) => {
    if (docSnap.exists() && navigator.onLine && !window.isDownloading) { 
        window.forceerCloudCheck(); 
    }
});

// 2. STILLE UPLOAD
window.autoUpload = function(col) {
    if (!navigator.onLine || window.isDownloading) return;

    let data = {};
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (col === "blackshots" && key.startsWith('blackshots_')) data[key] = localStorage.getItem(key);
        if (col === "koken" && !key.startsWith('blackshots_') && key !== 'avondeet_ingelogd_als' && key !== 'koken_laatste_tab') data[key] = localStorage.getItem(key);
    }
    
    let docNaam = col === "koken" ? "maaltijddata" : "clubdata";
    setDoc(doc(db, col, docNaam), data, { merge: true })
        .then(() => updateStatus('online'))
        .catch(() => updateStatus('offline'));
};

// 3. STORAGE INTERCEPTOR
const origineleSetItem = localStorage.setItem;
let typTimer;

localStorage.setItem = function(key, value) {
    origineleSetItem.apply(this, arguments);
    
    // Als de wijziging vanuit de cloud-download komt, stappen we hier direct uit!
    if (window.isDownloading) return;
    
    if(key && typeof key === 'string' && key !== 'avondeet_ingelogd_als' && key !== 'koken_laatste_tab' && key !== 'laatste_tab') {
        if (!navigator.onLine) {
            updateStatus('offline');
        } else {
            updateStatus('opslaan');
            clearTimeout(typTimer);
            typTimer = setTimeout(() => { 
                let col = key.startsWith('blackshots_') ? "blackshots" : "koken";
                window.autoUpload(col); 
            }, 1000);
        }
    }
};

setTimeout(() => { window.forceerCloudCheck(); }, 500);