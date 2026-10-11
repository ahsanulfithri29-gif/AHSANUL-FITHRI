import { StudentSession, ViolationEvent, MathQuestion } from '../types/exam';

export interface CSVExportOptions {
  delimiter?: ',' | ';';
  includeBOM?: boolean;
  filterClass?: string;
  filterStatus?: 'ALL' | 'COMPLETED' | 'VIOLATIONS_ONLY';
}

/**
 * Escapes a cell value for standard CSV compatibility.
 * Handles strings with commas, semicolons, quotes, and newlines.
 */
export function escapeCSVCell(value: unknown, delimiter: string = ','): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // If contains delimiter, double quotes, or newlines, quote it and escape quotes
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  // If it starts with 0 and is numeric (like NISN), prepend with single quote or force quotes so Excel keeps zeroes
  if (/^0\d+$/.test(str)) {
    return `"${str}"`;
  }

  return `"${str}"`;
}

/**
 * Helper to compute letter grade predicate from score (0-100)
 */
export function getGradePredicate(score: number | undefined): string {
  if (score === undefined) return '-';
  if (score >= 90) return 'A (Sangat Baik)';
  if (score >= 80) return 'B (Baik)';
  if (score >= 75) return 'C (Cukup / Tuntas)';
  return 'D (Kurang / Remedial)';
}

/**
 * Helper to format duration in minutes and seconds
 */
export function formatDuration(startedAt: number, submittedAt?: number): string {
  const end = submittedAt || Date.now();
  const diffMs = Math.max(0, end - startedAt);
  const totalMinutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${totalMinutes} Menit ${seconds} Detik`;
}

/**
 * Helper to get clean human integrity status
 */
export function getIntegrityStatus(strikes: number): string {
  if (strikes === 0) return 'Sangat Tertib (0 Pelanggaran)';
  if (strikes === 1) return 'Peringatan 1 (Ringan)';
  if (strikes === 2) return 'Peringatan 2 (Sedang)';
  return 'Terkunci Kiosk (Pelanggaran Berat)';
}

/**
 * Builds CSV for student grading & score sheet.
 */
export function generateStudentScoresCSV(
  sessions: StudentSession[],
  questions: MathQuestion[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ',';
  const filterClass = options.filterClass || 'ALL';
  const filterStatus = options.filterStatus || 'ALL';

  const filtered = sessions.filter(s => {
    if (filterClass !== 'ALL' && s.student.gradeClass !== filterClass) return false;
    if (filterStatus === 'COMPLETED' && s.score === undefined) return false;
    if (filterStatus === 'VIOLATIONS_ONLY' && s.strikes === 0) return false;
    return true;
  });

  const headers = [
    'No',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'ID Perangkat',
    'Status Pengerjaan',
    'Waktu Mulai',
    'Waktu Selesai',
    'Durasi Ujian',
    'Total Soal',
    'Soal Terjawab',
    'Nilai Akhir (Skala 100)',
    'Predikat Nilai',
    'Status KKM (75)',
    'Jumlah Pelanggaran (Strikes)',
    'Tingkat Integritas',
    'Rincian Catatan Log Pelanggaran'
  ];

  const rows = filtered.map((s, idx) => {
    const isCompleted = s.score !== undefined;
    const finalScore = isCompleted ? s.score : 'Belum Selesai';
    const predicate = getGradePredicate(s.score);
    const kkmStatus = isCompleted ? ((s.score ?? 0) >= 75 ? 'TUNTAS' : 'REMEDIAL') : 'Belum Tuntas';
    const startTimeStr = new Date(s.startedAt).toLocaleTimeString('id-ID');
    const endTimeStr = s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString('id-ID') : '-';
    const durationStr = formatDuration(s.startedAt, s.submittedAt);
    
    // Summary of violation logs
    const violationsSummary = s.violations.length > 0
      ? s.violations.map((v, i) => `[${i + 1}] ${new Date(v.timestamp).toLocaleTimeString('id-ID')} - ${v.description} (${v.type})`).join('; ')
      : 'Tidak ada pelanggaran tercatat (Tertib)';

    return [
      idx + 1,
      `'${s.student.nisn}`, // Prepend apostrophe to safeguard leading zeros in Excel
      s.student.name,
      s.student.gradeClass,
      s.student.deviceId,
      s.status === 'COMPLETED' ? 'Selesai Dikumpulkan' : s.status === 'LOCKED' ? 'Terkunci Kiosk' : 'Sedang Mengerjakan',
      startTimeStr,
      endTimeStr,
      durationStr,
      questions.length,
      `${s.answeredCount}/${questions.length}`,
      finalScore,
      predicate,
      kkmStatus,
      s.strikes,
      getIntegrityStatus(s.strikes),
      violationsSummary
    ];
  });

  const headerRow = headers.map(h => escapeCSVCell(h, delimiter)).join(delimiter);
  const dataRows = rows.map(row => row.map(cell => escapeCSVCell(cell, delimiter)).join(delimiter));

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Builds CSV for student incident logs, violations, and proctor audit trail.
 */
