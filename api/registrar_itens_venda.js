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

      // Montar os dados para inserção
      const linhasParaInserir = itens.map(item => {
        return [
          proximoCodigo++,
          codigoVenda,
          cpfCliente,
          item.codigoProduto,
          item.quantidade,
          Number(item.preco),
          Number(item.subtotal),
        ];
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Itens da Venda!A2",
        valueInputOption: "USER_ENTERED",
        resource: { values: linhasParaInserir },
      });

      // Atualizar o estoque com base nos itens vendidos
      const estoqueResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Estoque!A2:F',
      });

      const estoque = estoqueResponse.data.values || [];

      for (const item of itens) {
        const linhaEstoque = estoque.findIndex(p => p[0] === item.codigoProduto);
        if (linhaEstoque !== -1) {
          const linhaPlanilha = linhaEstoque + 2; // A2 começa na linha 2
          const quantidadeAtual = parseFloat(estoque[linhaEstoque][5] || "0");
          const novaQuantidade = quantidadeAtual - item.quantidade;

          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `Estoque!F${linhaPlanilha}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[novaQuantidade]],
            },
          });
        }
      }

      res.status(200).json({ message: "Itens da venda registrados e estoque atualizado com sucesso!" });

    } catch (error) {
      console.error("Erro ao registrar itens da venda:", error);
      res.status(500).json({ message: "Erro ao registrar itens da venda", error: error.message });
    }

  } else {
    res.status(405).json({ message: "Método não permitido" });
  }
}

async function authenticate() {
  const { google } = require("googleapis");
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });
  return sheets;
}
