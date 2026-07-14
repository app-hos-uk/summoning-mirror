import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const CARDS_DIR = path.join(UPLOADS_DIR, 'cards');
const ANALYTICS_PATH = path.join(DATA_DIR, 'analytics.json');
const EMAILS_PATH = path.join(DATA_DIR, 'emails.json');
const PHOTOS_PATH = path.join(DATA_DIR, 'photos.json');

// Persistent config + images: live on the volume so admin changes survive redeploys
const CONFIG_PATH = path.join(DATA_DIR, 'fandoms.json');
const FANDOMS_DIR = path.join(DATA_DIR, 'fandoms');

// Bundled defaults shipped with the image (read-only after build)
const BUNDLED_CONFIG = path.join(__dirname, 'config', 'fandoms.json');
const BUNDLED_FANDOMS_CANDIDATES = [
  path.join(DIST_DIR, 'fandoms'),
  path.join(__dirname, '..', 'public', 'fandoms'),
];
const BUNDLED_FANDOMS = BUNDLED_FANDOMS_CANDIDATES.find((p) => fs.existsSync(p)) || null;

for (const dir of [UPLOADS_DIR, CARDS_DIR, DATA_DIR, FANDOMS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Seed persistent config from bundled defaults on first run
if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(BUNDLED_CONFIG)) {
  fs.copyFileSync(BUNDLED_CONFIG, CONFIG_PATH);
  console.log('[Config] Seeded fandoms.json from bundled defaults');
}

// Seed persistent fandom images from bundled defaults on first run
if (BUNDLED_FANDOMS) {
  try {
    for (const file of fs.readdirSync(BUNDLED_FANDOMS)) {
      const src = path.join(BUNDLED_FANDOMS, file);
      if (!fs.statSync(src).isFile()) continue;
      const dest = path.join(FANDOMS_DIR, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
        console.log(`[Config] Seeded fandom image: ${file}`);
      }
    }
  } catch (err) {
    console.error('[Config] Failed to seed fandom images:', err);
  }
} else {
  console.warn('[Config] No bundled fandom images found to seed');
}

const CORS_ORIGIN = IS_PROD ? (process.env.BASE_URL || false) : true;
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
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
  firstName?: string;
  photoId?: string;
  wishText?: string;
  preferredFandom?: string;
  timestamp: string;
}

interface PhotoEntry {
  id: string;
  filename: string;
  emailCardFilename?: string;
  fandomId: string;
  fandomName: string;
  guestName?: string;
  wishText?: string;
  captureMode?: string;
  serialNumber: string;
  visitOrdinal: number;
  fandomOrdinal: number;
  ugcCode: string;
  statusTier: string;
  email?: string;
  firstName?: string;
  preferredFandom?: string;
  lifecycleDaysSent?: number[];
  passportViews?: number;
  createdAt: string;
}

// --- Config helpers ---

function readConfig(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Config] Failed to read fandoms.json:', err);
    return { fandoms: [] };
  }
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

// --- Photo storage helpers ---

function readPhotos(): PhotoEntry[] {
  try {
    if (fs.existsSync(PHOTOS_PATH)) {
      return JSON.parse(fs.readFileSync(PHOTOS_PATH, 'utf-8'));
    }
  } catch { /* start fresh */ }
  return [];
}

function writePhotos(photos: PhotoEntry[]): void {
  fs.writeFileSync(PHOTOS_PATH, JSON.stringify(photos, null, 2), 'utf-8');
}

function getPhotoById(id: string): PhotoEntry | undefined {
  return readPhotos().find((p) => p.id === id);
}

function getPhotoFilePath(photo: PhotoEntry): string {
  return path.join(CARDS_DIR, photo.filename);
}

function deletePhotoFiles(photo: PhotoEntry): void {
  const paths = [getPhotoFilePath(photo)];
  if (photo.emailCardFilename) {
    paths.push(path.join(CARDS_DIR, photo.emailCardFilename));
  }
  for (const filePath of paths) {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
}

// --- Email transport (configurable via admin UI or env vars) ---

const SMTP_SETTINGS_PATH = path.join(DATA_DIR, 'smtp-settings.json');

interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
}

function loadSmtpSettings(): SmtpSettings {
  try {
    if (fs.existsSync(SMTP_SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SMTP_SETTINGS_PATH, 'utf-8'));
    }
  } catch { /* use defaults */ }
  return { host: '', port: '', user: '', pass: '', from: '' };
}

