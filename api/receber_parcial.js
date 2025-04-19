
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const sheets = await authenticate();
  const spreadsheetId = process.env.SPREADSHEET_ID;

   // NOVA LÓGICA PARA REGISTRAR PAGAMENTO PARCIAL
  if (req.method === "POST") {
    const { id_parcela, novo_valor, observacoes, data_pagamento } = req.body;

  try {
    // Atualiza a planilha: novo valor da parcela e campo de observações
    await sheets.spreadsheets.values.update({
      spreadsheetId: 'SUA_ID',
      range: `Contas a Receber!A2:K`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          // Atualize conforme sua estrutura:
          // Exemplo: [id_parcela, novo_valor, observacoes, data_pagamento, ...]
        ]
      }
    });

    res.status(200).json({ sucesso: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ sucesso: false, erro: "Erro ao atualizar parcela" });
  }
}
};  // Essa chave fecha o module.exports corretamente

// Função para formatar a data
function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Função de autenticação
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

