require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function testSheets() {
  console.log("Checking environment variables...");
  console.log("EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "Exists" : "Missing");
  console.log("KEY:", process.env.GOOGLE_PRIVATE_KEY ? "Exists" : "Missing");
  console.log("SPREADSHEET_ID:", process.env.GOOGLE_SPREADSHEET_ID ? "Exists" : "Missing");

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
    const sheetName = 'FranklinDiary';

    console.log("Authenticating and fetching sheet metadata...");
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    console.log("Successfully fetched spreadsheet: " + sheetMeta.data.properties.title);
    
    console.log("Available sheet tabs:");
    sheetMeta.data.sheets.forEach(s => console.log(" - " + s.properties.title));

    const sheet = sheetMeta.data.sheets[0];
    const sheetName = sheet.properties.title;
    console.log(`SUCCESS: Using first sheet tab '${sheetName}'. ID: ${sheet.properties.sheetId}`);

    console.log("Fetching rows...");
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:J`,
    });
    console.log("SUCCESS: Rows fetched. Count: ", response.data.values ? response.data.values.length : 0);

  } catch (error) {
    console.error("FAILED with error:", error.message);
    if (error.response) {
      console.error("API Response data:", error.response.data);
    }
  }
}

testSheets();
