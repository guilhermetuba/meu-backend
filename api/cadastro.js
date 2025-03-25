import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Lidando com preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Verificando se é um POST
  if (req.method === "POST") {
    try {
      const { nome, cpf, telefone, email, endereco, observacoes } = req.body;
      
      // Autenticando com o Google Sheets API
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

      await sheets.spreadsheets.values.append(request); // Envia os dados para a planilha

      // Respondendo com sucesso
      res.status(200).json({ message: "Cliente cadastrado com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao cadastrar o cliente', error: error.message });
    }
  } else {
    // Se o método não for POST, retornar 405 Method Not Allowed
    res.status(405).json({ message: 'Método não permitido' });
  }
}

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
