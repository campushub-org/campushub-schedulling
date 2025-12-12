// Le chemin est corrigé : remonte d'un niveau (..), puis descend dans 'services'
const planningService = require('../services/PlanningService');

/**
 * @description Déclenche l'algorithme de génération de l'emploi du temps.
 */
async function generatePlanning(req, res) {
    console.log("-> Requête de génération de planning reçue.");

    try {
        const params = req.body;

        if (!params.filiereId || !params.semestre) {
            return res.status(400).json({ error: "Les paramètres filiereId et semestre sont requis." });
        }

        // 2. Appel de la LOGIQUE MÉTIER
        const resultat = await planningService.runAlgorithm(params);

        // 3. Réponse au client
        res.status(200).json({
            message: "Planification exécutée avec succès.",
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
 * @description Récupère le dernier emploi du temps généré pour une filière/semestre.
 * Les critères sont lus depuis les Query Parameters (req.query).
 */
async function getPlanningByCriteria(req, res) {
    console.log("-> Requête de consultation de planning reçue.");

    try {
        // Lecture des critères dans l'URL (ex: /plannings?filiere=GL&semestre=S1)
        const { filiere, semestre } = req.query;

        if (!filiere || !semestre) {
            return res.status(400).json({ error: "Les paramètres 'filiere' et 'semestre' sont requis dans l'URL pour la consultation." });
        }

        // Appel du service pour récupérer les données
        const planning = await planningService.getLatestPlanning({ filiereId: filiere, semestre: semestre });

        if (!planning) {
            return res.status(404).json({ message: `Aucun planning trouvé pour la filière ${filiere}/${semestre}.` });
        }

        // Succès : retourne les données de l'emploi du temps
        res.status(200).json(planning);

    } catch (error) {
        console.error("❌ Erreur lors de la consultation du planning:", error.message);
        res.status(500).json({ error: "Échec de la consultation de la base de données." });
    }
}

module.exports = {
    generatePlanning,
    getPlanningByCriteria // <-- EXPORT DE LA NOUVELLE FONCTION
};