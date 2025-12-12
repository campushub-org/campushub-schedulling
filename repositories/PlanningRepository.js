const mysql = require('mysql2/promise');

// Configuration de la connexion à la base de données
// NOTE: Ces valeurs doivent être lues depuis votre Config Server, mais nous les mettons ici en dur pour le test local rapide.
const dbConfig = {
    host: 'localhost',      // Ou l'IP de votre serveur MySQL
    user: 'campushub_user',           // VOTRE NOM D'UTILISATEUR
    password: 'votre_mot_de_passe_secret',       // VOTRE MOT DE PASSE
    database: 'scheduling_db' // Nom de la base de données spécifique au Planning
};

// =================================================================
// NOTE: Le service PlanningService DOIT créer le pool au démarrage.
// Nous allons simuler la création du pool ici pour simplifier.
// =================================================================
let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log("✔ Repository: Pool de connexion MySQL créé.");
} catch (error) {
    console.error("❌ Repository: Échec de la création du pool MySQL:", error.message);
}


/**
 * @description Sauvegarde l'emploi du temps généré dans la base de données.
 * @param {object} planningData Les données structurées de l'emploi du temps à insérer.
 */
async function savePlanning(planningData) {
    // 1. Déstructuration des données
    const { filiereId, semestre, anneeAcademique, planningJson } = planningData;

    // 2. Requête SQL d'insertion
    const sql = `
        INSERT INTO emplois_du_temps (filiere_id, semestre, annee_academique, planning_json, date_generation)
        VALUES (?, ?, ?, ?, NOW())
    `;

    // Le planningJson est un objet complexe, il doit être stocké en JSON stringifié.
    const values = [
        filiereId,
        semestre,
        anneeAcademique,
        JSON.stringify(planningJson)
    ];

    try {
        const [result] = await pool.execute(sql, values);
        console.log(`[REPOSITORY] Planning sauvegardé avec succès. ID: ${result.insertId}`);
        return { success: true, id: result.insertId };
    } catch (error) {
        console.error("❌ Erreur MySQL lors de la sauvegarde du planning:", error.message);
        throw new Error("Erreur de persistance du planning.");
    }
}

/**
 * @description Récupère un emploi du temps par ID ou par critères.
 */
async function getPlanningByCriteria({ filiereId, semestre }) {
    const [rows] = await pool.execute(
        "SELECT * FROM emplois_du_temps WHERE filiere_id = ? AND semestre = ? ORDER BY date_generation DESC LIMIT 1",
        [filiereId, semestre]
    );

    if (rows.length === 0) {
        return null;
    }

    // Le client 'mysql2/promise' détecte automatiquement les colonnes de type JSON
    // et les convertit en objet JavaScript.
    // L'appel précédent à JSON.parse() n'est donc plus nécessaire (et provoquait l'erreur).
    // LIGNE CORRIGÉE : suppression du JSON.parse()
    // rows[0].planning_json = JSON.parse(rows[0].planning_json); 

    return rows[0];
}

module.exports = {
    savePlanning,
    getPlanningByCriteria
};