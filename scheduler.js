// scheduler.js
const fetch = require('node-fetch');

// ----------------------------------------------------------------------
// I. CONFIGURATION DES ENDPOINTS & MOCK DATA
// ----------------------------------------------------------------------

const BASE_URL_SUPPORT = 'http://localhost:8080';
const BASE_URL_SALLE = 'http://localhost:8082';

const ENDPOINTS = {
    SUPPORTS: `${BASE_URL_SUPPORT}/api/supports`,
    SALLES: `${BASE_URL_SALLE}/api/salles`,
    DISPONIBILITES_SALLES: `${BASE_URL_SALLE}/api/disponibilites`,
    SAVE_PLANNING: `${BASE_URL_SALLE}/api/planning/save`
};

// ** DONNÉES SIMULÉES (MOCK) POUR LES PROFESSEURS **
// Cette structure remplace l'appel au Service Utilisateurs non fonctionnel.
const ENSEIGNANTS_MOCK_DATA = [
    {
        id: 1,
        nom: "Dr. Njiki",
        disponibilites: [
            { "jour": "LUNDI", "heureDebut": "08:00", "heureFin": "12:00" }, // 8h-12h
            { "jour": "MARDI", "heureDebut": "14:00", "heureFin": "17:00" }, // 14h-17h
            { "jour": "MERCREDI", "heureDebut": "08:00", "heureFin": "18:00" }
        ]
    },
    {
        id: 2,
        nom: "Pr. Sado",
        disponibilites: [
            { "jour": "JEUDI", "heureDebut": "09:00", "heureFin": "17:00" },
            { "jour": "VENDREDI", "heureDebut": "08:00", "heureFin": "12:00" }
        ]
    },
    {
        id: 3,
        nom: "Mme. Viviane",
        disponibilites: [
            { "jour": "LUNDI", "heureDebut": "14:00", "heureFin": "18:00" },
            { "jour": "MERCREDI", "heureDebut": "14:00", "heureFin": "17:00" },
            { "jour": "VENDREDI", "heureDebut": "14:00", "heureFin": "17:00" }
        ]
    }
];

// Créneaux horaires standard pour l'ordonnancement (durée de 2 heures)
const CRENEAUX_HORAIRES = [
    { debut: "08:00", fin: "10:00" },
    { debut: "10:00", fin: "12:00" },
    { debut: "14:00", fin: "16:00" },
    { debut: "16:00", fin: "18:00" }
];

const JOURS_SEMAINE = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

// ----------------------------------------------------------------------
// II. FONCTIONS UTILITAIRES DE TEMPS
// ----------------------------------------------------------------------

/** Convertit une heure "HH:mm" en minutes depuis minuit. */
function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/** Vérifie si un créneau requis chevauche une disponibilité du professeur. */
function isProfAvailable(prof, jour, heureDebut, heureFin) {
    const startMinutes = timeToMinutes(heureDebut);
    const endMinutes = timeToMinutes(heureFin);

    // Cherche un créneau de disponibilité du professeur qui contient le créneau requis
    return prof.disponibilites.some(disp => {
        if (disp.jour !== jour) return false;

        const dispStart = timeToMinutes(disp.heureDebut);
        const dispEnd = timeToMinutes(disp.heureFin);

        // La disponibilité du prof doit commencer avant ou à l'heure du cours
        // ET se terminer après ou à l'heure du cours
        return dispStart <= startMinutes && dispEnd >= endMinutes;
    });
}

// ----------------------------------------------------------------------
// III. COEUR DE L'ALGORITHME D'ORDONNANCEMENT
// ----------------------------------------------------------------------

