export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const sheets = await authenticate();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (req.method === "GET") {
    const cpf = req.query.cpf;
    if (!cpf) return res.status(400).json({ error: "CPF não informado" });

    try {
      const request = {
        spreadsheetId,
        range: "Contas a Receber!A2:J",
      };

      const response = await sheets.spreadsheets.values.get(request);
      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        return res.status(200).json({ parcelas: [] });
      }

      const parcelas = rows
        .filter(row => row[2] === cpf && row[8]?.toLowerCase() === "em aberto")
        .map(row => ({
          data_venda: row[3],
          data_vencimento: row[4],
          parcela: row[6],
          valor: parseFloat(row[7]?.toString().replace(",", ".")),
        }));

      return res.status(200).json({ parcelas });

    } catch (error) {
      console.error("Erro ao buscar parcelas:", error);
      return res.status(500).json({ error: "Erro ao buscar parcelas" });
    }
  }

  // NOVA LÓGICA PARA REGISTRAR PAGAMENTO
  if (req.method === "POST") {
    const { id_parcela, data_pagamento, status, observacoes } = req.body;

    if (!id_parcela || !data_pagamento || !status) {
      return res.status(400).json({ error: "Dados incompletos para registrar o pagamento." });
    }

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Contas a Receber!A2:J",
      });

      const rows = response.data.values;

      const rowIndex = rows.findIndex(row => row[6] === id_parcela); // Coluna G = índice 6

      if (rowIndex === -1) {
        return res.status(404).json({ error: "Parcela não encontrada." });
      }

      const updateRange = `Contas a Receber!H${rowIndex + 2}:J${rowIndex + 2}`; // H, I, J
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[data_pagamento, status, observacoes]],
        },
      });

      return res.status(200).json({ sucesso: true });

    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      return res.status(500).json({ error: "Erro ao registrar pagamento" });
    }
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
