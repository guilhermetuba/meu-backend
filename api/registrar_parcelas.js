export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { codigoVenda, cpfCliente, dataVenda, formaPagamento, condicoes, totalVenda } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // Obter o último código de contas
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Contas a Receber!A2:A', // Coluna do Código_Contas
      });

      const codigosExistentes = response.data.values || [];
      const ultimoCodigo = codigosExistentes.length
        ? Math.max(...codigosExistentes.map(c => parseInt(c[0] || "0")).filter(n => !isNaN(n)))
        : 0;

      const parcelas = condicoes.toLowerCase() === 'à vista' ? 1 : parseInt(condicoes);
      const valorParcela = parseFloat((totalVenda / parcelas).toFixed(2));
      const registros = [];

      const vendaDate = new Date(dataVenda);

      for (let i = 0; i < parcelas; i++) {
        const codigoContas = ultimoCodigo + i + 1;
        let dataVencimento = new Date(vendaDate);
        if (condicoes.toLowerCase() === 'à vista') {
          dataVencimento = vendaDate;
        } else {
          dataVencimento.setMonth(vendaDate.getMonth() + i + 1);
        }

        const parcelaTexto = condicoes.toLowerCase() === 'à vista'
          ? 'À Vista'
          : `${i + 1} de ${parcelas}`;

        registros.push([
          codigoContas,
          codigoVenda,
          cpfCliente,
          formatDate(vendaDate),
          formatDate(dataVencimento),
          formaPagamento,
          parcelaTexto,
          valorParcela,
          "Em aberto",
          ""
        ]);
      }

      // Enviar para o Google Sheets
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Contas a Receber!A2',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: registros,
        },
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

// Função auxiliar para formatar a data como DD/MM/AAAA
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  return sheets;
}
