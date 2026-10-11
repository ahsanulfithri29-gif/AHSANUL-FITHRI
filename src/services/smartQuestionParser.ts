import { MathQuestion } from '../types/exam';

export interface ParseResult {
  questions: MathQuestion[];
  rawCount: number;
  warnings: string[];
}

/**
 * Intelligent Document & Google Forms Parser for Grade 9 Mathematics Exams
 * Parses plain text, PDF-extracted text, and Google Forms formats.
 */
export function parseDocumentText(rawText: string): ParseResult {
  const warnings: string[] = [];
  const questions: MathQuestion[] = [];

  if (!rawText || !rawText.trim()) {
    return { questions: [], rawCount: 0, warnings: ['Teks dokumen kosong.'] };
  }

  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Strategy 1: Check if format is CSV (Google Forms / Spreadsheet export)
  if (cleaned.includes(',') && (cleaned.toLowerCase().includes('option') || cleaned.toLowerCase().includes('pilihan') || cleaned.toLowerCase().includes('question'))) {
    const csvResult = parseCsvFormat(cleaned);
    if (csvResult.length > 0) {
      return {
        questions: csvResult,
        rawCount: csvResult.length,
        warnings: [],
      };
    }
  }

  // Strategy 2: Block-based question parser (PDF / Word / Google Forms text)
  // Split text by numbered questions (e.g., "1.", "2.", "Soal 1", "No. 1", "Pertanyaan 1")
  const questionBlocks = splitIntoQuestionBlocks(cleaned);

  questionBlocks.forEach((block, idx) => {
    try {
      const parsedQ = parseSingleQuestionBlock(block, idx + 1);
      if (parsedQ) {
        questions.push(parsedQ);
      }
    } catch {
      warnings.push(`Gagal memproses soal blok ke-${idx + 1}`);
    }
  });

  return {
    questions,
    rawCount: questions.length,
    warnings,
  };
}

/**
 * Splits document text into individual question segments
 */
function splitIntoQuestionBlocks(text: string): string[] {
  // Regex to detect start of questions:
  // Examples:
  // "\n1. ", "\n2) ", "\nSoal 3: ", "\nPertanyaan 4", "\n[5] "
  const splitRegex = /(?:^|\n)(?=(?:(?:Soal|Pertanyaan|No\.?|Nomor)?\s*\d+[\.\)\:\-]\s*|\d+[\.\)]\s+))/i;
  
  const blocks = text.split(splitRegex);
  return blocks
    .map(b => b.trim())
    .filter(b => b.length > 15); // filter out short headers
}

/**
 * Parses an individual question block into MathQuestion
 */
