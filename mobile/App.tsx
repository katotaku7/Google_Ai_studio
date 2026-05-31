import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useKeepAwake } from 'expo-keep-awake';

// ── Colors ──────────────────────────────────────────────────
const C = {
  bg:      '#080808',
  surface: '#111111',
  border:  '#1f1f1f',
  orange:  '#FF6600',
  muted:   '#555555',
  text:    '#e8e8e8',
  sub:     '#888888',
  green:   '#4ade80',
  red:     '#ef4444',
};

// ── Types ────────────────────────────────────────────────────
type Status = 'idle' | 'waiting' | 'recording' | 'error';
type ConnState = 'unknown' | 'checking' | 'ok' | 'ng';

// ── Helpers ──────────────────────────────────────────────────
function fmtCountdown(ms: number): string {
  const t = Math.max(0, ms);
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1_000);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function fmtElapsed(ms: number): string {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60_000);
  const s = Math.floor((t % 60_000) / 1_000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  // 録画待機中・録画中はスリープさせない
  useKeepAwake();

  const [status,    setStatus]    = useState<Status>('idle');
  const [cameraIp,  setCameraIp]  = useState('192.168.42.1');
  const [cameraPort,setCameraPort]= useState('80');
  const [conn,      setConn]      = useState<ConnState>('unknown');
  const [model,     setModel]     = useState('');
  const [schedTime, setSchedTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [countdown, setCountdown]   = useState('--:--:--');
  const [elapsed,   setElapsed]     = useState('00:00');
  const [errorMsg,  setErrorMsg]    = useState('');

  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef<number>(0);

  const clearTick = () => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // カメラのベースURL（プロキシなし・直接アクセス）
  const oscUrl = (path: string) => `http://${cameraIp}:${cameraPort}${path}`;

  // ── 接続テスト ─────────────────────────────────────────────
  async function testConnection() {
    setConn('checking');
    setModel('');
    try {
      const res = await fetch(oscUrl('/osc/info'), {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        setModel(data?.model ?? '');
        setConn('ok');
      } else {
        setConn('ng');
      }
    } catch {
      setConn('ng');
    }
  }

  // ── 録画開始 ───────────────────────────────────────────────
  async function startRecording() {
    try {
      const res = await fetch(oscUrl('/osc/commands/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({ name: 'camera.startCapture', parameters: {} }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        recStartRef.current = Date.now();
        setStatus('recording');
        setElapsed('00:00');
      } else {
        setErrorMsg('録画開始コマンドが拒否されました');
        setStatus('error');
      }
    } catch (e: any) {
      setErrorMsg('カメラに接続できません: ' + (e?.message ?? 'タイムアウト'));
      setStatus('error');
    }
  }

  // ── 録画停止 ───────────────────────────────────────────────
  async function stopRecording() {
    clearTick();
    try {
      await fetch(oscUrl('/osc/commands/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({ name: 'camera.stopCapture', parameters: {} }),
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* 停止コマンドが失敗しても状態はリセット */ }
    setStatus('idle');
    setElapsed('00:00');
  }

  // ── スケジュール設定 ───────────────────────────────────────
  function schedule() {
    if (schedTime.getTime() <= Date.now()) {
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

  // ── タイマーループ ─────────────────────────────────────────
  useEffect(() => {
    clearTick();

    if (status === 'waiting') {
      const target = schedTime.getTime();
      tickRef.current = setInterval(() => {
        const diff = target - Date.now();
        if (diff <= 0) {
          clearTick();
          setCountdown('00:00:00');
          startRecording();
        } else {
          setCountdown(fmtCountdown(diff));
        }
      }, 500);
    }

    if (status === 'recording') {
      tickRef.current = setInterval(() => {
        setElapsed(fmtElapsed(Date.now() - recStartRef.current));
      }, 500);
    }

    return clearTick;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── DateTimePicker (Android は日付・時刻を分けて表示) ─────
  function onPickerChange(_: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (!date) return;
      if (pickerMode === 'date') {
        // 日付を確定したら続けて時刻を選択
        setSchedTime(date);
        setPickerMode('time');
        setShowPicker(true);
      } else {
        setSchedTime(date);
        setPickerMode('date');
      }
    } else {
      // iOS: インライン表示なのでそのまま更新
      if (date) setSchedTime(date);
    }
  }

  function openPicker() {
    setPickerMode('date');
    setShowPicker(true);
  }

  // ── Render ────────────────────────────────────────────────
  const connColor =
    conn === 'ok' ? C.green : conn === 'ng' ? C.red : C.sub;

  const connText =
    conn === 'unknown'  ? '未確認' :
    conn === 'checking' ? '確認中...' :
    conn === 'ok'       ? `接続OK${model ? ' — ' + model : ''}` :
                          '接続失敗 — カメラのWi-Fiに接続してください';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <Text style={s.h1}>INSTA360</Text>
          <Text style={s.h2}>SCHEDULER</Text>
        </View>

        {/* ── カメラ設定 ── */}
        <View style={s.card}>
          <Text style={s.label}>カメラ設定</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={cameraIp}
              onChangeText={v => { setCameraIp(v); setConn('unknown'); }}
              placeholder="192.168.42.1"
              placeholderTextColor={C.muted}
              editable={status === 'idle'}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
            <TextInput
              style={[s.input, { width: 68, marginLeft: 8 }]}
              value={cameraPort}
              onChangeText={v => { setCameraPort(v); setConn('unknown'); }}
              placeholder="80"
              placeholderTextColor={C.muted}
              editable={status === 'idle'}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[s.btnSm, status !== 'idle' && s.disabled]}
              onPress={testConnection}
              disabled={status !== 'idle' || conn === 'checking'}
            >
              <Text style={s.btnSmText}>
                {conn === 'checking' ? '...' : '確認'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.connText, { color: connColor }]}>{connText}</Text>
        </View>

        {/* ── 録画開始時刻 ── */}
        <View style={s.card}>
          <Text style={s.label}>録画開始時刻</Text>

          <TouchableOpacity
            style={[s.timePicker, status !== 'idle' && s.disabled]}
            onPress={openPicker}
            disabled={status !== 'idle'}
          >
            <Text style={s.timeText}>{fmtDateTime(schedTime)}</Text>
            {status === 'idle' && (
              <Text style={{ color: C.sub, fontSize: 11 }}>タップして変更</Text>
            )}
          </TouchableOpacity>

          {/* iOS: インラインで表示 */}
          {showPicker && Platform.OS === 'ios' && (
            <DateTimePicker
              value={schedTime}
              mode="datetime"
              display="spinner"
              onChange={onPickerChange}
              minimumDate={new Date(Date.now() + 60_000)}
              style={{ backgroundColor: C.bg }}
              textColor={C.text}
            />
          )}

          {/* Android: ダイアログ表示（日付→時刻） */}
          {showPicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={schedTime}
              mode={pickerMode}
              display="default"
              onChange={onPickerChange}
              minimumDate={new Date(Date.now() + 60_000)}
            />
          )}

          {status === 'idle' && (
            <TouchableOpacity
              style={[s.btn, conn !== 'ok' && s.btnOff]}
              onPress={schedule}
              disabled={conn !== 'ok'}
            >
              <Text style={s.btnText}>スケジュール設定</Text>
            </TouchableOpacity>
          )}

          {status === 'waiting' && (
            <TouchableOpacity style={s.btnOutline} onPress={cancel}>
              <Text style={s.btnOutlineText}>キャンセル</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── ステータス ── */}
        <View style={s.statusCard}>

          {status === 'idle' && (
            <Text style={{ color: C.sub, textAlign: 'center', fontSize: 14 }}>
              スケジュールが設定されていません
            </Text>
          )}

          {status === 'waiting' && (
            <View style={s.center}>
              <Text style={s.smallLabel}>録画開始まで</Text>
              <Text style={[s.bigNum, { color: C.orange }]}>{countdown}</Text>
              <Text style={s.subText}>{fmtDateTime(schedTime)}</Text>
            </View>
          )}

          {status === 'recording' && (
            <View style={s.center}>
              <View style={s.recRow}>
                <View style={s.recDot} />
                <Text style={s.recLabel}>REC</Text>
              </View>
              <Text style={[s.bigNum, { color: C.text }]}>{elapsed}</Text>
              <TouchableOpacity style={s.stopBtn} onPress={stopRecording}>
                <Text style={s.stopText}>■  録画停止</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'error' && (
            <View style={s.center}>
              <Text style={{ color: C.red, textAlign: 'center', marginBottom: 14 }}>
                {errorMsg}
              </Text>
              <TouchableOpacity onPress={() => { setStatus('idle'); setErrorMsg(''); }}>
                <Text style={{ color: C.sub, textDecorationLine: 'underline' }}>
                  リセット
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={s.hint}>
          Insta360カメラのWi-Fiに接続してから使用してください{'\n'}
          録画待機中・録画中は画面スリープが無効になります
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  scroll:     { flex: 1 },
  container:  { padding: 20, paddingBottom: 48 },

  header:     { alignItems: 'center', marginVertical: 20 },
  h1:         { fontSize: 34, fontWeight: '900', color: C.text, letterSpacing: 3 },
  h2:         { fontSize: 13, fontWeight: '700', color: C.orange, letterSpacing: 7, marginTop: -2 },

  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: C.sub,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row:        { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: C.text,
    fontSize: 14,
    fontFamily: MONO,
  },
  btnSm: {
    backgroundColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginLeft: 8,
  },
  btnSmText:  { color: C.text, fontSize: 12, fontWeight: '700' },
  connText:   { fontSize: 11, marginTop: 10 },

  timePicker: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  timeText:   { color: C.text, fontSize: 22, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },

  btn: {
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnOff:     { opacity: 0.3 },
  btnText:    { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  btnOutline: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnOutlineText: { color: C.sub, fontSize: 13, fontWeight: '700' },

  statusCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 30,
    minHeight: 160,
    justifyContent: 'center',
    marginBottom: 12,
  },
  center:     { alignItems: 'center' },
  smallLabel: { color: C.sub, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  bigNum:     { fontSize: 56, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 },
  subText:    { color: C.sub, fontSize: 12, marginTop: 8, fontFamily: MONO },

  recRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: C.red },
  recLabel:   { color: C.red, fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  stopBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  stopText:   { color: C.red, fontSize: 13, fontWeight: '700' },

  disabled:   { opacity: 0.4 },
  hint:       { textAlign: 'center', color: C.muted, fontSize: 11, lineHeight: 18, marginTop: 4 },
});
