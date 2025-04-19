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
      // Buscar a linha com o id_parcela
      const resultado = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `Contas a Receber!A2:A`, // Procurar na coluna A (id_parcela)
      });

      const rows = resultado.data.values;
      let linhaEncontrada = -1;

      // Procurando o id_parcela na coluna A
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === id_parcela) {
          linhaEncontrada = i + 2; // Adiciona 2 porque a pesquisa começa na linha 2
          break;
        }
      }

      if (linhaEncontrada === -1) {
        return res.status(404).json({ sucesso: false, erro: "Parcela não encontrada" });
      }

      // Atualizar o valor na coluna H e as observações na coluna K
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `Contas a Receber!H${linhaEncontrada}:H${linhaEncontrada}`, // Coluna H
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[novo_valor]], // Atualiza o valor da parcela
        }
      });

      // Atualizar o campo de observações na coluna K
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `Contas a Receber!K${linhaEncontrada}:K${linhaEncontrada}`, // Coluna K
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[observacoes]], // Adiciona as observações
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

