import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  Award, 
  ShieldAlert, 
  Layers, 
  CheckCircle2, 
  Settings2,
  Table,
  Info
} from 'lucide-react';
import { StudentSession, ViolationEvent, MathQuestion } from '../types/exam';
import { 
  generateStudentScoresCSV, 
  generateViolationLogsCSV, 
  generateCombinedScoresAndLogsCSV, 
  downloadCSVFile,
  getGradePredicate
} from '../services/csvExportService';

interface ExportScoresLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudentSession[];
  violations: ViolationEvent[];
  questions: MathQuestion[];
  onOpenGoogleSheets?: () => void;
}

export type ExportFormatType = 'SCORES' | 'LOGS' | 'COMBINED';

export const ExportScoresLogsModal: React.FC<ExportScoresLogsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  violations,
  questions,
  onOpenGoogleSheets,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormatType>('SCORES');
  const [delimiter, setDelimiter] = useState<',' | ';'>(';');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'VIOLATIONS_ONLY'>('ALL');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Computed summary
  const completedCount = sessions.filter(s => s.score !== undefined).length;
  const violationCount = sessions.filter(s => s.strikes > 0).length;
  const totalViolationsRecorded = violations.length;

  // Filtered preview data
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterStatus === 'COMPLETED' && s.score === undefined) return false;
      if (filterStatus === 'VIOLATIONS_ONLY' && s.strikes === 0) return false;
      return true;
    });
  }, [sessions, filterStatus]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    const timestampStr = new Date().toISOString().slice(0, 10);
    let csvContent = '';
    let fileName = '';

    if (selectedFormat === 'SCORES') {
      csvContent = generateStudentScoresCSV(sessions, questions, {
        delimiter,
        filterStatus
      });
      fileName = `Daftar_Nilai_Matematika_Kelas9_${timestampStr}.csv`;
    } else if (selectedFormat === 'LOGS') {
      csvContent = generateViolationLogsCSV(sessions, violations, {
        delimiter
      });
      fileName = `Log_Integritas_Pelanggaran_Kelas9_${timestampStr}.csv`;
    } else {
      csvContent = generateCombinedScoresAndLogsCSV(sessions, violations, questions, {
        delimiter,
        filterStatus
      });
      fileName = `Rekap_Nilai_dan_Log_Lengkap_Kelas9_${timestampStr}.csv`;
    }

    downloadCSVFile(csvContent, fileName);
    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Ekspor Rekapitulasi Nilai & Log Ujian (CSV)</span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded tracking-wide">
                  EXCEL READY
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Format CSV berstandar UTF-8 BOM untuk buku nilai guru, aplikasi E-Rapor, dan dokumen berita acara.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                File CSV berhasil diunduh! Berkas siap dibuka di Microsoft Excel atau Google Sheets.
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
              Pemisah: {delimiter === ';' ? 'Titik Koma (;)' : 'Koma (,)'}
            </span>
          </div>
        )}

        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800">
          {/* Format Selector Cards */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
              1. Pilih Format Berkas Ekspor
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Scores */}
              <button
                type="button"
                onClick={() => setSelectedFormat('SCORES')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  selectedFormat === 'SCORES'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Award className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Input Nilai / Raport
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Rekap Nilai Siswa</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Tabel daftar nilai lengkap: NISN, Nama, Kelas, Terjawab, Nilai Akhir (0-100), Predikat A/B/C/D, KKM, Durasi, dan Catatan Sikap.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                  <span>Target: {filteredSessions.length} Siswa</span>
                  <span className="font-semibold text-emerald-700">17 Kolom Data</span>
                </div>
              </button>

              {/* Option 2: Incident Logs */}
              <button
                type="button"
                onClick={() => setSelectedFormat('LOGS')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  selectedFormat === 'LOGS'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                      <ShieldAlert className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      Bukti Forensik & Berita Acara
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Log Kejadian & Integritas</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Catatan forensik seluruh pelanggaran (ganti tab, alt-tab, devtools, keluar layar penuh) disertai timestamp dan ID perangkat.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                  <span>Total Log: {totalViolationsRecorded} Kejadian</span>
                  <span className="font-semibold text-indigo-700">14 Kolom Audit</span>
                </div>
              </button>

              {/* Option 3: Combined */}
              <button
                type="button"
                onClick={() => setSelectedFormat('COMBINED')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  selectedFormat === 'COMBINED'
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Layers className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      Arsip Lengkap
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Ekspor Terpadu (Semua)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Dokumen gabungan komprehensif berisi ringkasan nilai raport sekaligus seluruh rekam jejak log pelanggaran dalam 1 berkas.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] font-medium text-slate-600 flex items-center justify-between">
                  <span>Nilai + Seluruh Log</span>
                  <span className="font-semibold text-purple-700">2 Bagian Berkas</span>
                </div>
              </button>
            </div>
          </div>

          {/* Export Options & Settings */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span>2. Pengaturan Berkas & Kompatibilitas Excel</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delimiter Setting */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Tanda Pemisah Kolom (Delimiter)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDelimiter(';')}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${
                      delimiter === ';'
                        ? 'border-slate-900 bg-white text-slate-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-100/70 text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="font-semibold">Titik Koma (;)</div>
                    <div className="text-[10px] text-slate-500">Standar Excel Indonesia</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelimiter(',')}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${
                      delimiter === ','
                        ? 'border-slate-900 bg-white text-slate-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-100/70 text-slate-600 hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="font-semibold">Koma (,)</div>
                    <div className="text-[10px] text-slate-500">Google Sheets & Global</div>
                  </button>
                </div>
              </div>

              {/* Status Filter (if SCORES or COMBINED) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Filter Baris Siswa
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'COMPLETED' | 'VIOLATIONS_ONLY')}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">Semua Peserta Terdaftar ({sessions.length} Siswa)</option>
                  <option value="COMPLETED">Hanya Siswa yang Sudah Ada Nilai ({completedCount} Siswa)</option>
                  <option value="VIOLATIONS_ONLY">Hanya Siswa dengan Catatan Pelanggaran ({violationCount} Siswa)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  <span>Format UTF-8 BOM aktif otomatis menjaga angka NISN tidak terpotong.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Live Table Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-slate-500" />
                <span>Pratinjau Data (Cuplikan 4 Baris Pertama):</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Total {selectedFormat === 'LOGS' ? totalViolationsRecorded : filteredSessions.length} entri akan diekspor
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50/50">
              {selectedFormat === 'SCORES' || selectedFormat === 'COMBINED' ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                    <tr>
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5">NISN</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5 text-center">Nilai (100)</th>
                      <th className="p-2.5 text-center">Predikat</th>
                      <th className="p-2.5 text-center">KKM</th>
                      <th className="p-2.5 text-center">Strikes</th>
                      <th className="p-2.5">Catatan Sikap / Pelanggaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-[11px]">
                    {filteredSessions.slice(0, 4).map((s, idx) => {
                      const isDone = s.score !== undefined;
                      const isPassed = isDone && (s.score ?? 0) >= 75;
                      return (
                        <tr key={s.student.nisn} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-mono font-medium text-slate-700">{s.student.nisn}</td>
                          <td className="p-2 font-semibold text-slate-900">{s.student.name}</td>
                          <td className="p-2 text-slate-600 font-mono">{s.student.gradeClass}</td>
                          <td className="p-2 text-center font-bold text-slate-900 tabular-nums">
                            {isDone ? s.score : <span className="text-slate-400 italic">Mengerjakan</span>}
                          </td>
                          <td className="p-2 text-center text-slate-700">
                            {getGradePredicate(s.score)}
                          </td>
                          <td className="p-2 text-center">
                            {isDone ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isPassed ? 'TUNTAS' : 'REMEDIAL'}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="p-2 text-center">
                            {s.strikes === 0 ? (
                              <span className="text-emerald-600 font-medium">0</span>
                            ) : (
                              <span className="text-rose-600 font-bold">{s.strikes}</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-500 truncate max-w-[200px]" title={s.violations.map(v => v.description).join('; ')}>
                            {s.violations.length > 0 
                              ? `${s.violations.length} insiden: ${s.violations[0].description}`
                              : 'Tertib / Bersih'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 text-[11px]">
                    <tr>
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5">Waktu</th>
                      <th className="p-2.5">NISN</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5">Tipe Insiden</th>
                      <th className="p-2.5 text-center">Strike</th>
                      <th className="p-2.5">Keterangan Kejadian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-[11px]">
                    {violations.slice(0, 4).map((v, idx) => (
                      <tr key={v.id || idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                        </td>
                        <td className="p-2 font-mono text-slate-700">{v.studentNisn}</td>
                        <td className="p-2 font-semibold text-slate-900">{v.studentName}</td>
                        <td className="p-2 font-mono text-rose-700">{v.type}</td>
                        <td className="p-2 text-center font-bold text-rose-600">Strike {v.strikeCount}</td>
                        <td className="p-2 text-slate-600">{v.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Format Ekspor: <strong>.CSV (Karakter UTF-8 Universal)</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenGoogleSheets && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGoogleSheets();
                }}
                className="px-4 py-2 text-xs font-bold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                title="Buka opsi ekspor cloud langsung ke Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Ekspor ke Google Sheets™</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>
                {selectedFormat === 'SCORES'
                  ? 'Unduh CSV Rekap Nilai'
                  : selectedFormat === 'LOGS'
                  ? 'Unduh CSV Log Integritas'
                  : 'Unduh CSV Terpadu (Semua)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
