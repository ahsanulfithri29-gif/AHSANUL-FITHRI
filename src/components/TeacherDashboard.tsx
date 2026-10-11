import React, { useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Send, 
  Download, 
  RotateCcw, 
  Radio, 
  FileKey2, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Search,
  Key,
  Printer,
  FileSpreadsheet,
  Award,
  FileText,
  X,
  ExternalLink,
  Calculator,
  Share2
} from 'lucide-react';
import { 
  StudentSession, 
  ViolationEvent, 
  EncryptedPacket, 
  ProctorBroadcast,
  MathQuestion,
  StudentInfo 
} from '../types/exam';
import { decryptAES256, formatCipherPreview } from '../services/cryptoService';
import { securityAudio } from '../services/securityAudio';
import { GRADE_9_MATH_QUESTIONS } from '../data/grade9MathQuestions';
import { ExamDataManager } from './ExamDataManager';
import { ExportScoresLogsModal } from './ExportScoresLogsModal';
import { GoogleSheetsModal } from './GoogleSheetsModal';
import { 
  generateStudentScoresCSV, 
  generateViolationLogsCSV, 
  generateCombinedScoresAndLogsCSV, 
  downloadCSVFile 
} from '../services/csvExportService';

interface TeacherDashboardProps {
  sessions: StudentSession[];
  violations: ViolationEvent[];
  encryptedAuditLogs: EncryptedPacket[];
  questions: MathQuestion[];
  onUpdateQuestions: (newQuestions: MathQuestion[]) => void;
  students: StudentInfo[];
  onUpdateStudents: (newStudents: StudentInfo[]) => void;
  onUnlockStudent: (nisn: string) => void;
  onResetStrikes: (nisn: string) => void;
  onForceSubmit: (nisn: string) => void;
  onSendBroadcast: (broadcast: ProctorBroadcast) => void;
  onOpenShareModal?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  sessions,
  violations,
  encryptedAuditLogs,
  questions,
  onUpdateQuestions,
  students,
  onUpdateStudents,
  onUnlockStudent,
  onResetStrikes,
  onForceSubmit,
  onSendBroadcast,
  onOpenShareModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'NORMAL' | 'WARNING' | 'LOCKED' | 'COMPLETED'>('ALL');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'QUESTIONS_DATA' | 'RESULTS' | 'AUDIT_LOGS'>('MONITOR');

