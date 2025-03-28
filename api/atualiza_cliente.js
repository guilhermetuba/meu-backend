export default async function handler(req, res) {
  console.log("🔵 Requisição recebida:", req.method, req.query);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Content-Length");


  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const sheets = await authenticate();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (req.method === "GET") {
    try {
      const { cpf } = req.query;
      if (!cpf) {
        // Retorna lista de clientes
        const request = {
          spreadsheetId,
          range: 'Clientes!A2:F', // Ajustado para pegar todas as colunas relevantes
        };
        const response = await sheets.spreadsheets.values.get(request);
        const clientes = response.data.values || [];

        return res.status(200).json({
          clientes: clientes.map(cliente => ({
            nome: cliente[0],
            cpf: cliente[1],
            telefone: cliente[2],
            email: cliente[3],
            endereco: cliente[4],
            observacoes: cliente[5] || ""
          }))
        });
      } else {
        // Busca cliente específico pelo CPF
        const request = {
          spreadsheetId,
          range: 'Clientes!A2:F',
        };
        const response = await sheets.spreadsheets.values.get(request);
        const clientes = response.data.values || [];

        const clienteEncontrado = clientes.find(cliente => cliente[1] === cpf);

        if (!clienteEncontrado) {
          return res.status(404).json({ message: "Cliente não encontrado." });
        }

        return res.status(200).json({
          nome: clienteEncontrado[0],
          cpf: clienteEncontrado[1],
          telefone: clienteEncontrado[2],
          email: clienteEncontrado[3],
          endereco: clienteEncontrado[4],
          observacoes: clienteEncontrado[5] || ""
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao consultar clientes', error: error.message });
    }
  }

  if (req.method === "PUT") {
        try {
      const { cpf } = req.query; // De acordo com a URL, você deve obter o CPF da URL e não dos parâmetros de query
      const { nome, telefone, email, endereco, observacoes } = req.body;
      const request = {
        spreadsheetId,
        range: 'Clientes!A2:F',
      };
      const response = await sheets.spreadsheets.values.get(request);
      const clientes = response.data.values || [];
      const rowIndex = clientes.findIndex(cliente => cliente[1] === cpf);

      if (rowIndex === -1) {
        return res.status(404).json({ message: "Cliente não encontrado." });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Clientes!A${rowIndex + 2}:F${rowIndex + 2}`,
        valueInputOption: "RAW",
        resource: { values: [[nome, cpf, telefone, email, endereco, observacoes]] }
      });

      return res.status(200).json({ message: "Cliente atualizado com sucesso." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar cliente', error: error.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { cpf } = req.body;
      const request = {
        spreadsheetId,
        range: 'Clientes!A2:F',
      };
      const response = await sheets.spreadsheets.values.get(request);
      const clientes = response.data.values || [];
      const rowIndex = clientes.findIndex(cliente => cliente[1] === cpf);

      if (rowIndex === -1) {
        return res.status(404).json({ message: "Cliente não encontrado." });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Clientes!A${rowIndex + 2}:F${rowIndex + 2}`
      });

      return res.status(200).json({ message: "Cliente excluído com sucesso." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao excluir cliente', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}

async function authenticate() {
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}
