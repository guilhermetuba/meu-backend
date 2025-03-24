const express = require('express');
const { google } = require('googleapis');

const app = express();

// Middleware para lidar com JSON
app.use(express.json());

// Rota para a raiz
app.get('/', (req, res) => {
  res.send('Servidor funcionando corretamente!');
});

// Rota para adicionar um cliente
app.post('/adicionar-cliente', async (req, res) => {
  const { nome, cpf, telefone, email, endereco, observacoes } = req.body;

  // A lógica para o Google Sheets vem aqui

  res.status(200).json({ message: 'Cliente adicionado com sucesso!' });
});

// Exporta o app para o Vercel
module.exports = app; // IMPORTANTE: Exporte o app para Vercel funcionar


