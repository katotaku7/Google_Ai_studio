import { useState, useEffect, useRef } from 'react';
import { Camera, Wifi, WifiOff, Clock, Square, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type Status = 'idle' | 'waiting' | 'recording' | 'error';
type ConnectionState = 'unknown' | 'checking' | 'ok' | 'ng';

function formatCountdown(ms: number): string {
  const total = Math.max(0, ms);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const [status, setStatus]           = useState<Status>('idle');
  const [cameraIp, setCameraIp]       = useState('192.168.42.1');
  const [cameraPort, setCameraPort]   = useState('80');
  const [conn, setConn]               = useState<ConnectionState>('unknown');
  const [cameraModel, setCameraModel] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [countdown, setCountdown]     = useState('--:--:--');
  const [elapsed, setElapsed]         = useState('00:00');
  const [errorMsg, setErrorMsg]       = useState('');

  const tickRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef    = useRef<number>(0);

  const clearTick = () => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // --- Camera API helpers ---
  async function apiGet(path: string) {
    const res = await fetch(path, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function apiPost(path: string, body: object) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return res.json();
  }

  // --- Connection test ---
  async function testConnection() {
    setConn('checking');
    setCameraModel('');
    try {
      const json = await apiGet(
        `/api/camera/info?ip=${encodeURIComponent(cameraIp)}&port=${encodeURIComponent(cameraPort)}`
      );
      if (json.success) {
        setCameraModel(json.data?.model ?? '');
        setConn('ok');
      } else {
        setConn('ng');
      }
    } catch {
      setConn('ng');
    }
  }

  // --- Start recording (called by scheduler or manual) ---
  async function startRecording() {
    try {
      const json = await apiPost('/api/camera/start', { ip: cameraIp, port: cameraPort });
      if (json.success) {
        recStartRef.current = Date.now();
        setStatus('recording');
        setElapsed('00:00');
      } else {
        setErrorMsg(json.error ?? '録画開始に失敗しました');
        setStatus('error');
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? '接続エラー');
      setStatus('error');
    }
  }

  // --- Stop recording ---
  async function stopRecording() {
    clearTick();
    try {
      await apiPost('/api/camera/stop', { ip: cameraIp, port: cameraPort });
    } catch { /* ignore */ }
    setStatus('idle');
    setElapsed('00:00');
  }

  // --- Schedule / cancel ---
  function schedule() {
    if (!scheduledTime) return;
    const target = new Date(scheduledTime).getTime();
    if (target <= Date.now()) {
      setErrorMsg('過去の時刻は設定できません');
      setStatus('error');
      return;
    }
    setErrorMsg('');
    setStatus('waiting');
  }

  function cancel() {
    clearTick();
    setStatus('idle');
    setCountdown('--:--:--');
  }

  // --- Tick loop ---
  useEffect(() => {
    clearTick();

    if (status === 'waiting') {
      const target = new Date(scheduledTime).getTime();
      tickRef.current = setInterval(() => {
        const diff = target - Date.now();
        if (diff <= 0) {
          clearTick();
          setCountdown('00:00:00');
          startRecording();
        } else {
          setCountdown(formatCountdown(diff));
        }
      }, 500);
    }

    if (status === 'recording') {
      tickRef.current = setInterval(() => {
        setElapsed(formatElapsed(Date.now() - recStartRef.current));
      }, 500);
    }

    return clearTick;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, scheduledTime]);

  // --- Minimum datetime for the input ---
  const minDateTime = (() => {
    const d = new Date(Date.now() + 60_000);
    return d.toISOString().slice(0, 16);
  })();

  // --- Connection icon ---
  const ConnIcon =
    conn === 'checking' ? Loader2
    : conn === 'ok'     ? CheckCircle2
    : conn === 'ng'     ? WifiOff
    :                     Wifi;
  const connColor =
    conn === 'ok' ? 'text-green-400'
    : conn === 'ng' ? 'text-red-400'
    : 'text-[var(--color-muted)]';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--color-bg)]">

      {/* ── Header ── */}
      <header className="w-full max-w-md mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <Camera size={28} className="text-[var(--color-orange)]" />
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            INSTA360<span className="text-[var(--color-orange)]"> SCHEDULER</span>
          </h1>
        </div>
        <p className="text-xs text-[var(--color-text-sub)] tracking-widest uppercase">
          Scheduled Recording via Wi-Fi OSC
        </p>
      </header>

      {/* ── Card ── */}
      <div className="w-full max-w-md space-y-4">

        {/* Camera settings */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-sub)]">
            カメラ設定
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={cameraIp}
              onChange={e => { setCameraIp(e.target.value); setConn('unknown'); }}
              placeholder="192.168.42.1"
              disabled={status !== 'idle'}
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-orange)] disabled:opacity-40"
            />
            <input
              type="text"
              value={cameraPort}
              onChange={e => { setCameraPort(e.target.value); setConn('unknown'); }}
              placeholder="80"
              disabled={status !== 'idle'}
              className="w-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-orange)] disabled:opacity-40"
            />
            <button
              onClick={testConnection}
              disabled={status !== 'idle' || conn === 'checking'}
              className="px-3 py-2 bg-[var(--color-border)] hover:bg-[var(--color-muted)] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
            >
              確認
            </button>
          </div>

          {/* Connection status */}
          <div className={`flex items-center gap-2 text-xs ${connColor}`}>
            <ConnIcon
              size={13}
              className={conn === 'checking' ? 'animate-spin' : ''}
            />
            {conn === 'unknown'   && <span className="text-[var(--color-muted)]">未確認</span>}
            {conn === 'checking'  && <span>確認中...</span>}
            {conn === 'ok'        && <span>接続OK{cameraModel ? ` — ${cameraModel}` : ''}</span>}
            {conn === 'ng'        && <span>接続失敗 — カメラのWi-Fiに接続してください</span>}
          </div>
        </section>

        {/* Schedule */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-sub)]">
            録画開始時刻
          </h2>
          <input
            type="datetime-local"
            value={scheduledTime}
            min={minDateTime}
            onChange={e => setScheduledTime(e.target.value)}
            disabled={status !== 'idle'}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-orange)] disabled:opacity-40 [color-scheme:dark]"
          />

          {status === 'idle' && (
            <button
              onClick={schedule}
              disabled={!scheduledTime || conn !== 'ok'}
              className="w-full py-3 rounded-lg font-black uppercase tracking-widest text-sm
                         bg-[var(--color-orange)] text-white
                         hover:bg-[var(--color-orange-dim)] transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              スケジュール設定
            </button>
          )}

          {status !== 'idle' && status !== 'recording' && (
            <button
              onClick={cancel}
              className="w-full py-3 rounded-lg font-black uppercase tracking-widest text-sm
                         border border-[var(--color-border)] text-[var(--color-text-sub)]
                         hover:border-red-500 hover:text-red-400 transition-colors"
            >
              キャンセル
            </button>
          )}
        </section>

        {/* Status display */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
          {/* IDLE */}
          {status === 'idle' && (
            <div className="text-center text-[var(--color-muted)] py-4">
              <Clock size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">スケジュールが設定されていません</p>
            </div>
          )}

          {/* WAITING */}
          {status === 'waiting' && (
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-[var(--color-text-sub)] mb-2">
                録画開始まで
              </p>
              <p
                className="text-5xl font-black tabular-nums text-[var(--color-orange)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {countdown}
              </p>
              <p className="text-xs text-[var(--color-muted)] mt-3 font-mono">
                {scheduledTime.replace('T', ' ')}
              </p>
            </div>
          )}

          {/* RECORDING */}
          {status === 'recording' && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-red-500 recording-ring blink" />
                <p className="text-xs uppercase tracking-widest text-red-400 font-bold">
                  REC
                </p>
              </div>
              <p
                className="text-5xl font-black tabular-nums text-white"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {elapsed}
              </p>
              <button
                onClick={stopRecording}
                className="mt-4 flex items-center gap-2 mx-auto px-5 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-bold"
              >
                <Square size={14} fill="currentColor" />
                録画停止
              </button>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="text-center">
              <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
              <p className="text-sm text-red-400 mb-3">{errorMsg}</p>
              <button
                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                className="text-xs text-[var(--color-muted)] underline hover:text-[var(--color-text)]"
              >
                リセット
              </button>
            </div>
          )}
        </section>

        {/* Help */}
        <p className="text-center text-xs text-[var(--color-muted)] leading-relaxed px-2">
          Insta360カメラのWi-Fiに接続し、<br />
          <span className="font-mono">npm run server</span> でプロキシを起動してください
        </p>
      </div>
    </div>
  );
}
