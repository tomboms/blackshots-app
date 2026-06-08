// --- DATA.JS: GLOBALE VARIABELEN & DATABASE INITIALISATIE ---

// 1. Hoofd databases
var receptenDB = JSON.parse(localStorage.getItem('avondeet_recepten')) || [];
var weekPlanning = JSON.parse(localStorage.getItem('avondeet_planning')) || {}; 
var handmatigeBoodschappen = JSON.parse(localStorage.getItem('avondeet_handmatig')) || [];
var ingredientenDB = JSON.parse(localStorage.getItem('avondeet_ingredienten')) || [];
var extraDBItems = JSON.parse(localStorage.getItem('avondeet_extra_db_items')) || [];

// 2. Instellingen
var appInstellingen = JSON.parse(localStorage.getItem('avondeet_instellingen')) || { personen: 2, darkMode: true, toonOntbijt: true, toonLunch: true };

// 3. Lijsten en Categorieën
var eenhedenLijst = JSON.parse(localStorage.getItem('avondeet_eenheden')) || ["gram", "ml", "stuks", "potje", "fles", "blik", "pak", "zak", "teen", "theelepel", "eetlepel", "snufje"];
var categorieLijst = JSON.parse(localStorage.getItem('avondeet_categorieen')) || ["Zuivel", "Groente & Fruit", "Vlees, Kip & Vis", "Voorraad", "Brood & Ontbijt", "Smaakmakers", "Huishouden & Non-food", "Kruiden", "Sauzen", "Frisdrank", "alcolholishe drank", "Wijn / Mix", "Wereld Keuken", "Pasta & Rijst", "Chips", "Snoep", "Koek", "Thee & koffie", "Diepvries", "Kant en Klaar", "Borralhap", "afbak Brood"];
var statussenLijst = JSON.parse(localStorage.getItem('avondeet_statussen')) || ["Later bepalen", "Bij ouders", "Kliekjes eten", "Werk", "Uit eten", "Bestellen"];
var gezinsLijst = JSON.parse(localStorage.getItem('avondeet_gezin')) || ["Tom", "Ike"];
var apparatuurLijst = JSON.parse(localStorage.getItem('avondeet_apparatuur')) || ["Oven", "Airfryer", "Magnetron", "Inductie", "Wokpan", "Kookpan"];
var winkelLijst = JSON.parse(localStorage.getItem('avondeet_winkels')) || ["Albert Heijn", "Jumbo", "Aldi", "Lidl", "Plus", "Markt"];

var winkelsLijst = winkelLijst; // Nood-vangnet voor bepaalde functies