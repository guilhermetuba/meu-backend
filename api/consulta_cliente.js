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
            range: "Clientes!A2:B", // Alterado para buscar Nome (A) e CPF (B)
        };

        const response = await sheets.spreadsheets.values.get(request);
        const clientes = response.data.values || [];

        // Formatar os dados como uma lista de objetos com nome e CPF
        const clientesFormatados = clientes.map(cliente => ({
            nome: cliente[0], // Nome do cliente
            cpf: cliente[1]   // CPF do cliente
        }));

        res.status(200).json({ clientes: clientesFormatados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erro ao buscar clientes.", error: error.message });
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
