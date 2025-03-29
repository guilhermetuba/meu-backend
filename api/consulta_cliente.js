export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

   // Get cliente
  if (req.method === "GET") {
    try {
      const request = {
        spreadsheetId,
        range: 'Clientes!A2:F',
      };
      const response = await sheets.spreadsheets.values.get(request);
      const clientes = response.data.values || [];

      const clienteEncontrado = clientes.find(cliente => cliente[1] === cpf);
      if (!clienteEncontrado) {
        return res.status(404).json({ message: "Cliente não encontrado." });
      }

      return res.status(200).json({
        nome: clienteEncontrado[0],
        cpf: clienteEncontrado[1],
        telefone: clienteEncontrado[2],
        email: clienteEncontrado[3],
        endereco: clienteEncontrado[4],
        observacoes: clienteEncontrado[5] || ""
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao consultar cliente', error: error.message });
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
