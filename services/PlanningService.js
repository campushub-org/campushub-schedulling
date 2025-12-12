// Import du nouveau Repository
const PlanningRepository = require('../repositories/PlanningRepository');

/**
 * @description Exécute l'algorithme de planification et persiste le résultat.
 */
async function runAlgorithm({ filiereId, semestre, anneeAcademique }) {

    // ... (SIMULATION DE L'ALGORITHME) ...

    console.log(`[SERVICE] Début de l'algorithme pour ${filiereId}-${semestre}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulation du résultat complexe de l'algorithme
    const resultatPlanningComplexe = {
        meta: { dureeExecutionMs: 2000, date: new Date() },
        creneaux: [
            { jour: 'Lundi', heure: '8h00', matiere: 'GL301', salle: 'A101' },
            { jour: 'Lundi', heure: '10h00', matiere: 'MATH301', salle: 'B205' },
        ]
    };

    // --- ÉTAPE CRITIQUE : SAUVEGARDE DU RÉSULTAT ---
    const dataToSave = {
        filiereId: filiereId,
        semestre: semestre,
        anneeAcademique: anneeAcademique,
        planningJson: resultatPlanningComplexe // L'objet complexe
    };

    const savedResult = await PlanningRepository.savePlanning(dataToSave);

    console.log(`[SERVICE] Algorithme terminé. Planning sauvegardé avec ID: ${savedResult.id}.`);

    return {
        id: savedResult.id,
        status: "GENERATED_AND_SAVED",
        planning: resultatPlanningComplexe
    };
}


/**
 * @description Récupère le dernier planning généré en appelant le Repository.
 */
async function getLatestPlanning({ filiereId, semestre }) {
    console.log(`[SERVICE] Consultation du dernier planning pour ${filiereId}/${semestre}...`);

    // Délégation au Repository
    return await PlanningRepository.getPlanningByCriteria({ filiereId, semestre });
}

module.exports = {
    runAlgorithm,
    getLatestPlanning // <-- EXPORT DE LA NOUVELLE FONCTION
};