function saveSmtpSettings(settings: SmtpSettings): void {
  fs.writeFileSync(SMTP_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

function getSmtpConfig() {
  const saved = loadSmtpSettings();
  const host = saved.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(saved.port || process.env.SMTP_PORT || '587', 10);
  const user = saved.user || process.env.SMTP_USER || '';
  const pass = saved.pass || process.env.SMTP_PASS || '';
  const from = saved.from || process.env.SMTP_FROM || 'House of Spells NYC';
  return { host, port, user, pass, from };
}

function createSmtpTransport() {
  const cfg = getSmtpConfig();
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: false,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
}

let smtpTransport = createSmtpTransport();

function getSmtpFrom(): string {
  const cfg = getSmtpConfig();
  return cfg.from;
}

function getSmtpUser(): string {
  const cfg = getSmtpConfig();
  return cfg.user;
}

function isSmtpConfigured(): boolean {
  const cfg = getSmtpConfig();
  return Boolean(cfg.user && cfg.pass);
}

function getSmtpFromAddress(): string {
  const cfg = getSmtpConfig();
  return `"${cfg.from}" <${cfg.user}>`;
}
const SOCIAL_HANDLE = '@houseofspellsnyc';
const FOUNDER_URL = 'https://houseofspells.com/register';
const VISIT_URL = 'https://houseofspells.com/nyc';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

type StatusTier = 'pioneer' | 'summoner' | 'archivist';

function getStatusTier(visitOrdinal: number): StatusTier {
  if (visitOrdinal <= 100) return 'pioneer';
  if (visitOrdinal <= 500) return 'summoner';
  return 'archivist';
}

function formatSerialNumber(ordinal: number): string {
  return `HOS-NYC-${String(ordinal).padStart(5, '0')}`;
}

function generateUgcCode(ordinal: number): string {
  const base = ordinal.toString(36).toUpperCase().padStart(4, '0');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `HOS-${base}${rand}`;
}

function getPassportUrl(photoId: string): string {
  return `${BASE_URL}/card/${photoId}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPhotoEmailHtml(
  firstName: string,
  fandomName: string,
  passportUrl: string,
  ugcCode: string,
  statusTier: string
): string {
  const safeName = escapeHtml(firstName);
  const safeFandom = escapeHtml(fandomName);
  const safeUrl = escapeHtml(passportUrl);
  const safeCode = escapeHtml(ugcCode);
  const tierLabel = statusTier === 'pioneer' ? 'Pioneer Fan'
    : statusTier === 'summoner' ? 'Summoner' : 'Archivist';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0C1428;font-family:Georgia,serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0C1428;">
    <tr>
      <td style="padding:32px 24px;text-align:center;">
        <h1 style="color:#C5A55A;font-size:22px;letter-spacing:0.15em;margin:0 0 8px;">THE SUMMONING MIRROR</h1>
        <p style="color:rgba(197,165,90,0.6);font-size:13px;letter-spacing:0.1em;margin:0;">House of Spells NYC</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px;text-align:center;">
        <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hey ${safeName}!</p>
        <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85);margin:0 0 24px;">
          Here's your <strong style="color:#C5A55A;">${safeFandom}</strong> fan card from the Summoning Mirror.
          You're a <strong style="color:#C5A55A;">${tierLabel}</strong>! Share it and tag us!
        </p>
        <img src="cid:summoning-card" alt="Your Summoning Mirror Card" style="max-width:100%;border:2px solid rgba(197,165,90,0.3);border-radius:4px;" />
      </td>
    </tr>
    <tr>
      <td style="padding:24px 24px;text-align:center;">
        <p style="font-size:13px;color:rgba(197,165,90,0.7);margin:0 0 8px;">Your Digital Passport</p>
        <a href="${safeUrl}" style="color:#C5A55A;font-size:14px;text-decoration:none;letter-spacing:0.08em;">${safeUrl}</a>
        <p style="font-size:13px;color:rgba(197,165,90,0.7);margin:16px 0 8px;">Share-to-Earn Code</p>
        <p style="font-size:18px;color:#C5A55A;font-weight:bold;letter-spacing:0.15em;margin:0;">${safeCode}</p>
        <p style="font-size:12px;color:rgba(197,165,90,0.5);margin:8px 0 0;">Tag ${SOCIAL_HANDLE} + #CurateYourUniverse to unlock perks</p>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;text-align:center;">
        <p style="font-size:14px;color:#C5A55A;margin:0 0 8px;">Instagram &amp; TikTok: ${SOCIAL_HANDLE}</p>
        <p style="font-size:13px;color:rgba(197,165,90,0.7);margin:0 0 24px;">
          #CurateYourUniverse #HouseOfSpellsNYC #SummoningMirror
        </p>
        <a href="${FOUNDER_URL}" style="display:inline-block;padding:12px 28px;border:2px solid #C5A55A;color:#C5A55A;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:0.12em;margin-bottom:12px;">
          BECOME A FOUNDING MEMBER
        </a>
        <br />
        <a href="${VISIT_URL}" style="color:rgba(197,165,90,0.6);font-size:12px;text-decoration:none;">
          Visit us at houseofspells.com/nyc
        </a>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildLifecycleEmailHtml(
  firstName: string,
  day: number,
  fandomName: string,
  passportUrl: string,
  ugcCode: string
): { subject: string; html: string } {
  const safeName = escapeHtml(firstName);
  const safeFandom = escapeHtml(fandomName);
  const safeUrl = escapeHtml(passportUrl);
  const safeCode = escapeHtml(ugcCode);

  const messages: Record<number, { subject: string; body: string }> = {
    1: {
      subject: 'Your Summoning Mirror card is waiting ✨',
      body: `Your <strong style="color:#C5A55A;">${safeFandom}</strong> fan card is ready to share! Post it, tag ${SOCIAL_HANDLE}, and show your code <strong style="color:#C5A55A;">${safeCode}</strong> in-store for perks.`,
    },
    3: {
      subject: 'Collect all fandoms — 3 days since your visit',
      body: `Hey ${safeName}, fans are collecting cards from every universe at House of Spells NYC. Come back to the Summoning Mirror and add another fandom to your passport!`,
    },
    7: {
      subject: 'Become a Founding Member — exclusive NYC access',
      body: `One week since you curated your universe! Founding Members get early access to Fan Curation Days events. Your passport is always at <a href="${safeUrl}" style="color:#C5A55A;">${safeUrl}</a>.`,
    },
    30: {
      subject: 'Fan Curation Days recap — your universe awaits',
      body: `A month ago you summoned your ${safeFandom} card at Times Square. Revisit House of Spells NYC and curate a new universe. Share with #CurateYourUniverse!`,
    },
  };

  const msg = messages[day] || messages[1];
  return {
    subject: msg.subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0C1428;font-family:Georgia,serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0C1428;">
    <tr><td style="padding:32px 24px;text-align:center;">
      <h1 style="color:#C5A55A;font-size:20px;letter-spacing:0.12em;margin:0;">THE SUMMONING MIRROR</h1>
    </td></tr>
    <tr><td style="padding:0 24px 32px;text-align:center;">
      <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85);">${msg.body}</p>
      <a href="${safeUrl}" style="display:inline-block;margin-top:16px;padding:12px 28px;border:2px solid #C5A55A;color:#C5A55A;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:0.12em;">VIEW YOUR PASSPORT</a>
      <br /><a href="${FOUNDER_URL}" style="display:inline-block;margin-top:12px;color:rgba(197,165,90,0.6);font-size:12px;text-decoration:none;">Become a Founding Member</a>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

// --- Admin Auth ---

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@houseofspells.com').toLowerCase();
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (IS_PROD ? '' : 'Admin@1234');
const ADMIN_PW_PATH = path.join(DATA_DIR, 'admin-password.json');
const MIN_PASSWORD_LENGTH = 8;

interface StoredPassword {
  hash: string;
  salt: string;
  updatedAt: string;
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(32).toString('hex');
  const derived = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash: derived, salt: s };
}

