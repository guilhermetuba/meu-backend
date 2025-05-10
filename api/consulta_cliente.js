const authenticate = require('../utils/auth');

// Variáveis globais de cache
let cacheClientes = null;
let cacheTimestamp = 0;
const TEMPO_CACHE_MS = 60 * 1000; // 60 segundos

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        // Verifica se o cache está válido
        const agora = Date.now();
        if (!cacheClientes || agora - cacheTimestamp > TEMPO_CACHE_MS) {
            const sheets = await authenticate();
            const spreadsheetId = process.env.SPREADSHEET_ID;

            const request = {
                spreadsheetId: spreadsheetId,
                range: "Clientes!A2:F",
            };

            const response = await sheets.spreadsheets.values.get(request);
            cacheClientes = response.data.values || [];
            cacheTimestamp = agora;
        }

        const clientes = cacheClientes;
        const { cpf } = req.query;

        if (cpf) {
            const clienteEncontrado = clientes.find(c => c[1] === cpf);
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
