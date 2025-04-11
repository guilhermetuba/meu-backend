export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const { codigoVenda, cpfCliente, dataVenda, totalVenda, formaPagamento, condicoes } = req.body;

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;

      // 1. Obter o próximo código de contas
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Contas a Receber!A2:A',
      });

      const codigosExistentes = response.data.values || [];
      const ultimoCodigo = codigosExistentes.length
        ? Math.max(...codigosExistentes.map(c => parseInt(c[0] || "0")).filter(n => !isNaN(n)))
        : 0;

      const proximoCodigo = ultimoCodigo + 1;

      // 2. Gerar parcelas
      const parcelas = [];

      // Converte a dataVenda para objeto Date
      const [dia, mes, ano] = dataVenda.split("/");
      const vendaDate = new Date(`${ano}-${mes}-${dia}`);

      // Função para formatar a data em dd/mm/aaaa
      function formatDate(date) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
      }

      if (condicoes.toLowerCase() === 'à vista' || condicoes === '1x') {
        // Pagamento à vista
        const vencimentoFormatado = formatDate(vendaDate);

        parcelas.push([
          proximoCodigo,
          codigoVenda,
          cpfCliente,
          dataVenda,
          vencimentoFormatado,
          formaPagamento,
          "À Vista",
          totalVenda.toFixed(2).replace('.', ','),
          "Em aberto",
          ""
        ]);
      } else {
        const numParcelas = parseInt(condicoes);
        const valorParcela = totalVenda / numParcelas;

        for (let i = 0; i < numParcelas; i++) {
          const vencimento = new Date(vendaDate);
          vencimento.setMonth(vencimento.getMonth() + i);
          const vencimentoFormatado = formatDate(vencimento);

          parcelas.push([
            proximoCodigo + i,
            codigoVenda,
            cpfCliente,
            dataVenda,
            vencimentoFormatado,
            formaPagamento,
            `${i + 1} de ${numParcelas}`,
            valorParcela.toFixed(2).replace('.', ','),
            "Em aberto",
            ""
          ]);
        }
      }

      // 3. Enviar para o Google Sheets
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Contas a Receber!A2',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: parcelas
        }
      });

      res.status(200).json({ message: 'Contas a receber registradas com sucesso!' });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao registrar contas a receber', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}

// Função de autenticação
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
