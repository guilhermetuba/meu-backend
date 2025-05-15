const authenticate = require('../utils/auth');

module.exports = async function handler(req, res) {
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

    const { dataInicio, dataFim } = req.query;

    const [vendasRes, itensRes, clientesRes, estoqueRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Vendas!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Itens da Venda!A2:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Clientes!A2:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Estoque!A2:G' })
    ]);

    const vendas = vendasRes.data.values || [];
    const itens = itensRes.data.values || [];
    const clientesRaw = clientesRes.data.values || [];
    const estoqueRaw = estoqueRes.data.values || [];

    const clienteMap = Object.fromEntries(clientesRaw.map(([nome, cpf]) => [cpf, nome]));
    const produtoMap = Object.fromEntries(estoqueRaw.map(([codigo, nome]) => [codigo, nome]));

    const itensPorVenda = {};
    for (const item of itens) {
      const [, codVenda, , codProduto, quantidade, , valorItem] = item;
      if (!itensPorVenda[codVenda]) itensPorVenda[codVenda] = [];
      itensPorVenda[codVenda].push({ codProduto, quantidade, valorItem });
    }

    let total_valor = 0;
    let total_quantidade = 0;

    const clienteResumo = {};
    const produtoResumo = {};

    for (const venda of vendas) {
      const [codVenda, dataVenda, cpf, valorTotal] = venda;
      const [dia, mes, ano] = dataVenda.split('/');
      const data = new Date(`${ano}-${mes}-${dia}`);

      if (dataInicio && data < new Date(dataInicio)) continue;
      if (dataFim && data > new Date(dataFim)) continue;

      const valorNumerico = parseFloat(valorTotal.replace(/\./g, '').replace(',', '.')) || 0;
      total_valor += valorNumerico;

      const nomeCliente = clienteMap[cpf] || 'Desconhecido';
      if (!clienteResumo[cpf]) {
        clienteResumo[cpf] = { nome: nomeCliente, cpf, total: 0 };
      }
      clienteResumo[cpf].total += valorNumerico;

      const itensVenda = itensPorVenda[codVenda] || [];
      total_quantidade += itensVenda.reduce((sum, i) => sum + (parseInt(i.quantidade) || 0), 0);

      for (const item of itensVenda) {
        const { codProduto, quantidade, valorItem } = item;
        const nomeProduto = produtoMap[codProduto] || 'Desconhecido';
        const qtd = parseInt(quantidade) || 0;
        const valor = parseFloat(valorItem.replace(/\./g, '').replace(',', '.')) || 0;

        if (!produtoResumo[codProduto]) {
          produtoResumo[codProduto] = { nome: nomeProduto, codigo: codProduto, total: 0, quantidade: 0 };
        }

        produtoResumo[codProduto].total += valor;
        produtoResumo[codProduto].quantidade += qtd;
      }
    }

    const clientes = Object.values(clienteResumo).sort((a, b) => b.total - a.total);
    const produtos = Object.values(produtoResumo).sort((a, b) => b.total - a.total);

    res.status(200).json({
      total_valor,
      total_quantidade,
      clientes,
      produtos
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao consultar vendas', error: error.message });
  }
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
  } 
    res.status(405).json({ message: 'Método não permitido' });
  
}
