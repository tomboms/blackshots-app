// --- KOOKPLAN.JS: DE DIGITALE SOUS-CHEF ---

let actieveKookplanDatum = window.getIsoDatumS(new Date());
let directGekozenReceptId = null;
window.kookplanPorties = {}; 
window.actieveTimers = {}; 

// --- NAVIGATIE & ZOEKEN ---
window.zetKookplanVandaag = function() {
    actieveKookplanDatum = window.getIsoDatumS(new Date());
    document.getElementById('kookplan-datum-picker').value = actieveKookplanDatum;
    directGekozenReceptId = null; 
    document.getElementById('kookplan-direct-select').value = '';
    document.getElementById('kookplan-zoek-input').value = '';
    renderKookplan();
};

window.veranderKookplanDatum = function(dagen) {
    let d = new Date(actieveKookplanDatum);
    d.setDate(d.getDate() + dagen);
    actieveKookplanDatum = window.getIsoDatumS(d);
    document.getElementById('kookplan-datum-picker').value = actieveKookplanDatum;
    directGekozenReceptId = null;
    document.getElementById('kookplan-direct-select').value = '';
    document.getElementById('kookplan-zoek-input').value = '';
    renderKookplan();
};

window.kiesKookplanDatum = function(val) {
    if(val) {
        actieveKookplanDatum = val;
        directGekozenReceptId = null;
        document.getElementById('kookplan-direct-select').value = '';
        document.getElementById('kookplan-zoek-input').value = '';
        renderKookplan();
    }
};

window.filterKookplanSelect = function(term) {
    const select = document.getElementById('kookplan-direct-select');
    if(!select) return;
    select.innerHTML = '<option value="">-- Selecteer een gerecht --</option>';
    
    let filterTerm = term ? term.toLowerCase().trim() : "";
    let gefilterdeLijst = receptenDB.filter(r => {
        if (!filterTerm) return true;
        return r.naam && r.naam.toLowerCase().includes(filterTerm);
    });

    gefilterdeLijst.sort((a,b) => a.naam.localeCompare(b.naam)).forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = r.naam;
        select.appendChild(option);
    });
};

window.laadDirectRecept = function(receptId) {
    directGekozenReceptId = receptId || null;
    if(!receptId) {
        document.getElementById('kookplan-direct-select').value = '';
        document.getElementById('kookplan-zoek-input').value = '';
    }
    renderKookplan();
};

window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('kookplan-datum-picker')) {
        document.getElementById('kookplan-datum-picker').value = actieveKookplanDatum;
    }
});

// --- PORTIES LIVE UPSCALEN ---
window.pasPortiesAan = function(receptId, verandering) {
    if(window.kookplanPorties[receptId]) {
        window.kookplanPorties[receptId] += verandering;
        if(window.kookplanPorties[receptId] < 1) window.kookplanPorties[receptId] = 1;
        window.renderKookplan();
    }
}

