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
          codigo_parcela: row[0],
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
console.log(req.body); // Log dos dados recebidos no backend
    if (!id_parcela || !data_pagamento || !status) {
        console.error("Dados incompletos:", req.body); // Log de erro com os dados incompletos
      return res.status(400).json({ error: "Dados incompletos para registrar o pagamento." });
    }

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Contas a Receber!A2:K", // Garante que pega a coluna A (código) até a K
      });

      const rows = response.data.values;

      // Busca o índice da linha onde o código está na coluna A (índice 0)
      const rowIndex = rows.findIndex(row => row[0] === id_parcela);

      if (rowIndex === -1) {
        return res.status(404).json({ error: "Código da conta não encontrado." });
      }

      // Colunas I (Status), J (Data Pagamento), K (Observações)
      const updateRange = `Contas a Receber!I${rowIndex + 2}:K${rowIndex + 2}`;
      const data_Formatada = formatarData(data_pagamento);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[status,data_Formatada,observacoes]],
        },
      });

      return res.status(200).json({ sucesso: true });

    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      return res.status(500).json({ error: "Erro ao registrar pagamento" });
    }
  }
};  // Essa chave fecha o module.exports corretamente

// Função para formatar a data
function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}


