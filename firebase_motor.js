// --- FIREBASE_MOTOR.JS: DE GEDEELDE CLOUD ENGINE VOOR ALLE PAGINA'S ---
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

// SLIMME STATUS FUNCTIE
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

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
        let wolkje = document.getElementById('cloud-status-indicator');
        if(wolkje) { wolkje.innerText = "⏳ Syncen..."; wolkje.style.background = "#f39c12"; }
        setTimeout(() => { if(typeof window.forceerCloudCheck === 'function') window.forceerCloudCheck(); }, 500);
    }
});

// FORCEER UPDATE FUNCTIE (Nu met simpele reload voor losse pagina's)
window.forceerCloudCheck = async function() {
    if (!navigator.onLine) return;
    try {
        // Hij checkt slim of we op de basketbal of koken pagina zitten!
        let collectie = window.location.pathname.includes('koken') ? "koken" : "blackshots";
        let docNaam = window.location.pathname.includes('koken') ? "maaltijddata" : "clubdata";

        const docSnap = await getDoc(doc(db, collectie, docNaam));
        if (docSnap.exists()) {
            let data = docSnap.data();
            let isGewijzigd = false;
            Object.keys(data).forEach(key => {
                if (localStorage.getItem(key) !== data[key]) {
                    origineleSetItem.call(localStorage, key, data[key]);
                    isGewijzigd = true;
                }
            });
            
            if (isGewijzigd) {
                updateStatus('bijgewerkt'); 
                setTimeout(() => {
                    if (!document.querySelector('input:focus, textarea:focus')) {
                        location.reload(); // Harde refresh omdat we nu op losse pagina's zitten
                    }
                }, 1500); 
            }
        }
    } catch(e) { console.error("Force sync failed:", e); updateStatus('offline'); }
};

// 1. REAL-TIME LUISTERAAR
let luisterCollectie = window.location.pathname.includes('koken') ? "koken" : "blackshots";
let luisterDoc = window.location.pathname.includes('koken') ? "maaltijddata" : "clubdata";

onSnapshot(doc(db, luisterCollectie, luisterDoc), (docSnap) => {
    if (docSnap.exists() && navigator.onLine) { window.forceerCloudCheck(); }
}, (error) => { updateStatus('offline'); });

// 2. STILLE OPSLAG OP DE ACHTERGROND
window.autoUpload = function(col) {
    if (!navigator.onLine) { updateStatus('offline'); return; }

    let data = {};
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (col === "blackshots" && key.startsWith('blackshots_')) data[key] = localStorage.getItem(key);
        if (col === "koken" && !key.startsWith('blackshots_') && key !== 'avondeet_ingelogd_als') data[key] = localStorage.getItem(key);
    }
    
    let docNaam = col === "koken" ? "maaltijddata" : "clubdata";
    let firebaseUpload = setDoc(doc(db, col, docNaam), data, { merge: true });
    let timer = new Promise((resolve) => setTimeout(() => resolve('te_traag'), 5000));
    
    Promise.race([firebaseUpload, timer])
        .then((uitslag) => {
            if (uitslag === 'te_traag') updateStatus('offline');
            else updateStatus('online');
        })
        .catch(() => updateStatus('offline'));
};

// 3. SLIMME COUPLING
const origineleSetItem = localStorage.setItem;
let typTimer;

localStorage.setItem = function(key, value) {
    origineleSetItem.apply(this, arguments);
    
    // Voorkom loops en tijdelijke keys
    if(key && typeof key === 'string' && key !== 'avondeet_ingelogd_als' && key !== 'koken_laatste_tab') {
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