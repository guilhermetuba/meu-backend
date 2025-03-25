export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID; // ID da planilha

      // Buscar todos os clientes na aba "Clientes"
      const request = {
        spreadsheetId: spreadsheetId,
        range: 'Clientes!A2:A', // Coluna A contém os nomes dos clientes
      };

      const response = await sheets.spreadsheets.values.get(request);
      const clientes = response.data.values || [];

      // Verifica se encontrou clientes
      if (clientes.length === 0) {
        return res.status(404).json({ message: "Nenhum cliente encontrado." });
      }

      // Retorna a lista de nomes dos clientes
      res.status(200).json({ clientes: clientes.map(cliente => cliente[0]) });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao consultar clientes', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}

// Função para autenticar com o Google Sheets API
async function authenticate() {
  const { google } = require('googleapis');
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
