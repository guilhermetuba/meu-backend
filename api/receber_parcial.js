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
    try {
      const { status, dias } = req.query;

      const readResult = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Contas a Receber!A2:K",
      });

      const rows = readResult.data.values || [];
      const hoje = new Date();

      const contasFiltradas = rows
        .map(row => ({
          id: row[0],
          codigoVenda: row[1],
          cpf: row[2],
          dataVenda: row[3],
          vencimento: row[4],
          formaPagamento: row[5],
          parcela: row[6],
          valor: parseFloat(row[7]),
          status: row[8],
          dataPagamento: row[9],
          observacoes: row[10] || ""
        }))
        .filter(conta => {
          let incluir = true;

          // Filtro por status
          if (status && conta.status !== status) incluir = false;

          // Filtro por vencimento
          if (dias !== undefined) {
            const dataVenc = new Date(conta.vencimento);
            const diferencaDias = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));

            if (dias === '-1') {
              incluir = incluir && diferencaDias < 0; // atrasadas
            } else if (dias === '90+') {
              incluir = incluir && diferencaDias > 90;
            } else {
              const limite = parseInt(dias);
              if (!isNaN(limite)) {
                incluir = incluir && diferencaDias >= 0 && diferencaDias <= limite;
              }
            }
          }

          return incluir;
        });

      return res.status(200).json(contasFiltradas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: "Erro ao buscar contas" });
    }
  }
  
  if (req.method === "POST") {
    const { id_parcela, parcela_original, novo_valor, valor_recebido, observacoes, data_pagamento } = req.body;

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

      const obsAntiga = rows[rowIndex][10] || ''; // Coluna K
      let novaObs = obsAntiga.trim();

      const valorOriginalTexto = `Valor original: R$ ${parseFloat(parcela_original).toFixed(2).replace('.', ',')}`;

      // Adiciona o valor original apenas se não estiver presente
      if (!/Valor original: R\$/.test(novaObs)) {
        novaObs = `${valorOriginalTexto} | ${novaObs}`;
      }

      // Adiciona observações do formulário, se houver
      let observacaoExtra = '';
      if (observacoes && observacoes.trim() !== '') {
        observacaoExtra = `Obs: ${observacoes.trim()} | `;
      }

      const dataFormatada = formatarData(data_pagamento);
      const pagamentoTexto = `Pago R$ ${parseFloat(valor_recebido).toFixed(2).replace('.', ',')} no dia ${dataFormatada}.`;

      // Concatena tudo
      novaObs += ` | ${pagamentoTexto}${observacaoExtra}`;

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




