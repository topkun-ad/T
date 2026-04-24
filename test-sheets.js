require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testSheets() {
  try {
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

    console.log(`Testing spreadsheet ID: ${spreadsheetId}`);
    
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    console.log("SUCCESS! Spreadsheet Title: " + sheetMeta.data.properties.title);
    console.log("First Sheet Tab: " + sheetMeta.data.sheets[0].properties.title);

  } catch (error) {
    console.error("FAILED with error:", error.message);
  }
}

testSheets();
