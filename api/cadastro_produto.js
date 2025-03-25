export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
if (req.method === "POST") {
    try {
      const { codigo, produto, fornecedor, categoria, quantidade, precoCusto, precoVenda } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID; // ID da planilha

      // Verificar se o código já existe na aba "Estoque"
      const request = {
        spreadsheetId: spreadsheetId,
        range: 'Estoque!A2:A', // Coluna B contém os CPFs
      };

      const response = await sheets.spreadsheets.values.get(request);
      const codigosExistentes = response.data.values || [];

      // Verificar se o código já está cadastrado
      const codigosExistentes = codigosExistentes.some(c => c[0] === codigo);
      if (codigosExistente) {
        return res.status(400).json({ message: "Código já cadastrado." });
      }

      // Adicionar o novo produto
      const addRequest = {
        spreadsheetId: spreadsheetId,
        range: 'Estoque!A2', // A célula inicial da aba "Estoque"
        valueInputOption: 'RAW',
        resource: {
          values: [
            [codigo, produto, fornecedor, categoria, quantidade, precoCusto, precoVenda], // Linha de dados
          ],
        },
      };

      await sheets.spreadsheets.values.append(addRequest);

      res.status(200).json({ message: "Produto cadastrado com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao cadastrar o produto', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