// --- SLIMME KOOKWEKKERS (TIMERS) ---
window.startKookwekker = function(minutenStr, label) {
    let minuten = parseFloat(minutenStr.toString().replace(/[^0-9\.]/g, ''));
    if (isNaN(minuten) || minuten <= 0) return alert("Dit is geen geldige tijd om een wekker voor te zetten.");
    
    let totalSeconds = Math.floor(minuten * 60);
    let timerId = 'timer_' + Date.now();
    
    let container = document.getElementById('timer-container');
    if(!container) {
        container = document.createElement('div');
        container.id = 'timer-container';
        container.style.cssText = "position:fixed; bottom:80px; right:20px; display:flex; flex-direction:column; gap:10px; z-index:10000;";
        document.body.appendChild(container);
    }

    let timerDiv = document.createElement('div');
    timerDiv.id = timerId;
    timerDiv.style.cssText = "background:#34495e; color:white; padding:15px; border-radius:8px; box-shadow:0 4px 10px rgba(0,0,0,0.3); min-width:220px; display:flex; flex-direction:column; border-left:5px solid #f39c12;";
    
    let header = document.createElement('div');
    header.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;";
    header.innerHTML = `<strong style="font-size:0.9rem;">${label}</strong> <button onclick="window.sluitKookwekker('${timerId}')" style="background:transparent; border:none; color:white; cursor:pointer; font-weight:bold; font-size:1.1rem;">X</button>`;
    
    let timeDisplay = document.createElement('div');
    timeDisplay.style.cssText = "font-size:1.8rem; font-weight:bold; color:#f39c12;";
    
    timerDiv.appendChild(header);
    timerDiv.appendChild(timeDisplay);
    container.appendChild(timerDiv);

    window.actieveTimers[timerId] = setInterval(() => {
        if(totalSeconds <= 0) {
            clearInterval(window.actieveTimers[timerId]);
            timeDisplay.innerText = "00:00";
            timeDisplay.style.color = "#e74c3c";
            timerDiv.style.borderLeftColor = "#e74c3c";
            try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play(); } catch(e){}
            return;
        }
        totalSeconds--;
        let m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        let s = (totalSeconds % 60).toString().padStart(2, '0');
        timeDisplay.innerText = `${m}:${s}`;
    }, 1000);
    
    let m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    let s = (totalSeconds % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${m}:${s}`;
}

window.sluitKookwekker = function(id) {
    clearInterval(window.actieveTimers[id]);
    delete window.actieveTimers[id];
    let el = document.getElementById(id);
    if(el) el.remove();
}

// --- KLIEKJE OPGEGETEN ---
window.kliekjeOpgegeten = function(kliekjeNaam, gegetenPorties) {
    if(!confirm(`Heb je dit gerecht (${kliekjeNaam}) lekker opgegeten? We halen het dan direct af van je actuele virtuele koelkast!`)) return;
    
    if(window.voorraadDB) {
        let kIndex = window.voorraadDB.findIndex(v => v.isKliekje && v.naam === kliekjeNaam);
        if (kIndex > -1) {
            window.voorraadDB[kIndex].aantal -= gegetenPorties;
            if (window.voorraadDB[kIndex].aantal <= 0) {
                window.voorraadDB.splice(kIndex, 1);
            }
            localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB));
        }
    }
    
    alert("Eet smakelijk! Het kliekje is succesvol afgeschreven.");
    window.renderKookplan();
};

// --- RENDER LOGICA: HET DIGITALE KOOKBOEK ---
window.renderKookplan = function() {
    const container = document.getElementById('kookplan-container');
    if(!container) return;
    container.innerHTML = '';

    let inTeLadenRecepten = []; 

    if (directGekozenReceptId) {
        const r = receptenDB.find(x => x.id === directGekozenReceptId);
        if(r) inTeLadenRecepten.push({ type: 'recept', recept: r, personen: r.standaardPersonen, titel: 'Gekozen Gerecht' });
    } else {
        const pl = weekPlanning[actieveKookplanDatum];
        let ingelogdAls = localStorage.getItem('avondeet_ingelogd_als') || 'Samen';
        
        if (pl) {
            ['ontbijt', 'lunch', 'diner', 'extra'].forEach(m => {
                const data = pl[m];
                if(!data) return;
                
                let p = data.samenPersonen || appInstellingen.personen || 2;
                let labels = {'ontbijt': '🍞 Ontbijt', 'lunch': '🥪 Lunch', 'diner': '🍽️ Diner', 'extra': '🍰 Extra'};

                const verwerkItem = (receptID, personenCount, labelTitel) => {
                    if(!receptID) return;
                    if(receptID.startsWith('status_')) {
                        let statusNaam = receptID.replace('status_', '');
                        inTeLadenRecepten.push({ type: 'status', naam: statusNaam, personen: personenCount, titel: labelTitel });
                    } else if (receptID.startsWith('kliekje_')) {
                        let statusNaam = receptID.replace('kliekje_', '');
                        inTeLadenRecepten.push({ type: 'status', naam: statusNaam, personen: personenCount, titel: labelTitel });
                    } else {
                        const r = receptenDB.find(x => x.id === receptID);
                        if(r) inTeLadenRecepten.push({ type: 'recept', recept: r, personen: personenCount, titel: labelTitel });
                    }
                };

                if(data.type === 'Samen') {
                    verwerkItem(data.samenRecept, p, labels[m]);
                } else if (data.type === 'Apart') {
                    if(ingelogdAls === 'Tom' || ingelogdAls === 'Samen') verwerkItem(data.tomRecept, 1, `${labels[m]} (Voor Tom)`);
                    if(ingelogdAls === 'Ike' || ingelogdAls === 'Samen') verwerkItem(data.ikeRecept, 1, `${labels[m]} (Voor Ike)`);
                }
            });
        }
    }

    if (inTeLadenRecepten.length === 0) {
        let context = directGekozenReceptId ? "Dit gerecht bestaat niet meer." : "Er staat voor jou niets in de agenda om te koken op deze dag!";
        container.innerHTML = `<div style="text-align:center; padding:40px; background:var(--card-bg); border-radius:8px; border:1px dashed var(--border-color);"><h3 style="color:#7f8c8d;">${context}</h3><p>Gebruik de zoekbalk hierboven om direct een gerecht te kiezen of vul je agenda in.</p></div>`;
        return;
    }

    inTeLadenRecepten.forEach(item => {
        if (item.type === 'status') {
            let inKoelkast = false;
            let aantalOver = 0;
            if (window.voorraadDB) {
                let k = window.voorraadDB.find(v => v.isKliekje && v.naam === item.naam);
                if (k) { inKoelkast = true; aantalOver = k.aantal; }
            }

            const div = document.createElement('div');
            div.style.background = 'var(--card-bg)'; div.style.borderRadius = '8px'; div.style.padding = '20px'; div.style.marginBottom = '20px'; div.style.borderTop = '4px solid #8e44ad'; div.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';

            div.innerHTML = `
                <div>
                    <h4 style="color:#7f8c8d; margin:0 0 5px 0; font-size:0.9rem; text-transform:uppercase;">${item.titel}</h4>
                    <h2 style="margin:0; color:#8e44ad; font-size:1.8rem;">🥣 Gepland: ${item.naam}</h2>
                    ${inKoelkast ? `<p style="color:#27ae60; font-weight:bold;">Makkelijk vandaag! Er liggen nog ${aantalOver} porties van in de koelkast.</p>` : `<p style="color:#7f8c8d; font-style:italic;">Let op: De app ziet dit kliekje of deze status momenteel niet in de virtuele koelkast liggen.</p>`}
                </div>
                <div style="margin-top:20px;">
                    <button onclick="window.kliekjeOpgegeten('${item.naam}', ${item.personen})" style="width:100%; background:#8e44ad; color:white; border:none; padding:15px; font-size:1.2rem; font-weight:bold; border-radius:8px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">✅ Ik heb dit vandaag opgegeten (Haal uit koelkast)</button>
                </div>
            `;
            container.appendChild(div);
            return; 
        }

        const r = item.recept;
        if(!window.kookplanPorties[r.id]) {
            window.kookplanPorties[r.id] = item.personen;
        }
        let actievePersonen = window.kookplanPorties[r.id];
        const factor = actievePersonen / r.standaardPersonen;
        
        const div = document.createElement('div');
        div.style.background = 'var(--card-bg)';
        div.style.borderRadius = '8px';
        div.style.padding = '20px';
        div.style.marginBottom = '20px';
        div.style.borderTop = '4px solid var(--primary-color)';
        div.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';

        let ingredientenHtml = '';
        r.ingredienten.forEach(ingRef => {
            const dbIng = ingredientenDB.find(i => i.id === ingRef.ingId);
            if(dbIng) {
                let calcAantal = ingRef.aantal * factor;
                if (!['gram', 'ml'].includes(dbIng.eenheid)) calcAantal = Math.round(calcAantal * 10) / 10; 

                // NIEUW: Render de alternatieven er mooi bij
                let altTekst = '';
                if (ingRef.alternatieven && ingRef.alternatieven.length > 0) {
                    let altNamen = ingRef.alternatieven.map(altId => {
                        let dbAlt = ingredientenDB.find(i => i.id === altId);
                        return dbAlt ? dbAlt.naam : '';
                    }).filter(n => n !== '').join(' of ');
                    if (altNamen) altTekst = `<span style="color:#e67e22; font-size:0.9rem; margin-left:5px;">(of ${altNamen})</span>`;
                }

                ingredientenHtml += `
                <label style="display:flex; align-items:center; gap:10px; padding:8px; border-bottom:1px solid rgba(0,0,0,0.05); cursor:pointer;">
                    <input type="checkbox" style="width:20px; height:20px;">
                    <span style="font-size:1.1rem;"><strong>${calcAantal} ${dbIng.eenheid}</strong> ${dbIng.naam} ${altTekst}</span>
                </label>`;
            }
        });

        let stappenHtml = '';
        if(r.instructies && r.instructies.length > 0) {
            r.instructies.forEach((stap, idx) => {
                let beschrijving = typeof stap === 'string' ? stap : stap.beschrijving;
                let tijdKnop = stap.tijd ? `<button onclick="window.startKookwekker('${stap.tijd}', 'Stap ${idx+1}: ${r.naam}')" style="background:#e67e22; color:white; border:none; padding:4px 8px; border-radius:4px; margin-left:5px; font-weight:bold; cursor:pointer; font-size:0.85rem; box-shadow:0 2px 4px rgba(0,0,0,0.1);" title="Klik om wekker te starten">⏱ ${stap.tijd}</button>` : '';
                stappenHtml += `
                <div style="background:var(--bg-color); border:1px solid var(--border-color); padding:15px; border-radius:8px; margin-bottom:10px;">
                    <strong style="color:var(--primary-color); font-size:1.1rem; display:block; margin-bottom:5px;">Stap ${idx+1} ${tijdKnop}</strong>
                    <span style="font-size:1.1rem; line-height:1.5;">${beschrijving}</span>
                </div>`;
            });
        } else {
            stappenHtml = '<p style="font-style:italic; color:#7f8c8d;">Geen stappen toegevoegd.</p>';
        }

        let appHtml = '';
        if (r.apparatuur && r.apparatuur.length > 0) {
            appHtml = `<div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">`;
            r.apparatuur.forEach(app => {
                if (app.toLowerCase().includes('airfryer') && r.airfryerGraden) return; 
                if (app.toLowerCase().includes('oven') && r.ovenGraden) return; 
                appHtml += `<span style="background:#34495e; color:white; padding:4px 10px; border-radius:6px; font-size:0.9rem;">🍳 ${app}</span>`;
            });
            if(r.ovenGraden) appHtml += `<span style="background:#e74c3c; color:white; padding:4px 10px; border-radius:6px; font-size:0.9rem;">🔥 Oven: ${r.ovenGraden}°C</span>`;
            if(r.airfryerGraden) {
                let timerCode = r.airfryerTijd ? `onclick="window.startKookwekker('${r.airfryerTijd}', 'Airfryer: ${r.naam}')" style="cursor:pointer; background:#f39c12; color:white; padding:4px 10px; border-radius:6px; font-size:0.9rem;" title="Start Airfryer Wekker"` : `style="background:#f39c12; color:white; padding:4px 10px; border-radius:6px; font-size:0.9rem;"`;
                appHtml += `<span ${timerCode}>🍟 Airfryer: ${r.airfryerGraden}°C (${r.airfryerTijd || '?'}m) ⏰</span>`;
            }
            appHtml += `</div>`;
        }

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h4 style="color:#7f8c8d; margin:0 0 5px 0; font-size:0.9rem; text-transform:uppercase;">${item.titel}</h4>
                    <h2 style="margin:0; color:var(--text-main); font-size:1.8rem; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                        ${r.naam} 
                        <div style="display:flex; align-items:center; background:var(--input-bg); border:1px solid var(--border-color); border-radius:20px; padding:2px 5px;">
                            <button onclick="window.pasPortiesAan('${r.id}', -1)" style="background:transparent; border:none; color:var(--primary-color); font-size:1.2rem; font-weight:bold; cursor:pointer; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">-</button>
                            <span style="font-size:1rem; color:var(--text-main); font-weight:bold; min-width:25px; text-align:center;">${actievePersonen}</span>
                            <button onclick="window.pasPortiesAan('${r.id}', 1)" style="background:transparent; border:none; color:var(--primary-color); font-size:1.2rem; font-weight:bold; cursor:pointer; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">+</button>
                        </div>
                    </h2>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:1.2rem; font-weight:bold; color:#e67e22;">⏱ ${r.tijd || 20} min</span>
                </div>
            </div>
            ${appHtml}
            
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:20px; margin-top:20px;">
                <div>
                    <h3 style="color:var(--primary-color); border-bottom:2px solid var(--primary-color); padding-bottom:5px;">1. Mise en Place</h3>
                    <p style="font-size:0.85rem; color:#7f8c8d; margin-top:0;">Zet dit klaar op je aanrecht:</p>
                    <div style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:8px; padding:10px;">
                        ${ingredientenHtml}
                    </div>
                </div>
                
                <div>
                    <h3 style="color:var(--primary-color); border-bottom:2px solid var(--primary-color); padding-bottom:5px;">2. Aan de slag</h3>
                    <p style="font-size:0.85rem; color:#7f8c8d; margin-top:0;">Stap-voor-stap bereiding:</p>
                    ${stappenHtml}
                    <button onclick="window.kokenKlaar('${r.id}', ${actievePersonen})" style="width:100%; background:#27ae60; color:white; border:none; padding:15px; font-size:1.2rem; font-weight:bold; border-radius:8px; margin-top:10px; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">✅ Klaar! Aan Tafel</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
};

