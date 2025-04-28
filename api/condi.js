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
      console.log('Corpo recebido no POST /condi:', JSON.stringify(req.body, null, 2));

      const sheets = await authenticate();
      const spreadsheetId = process.env.SPREADSHEET_ID;
      const { registros } = req.body; // <-- agora usa registros

      if (!registros || registros.length === 0) {
        return res.status(400).json({ message: "Nenhum registro recebido." });
      }

      // 1. Buscar o último Codigo_condi existente
      const requestUltimoCodigo = {
        spreadsheetId: spreadsheetId,
        range: 'Condi!A2:A', // Supondo que o Codigo_condi esteja na coluna A
      };

      const response = await sheets.spreadsheets.values.get(requestUltimoCodigo);
      const codigosExistentes = response.data.values || [];

      let ultimoCodigo = 0;
      if (codigosExistentes.length > 0) {
        ultimoCodigo = Math.max(...codigosExistentes.map(c => parseInt(c[0], 10)).filter(n => !isNaN(n)));
      }

      const novoCodigo = ultimoCodigo + 1;

      // 2. Montar os dados
      const data = registros[0].data;
      const cpf = registros[0].cpf;
      const codigosProdutos = registros.map(r => r.codigoProduto).join(','); // pega todos os códigos e junta
      const status = "Enviado";

      const registro = [
        novoCodigo,    // Codigo_condi
        data,          // Data do condi (primeiro registro)
        cpf,           // CPF (primeiro registro)
        codigosProdutos, // Códigos separados por vírgula
        status         // Status
      ];

      // 3. Inserir no Google Sheets
      const addRequest = {
        spreadsheetId: spreadsheetId,
        range: 'Condi!A2',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [registro],
        },
      };

      await sheets.spreadsheets.values.append(addRequest);

      res.status(200).json({ message: "Condição registrada com sucesso!", Codigo_condi: novoCodigo });

    } catch (error) {
      console.error('Erro no POST /condi:', error);
      res.status(500).json({ message: 'Erro ao registrar condição', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Método não permitido' });
  }
}
