const express = require('express');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para lidar com JSON
app.use(express.json());

// Rota para a raiz
app.get('/', (req, res) => {
  res.send('Servidor funcionando corretamente!');
});

// Rota para adicionar um cliente
app.post('/adicionar-cliente', async (req, res) => {
  const { nome, cpf, telefone, email, endereco, observacoes } = req.body;

  // Aqui vai a lógica para interagir com o Google Sheets (se necessário)
  // Exemplo de resposta:
  res.status(200).json({ message: 'Cliente adicionado com sucesso!' });
});

// Iniciar o servidor (no Vercel, ele será tratado automaticamente)
module.exports = app; // Exporta a aplicação, pois Vercel usa funções serverless

