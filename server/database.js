
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'custody.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  // Custody Records Table
  db.run(`CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    detaineeName TEXT,
    age INTEGER,
    gender TEXT,
    dateTimeDetained TEXT,
    location TEXT,
    reason TEXT,
    status TEXT,
    policeStation TEXT,
    officerInCharge TEXT,
    riskLevel TEXT,
    isArchived INTEGER DEFAULT 0
  )`);

  // Logs Table
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    recordId TEXT,
    timestamp TEXT,
    action TEXT,
    performedBy TEXT,
    notes TEXT,
    isInternal INTEGER DEFAULT 0,
    FOREIGN KEY(recordId) REFERENCES records(id)
  )`);

  // Evidence Files Table
  db.run(`CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recordId TEXT,
    filename TEXT,
    type TEXT, -- 'MEDICAL' or 'EVIDENCE'
    FOREIGN KEY(recordId) REFERENCES records(id)
  )`);
});

module.exports = db;
