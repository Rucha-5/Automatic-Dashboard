const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

console.log('[Server] Initializing SPPL Dashboard Server...');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.memoryStorage() });

function removeExistingExcelFiles(directory = uploadDir) {
  if (!fs.existsSync(directory)) {
    return;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.isFile() && /\.(xlsx|xlsm|xls)$/i.test(entry.name)) {
      fs.unlinkSync(path.join(directory, entry.name));
    }
  });
}

function saveUploadedWorkbook(buffer, originalName, directory = uploadDir) {
  const extension = path.extname(originalName) || '.xlsx';
  const fileName = `uploaded-workbook${extension}`;
  const filePath = path.join(directory, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function findLatestExcelFile(searchDirs = [uploadDir]) {
  const allExcelFiles = searchDirs.flatMap((directory) => {
    if (!fs.existsSync(directory)) {
      return [];
    }

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && /\.(xlsx|xlsm|xls)$/i.test(entry.name))
      .map((entry) => path.join(directory, entry.name));
  });

  if (allExcelFiles.length === 0) {
    return null;
  }

  return allExcelFiles
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0].file;
}

const MODULE_ALIASES = {
  pms: 'PMS',
  certificates: 'Certificates',
  ceriticates: 'Certificates',
  ceritificates: 'Certificates',
  defects: 'Defects',
  vir: 'Vir',
  auditreports: 'Audit Reports',
  inspectionreports: 'Inspection Reports'
};

// Maps each Summary sheet category to the workbook sheet holding its detail
// records. Keyed by the category label normalized to lowercase letters only,
// since labels vary in spacing/casing/typos between the Summary sheet and
// the category names visible in the app.
const CATEGORY_SHEET_MAP = {
  criticaljobsdaysoverdue: 'Critical Jobs > 10 Days',
  criticaljobshoursoverdue: ' Critical Jobs > 200 Hrs',
  noncriticaljobsmonthoverdue: 'Non Critical Jobs > 1 Month',
  noncriticaljobshoursoverdue: 'Non-Critical Jobs > 500 Hrs',
  counternotupdated: 'Counters Not Updated',
  criticalspareslessthanminstock: 'Critical Spares < Min. Stock',
  wospendingtsiapproval: "WO's Awaiting Approval",
  expiredcertificates: 'Expired Certificates',
  pendingapprovalceritificates: 'Certificates Awaiting Approval',
  overduesurveys: 'Overdue Surveys',
  hm: 'Expired Defects',
  virdefects: 'Vir defects',
  virmainreports: 'VIR Reports',
  iaispsismreportsotheraudits: 'Audit Reports',
  allinspections: 'All inspections'
};

function normalizeLabel(label) {
  return String(label || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
}

function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return Number.isNaN(date.getTime()) ? serial : date.toISOString().split('T')[0];
}

// Detail sheets consistently have a near-empty "Back to summary" nav row
// first, the real column headers on the next row, then data rows.
function readDetailSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;

  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const headerRowIndex = raw.findIndex((row) => row.filter((cell) => cell !== '').length >= 3);
  if (headerRowIndex === -1) return { headers: [], rows: [] };

  const headers = raw[headerRowIndex].map((h, i) => (h || `Column ${i + 1}`).toString().trim());
  const rows = raw
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, i) => {
        let value = row[i];
        if (value === undefined) value = '';
        if (typeof value === 'number' && /date|time|surveyed|reported|completed|closed/i.test(header)) {
          value = excelSerialToDate(value);
        }
        if (value === true) value = 'Yes';
        if (value === false) value = 'No';
        record[header] = value;
      });
      return record;
    });

  return { headers, rows };
}

function getWorkbook() {
  const excelFile = findLatestExcelFile([uploadDir, __dirname]);
  if (!excelFile) {
    throw new Error('No Excel file found. Please upload an Excel workbook.');
  }
  return { wb: XLSX.readFile(excelFile), excelFile };
}

