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
    const { cpf } = req.query;

    try {
      const condiResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Condi!A1:E',
      });

      const condiRows = condiResponse.data.values;
      if (!condiRows || condiRows.length < 2) {
        return res.status(200).json([]);
      }

      const header = condiRows[0];
      const cpfIndex = header.indexOf('CPF_Cliente');
      const statusIndex = header.indexOf('Status');
      const dataIndex = header.indexOf('Data');
      const codigosIndex = header.indexOf('Codigo_Produto');
      const nomeIndex = header.indexOf('Nome');

      if (cpfIndex === -1 || statusIndex === -1 || codigosIndex === -1 || dataIndex === -1) {
        return res.status(500).json({ message: 'Colunas obrigatórias ausentes na aba Condi.' });
      }

      if (cpf) {
        const estoqueResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Estoque!A1:G',
        });

        const estoqueRows = estoqueResponse.data.values;
        const estoqueHeader = estoqueRows[0];
        const codigoEstoqueIndex = estoqueHeader.indexOf('Codigo_Produto');
        const nomeProdutoIndex = estoqueHeader.indexOf('Produto');

        const produtos = [];

        for (let i = 1; i < condiRows.length; i++) {
          const row = condiRows[i];
          if (row[cpfIndex] === cpf && row[statusIndex] === 'Enviado') {
            const data = row[dataIndex];
            const codigos = row[codigosIndex]?.split(',').map(c => c.trim());

          codigos.forEach(codigo => {
  const codigoLimpo = parseInt(codigo.trim(), 10);

  const produtoEstoque = estoqueRows.find((erow, j) => {
    const estoqueCodigo = parseInt(erow[codigoEstoqueIndex]?.trim(), 10);
    return j > 0 && estoqueCodigo === codigoLimpo;
  });

  const nomeProduto = produtoEstoque ? produtoEstoque[nomeProdutoIndex] : '';

  produtos.push({
    id: `${cpf}_${codigo}_${i}`,
    data,
    cpf,
    codigoProduto: codigo,
    nomeProduto,
  });
});
          }
        }

        return res.status(200).json({ condis: produtos });
      }

      // Busca dados da aba Clientes
const clientesResponse = await sheets.spreadsheets.values.get({
  spreadsheetId,
  range: 'Clientes!A1:F',
});
const clientesRows = clientesResponse.data.values;
const clientesHeader = clientesRows[0];
const cpfClientesIndex = clientesHeader.indexOf('CPF');
const nomeClientesIndex = clientesHeader.indexOf('Nome');

// Cria um mapa CPF → Nome
const mapaClientes = {};
for (let i = 1; i < clientesRows.length; i++) {
  const row = clientesRows[i];
  const cpf = row[cpfClientesIndex];
  const nome = row[nomeClientesIndex];
  if (cpf && nome) {
    mapaClientes[cpf] = nome;
  }
}

// Agora monta a lista de clientes da aba Condi
const clientes = [];
const cpfsUnicos = new Set();

for (let i = 1; i < condiRows.length; i++) {
  const row = condiRows[i];
  if (row[statusIndex] === 'Enviado') {
    const cpfCliente = row[cpfIndex];
    if (!cpfsUnicos.has(cpfCliente)) {
      cpfsUnicos.add(cpfCliente);
      clientes.push({
        cpf: cpfCliente,
        nome: mapaClientes[cpfCliente] || '',
      });
    }
  }
}

return res.status(200).json(clientes);

    } catch (error) {
      console.error('Erro no GET /condi:', error);
      return res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      console.log('Corpo recebido no POST /condi:', JSON.stringify(req.body, null, 2));

      const { registros } = req.body;

      if (!registros || registros.length === 0) {
        return res.status(400).json({ message: "Nenhum registro recebido." });
      }

      const requestUltimoCodigo = {
        spreadsheetId,
        range: 'Condi!A2:A',
      };

      const response = await sheets.spreadsheets.values.get(requestUltimoCodigo);
      const codigosExistentes = response.data.values || [];

      let ultimoCodigo = 0;
      if (codigosExistentes.length > 0) {
        ultimoCodigo = Math.max(...codigosExistentes.map(c => parseInt(c[0], 10)).filter(n => !isNaN(n)));
      }

      const novoCodigo = ultimoCodigo + 1;

      const data = registros[0].data;
      const cpf = registros[0].cpf;
      const codigosProdutos = registros.map(r => r.codigoProduto).join(',');
      const status = "Enviado";

      const registro = [
        novoCodigo,
        data,
        cpf,
        codigosProdutos,
        status,
      ];

      const addRequest = {
        spreadsheetId,
        range: 'Condi!A2',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [registro],
        },
      };

      await sheets.spreadsheets.values.append(addRequest);

      return res.status(200).json({ message: "Condi registrado com sucesso!", Codigo_condi: novoCodigo });
    } catch (error) {
      console.error('Erro no POST /condi:', error);
      return res.status(500).json({ message: 'Erro ao registrar condição', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
};
