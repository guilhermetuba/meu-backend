const authenticate = require('../utils/auth');

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
  const sheets = await authenticate(); // Chama a função de autenticação
    try {
        const sheets = await authenticate();
        const spreadsheetId = process.env.SPREADSHEET_ID;

        const request = {
            spreadsheetId: spreadsheetId,
            range: "Clientes!A2:F", // Ajuste conforme as colunas da sua planilha
        };

        const response = await sheets.spreadsheets.values.get(request);
        const clientes = response.data.values || [];

        // Se houver um CPF na query, buscar apenas esse cliente
        const { cpf } = req.query;
        if (cpf) {
            const clienteEncontrado = clientes.find(c => c[1] === cpf); // CPF está na coluna B
            if (clienteEncontrado) {
                return res.status(200).json({
                    nome: clienteEncontrado[0],
                    cpf: clienteEncontrado[1],
                    telefone: clienteEncontrado[2] || '',
                    email: clienteEncontrado[3] || '',
                    endereco: clienteEncontrado[4] || '',
                    observacoes: clienteEncontrado[5] || '',
                });
            } else {
                return res.status(404).json({ message: "Cliente não encontrado." });
            }
        }

        // Retorna todos os clientes se nenhum CPF for passado
        res.status(200).json({
            clientes: clientes.map(c => ({ nome: c[0], cpf: c[1] }))
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar clientes.", error: error.message });
    }
}
