/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  Volume2, 
  VolumeX, 
  ChevronRight
} from 'lucide-react';

// Data from user request
const RALLY_DATA = {
  title: "2026年全日本ラリー選手権第2戦「SAGA RALLY」レポート",
  date: "2026年4月3日(金)〜5日(日)",
  location: "佐賀県 多久市・唐津市・佐賀市周辺",
  organizer: "グラベルモータースポーツクラブ",
  details: "全12本（計102.14km）のターマックSSで構成",
  conditions: {
    leg1: "夜半からの強雨によりフルウエットかつ霧が発生する過酷な状況",
    leg2: "晴れ間が出るも濡れた路面が残る、極めて滑りやすいコンディション"
  },
  classes: [
    {
      name: "JN-1",
      driver: "勝田範彦",
      car: "GR YARIS Rally2",
      rank: "クラス2位",
      gap: "首位と1分1秒3差",
      highlights: [
        "SS1: 倒木があった難所でベストタイムを叩き出し首位発進",
        "SS2-SS6: 霧の立ち込めた午後のセクションで新井大輝に25.7秒差をつけられる"
      ],
      quote: "反省点ばかり。気持ちの問題なのか全然乗れていなかった。次戦までにしっかりと対策する"
    }
  ],
  fullText: `2026年4月3日(金)から5日(日)にかけて、佐賀県多久市、唐津市、佐賀市周辺を舞台に、JAF全日本ラリー選手権第2戦「SAGA RALLY」が開催されました。グラベルモータースポーツクラブ主催の本大会は、全12本、計102.14キロメートルのターマックSSで構成されました。

レグ1は夜半からの強雨によりフルウエットかつ霧が発生する過酷な状況、レグ2は晴れ間が出るも濡れた路面が残る、極めて滑りやすいコンディションとなりました。

JN-1クラスの勝田範彦選手は、倒木があった難所のSS1でベストタイムを叩き出し首位発進。しかし、霧が立ち込めた午後のセクションで新井大輝選手に突き放され、25.7秒差の2位で初日を終えます。

レグ2でも路面変化への対応に苦しみ、最終的に首位と1分1秒3差のクラス2位となりました。勝田選手は「反省点ばかり。気持ちの問題なのか全然乗れていなかった。次戦までにしっかりと対策する」と悔しさを滲ませ、雪辱を誓いました。`
};

