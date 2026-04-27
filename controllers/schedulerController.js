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

// ─────────────────────────────────────────────
// Correspondances pour la transformation
// ─────────────────────────────────────────────
const JOUR_TO_INDEX = {
    'Lundi': 0, 'Mardi': 1, 'Mercredi': 2, 'Jeudi': 3, 'Vendredi': 4
  };
  
  const TYPE_MAP = {
    'COURS': 'lecture',
    'CC':    'exam',
    'SN':    'exam',
    'TD':    'td',
    'TP':    'tp'
  };
  
  /**
   * Convertit un créneau du format backend vers le format attendu par le frontend.
   */
  function transformCreneau(creneau, index, typePlanning) {
    // Conversion du format d'heure : "07h00" → "07:00"
    const startTime = creneau.heure.replace('h', ':');
  
    // Calcul de l'heure de fin selon la durée (2h55 par défaut)
    const [startH, startM] = startTime.split(':').map(Number);
    const durationMinutes = creneau.duree || 175; // 2h55 = 175 min par défaut
    const endTotalMinutes = startH * 60 + startM + durationMinutes;
    const endH = Math.floor(endTotalMinutes / 60);
    const endM = endTotalMinutes % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  
    return {
      id:         `${typePlanning}-${index}-${creneau.matiere}`,
      title:      creneau.matiere,
      type:       TYPE_MAP[typePlanning] || 'lecture',
      professor:  creneau.professeur,
      room:       creneau.salle,
      startTime:  startTime,
      endTime:    endTime,
      day:        JOUR_TO_INDEX[creneau.jour] ?? 0,
      niveau:     creneau.niveau    || null,
      semester:   creneau.semestre  || null,
    };
  }
  
  /**
   * @description Récupère l'intégralité des créneaux et les retourne
   * dans un format directement exploitable par le frontend.
   */
  async function getAllEvents(req, res) {
    console.log("-> Requête de récupération globale des événements reçue.");
    try {
      const rows = await planningService.getAllPlannings();
  
      if (!rows || rows.length === 0) {
        return res.status(200).json([]);
      }
  
      // Transformation de chaque planning en événements frontend
      const allEvents = [];
      for (const row of rows) {
        const planningJson = row.planning_json;
        const creneaux = planningJson.creneaux || [];
        const typePlanning = row.type_planning || 'COURS';
  
        creneaux.forEach((creneau, index) => {
          allEvents.push(transformCreneau(creneau, index, typePlanning));
        });
      }
  
      res.status(200).json(allEvents);
  
    } catch (error) {
      console.error("❌ Erreur lors de la récupération globale:", error.message);
      res.status(500).json({ error: "Échec de la récupération des événements." });
    }
  }
  
  // Ajouter getAllEvents dans le module.exports
  module.exports = {
    generatePlanning,
    getPlanningByCriteria,
    getAllEvents  // ← AJOUT
  };