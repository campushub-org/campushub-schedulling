const axios = require('axios');

// URLs des services (à ajuster selon votre configuration Eureka)
const EXAMEN_SERVICE_URL = 'http://campushub-examen';
const SALLE_SERVICE_URL = 'http://campushub-salle';


/**
 * @description Récupère les examens/cours à planifier pour un semestre donné.
 * VRAI appel HTTP vers le Service Examen (ou Support), avec données de secours.
 */
async function getExamensToPlan(filiereId, semestre, type) {
    console.log(`[RESOURCE_REPO] Appel HTTP: Récupération des ${type} depuis ${EXAMEN_SERVICE_URL}...`);
    try {
        const response = await axios.get(`${EXAMEN_SERVICE_URL}/api/v1/exams/to-plan`, {
            params: { filiere: filiereId, semestre: semestre, type: type }
        });

        if (!response.data || response.data.length === 0) {
            console.warn(`Aucun élément de type ${type} trouvé.`);
            return [];
        }
        return response.data;

    } catch (error) {
        console.error(`❌ Échec de l'appel au Service Examen/Support: ${error.message}. Utilisation des données de secours.`);

        // Données de Secours (FALLBACK)
        return [
            { id: 1, type: type, filiere_id: filiereId, code_matiere: 'GL301', duree: type === 'COURS' ? 180 : 120 },
            { id: 2, type: type, filiere_id: filiereId, code_matiere: 'MATH301', duree: type === 'COURS' ? 180 : 90 },
            { id: 3, type: type, filiere_id: filiereId, code_matiere: 'ARCH302', duree: type === 'COURS' ? 180 : 180 },
            { id: 4, type: type, filiere_id: filiereId, code_matiere: 'PROJ303', duree: type === 'COURS' ? 180 : 60 },
        ];
    }
}

/**
 * @description Récupère les salles disponibles.
 * VRAI appel HTTP vers le Service Salle.
 */
async function getSallesList() {
    console.log(`[RESOURCE_REPO] Appel HTTP: Récupération des salles depuis ${SALLE_SERVICE_URL}...`);
    try {
        const response = await axios.get(`${SALLE_SERVICE_URL}/api/v1/salles`);
        return response.data;
    } catch (error) {
        console.error(`❌ Échec de l'appel au Service Salle: ${error.message}. Utilisation des données de secours.`);
        // Données de Secours (FALLBACK)
        return [
            { nom: 'Amphi A1', capacite: 200, est_amphi: true },
            { nom: 'Amphi A2', capacite: 200, est_amphi: true },
            { nom: 'Salle B101', capacite: 50, est_amphi: false },
        ];
    }
}

/**
 * @description Détermine la taille estimée du groupe basée sur le semestre (Logique Métier Simplifiée).
 */
function getEffectifEstime(semestre) {
    const niveau = parseInt(semestre.replace('S', ''));
    if (niveau <= 2) return 150; // L1 / S1, S2
    if (niveau <= 4) return 100; // L2 / S3, S4
    return 50; // L3 et +
}

/**
 * @description Simule la récupération des indisponibilités des enseignants (FALLBACK).
 * Utilisé car le Service Utilisateur est hors service.
 */
function getEnseignantContraintesFallback() {
    console.warn("[RESOURCE_REPO] !!! ATTENTION: Utilisation des contraintes enseignants de FALLBACK (Service USER HS) !!!");

    // Contraintes rigides (Ex: Lundi 7h00-9h55, Mardi 10h05-12h55)
    return [
        { nom: 'Prof Dupont', indisponibilites: ['Lundi 07h00', 'Mardi 10h05', 'Mercredi 13h05'] },
        { nom: 'Prof Martin', indisponibilites: ['Jeudi 16h05', 'Vendredi 10h05'] },
    ];
}

module.exports = {
    getExamensToPlan,
    getSallesList,
    getEffectifEstime,
    getEnseignantContraintesFallback,
    // updateExamenSchedule n'est pas inclus ici car vous voulez vous concentrer sur les cours.
};