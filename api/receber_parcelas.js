export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const cpf = req.query.cpf;
  if (!cpf) {
    return res.status(400).json({ error: "CPF não informado" });
  }

  try {
    const sheets = await authenticate();
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const request = {
      spreadsheetId: spreadsheetId,
      range: "Contas a Receber!A2:J", // Ajuste conforme necessário
    };

    const response = await sheets.spreadsheets.values.get(request);
    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return res.status(200).json({ parcelas: [] });
    }

    // Índices: A=0 CPF, C=2 Data Venda, D=3 Data Venc, E=4 Parcela, F=5 Valor, G=6 Status
    const parcelas = rows
      .filter(row => row[0] === cpf && row[8]?.toLowerCase() === "em aberto")
      .map(row => ({
        data_venda: row[2],
        data_vencimento: row[3],
        parcela: row[5],
        valor: row[6],
      }));

    return res.status(200).json({ parcelas });
  } catch (error) {
    console.error("Erro ao buscar parcelas:", error);
    return res.status(500).json({ error: "Erro ao buscar parcelas" });
  }
}

async function authenticate() {
  const { google } = require("googleapis");
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  return sheets;
}