function verifyPassword(password: string, stored: StoredPassword): boolean {
  const { hash } = hashPassword(password, stored.salt);
  if (hash.length !== stored.hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(stored.hash));
}

function loadStoredPassword(): StoredPassword | null {
  try {
    if (fs.existsSync(ADMIN_PW_PATH)) {
      return JSON.parse(fs.readFileSync(ADMIN_PW_PATH, 'utf-8'));
    }
  } catch { /* corrupt file, fall through */ }
  return null;
}

function saveStoredPassword(password: string): StoredPassword {
  const { hash, salt } = hashPassword(password);
  const stored: StoredPassword = { hash, salt, updatedAt: new Date().toISOString() };
  fs.writeFileSync(ADMIN_PW_PATH, JSON.stringify(stored, null, 2), 'utf-8');
  return stored;
}

// On first run, seed the password hash from the env var
let storedPassword = loadStoredPassword();
if (!storedPassword && ENV_ADMIN_PASSWORD) {
  storedPassword = saveStoredPassword(ENV_ADMIN_PASSWORD);
  console.log('[Auth] Seeded admin password hash from environment variable');
}

function checkAdminPassword(password: string): boolean {
  if (storedPassword) return verifyPassword(password, storedPassword);
  if (!ENV_ADMIN_PASSWORD) return false;
  return ENV_ADMIN_PASSWORD.length === password.length &&
    crypto.timingSafeEqual(Buffer.from(ENV_ADMIN_PASSWORD), Buffer.from(password));
}

const activeSessions = new Map<string, { expiresAt: number }>();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const loginRateMap = new Map<string, { count: number; resetAt: number }>();

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

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isValidSession(extractToken(req))) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const ip = clientIp(req);
  if (!checkRateLimit(loginRateMap, ip, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  if (!storedPassword && !ENV_ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin access not configured' });
  }

  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password required' });
  }

  if (email.toLowerCase() === ADMIN_EMAIL && checkAdminPassword(password)) {
    const token = createSession();
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  const token = extractToken(req);
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/session', (req, res) => {
  res.json({ valid: isValidSession(extractToken(req)) });
});

app.post('/api/admin/change-password', (req, res) => {
  const callerToken = extractToken(req);
  if (!isValidSession(callerToken)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }

  if (!checkAdminPassword(currentPassword)) {
    return res.status(403).json({ error: 'Current password is incorrect' });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'New password must be different from current password' });
  }

  storedPassword = saveStoredPassword(newPassword);

  // Invalidate all sessions except the caller's
  for (const [t] of activeSessions) {
    if (t !== callerToken) activeSessions.delete(t);
  }

  console.log('[Auth] Admin password changed successfully');
  res.json({ success: true });
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

