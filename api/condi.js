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
        range: 'Condi!A1:Z',
      });

      const condiRows = condiResponse.data.values;
      if (!condiRows || condiRows.length < 2) {
        return res.status(200).json([]);
      }

      const header = condiRows[0];
      const cpfIndex = header.indexOf('CPF');
      const nomeIndex = header.indexOf('Nome');
      const statusIndex = header.indexOf('Status');
      const dataIndex = header.indexOf('Data');
      const codigosIndex = header.findIndex(col => col.toLowerCase().includes('código'));

      if (cpfIndex === -1 || statusIndex === -1 || codigosIndex === -1 || dataIndex === -1) {
        return res.status(500).json({ message: 'Colunas obrigatórias ausentes na aba Condi.' });
      }

      // Se CPF está presente → buscar todos os registros "Enviado" desse CPF
      if (cpf) {
        const estoqueResponse = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: 'Estoque!A1:Z',
        });

        const estoqueRows = estoqueResponse.data.values;
        const estoqueHeader = estoqueRows[0];
        const codigoEstoqueIndex = estoqueHeader.findIndex(c => c.toLowerCase().includes('código'));
        const nomeProdutoIndex = estoqueHeader.findIndex(c => c.toLowerCase().includes('nome'));

        const produtos = [];

        for (let i = 1; i < condiRows.length; i++) {
          const row = condiRows[i];
          if (row[cpfIndex] === cpf && row[statusIndex] === 'Enviado') {
            const data = row[dataIndex];
            const codigos = row[codigosIndex]?.split(',').map(c => c.trim());

            codigos.forEach(codigo => {
              const produtoEstoque = estoqueRows.find((erow, j) => j > 0 && erow[codigoEstoqueIndex] === codigo);
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

      // Se CPF não está presente → retornar todos os clientes com status "Enviado", mesmo que duplicados
      const clientes = [];

      for (let i = 1; i < condiRows.length; i++) {
        const row = condiRows[i];
        if (row[statusIndex] === 'Enviado') {
          const cpfCliente = row[cpfIndex];
          const nomeCliente = nomeIndex !== -1 ? row[nomeIndex] : "";
          clientes.push({ cpf: cpfCliente, nome: nomeCliente });
        }
      }

      return res.status(200).json(clientes);
    } catch (error) {
      console.error('Erro no GET /condi:', error);
      return res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}

  // POST - mantido como está
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
}


