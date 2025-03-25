export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    // Aqui fica o código que processa o cadastro...
    res.status(200).json({ message: "Cliente cadastrado com sucesso!" });
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}



const { google } = require('googleapis');
const bodyParser = require('body-parser');

// Função para autenticar com o Google Sheets API
async function authenticate() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  return sheets;
}

// Rota para receber os dados do cliente
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      const { nome, cpf, telefone, email, endereco, observacoes } = req.body;
      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID; // ID da planilha

      // Adicionando uma nova linha com os dados do cliente
      const request = {
        spreadsheetId: spreadsheetId,
        range: 'Clientes!A2', // A célula inicial da aba "Clientes"
        valueInputOption: 'RAW',
        resource: {
          values: [
            [nome, cpf, telefone, email, endereco, observacoes], // Linha de dados
          ],
        },
      };

      await sheets.spreadsheets.values.append(request);

      res.status(200).json({ message: 'Cliente cadastrado com sucesso!', status: 'success' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao cadastrar o cliente', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
};