// --- Rate limiting (in-memory, kiosk-scale) ---

const uploadRateMap = new Map<string, { count: number; resetAt: number }>();
const emailRateMap = new Map<string, { count: number; resetAt: number }>();
const trackRateMap = new Map<string, { count: number; resetAt: number }>();
const emailCollectRateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function sweepExpiredEntries(): void {
  const now = Date.now();
  for (const map of [uploadRateMap, emailRateMap, trackRateMap, emailCollectRateMap, loginRateMap, founderRateMap]) {
    for (const [key, entry] of map) {
      if (now > entry.resetAt) map.delete(key);
    }
  }
  for (const [key, data] of reserveTokens) {
    if (now > data.expiresAt) reserveTokens.delete(key);
  }
  for (const [key, data] of pendingEmailVerifications) {
    if (now > data.expiresAt) pendingEmailVerifications.delete(key);
  }
  for (const [key, data] of activeSessions) {
    if (now > data.expiresAt) activeSessions.delete(key);
  }
  for (const [key, ts] of passportViewDebounce) {
    if (now - ts > 60_000) passportViewDebounce.delete(key);
  }
}

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const sweepTimer = setInterval(sweepExpiredEntries, SWEEP_INTERVAL_MS);

// --- PUBLIC API ---

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const FOUNDER_REG_URL = process.env.FOUNDER_REG_URL || '';
const founderRateMap = new Map<string, { count: number; resetAt: number }>();

