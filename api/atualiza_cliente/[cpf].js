export default async function handler(req, res) {
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
