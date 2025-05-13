const authenticate = require('../utils/auth');

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
if (req.method === "GET") {
    try {
      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      const { dataInicio, dataFim, cliente, produto } = req.query;

      const [vendasRes, itensRes, clientesRes, estoqueRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Vendas!A2:F' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Itens da Venda!A2:G' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Clientes!A2:F' }),
        sheets.spreadsheets.values.get({ spreadsheetId, range: 'Estoque!A2:G' })
      ]);

      const vendas = vendasRes.data.values || [];
      const itens = itensRes.data.values || [];
      const clientes = clientesRes.data.values || [];
      const estoque = estoqueRes.data.values || [];

      const clienteMap = Object.fromEntries(clientes.map(([nome, cpf]) => [cpf, nome]));
      const produtoMap = Object.fromEntries(estoque.map(([codigo, nome]) => [codigo, nome]));

      const itensPorVenda = {};
      for (const [codVenda, codProduto, cpfCliente] of itens) {
        if (!itensPorVenda[codVenda]) itensPorVenda[codVenda] = [];
        itensPorVenda[codVenda].push({ codProduto, cpfCliente });
      }

      let total_valor = 0;
      let total_quantidade = 0;

      for (const venda of vendas) {
        const [codVenda, dataVenda, cpf, valorTotal] = venda;
        const data = new Date(dataVenda);

        if (dataInicio && data < new Date(dataInicio)) continue;
        if (dataFim && data > new Date(dataFim)) continue;

        const itensVenda = itensPorVenda[codVenda] || [];

        const nomeCliente = clienteMap[cpf];
        if (cliente && cliente !== nomeCliente) continue;

        const nomesProdutos = itensVenda.map(item => produtoMap[item.codProduto]);
        if (produto && !nomesProdutos.includes(produto)) continue;

        total_valor += parseFloat(valorTotal) || 0;
        total_quantidade += itensVenda.length;
      }

      res.status(200).json({ total_valor, total_quantidade });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao consultar vendas', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }

  
  if (req.method === "POST") {
    try {
      const { dataVenda, cpfCliente, totalVenda, formaPagamento, condicoes } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // 1. Buscar último código de venda existente
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Vendas!A2:A', // Coluna do Código_Venda
      });

      const codigosExistentes = response.data.values || [];
      const ultimoCodigo = codigosExistentes.length
        ? Math.max(...codigosExistentes.map(c => parseInt(c[0] || "0")).filter(n => !isNaN(n)))
        : 0;
      const novoCodigo = ultimoCodigo + 1;

      // 2. Inserir os dados na planilha
      const addRequest = {
        spreadsheetId,
        range: 'Vendas!A2',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [
            [novoCodigo, dataVenda, cpfCliente, totalVenda, formaPagamento, condicoes]
          ]
        }
      };

      await sheets.spreadsheets.values.append(addRequest);

      res.status(200).json({ message: "Venda registrada com sucesso!", codigoVenda: novoCodigo });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao registrar a venda', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}