function parseSingleQuestionBlock(block: string, defaultNumber: number): MathQuestion | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  // 1. Detect question header and number
  const headerMatch = lines[0].match(/^(?:(?:Soal|Pertanyaan|No\.?|Nomor)?\s*(\d+)[\.\)\:\-]\s*|\d+[\.\)]\s+)(.*)/i);
  let questionTitle = '';
  
  if (headerMatch) {
    questionTitle = (headerMatch[2] || '').trim();
  } else {
    questionTitle = lines[0];
  }

  // 2. Identify Options A, B, C, D
  const optionA_Regex = /(?:^|\n|\s+)(?:[Aa][\.\)]|\(A\))\s+(.*?)(?=(?:[Bb][\.\)]|\(B\)|[Cc][\.\)]|\(C\)|[Dd][\.\)]|\(D\)|Kunci|Jawaban|$))/is;
  const optionB_Regex = /(?:^|\n|\s+)(?:[Bb][\.\)]|\(B\))\s+(.*?)(?=(?:[Cc][\.\)]|\(C\)|[Dd][\.\)]|\(D\)|Kunci|Jawaban|$))/is;
  const optionC_Regex = /(?:^|\n|\s+)(?:[Cc][\.\)]|\(C\))\s+(.*?)(?=(?:[Dd][\.\)]|\(D\)|Kunci|Jawaban|$))/is;
  const optionD_Regex = /(?:^|\n|\s+)(?:[Dd][\.\)]|\(D\))\s+(.*?)(?=(?:Kunci|Jawaban|Pembahasan|$))/is;

  const matchA = block.match(optionA_Regex);
  const matchB = block.match(optionB_Regex);
  const matchC = block.match(optionC_Regex);
  const matchD = block.match(optionD_Regex);

  // If standard letter options not found, try Google Form line-by-line options
  let optA_Text = matchA ? matchA[1].trim() : '';
  let optB_Text = matchB ? matchB[1].trim() : '';
  let optC_Text = matchC ? matchC[1].trim() : '';
  let optD_Text = matchD ? matchD[1].trim() : '';

  if (!optA_Text || !optB_Text) {
    // Google forms text pattern
    const optionsFound: string[] = [];
    lines.forEach(line => {
      const gMatch = line.match(/^(?:Opsi\s*\d+|Pilihan\s*[A-D]|[A-D][\.\)])\s*(.*)/i);
      if (gMatch && gMatch[1].trim()) {
        optionsFound.push(gMatch[1].trim());
      }
    });

    if (optionsFound.length >= 4) {
      optA_Text = optionsFound[0];
      optB_Text = optionsFound[1];
      optC_Text = optionsFound[2];
      optD_Text = optionsFound[3];
    } else if (lines.length >= 5) {
      // Fallback: assume last 4 lines are choices
      optA_Text = lines[lines.length - 4];
      optB_Text = lines[lines.length - 3];
      optC_Text = lines[lines.length - 2];
      optD_Text = lines[lines.length - 1];
    }
  }

  // 3. Detect Correct Answer
  const keyMatch = block.match(/(?:Kunci(?:\s*Jawaban)?|Jawaban(?:\s*Benar)?|Answer)\s*[\:\=]?\s*([A-D])/i);
  let detectedKey: 'A' | 'B' | 'C' | 'D' = 'A';
  if (keyMatch) {
    detectedKey = keyMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
  }

  // 4. Extract Question Body (strip options from question text)
  let cleanQuestion = questionTitle;
  const firstOptionIdx = block.search(/(?:[Aa][\.\)]|\(A\)|Opsi\s*1)/i);
  if (firstOptionIdx > 0) {
    const rawQPart = block.substring(0, firstOptionIdx).trim();
    // remove question number prefix
    cleanQuestion = rawQPart.replace(/^(?:(?:Soal|Pertanyaan|No\.?|Nomor)?\s*\d+[\.\)\:\-]\s*)/i, '').trim();
  }

  // 5. Detect math formula
  let extractedFormula: string | undefined = undefined;
  const mathExprMatch = cleanQuestion.match(/([a-zA-Z0-9\^√\\\/\_\+\-\=\(\)\s]{4,}(?:[\=\+\-\*\/\^]|\\sqrt)[a-zA-Z0-9\^√\\\/\_\+\-\=\(\)\s]*)/);
  if (mathExprMatch && mathExprMatch[1].length > 5 && (mathExprMatch[1].includes('^') || mathExprMatch[1].includes('√') || mathExprMatch[1].includes('\\') || mathExprMatch[1].includes('='))) {
    extractedFormula = mathExprMatch[1].trim();
  }

  // 6. Topic inference based on keywords
  let topic = 'Matematika Kelas 9';
  const lowerQ = cleanQuestion.toLowerCase();
  if (lowerQ.includes('akar') || lowerQ.includes('rasional')) topic = 'Bentuk Akar';
  else if (lowerQ.includes('pangkat') || lowerQ.includes('eksponen')) topic = 'Perpangkatan & Eksponen';
  else if (lowerQ.includes('persamaan kuadrat') || lowerQ.includes('diskriminan') || lowerQ.includes('x²') || lowerQ.includes('x^2')) topic = 'Persamaan Kuadrat';
  else if (lowerQ.includes('fungsi kuadrat') || lowerQ.includes('titik balik') || lowerQ.includes('puncak')) topic = 'Fungsi Kuadrat';
  else if (lowerQ.includes('translasi') || lowerQ.includes('refleksi') || lowerQ.includes('dilatasi') || lowerQ.includes('rotasi')) topic = 'Transformasi Geometri';

  return {
    id: Date.now() + defaultNumber,
    topic,
    question: cleanQuestion || `Soal Matematika No. ${defaultNumber}`,
    formula: extractedFormula,
    options: [
      { key: 'A', text: optA_Text || 'Pilihan A' },
      { key: 'B', text: optB_Text || 'Pilihan B' },
      { key: 'C', text: optC_Text || 'Pilihan C' },
      { key: 'D', text: optD_Text || 'Pilihan D' },
    ],
    correctAnswer: detectedKey,
    points: 10,
    explanation: `Kunci jawaban yang benar adalah ${detectedKey}.`,
  };
}

/**
 * Parses CSV export from Google Forms or Excel
 */
