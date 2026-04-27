const PlanningRepository = require('../repositories/PlanningRepository');
const ResourceRepository = require('../repositories/ResourceRepository');
const axios = require('axios');

// Définition des heures de début des créneaux officiels (Durée ~2h55)
const CRENEAUX_DEBUT = [
    '07h00',
    '10h05',
    '13h05',
    '16h05',
    '19h05' // Le dernier créneau
];


// =====================================================================
// FONCTION DE LOGIQUE SPÉCIALISÉE : GENERATION DES COURS
// =====================================================================

async function generateCours({ filiereId, semestre }) {
    console.log("[ALGO] Exécution DYNAMIQUE de la planification des COURS (Async)...");

    // 1. Récupération des Données d'Entrée
    const uesACours = await ResourceRepository.getExamensToPlan(filiereId, semestre, 'COURS');
    const salles = await ResourceRepository.getSallesList();
    const effectif = ResourceRepository.getEffectifEstime(semestre);
    const contraintesProfs = ResourceRepository.getEnseignantContraintesFallback(); // Utilisation du Fallback

    let creneaux = [];
    let joursDisponibles = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

    // Variables de suivi pour le placement séquentiel
    let jourIndex = 0;
    let creneauIndex = 0;

    // 1b. Trouver la salle principale adéquate (Application de la contrainte d'effectif)
    const sallePrincipale = salles.find(s => s.capacite >= effectif);

    if (!sallePrincipale) {
        throw new Error("Impossible de trouver une salle de capacité suffisante pour les cours.");
    }

    // Pour la démo, associons des profs pour tester les contraintes (même si l'ID prof est simulé)
    const profs = ['Prof Dupont', 'Prof Martin', 'Prof Tertius', 'Prof Quartus', 'Prof Quintus', 'Prof Sextus'];

    // 2. Logique de Placement Séquentiel avec Contrainte Professeur

    for (let i = 0; i < uesACours.length; i++) {
        const matiere = uesACours[i];
        const enseignant = profs[i % profs.length]; // Affectation cyclique du prof

        let placementReussi = false;

        // Tentative de placement : parcours des jours disponibles
        while (jourIndex < joursDisponibles.length && !placementReussi) {

            let jour = joursDisponibles[jourIndex];

            // Si tous les créneaux de la journée sont épuisés, on passe au jour suivant
            if (creneauIndex >= CRENEAUX_DEBUT.length) {
                jourIndex++;
                creneauIndex = 0;
                // Si on a épuisé la semaine, on sort du while
                if (jourIndex >= joursDisponibles.length) break;
                jour = joursDisponibles[jourIndex]; // Nouveau jour
            }

            let heureDebut = CRENEAUX_DEBUT[creneauIndex];
            let creneauComplet = `${jour} ${heureDebut}`;

            // 🛑 VÉRIFICATION DE LA CONTRAINTE ENSEIGNANT (FALLBACK)
            const contrainteProf = contraintesProfs.find(c => c.nom === enseignant);
            let estIndisponible = false;

            if (contrainteProf && contrainteProf.indisponibilites.includes(creneauComplet)) {
                estIndisponible = true;
            }

            if (!estIndisponible) {
                // Affectation réussie
                creneaux.push({
                    jour: jour,
                    heure: heureDebut,
                    matiere: matiere.code_matiere,
                    salle: sallePrincipale.nom,
                    professeur: enseignant // Pour la validation
                });
                placementReussi = true;
            }

            // Quoi qu'il arrive (conflit ou non), on avance au créneau suivant
            creneauIndex++;
        }

        if (!placementReussi) {
            console.warn(`ALGO: Impossible de planifier la matière ${matiere.code_matiere} (Aucun créneau libre).`);
        }
    }

    return {
        meta: { type: 'COURS', dureeExecutionMs: 100 + creneaux.length * 50 },
        creneaux: creneaux
    };
}


// =====================================================================
// AUTRES FONCTIONS (Assurées asynchrones, restent inchangées ou simplifiées)
// =====================================================================

// Note: La fonction trouverCreneauDisponible est omise ici pour la concision, mais elle doit être ASYNCHRONE 
// si elle contient des appels à des repos (comme dans les versions précédentes pour SN/CC).

async function generateCC({ filiereId, semestre }) {
    console.log("[ALGO] Exécution DYNAMIQUE de la planification des CC (Async)...");
    const examens = await ResourceRepository.getExamensToPlan(filiereId, semestre, 'CC');
    const salles = await ResourceRepository.getSallesList();
    const effectif = ResourceRepository.getEffectifEstime(semestre);
    // ... (Logique CC simplifiée) ...
    return { meta: { type: 'CC' }, controles_continus: examens.map(e => ({ ...e, date: '2026-03-01', salle: 'Amphi A1' })) };
}

async function generateSN({ filiereId, semestre }) {
    console.log("[ALGO] Exécution DYNAMIQUE de la planification des SN (Async)...");
    const examens = await ResourceRepository.getExamensToPlan(filiereId, semestre, 'SN');
    const salles = await ResourceRepository.getSallesList();
    const effectif = ResourceRepository.getEffectifEstime(semestre);
    // ... (Logique SN simplifiée) ...
    return { meta: { type: 'SN' }, examens: examens.map(e => ({ ...e, date: '2026-03-15', salle: 'Amphi A1' })) };
}

async function runAlgorithm({ filiereId, semestre, anneeAcademique, type }) {

    if (!['COURS', 'CC', 'SN'].includes(type)) {
        throw new Error(`Type de planification non valide: ${type}. Doit être COURS, CC ou SN.`);
    }

    let resultatPlanning;

    switch (type) {
        case 'COURS':
            resultatPlanning = await generateCours({ filiereId, semestre, anneeAcademique });
            break;
        case 'CC':
            resultatPlanning = await generateCC({ filiereId, semestre, anneeAcademique });
            break;
        case 'SN':
            resultatPlanning = await generateSN({ filiereId, semestre, anneeAcademique });
            break;
        default:
            throw new Error("Logique de planification inconnue.");
    }

    const dataToSave = { filiereId, semestre, anneeAcademique, planningJson: resultatPlanning };
    const savedResult = await PlanningRepository.savePlanning(dataToSave, type);

    return {
        id: savedResult.id,
        type: type,
        status: "GENERATED_AND_SAVED",
        planning: resultatPlanning
    };
}

async function getLatestPlanning({ filiereId, semestre, type }) {
    return await PlanningRepository.getPlanningByCriteria({ filiereId, semestre, typePlanning: type });
}

module.exports = {
    runAlgorithm,
    getLatestPlanning,
    generateCours, // Exporté pour faciliter les tests unitaires
};


// Ajouter cette fonction
async function getAllPlannings() {
    return await PlanningRepository.getAllPlannings();
  }
  
  // Ajouter dans module.exports
  module.exports = {
    runAlgorithm,
    getLatestPlanning,
    getAllPlannings,  // ← AJOUT
    generateCours,
  };