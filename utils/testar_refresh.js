const { google } = require("googleapis");

async function authenticate() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  return { oauth2Client, sheets: google.sheets({ version: "v4", auth: oauth2Client }) };
}

async function testarSheets() {
  try {
    const { oauth2Client, sheets } = await authenticate();

    // Verifica e loga o token atual
    const tokenInfo = await oauth2Client.getAccessToken();
    console.log("Access Token atual:", tokenInfo?.token || "(não disponível)");

    // Faz uma chamada de teste à sua planilha
    const res = await sheets.spreadsheets.get({
      spreadsheetId: "1-r5uYv0yTB3__2rrHNLiosd2mFHHCdJAjwMdvxUKXRQ",
    });

    console.log("Acesso bem-sucedido ao Google Sheets!");
    console.log("Título da planilha:", res.data.properties.title);
  } catch (error) {
    console.error("❌ Erro ao acessar Google Sheets:");
    if (error.response) {
      console.error("Código HTTP:", error.response.status);
      console.error("Mensagem:", error.response.data.error);
    } else {
      console.error("Erro genérico:", error.message);
    }
  }
}

testarSheets();
