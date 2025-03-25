export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { nome, cpf, telefone, email, endereco, observacoes } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID; // ID da planilha

      // Verificar se o CPF já existe na aba "Clientes"
      const request = {
        spreadsheetId: spreadsheetId,
        range: 'Clientes!B2:B', // Coluna B contém os CPFs
      };

      const response = await sheets.spreadsheets.values.get(request);
      const cpfsExistentes = response.data.values || [];

      // Verificar se o CPF já está cadastrado
      const cpfExistente = cpfsExistentes.some(c => c[0] === cpf);
      if (cpfExistente) {
        return res.status(400).json({ message: "CPF já cadastrado." });
      }

      // Adicionar o novo cliente
      const addRequest = {
        spreadsheetId: spreadsheetId,
        range: 'Clientes!A2', // A célula inicial da aba "Clientes"
        valueInputOption: 'RAW',
        resource: {
          values: [
            [nome, cpf, telefone, email, endereco, observacoes], // Linha de dados
          ],
        },
      };

      await sheets.spreadsheets.values.append(addRequest);

      res.status(200).json({ message: "Cliente cadastrado com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao cadastrar o cliente', error: error.message });
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
