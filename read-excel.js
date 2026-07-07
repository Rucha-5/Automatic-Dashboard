const XLSX = require('xlsx');

// Read the workbook
const wb = XLSX.readFile('copy Sppl Pending as on 17th June 2026_.xlsx');

console.log('Sheet names:', wb.SheetNames);

// Get summary sheet data
const summarySheets = wb.SheetNames.filter(s => s.toLowerCase().includes('summary'));
const sheetToRead = summarySheets[0] || wb.SheetNames[0];

console.log('\n=== Reading:', sheetToRead, '===');

const ws = wb.Sheets[sheetToRead];
const data = XLSX.utils.sheet_to_json(ws);

console.log('Data rows:', data.length);
console.log('\nFirst few rows:');
console.log(JSON.stringify(data.slice(0, 15), null, 2));
