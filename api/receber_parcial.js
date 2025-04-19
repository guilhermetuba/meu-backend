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

  // NOVA LÓGICA PARA REGISTRAR PAGAMENTO PARCIAL
  if (req.method === "POST") {
    const { id_parcela, novo_valor, observacoes, data_pagamento } = req.body;

 try {
      // 1. Lê todos os dados da aba Contas a Receber
      const readResult = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Contas a Receber!A2:K",
      });

      const rows = readResult.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id_parcela); // coluna A

      if (rowIndex === -1) {
        return res.status(404).json({ sucesso: false, erro: "Parcela não encontrada." });
      }

      const linhaPlanilha = rowIndex + 2; // porque começa em A2

      // Coluna H = valor recebido (índice 7), Coluna K = observações (índice 10)
      const valorAntigo = rows[rowIndex][7] || '';
      const obsAntiga = rows[rowIndex][10] || '';

      const novoTextoObs = obsAntiga
        ? `${obsAntiga} | ${observacoes}`
        : observacoes;

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
    values: [[novoTextoObs]]
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