app.post('/api/founder/register', async (req, res) => {
  if (!FOUNDER_REG_URL) {
    return res.status(503).json({ error: 'Founder registration not configured' });
  }

  const ip = clientIp(req);
  if (!checkRateLimit(founderRateMap, ip, 5, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const { firstName, email, fandomName } = req.body;
  if (!firstName || !email || !fandomName) {
    return res.status(400).json({ error: 'firstName, email, and fandomName required' });
  }

  const payload = {
    firstName: String(firstName).trim().slice(0, 100),
    lastName: 'Member',
    email: String(email).trim().slice(0, 200),
    phone: '',
    country: 'United States',
    source: 'Summoning Mirror – Times Square',
    spend: '',
    fandoms: [String(fandomName).slice(0, 100)],
    otherFranchises: '',
    timestamp: new Date().toISOString(),
    website: '',
    pagePath: '/summoning-mirror',
  };

  try {
    await fetch(FOUNDER_REG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[Founder] Registration proxy failed:', err);
    res.status(502).json({ error: 'Registration service unavailable' });
  }
});

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

app.get('/api/analytics/fandom/:fandomId', (req, res) => {
  const data = readAnalytics();
  const fandomId = req.params.fandomId;
  const info = data.fandomCounts[fandomId];
  res.json({
    fandomCount: info?.count || 0,
    fandomName: info?.name || fandomId,
    totalCards: data.totalCards,
  });
});

app.post('/api/analytics/track', (req, res) => {
  const ip = clientIp(req);
  if (!checkRateLimit(trackRateMap, ip, 30, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

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
    // Counters incremented atomically by /api/photos/reserve
    console.log(`[Analytics] card_generated logged for ${fandomId}`);
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

const EMAIL_REGEX = /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/;
const MAX_EMAILS = 50000;

app.post('/api/email/collect', (req, res) => {
  const ip = clientIp(req);
  if (!checkRateLimit(emailCollectRateMap, ip, 10, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const { email, fandomId, firstName, photoId, wishText, preferredFandom } = req.body;
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
    firstName: firstName?.trim() || undefined,
    photoId: photoId || undefined,
    wishText: wishText?.trim() || undefined,
    preferredFandom: preferredFandom || undefined,
    timestamp: new Date().toISOString(),
  });

  writeEmails(emails);

  if (photoId) {
    const photos = readPhotos();
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx !== -1) {
      if (firstName?.trim()) photos[idx].firstName = firstName.trim();
      if (preferredFandom) photos[idx].preferredFandom = preferredFandom;
      writePhotos(photos);
    }
  }

  const analytics = readAnalytics();
  analytics.totalEmails = (analytics.totalEmails || 0) + 1;
  writeAnalytics(analytics);

  res.json({ success: true });
});

// --- PHOTO STORAGE ---

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ReserveData {
  id: string;
  fandomId: string;
  fandomName: string;
  serialNumber: string;
  visitOrdinal: number;
  fandomOrdinal: number;
  ugcCode: string;
  statusTier: string;
  expiresAt: number;
}

const reserveTokens = new Map<string, ReserveData>();
const RESERVE_TOKEN_TTL_MS = 5 * 60 * 1000;

interface PendingEmailVerification {
  photoId: string;
  email: string;
  firstName: string;
  fandomName: string;
  expiresAt: number;
}

const pendingEmailVerifications = new Map<string, PendingEmailVerification>();
const EMAIL_VERIFY_TTL_MS = 15 * 60 * 1000;
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

const cardStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CARDS_DIR),
  filename: (req, file, cb) => {
    const photoId = req.body?.photoId as string | undefined;
    const id = photoId && UUID_RE.test(photoId) ? photoId : crypto.randomUUID();
    const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
    const suffix = file.fieldname === 'emailCard' ? '_email' : '';
    cb(null, `${id}${suffix}${ext}`);
  },
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

const cardUpload = multer({
  storage: cardStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_IMAGE_TYPES.includes(file.mimetype));
  },
});

app.post('/api/photos/reserve', (req, res) => {
  const { fandomId, fandomName } = req.body;
  if (!fandomId || !fandomName) {
    return res.status(400).json({ error: 'fandomId and fandomName required' });
  }

  const analytics = readAnalytics();
  const config = readConfig();
  const visitOrdinal = analytics.totalCards + 1;
  const fandomCount = analytics.fandomCounts[fandomId]?.count || 0;
  const fandomOrdinal = fandomCount + 1;
  const id = crypto.randomUUID();
  const serialNumber = formatSerialNumber(visitOrdinal);
  const ugcCode = generateUgcCode(visitOrdinal);
  const statusTier = getStatusTier(visitOrdinal);
  const totalFandoms = config.fandoms.filter((f) => f.enabled).length;

  analytics.totalCards++;
  if (!analytics.fandomCounts[fandomId]) {
    analytics.fandomCounts[fandomId] = { name: fandomName, count: 0 };
  }
  analytics.fandomCounts[fandomId].count++;
  writeAnalytics(analytics);

  const reserveToken = crypto.randomBytes(16).toString('hex');
  reserveTokens.set(reserveToken, {
    id,
    fandomId,
    fandomName,
    serialNumber,
    visitOrdinal,
    fandomOrdinal,
    ugcCode,
    statusTier,
    expiresAt: Date.now() + RESERVE_TOKEN_TTL_MS,
  });

  res.json({
    id,
    reserveToken,
    serialNumber,
    visitOrdinal,
    fandomOrdinal,
    fandomTotal: fandomCount,
    totalCards: analytics.totalCards,
    totalFandoms,
    statusTier,
    ugcCode,
    passportUrl: getPassportUrl(id),
  });
});

app.post('/api/photos/upload', cardUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'emailCard', maxCount: 1 },
]), (req, res) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const mainFile = files?.image?.[0];
  const emailFile = files?.emailCard?.[0];

  const ip = clientIp(req);
  if (!checkRateLimit(uploadRateMap, ip, 60, 60 * 60 * 1000)) {
    if (mainFile) fs.unlinkSync(mainFile.path);
    if (emailFile) fs.unlinkSync(emailFile.path);
    return res.status(429).json({ error: 'Upload rate limit exceeded' });
  }

  if (!mainFile) {
    if (emailFile) fs.unlinkSync(emailFile.path);
    return res.status(400).json({ error: 'Card image required' });
  }

  const {
    fandomId, fandomName, photoId, guestName, wishText, captureMode,
    reserveToken,
  } = req.body;

  const cleanupFiles = () => {
    if (mainFile) try { fs.unlinkSync(mainFile.path); } catch { /* ignore */ }
    if (emailFile) try { fs.unlinkSync(emailFile.path); } catch { /* ignore */ }
  };

  if (!reserveToken) {
    cleanupFiles();
    return res.status(400).json({ error: 'reserveToken required' });
  }

  const reserve = reserveTokens.get(reserveToken);
  if (!reserve || Date.now() > reserve.expiresAt) {
    if (reserve) reserveTokens.delete(reserveToken);
    cleanupFiles();
    return res.status(400).json({ error: 'Invalid or expired reserve token' });
  }

  if (!fandomId || !fandomName) {
    cleanupFiles();
    return res.status(400).json({ error: 'fandomId and fandomName required' });
  }

  if (fandomId !== reserve.fandomId) {
    cleanupFiles();
    return res.status(400).json({ error: 'fandomId does not match reservation' });
  }

  const id = (photoId && UUID_RE.test(photoId)) ? photoId : reserve.id;
  if (id !== reserve.id) {
    cleanupFiles();
    return res.status(400).json({ error: 'photoId does not match reservation' });
  }

  // Delete token only after all validation passes so it can be retried on non-token failures
  reserveTokens.delete(reserveToken);

  const entry: PhotoEntry = {
    id,
    filename: mainFile.filename,
    emailCardFilename: emailFile?.filename,
    fandomId: reserve.fandomId,
    fandomName: reserve.fandomName,
    guestName: guestName ? String(guestName).trim().slice(0, 50) : undefined,
    wishText: wishText ? String(wishText).trim().slice(0, 120) : undefined,
    captureMode: captureMode || 'solo',
    serialNumber: reserve.serialNumber,
    visitOrdinal: reserve.visitOrdinal,
    fandomOrdinal: reserve.fandomOrdinal,
    ugcCode: reserve.ugcCode,
    statusTier: reserve.statusTier,
    lifecycleDaysSent: [],
    passportViews: 0,
    createdAt: new Date().toISOString(),
  };

  const photos = readPhotos();
  const existingIdx = photos.findIndex((p) => p.id === id);
  if (existingIdx !== -1) {
    photos[existingIdx] = { ...photos[existingIdx], ...entry };
  } else {
    photos.push(entry);
  }

  // Keep last 5000 photos metadata
  if (photos.length > 5000) {
    const removed = photos.splice(0, photos.length - 5000);
    for (const old of removed) {
      deletePhotoFiles(old);
    }
  }

  writePhotos(photos);

  res.status(201).json({
    id: entry.id,
    url: `/api/photos/${entry.id}/image`,
    passportUrl: getPassportUrl(entry.id),
    ugcCode: entry.ugcCode,
    serialNumber: entry.serialNumber,
  });
});