function processData(rawData) {
  const modules = {
    PMS: [],
    Certificates: [],
    Defects: [],
    Vir: [],
    'Audit Reports': [],
    'Inspection Reports': []
  };

  let currentModule = null;

  rawData.forEach((row) => {
    if (row.__EMPTY) {
      const label = row.__EMPTY.trim();
      const normalized = normalizeLabel(label);
      const module = MODULE_ALIASES[normalized];
      if (module) {
        currentModule = module;
        console.log(`[Server] Found module: ${label} -> ${module}`);
        if (!row.__EMPTY_1) return;
        // some modules (e.g. Audit Reports, Inspection Reports) put the
        // module label and its single category on the same row
      } else if (!row.__EMPTY_1) {
        console.warn(`[Server] Unrecognized module label, skipping row: "${label}"`);
        return;
      }
    }

    if (!row.__EMPTY_1) return;

    if (!currentModule) {
      console.warn(`[Server] Category row found before any module was set, skipping: "${row.__EMPTY_1}"`);
      return;
    }

    const category = row.__EMPTY_1;
    const dataPoint = {
      category,
      week9: row.__EMPTY_2 || 0,
      week8: row.__EMPTY_3 || 0,
      week7: row.SPPL_OVERDUE_REPORTS || row['SPPL OVERDUE REPORTS'] || 0,
      week6: row.__EMPTY_4 || 0,
      week5: row.__EMPTY_5 || 0,
      week4: row.__EMPTY_6 || 0,
      week3: row.__EMPTY_7 || 0,
      week2: row.__EMPTY_8 || 0,
      week1: row.__EMPTY_9 || 0
    };

    Object.keys(dataPoint).forEach((key) => {
      if (dataPoint[key] === 'Nil' || dataPoint[key] === 'Nil ') {
        dataPoint[key] = 0;
      }
    });

    if (currentModule && modules[currentModule]) {
      modules[currentModule].push(dataPoint);
    }
  });

  return modules;
}

function loadDashboardData() {
  const { wb, excelFile } = getWorkbook();
  console.log(`[Server] Reading Excel file: ${path.relative(__dirname, excelFile)}`);
  console.log(`[Server] Sheets found: ${wb.SheetNames.join(', ')}`);

  const sheetName = wb.SheetNames.find((sheet) => sheet.toLowerCase().includes('summary')) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(ws);
  console.log(`[Server] Raw data rows: ${rawData.length}`);

  const dashboardData = processData(rawData);
  console.log('[Server] Data processing complete');
  console.log(`[Server] PMS items: ${dashboardData.PMS.length}`);
  console.log(`[Server] Certificates items: ${dashboardData.Certificates.length}`);
  console.log(`[Server] Defects items: ${dashboardData.Defects.length}`);

  return { dashboardData, excelFile };
}

app.get('/api/dashboard', (req, res) => {
  try {
    console.log('[API] GET /api/dashboard');
    const { dashboardData } = loadDashboardData();
    res.json(dashboardData);
  } catch (error) {
    console.error('[API] GET /api/dashboard error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/module/:moduleName', (req, res) => {
  try {
    const module = req.params.moduleName;
    console.log(`[API] GET /api/module/${module}`);
    const { dashboardData } = loadDashboardData();

    if (dashboardData[module]) {
      res.json(dashboardData[module]);
    } else {
      res.status(404).json({ error: 'Module not found' });
    }
  } catch (error) {
    console.error(`[API] GET /api/module/${req.params.moduleName} error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/detail/:category', (req, res) => {
  try {
    const { category } = req.params;
    console.log(`[API] GET /api/detail/${category}`);
    const sheetName = CATEGORY_SHEET_MAP[normalizeLabel(category)];

    if (!sheetName) {
      return res.status(404).json({ error: `No detail sheet mapped for category "${category}"` });
    }

    const { wb } = getWorkbook();
    const detail = readDetailSheet(wb, sheetName);

    if (!detail) {
      return res.status(404).json({ error: `Sheet "${sheetName}" not found in workbook` });
    }

    console.log(`[Server] Detail sheet "${sheetName}": ${detail.rows.length} rows`);
    res.json({ sheet: sheetName, ...detail });
  } catch (error) {
    console.error(`[API] GET /api/detail/${req.params.category} error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file was provided.' });
    }

    removeExistingExcelFiles();
    const savedFilePath = saveUploadedWorkbook(req.file.buffer, req.file.originalname);
    console.log(`[API] Upload complete: ${path.basename(savedFilePath)}`);

    const { dashboardData } = loadDashboardData();
    res.json({
      message: 'Excel sheet uploaded successfully.',
      file: path.basename(savedFilePath),
      modules: Object.keys(dashboardData)
    });
  } catch (error) {
    console.error('[API] Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const staticDir = fs.existsSync(path.join(__dirname, 'dist'))
  ? path.join(__dirname, 'dist')
  : path.join(__dirname, 'public');

app.use(express.static(staticDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('[Server] ✅ Dashboard server running on http://localhost:' + PORT);
    console.log('[Server] Ready to accept requests!');
  });
}

module.exports = {
  findLatestExcelFile,
  processData,
  loadDashboardData,
  removeExistingExcelFiles,
  saveUploadedWorkbook,
  readDetailSheet,
  getWorkbook,
  normalizeLabel,
  CATEGORY_SHEET_MAP
};

