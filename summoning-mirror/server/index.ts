import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const CONFIG_PATH = path.join(__dirname, 'config', 'fandoms.json');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ANALYTICS_PATH = path.join(DATA_DIR, 'analytics.json');
const EMAILS_PATH = path.join(DATA_DIR, 'emails.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const FANDOMS_DIR = IS_PROD && fs.existsSync(path.join(DIST_DIR, 'fandoms'))
  ? path.join(DIST_DIR, 'fandoms')
  : path.join(__dirname, '..', 'public', 'fandoms');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

for (const dir of [UPLOADS_DIR, DATA_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/fandoms', express.static(FANDOMS_DIR));

// --- Types ---

interface Fandom {
  id: string;
  displayName: string;
  accentColor: string;
  sortOrder: number;
  stripImage: string;
  enabled: boolean;
}

interface Config {
  fandoms: Fandom[];
}

interface AnalyticsEvent {
  timestamp: string;
  event: string;
  fandomId: string;
  fandomName?: string;
}

interface AnalyticsData {
  totalCards: number;
  totalShares: number;
  totalEmails: number;
  fandomCounts: Record<string, { name: string; count: number }>;
  events: AnalyticsEvent[];
}

interface EmailEntry {
  email: string;
  fandomId: string;
  timestamp: string;
}

// --- Config helpers ---

function readConfig(): Config {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeConfig(config: Config): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

// --- Analytics helpers ---

function readAnalytics(): AnalyticsData {
  try {
    if (fs.existsSync(ANALYTICS_PATH)) {
      return JSON.parse(fs.readFileSync(ANALYTICS_PATH, 'utf-8'));
    }
  } catch { /* start fresh */ }
  return { totalCards: 0, totalShares: 0, totalEmails: 0, fandomCounts: {}, events: [] };
}

function writeAnalytics(data: AnalyticsData): void {
  fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function readEmails(): EmailEntry[] {
  try {
    if (fs.existsSync(EMAILS_PATH)) {
      return JSON.parse(fs.readFileSync(EMAILS_PATH, 'utf-8'));
    }
  } catch { /* start fresh */ }
  return [];
}

function writeEmails(emails: EmailEntry[]): void {
  fs.writeFileSync(EMAILS_PATH, JSON.stringify(emails, null, 2), 'utf-8');
}

// --- Admin Auth ---

const ADMIN_EMAIL = 'admin@houseofspells.com';
const ADMIN_PASSWORD = 'Admin@1234';

const activeSessions = new Map<string, { expiresAt: number }>();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!isValidSession(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (
    email?.toLowerCase() === ADMIN_EMAIL &&
    password === ADMIN_PASSWORD
  ) {
    const token = createSession();
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/session', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  res.json({ valid: isValidSession(token) });
});

// --- Constants ---

const LOCKED_IDS = ['marvel', 'star-wars'];
const PROTECTED_POSITIONS: Record<string, number> = {
  'marvel': 1,
  'star-wars': 2,
};

function createPlaceholderImage(fandomId: string): string {
  const filename = `${fandomId}.jpg`;
  const filepath = path.join(FANDOMS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    const minJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
      0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
      0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
      0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
      0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
      0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
      0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
      0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
      0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
      0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
      0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0xFF,
      0xD9
    ]);
    fs.writeFileSync(filepath, minJpeg);
  }

  return filename;
}

// --- PUBLIC API ---

app.get('/api/fandoms', (_req, res) => {
  const config = readConfig();
  const enabled = config.fandoms
    .filter((f) => f.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  res.json(enabled);
});

// --- ANALYTICS API ---

app.get('/api/analytics/counter', (_req, res) => {
  const data = readAnalytics();
  res.json({ totalCards: data.totalCards });
});

app.post('/api/analytics/track', (req, res) => {
  const { event, fandomId, fandomName } = req.body;
  if (!event || !fandomId) {
    return res.status(400).json({ error: 'event and fandomId required' });
  }

  const data = readAnalytics();
  const entry: AnalyticsEvent = {
    timestamp: new Date().toISOString(),
    event,
    fandomId,
    fandomName,
  };

  data.events.push(entry);

  if (event === 'card_generated') {
    data.totalCards++;
    if (!data.fandomCounts[fandomId]) {
      data.fandomCounts[fandomId] = { name: fandomName || fandomId, count: 0 };
    }
    data.fandomCounts[fandomId].count++;
  } else if (event === 'share') {
    data.totalShares++;
  }

  // Keep only last 10000 events to prevent unbounded growth
  if (data.events.length > 10000) {
    data.events = data.events.slice(-10000);
  }

  writeAnalytics(data);
  res.json({ success: true, totalCards: data.totalCards });
});

// --- EMAIL COLLECTION ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 50000;

app.post('/api/email/collect', (req, res) => {
  const { email, fandomId } = req.body;
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const emails = readEmails();

  if (emails.length >= MAX_EMAILS) {
    emails.splice(0, emails.length - MAX_EMAILS + 1000);
  }

  emails.push({
    email,
    fandomId: fandomId || 'unknown',
    timestamp: new Date().toISOString(),
  });

  writeEmails(emails);

  const analytics = readAnalytics();
  analytics.totalEmails = (analytics.totalEmails || 0) + 1;
  writeAnalytics(analytics);

  res.json({ success: true });
});

// --- ADMIN ANALYTICS ---

app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
  const data = readAnalytics();
  const emails = readEmails();

  const today = new Date().toISOString().slice(0, 10);
  const hourly: Record<string, number> = {};
  for (let h = 0; h < 24; h++) {
    hourly[h.toString().padStart(2, '0')] = 0;
  }

  for (const evt of data.events) {
    if (evt.timestamp.startsWith(today) && evt.event === 'card_generated') {
      const hour = evt.timestamp.slice(11, 13);
      hourly[hour] = (hourly[hour] || 0) + 1;
    }
  }

  const topFandoms = Object.entries(data.fandomCounts)
    .map(([id, info]) => ({ id, name: info.name, count: info.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  res.json({
    totalCards: data.totalCards,
    totalShares: data.totalShares,
    totalEmails: emails.length,
    fandomCounts: data.fandomCounts,
    hourly: Object.entries(hourly)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    topFandoms,
  });
});

// --- ADMIN FANDOM API ---

app.get('/api/admin/fandoms', requireAdmin, (_req, res) => {
  const config = readConfig();
  const sorted = config.fandoms.sort((a, b) => a.sortOrder - b.sortOrder);
  res.json(sorted);
});

app.post('/api/admin/fandoms', requireAdmin, (req, res) => {
  const config = readConfig();
  const { displayName, accentColor, sortOrder, enabled } = req.body;

  if (!displayName || !accentColor) {
    return res.status(400).json({ error: 'displayName and accentColor are required' });
  }

  const id = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (config.fandoms.find((f) => f.id === id)) {
    return res.status(409).json({ error: 'Fandom with this name already exists' });
  }

  const maxSort = Math.max(0, ...config.fandoms.map((f) => f.sortOrder));

  const stripImage = createPlaceholderImage(id);

  const newFandom: Fandom = {
    id,
    displayName,
    accentColor,
    sortOrder: sortOrder || maxSort + 1,
    stripImage,
    enabled: enabled !== false,
  };

  config.fandoms.push(newFandom);
  writeConfig(config);
  res.status(201).json(newFandom);
});

app.put('/api/admin/fandoms/:id', requireAdmin, (req, res) => {
  const config = readConfig();
  const idx = config.fandoms.findIndex((f) => f.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Fandom not found' });
  }

  const fandom = config.fandoms[idx];

  if (req.body.sortOrder !== undefined) {
    const targetPos = req.body.sortOrder;

    const lockedPos = PROTECTED_POSITIONS[fandom.id];
    if (lockedPos !== undefined && targetPos !== lockedPos) {
      return res.status(400).json({
        error: `${fandom.displayName} is locked to position ${lockedPos} (brand hierarchy)`,
      });
    }

    const posOwner = Object.entries(PROTECTED_POSITIONS).find(([, pos]) => pos === targetPos);
    if (posOwner && posOwner[0] !== fandom.id) {
      return res.status(400).json({
        error: `Position ${targetPos} is reserved for ${posOwner[0]} (brand hierarchy)`,
      });
    }

    if (targetPos !== fandom.sortOrder) {
      const displaced = config.fandoms.find(
        (f) => f.sortOrder === targetPos && f.id !== fandom.id
      );
      if (displaced) {
        displaced.sortOrder = fandom.sortOrder;
      }
    }
  }

  if (req.body.displayName !== undefined) fandom.displayName = req.body.displayName;
  if (req.body.accentColor !== undefined) fandom.accentColor = req.body.accentColor;
  if (req.body.sortOrder !== undefined) fandom.sortOrder = req.body.sortOrder;
  if (req.body.enabled !== undefined) fandom.enabled = req.body.enabled;

  writeConfig(config);
  res.json(fandom);
});

app.delete('/api/admin/fandoms/:id', requireAdmin, (req, res) => {
  if (LOCKED_IDS.includes(req.params.id)) {
    return res.status(403).json({ error: 'Cannot delete brand-hierarchy locked fandom' });
  }

  const config = readConfig();
  const idx = config.fandoms.findIndex((f) => f.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Fandom not found' });
  }

  config.fandoms.splice(idx, 1);
  writeConfig(config);
  res.json({ success: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FANDOMS_DIR),
  filename: (req, _file, cb) => {
    const config = readConfig();
    const fandom = config.fandoms.find((f) => f.id === req.params.id);
    if (fandom) {
      const ext = path.extname(_file.originalname) || '.jpg';
      cb(null, `${fandom.id}${ext}`);
    } else {
      cb(new Error('Fandom not found'), '');
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post('/api/admin/fandoms/:id/image', requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const config = readConfig();
  const fandom = config.fandoms.find((f) => f.id === req.params.id);
  if (!fandom) {
    return res.status(404).json({ error: 'Fandom not found' });
  }

  fandom.stripImage = req.file.filename;
  writeConfig(config);

  res.json({ success: true, filename: req.file.filename });
});

// In production, serve the Vite build output
if (IS_PROD && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

let configWatcher: fs.FSWatcher | null = null;
try {
  configWatcher = fs.watch(CONFIG_PATH, () => {
    console.log('[Config] fandoms.json changed, will serve fresh data on next request');
  });
} catch {
  console.log('[Config] Could not watch fandoms.json');
}

app.listen(PORT, () => {
  console.log(`\n  Summoning Mirror API running at http://localhost:${PORT}`);
  console.log(`  Fandoms config: ${CONFIG_PATH}`);
  console.log(`  Analytics: ${ANALYTICS_PATH}`);
  console.log(`  Emails: ${EMAILS_PATH}`);
  console.log(`  Fandom images: ${FANDOMS_DIR}\n`);
});

process.on('SIGTERM', () => {
  configWatcher?.close();
  process.exit(0);
});