export function generateViolationLogsCSV(
  sessions: StudentSession[],
  violations: ViolationEvent[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ',';
  const filterClass = options.filterClass || 'ALL';

  // Consolidate all violation events: both from sessions.violations and top-level violations
  const allEventsMap = new Map<string, ViolationEvent>();

  // Add from individual student sessions
  sessions.forEach(s => {
    if (filterClass !== 'ALL' && s.student.gradeClass !== filterClass) return;
    s.violations.forEach(v => allEventsMap.set(v.id || `${v.studentNisn}-${v.timestamp}`, v));
  });

  // Add from global violations list
  violations.forEach(v => {
    allEventsMap.set(v.id || `${v.studentNisn}-${v.timestamp}`, v);
  });

  const sortedEvents = Array.from(allEventsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  const headers = [
    'No',
    'ID Log',
    'Tanggal Kejadian',
    'Waktu (WIB)',
    'NISN Siswa',
    'Nama Siswa',
    'Kelas',
    'ID Perangkat',
    'Tipe Insiden / Pelanggaran',
    'Tingkat Peringatan (Strike)',
    'Deskripsi Kejadian',
    'Status Kiosk Saat Kejadian',
    'Nilai Terkini',
    'Kode Hash Verifikasi Forensik'
  ];

  const rows = sortedEvents.map((evt, idx) => {
    const studentSession = sessions.find(s => s.student.nisn === evt.studentNisn);
    const dateStr = new Date(evt.timestamp).toLocaleDateString('id-ID');
    const timeStr = new Date(evt.timestamp).toLocaleTimeString('id-ID');

    return [
      idx + 1,
      evt.id,
      dateStr,
      timeStr,
      `'${evt.studentNisn}`,
      evt.studentName,
      studentSession?.student.gradeClass || '9-A',
      studentSession?.student.deviceId || 'PC-LAB',
      evt.type,
      `Strike ${evt.strikeCount}`,
      evt.description,
      evt.strikeCount >= 3 ? 'TERKUNCI' : 'PERINGATAN',
      studentSession?.score !== undefined ? studentSession.score : 'Sedang Ujian',
      evt.encryptedHash || `SEC-${evt.timestamp.toString(16).toUpperCase()}`
    ];
  });

  const headerRow = headers.map(h => escapeCSVCell(h, delimiter)).join(delimiter);
  const dataRows = rows.map(row => row.map(cell => escapeCSVCell(cell, delimiter)).join(delimiter));

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Builds a comprehensive All-In-One CSV containing:
 * - Exam Metadata
 * - Student Scores Table (Gradebook)
 * - Incident & Violation Audit Logs Table
 */
export function generateCombinedScoresAndLogsCSV(
  sessions: StudentSession[],
  violations: ViolationEvent[],
  questions: MathQuestion[],
  options: CSVExportOptions = {}
): string {
  const delimiter = options.delimiter || ',';
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const completed = sessions.filter(s => s.score !== undefined);
  const scores = completed.map(s => s.score ?? 0);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passed = completed.filter(s => (s.score ?? 0) >= 75).length;

  const metadataLines = [
    [escapeCSVCell('DOKUMEN RESMI REKAPITULASI NILAI DAN LOG INTEGRITAS UJIAN (MATHLOCK CBT)', delimiter)],
    [escapeCSVCell(`Mata Pelajaran: Matematika Kelas 9 SMP | Tanggal Pelaksanaan: ${dateStr}`, delimiter)],
    [escapeCSVCell(`Standar KKM: 75 | Total Peserta: ${sessions.length} | Selesai: ${completed.length} | Tuntas: ${passed} | Rata-rata: ${avg}`, delimiter)],
    [''],
    [escapeCSVCell('=== BAGIAN 1: DAFTAR NILAI SISWA & REKAP KETUNTASAN ===', delimiter)],
  ].map(r => r.join(delimiter)).join('\r\n');

  const scoresContent = generateStudentScoresCSV(sessions, questions, options);

  const separatorLines = [
    '',
    '',
    [escapeCSVCell('=== BAGIAN 2: LOG AKTIVITAS & BERITA ACARA INSIDEN PELANGGARAN ===', delimiter)],
  ].join('\r\n');

  const logsContent = generateViolationLogsCSV(sessions, violations, options);

  return `${metadataLines}\r\n${scoresContent}\r\n${separatorLines}\r\n${logsContent}`;
}

/**
 * Triggers the browser file download with UTF-8 BOM so Excel opens it with correct encoding.
 */
export function downloadCSVFile(csvContent: string, fileName: string): void {
  // UTF-8 BOM byte order mark
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
