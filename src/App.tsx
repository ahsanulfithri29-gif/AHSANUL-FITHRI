import { useState, useEffect, useCallback } from 'react';
import { StudentExamClient } from './components/StudentExamClient';
import { TeacherDashboard } from './components/TeacherDashboard';
import { HeaderNav } from './components/HeaderNav';
import { ElectronViewerModal } from './components/ElectronViewerModal';
import { ShareExamLinkModal } from './components/ShareExamLinkModal';
import { TeacherLoginModal } from './components/TeacherLoginModal';
import { 
  StudentSession, 
  ViolationEvent, 
  EncryptedPacket, 
  ProctorBroadcast, 
  StudentInfo, 
  DeviceState,
  MathQuestion 
} from './types/exam';
import { offlineSyncEngine, PendingQueueItem } from './services/offlineSync';
import { securityAudio } from './services/securityAudio';
import { encryptAES256 } from './services/cryptoService';
import { GRADE_9_MATH_QUESTIONS } from './data/grade9MathQuestions';

// Initial simulated classroom peers in Computer Lab 1
const INITIAL_SIMULATED_STUDENTS: StudentSession[] = [
  {
    student: { nisn: '0081234501', name: 'Budi Santoso', gradeClass: '9-A', deviceId: 'PC-LAB-01' },
    status: 'NORMAL',
    strikes: 0,
    lastHeartbeat: Date.now(),
    currentQuestionIndex: 6,
    answeredCount: 6,
    isOnline: true,
    isFullscreen: true,
    isFocused: true,
    violations: [],
    startedAt: Date.now() - 15 * 60 * 1000,
  },
  {
    student: { nisn: '0081234502', name: 'Siti Nurhaliza', gradeClass: '9-A', deviceId: 'PC-LAB-02' },
    status: 'WARNING',
    strikes: 1,
    lastHeartbeat: Date.now(),
    currentQuestionIndex: 8,
    answeredCount: 7,
    isOnline: true,
    isFullscreen: true,
    isFocused: true,
    violations: [
      {
        id: 'v-01',
        studentNisn: '0081234502',
        studentName: 'Siti Nurhaliza',
        timestamp: Date.now() - 5 * 60 * 1000,
        type: 'WINDOW_BLUR',
        description: 'Jendela kehilangan fokus (mencoba alt-tab)',
        strikeCount: 1,
      }
    ],
    startedAt: Date.now() - 16 * 60 * 1000,
  },
  {
    student: { nisn: '0081234503', name: 'Dwi Cahyono', gradeClass: '9-A', deviceId: 'PC-LAB-03' },
    status: 'LOCKED',
    strikes: 3,
    lastHeartbeat: Date.now(),
    currentQuestionIndex: 4,
    answeredCount: 4,
    isOnline: true,
    isFullscreen: false,
    isFocused: false,
    violations: [
      {
        id: 'v-02',
        studentNisn: '0081234503',
        studentName: 'Dwi Cahyono',
        timestamp: Date.now() - 8 * 60 * 1000,
        type: 'TAB_SWITCH',
        description: 'Membuka tab baru browser',
        strikeCount: 1,
      },
      {
        id: 'v-03',
        studentNisn: '0081234503',
        studentName: 'Dwi Cahyono',
        timestamp: Date.now() - 6 * 60 * 1000,
        type: 'DEVTOOLS_ATTEMPT',
        description: 'Membuka inspect element (F12)',
        strikeCount: 2,
      },
      {
        id: 'v-04',
        studentNisn: '0081234503',
        studentName: 'Dwi Cahyono',
        timestamp: Date.now() - 3 * 60 * 1000,
        type: 'FULLSCREEN_EXIT',
        description: 'Keluar dari layar penuh Kiosk - Sistem terkunci!',
        strikeCount: 3,
      }
    ],
    startedAt: Date.now() - 17 * 60 * 1000,
  },
  {
    student: { nisn: '0081234505', name: 'Rina Rahmawati', gradeClass: '9-A', deviceId: 'PC-LAB-05' },
    status: 'COMPLETED',
    strikes: 0,
    lastHeartbeat: Date.now(),
    currentQuestionIndex: 9,
    answeredCount: 10,
    isOnline: true,
    isFullscreen: false,
    isFocused: true,
    violations: [],
    startedAt: Date.now() - 30 * 60 * 1000,
    submittedAt: Date.now() - 2 * 60 * 1000,
    score: 90,
  },
  {
    student: { nisn: '0081234506', name: 'Farhan Maulana', gradeClass: '9-A', deviceId: 'PC-LAB-06' },
    status: 'NORMAL',
    strikes: 0,
    lastHeartbeat: Date.now(),
    currentQuestionIndex: 5,
    answeredCount: 5,
    isOnline: true,
    isFullscreen: true,
    isFocused: true,
    violations: [],
    startedAt: Date.now() - 12 * 60 * 1000,
  },
  {
    student: { nisn: '0081234507', name: 'Maya Anggraini', gradeClass: '9-A', deviceId: 'PC-LAB-07' },
    status: 'NORMAL',
    strikes: 0,
    lastHeartbeat: Date.now(),
    currentQuestionIndex: 7,
    answeredCount: 7,
    isOnline: true,
    isFullscreen: true,
    isFocused: true,
    violations: [],
    startedAt: Date.now() - 14 * 60 * 1000,
  },
];

