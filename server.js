const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuração OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Define o Refresh Token para renovar o Access Token
oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});

// Função para atualizar o Access Token
async function getNewAccessToken() {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials); // Atualiza credenciais
    console.log('Novo Access Token:', credentials.access_token);
  } catch (error) {
    console.error('Erro ao renovar Access Token:', error);
  }
}

// Middleware para garantir que o Access Token esteja atualizado
app.use(async (req, res, next) => {
  await getNewAccessToken();
  next();
});

// Inicializa o Google Sheets
const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

// Rota para exibir os dados da planilha "Semijoias" na aba "Clientes"
app.get('/clientes', async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Clientes!A2:F',
    });

    res.json({
      message: 'Dados carregados com sucesso!',
      data: response.data.values,
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

