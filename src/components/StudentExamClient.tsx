import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldAlert, 
  Maximize, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PenTool, 
  Wifi, 
  WifiOff, 
  Volume2, 
  VolumeX, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  Info
} from 'lucide-react';
import { GRADE_9_MATH_QUESTIONS } from '../data/grade9MathQuestions';
import { 
  StudentInfo, 
  ExamAnswer, 
  ViolationEvent, 
  ViolationType, 
  DeviceState, 
  ProctorBroadcast,
  MathQuestion 
} from '../types/exam';
import { securityAudio } from '../services/securityAudio';
import { offlineSyncEngine } from '../services/offlineSync';
import { DigitalScratchpad } from './DigitalScratchpad';

interface StudentExamClientProps {
  questions: MathQuestion[];
  registeredStudents?: StudentInfo[];
  onViolationOccurred: (violation: ViolationEvent) => void;
  onSessionUpdate: (data: {
    student: StudentInfo;
    status: DeviceState;
    strikes: number;
    currentQuestionIndex: number;
    answeredCount: number;
    isOnline: boolean;
    isFullscreen: boolean;
    isFocused: boolean;
    score?: number;
  }) => void;
  proctorBroadcasts: ProctorBroadcast[];
  onBroadcastReceived: (id: string) => void;
  isTeacherUnlockRequested?: boolean;
}

