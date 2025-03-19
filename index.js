const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors()); // Libera o CORS para qualquer origem

const PORT = process.env.PORT || 3000;

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