export default function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const performSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(RALLY_DATA.fullText);
        utterance.lang = 'ja-JP';
        
        // Try to find a female Japanese voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => 
          (v.lang.startsWith('ja')) && 
          (v.name.includes('Female') || v.name.includes('SAYAKA') || v.name.includes('Kyoko') || v.name.includes('Mizuki') || v.name.includes('Nanami'))
        );
        
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        // Adjust rate for natural feel
        utterance.rate = 1.0;
        utterance.pitch = 1.1; // Slightly higher for "female" feel if generic

        utterance.onend = () => setIsSpeaking(false);
        speechRef.current = utterance;
        
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = performSpeak;
      } else {
        performSpeak();
      }
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="min-h-screen bg-rally-bg text-white font-body selection:bg-rally-accent selection:text-white pb-20 p-4 md:p-10">
      {/* Header Section */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-end border-b-2 border-rally-accent pb-5 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="title-group"
        >
          <h1 className="text-6xl md:text-[84px] font-black uppercase tracking-tighter leading-[0.9] font-display">
            SAGA RALLY
          </h1>
          <p className="text-lg md:text-xl font-bold text-rally-accent mt-2 uppercase">
            2026 JAF ALL JAPAN RALLY CHAMPIONSHIP RD.2
          </p>
        </motion.div>
        
        <div className="event-meta text-right font-mono text-sm text-rally-text-secondary mt-4 md:mt-0">
          DATE: 2026.04.03 - 04.05<br />
          LOC: SAGA / TAKU / KARATSU
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
          {/* Article Side */}
          <article className="space-y-10">
            <motion.section 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="report-section"
            >
              <h2 className="text-3xl font-bold mb-6 border-l-8 border-rally-accent pl-4 font-display uppercase">
                雨と霧が支配した過酷な2日間
              </h2>
              <div className="text-base leading-[1.8] text-[#e0e0e0]">
                <p>
                  Leg1は夜半からの強雨によりフルウエットかつ深い霧が発生。JN-1クラスの勝田範彦（GR YARIS Rally2）は、倒木があった難所のSS1でベストタイムを記録し首位に立つ。しかし、午後の霧のセクションで新井大輝が猛追。勝田は25.7秒差の2位で初日を終えた。Leg2では路面変化への対応に苦しみ、最終的に首位と1分1秒3差のクラス2位。コンディションの激変に翻弄される結果となった。
                </p>
              </div>

              {RALLY_DATA.classes.map((cls, idx) => (
                <div key={idx} className="bg-rally-accent/10 border-r-4 border-rally-accent p-6 mt-8 italic text-white quote-box">
                  <span className="text-lg">「{cls.quote}」</span>
                  <div className="block text-right text-sm italic font-normal text-rally-text-secondary mt-3">
                    — {cls.driver} (TOYOTA GAZOO Racing WRJ)
                  </div>
                </div>
              ))}
            </motion.section>

            <motion.section 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold border-l-8 border-rally-accent pl-4 font-display uppercase">
                FINAL STANDINGS [JN-1]
              </h2>
              
              <div className="bg-rally-stat-bg border border-rally-card-border p-6 overflow-hidden">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-rally-card-border">
                      <th className="text-left text-rally-text-secondary pb-3 uppercase tracking-wider font-bold">Pos</th>
                      <th className="text-left text-rally-text-secondary pb-3 uppercase tracking-wider font-bold">Driver</th>
                      <th className="text-right text-rally-text-secondary pb-3 uppercase tracking-wider font-bold">Time / Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-bold text-[#FFD700]">01</td>
                      <td className="py-4 font-bold">新井 大輝 (Subaru WRX)</td>
                      <td className="py-4 text-right font-mono text-white">1:24:45.2</td>
                    </tr>
                    <tr className="border-b border-white/5 text-silver">
                      <td className="py-4 font-bold text-[#C0C0C0]">02</td>
                      <td className="py-4 font-bold">勝田 範彦 (GR Yaris)</td>
                      <td className="py-4 text-right font-mono text-white">+1:01.3</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-4 font-bold text-rally-text-secondary">03</td>
                      <td className="py-4 font-bold">鎌田 卓麻 (Subaru WRX)</td>
                      <td className="py-4 text-right font-mono text-white">+2:14.8</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.section>
          </article>

          {/* Side Bar / Utility */}
          <aside className="space-y-6">
            <div className="sticky top-10 space-y-6">
              {/* Media Control / Voice Reader */}
              <div className="bg-rally-stat-bg p-6 border border-rally-card-border">
                <h4 className="text-[11px] font-bold uppercase tracking-[2px] text-rally-accent mb-4">Voice Reader</h4>
                <div className="flex items-center gap-4 text-white">
                  <button 
                    onClick={speak}
                    className={`w-14 h-14 rounded-none flex items-center justify-center transition-all border-2 border-rally-accent ${
                      isSpeaking ? 'bg-rally-accent text-white animate-pulse' : 'bg-transparent text-rally-accent hover:bg-rally-accent hover:text-white'
                    }`}
                  >
                    {isSpeaking ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                  <div>
                    <p className="font-bold text-sm">音声でレポートを聴く</p>
                    <p className="text-xs text-rally-text-secondary font-mono">FEMALE JAPANESE VOICE</p>
                  </div>
                </div>
              </div>

              {/* Stage Info Card */}
              <div className="bg-rally-stat-bg p-6 border border-rally-card-border">
                <h4 className="text-[11px] font-bold uppercase tracking-[2px] text-rally-accent mb-2">Stage Info</h4>
                <div className="text-3xl font-bold font-display text-white">
                  12 SS <span className="text-sm font-normal text-rally-text-secondary italic">/ TARMAC</span>
                </div>
                <div className="text-xs mt-2 font-mono text-rally-text-secondary uppercase">
                  Total Distance: 102.14 km
                </div>
              </div>

              {/* Conditions Card */}
              <div className="bg-rally-stat-bg p-6 border border-rally-card-border">
                <h4 className="text-[11px] font-bold uppercase tracking-[2px] text-rally-accent mb-4">Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#333] text-white text-[10px] px-2 py-1 uppercase font-bold tracking-wider">Leg 1: Heavy Rain</span>
                  <span className="bg-[#333] text-white text-[10px] px-2 py-1 uppercase font-bold tracking-wider">Leg 1: Fog</span>
                  <span className="bg-[#333] text-white text-[10px] px-2 py-1 uppercase font-bold tracking-wider">Leg 2: Cloud / Wet</span>
                </div>
              </div>

              {/* Quick Link Style Placeholder */}
              <div className="bg-rally-accent p-6 text-white">
                <Trophy size={32} className="mb-4 text-white" />
                <h4 className="font-black text-xl italic uppercase mb-2">Offical Report</h4>
                <p className="text-xs opacity-90 mb-4 leading-relaxed">
                  本レポートは公式情報を元に作成された速報版です。
                </p>
                <div className="flex justify-between text-[10px] items-center border-t border-white/30 pt-4 cursor-pointer hover:opacity-100 opacity-80 transition-opacity">
                  <span className="uppercase tracking-widest font-extrabold">View Itinerary</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 flex flex-col md:flex-row justify-between items-center text-rally-text-secondary text-xs p-6 border-t border-rally-card-border font-mono">
        <div className="flex gap-4 mb-4 md:mb-0">
          <span className="uppercase">Organizer: Gravel Motorsports Club</span>
          <span className="hidden md:inline text-white/10">|</span>
          <span className="uppercase">Official Report #022-2026</span>
        </div>
        <div>
          © 2026 MOTORSPORT MEDIA SERVICES / SAGA PREFECTURE
        </div>
      </footer>
    </div>
  );
}

