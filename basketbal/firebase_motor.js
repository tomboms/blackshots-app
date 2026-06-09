// --- FIREBASE_MOTOR.JS: DE GEDISTRIBUEERDE ENGINE (ZOMBIE-DATA GEFIXT) ---
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

function updateStatus(status) {
    let wolkje = document.getElementById('cloud-status-indicator');
    if(!wolkje) return;
    if (status === 'online') { wolkje.innerText = "☁️ Cloud Actief"; wolkje.style.background = "#27ae60"; }
    else if (status === 'opslaan') { wolkje.innerText = "⏳ Opslaan..."; wolkje.style.background = "#3498db"; }
    else if (status === 'bijgewerkt') { wolkje.innerText = "🟣 Bijgewerkt!"; wolkje.style.background = "#9b59b6"; setTimeout(() => updateStatus('online'), 2000); }
}

window.autoUpload = async function(key, value) {
    if (!navigator.onLine || window.isDownloading) return;
    try {
        updateStatus('opslaan');
        // FIX: GEEN 'merge: true' MEER! Hierdoor kwamen oude teams steeds terug als zombies.
        // We overschrijven het document nu 100% met jouw lokale actuele waarheid.
        await setDoc(doc(db, "blackshots", key), { data: value });
        updateStatus('online');
    } catch(e) { console.error("Upload fout:", e); }
};

window.forceerCloudCheck = async function() {
    if (!navigator.onLine || window.isDownloading) return;
    const onderdelen = ['blackshots_teams', 'blackshots_spelers', 'blackshots_oefeningen', 'blackshots_toernooi', 'blackshots_trainingen'];
    window.isDownloading = true;

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
                    updateStatus('bijgewerkt');
                }
            }
        } catch(e) { console.error("Sync fout:", e); }
    }
    window.isDownloading = false;
    
    if(typeof window.laadDashboardData === 'function') window.laadDashboardData();
    if(typeof window.renderTeamBeheer === 'function') window.renderTeamBeheer();
    if(typeof window.renderSpelers === 'function') window.renderSpelers();
    if(typeof window.renderWeekAgenda === 'function') window.renderWeekAgenda();
};

const origineleSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    origineleSetItem.apply(this, arguments);
    if (window.isDownloading || !key.startsWith('blackshots_')) return;
    window.autoUpload(key, JSON.parse(value));
};

setTimeout(window.forceerCloudCheck, 1000);