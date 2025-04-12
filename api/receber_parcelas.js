export default async function handler(req, res) {
  const cpf = req.query.cpf;
  if (!cpf) {
    return res.status(400).json({ error: "CPF não informado" });
  }

  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetName = 'Contas a Receber';
    const range = `${sheetName}!A2:J`; // ajuste conforme o número de colunas

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID, // configure no .env
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(200).json({ parcelas: [] });
    }

    // Índices: A=0 CPF, C=2 Data Venda, D=3 Data Venc, E=4 Parcela, F=5 Valor, G=6 Status
    const parcelas = rows
      .filter(row => row[2] === cpf && row[8]?.toLowerCase() === "em aberto")
      .map(row => ({
        data_venda: row[3],
        data_vencimento: row[4],
        parcela: row[6],
        valor: row[7],
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
