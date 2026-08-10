import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'database.json');

const app = express();
app.use(cors());
app.use(express.json());

const MANUALES_DIR = path.join(path.dirname(__dirname), 'manuales');
if (!fs.existsSync(MANUALES_DIR)) {
  fs.mkdirSync(MANUALES_DIR);
}
app.use('/manuales', express.static(MANUALES_DIR));

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    settings: {
      consumerKey: '',
      consumerSecret: '',
      storeUrl: 'https://'
    },
    profiles: {
      'admin': { id: 'admin', name: 'Administrador', role: 'admin', pin: '1234' },
      'produccion': { id: 'produccion', name: 'Equipo de Producción', role: 'production', pin: '1111' },
      'logistica': { id: 'logistica', name: 'Repartidor', role: 'delivery', pin: '2222' }
    },
    logs: [],
    customStatuses: []
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// API Settings Endpoints
app.get('/api/settings', (req, res) => {
  const db = readDB();
  res.json(db.settings || {});
});

app.post('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = { ...db.settings, ...req.body };
  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// Profiles Endpoints
app.get('/api/profiles', (req, res) => {
  const db = readDB();
  res.json(db.profiles || {});
});

app.post('/api/profiles', (req, res) => {
  const db = readDB();
  db.profiles = req.body;
  writeDB(db);
  res.json({ success: true, profiles: db.profiles });
});

// Logs Endpoints
app.get('/api/logs', (req, res) => {
  const db = readDB();
  res.json(db.logs || []);
});

app.post('/api/logs', (req, res) => {
  const db = readDB();
  if (!db.logs) db.logs = [];
  
  const newLog = {
    ...req.body,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  };
  
  db.logs.push(newLog);
  writeDB(db);
  res.json({ success: true, log: newLog });
});

// Custom Statuses Endpoints
app.get('/api/custom-statuses', (req, res) => {
  const db = readDB();
  res.json(db.customStatuses || []);
});

app.post('/api/custom-statuses', (req, res) => {
  const db = readDB();
  db.customStatuses = req.body;
  writeDB(db);
  res.json({ success: true, customStatuses: db.customStatuses });
});

// Manuals Endpoint
app.get('/api/manuals/:productId', (req, res) => {
  const { productId } = req.params;
  
  try {
    const files = fs.readdirSync(MANUALES_DIR);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const videoExtensions = ['.mp4', '.mov', '.webm'];
    
    const imageFile = files.find(f => {
      const p = f.split('.');
      return p[0] === productId && imageExtensions.includes('.' + p[p.length - 1].toLowerCase());
    });
    
    const videoFile = files.find(f => {
      const p = f.split('.');
      return p[0] === productId && videoExtensions.includes('.' + p[p.length - 1].toLowerCase());
    });

    res.json({
      image: imageFile ? `/manuales/${imageFile}` : null,
      video: videoFile ? `/manuales/${videoFile}` : null
    });
  } catch (err) {
    res.json({ image: null, video: null });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Internal DB server running on http://localhost:${PORT}`);
});