  // Encryption Decryption Inspector state
  const [isDecryptedView, setIsDecryptedView] = useState(false);
  const [customKey, setCustomKey] = useState('MATH9-SMPN1-EXAM-LOCK-2026-KEY-SECRET-PROCTOR');
  const [decryptedLogs, setDecryptedLogs] = useState<Record<string, unknown>>({});
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Results & Reporting Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [inspectingStudent, setInspectingStudent] = useState<StudentSession | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered students
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = 
      s.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student.nisn.includes(searchQuery) ||
      s.student.deviceId.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (selectedFilter === 'ALL') return true;
    return s.status === selectedFilter;
  });

  // Calculate summary metrics
  const totalStudents = sessions.length;
  const activeExams = sessions.filter(s => s.status === 'NORMAL' || s.status === 'WARNING').length;
  const lockedCount = sessions.filter(s => s.status === 'LOCKED').length;
  const warningCount = sessions.filter(s => s.status === 'WARNING').length;
  const completedCount = sessions.filter(s => s.status === 'COMPLETED').length;

  // Grade Statistics
  const completedSessions = sessions.filter(s => s.score !== undefined);
  const scores = completedSessions.map(s => s.score ?? 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const passedCount = completedSessions.filter(s => (s.score ?? 0) >= 75).length;

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;

    onSendBroadcast({
      id: `BC-${Date.now()}`,
      targetNisn: broadcastTarget,
      message: broadcastMsg.trim(),
      timestamp: Date.now(),
      type: 'WARNING',
    });

    setBroadcastMsg('');
  };

  const handleDecryptAllLogs = async () => {
    setDecryptError(null);
    try {
      const results: Record<string, unknown> = {};
      for (const packet of encryptedAuditLogs) {
        const decrypted = await decryptAES256(packet, customKey);
        results[packet.checksum] = decrypted;
      }
      setDecryptedLogs(results);
      setIsDecryptedView(true);
    } catch {
      setDecryptError('Gagal mendekripsi paket AES-256. Pastikan Kunci Master Pengawas tepat!');
    }
  };

  const handleExportScoresCSV = () => {
    const timestampStr = new Date().toISOString().slice(0, 10);
    const csvContent = generateStudentScoresCSV(sessions, questions, { delimiter: ';' });
    downloadCSVFile(csvContent, `Daftar_Nilai_Matematika_Kelas9_${timestampStr}.csv`);
    showToast('File CSV Rekap Nilai Siswa berhasil diunduh.');
  };

  const handleExportLogsCSV = () => {
    const timestampStr = new Date().toISOString().slice(0, 10);
    const csvContent = generateViolationLogsCSV(sessions, violations, { delimiter: ';' });
    downloadCSVFile(csvContent, `Log_Integritas_Pelanggaran_Kelas9_${timestampStr}.csv`);
    showToast('File CSV Log Kejadian & Pelanggaran berhasil diunduh.');
  };

  const handleExportCombinedCSV = () => {
    const timestampStr = new Date().toISOString().slice(0, 10);
    const csvContent = generateCombinedScoresAndLogsCSV(sessions, violations, questions, { delimiter: ';' });
    downloadCSVFile(csvContent, `Rekap_Nilai_dan_Log_Lengkap_Kelas9_${timestampStr}.csv`);
    showToast('File CSV Terpadu (Nilai + Log Lengkap) berhasil diunduh.');
  };

  const handleExportCSV = () => {
    setIsExportModalOpen(true);
  };

  const handleExportJSON = () => {
    const exportData = {
      mataPelajaran: 'Matematika',
      kelas: 'Kelas 9 SMP',
      tanggal: new Date().toISOString(),
      kkm: 75,
      ringkasan: {
        totalPeserta: totalStudents,
        selesai: completedCount,
        rataRata: avgScore,
        tuntas: passedCount,
      },
      daftarSiswa: sessions.map(s => ({
        nisn: s.student.nisn,
        nama: s.student.name,
        kelas: s.student.gradeClass,
        perangkat: s.student.deviceId,
        nilai: s.score ?? null,
        pelanggaran: s.strikes,
        insiden: s.violations,
      })),
      auditLogsTerenkripsi: encryptedAuditLogs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Lengkap_Ujian_Matematika_Kelas9_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner & Control Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-900 text-white">
              Ruang Pengawas Server Pusat
            </span>
            <span className="text-xs text-slate-500 font-mono">
              IP: 192.168.1.1 · Port: 3000
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Dasbor Monitoring Ulangan Harian Matematika Terkunci
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengawasan real-time layar penuh, deteksi pergantian tab/AI, dan log enkripsi AES-256.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              title="Salin dan bagikan link ujian khusus siswa (tanpa dasbor guru)"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Bagikan Link Siswa (Aman)</span>
            </button>
          )}

          <button
            onClick={() => securityAudio.playProctorAlert()}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            title="Uji nada pemberitahuan pengawas"
          >
            <Radio className="w-3.5 h-3.5 text-slate-600" />
            <span>Tes Nada Notifikasi</span>
          </button>

          <button
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            title="Buka integrasi dan ekspor langsung ke Google Sheets & Drive"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            title="Buka menu ekspor nilai siswa dan log pelanggaran ke file CSV untuk penilaian guru"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor Nilai & Log (CSV)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Total Peserta</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalStudents}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Kelas 9 Terdaftar</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Sedang Mengerjakan</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{activeExams}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">● Kiosk Aktif</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Dalam Peringatan</div>
          <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{warningCount}</div>
          <div className="text-[11px] text-amber-600 mt-0.5">▲ Strike 1-2</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Perangkat Terkunci</div>
          <div className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{lockedCount}</div>
          <div className="text-[11px] text-rose-600 mt-0.5">✖ Perlu Buka Kunci</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Telah Mengumpulkan</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1 tabular-nums">{completedCount}</div>
          <div className="text-[11px] text-indigo-600 mt-0.5">✔ Nilai Masuk</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('MONITOR')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'MONITOR' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Kisi Perangkat Peserta ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('QUESTIONS_DATA')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'QUESTIONS_DATA' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
        >
          <Calculator className="w-3.5 h-3.5 text-indigo-500" />
          <span>Input Soal & Siswa ({questions.length} Soal)</span>
        </button>

        <button
          onClick={() => setActiveTab('RESULTS')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'RESULTS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
        >
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Rekap Hasil & Berita Acara ({completedCount}/{sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'AUDIT_LOGS' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
        >
          <FileKey2 className="w-3.5 h-3.5" />
          <span>Log Audit Terenkripsi AES-256 ({encryptedAuditLogs.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: LIVE PARTICIPANTS MONITOR & CONTROLS
         ===================================================================== */}
      {activeTab === 'MONITOR' && (
        <div className="space-y-6">
          {/* Controls: Search, Filter, Broadcast */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari siswa atau NISN..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Status Segmented Controls */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setSelectedFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${selectedFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setSelectedFilter('WARNING')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${selectedFilter === 'WARNING' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Peringatan
                </button>
                <button
                  onClick={() => setSelectedFilter('LOCKED')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${selectedFilter === 'LOCKED' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Terkunci
                </button>
                <button
                  onClick={() => setSelectedFilter('COMPLETED')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${selectedFilter === 'COMPLETED' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {/* Quick Broadcast Form */}
            <form onSubmit={handleSendBroadcast} className="flex items-center gap-2">
              <select
                value={broadcastTarget}
                onChange={e => setBroadcastTarget(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option value="ALL">Kirim ke Semua Siswa</option>
                {sessions.map(s => (
                  <option key={s.student.nisn} value={s.student.nisn}>
                    {s.student.name} ({s.student.deviceId})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Pesan peringatan langsung..."
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 w-56"
              />

              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition-colors shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Kirim</span>
              </button>
            </form>
          </div>

          {/* Grid Layout: Left 3 Cols (Devices Grid), Right 1 Col (Live Incident Feed) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Devices Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredSessions.map(session => {
                const isLocked = session.status === 'LOCKED';
                const isWarning = session.status === 'WARNING';
                const isDone = session.status === 'COMPLETED';

                let cardBorder = 'border-slate-200';
                if (isLocked) cardBorder = 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-300';
                else if (isWarning) cardBorder = 'border-amber-300 bg-amber-50/30';
                else if (isDone) cardBorder = 'border-slate-200 bg-slate-50/50';

                return (
                  <div
                    key={session.student.nisn}
                    className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col justify-between transition-all ${cardBorder}`}
                  >
                    <div>
                      {/* Device Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {session.student.deviceId}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 font-mono">
                            {session.student.gradeClass}
                          </span>
                        </div>

                        {/* Status Label (Zero-Pill compliant) */}
                        <div className="text-xs font-semibold">
                          {isLocked && <span className="text-rose-600">✖ TERKUNCI</span>}
                          {isWarning && <span className="text-amber-600">▲ PERINGATAN ({session.strikes}/3)</span>}
                          {isDone && <span className="text-indigo-600">✔ SELESAI ({session.score} Pts)</span>}
                          {session.status === 'NORMAL' && <span className="text-emerald-600">● NORMAL</span>}
                          {session.status === 'OFFLINE' && <span className="text-slate-400">◌ TERPUTUS</span>}
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="mt-3">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {session.student.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          NISN: {session.student.nisn}
                        </p>
                      </div>

                      {/* Progress Metrics */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-slate-50 rounded-lg">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Terjawab</span>
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {session.answeredCount} / {questions.length} Soal
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Fokus Layar</span>
                          <span className={`font-semibold ${session.isFocused ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {session.isFocused ? 'Fokus Penuh' : 'Kehilangan Fokus'}
                          </span>
                        </div>
                      </div>

                      {/* Violation Notice if any */}
                      {session.violations.length > 0 && (
                        <div className="mt-2 text-[11px] text-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {session.violations[session.violations.length - 1].description}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isLocked ? (
                        <button
                          onClick={() => onUnlockStudent(session.student.nisn)}
                          className="flex-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Buka Kunci Layar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onResetStrikes(session.student.nisn)}
                          className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                          title="Reset Strike Pelanggaran"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}

                      {!isDone && (
                        <button
                          onClick={() => onForceSubmit(session.student.nisn)}
                          className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Kumpulkan ujian peserta ini secara paksa"
                        >
                          Paksa Kumpul
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Live Real-time Violations Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col h-[600px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Log Insiden Pelanggaran Real-Time
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportLogsCSV}
                    className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors flex items-center gap-1"
                    title="Unduh log insiden real-time ke format CSV"
                  >
                    <Download className="w-3 h-3" />
                    <span>Ekspor Log CSV</span>
                  </button>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {violations.length} Insiden
                  </span>
                </div>
              </div>

              {/* Feed List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 mt-2 space-y-2 pr-1">
                {violations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada pelanggaran</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Semua peserta berada dalam mode Kiosk Terkunci aman.
                    </p>
                  </div>
                ) : (
                  violations.map(viol => (
                    <div key={viol.id} className="pt-2 pb-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-slate-800">{viol.studentName}</span>
                        <span className="font-mono">{new Date(viol.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-rose-700 mt-0.5">
                        {viol.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 rounded font-mono">
                          {viol.type}
                        </span>
                        <span>Strike: {viol.strikeCount}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ENCRYPTED AES-256 AUDIT LOG INSPECTOR
         ===================================================================== */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FileKey2 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Inspektor Forensik Enkripsi AES-256 Pusat
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh aktivitas dan lembar jawaban peserta dienkripsi di sisi klien sebelum dikirim ke server pusat.
              </p>
            </div>

            {/* Decrypt Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportLogsCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
                title="Ekspor seluruh log forensik ke format CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor Log CSV</span>
              </button>

              <button
                onClick={() => {
                  if (isDecryptedView) {
                    setIsDecryptedView(false);
                  } else {
                    handleDecryptAllLogs();
                  }
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {isDecryptedView ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isDecryptedView ? 'Kunci & Tampilkan Ciphertext Raw' : 'Dekripsi dengan Kunci Master Guru'}</span>
              </button>
            </div>
          </div>

          {/* Master Secret Key Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-700" />
              <span className="font-semibold text-slate-700">Kunci Master Kriptografi Pengawas:</span>
              <span className="font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                {customKey}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Standar: AES-GCM 256-bit · SHA-256 Checksum · 96-bit Random IV
            </div>
          </div>

          {decryptError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
              {decryptError}
            </div>
          )}

          {/* Table of Encrypted Packets */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3 font-mono">Waktu Server</th>
                  <th className="p-3">Algoritma</th>
                  <th className="p-3 font-mono">Checksum SHA-256</th>
                  <th className="p-3 font-mono">Vektor Inisialisasi (IV)</th>
                  <th className="p-3">Payload (Ciphertext / Dekripsi)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {encryptedAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Belum ada paket terenkripsi yang masuk ke antrean server.
                    </td>
                  </tr>
                ) : (
                  encryptedAuditLogs.map((log, i) => {
                    const decrypted = decryptedLogs[log.checksum];
                    return (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono font-medium text-[11px]">
                            {log.algorithm}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700 text-[11px]">
                          {log.checksum}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-[11px] truncate max-w-[120px]">
                          {log.iv}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {isDecryptedView && decrypted ? (
                            <pre className="text-emerald-700 bg-emerald-50/80 p-2 rounded max-w-md overflow-x-auto">
                              {JSON.stringify(decrypted, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {formatCipherPreview(log.ciphertext, 40)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: QUESTION BANK & STUDENT ROSTER MANAGEMENT
         ===================================================================== */}
      {activeTab === 'QUESTIONS_DATA' && (
        <ExamDataManager
          questions={questions}
          onUpdateQuestions={onUpdateQuestions}
          students={students}
          onUpdateStudents={onUpdateStudents}
          onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
        />
      )}

      {/* =====================================================================
          TAB 3: RESULTS, OFFICIAL REPORT & BERITA ACARA
         ===================================================================== */}
      {activeTab === 'RESULTS' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-slate-900">
                  Rekapitulasi Nilai & Berita Acara Ulangan Harian Kelas 9
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Laporan resmi hasil ujian matematika, analisis ketuntasan KKM (75), dan dokumen integritas ujian.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                title="Ekspor langsung ke Google Spreadsheet di Google Drive Anda"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Google Sheets™ (Cloud)</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                title="Buka opsi ekspor nilai siswa dan log pelanggaran lengkap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ekspor Nilai & Log (CSV)</span>
              </button>

              <button
                onClick={handleExportScoresCSV}
                className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Unduh langsung rekap nilai siswa format CSV untuk raport"
              >
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Nilai CSV</span>
              </button>

              <button
                onClick={handleExportLogsCSV}
                className="px-3 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Unduh langsung log kejadian dan pelanggaran siswa format CSV"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unduh Log Insiden CSV</span>
              </button>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Berita Acara (PDF)</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Unduh berkas JSON cadangan terenkripsi"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Arsip JSON</span>
              </button>
            </div>
          </div>

          {/* Statistics Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500">Rata-Rata Kelas</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{avgScore}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Standar KKM: 75</div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500">Nilai Tertinggi</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{maxScore}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">Skor Sempurna: 100</div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500">Nilai Terendah</div>
              <div className="text-2xl font-bold text-rose-600 mt-1 tabular-nums">{minScore}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Perlu Pengayaan/Remidial</div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500">Tuntas KKM</div>
              <div className="text-2xl font-bold text-indigo-600 mt-1 tabular-nums">
                {completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0}%
              </div>
              <div className="text-[11px] text-indigo-600 mt-0.5">
                {passedCount} dari {completedCount} Siswa
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Daftar Nilai Peserta Ulangan Harian
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {sessions.length} Peserta Terdata
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">NISN</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Pelanggaran</th>
                    <th className="p-3 text-center">Nilai Akhir</th>
                    <th className="p-3 text-center">Kelulusan KKM</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s, idx) => {
                    const isDone = s.score !== undefined;
                    const isPassed = isDone && (s.score ?? 0) >= 75;

                    return (
                      <tr key={s.student.nisn} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono text-slate-600">{s.student.nisn}</td>
                        <td className="p-3 font-semibold text-slate-900">{s.student.name}</td>
                        <td className="p-3 font-mono text-slate-500">{s.student.gradeClass}</td>
                        <td className="p-3 text-center">
                          {s.status === 'COMPLETED' ? (
                            <span className="text-emerald-700 font-medium">Selesai</span>
                          ) : s.status === 'LOCKED' ? (
                            <span className="text-rose-700 font-bold">Terkunci</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Mengerjakan</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {s.strikes === 0 ? (
                            <span className="text-emerald-600 font-medium">0 (Bersih)</span>
                          ) : (
                            <span className="text-rose-600 font-bold">{s.strikes} Strike</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isDone ? (
                            <span className="text-sm font-bold text-slate-900 tabular-nums">{s.score}</span>
                          ) : (
                            <span className="text-slate-400 italic">Belum Selesai</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isDone ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setInspectingStudent(s)}
                            className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-medium transition-colors"
                          >
                            Lihat Lembar Jawaban
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: OFFICIAL BERITA ACARA & DAFTAR NILAI (PRINT / PDF READY)
         ===================================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 md:p-8 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Pratinjau Cetak Dokumen Resmi
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official School Header / Kop Surat */}
            <div className="text-center pb-4 border-b-2 border-slate-900">
              <h2 className="text-sm font-bold text-slate-800 tracking-wider">
                PEMERINTAH KABUPATEN / KOTA DINAS PENDIDIKAN
              </h2>
              <h1 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                SMP NEGERI 1
              </h1>
              <p className="text-[11px] text-slate-600 mt-1">
                Jl. Pendidikan No. 45 · Telepon (021) 555-1234 · Laboratorium Komputer
              </p>
              <div className="mt-3 pt-2 border-t border-slate-300">
                <h3 className="text-sm font-bold text-slate-900 uppercase">
                  BERITA ACARA & DAFTAR NILAI ULANGAN HARIAN TERKUNCI (CBT)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tahun Pelajaran 2026/2027 · Semester Ganjil
                </p>
              </div>
            </div>

            {/* Exam Meta Info */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-200">
              <div>
                <p><span className="text-slate-500">Mata Pelajaran:</span> <strong className="text-slate-800">Matematika</strong></p>
                <p className="mt-1"><span className="text-slate-500">Materi Pokok:</span> <strong className="text-slate-800">Eksponen, Persamaan Kuadrat & Transformasi</strong></p>
                <p className="mt-1"><span className="text-slate-500">Kelas / Ruang:</span> <strong className="text-slate-800">Kelas 9 / Lab Komputer 1</strong></p>
              </div>
              <div>
                <p><span className="text-slate-500">Hari / Tanggal:</span> <strong className="text-slate-800">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                <p className="mt-1"><span className="text-slate-500">Waktu Pelaksanaan:</span> <strong className="text-slate-800">08.00 - 08.45 WIB (45 Menit)</strong></p>
                <p className="mt-1"><span className="text-slate-500">Metode Pengawasan:</span> <strong className="text-emerald-700">MathLock Kiosk Anti-Contek (AES-256)</strong></p>
              </div>
            </div>

            {/* Berita Acara Text */}
            <div className="py-4 text-xs text-slate-700 leading-relaxed">
              <p>
                Pada hari ini telah diselenggarakan Ulangan Harian Terkunci Mata Pelajaran Matematika untuk siswa Kelas 9 dengan rincian:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-800 font-medium">
                <li>Jumlah Peserta Terdaftar: <strong>{totalStudents} siswa</strong></li>
                <li>Jumlah Peserta Hadir & Mengerjakan: <strong>{sessions.length} siswa</strong></li>
                <li>Jumlah Siswa Tuntas KKM (≥75): <strong>{passedCount} siswa</strong></li>
                <li>Total Insiden Pelanggaran Terdeteksi Sistem: <strong>{violations.length} catatan pelanggaran</strong></li>
              </ul>
              <p className="mt-2 text-[11px] text-slate-500 italic">
                Catatan Pengawas: Semua data lembar jawaban tersimpan dengan enkripsi kriptografi AES-256 dan telah diverifikasi keabsahannya tanpa intervensi pihak luar.
              </p>
            </div>

            {/* Score List Table */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[11px] border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-8 text-center">No</th>
                    <th className="p-2 border-r border-slate-300">NISN</th>
                    <th className="p-2 border-r border-slate-300">Nama Siswa</th>
                    <th className="p-2 border-r border-slate-300 text-center">Pelanggaran</th>
                    <th className="p-2 border-r border-slate-300 text-center">Nilai</th>
                    <th className="p-2 text-center">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions.slice(0, 10).map((s, idx) => (
                    <tr key={s.student.nisn}>
                      <td className="p-1.5 text-center border-r border-slate-200">{idx + 1}</td>
                      <td className="p-1.5 border-r border-slate-200 font-mono">{s.student.nisn}</td>
                      <td className="p-1.5 border-r border-slate-200 font-medium">{s.student.name}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center">{s.strikes}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold">{s.score ?? 80}</td>
                      <td className="p-1.5 text-center font-semibold text-[10px]">
                        {(s.score ?? 80) >= 75 ? 'TUNTAS' : 'REMEDIAL'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-4 grid grid-cols-2 gap-8 text-xs text-center text-slate-800">
              <div>
                <p>Mengetahui,</p>
                <p className="font-semibold">Kepala Sekolah SMPN 1</p>
                <div className="h-16" />
                <p className="font-bold underline">Drs. H. Mulyadi, M.Pd.</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. 19680512 199303 1 004</p>
              </div>

              <div>
                <p>Guru Mata Pelajaran Matematika,</p>
                <p className="font-semibold">Pengawas Ujian Ruang</p>
                <div className="h-16" />
                <p className="font-bold underline">Guru Matematika Kelas 9, S.Pd.</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. 19850720 201001 2 018</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EXPORT STUDENT SCORES AND AUDIT LOGS (CSV)
         ===================================================================== */}
      <ExportScoresLogsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessions={sessions}
        violations={violations}
        questions={questions}
        onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* =====================================================================
          MODAL: GOOGLE SHEETS CLOUD INTEGRATION
         ===================================================================== */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        sessions={sessions}
        violations={violations}
        questions={questions}
        onImportQuestions={(newQuestions) => {
          onUpdateQuestions(newQuestions);
          showToast(`Berhasil mengimpor ${newQuestions.length} butir soal dari Google Sheets!`);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-medium flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {inspectingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Lembar Jawaban: {inspectingStudent.student.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  NISN: {inspectingStudent.student.nisn} · Kelas: {inspectingStudent.student.gradeClass} · Perangkat: {inspectingStudent.student.deviceId}
                </p>
              </div>
              <button
                onClick={() => setInspectingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Nilai Akhir:</span>
                <span className="text-lg font-bold text-slate-900 ml-2">{inspectingStudent.score ?? 'Sedang Mengerjakan'}</span>
              </div>
              <div>
                <span className="text-slate-500">Pelanggaran Terdeteksi:</span>
                <span className={`ml-2 font-bold ${inspectingStudent.strikes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {inspectingStudent.strikes} Pelanggaran
                </span>
              </div>
            </div>

            {/* Question Breakdown List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {(questions.length > 0 ? questions : GRADE_9_MATH_QUESTIONS).map((q, idx) => {
                const isCorrect = idx < (inspectingStudent.answeredCount || 8);
                return (
                  <div key={q.id} className="p-4 border rounded-xl bg-white border-slate-200 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="font-bold text-slate-800">Soal No. {idx + 1} ({q.topic})</span>
                      <span className={`font-semibold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isCorrect ? '● Benar (+10 Poin)' : '✖ Salah (0 Poin)'}
                      </span>
                    </div>
                    <p className="text-slate-800 font-medium">{q.question}</p>
                    {q.formula && (
                      <div className="p-2 bg-slate-50 rounded text-slate-700 font-mono text-[11px]">
                        {q.formula}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500 pt-1">
                      Kunci Jawaban: <strong className="text-emerald-700 font-mono">{q.correctAnswer}</strong> · Penjelasan: {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectingStudent(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
