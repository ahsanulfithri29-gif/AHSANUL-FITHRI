import { getAccessToken } from './googleAuthService';
import { StudentSession, ViolationEvent, MathQuestion } from '../types/exam';
import { getGradePredicate, getIntegrityStatus, formatDuration } from './csvExportService';

export interface GoogleSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface GoogleSheetExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  rowsExported: number;
}

/**
 * Validates access token and throws if missing
 */
async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sesi Google belum terhubung atau telah kedaluwarsa. Silakan Masuk dengan Google.');
  }
  return token;
}

/**
 * Creates a new Google Spreadsheet with custom sheet tabs and returns its metadata
 */
export async function createGoogleSpreadsheet(
  title: string,
  sheetTitles: string[] = ['Rekap Nilai Siswa', 'Log Integritas & Pelanggaran']
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await requireAccessToken();

  const body = {
    properties: {
      title,
    },
    sheets: sheetTitles.map(t => ({
      properties: {
        title: t,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    })),
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal membuat Google Spreadsheet (HTTP ${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Appends rows to a specific Google Sheet tab
 */
export async function writeSheetValues(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean | null)[][]
): Promise<void> {
  const token = await requireAccessToken();

  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gagal menulis data ke Google Sheets (HTTP ${res.status})`);
  }
}

/**
 * Applies header styling (green fill, bold, white text) to first row of sheets
 */
export async function formatSpreadsheetHeaders(spreadsheetId: string): Promise<void> {
  try {
    const token = await requireAccessToken();

    // Fetch spreadsheet metadata to get sheet IDs
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return;
    const metaData = await metaRes.json();
    const sheets = metaData.sheets || [];

    const requests = sheets.map((s: { properties: { sheetId: number } }) => ({
      repeatCell: {
        range: {
          sheetId: s.properties.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.55, blue: 0.35 }, // Emerald green
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (e) {
    console.warn('Optional header styling warning:', e);
  }
}

/**
 * Exports complete student exam scores and proctor violation logs to a newly created Google Spreadsheet
 */
export async function exportExamToGoogleSheets(
  title: string,
  sessions: StudentSession[],
  violations: ViolationEvent[],
  questions: MathQuestion[]
): Promise<GoogleSheetExportResult> {
  // 1. Create Spreadsheet with two tabs
  const sheetTitles = ['Rekap Nilai Siswa', 'Log Pelanggaran & Integritas'];
  const { spreadsheetId, spreadsheetUrl } = await createGoogleSpreadsheet(title, sheetTitles);

  // 2. Prepare Scores rows
  const scoreHeaders = [
    'No',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'ID Perangkat',
    'Status Ujian',
    'Waktu Mulai',
    'Waktu Selesai',
    'Durasi Pengerjaan',
    'Total Soal',
    'Soal Terjawab',
    'Nilai Akhir (0-100)',
    'Predikat',
    'Status KKM (75)',
    'Strikes (Pelanggaran)',
    'Tingkat Integritas',
    'Catatan Log Pelanggaran'
  ];

  const scoreRows: (string | number)[][] = sessions.map((s, idx) => {
    const isCompleted = s.score !== undefined;
    const finalScore = isCompleted ? s.score : 'Sedang Mengerjakan';
    const predicate = getGradePredicate(s.score);
    const kkmStatus = isCompleted ? ((s.score ?? 0) >= 75 ? 'TUNTAS' : 'REMEDIAL') : 'Belum Tuntas';
    const startTimeStr = new Date(s.startedAt).toLocaleTimeString('id-ID');
    const endTimeStr = s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString('id-ID') : '-';
    const durationStr = formatDuration(s.startedAt, s.submittedAt);
    
    const violationsSummary = s.violations.length > 0
      ? s.violations.map((v, i) => `[${i + 1}] ${new Date(v.timestamp).toLocaleTimeString('id-ID')} - ${v.description} (${v.type})`).join('; ')
      : 'Tertib / Bersih';

    return [
      idx + 1,
      s.student.nisn,
      s.student.name,
      s.student.gradeClass,
      s.student.deviceId,
      s.status === 'COMPLETED' ? 'Selesai' : s.status === 'LOCKED' ? 'Terkunci Kiosk' : 'Mengerjakan',
      startTimeStr,
      endTimeStr,
      durationStr,
      questions.length,
      `${s.answeredCount}/${questions.length}`,
      finalScore as string | number,
      predicate,
      kkmStatus,
      s.strikes,
      getIntegrityStatus(s.strikes),
      violationsSummary
    ];
  });

  // Write Scores tab
  await writeSheetValues(spreadsheetId, "'Rekap Nilai Siswa'!A1", [scoreHeaders, ...scoreRows]);

  // 3. Prepare Violation Logs rows
  const logHeaders = [
    'No',
    'ID Log',
    'Tanggal Kejadian',
    'Waktu (WIB)',
    'NISN Siswa',
    'Nama Siswa',
    'Kelas',
    'ID Perangkat',
    'Tipe Insiden',
    'Peringatan (Strike)',
    'Deskripsi Kejadian',
    'Status Kiosk',
    'Nilai Terkini',
    'Hash Keamanan Forensik'
  ];

  // Consolidate violations
  const allEventsMap = new Map<string, ViolationEvent>();
  sessions.forEach(s => s.violations.forEach(v => allEventsMap.set(v.id || `${v.studentNisn}-${v.timestamp}`, v)));
  violations.forEach(v => allEventsMap.set(v.id || `${v.studentNisn}-${v.timestamp}`, v));
  const sortedEvents = Array.from(allEventsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  const logRows: (string | number)[][] = sortedEvents.map((evt, idx) => {
    const studentSession = sessions.find(s => s.student.nisn === evt.studentNisn);
    const dateStr = new Date(evt.timestamp).toLocaleDateString('id-ID');
    const timeStr = new Date(evt.timestamp).toLocaleTimeString('id-ID');

    return [
      idx + 1,
      evt.id,
      dateStr,
      timeStr,
      evt.studentNisn,
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

  // Write Logs tab
  await writeSheetValues(spreadsheetId, "'Log Pelanggaran & Integritas'!A1", [logHeaders, ...logRows]);

  // Apply styling
  await formatSpreadsheetHeaders(spreadsheetId);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
    rowsExported: scoreRows.length + logRows.length,
  };
}

/**
 * Lists user's Google Spreadsheets from Google Drive
 */
export async function listUserGoogleSpreadsheets(): Promise<GoogleSpreadsheetItem[]> {
  const token = await requireAccessToken();

  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const fields = "files(id, name, modifiedTime, webViewLink)";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime desc&pageSize=20&fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal mengambil daftar spreadsheet dari Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: { id: string; name: string; modifiedTime: string; webViewLink?: string }) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
  }));
}

/**
 * Reads a sheet range values
 */
export async function readSpreadsheetRange(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const token = await requireAccessToken();

  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal membaca isi Google Sheets (HTTP ${res.status})`);
  }

  const data = await res.json();
  return (data.values || []) as string[][];
}

/**
 * Updates an existing spreadsheet with exam scores (destructive/mutating - requires user confirmation per skill)
 */
export async function updateExistingSpreadsheetScores(
  spreadsheetId: string,
  sessions: StudentSession[],
  questions: MathQuestion[],
  targetTabName: string = 'Rekap Nilai Ujian'
): Promise<void> {
  // Add new tab if not exists or write directly
  const scoreHeaders = [
    'No', 'NISN', 'Nama Siswa', 'Kelas', 'Perangkat', 'Status Ujian',
    'Nilai Akhir', 'Predikat', 'Status KKM', 'Strikes', 'Catatan Integritas'
  ];

  const scoreRows = sessions.map((s, idx) => [
    idx + 1,
    s.student.nisn,
    s.student.name,
    s.student.gradeClass,
    s.student.deviceId,
    s.status,
    s.score ?? 'Sedang Mengerjakan',
    getGradePredicate(s.score),
    s.score !== undefined ? (s.score >= 75 ? 'TUNTAS' : 'REMEDIAL') : '-',
    s.strikes,
    s.violations.length > 0 ? `${s.violations.length} insiden` : 'Tertib'
  ]);

  await writeSheetValues(spreadsheetId, `'${targetTabName}'!A1`, [scoreHeaders, ...scoreRows]);
}
