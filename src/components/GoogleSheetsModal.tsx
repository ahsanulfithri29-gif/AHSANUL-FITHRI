import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  FileSpreadsheet, 
  LogOut, 
  Upload, 
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken 
} from '../services/googleAuthService';
import { 
  exportExamToGoogleSheets, 
  listUserGoogleSpreadsheets, 
  updateExistingSpreadsheetScores,
  readSpreadsheetRange,
  GoogleSpreadsheetItem,
  GoogleSheetExportResult 
} from '../services/googleSheetsService';
import { StudentSession, ViolationEvent, MathQuestion } from '../types/exam';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudentSession[];
  violations: ViolationEvent[];
  questions: MathQuestion[];
  onImportQuestions?: (newQuestions: MathQuestion[]) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  violations,
  questions,
  onImportQuestions,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab: 'NEW_SHEET' | 'EXISTING_SHEET' | 'IMPORT_QUESTIONS'
  const [activeTab, setActiveTab] = useState<'NEW_SHEET' | 'EXISTING_SHEET' | 'IMPORT_QUESTIONS'>('NEW_SHEET');

  // New Sheet Form
  const [newSheetTitle, setNewSheetTitle] = useState(
    `Rekap Ujian Matematika Kelas 9 - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<GoogleSheetExportResult | null>(null);

  // Existing Spreadsheets list from Drive
  const [spreadsheets, setSpreadsheets] = useState<GoogleSpreadsheetItem[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>('');
  const [confirmUpdateModal, setConfirmUpdateModal] = useState<GoogleSpreadsheetItem | null>(null);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Import questions state
  const [importSpreadsheetId, setImportSpreadsheetId] = useState('');
  const [importTabRange, setImportTabRange] = useState('Soal!A2:J50');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch Drive spreadsheets when user is authenticated
  useEffect(() => {
    if (user && token && isOpen) {
      loadUserSpreadsheets();
    }
  }, [user, token, isOpen]);

  const loadUserSpreadsheets = async () => {
    setIsLoadingSheets(true);
    try {
      const list = await listUserGoogleSpreadsheets();
      setSpreadsheets(list);
      if (list.length > 0 && !selectedSpreadsheetId) {
        setSelectedSpreadsheetId(list[0].id);
      }
    } catch (e: any) {
      console.warn('Gagal memuat spreadsheet:', e);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await loadUserSpreadsheets();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Gagal masuk ke Google. Pastikan mengizinkan popup autentikasi.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setSpreadsheets([]);
    setExportResult(null);
  };

  // Export to brand new spreadsheet
  const handleCreateNewSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim()) return;

    setIsExporting(true);
    setExportResult(null);
    try {
      const result = await exportExamToGoogleSheets(
        newSheetTitle.trim(),
        sessions,
        violations,
        questions
      );
      setExportResult(result);
      await loadUserSpreadsheets();
    } catch (err: any) {
      alert(`Gagal mengekspor: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Update existing spreadsheet with explicit confirmation
  const handleConfirmUpdate = async () => {
    if (!confirmUpdateModal) return;

    setIsUpdatingExisting(true);
    try {
      await updateExistingSpreadsheetScores(
        confirmUpdateModal.id,
        sessions,
        questions,
        'Rekap Nilai Siswa'
      );
      setUpdateSuccess(`Berhasil memperbarui nilai ke '${confirmUpdateModal.name}'!`);
      setConfirmUpdateModal(null);
      setTimeout(() => setUpdateSuccess(null), 5000);
    } catch (err: any) {
      alert(`Gagal memperbarui: ${err.message}`);
    } finally {
      setIsUpdatingExisting(false);
    }
  };

  // Import questions from sheet
  const handleImportQuestionsFromSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importSpreadsheetId.trim()) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccessCount(null);

    try {
      const rows = await readSpreadsheetRange(importSpreadsheetId.trim(), importTabRange.trim());
      if (!rows || rows.length === 0) {
        throw new Error('Tidak ada data yang ditemukan pada rentang sel yang dipilih.');
      }

      // Expected columns: [id, topic, question, formula, optA, optB, optC, optD, key, explanation]
      const parsedQuestions: MathQuestion[] = [];
      rows.forEach((row, idx) => {
        if (!row || row.length < 5) return;
        const topic = row[1] || 'Matematika SMP';
        const questionText = row[2] || row[0];
        const formula = row[3] || undefined;
        const optA = row[4] || '-';
        const optB = row[5] || '-';
        const optC = row[6] || '-';
        const optD = row[7] || '-';
        const rawKey = (row[8] || 'A').toString().trim().toUpperCase();
        const correctAnswer: 'A' | 'B' | 'C' | 'D' = ['A', 'B', 'C', 'D'].includes(rawKey) ? (rawKey as any) : 'A';
        const explanation = row[9] || 'Jawaban pembahasan guru';

        if (questionText && questionText.length > 3) {
          parsedQuestions.push({
            id: idx + 1,
            topic,
            question: questionText,
            formula,
            options: [
              { key: 'A', text: optA },
              { key: 'B', text: optB },
              { key: 'C', text: optC },
              { key: 'D', text: optD },
            ],
            correctAnswer,
            points: 10,
            explanation,
          });
        }
      });

      if (parsedQuestions.length === 0) {
        throw new Error('Gagal mengenali format butir soal pada spreadsheet.');
      }

      if (onImportQuestions) {
        onImportQuestions(parsedQuestions);
      }
      setImportSuccessCount(parsedQuestions.length);
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor dari Google Sheets');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Integrasi Google Sheets™</h2>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-100 font-semibold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Sinkronisasi nilai raport, berita acara, dan bank soal langsung ke Google Spreadsheet guru.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Guru'} className="w-8 h-8 rounded-full border border-slate-300" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">
                  {user.displayName?.[0] || 'G'}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{user.displayName || 'Akun Guru'}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                    Terhubung
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Masuk dengan Akun Google untuk mengakses Google Sheets & Drive</span>
            </div>
          )}

          <div>
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isAuthLoading}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold border border-slate-300 rounded-xl shadow-xs transition-colors flex items-center gap-2.5 active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isAuthLoading ? 'Menghubungkan...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{authError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {!user ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-bold text-slate-800">
                  Hubungkan ke Google Sheets dengan Izin
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aplikasi MathLock dapat membuat dan memperbarui spreadsheet rekap nilai secara otomatis di Google Drive Anda dengan izin Anda. Tidak perlu lagi unduh manual atau copy-paste.
                </p>
              </div>

              <button
                onClick={handleSignIn}
                disabled={isAuthLoading}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{isAuthLoading ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google Guru'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Feature Tabs */}
              <div className="flex items-center border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('NEW_SHEET')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'NEW_SHEET'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Spreadsheet Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('EXISTING_SHEET');
                    loadUserSpreadsheets();
                  }}
                  className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'EXISTING_SHEET'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Sinkron ke Spreadsheet Ada ({spreadsheets.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('IMPORT_QUESTIONS')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'IMPORT_QUESTIONS'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor Soal dari Sheet</span>
                </button>
              </div>

              {/* TAB 1: NEW SPREADSHEET */}
              {activeTab === 'NEW_SHEET' && (
                <form onSubmit={handleCreateNewSheet} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Judul File Google Spreadsheet Baru:
                    </label>
                    <input
                      type="text"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      placeholder="Contoh: Rekap Ujian Matematika Bab 1"
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 text-xs space-y-2">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Data yang Akan Disertakan Otomatis:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-700">
                      <li><strong>Tab 1: Rekap Nilai Siswa</strong> — {sessions.length} baris nilai (NISN, Nama, Kelas, Status, Nilai Akhir, Predikat, KKM 75, Catatan).</li>
                      <li><strong>Tab 2: Log Pelanggaran & Integritas</strong> — {violations.length} insiden audit forensik dengan timestamp akurat.</li>
                      <li>Formatting visual: Baris header berwarna hijau resmi, teks tebal, dan baris atas dibekukan (*frozen header row*).</li>
                    </ul>
                  </div>

                  {exportResult && (
                    <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Spreadsheet Berhasil Dibuat di Google Drive Anda!</span>
                        </div>
                        <div className="text-[11px] text-emerald-800 mt-0.5">
                          Total {exportResult.rowsExported} baris data berhasil disinkronkan.
                        </div>
                      </div>
                      <a
                        href={exportResult.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Buka di Google Sheets</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isExporting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menulis ke Google Sheets...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>Buat & Ekspor ke Google Spreadsheet</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: UPDATE EXISTING SPREADSHEET */}
              {activeTab === 'EXISTING_SHEET' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Pilih Spreadsheet dari Google Drive Anda:
                    </label>
                    <button
                      onClick={loadUserSpreadsheets}
                      disabled={isLoadingSheets}
                      className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                      <span>Muat Ulang</span>
                    </button>
                  </div>

                  {updateSuccess && (
                    <div className="p-3 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{updateSuccess}</span>
                    </div>
                  )}

                  {isLoadingSheets ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      <span>Memuat daftar berkas dari Google Drive...</span>
                    </div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                      Belum ada Google Spreadsheet yang ditemukan di Google Drive Anda. Anda dapat membuat yang baru di tab pertama.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {spreadsheets.map((sheet) => (
                        <div
                          key={sheet.id}
                          className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div>
                              <div className="font-semibold text-slate-800">{sheet.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Diperbarui: {new Date(sheet.modifiedTime).toLocaleDateString('id-ID')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a
                              href={sheet.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                              title="Buka Spreadsheet di Tab Baru"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => setConfirmUpdateModal(sheet)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-[11px] transition-colors"
                            >
                              Perbarui Nilai
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: IMPORT QUESTIONS FROM GOOGLE SHEETS */}
              {activeTab === 'IMPORT_QUESTIONS' && (
                <form onSubmit={handleImportQuestionsFromSheet} className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <p className="font-bold">Format Kolom Spreadsheet Bank Soal:</p>
                    <p className="text-[11px] mt-0.5 text-amber-800">
                      Kolom A: No | B: Topik | C: Soal | D: Rumus LaTeX | E: Pil A | F: Pil B | G: Pil C | H: Pil D | I: Kunci (A/B/C/D) | J: Pembahasan
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ID Google Spreadsheet atau Pilih dari Drive:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={importSpreadsheetId}
                        onChange={(e) => setImportSpreadsheetId(e.target.value)}
                        placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        className="flex-1 text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                        required
                      />
                      {spreadsheets.length > 0 && (
                        <select
                          onChange={(e) => setImportSpreadsheetId(e.target.value)}
                          className="text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-medium max-w-[180px]"
                        >
                          <option value="">Pilih dari Drive...</option>
                          {spreadsheets.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Rentang Sel Tab (*Sheet Range*):
                    </label>
                    <input
                      type="text"
                      value={importTabRange}
                      onChange={(e) => setImportTabRange(e.target.value)}
                      placeholder="Contoh: Sheet1!A2:J50 atau Soal!A2:J60"
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  {importSuccessCount !== null && (
                    <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Berhasil mengimpor {importSuccessCount} butir soal ke Bank Soal MathLock!</span>
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{importError}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isImporting}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Membaca Google Sheets...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Impor Butir Soal ke Ujian</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Google Sheets API v4 · Terenkripsi OAuth 2.0</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 font-semibold rounded-lg text-slate-700"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Modifying Existing Spreadsheet (Mandatory per Skill) */}
      {confirmUpdateModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Konfirmasi Pembaruan Spreadsheet
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan memperbarui tab <strong>'Rekap Nilai Siswa'</strong> pada Google Spreadsheet <strong>"{confirmUpdateModal.name}"</strong> dengan {sessions.length} data nilai ujian saat ini. Data pada tab tersebut akan diperbarui.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUpdateModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmUpdate}
                disabled={isUpdatingExisting}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                {isUpdatingExisting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memperbarui...</span>
                  </>
                ) : (
                  <span>Konfirmasi & Perbarui</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
