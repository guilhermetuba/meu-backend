import { google } from 'googleapis';

export default function handler(req, res) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',  // Isso força gerar um novo Refresh Token
  });

  res.json({ authUrl });
}
