const express = require("express");
const loadConfig = require("./config");
const { Eureka } = require("eureka-js-client");
const os = require("os");
// Assurez-vous que ce chemin est correct :
const schedulingRouter = require('./scheduling-routes');

// =================================================================
// 1. Démarrage de l'Application et Chargement de la Configuration
// =================================================================
loadConfig().then(config => {

  // =================================================================
  // 2. Initialisation des Variables Critiques (Override local)
  // =================================================================
  // Valeur locale forcée pour l'override du Config Server (résout le conflit 808)
  const PORT = 8880;
  const SERVICE_NAME = config["spring.application.name"] || "campushub-scheduling";

  // =================================================================
  // 3. Initialisation du Serveur Express et Middlewares
  // =================================================================
  const app = express();
  app.use(express.json()); // Middleware pour parser le corps des requêtes en JSON

  // =================================================================
  // 4. Définition des Routes
  // =================================================================

  // A. Endpoint de Santé (Health Check) - Doit être exposé directement
  app.get("/health", (req, res) => {
    res.json({
      service: SERVICE_NAME,
      status: "UP",
      configLoaded: true
    });
  });

  // B. Routes spécifiques au Service Scheduling
  // Tous les endpoints du fichier 'scheduling-routes' sont mappés sous ce préfixe.
  app.use('/api/v1/scheduling', schedulingRouter);


  // =================================================================
  // 5. Lancement du Serveur (Binding du port)
  // =================================================================
  app.listen(PORT, () => {
    console.log(`✔ ${SERVICE_NAME} est lancé sur le port ${PORT}`);
  });


  // =================================================================
  // 6. Enregistrement dans Eureka (Service Externe)
  // =================================================================
  const hostName = os.hostname();

  const eurekaClient = new Eureka({
    instance: {
      app: SERVICE_NAME,
      instanceId: `${SERVICE_NAME}-${hostName}-${PORT}`,
      hostName: hostName,
      ipAddr: SERVICE_NAME, // Nom du service dans Docker Compose
      vipAddress: SERVICE_NAME,
      statusPageUrl: `http://${SERVICE_NAME}:${PORT}/health`,
      port: {
        "$": PORT,
        "@enabled": true
      },
      dataCenterInfo: {
        "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
        name: "MyOwn"
      }
    },
    eureka: {
      host: "localhost", // Nom du service Eureka
      port: 8761,
      servicePath: "/eureka/apps/"
    }
  });

  eurekaClient.start((err) => {
    if (err) {
      console.error("❌ Erreur enregistrement Eureka :", err);
    } else {
      console.log(`✔ ${SERVICE_NAME} enregistré dans Eureka 👌`);
    }
  });

});