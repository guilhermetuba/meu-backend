const authenticate = require('./auth'); // Importa a função de autenticação

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { codigoVenda, cpfCliente, itens } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // Buscar os códigos já existentes na aba "Itens da Venda"
      const readRequest = {
        spreadsheetId,
        range: "Itens da Venda!A2:A",
      };

      const response = await sheets.spreadsheets.values.get(readRequest);
      const linhasExistentes = response.data.values || [];
      let proximoCodigo = linhasExistentes.length + 1;

      // Montar os dados para inserção e atualizar estoque
      const linhasParaInserir = [];

      for (const item of itens) {
        linhasParaInserir.push([
          proximoCodigo++,
          codigoVenda,
          cpfCliente,
          item.codigoProduto,
          item.quantidade,
          Number(item.preco),
          Number(item.subtotal)
        ]);

        // Atualizar a quantidade na aba Estoque
        const estoque = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "Estoque!A2:E"
        });

        const estoqueData = estoque.data.values || [];
        const indexProduto = estoqueData.findIndex(l => l[0] === item.codigoProduto);

        if (indexProduto !== -1) {
          const quantidadeAtual = parseInt(estoqueData[indexProduto][4]);
          const novaQuantidade = quantidadeAtual - item.quantidade;

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Estoque!E${indexProduto + 2}`,
            valueInputOption: "USER_ENTERED",
            resource: {
              values: [[novaQuantidade]]
            }
          });
        }
      }

      const appendRequest = {
        spreadsheetId,
        range: "Itens da Venda!A2",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: linhasParaInserir,
        },
      };

      await sheets.spreadsheets.values.append(appendRequest);

      res.status(200).json({ message: "Itens da venda registrados com sucesso!" });

    } catch (error) {
      console.error("Erro ao registrar itens da venda:", error);
      res.status(500).json({ message: "Erro ao registrar itens da venda", error: error.message });
    }
  } else {
    res.status(405).json({ message: "Método não permitido" });
  }
}