function parseCsvFormat(csvText: string): MathQuestion[] {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const results: MathQuestion[] = [];
  // Skip header if first line contains column names
  const startIndex = lines[0].toLowerCase().includes('question') || lines[0].toLowerCase().includes('soal') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCsvRow(lines[i]);
    if (parts.length >= 5) {
      const topic = parts[0] || 'Matematika Kelas 9';
      const question = parts[1] || `Soal ${i}`;
      const optA = parts[2] || '';
      const optB = parts[3] || '';
      const optC = parts[4] || '';
      const optD = parts[5] || '';
      const keyRaw = (parts[6] || 'A').toUpperCase();
      const key: 'A' | 'B' | 'C' | 'D' = ['A', 'B', 'C', 'D'].includes(keyRaw) ? (keyRaw as 'A' | 'B' | 'C' | 'D') : 'A';
      const points = parseInt(parts[7], 10) || 10;
      const explanation = parts[8] || `Kunci: ${key}`;

      results.push({
        id: Date.now() + i,
        topic,
        question,
        options: [
          { key: 'A', text: optA },
          { key: 'B', text: optB },
          { key: 'C', text: optC },
          { key: 'D', text: optD },
        ],
        correctAnswer: key,
        points,
        explanation,
      });
    }
  }

  return results;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentStr = '';

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentStr.trim());
      currentStr = '';
    } else {
      currentStr += char;
    }
  }
  result.push(currentStr.trim());
  return result;
}

/**
 * Sample test templates for PDF / Google Forms demonstration
 */
export const SAMPLE_PDF_EXAM_TEXT = `ULANGAN HARIAN MATEMATIKA KELAS 9
BAB: PERSAMAAN KUADRAT & BENTUK AKAR

1. Sederhanakan bentuk akar berikut: \sqrt{72} + \sqrt{50} - \sqrt{18}
A. 8√2
B. 6√2
C. 5√2
D. 4√2
Kunci: A
Pembahasan: \sqrt{72}=6\sqrt{2}, \sqrt{50}=5\sqrt{2}, \sqrt{18}=3\sqrt{2}. Maka 6√2 + 5√2 - 3√2 = 8√2.

2. Himpunan penyelesaian dari persamaan kuadrat x^2 - 7x + 10 = 0 adalah...
A. x = 2 atau x = 5
B. x = -2 atau x = -5
C. x = -2 atau x = 5
D. x = 1 atau x = 10
Kunci: A
Pembahasan: Faktorisasi (x - 2)(x - 5) = 0 didapatkan x = 2 atau x = 5.

3. Nilai diskriminan dari persamaan kuadrat 3x^2 - 6x + 2 = 0 adalah...
A. 12
B. 16
C. 24
D. -12
Kunci: A
Pembahasan: D = b^2 - 4ac = (-6)^2 - 4(3)(2) = 36 - 24 = 12.

4. Titik puncak dari fungsi kuadrat f(x) = x^2 - 4x + 3 adalah...
A. (2, -1)
B. (2, 1)
C. (-2, -1)
D. (4, 3)
Kunci: A
Pembahasan: xp = -b/(2a) = 2, yp = f(2) = 4 - 8 + 3 = -1. Jadi titik puncak (2, -1).

5. Titik K(5, -3) ditranslasikan oleh T = (-2, 6). Koordinat bayangan titik K' adalah...
A. K'(3, 3)
B. K'(7, -9)
C. K'(3, -9)
D. K'(-10, -18)
Kunci: A
Pembahasan: K' = (5 + (-2), -3 + 6) = (3, 3).
`;

export const SAMPLE_GOOGLE_FORM_TEXT = `Kuis Ulangan Harian Matematika 9 (Google Formulir)

Pertanyaan 1
Bentuk rasional dari pecahan 15 / √5 adalah...
A. 3√5
B. 5√5
C. 15√5
D. √5
Kunci: A

Pertanyaan 2
Akar-akar dari persamaan kuadrat 2x^2 + 5x - 3 = 0 adalah...
A. x = 1/2 atau x = -3
B. x = -1/2 atau x = 3
C. x = 2 atau x = -3
D. x = 1 atau x = -6
Kunci: A

Pertanyaan 3
Titik P(-3, 8) direfleksikan terhadap sumbu X. Bayangan titik P adalah...
A. P'(-3, -8)
B. P'(3, 8)
C. P'(3, -8)
D. P'(8, -3)
Kunci: A
`;
