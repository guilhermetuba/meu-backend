const authenticate = require('../utils/auth');

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;
      const { data, cpf, produtos } = req.body; 
      // produtos = array de objetos [{ codigoProduto }]

      // 1. Buscar o último Codigo_condi existente
      const requestUltimoCodigo = {
        spreadsheetId: spreadsheetId,
        range: 'Condi!A2:A', // Corrigi aqui de 'Condi' para 'Condicoes'
      };

      const response = await sheets.spreadsheets.values.get(requestUltimoCodigo);
      const codigosExistentes = response.data.values || [];

      let ultimoCodigo = 0;
      if (codigosExistentes.length > 0) {
        const codigosNumericos = codigosExistentes
          .map(c => parseInt(c[0], 10))
          .filter(n => !isNaN(n));

        if (codigosNumericos.length > 0) {
          ultimoCodigo = Math.max(...codigosNumericos);
        }
      }

      const novoCodigo = ultimoCodigo + 1;

      // 2. Montar os dados
      const codigosProdutos = produtos.map(p => p.codigoProduto).join(','); // "001,002,003"
      const status = "Enviado";

      const registro = [
        novoCodigo,        // Codigo_condi
        data,              // Data do condi
        cpf,               // CPF do cliente
        codigosProdutos,   // Codigos dos produtos separados por vírgula
        status             // Status
      ];

      // 3. Inserir no Google Sheets
      const addRequest = {
        spreadsheetId: spreadsheetId,
        range: 'Condi!A2', // Corrigi aqui também
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [registro],
        },
      };

      await sheets.spreadsheets.values.append(addRequest);

      res.status(200).json({ message: "Condição registrada com sucesso!", Codigo_condi: novoCodigo });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao registrar condição', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}

