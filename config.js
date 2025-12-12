const axios = require("axios");

async function loadConfig() {
  // Remplace localhost par le nom du service Config dans docker-compose
  const url = "http://localhost:8888/campushub-scheduling/default";

  try {
    const response = await axios.get(url);
    let config = {};

    response.data.propertySources.forEach(src => {
      config = { ...config, ...src.source };
    });

    console.log("✔ Config chargée :", config);
    return config;

  } catch (err) {
    console.error("❌ Impossible de charger la config :", err.message);
    return {};
  }
}

module.exports = loadConfig;
