const express = require('express');
const { google } = require('googleapis');

// Inicializar o Express
const app = express();
const port = process.env.PORT || 3000;  // Use a variável de ambiente PORT para rodar no Vercel

// Middleware para lidar com JSON
app.use(express.json());

// Rota para a raiz
app.get('/', (req, res) => {
  res.send('Servidor funcionando corretamente!');
});

// Rota para adicionar um cliente
app.post('/adicionar-cliente', async (req, res) => {
  const { nome, cpf, telefone, email, endereco, observacoes } = req.body;

  // Configuração do OAuth2 para autenticação com o Google
  const oAuth2Client = new google.auth.OAuth2(
    'SEU_CLIENT_ID',
    'SEU_CLIENT_SECRET',
    'SEU_REDIRECT_URI'
  );

  // Defina o token de autenticação previamente obtido (você deve obter isso via OAuth2)
  oAuth2Client.setCredentials({ access_token: 'SEU_ACCESS_TOKEN' });

  // Acessar a API do Google Sheets
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

  // Definir os dados que você deseja adicionar na planilha
  const values = [
    [
      nome,
      cpf,
      telefone,
      email,
      endereco,
      observacoes,
    ],
  ];

  // Adicionar na planilha
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: 'SEU_SPREADSHEET_ID',
      range: 'Clientes!A2:F', // Substitua com o intervalo correto
      valueInputOption: 'RAW',
      resource: {
        values,
      },
    });

    res.status(200).json({ message: 'Cliente adicionado com sucesso!', response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao adicionar cliente', error });
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
