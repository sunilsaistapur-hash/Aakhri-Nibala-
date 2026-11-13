import express from 'express';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type VoiceRole = 'player' | 'chudail';

const MAX_CACHE_ENTRIES = 450;
const ttsCache = new Map<string, Buffer>();
const inFlightRequests = new Map<string, Promise<Buffer>>();

function sanitizeTtsText(raw: string): string {
  return raw
    .replace(/[“”"']/g, '')
    .replace(/&/g, ' और ')
    .replace(/[<>]/g, ' ')
    .replace(/[—–]/g, ', ')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 650);
}

async function synthesizeEdgeTts(role: VoiceRole, text: string): Promise<Buffer> {
  const voice = role === 'chudail' ? 'hi-IN-SwaraNeural' : 'hi-IN-MadhurNeural';
  const prosody =
    role === 'chudail'
      ? { rate: 0.85, pitch: '+6%' }
      : { rate: 1.0, pitch: '+0Hz' };

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, prosody);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buf = Buffer.concat(chunks);
    if (buf.length === 0) {
      throw new Error('Empty TTS audio stream');
    }
    return buf;
  } finally {
    try {
      tts.close();
    } catch {
      // ignore close errors
    }
  }
}

async function getOrCreateTtsAudio(role: VoiceRole, text: string): Promise<Buffer> {
  const key = `${role}:${text}`;
  const cached = ttsCache.get(key);
  if (cached) {
    // Refresh LRU order
    ttsCache.delete(key);
    ttsCache.set(key, cached);
    return cached;
  }

  const pending = inFlightRequests.get(key);
  if (pending) {
    return pending;
  }

  const job = (async () => {
    try {
      const buf = await synthesizeEdgeTts(role, text);
      if (ttsCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey !== undefined) ttsCache.delete(oldestKey);
      }
      ttsCache.set(key, buf);
      return buf;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, job);
  return job;
}

async function startServer(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '64kb' }));

  const handleTts = async (req: express.Request, res: express.Response): Promise<void> => {
    const rawRole = req.method === 'POST' ? req.body?.role : req.query.role;
    const rawText = req.method === 'POST' ? req.body?.text : req.query.text;

    const role: VoiceRole = rawRole === 'chudail' ? 'chudail' : 'player';
    const text = sanitizeTtsText(typeof rawText === 'string' ? rawText : '');

    if (!text) {
      res.status(400).json({ error: 'Missing text' });
      return;
    }

    try {
      const mp3Buffer = await getOrCreateTtsAudio(role, text);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', String(mp3Buffer.length));
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.status(200).send(mp3Buffer);
    } catch (err) {
      console.error('[TTS Error]', err);
      res.status(503).json({ error: 'TTS unavailable' });
    }
  };

  app.get('/api/tts', handleTts);
  app.post('/api/tts', handleTts);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          }
        },
      })
    );
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
