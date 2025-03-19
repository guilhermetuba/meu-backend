const express = require('express');
const app = express();

// Middleware para CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

// Rota para a API
app.get('/dados', (req, res) => {
    res.json({ message: "Dados do servidor" });
});

module.exports = app;
