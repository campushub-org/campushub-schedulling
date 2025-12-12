# --- Image Node.js officielle ---
    FROM node:20

    # --- Crée un volume temporaire (similaire à /tmp en Java) ---
    VOLUME /tmp
    
    # --- Copie le package.json et package-lock.json pour installer les dépendances ---
    COPY package*.json ./
    
    # --- Installe les dépendances ---
    RUN npm install
    
    # --- Copie le reste du code dans le conteneur ---
    COPY . .
    
    # --- Expose le port de ton service (défini dans config) ---
    EXPOSE 8880
    
    # --- Commande pour lancer le service Node.js (server.js) ---
    ENTRYPOINT ["node", "server.js"]
    