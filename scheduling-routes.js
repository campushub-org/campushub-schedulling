const express = require('express');
const router = express.Router();

// Correction du chemin d'accès au contrôleur :
// Si schedulerController.js est dans le dossier 'controllers'
const schedulerController = require('./controllers/schedulerController');

// Définition de la route POST pour déclencher l'algorithme
router.post('/generate-timetable', schedulerController.generatePlanning);

// [POST] Route pour la CRÉATION (Déclenchement de l'algorithme)
router.post('/generate-timetable', schedulerController.generatePlanning);

// [GET] Route pour la CONSULTATION (Récupération du dernier planning généré)
// L'URL complète sera : /api/v1/scheduling/plannings?filiere=GL&semestre=S1
router.get('/plannings', schedulerController.getPlanningByCriteria); // <-- AJOUTER CETTE LIGNE
module.exports = router;