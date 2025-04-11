export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const {
        codigoVenda,
        cpfCliente,
        dataVenda,
        formaPagamento,
        condicoes,
        totalVenda,
        dataPrimeiraParcela
      } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // Buscar último Código_Contas existente
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Contas a Receber!A2:A', // Coluna do Código_Contas
      });

      const codigosExistentes = response.data.values || [];
      const ultimoCodigo = codigosExistentes.length
        ? Math.max(...codigosExistentes.map(c => parseInt(c[0] || "0")).filter(n => !isNaN(n)))
        : 0;

      const parcelas = [];
      const proximoCodigo = ultimoCodigo + 1;

      let numParcelas = condicoes.toLowerCase().includes("vista") ? 1 : parseInt(condicoes);
      const valorParcela = parseFloat((totalVenda / numParcelas).toFixed(2));

      for (let i = 0; i < numParcelas; i++) {
        const vencimento = calcularDataVencimento(dataVenda, dataPrimeiraParcela, i, condicoes);
        const vencimentoFormatado = formatDate(vencimento);

        parcelas.push([
          proximoCodigo + i,
          codigoVenda,
          cpfCliente,
          dataVenda,
          vencimentoFormatado,
          formaPagamento,
          numParcelas === 1 ? "À Vista" : `${i + 1} de ${numParcelas}`,
          valorParcela,
          "Em aberto",
          ""
        ]);
      }

      // Enviar para a planilha
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Contas a Receber!A2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: parcelas
        }
      });

      res.status(200).json({ message: "Contas a receber registradas com sucesso!" });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao registrar contas a receber', error: error.message });
    }

  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}

// Formata a data para dd/mm/yyyy
function formatDate(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Calcula vencimento
function calcularDataVencimento(dataVenda, dataPrimeiraParcela, index, condicoes) {
  if (condicoes.toLowerCase().includes("vista")) {
    return new Date(dataVenda); // à vista = mesmo dia da venda
  }

  const base = new Date(dataPrimeiraParcela);
  const vencimento = new Date(base);
  vencimento.setMonth(vencimento.getMonth() + index);
  return vencimento;
}

// Função de autenticação (sem mudanças)
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

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  return sheets;
}