// --- KLAAR MET KOKEN ACTIE (Voor vers gekookte maaltijden) ---
window.kokenKlaar = function(receptId, personenMeegekookt) {
    if(!confirm("Eten is klaar! Wil je de gebruikte ingrediënten direct afschrijven van je actuele voorraad?")) return;
    
    const r = receptenDB.find(x => x.id === receptId);
    if(!r) return;
    
    const factor = personenMeegekookt / r.standaardPersonen;
    let totaleGerechtKosten = 0;
    
    if(window.voorraadDB) {
        r.ingredienten.forEach(ingRef => {
            let benodigd = ingRef.aantal * factor;
            let vItems = window.voorraadDB.filter(v => v.ingId === ingRef.ingId && !v.isKliekje);
            
            const dbIng = ingredientenDB.find(i => i.id === ingRef.ingId);
            if (dbIng && dbIng.verpAantal && dbIng.verpPrijs) {
                totaleGerechtKosten += benodigd * (dbIng.verpPrijs / dbIng.verpAantal);
            }

            for(let i=0; i<vItems.length; i++) {
                if (benodigd <= 0) break;
                let af = Math.min(vItems[i].aantal, benodigd);
                vItems[i].aantal -= af;
                benodigd -= af;
            }
        });
        window.voorraadDB = window.voorraadDB.filter(v => v.aantal > 0);
        localStorage.setItem('avondeet_voorraad', JSON.stringify(window.voorraadDB));
    }

    window.laatstGekooktReceptNaam = r.naam;
    window.laatstGekookteKostenPerPortie = personenMeegekookt > 0 ? (totaleGerechtKosten / personenMeegekookt) : 0;

    const modal = document.getElementById('kliekje-modal');
    if(modal) {
        document.getElementById('kliekje-modal-desc').innerText = `Je hebt zojuist ${r.naam} gekookt.`;
        document.getElementById('modal-kliekje-aantal').value = '';
        modal.style.display = 'flex';
    }
};