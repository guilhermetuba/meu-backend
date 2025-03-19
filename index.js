const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware para configurar manualmente os cabeçalhos CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    
    // Se for uma requisição OPTIONS (preflight), responde imediatamente
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// Rota para buscar dados do Google Sheets
app.get("/dados", async (req, res) => {
    try {
        const googleSheetsURL = "1-r5uYv0yTB3__2rrHNLiosd2mFHHCdJAjwMdvxUKXRQ"; // Substitua pela URL pública do Google Sheets
        const response = await axios.get(googleSheetsURL);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar dados" });
    }
});

// Inicia o servidor
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
