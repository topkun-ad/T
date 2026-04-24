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
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = sheetMeta.data.sheets[0].properties.title;

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SPREADSHEET_ID) {
      return res.status(500).json({ error: 'Missing environment variables.' });
    }

    // 2. Handle HTTP Methods
    if (req.method === 'GET') {
      // Read tasks
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:J`,
      });
      
      const rows = response.data.values || [];
      const tasks = rows.map(row => ({
        task_id: row[0] || '',
        date: row[1] || '',
        cutoff_date: row[2] || '',
        title: row[3] || '',
        priority: row[4] || '',
        status: row[5] || '',
        due_time: row[6] || '',
        category: row[7] || '',
        created_at: row[8] || '',
        updated_at: row[9] || ''
      }));

      return res.status(200).json(tasks);

    } else if (req.method === 'POST') {
      // Create a new task
      const { task_id, date, cutoff_date, title, priority, status, due_time, category, created_at, updated_at } = req.body;
      
      const rowData = [
        task_id || Date.now().toString(),
        date || '',
        cutoff_date || '',
        title || '',
        priority || '',
        status || 'Pending',
        due_time || '',
        category || '',
        created_at || new Date().toISOString(),
        updated_at || new Date().toISOString()
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:J`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });

      return res.status(201).json({ success: true, message: 'Task added successfully.' });

    } else if (req.method === 'PUT' || req.method === 'DELETE') {
      // Both PUT and DELETE require finding the row first
      const taskId = req.query.id || req.body.task_id;
      if (!taskId) return res.status(400).json({ error: 'Task ID is required for updating or deleting.' });

      // Find the row index by reading column A
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
      });
      
      const rows = response.data.values || [];
      // rowIndex is 0-based. rows array might include the header at index 0.
      const rowIndex = rows.findIndex(row => row[0] === taskId);
      
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Task not found.' });
      }

      const rowNumber = rowIndex + 1; // Sheets is 1-based

      if (req.method === 'PUT') {
        const { date, cutoff_date, title, priority, status, due_time, category, created_at } = req.body;
        const rowData = [
          taskId,
          date || '',
          cutoff_date || '',
          title || '',
          priority || '',
          status || '',
          due_time || '',
          category || '',
          created_at || '',
          new Date().toISOString() // updated_at
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A${rowNumber}:J${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowData] }
        });

        return res.status(200).json({ success: true, message: 'Task updated successfully.' });
      } else if (req.method === 'DELETE') {
        // Fetch sheetId to perform row deletion
        const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
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

        return res.status(200).json({ success: true, message: 'Task deleted successfully.' });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