export default function App() {
  // Master PIN for teacher access
  const [masterPin, setMasterPin] = useState<string>(() => {
    try {
      return localStorage.getItem('MATH9_MASTER_PIN') || 'GURU9MAT';
    } catch {
      return 'GURU9MAT';
    }
  });

  // URL Role Detection: ?role=siswa or #siswa forces Student Mode with ZERO teacher UI
  const [currentView, setCurrentView] = useState<'STUDENT' | 'TEACHER'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const role = params.get('role')?.toLowerCase() || params.get('mode')?.toLowerCase();
      if (role === 'siswa' || role === 'student' || hash === '#siswa' || hash === '#student') {
        return 'STUDENT';
      }
      if (role === 'guru' || role === 'teacher' || hash === '#guru') {
        return 'TEACHER';
      }
    }
    return 'TEACHER';
  });

  // Teacher Authentication state
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.toLowerCase();
      const role = params.get('role')?.toLowerCase() || params.get('mode')?.toLowerCase();
      if (role === 'siswa' || role === 'student' || hash === '#siswa' || hash === '#student') {
        return false;
      }
      const savedAuth = sessionStorage.getItem('MATH9_TEACHER_AUTH');
      return savedAuth === 'true' || true;
    }
    return true;
  });

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isTeacherLoginModalOpen, setIsTeacherLoginModalOpen] = useState(false);

  const [sessions, setSessions] = useState<StudentSession[]>(INITIAL_SIMULATED_STUDENTS);
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [encryptedAuditLogs, setEncryptedAuditLogs] = useState<EncryptedPacket[]>([]);
  const [broadcasts, setBroadcasts] = useState<ProctorBroadcast[]>([]);
  const [isElectronModalOpen, setIsElectronModalOpen] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [teacherUnlockStudentTrigger, setTeacherUnlockStudentTrigger] = useState(false);

  // Persistent Question Bank & Student Roster
  const [questions, setQuestions] = useState<MathQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('MATH9_QUESTIONS');
      return saved ? JSON.parse(saved) : GRADE_9_MATH_QUESTIONS;
    } catch {
      return GRADE_9_MATH_QUESTIONS;
    }
  });

  const [registeredStudents, setRegisteredStudents] = useState<StudentInfo[]>(() => {
    try {
      const saved = localStorage.getItem('MATH9_STUDENTS');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_SIMULATED_STUDENTS.map(s => s.student);
  });

  // Listen for cross-tab updates to questions, students, or PIN
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'MATH9_QUESTIONS' && e.newValue) {
        try { setQuestions(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'MATH9_STUDENTS' && e.newValue) {
        try { setRegisteredStudents(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'MATH9_MASTER_PIN' && e.newValue) {
        setMasterPin(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleUpdateMasterPin = (newPin: string) => {
    setMasterPin(newPin);
    try {
      localStorage.setItem('MATH9_MASTER_PIN', newPin);
    } catch {}
  };

  const handleTeacherLogout = () => {
    setIsTeacherAuthenticated(false);
    sessionStorage.removeItem('MATH9_TEACHER_AUTH');
    setCurrentView('STUDENT');
  };

  const handleRequestTeacherLogin = () => {
    setIsTeacherLoginModalOpen(true);
  };

  const handleTeacherLoginSuccess = () => {
    setIsTeacherAuthenticated(true);
    sessionStorage.setItem('MATH9_TEACHER_AUTH', 'true');
    setCurrentView('TEACHER');
    setIsTeacherLoginModalOpen(false);
  };

  const handleViewChange = (targetView: 'STUDENT' | 'TEACHER') => {
    if (targetView === 'TEACHER' && !isTeacherAuthenticated) {
      setIsTeacherLoginModalOpen(true);
      return;
    }
    setCurrentView(targetView);
  };

  const handleUpdateQuestions = (newQuestions: MathQuestion[]) => {
    setQuestions(newQuestions);
    try {
      localStorage.setItem('MATH9_QUESTIONS', JSON.stringify(newQuestions));
    } catch {
      // ignore
    }
  };

  const handleUpdateStudents = (newStudents: StudentInfo[]) => {
    setRegisteredStudents(newStudents);
    try {
      localStorage.setItem('MATH9_STUDENTS', JSON.stringify(newStudents));
    } catch {
      // ignore
    }

    // Also update sessions to reflect new roster
    setSessions(prev => {
      const existingMap = new Map(prev.map(s => [s.student.nisn, s]));
      return newStudents.map(st => {
        if (existingMap.has(st.nisn)) {
          return {
            ...existingMap.get(st.nisn)!,
            student: st,
          };
        }
        return {
          student: st,
          status: 'NORMAL' as DeviceState,
          strikes: 0,
          lastHeartbeat: Date.now(),
          currentQuestionIndex: 0,
          answeredCount: 0,
          isOnline: true,
          isFullscreen: true,
          isFocused: true,
          violations: [],
          startedAt: Date.now(),
        };
      });
    });
  };

  // Initialize seed encrypted packets
  useEffect(() => {
    async function seedEncryptedPackets() {
      const initialSeedData = [
        {
          event: 'EXAM_SESSION_INITIALIZED',
          subject: 'Ulangan Harian Matematika Kelas 9',
          lab: 'Komputer 1',
          totalStudents: 12,
          securityProtocol: 'KIOSK_FULLSCREEN_SHORTCUT_BLOCK',
          timestamp: Date.now() - 25 * 60 * 1000,
        },
        {
          event: 'SECURITY_AUDIT_CHECKPOINT',
          nisn: '0081234503',
          student: 'Dwi Cahyono',
          violation: 'FULLSCREEN_EXIT',
          action: 'KIOSK_LOCKED',
          timestamp: Date.now() - 3 * 60 * 1000,
        }
      ];

      const packets: EncryptedPacket[] = [];
      for (const item of initialSeedData) {
        const packet = await encryptAES256(item);
        packets.push(packet);
      }
      setEncryptedAuditLogs(packets);
    }

    seedEncryptedPackets();
  }, []);

  // Listen for sync queue events from offline engine
  useEffect(() => {
    const handleServerSync = (e: Event) => {
      const customEvent = e as CustomEvent<PendingQueueItem>;
      if (customEvent.detail && customEvent.detail.encryptedPacket) {
        setEncryptedAuditLogs(prev => [customEvent.detail.encryptedPacket, ...prev]);
      }
    };

    window.addEventListener('MATH9_SERVER_SYNC_EVENT', handleServerSync);
    return () => {
      window.removeEventListener('MATH9_SERVER_SYNC_EVENT', handleServerSync);
    };
  }, []);

  // Handle active student heartbeat & updates
  const handleStudentSessionUpdate = useCallback((data: {
    student: StudentInfo;
    status: DeviceState;
    strikes: number;
    currentQuestionIndex: number;
    answeredCount: number;
    isOnline: boolean;
    isFullscreen: boolean;
    isFocused: boolean;
    score?: number;
  }) => {
    setSessions(prev => {
      const existsIndex = prev.findIndex(s => s.student.nisn === data.student.nisn);
      const updatedItem: StudentSession = {
        student: data.student,
        status: data.status,
        strikes: data.strikes,
        lastHeartbeat: Date.now(),
        currentQuestionIndex: data.currentQuestionIndex,
        answeredCount: data.answeredCount,
        isOnline: data.isOnline,
        isFullscreen: data.isFullscreen,
        isFocused: data.isFocused,
        violations: prev.find(s => s.student.nisn === data.student.nisn)?.violations || [],
        startedAt: prev.find(s => s.student.nisn === data.student.nisn)?.startedAt || Date.now(),
        score: data.score,
      };

      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = updatedItem;
        return copy;
      } else {
        return [updatedItem, ...prev];
      }
    });
  }, []);

  // Handle new violation from active student
  const handleViolationOccurred = useCallback((viol: ViolationEvent) => {
    setViolations(prev => [viol, ...prev]);

    // Also link to session
    setSessions(prev => {
      return prev.map(s => {
        if (s.student.nisn === viol.studentNisn) {
          return {
            ...s,
            strikes: viol.strikeCount,
            status: viol.strikeCount >= 3 ? 'LOCKED' : 'WARNING',
            violations: [viol, ...s.violations],
          };
        }
        return s;
      });
    });

    // Encrypt violation for central server log
    encryptAES256(viol).then(packet => {
      setEncryptedAuditLogs(logs => [packet, ...logs]);
    });
  }, []);

  // Proctor Actions
  const handleUnlockStudent = (nisn: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.student.nisn === nisn) {
          return {
            ...s,
            status: 'NORMAL',
            strikes: 0,
            isFullscreen: true,
            isFocused: true,
          };
        }
        return s;
      })
    );

    // If it's the active student on screen
    setTeacherUnlockStudentTrigger(true);
    setTimeout(() => setTeacherUnlockStudentTrigger(false), 500);

    // Stop loud siren if it was ringing
    securityAudio.stopLoudAlarm();
  };

  const handleResetStrikes = (nisn: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.student.nisn === nisn) {
          return {
            ...s,
            strikes: 0,
            status: 'NORMAL',
          };
        }
        return s;
      })
    );
    securityAudio.stopLoudAlarm();
  };

  const handleForceSubmit = (nisn: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.student.nisn === nisn) {
          return {
            ...s,
            status: 'COMPLETED',
            score: s.score ?? Math.floor(Math.random() * 30) + 70,
          };
        }
        return s;
      })
    );
  };

  const handleSendBroadcast = (broadcast: ProctorBroadcast) => {
    setBroadcasts(prev => [...prev, broadcast]);
    securityAudio.playProctorAlert();
  };

  const handleDismissBroadcast = (id: string) => {
    setBroadcasts(prev => prev.filter(b => b.id !== id));
  };

  const handleToggleOffline = () => {
    const next = !isSimulatedOffline;
    setIsSimulatedOffline(next);
    offlineSyncEngine.setSimulatedOffline(next);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    securityAudio.setMute(next);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar - Automatically adapts between Student & Teacher */}
      <HeaderNav
        currentView={currentView}
        isTeacherAuthenticated={isTeacherAuthenticated}
        onViewChange={handleViewChange}
        onOpenElectronModal={() => setIsElectronModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onRequestTeacherLogin={handleRequestTeacherLogin}
        onTeacherLogout={handleTeacherLogout}
        isSimulatedOffline={isSimulatedOffline}
        onToggleOffline={handleToggleOffline}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        activeViolationsCount={violations.length}
      />

      {/* Main View Area: Strict segregation between Student and Teacher */}
      <main className="flex-1">
        {currentView === 'STUDENT' || !isTeacherAuthenticated ? (
          <StudentExamClient
            questions={questions}
            registeredStudents={registeredStudents}
            onViolationOccurred={handleViolationOccurred}
            onSessionUpdate={handleStudentSessionUpdate}
            proctorBroadcasts={broadcasts}
            onBroadcastReceived={handleDismissBroadcast}
            isTeacherUnlockRequested={teacherUnlockStudentTrigger}
          />
        ) : (
          <TeacherDashboard
            sessions={sessions}
            violations={violations}
            encryptedAuditLogs={encryptedAuditLogs}
            questions={questions}
            onUpdateQuestions={handleUpdateQuestions}
            students={registeredStudents}
            onUpdateStudents={handleUpdateStudents}
            onUnlockStudent={handleUnlockStudent}
            onResetStrikes={handleResetStrikes}
            onForceSubmit={handleForceSubmit}
            onSendBroadcast={handleSendBroadcast}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />
        )}
      </main>

      {/* Share Exam Link Modal (Allows generating student-only link) */}
      <ShareExamLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        masterPin={masterPin}
        onUpdatePin={handleUpdateMasterPin}
      />

      {/* Teacher PIN Login Verification Modal */}
      <TeacherLoginModal
        isOpen={isTeacherLoginModalOpen}
        onClose={() => setIsTeacherLoginModalOpen(false)}
        masterPin={masterPin}
        onSuccess={handleTeacherLoginSuccess}
      />

      {/* Electron Kiosk Source Code Modal */}
      <ElectronViewerModal
        isOpen={isElectronModalOpen}
        onClose={() => setIsElectronModalOpen(false)}
      />
    </div>
  );
}
