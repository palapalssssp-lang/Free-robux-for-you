const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const CORRECT_PIN = '312312322';

// Pastikan folder recordings ada
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Setup multer untuk upload video
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RECORDINGS_DIR);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '.webm');
  }
});
const upload = multer({ storage });

// ===== API =====

// Cek PIN
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  if (pin === CORRECT_PIN) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Kode salah' });
});

// Upload rekaman
app.post('/api/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file' });
  }

  const meta = {
    id: path.basename(req.file.filename, '.webm'),
    filename: req.file.filename,
    originalName: req.body.name || 'Rekaman',
    type: req.body.type || 'screen',
    date: new Date().toISOString(),
    size: req.file.size
  };

  // Simpan metadata
  const metaPath = path.join(RECORDINGS_DIR, meta.id + '.json');
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  res.json({ success: true, recording: meta });
});

// Ambil semua rekaman (harus kasih PIN)
app.post('/api/recordings', (req, res) => {
  const { pin } = req.body;
  if (pin !== CORRECT_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.json'));
  const list = files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(RECORDINGS_DIR, f), 'utf8'));
    return data;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json(list);
});

// Download / stream video
app.get('/api/video/:id', (req, res) => {
  const filePath = path.join(RECORDINGS_DIR, req.params.id + '.webm');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(filePath);
});

// Hapus rekaman
app.post('/api/delete', (req, res) => {
  const { pin, id } = req.body;
  if (pin !== CORRECT_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const videoPath = path.join(RECORDINGS_DIR, id + '.webm');
  const metaPath = path.join(RECORDINGS_DIR, id + '.json');

  if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});