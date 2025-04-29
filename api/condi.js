const authenticate = require('../utils/auth');

export default async function handler(req, res) {
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
      // 1. Buscar dados da aba Condi
      const condiResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Condi!A2:E',
      });

      const condiRows = condiResponse.data.values;
      const condiHeader = condiRows[0];
      const cpfIndex = condiHeader.indexOf('CPF');
      const statusIndex = condiHeader.indexOf('Status');

      const cpfsEnviados = new Set();
      for (let i = 1; i < condiRows.length; i++) {
        if (condiRows[i][statusIndex] === 'Enviado') {
          cpfsEnviados.add(condiRows[i][cpfIndex]);
        }
      }

      // 2. Buscar dados da aba Clientes
      const clientesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Clientes!A2:F',
      });

      const clientesRows = clientesResponse.data.values;
      const clientesHeader = clientesRows[0];
      const cpfClienteIndex = clientesHeader.indexOf('CPF');
      const nomeIndex = clientesHeader.indexOf('Nome');

      const clientesFiltrados = [];

      for (let i = 1; i < clientesRows.length; i++) {
        const cpf = clientesRows[i][cpfClienteIndex];
        if (cpfsEnviados.has(cpf)) {
          clientesFiltrados.push({
            nome: clientesRows[i][nomeIndex],
            cpf,
          });
        }
      }

      return res.status(200).json(clientesFiltrados);

    } catch (error) {
      console.error('Erro no GET /condi:', error);
      return res.status(500).json({ message: 'Erro ao buscar clientes com Condi "Enviado"', error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      console.log('Corpo recebido no POST /condi:', JSON.stringify(req.body, null, 2));

      const { registros } = req.body;

      if (!registros || registros.length === 0) {
        return res.status(400).json({ message: "Nenhum registro recebido." });
      }

      // 1. Buscar o último Codigo_condi existente
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

      // 2. Montar os dados
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

      // 3. Inserir no Google Sheets
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

