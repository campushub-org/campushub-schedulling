const planningService = require('../services/PlanningService');

/**
 * @description Déclenche l'algorithme de génération de l'emploi du temps, en fonction du type.
 */
async function generatePlanning(req, res) {
    console.log("-> Requête de génération de planning reçue.");

    try {
        const params = req.body;
        // Lecture du paramètre de type de planning depuis le corps de la requête
        const type = params.type ? params.type.toUpperCase() : null;

        if (!params.filiereId || !params.semestre || !type) {
            return res.status(400).json({ error: "Les paramètres filiereId, semestre et le type de planning (type: COURS, CC, SN) sont requis." });
        }

        // 2. Appel de la LOGIQUE MÉTIER avec le type
        const resultat = await planningService.runAlgorithm({
            ...params,
            type: type // Transmission du type
        });

        // 3. Réponse au client
        res.status(200).json({
            message: `Planification de type ${type} exécutée avec succès.`,
            resultat: resultat
        });

    } catch (error) {
        console.error("❌ Erreur critique lors de la génération du planning:", error.message);
        res.status(500).json({
            error: "Échec de la génération du planning.",
            details: error.message
        });
    }
}

/**
 * @description Récupère le dernier emploi du temps généré pour une filière/semestre/TYPE.
 */
async function getPlanningByCriteria(req, res) {
    console.log("-> Requête de consultation de planning reçue.");

    try {
        // Lecture des critères dans l'URL (req.query)
        const { filiere, semestre, type } = req.query;

        if (!filiere || !semestre || !type) {
            return res.status(400).json({ error: "Les paramètres 'filiere', 'semestre' et 'type' sont requis pour la consultation." });
        }

        const planning = await planningService.getLatestPlanning({
            filiereId: filiere,
            semestre: semestre,
            type: type.toUpperCase() // Transmission du type
        });

        if (!planning) {
            return res.status(404).json({ message: `Aucun planning de type ${type.toUpperCase()} trouvé pour la filière ${filiere}/${semestre}.` });
        }

        res.status(200).json(planning);

    } catch (error) {
        console.error("❌ Erreur lors de la consultation du planning:", error.message);
        res.status(500).json({ error: "Échec de la consultation de la base de données." });
    }
}

module.exports = {
    generatePlanning,
    getPlanningByCriteria
};