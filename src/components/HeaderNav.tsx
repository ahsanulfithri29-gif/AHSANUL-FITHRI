import React from 'react';
import { 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  Terminal, 
  Share2, 
  Lock, 
  LogOut,
  KeyRound,
  Eye
} from 'lucide-react';
import sealImg from '../assets/images/math_exam_seal_1790998436875.jpg';

interface HeaderNavProps {
  currentView: 'STUDENT' | 'TEACHER';
  isTeacherAuthenticated: boolean;
  onViewChange: (view: 'STUDENT' | 'TEACHER') => void;
  onOpenElectronModal: () => void;
  onOpenShareModal: () => void;
  onRequestTeacherLogin: () => void;
  onTeacherLogout: () => void;
  isSimulatedOffline: boolean;
  onToggleOffline: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeViolationsCount: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  isTeacherAuthenticated,
  onViewChange,
  onOpenElectronModal,
  onOpenShareModal,
  onRequestTeacherLogin,
  onTeacherLogout,
  isSimulatedOffline,
  onToggleOffline,
  isMuted,
  onToggleMute,
  activeViolationsCount,
}) => {
  // If the current view is STUDENT and user is not authenticated as teacher,
  // show pure STUDENT HEADER with ZERO teacher controls/links.
  const isPureStudentView = currentView === 'STUDENT' && !isTeacherAuthenticated;

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-slate-200">
      {/* Zone 1: Single text wordmark with official academic badge */}
      <div className="flex items-center gap-2.5">
        <img
          src={sealImg}
          alt="Segel Ujian Terkunci Matematika"
          referrerPolicy="no-referrer"
          className="w-7 h-7 rounded-md object-cover border border-slate-200 shadow-xs"
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              MathLock Kelas 9
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isPureStudentView 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isPureStudentView ? 'Ruang Ujian Terkunci' : 'Dasbor Pengawas'}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Navigation Links (TEACHER ONLY) */}
      {!isPureStudentView ? (
        <nav className="hidden md:flex items-center gap-5 text-xs font-semibold">
          <button
            onClick={() => onViewChange('TEACHER')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1.5 ${currentView === 'TEACHER' ? 'text-slate-900 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <span>Dasbor Pengawas</span>
            {activeViolationsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => onViewChange('STUDENT')}
            className={`transition-colors whitespace-nowrap flex items-center gap-1 ${currentView === 'STUDENT' ? 'text-slate-900 underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}
            title="Pratinjau tampilan lembar ujian siswa"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Pratinjau Layar Siswa</span>
          </button>

          <button
            onClick={onOpenElectronModal}
            className="text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Kode Electron JS Kiosk</span>
          </button>

          <button
            onClick={onToggleOffline}
            className={`transition-colors whitespace-nowrap flex items-center gap-1 ${isSimulatedOffline ? 'text-rose-600' : 'text-slate-500 hover:text-slate-900'}`}
            title="Klik untuk mensimulasikan internet terputus dan menguji sinkronisasi offline AES-256"
          >
            {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-rose-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isSimulatedOffline ? 'Status: Simulasi Terputus' : 'Simulasi Offline'}</span>
          </button>
        </nav>
      ) : (
        /* In Student Mode: Clean security reassurance for students */
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Sistem Deteksi Anti-Contek Aktif
          </span>
          <span className="text-[11px] text-slate-400">
            SMP / MTs Kelas 9
          </span>
        </div>
      )}

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Audio Mute/Unmute */}
        <button
          onClick={onToggleMute}
          className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${isMuted ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          title={isMuted ? "Alarm Dinonaktifkan" : "Alarm Keras Aktif"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
          <span className="hidden sm:inline text-xs">{isMuted ? 'Sirine Senyap' : 'Sirine Aktif'}</span>
        </button>

        {/* Action Buttons depending on role */}
        {!isPureStudentView ? (
          <>
            {/* Share Link Button for Teacher */}
            <button
              onClick={onOpenShareModal}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              title="Bagikan tautan khusus siswa (bebas dasbor guru)"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Bagikan Link Siswa</span>
              <span className="sm:hidden">Share</span>
            </button>

            {/* Logout from Teacher Mode */}
            <button
              onClick={onTeacherLogout}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
              title="Keluar dari Dasbor Guru / Kunci Dasbor"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kunci Dasbor</span>
            </button>
          </>
        ) : (
          /* Subtle PIN unlock for teacher on student device */
          <button
            onClick={onRequestTeacherLogin}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
            title="Akses Pengawas Guru (Memerlukan PIN)"
          >
            <KeyRound className="w-4 h-4" />
            <span className="text-[11px] font-medium hidden md:inline text-slate-500">
              Akses Guru
            </span>
          </button>
        )}
      </div>
    </header>
  );
};