/** Fonction principale d'orchestration */
async function genererEmploisDuTemps() {
    console.log("🚀 Initialisation de l'algorithme d'ordonnancement...");

    // Structure pour suivre l'occupation
    const planningGlobal = [];
    const salleOccupation = {}; // { idSalle: { jour: [slot1, slot2], ... } }
    const profOccupation = {}; // { idProf: { jour: [slot1, slot2], ... } }

    try {
        // 1. Collecte des données primaires
        const supports = await fetchData(ENDPOINTS.SUPPORTS, "Supports (Matières)");
        const salles = await fetchData(ENDPOINTS.SALLES, "Salles");
        const indisponibilitesSalles = await fetchData(ENDPOINTS.DISPONIBILITES_SALLES, "Indisponibilités Salles");

        if (!supports.length || !salles.length) {
            throw new Error("Données de base insuffisantes. Veuillez vérifier les services Support et Salle.");
        }

        console.log(`✅ ${supports.length} matières, ${salles.length} salles et ${ENSEIGNANTS_MOCK_DATA.length} professeurs (simulés) chargés.`);

        // 2. Préparation des données d'occupation
        const sallesDisponiblesMap = prepareSalleAvailability(salles, indisponibilitesSalles);

        // 3. Boucle d'ordonnancement (Algorithme Glouton)
        for (const support of supports) {
            let scheduled = false;

            // Logique de recherche du professeur (utilisant une affectation cyclique ou simple pour ce mock)
            const profIndex = (support.id % ENSEIGNANTS_MOCK_DATA.length);
            const prof = ENSEIGNANTS_MOCK_DATA[profIndex];

            console.log(`\n🔍 Tentative d'ordonnancement pour: ${support.intitule} (besoin: ${support.nombreEtudiants} places, ${support.heuresCours} heures)`);

            // Tant qu'il reste des heures à planifier pour ce support
            for (let remainingHours = support.heuresCours; remainingHours > 0; remainingHours -= 2) {
                if (remainingHours <= 0) break;

                let slotFound = false;

                // 4. Itération sur tous les créneaux Jour/Heure possibles
                for (const jour of JOURS_SEMAINE) {
                    for (const creneau of CRENEAUX_HORAIRES) {

                        // a) Vérification de la disponibilité du professeur
                        if (!isProfAvailable(prof, jour, creneau.debut, creneau.fin)) {
                            continue;
                        }

                        // b) Vérification de l'occupation actuelle du professeur
                        const profKey = prof.id;
                        const profIsBusy = (profOccupation[profKey] && profOccupation[profKey][jour] &&
                            profOccupation[profKey][jour].includes(`${creneau.debut}-${creneau.fin}`));
                        if (profIsBusy) {
                            continue;
                        }

                        // c) Recherche d'une salle compatible
                        const salle = salles.find(salle => {
                            // Vérifie la capacité de la salle
                            const capacityMatch = salle.capacite >= support.nombreEtudiants;
                            if (!capacityMatch) return false;

                            // Vérifie la disponibilité statutaire de la salle (maintenance, etc.)
                            const salleKey = salle.id;
                            const statutairementDisponible = sallesDisponiblesMap[salleKey][jour].isAvailable;
                            if (!statutairementDisponible) return false;

                            // Vérifie l'occupation actuelle de la salle
                            const salleIsBusy = (salleOccupation[salleKey] && salleOccupation[salleKey][jour] &&
                                salleOccupation[salleKey][jour].includes(`${creneau.debut}-${creneau.fin}`));

                            return !salleIsBusy;
                        });

                        if (salle) {
                            // ** Solution valide trouvée : Enregistrement **
                            const event = {
                                supportId: support.id,
                                intitule: support.intitule,
                                professeur: prof.nom,
                                salleId: salle.id,
                                salleNom: salle.nom,
                                jour: jour,
                                heureDebut: creneau.debut,
                                heureFin: creneau.fin
                            };

                            planningGlobal.push(event);

                            // Mise à jour des structures d'occupation
                            const slot = `${creneau.debut}-${creneau.fin}`;

                            salleOccupation[salle.id] = salleOccupation[salle.id] || {};
                            salleOccupation[salle.id][jour] = salleOccupation[salle.id][jour] || [];
                            salleOccupation[salle.id][jour].push(slot);

                            profOccupation[profKey] = profOccupation[profKey] || {};
                            profOccupation[profKey][jour] = profOccupation[profKey][jour] || [];
                            profOccupation[profKey][jour].push(slot);

                            slotFound = true;
                            scheduled = true;
                            console.log(`   --> Planifié : ${jour} de ${creneau.debut} à ${creneau.fin} en Salle ${salle.nom} (${salle.capacite} places) avec ${prof.nom}`);
                            break; // Passer au prochain créneau horaire du support
                        }
                    }
                    if (slotFound) break; // Passer au prochain jour du support
                }

                if (!slotFound) {
                    console.error(`   --> ❌ Échec de la planification pour ${support.intitule}. Contraintes trop restrictives ou heures épuisées.`);
                    break;
                }
            }
        }

        console.log(`\n🎉 Ordonnancement terminé. ${planningGlobal.length} événements générés.`);

        // 5. Post-traitement et Enregistrement
        if (planningGlobal.length > 0) {
            await postPlanning(planningGlobal);
        } else {
            console.log("Aucun événement à enregistrer.");
        }

    } catch (error) {
        console.error(`\n🛑 Erreur fatale dans l'ordonnancement: ${error.message}`);
    }
}

/** Utility pour le Fetch et le rapport d'erreur */
async function fetchData(url, name) {
    console.log(`\n⬇️ Récupération des ${name} via: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Échec de la récupération des ${name}. Statut: ${response.status}`);
    }
    return response.json();
}

/** Prépare la carte de disponibilité des salles */
function prepareSalleAvailability(salles, indisponibilitesSalles) {
    const map = {};
    salles.forEach(salle => {
        map[salle.id] = {};
        JOURS_SEMAINE.forEach(jour => {
            map[salle.id][jour] = { isAvailable: true };
        });
    });

    indisponibilitesSalles.forEach(indisp => {
        if (map[indisp.salleId] && map[indisp.salleId][indisp.jour]) {
            map[indisp.salleId][indisp.jour].isAvailable = false;
        }
    });
    return map;
}

/** Enregistrement du planning généré */
async function postPlanning(planning) {
    console.log(`\n⬆️ Enregistrement du planning généré (${planning.length} événements) sur ${ENDPOINTS.SAVE_PLANNING}`);

    const response = await fetch(ENDPOINTS.SAVE_PLANNING, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(planning)
    });

    if (response.ok) {
        const result = await response.text();
        console.log("✅ SUCCÈS: Le planning a été enregistré avec succès.");
        console.log("RÉPONSE DU SERVICE SALLE:", result);
    } else {
        const errorText = await response.text();
        console.error(`❌ ÉCHEC de l'enregistrement du planning. Statut: ${response.status}`);
        console.error("Détails de l'erreur:", errorText);
    }
}

// Lancement de l'exécution
genererEmploisDuTemps();