const authenticate = require('../../utils/auth');

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { codigo } = req.query; // Captura o código do produto da URL
  const sheets = await authenticate();
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET: Consultar produto
  if (req.method === "GET") {
    try {
      const request = {
        spreadsheetId,
        range: 'Estoque!A2:G',
      };
      const response = await sheets.spreadsheets.values.get(request);
      const produtos = response.data.values || [];

      const produtoEncontrado = produtos.find(produto => produto[0] === codigo);
      if (!produtoEncontrado) {
        return res.status(404).json({ message: "Produto não encontrado." });
      }

      return res.status(200).json({
        codigo: produtoEncontrado[0],
        produto: produtoEncontrado[1],
        fornecedor: produtoEncontrado[2],
        categoria: produtoEncontrado[3],
        quantidade: produtoEncontrado[4] || "0",
        precoCusto: produtoEncontrado[5] || "R$ 0,00",
        precoVenda: produtoEncontrado[6] || "R$ 0,00"
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao consultar produto', error: error.message });
    }
  }

  // PUT: Atualizar produto
  if (req.method === "PUT") {
    try {
      const { produto, fornecedor, categoria, quantidade, precoCusto, precoVenda } = req.body;
      const request = {
        spreadsheetId,
        range: 'Estoque!A2:G',
      };
      const response = await sheets.spreadsheets.values.get(request);
      const produtos = response.data.values || [];
      const rowIndex = produtos.findIndex(produto => produto[0] === codigo);

      if (rowIndex === -1) {
        return res.status(404).json({ message: "Produto não encontrado." });
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Estoque!A${rowIndex + 2}:G${rowIndex + 2}`,
        valueInputOption: "RAW",
        resource: { values: [[codigo, produto, fornecedor, categoria, quantidade, precoCusto, precoVenda]] }
      });

      return res.status(200).json({ message: "Produto atualizado com sucesso." });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar produto', error: error.message });
    }
  }

  // DELETE: Excluir produto e remover a linha da planilha
  if (req.method === "DELETE") {
    try {
      console.log("🔵 Iniciando exclusão do produto com código:", codigo);

      const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Estoque!A2:G',
      });
      const produtos = getResponse.data.values || [];
      console.log("📌 Produtos antes da exclusão:", produtos);

      const rowIndex = produtos.findIndex(produto => produto[0] === codigo);
      if (rowIndex === -1) {
        return res.status(404).json({ message: "Produto não encontrado." });
      }
      console.log(`🗑️ Produto encontrado na linha ${rowIndex + 2}`);

      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadsheet.data.sheets.find(s => s.properties.title === "Estoque");
      if (!sheet) {
        return res.status(500).json({ message: "Aba 'Estoque' não encontrada." });
      }
      const sheetId = sheet.properties.sheetId;
      console.log("🔍 sheetId:", sheetId);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex + 1,  
                  endIndex: rowIndex + 2
                }
              }
            }
          ]
        }
      });

      console.log("✅ Produto excluído com sucesso!");
      return res.status(200).json({ message: "Produto excluído com sucesso!" });
      
    } catch (error) {
      console.error("❌ Erro ao excluir produto:", error);
      return res.status(500).json({ message: 'Erro ao excluir produto', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}


