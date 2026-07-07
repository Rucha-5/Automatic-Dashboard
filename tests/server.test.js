const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { removeExistingExcelFiles, saveUploadedWorkbook } = require('../server');

test('removeExistingExcelFiles removes old workbook files and saveUploadedWorkbook stores the new one', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-upload-'));
  const oldFile = path.join(tempDir, 'old-workbook.xlsx');
  fs.writeFileSync(oldFile, 'old');

  removeExistingExcelFiles(tempDir);
  assert.equal(fs.existsSync(oldFile), false);

  const uploadedFilePath = path.join(tempDir, 'uploaded-workbook.xlsx');
  const buffer = Buffer.from('new workbook');
  saveUploadedWorkbook(buffer, 'new-workbook.xlsx', tempDir);

  assert.equal(fs.existsSync(uploadedFilePath), true);
  assert.equal(fs.readFileSync(uploadedFilePath).toString(), 'new workbook');
});
