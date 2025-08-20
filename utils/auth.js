// auth.js

const { google } = require("googleapis");

async function authenticate() {
  // Pega o JSON que você colocou no Vercel em GOOGLE_SERVICE_ACCOUNT
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

module.exports = authenticate;
