import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

async function cameraFetch(
  ip: string,
  port: string,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `http://${ip}:${port}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

app.get('/api/camera/info', async (req, res) => {
  const ip = (req.query.ip as string) || '192.168.42.1';
  const port = (req.query.port as string) || '80';

  try {
    const response = await cameraFetch(ip, port, '/osc/info');
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(503).json({ success: false, error: 'カメラに接続できません: ' + (err?.message ?? 'タイムアウト') });
  }
});

app.post('/api/camera/start', async (req, res) => {
  const { ip = '192.168.42.1', port = '80' } = req.body;

  try {
    const response = await cameraFetch(ip, port, '/osc/commands/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ name: 'camera.startCapture', parameters: {} }),
    });
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(503).json({ success: false, error: '録画開始に失敗しました: ' + (err?.message ?? '') });
  }
});

app.post('/api/camera/stop', async (req, res) => {
  const { ip = '192.168.42.1', port = '80' } = req.body;

  try {
    const response = await cameraFetch(ip, port, '/osc/commands/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ name: 'camera.stopCapture', parameters: {} }),
    });
    const data = await response.json();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(503).json({ success: false, error: '録画停止に失敗しました: ' + (err?.message ?? '') });
  }
});

const PORT = parseInt(process.env.SERVER_PORT ?? '3001', 10);
app.listen(PORT, () => {
  console.log(`[Insta360 Proxy] http://localhost:${PORT}`);
});
