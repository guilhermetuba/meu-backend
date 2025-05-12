const authenticate = require('../utils/auth');

// Cache em memória (válido por 60 segundos)
let cacheClientes = null;
let cacheTimestamp = null;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, PATCH, OPTIONS");
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

    // Zera a hora de hoje para comparações corretas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    function parseDataBrasileira(dataStr) {
      const [dia, mes, ano] = dataStr.split('/');
      const data = new Date(`${ano}-${mes}-${dia}`);
      data.setHours(0, 0, 0, 0);
      return data;
    }

    const contasFiltradas = rows
      .map(row => ({
        id: row[0],
        codigoVenda: row[1],
        cpf: row[2],
        dataVenda: row[3],
        vencimento: row[4],
        formaPagamento: row[5],
        parcela: row[6],
        valor: parseFloat(row[7].replace(',', '.')),
        status: row[8],
        dataPagamento: row[9],
        observacoes: row[10] || ""
      }))
      .filter(conta => {
        let incluir = true;

        // Filtro por status
        if (status && conta.status !== status) incluir = false;

        // Filtro por vencimento
        if (dias !== undefined && dias !== '') {
          const dataVenc = parseDataBrasileira(conta.vencimento);

          if (dias === '-1') {
            // VENCIDAS: vencimento antes de hoje
            incluir = incluir && dataVenc < hoje;
          } else if (dias === '30' || dias === '60') {
            const limite = parseInt(dias);
            const diasFuturos = Math.floor((dataVenc - hoje) / (1000 * 60 * 60 * 24));
            incluir = incluir && diasFuturos >= 0 && diasFuturos <= limite;
          } else if (dias === '9999') {
            // TODAS À VENCER: vencimento hoje ou no futuro
            incluir = incluir && dataVenc >= hoje;
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

  // NOVA ROTA: Buscar nome do cliente pelo CPF com cache
if (req.method === "PATCH") {
  console.log('Corpo da requisição:', req.body);
  const { cpf, cpfs } = req.body;

  try {
    const agora = Date.now();
    if (!cacheClientes || agora - cacheTimestamp > 60 * 1000) {
      const resultado = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Clientes!A2:F"
      });
      cacheClientes = resultado.data.values || [];
      cacheTimestamp = agora;
    }

    if (cpf) {
      const cliente = cacheClientes.find(row => row[1] === cpf);
      const nome = cliente ? cliente[0] : null;
      return res.status(200).json({ nome });
    }

    if (cpfs && Array.isArray(cpfs)) {
      const resultado = {};
      for (const cpfItem of cpfs) {
        const cliente = cacheClientes.find(row => row[1] === cpfItem);
        resultado[cpfItem] = cliente ? cliente[0] : null;
      }
      return res.status(200).json(resultado); // { cpf1: nome1, cpf2: nome2 }
    }

    return res.status(400).json({ erro: "CPF ou lista de CPFs é obrigatória" });

  } catch (erro) {
    console.error('Erro no PATCH:', erro);
    return res.status(500).json({ erro: "Erro ao buscar nome(s) do cliente" });
  }
}

// Função para formatar a data
function formatarData(data) {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}
}
