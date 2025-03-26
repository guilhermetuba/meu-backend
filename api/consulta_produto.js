export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const sheets = await authenticate();
        const spreadsheetId = process.env.SPREADSHEET_ID;

        const request = {
            spreadsheetId: spreadsheetId,
            range: "Estoque!A2:C", // Ajuste o range conforme necessário
        };

        const response = await sheets.spreadsheets.values.get(request);
        const produtos = response.data.values || [];

        // Se houver um código na query, buscar apenas esse produto
        const { produto } = req.query;
        if (produto) {
            const produtoEncontrado = produtos.find(p => p[0] === produto);
            if (produtoEncontrado) {
                return res.status(200).json({
                    "Código": produtoEncontrado[0],
                    "Produto": produtoEncontrado[1],
                    "Preço de Venda": produtoEncontrado[6]
                });
            } else {
                return res.status(404).json({ message: "Produto não encontrado." });
            }
        }

        // Se não há código na query, retornar todos os produtos
        res.status(200).json({ estoque: produtos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar produtos.", error: error.message });
    }
}

// Função para autenticar no Google Sheets API
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

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });
    return sheets;
}

