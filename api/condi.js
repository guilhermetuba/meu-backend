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
      console.log("Iniciando busca de clientes com Condi 'Enviado'...");

      // 1. Buscar dados da aba Condi
      const condiResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Condi!A1:E',
      });

      const condiRows = condiResponse.data.values;
      if (!condiRows || condiRows.length === 0) {
        console.log("Nenhuma linha encontrada na aba Condi.");
        return res.status(200).json([]);
      }

      const condiHeader = condiRows[0];
      console.log("Cabeçalho Condi:", condiHeader);

      const cpfIndex = condiHeader.indexOf('CPF');
      const statusIndex = condiHeader.indexOf('Status');

      if (cpfIndex === -1 || statusIndex === -1) {
        console.error("Colunas 'CPF' ou 'Status' não encontradas na aba Condi!");
        return res.status(500).json({ message: "Colunas 'CPF' ou 'Status' ausentes na aba Condi." });
      }

      const cpfsEnviados = new Set();
      for (let i = 1; i < condiRows.length; i++) {
        const row = condiRows[i];
        const status = row[statusIndex];
        const cpf = row[cpfIndex];
        if (status === 'Enviado') {
          cpfsEnviados.add(cpf);
        }
      }

      console.log("CPFs com status 'Enviado':", Array.from(cpfsEnviados));

      // 2. Buscar dados da aba Clientes
      const clientesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Clientes!A1:F',
      });

      const clientesRows = clientesResponse.data.values;
      if (!clientesRows || clientesRows.length === 0) {
        console.log("Nenhuma linha encontrada na aba Clientes.");
        return res.status(200).json([]);
      }

      const clientesHeader = clientesRows[0];
      console.log("Cabeçalho Clientes:", clientesHeader);

      const cpfClienteIndex = clientesHeader.indexOf('CPF');
      const nomeIndex = clientesHeader.indexOf('Nome');

      if (cpfClienteIndex === -1 || nomeIndex === -1) {
        console.error("Colunas 'CPF' ou 'Nome' não encontradas na aba Clientes!");
        return res.status(500).json({ message: "Colunas 'CPF' ou 'Nome' ausentes na aba Clientes." });
      }

      const clientesFiltrados = [];

      for (let i = 1; i < clientesRows.length; i++) {
        const row = clientesRows[i];
        const cpf = row[cpfClienteIndex];
        const nome = row[nomeIndex];

        if (cpfsEnviados.has(cpf)) {
          clientesFiltrados.push({ nome, cpf });
        }
      }

      console.log("Clientes com condi 'Enviado':", clientesFiltrados);

      return res.status(200).json(clientesFiltrados);

    } catch (error) {
      console.error('Erro no GET /condi:', error);
      return res.status(500).json({ message: 'Erro ao buscar clientes com Condi "Enviado"', error: error.message });
    }
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


