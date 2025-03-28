export default async function handler(req, res) {
  console.log("🔵 Requisição recebida:", req.method, req.query);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { cpf } = req.query;  // Captura o CPF da URL

  const sheets = await authenticate();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Get cliente
  if (req.method === "GET") {
    try {
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
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao consultar cliente', error: error.message });
    }
  }

  // Update cliente
  if (req.method === "PUT") {
    try {
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

  // Delete cliente
  if (req.method === "DELETE") {
    try {
      console.log("🔵 Iniciando exclusão do cliente com CPF:", cpf);
      const request = {
        spreadsheetId,
        range: 'Clientes!A2:F',
      };
      const response = await sheets.spreadsheets.values.get(request);
      let clientes = response.data.values || [];
       console.log("📌 Lista de clientes antes da exclusão:", clientes);
      const rowIndex = clientes.findIndex(cliente => cliente[1] === cpf);
       
      if (rowIndex === -1) {
        return res.status(404).json({ message: "Cliente não encontrado." });
      }
      console.log(`🗑️ Excluindo cliente na linha ${rowIndex + 2}...`);

         // Após excluir, reorganizar a planilha removendo linhas vazias
        clientes.splice(rowIndex, 1); // Remove a linha vazia da array
     console.log("📌 Lista de clientes após exclusão:", clientes);
      
      if (clientes.length > 0) {
            console.log("🔄 Atualizando planilha sem a linha vazia...");
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Clientes!A2:F',
                valueInputOption: 'RAW',
                resource: { values: clientes }
            });
 } else {
            console.log("📌 Nenhum cliente restante, limpando planilha...");
            await sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: 'Clientes!A2:F'
            });
        }

        console.log("✅ Cliente excluído e planilha reorganizada com sucesso!");
        return res.status(200).json({ message: "Cliente excluído com sucesso." });

    } catch (error) {
        console.error("❌ Erro ao excluir cliente:", error);
        return res.status(500).json({ message: 'Erro ao excluir cliente', error: error.message });
    }
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
