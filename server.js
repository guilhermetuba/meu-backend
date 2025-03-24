const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config(); // Carregar variáveis de ambiente
const app = express();
const port = process.env.PORT || 3000;

// Configurar cliente OAuth2 com variáveis de ambiente
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

// Defina o token de autenticação previamente obtido (via OAuth2)
oauth2Client.setCredentials({ access_token: process.env.GOOGLE_ACCESS_TOKEN });

// Inicializa o cliente do Google Sheets
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

// Rota para exibir os dados da planilha "Semijoias" na aba "Clientes"
app.get('/clientes', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '1-r5uYv0yTB3__2rrHNLiosd2mFHHCdJAjwMdvxUKXRQ', // Substitua pelo ID da sua planilha
      range: 'Clientes!A2:F', // Intervalo da aba "Clientes" (ajuste conforme necessário)
    });

    // Enviar os dados da planilha como resposta
    res.json({
      message: 'Dados carregados com sucesso!',
      data: response.data.values, // Exibindo os dados da planilha
    });
  } catch (error) {
    console.error('Erro ao acessar o Google Sheets:', error);
    res.status(500).json({
      message: 'Erro ao acessar a planilha',
      error: error.message,
    });
  }
});

// Rota inicial
app.get('/', (req, res) => {
  res.send('Servidor funcionando corretamente!');
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
