const { google } = require('googleapis');

export default async function handler(req, res) {
  try {
    // 1. Authenticate with Google Sheets API
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
      : undefined;

    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
       return res.status(500).json({ error: 'Missing GOOGLE_SPREADSHEET_ID' });
    }

    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = sheetMeta.data.sheets[0].properties.title;

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Missing environment variables.' });
    }

    // 2. Handle HTTP Methods
    if (req.method === 'GET') {
      // Read memos
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:C`,
      });
      
      const rows = response.data.values || [];
      const memos = rows.map(row => ({
        id: row[0] || '',
        text: row[1] || '',
        date: row[2] || ''
      }));

      return res.status(200).json(memos);

    } else if (req.method === 'POST') {
      // Create a new memo
      const { id, text, date } = req.body;
      
      const rowData = [
        id || Date.now().toString(),
        text || '',
        date || new Date().toLocaleString()
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:C`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });

      return res.status(201).json({ success: true, message: 'Memo added successfully.' });

    } else if (req.method === 'DELETE') {
      // Delete a memo
      const memoId = req.query.id || req.body.id;
      if (!memoId) return res.status(400).json({ error: 'Memo ID is required for deleting.' });

      // Find the row index by reading column A
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === memoId);
      
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Memo not found.' });
      }

      // Fetch sheetId to perform row deletion
      const sheet = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
      if (!sheet) return res.status(404).json({ error: 'Sheet not found.' });
      
      const sheetId = sheet.properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex, // 0-based index corresponds to actual row
                endIndex: rowIndex + 1
              }
            }
          }]
        }
      });

      return res.status(200).json({ success: true, message: 'Memo deleted successfully.' });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
