
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename to prevent issues
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({ storage: storage });

// Helper: Get logs for a record
const getLogsForRecord = (recordId) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM logs WHERE recordId = ? ORDER BY timestamp DESC`, [recordId], (err, rows) => {
      if (err) reject(err);
      resolve(rows ? rows.map(row => ({ ...row, isInternal: !!row.isInternal })) : []);
    });
  });
};

// Helper: Get files for a record
const getFilesForRecord = (recordId) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM evidence WHERE recordId = ?`, [recordId], (err, rows) => {
      if (err) reject(err);
      resolve(rows || []);
    });
  });
};

// --- API ROUTES ---

// Get All Records (with logs and files)
app.get('/api/records', (req, res) => {
  db.all(`SELECT * FROM records WHERE isArchived = 0`, [], async (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      const records = await Promise.all((rows || []).map(async (record) => {
        const logs = await getLogsForRecord(record.id);
        const files = await getFilesForRecord(record.id);
        return {
          ...record,
          isArchived: !!record.isArchived,
          logs: logs,
          medicalDocuments: files.filter(f => f.type === 'MEDICAL').map(f => f.filename),
          evidenceUrls: files.filter(f => f.type === 'EVIDENCE').map(f => f.filename)
        };
      }));
      res.json(records);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
});

// Create Record
app.post('/api/records', (req, res) => {
  const r = req.body;
  const stmt = db.prepare(`INSERT INTO records (id, detaineeName, age, gender, dateTimeDetained, location, reason, status, policeStation, officerInCharge, riskLevel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run([r.id, r.detaineeName, r.age, r.gender, r.dateTimeDetained, r.location, r.reason, r.status, r.policeStation, r.officerInCharge, r.riskLevel], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // Add Initial Log
    if (r.logs && r.logs.length > 0) {
      const log = r.logs[0];
      db.run(`INSERT INTO logs (id, recordId, timestamp, action, performedBy, notes, isInternal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [log.id, r.id, log.timestamp, log.action, log.performedBy, log.notes || '', 0],
        (err) => {
          if (!err) {
            io.emit('record_update', { type: 'CREATE', id: r.id });
            res.status(201).json({ id: r.id });
          }
        }
      );
    } else {
      io.emit('record_update', { type: 'CREATE', id: r.id });
      res.status(201).json({ id: r.id });
    }
  });
  stmt.finalize();
});

// Update Record (Generic)
app.put('/api/records/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body.updates;
  const log = req.body.log;

  // Dynamic SQL generation for updates
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);

  if (fields.length > 0) {
    db.run(`UPDATE records SET ${fields} WHERE id = ?`, [...values, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
    });
  }

  // Add Log
  if (log) {
    db.run(`INSERT INTO logs (id, recordId, timestamp, action, performedBy, notes, isInternal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [log.id, id, log.timestamp, log.action, log.performedBy, log.notes || '', log.isInternal ? 1 : 0],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        io.emit('record_update', { type: 'UPDATE', id: id });
        res.json({ success: true });
      }
    );
  } else {
    // Emit update even if no log (unlikely in this app flow but safe)
    io.emit('record_update', { type: 'UPDATE', id: id });
    res.json({ success: true });
  }
});

// Archive Record
app.put('/api/records/:id/archive', (req, res) => {
  db.run(`UPDATE records SET isArchived = 1 WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('record_update', { type: 'ARCHIVE', id: req.params.id });
    res.json({ success: true });
  });
});

// Upload File
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { recordId, type } = req.body;
  if (!req.file) return res.status(400).send('No file uploaded.');

  db.run(`INSERT INTO evidence (recordId, filename, type) VALUES (?, ?, ?)`,
    [recordId, req.file.filename, type],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('record_update', { type: 'UPLOAD', id: recordId });
      res.json({ filename: req.file.filename });
    }
  );
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