const passportViewDebounce = new Map<string, number>();

app.get('/api/photos/:id/passport', (req, res) => {
  const id = req.params.id;
  if (!UUID_RE.test(id)) {
    return res.status(400).json({ error: 'Invalid photo ID' });
  }

  const photo = getPhotoById(id);
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  const analytics = readAnalytics();
  const config = readConfig();
  const fandomInfo = analytics.fandomCounts[photo.fandomId];

  const now = Date.now();
  const lastView = passportViewDebounce.get(id) || 0;
  if (now - lastView > 10_000) {
    passportViewDebounce.set(id, now);
    const photos = readPhotos();
    const idx = photos.findIndex((p) => p.id === id);
    if (idx !== -1) {
      photos[idx].passportViews = (photos[idx].passportViews || 0) + 1;
      writePhotos(photos);
    }
  }

  res.json({
    id: photo.id,
    serialNumber: photo.serialNumber || formatSerialNumber(photo.visitOrdinal || 1),
    guestName: photo.guestName || photo.firstName || '',
    fandomId: photo.fandomId,
    fandomName: photo.fandomName,
    wishText: photo.wishText || '',
    visitOrdinal: photo.visitOrdinal || 1,
    fandomOrdinal: photo.fandomOrdinal || 1,
    fandomTotal: fandomInfo?.count || photo.fandomOrdinal || 1,
    statusTier: photo.statusTier || getStatusTier(photo.visitOrdinal || 1),
    ugcCode: photo.ugcCode || '',
    createdAt: photo.createdAt,
    imageUrl: `/api/photos/${photo.id}/image`,
    passportUrl: getPassportUrl(photo.id),
    totalFandoms: config.fandoms.filter((f) => f.enabled).length,
  });
});

app.get('/api/photos/:id/image', (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid photo ID' });
  }
  const photo = getPhotoById(req.params.id);
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  const filePath = getPhotoFilePath(photo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file missing' });
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(filePath);
});

async function sendPhotoCardEmail(
  photo: PhotoEntry,
  email: string,
  firstName: string,
  displayFandom: string
): Promise<void> {
  const attachments: Array<{ filename: string; path: string; cid: string }> = [];

  if (photo.emailCardFilename) {
    const emailCardPath = path.join(CARDS_DIR, photo.emailCardFilename);
    if (fs.existsSync(emailCardPath)) {
      const ext = path.extname(photo.emailCardFilename).slice(1) || 'png';
      attachments.push({
        filename: `SummoningMirror_HouseOfSpells.${ext}`,
        path: emailCardPath,
        cid: 'summoning-card',
      });
    }
  }

  if (attachments.length === 0) {
    const filePath = getPhotoFilePath(photo);
    attachments.push({
      filename: 'SummoningMirror_HouseOfSpells.jpg',
      path: filePath,
      cid: 'summoning-card',
    });
  }

  await smtpTransport.sendMail({
    from: getSmtpFromAddress(),
    to: email,
    subject: 'Your Summoning Mirror Card — House of Spells NYC',
    html: buildPhotoEmailHtml(
      firstName,
      displayFandom,
      getPassportUrl(photo.id),
      photo.ugcCode || generateUgcCode(photo.visitOrdinal || 1),
      photo.statusTier || getStatusTier(photo.visitOrdinal || 1)
    ),
    attachments,
  });

  const photos = readPhotos();
  const idx = photos.findIndex((p) => p.id === photo.id);
  if (idx !== -1) {
    photos[idx].email = email;
    photos[idx].firstName = firstName;
    photos[idx].lifecycleDaysSent = [0];
    writePhotos(photos);
  }
}