export const StudentExamClient: React.FC<StudentExamClientProps> = ({
  questions,
  registeredStudents = [],
  onViolationOccurred,
  onSessionUpdate,
  proctorBroadcasts,
  onBroadcastReceived,
  isTeacherUnlockRequested,
}) => {
  const activeQuestions = questions.length > 0 ? questions : GRADE_9_MATH_QUESTIONS;
  const examDurationMinutes = activeQuestions.length > 30 ? 90 : (activeQuestions.length > 15 ? 60 : 45);

  // Student identification state
  const [hasStarted, setHasStarted] = useState(false);
  const [nisn, setNisn] = useState('0084567891');
  const [studentName, setStudentName] = useState('Ahmad Rizky Pratama');
  const [gradeClass, setGradeClass] = useState('9-A');

  // Exam Progress State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(examDurationMinutes * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // Keep duration in sync if questions change before exam starts
  useEffect(() => {
    if (!hasStarted) {
      setTimeLeftSeconds(examDurationMinutes * 60);
    }
  }, [hasStarted, examDurationMinutes]);

  // Security & Lockdown State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [strikes, setStrikes] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [activeViolationAlert, setActiveViolationAlert] = useState<{
    type: ViolationType;
    message: string;
    timestamp: number;
  } | null>(null);
  const [proctorPinInput, setProctorPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync network state from offlineSyncEngine
  useEffect(() => {
    const unsub = offlineSyncEngine.subscribe((count, online) => {
      setPendingSyncCount(count);
      setIsOnline(online);
    });
    return () => unsub();
  }, []);

  // Update parent dashboard with heartbeat
  useEffect(() => {
    if (!hasStarted) return;

    let status: DeviceState = 'NORMAL';
    if (isSubmitted) status = 'COMPLETED';
    else if (isLockedOut) status = 'LOCKED';
    else if (strikes > 0) status = 'WARNING';
    else if (!isOnline) status = 'OFFLINE';

    onSessionUpdate({
      student: { nisn, name: studentName, gradeClass, deviceId: 'PC-LAB-04' },
      status,
      strikes,
      currentQuestionIndex: currentIdx,
      answeredCount: Object.values(answers).filter(a => a.selectedOption !== null).length,
      isOnline,
      isFullscreen,
      isFocused,
      score: finalScore ?? undefined,
    });
  }, [hasStarted, nisn, studentName, gradeClass, strikes, isLockedOut, isSubmitted, currentIdx, answers, isOnline, isFullscreen, isFocused, finalScore, onSessionUpdate]);

  // Handle Remote Teacher Unlock
  useEffect(() => {
    if (isTeacherUnlockRequested && isLockedOut) {
      setIsLockedOut(false);
      securityAudio.stopLoudAlarm();
      setActiveViolationAlert(null);
    }
  }, [isTeacherUnlockRequested, isLockedOut]);

  // Exam Countdown Timer
  useEffect(() => {
    if (!hasStarted || isSubmitted || isLockedOut) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, isSubmitted, isLockedOut]);

  // Core Security Violation Trigger
  const triggerViolation = useCallback((type: ViolationType, description: string, details?: string) => {
    if (!hasStarted || isSubmitted) return;

    const newStrike = strikes + 1;
    setStrikes(newStrike);

    // Play warning sound or loud security siren depending on strike
    if (newStrike >= 2) {
      securityAudio.startLoudAlarm();
    } else {
      securityAudio.playWarningBeep();
    }

    const event: ViolationEvent = {
      id: `VIO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentNisn: nisn,
      studentName: studentName,
      timestamp: Date.now(),
      type,
      description,
      strikeCount: newStrike,
      details,
    };

    // Encrypt and push to offline queue and notify proctor
    offlineSyncEngine.queueViolation(event);
    onViolationOccurred(event);

    setActiveViolationAlert({
      type,
      message: description,
      timestamp: Date.now(),
    });

    // If 3 strikes reached, lock the exam completely!
    if (newStrike >= 3) {
      setIsLockedOut(true);
    }
  }, [hasStarted, isSubmitted, strikes, nisn, studentName, onViolationOccurred]);

  // 1. VISIBILITY CHANGE & TAB SWITCH DETECTION
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        setIsFocused(false);
        triggerViolation(
          'TAB_SWITCH',
          'Siswa meninggalkan tab ujian / membuka tab lain atau AI!',
          'VisibilityState: hidden'
        );
      } else {
        setIsFocused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasStarted, isSubmitted, triggerViolation]);

  // 2. WINDOW FOCUS & BLUR TRACKING
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const handleBlur = () => {
      setIsFocused(false);
      triggerViolation(
        'WINDOW_BLUR',
        'Jendela aplikasi kehilangan fokus (aplikasi lain atau floating tool diaktifkan)!',
        'Window onBlur event'
      );
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [hasStarted, isSubmitted, triggerViolation]);

  // 3. FULLSCREEN ENFORCEMENT & EXIT DETECTION
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) {
        triggerViolation(
          'FULLSCREEN_EXIT',
          'Siswa keluar dari mode layar penuh (Kiosk Mode)!',
          'Fullscreen exited'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [hasStarted, isSubmitted, triggerViolation]);

  // 4. KEYBOARD SHORTCUT BLOCKING & CONTEXT MENU PREVENTION
  useEffect(() => {
    if (!hasStarted || isSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toUpperCase();

      // Block devtools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        (isCtrlOrMeta && e.shiftKey && (key === 'I' || key === 'J' || key === 'C'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('DEVTOOLS_ATTEMPT', 'Mencoba membuka inspect element / Developer Tools (F12 / Ctrl+Shift+I)!');
        return;
      }

      // Block dangerous shortcuts: Alt+Tab, Ctrl+T, Ctrl+N, Ctrl+W, Ctrl+R, F5
      if (
        (e.altKey && (key === 'TAB' || key === 'F4')) ||
        (isCtrlOrMeta && (key === 'T' || key === 'N' || key === 'W' || key === 'R' || key === 'U' || key === 'P' || key === 'S' || key === 'F')) ||
        e.key === 'F5'
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('SHORTCUT_ATTEMPT', `Kombinasi tombol terlarang ditekan: ${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${key}!`);
        return;
      }

      // Block copy-paste
      if (isCtrlOrMeta && (key === 'C' || key === 'V' || key === 'X' || key === 'A')) {
        e.preventDefault();
        e.stopPropagation();
        triggerViolation('SHORTCUT_ATTEMPT', `Aksi salin/tempel (Clipboard) diblokir demi keamanan ujian!`);
        return;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerViolation('RIGHT_CLICK', 'Klik kanan diblokir selama ujian berlangsung.');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [hasStarted, isSubmitted, triggerViolation]);

  // Request Fullscreen to lock kiosk
  const enterFullscreenLock = async () => {
    try {
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Browser permissions fallback
    }
  };

  const handleStartExam = async () => {
    if (!studentName.trim() || !nisn.trim()) return;
    await enterFullscreenLock();
    setHasStarted(true);
  };

  // Answer selection with AES-256 local queue
  const handleSelectOption = async (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const q = activeQuestions[currentIdx];
    const prevAnswer = answers[q.id];
    const newAnswer: ExamAnswer = {
      questionId: q.id,
      selectedOption: optionKey,
      isDoubtful: prevAnswer ? prevAnswer.isDoubtful : false,
      answeredAt: Date.now(),
    };

    setAnswers(prev => ({
      ...prev,
      [q.id]: newAnswer,
    }));

    // Save with AES-256 encryption in offline queue
    await offlineSyncEngine.queueAnswer(newAnswer, nisn);
  };

  const handleToggleDoubtful = () => {
    const q = activeQuestions[currentIdx];
    const prev = answers[q.id];
    if (!prev) return;

    setAnswers(old => ({
      ...old,
      [q.id]: {
        ...prev,
        isDoubtful: !prev.isDoubtful,
      },
    }));
  };

  const handleSubmitExam = () => {
    // Calculate Score normalized to standard 0-100 scale
    let correctCount = 0;
    activeQuestions.forEach(q => {
      const ans = answers[q.id];
      if (ans && ans.selectedOption === q.correctAnswer) {
        correctCount += 1;
      }
    });

    const normalizedScore = activeQuestions.length > 0
      ? Math.round((correctCount / activeQuestions.length) * 100)
      : 0;

    setFinalScore(normalizedScore);
    setIsSubmitted(true);
    securityAudio.stopLoudAlarm();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Proctor Unlock Verification via PIN
  const handleUnlockWithPin = () => {
    const MASTER_PIN = 'GURU9MAT';
    if (proctorPinInput.trim().toUpperCase() === MASTER_PIN) {
      setIsLockedOut(false);
      setStrikes(0);
      setPinError(false);
      setProctorPinInput('');
      setActiveViolationAlert(null);
      securityAudio.stopLoudAlarm();
      enterFullscreenLock();
    } else {
      setPinError(true);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    securityAudio.setMute(next);
  };

  // Student Broadcast Notifications
  const activeBroadcasts = proctorBroadcasts.filter(b => b.targetNisn === 'ALL' || b.targetNisn === nisn);

  // =========================================================================
  // VIEW: PRE-EXAM LOGIN & VERIFICATION
  // =========================================================================
  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-sm">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Ulangan Harian Matematika Kelas 9
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              SMP Negeri 1 · Bab 1: Eksponen & Bentuk Akar, Bab 2: Persamaan Kuadrat, Bab 3: Transformasi
            </p>
          </div>
        </div>

        {/* Security Rules Briefing */}
        <div className="my-6 p-4 bg-amber-50/70 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-amber-950">
                Protokol Integritas Ujian Terkunci (Anti-Cheating Kiosk):
              </h2>
              <ul className="text-xs text-amber-900 mt-2 space-y-1.5 list-disc list-inside">
                <li>
                  <strong>Layar Penuh Terkunci:</strong> Ujian harus berjalan dalam mode layar penuh (Kiosk Mode).
                </li>
                <li>
                  <strong>Deteksi Buka Tab / AI:</strong> Pindah ke tab lain, membuka browser lain, atau aplikasi AI (ChatGPT/Gemini) akan <strong>langsung membunyikan sirine alarm</strong> dan mengirim notifikasi ke pengawas.
                </li>
                <li>
                  <strong>Blokir Shortcut & Klik Kanan:</strong> Tombol Alt+Tab, Ctrl+C/V, Ctrl+T, Ctrl+W, dan F12 dinonaktifkan otomatis.
                </li>
                <li>
                  <strong>Enkripsi AES-256:</strong> Seluruh jawaban dan log aktivitas diamankan dengan enkripsi standar industri.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Student Form */}
        <div className="space-y-4">
          {registeredStudents.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih dari Daftar Siswa Terdaftar (Opsi Cepat)
              </label>
              <select
                onChange={e => {
                  const found = registeredStudents.find(s => s.nisn === e.target.value);
                  if (found) {
                    setNisn(found.nisn);
                    setStudentName(found.name);
                    setGradeClass(found.gradeClass);
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-indigo-200 bg-indigo-50/50 rounded-lg text-indigo-950 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">-- Pilih Nama Siswa dari Daftar Lab --</option>
                {registeredStudents.map(st => (
                  <option key={st.nisn} value={st.nisn}>
                    {st.name} ({st.nisn}) · {st.gradeClass} · {st.deviceId}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor Induk Siswa Nasional (NISN)
            </label>
            <input
              type="text"
              value={nisn}
              onChange={e => setNisn(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              placeholder="Contoh: 0081234567"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Peserta
            </label>
            <input
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Contoh: Ahmad Rizky Pratama"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kelas
            </label>
            <select
              value={gradeClass}
              onChange={e => setGradeClass(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="9-A">Kelas 9-A (Matematika)</option>
              <option value="9-B">Kelas 9-B (Matematika)</option>
              <option value="9-C">Kelas 9-C (Matematika)</option>
              <option value="9-D">Kelas 9-D (Matematika)</option>
            </select>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Durasi: {examDurationMinutes} Menit · {activeQuestions.length} Soal Pilihan Ganda
          </div>

          <button
            onClick={handleStartExam}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow transition-all duration-150 active:scale-95"
          >
            <Maximize className="w-4 h-4" />
            <span>Kunci Layar & Mulai Ujian</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: POST-EXAM RESULTS SUMMARY
  // =========================================================================
  if (isSubmitted) {
    const totalQuestions = activeQuestions.length;
    const correctCount = activeQuestions.filter(
      q => answers[q.id]?.selectedOption === q.correctAnswer
    ).length;

    return (
      <div className="max-w-2xl mx-auto my-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="text-center py-6 border-b border-slate-100">
          <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Ujian Telah Selesai Dikumpulkan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Data lembar jawaban telah terenkripsi AES-256 dan terverifikasi di server pusat.
          </p>
        </div>

        {/* Score Card */}
        <div className="my-6 grid grid-cols-3 gap-3 text-center">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{finalScore ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1">Nilai Akhir (Skala 100)</div>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700 tabular-nums">{correctCount} / {totalQuestions}</div>
            <div className="text-xs text-slate-500 mt-1">Jawaban Benar</div>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-2xl font-bold text-amber-700 tabular-nums">{strikes}</div>
            <div className="text-xs text-slate-500 mt-1">Pelanggaran Tercatat</div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Nama Siswa:</span>
            <span className="font-semibold text-slate-800">{studentName} ({nisn})</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Kelas:</span>
            <span className="font-semibold text-slate-800">{gradeClass}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Integritas Keamanan:</span>
            <span className={`font-semibold ${strikes === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {strikes === 0 ? 'Sempurna (0 Insiden)' : `${strikes} Pelanggaran Terdokumentasi`}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              setHasStarted(false);
              setIsSubmitted(false);
              setStrikes(0);
              setAnswers({});
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Kembali ke Halaman Depan
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ACTIVE EXAM LOCKDOWN KIOSK
  // =========================================================================
  const currentQ: MathQuestion = activeQuestions[currentIdx] || activeQuestions[0] || GRADE_9_MATH_QUESTIONS[0];
  const currentAnswer = answers[currentQ.id];

  return (
    <div 
      ref={containerRef}
      className="exam-kiosk-active min-h-screen bg-slate-100 flex flex-col select-none relative"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Kiosk Sticky Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-800 rounded-md">
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Ulangan Harian Matematika Kelas 9</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {studentName} · {gradeClass}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold tabular-nums ${timeLeftSeconds < 300 ? 'bg-rose-950/60 border-rose-600 text-rose-300 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5">
          {/* Audio Mute status */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isMuted ? "Alarm Dibisukan" : "Alarm Aktif"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Network status */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${isOnline ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-rose-950/50 border-rose-800 text-rose-300'}`}
            title={isOnline ? "Koneksi Aman Terhubung ke Server" : "Koneksi Terputus - Sinkronisasi Offline AES-256 Aktif"}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-rose-400" />}
            <span>{isOnline ? 'Online' : 'Offline (Tersimpan Lokal)'}</span>
            {pendingSyncCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-600 text-white rounded text-[10px]">
                {pendingSyncCount}
              </span>
            )}
          </div>

          {/* Strike indicator */}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold border ${strikes > 0 ? 'bg-rose-900 border-rose-700 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Strike: {strikes}/3</span>
          </div>

          {/* Scratchpad Trigger */}
          <button
            onClick={() => setIsScratchpadOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Coret-Coret Buram</span>
          </button>
        </div>
      </header>

      {/* Proctor Announcements / Toast Banners */}
      {activeBroadcasts.length > 0 && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Pesan Langsung dari Pengawas: "{activeBroadcasts[activeBroadcasts.length - 1].message}"</span>
          </div>
          <button
            onClick={() => onBroadcastReceived(activeBroadcasts[activeBroadcasts.length - 1].id)}
            className="text-[11px] underline hover:text-white"
          >
            Mengerti
          </button>
        </div>
      )}

      {/* Main Examination Layout: 2-Zone (Stage + Palette) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Active Question Stage (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 flex flex-col">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 bg-slate-900 text-white rounded">
                  Soal No. {currentIdx + 1}
                </span>
                <span className="text-xs text-slate-500">
                  Topik: {currentQ.topic}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Bobot: {currentQ.points} Poin
              </div>
            </div>

            {/* Question Body */}
            <div className="py-6 flex-1">
              <h2 className="text-base md:text-lg font-semibold text-slate-900 leading-relaxed">
                {currentQ.question}
              </h2>

              {/* Math Formula Callout */}
              {currentQ.formula && (
                <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-base md:text-lg text-center tracking-wide">
                  {currentQ.formula}
                </div>
              )}

              {/* Options List */}
              <div className="mt-6 space-y-3">
                {currentQ.options.map(opt => {
                  const isSelected = currentAnswer?.selectedOption === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start gap-3 ${isSelected ? 'border-slate-900 bg-slate-50/80 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'}`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {opt.key}
                      </span>
                      <div className="text-sm font-medium text-slate-800 pt-0.5">
                        {opt.text}
                        {opt.formula && (
                          <span className="block font-mono text-xs text-slate-500 mt-1">
                            {opt.formula}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Question Controls */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={handleToggleDoubtful}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${currentAnswer?.isDoubtful ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span>Ragu-ragu</span>
              </button>

              {currentIdx < activeQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => Math.min(activeQuestions.length - 1, prev + 1))}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kumpulkan Ujian</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Question Navigation Palette (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Daftar Navigasi Soal
              </h3>
              <span className="text-[11px] font-mono text-slate-500">
                1 - {activeQuestions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
              {activeQuestions.map((q, idx) => {
                const ans = answers[q.id];
                const isSelected = idx === currentIdx;
                const isAnswered = ans && ans.selectedOption !== null;
                const isDoubtful = ans?.isDoubtful;

                let bgClass = 'bg-slate-50 border-slate-200 text-slate-700';
                if (isDoubtful) {
                  bgClass = 'bg-amber-400 border-amber-500 text-amber-950 font-bold';
                } else if (isAnswered) {
                  bgClass = 'bg-emerald-600 border-emerald-700 text-white font-bold';
                }

                if (isSelected) {
                  bgClass += ' ring-2 ring-slate-900 ring-offset-1';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-lg border text-xs font-mono flex items-center justify-center transition-all ${bgClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-600" />
                <span>Terjawab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                <span>Belum dijawab</span>
              </div>
            </div>
          </div>

          {/* Security Status Box */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-xs">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-4 h-4 text-slate-700" />
              <span>Sistem Proteksi Kiosk Aktif</span>
            </h4>
            <div className="space-y-1 text-slate-500 text-[11px]">
              <p>• Window focus lock: <span className="text-emerald-600 font-semibold">Aktif</span></p>
              <p>• Anti-Tab Switch AI: <span className="text-emerald-600 font-semibold">Sensitif</span></p>
              <p>• Enkripsi AES-256: <span className="text-emerald-600 font-semibold">Terverifikasi</span></p>
              <p>• Status Kiosk: <span className="text-slate-800 font-medium">{isFullscreen ? 'Layar Penuh' : 'Terbatas'}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Scratchpad */}
      <DigitalScratchpad 
        isOpen={isScratchpadOpen} 
        onClose={() => setIsScratchpadOpen(false)} 
      />

      {/* =====================================================================
          POPUP MODAL: VIOLATION ALARM MODAL (When student triggers a strike)
         ===================================================================== */}
      {activeViolationAlert && !isLockedOut && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border-2 border-rose-500 animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-rose-600">
                PERINGATAN PELANGGARAN UJIAN!
              </h2>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                {activeViolationAlert.message}
              </p>
              <div className="my-3 p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 font-semibold">
                Strike {strikes} dari 3 · Alarm Terpicu & Dilaporkan ke Guru Pengawas
              </div>
              <p className="text-[11px] text-slate-500">
                Peringatan: Mencoba membuka AI atau tab baru adalah tindakan kecurangan. Sistem akan mengunci ujian Anda secara permanen pada strike ke-3!
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setActiveViolationAlert(null);
                  securityAudio.stopLoudAlarm();
                  enterFullscreenLock();
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow transition-colors"
              >
                Saya Mengerti & Kembali ke Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POPUP MODAL: TOTAL LOCKOUT SCREEN (When 3 strikes are reached)
         ===================================================================== */}
      {isLockedOut && (
        <div className="fixed inset-0 z-50 bg-rose-950/95 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 md:p-8 shadow-2xl border-4 border-rose-600 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-rose-600 text-white rounded-full flex items-center justify-center animate-bounce">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-rose-600 tracking-tight">
              SISTEM UJIAN TERKUNCI TOTAL
            </h2>
            <p className="text-sm font-semibold text-slate-800 mt-2">
              Batas Maksimum Pelanggaran (3/3) Terlampaui!
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Siswa terdeteksi berulang kali berpindah jendela / mencoba membuka bantuan luar. Perangkat ini telah dikunci untuk menjaga integritas ujian matematika.
            </p>

            {/* Teacher Unlock Box */}
            <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800">
                <Unlock className="w-4 h-4 text-slate-700" />
                <span>Buka Kunci Pengawas (Hanya untuk Guru)</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Guru pengawas dapat membuka kunci ini secara langsung dengan memasukkan PIN Pengawas atau melalui Dasbor Pengawas Pusat.
              </p>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={proctorPinInput}
                  onChange={e => {
                    setProctorPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="Masukkan PIN Guru..."
                  className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono tracking-widest"
                />
                <button
                  onClick={handleUnlockWithPin}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Buka Kunci
                </button>
              </div>

              {pinError && (
                <div className="text-[11px] text-rose-600 font-semibold mt-2">
                  PIN Pengawas tidak cocok! Hubungi guru pengawas ruang.
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400">
              ID Perangkat: PC-LAB-04 · Waktu Insiden: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
