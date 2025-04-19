const authenticate = require('../utils/auth');

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const sheets = await authenticate();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (req.method === "POST") {
    const { id_parcela, novo_valor, parcela_original, data_pagamento } = req.body;

    try {
      const readResult = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Contas a Receber!A2:K",
      });

      const rows = readResult.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id_parcela); // coluna A

      if (rowIndex === -1) {
        return res.status(404).json({ sucesso: false, erro: "Parcela não encontrada." });
      }

      const linhaPlanilha = rowIndex + 2;

      const obsAntiga = rows[rowIndex][10] || '';    // Coluna K (índice 10)

      const textoOriginal = `Valor original: R$ ${parcela_original}`;
      let novaObs = obsAntiga.trim();

      // Garante que não duplica a parte "Valor original"
      if (!novaObs.startsWith(textoOriginal)) {
        novaObs = `${textoOriginal} | ${novaObs}`;
      }

      const dataFormatada = formatarData(data_pagamento);
      novaObs += ` | Pago R$ ${novo_valor} no dia ${dataFormatada}.`;

      // Atualiza o valor recebido (coluna H)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Contas a Receber!H${linhaPlanilha}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[novo_valor]]
        }
      });

      // Atualiza observações (coluna K)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Contas a Receber!K${linhaPlanilha}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[novaObs]]
        }
      });

      res.status(200).json({ sucesso: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ sucesso: false, erro: "Erro ao atualizar parcela" });
    }
  }
};

// Função para formatar a data
function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}