app.post('/api/photos/:id/email', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid photo ID' });
  }

  const ip = clientIp(req);
  if (!checkRateLimit(emailRateMap, ip, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Email rate limit exceeded' });
  }

  const { email, firstName, fandomName } = req.body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!firstName?.trim() || String(firstName).trim().length > 50) {
    return res.status(400).json({ error: 'firstName required (max 50 chars)' });
  }

  if (!isSmtpConfigured()) {
    return res.status(503).json({ error: 'Email service not configured' });
  }

  const photo = getPhotoById(req.params.id);
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  if (photo.email) {
    return res.status(409).json({ error: 'Card already emailed for this photo' });
  }

  const ageMs = Date.now() - new Date(photo.createdAt).getTime();
  if (ageMs > 30 * 60 * 1000) {
    return res.status(410).json({ error: 'Photo session expired' });
  }

  const filePath = getPhotoFilePath(photo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file missing' });
  }

  const displayFandom = fandomName || photo.fandomName;
  const safeName = firstName.trim();

  if (REQUIRE_EMAIL_VERIFICATION) {
    const verifyToken = crypto.randomBytes(16).toString('hex');
    pendingEmailVerifications.set(verifyToken, {
      photoId: photo.id,
      email,
      firstName: safeName,
      fandomName: displayFandom,
      expiresAt: Date.now() + EMAIL_VERIFY_TTL_MS,
    });

    const verifyUrl = `${BASE_URL}/api/email/verify/${verifyToken}`;
    try {
      await smtpTransport.sendMail({
        from: getSmtpFromAddress(),
        to: email,
        subject: 'Verify your email — Summoning Mirror',
        html: `<p>Hi ${escapeHtml(safeName)},</p>
<p>Click the link below to confirm your email and receive your ${escapeHtml(displayFandom)} fan card:</p>
<p><a href="${escapeHtml(verifyUrl)}">${escapeHtml(verifyUrl)}</a></p>
<p>This link expires in 15 minutes.</p>
<p style="color:#888;font-size:12px;">House of Spells NYC — The Summoning Mirror</p>`,
      });
    } catch (err) {
      pendingEmailVerifications.delete(verifyToken);
      console.error('[Email] Failed to send verification email:', err);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    return res.json({ success: true, needsVerification: true });
  }

  try {
    await sendPhotoCardEmail(photo, email, safeName, displayFandom);
    res.json({ success: true });
  } catch (err) {
    console.error('[Email] Failed to send photo card:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.get('/api/email/verify/:token', async (req, res) => {
  const pending = pendingEmailVerifications.get(req.params.token);
  if (!pending || Date.now() > pending.expiresAt) {
    if (pending) pendingEmailVerifications.delete(req.params.token);
    return res.status(400).json({ error: 'Invalid or expired verification link' });
  }

  if (!isSmtpConfigured()) {
    return res.status(503).json({ error: 'Email service not configured' });
  }

  const photo = getPhotoById(pending.photoId);
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  if (photo.email) {
    pendingEmailVerifications.delete(req.params.token);
    return res.status(409).json({ error: 'Card already emailed for this photo' });
  }

  const filePath = getPhotoFilePath(photo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Image file missing' });
  }

  try {
    await sendPhotoCardEmail(
      photo,
      pending.email,
      pending.firstName,
      pending.fandomName
    );
    pendingEmailVerifications.delete(req.params.token);
    res.json({ success: true });
  } catch (err) {
    console.error('[Email] Failed to send verified photo card:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// --- ADMIN API (all routes below require valid session) ---

const fandomImageStorage = multer.diskStorage({
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

const fandomImageUpload = multer({
  storage: fandomImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const adminRouter = express.Router();
adminRouter.use(requireAdmin);

adminRouter.get('/analytics', (_req, res) => {
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

adminRouter.get('/fandoms', (_req, res) => {
  const config = readConfig();
  const sorted = config.fandoms.sort((a, b) => a.sortOrder - b.sortOrder);
  res.json(sorted);
});

adminRouter.post('/fandoms', (req, res) => {
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

adminRouter.put('/fandoms/:id', (req, res) => {
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

adminRouter.delete('/fandoms/:id', (req, res) => {
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

adminRouter.post('/fandoms/:id/image', fandomImageUpload.single('image'), (req, res) => {
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

adminRouter.get('/emails', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '50', 10)));
  const emails = readEmails();
  const start = (page - 1) * limit;
  const slice = emails.slice(start, start + limit);
  res.json({
    emails: slice,
    page,
    limit,
    total: emails.length,
    totalPages: Math.ceil(emails.length / limit),
  });
});

adminRouter.delete('/emails/:email', (req, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
  const emails = readEmails();
  const before = emails.length;
  const filtered = emails.filter((e) => e.email.toLowerCase() !== targetEmail);
  writeEmails(filtered);

  const photos = readPhotos();
  let photosChanged = false;
  for (const photo of photos) {
    if (photo.email?.toLowerCase() === targetEmail) {
      delete photo.email;
      photosChanged = true;
    }
  }
  if (photosChanged) writePhotos(photos);

  res.json({ success: true, deleted: before - filtered.length });
});

adminRouter.get('/gdpr/export/:email', (req, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
  const emails = readEmails().filter((e) => e.email.toLowerCase() === targetEmail);
  const photos = readPhotos().filter((p) => p.email?.toLowerCase() === targetEmail);
  res.json({ email: targetEmail, emails, photos });
});

adminRouter.get('/smtp-settings', (_req, res) => {
  const saved = loadSmtpSettings();
  res.json({
    host: saved.host || process.env.SMTP_HOST || '',
    port: saved.port || process.env.SMTP_PORT || '',
    user: saved.user || process.env.SMTP_USER || '',
    pass: saved.pass ? '••••••••' : (process.env.SMTP_PASS ? '••••••••' : ''),
    from: saved.from || process.env.SMTP_FROM || '',
  });
});

adminRouter.put('/smtp-settings', (req, res) => {
  const { host, port, user, pass, from } = req.body;
  if (typeof host !== 'string' || typeof port !== 'string' || typeof user !== 'string' || typeof from !== 'string') {
    return res.status(400).json({ error: 'Invalid settings format' });
  }

  const current = loadSmtpSettings();
  const settings: SmtpSettings = {
    host: host.trim(),
    port: port.trim(),
    user: user.trim(),
    pass: pass === '••••••••' ? current.pass : (pass || '').trim(),
    from: from.trim(),
  };
  saveSmtpSettings(settings);
  smtpTransport = createSmtpTransport();
  console.log('[SMTP] Settings updated via admin panel');
  res.json({ success: true });
});

adminRouter.post('/smtp-test', async (req, res) => {
  const cfg = getSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    return res.status(400).json({ error: 'SMTP not configured — set credentials first' });
  }
  try {
    await smtpTransport.sendMail({
      from: `"${cfg.from}" <${cfg.user}>`,
      to: cfg.user,
      subject: 'Summoning Mirror — SMTP Test',
      html: '<p>SMTP configuration is working correctly.</p>',
    });
    res.json({ success: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `SMTP test failed: ${errMsg}` });
  }
});

app.use('/api/admin', adminRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Express] Unhandled error:', err.message);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
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

const server = app.listen(PORT, () => {
  console.log(`\n  Summoning Mirror API running at http://localhost:${PORT}`);
  console.log(`  Fandoms config: ${CONFIG_PATH}`);
  console.log(`  Analytics: ${ANALYTICS_PATH}`);
  console.log(`  Emails: ${EMAILS_PATH}`);
  console.log(`  Photos: ${PHOTOS_PATH}`);
  console.log(`  Card images: ${CARDS_DIR}`);
  console.log(`  Fandom images: ${FANDOMS_DIR}`);
  console.log(`  Base URL: ${BASE_URL}`);
  const smtpCfg = getSmtpConfig();
  console.log(`  SMTP: ${isSmtpConfigured() ? `configured (${smtpCfg.user} via ${smtpCfg.host})` : 'NOT configured — emails disabled'}\n`);
});

// --- Email lifecycle scheduler (day 1, 3, 7, 30 follow-ups) ---

const IS_LIFECYCLE_WORKER = process.env.LIFECYCLE_WORKER !== 'false';
const LIFECYCLE_DAYS = [1, 3, 7, 30];
const LIFECYCLE_CHECK_MS = 30 * 60 * 1000;

async function processLifecycleEmails(): Promise<void> {
  if (!isSmtpConfigured()) return;

  const photos = readPhotos();
  const now = Date.now();
  let changed = false;

  for (const photo of photos) {
    if (!photo.email || !photo.firstName) continue;

    const ageDays = (now - new Date(photo.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    const sent = photo.lifecycleDaysSent || [0];
    let photoChanged = false;

    for (const day of LIFECYCLE_DAYS) {
      if (ageDays >= day && !sent.includes(day)) {
        const { subject, html } = buildLifecycleEmailHtml(
          photo.firstName,
          day,
          photo.fandomName,
          getPassportUrl(photo.id),
          photo.ugcCode || ''
        );
        try {
          await smtpTransport.sendMail({
            from: getSmtpFromAddress(),
            to: photo.email,
            subject,
            html,
          });
          sent.push(day);
          photoChanged = true;
        } catch (err) {
          console.error(`[Lifecycle] Failed day-${day} email for ${photo.id}:`, err);
        }
      }
    }

    if (photoChanged) {
      const idx = photos.findIndex((p) => p.id === photo.id);
      if (idx !== -1) photos[idx].lifecycleDaysSent = sent;
      changed = true;
    }
  }

  if (changed) writePhotos(photos);
}

if (IS_LIFECYCLE_WORKER) {
  setInterval(() => {
    processLifecycleEmails().catch((err) => console.error('[Lifecycle] Error:', err));
  }, LIFECYCLE_CHECK_MS);
}

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[WARN] Unhandled promise rejection:', reason);
});

process.on('SIGTERM', () => {
  console.log('[Shutdown] SIGTERM received, draining...');
  clearInterval(sweepTimer);
  configWatcher?.close();
  server.close(() => {
    console.log('[Shutdown] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Shutdown] Forced exit after 10s');
    process.exit(1);
  }, 10_000).unref();
});

process.on('SIGINT', () => {
  console.log('[Shutdown] SIGINT received');
  process.kill(process.pid, 'SIGTERM');
});
