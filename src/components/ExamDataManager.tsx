import React, { useState } from 'react';
import { 
  FileText, 
  Users, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  BookOpen, 
  Calculator,
  Save,
  HelpCircle,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { MathQuestion, StudentInfo } from '../types/exam';
import { GRADE_9_MATH_QUESTIONS, GRADE_9_MATH_QUESTIONS_50 } from '../data/grade9MathQuestions';
import { SmartImportModal } from './SmartImportModal';

interface ExamDataManagerProps {
  questions: MathQuestion[];
  onUpdateQuestions: (newQuestions: MathQuestion[]) => void;
  students: StudentInfo[];
  onUpdateStudents: (newStudents: StudentInfo[]) => void;
  onOpenGoogleSheets?: () => void;
}

export const ExamDataManager: React.FC<ExamDataManagerProps> = ({
  questions,
  onUpdateQuestions,
  students,
  onUpdateStudents,
  onOpenGoogleSheets,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'QUESTIONS' | 'STUDENTS'>('QUESTIONS');

  // Smart Import Modal State
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

  // Question Form State
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [topic, setTopic] = useState('Persamaan Kuadrat');
  const [questionText, setQuestionText] = useState('');
  const [formula, setFormula] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [points, setPoints] = useState(10);
  const [explanation, setExplanation] = useState('');

  // Student Form State
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newNisn, setNewNisn] = useState('');
  const [newName, setNewName] = useState('');
  const [newClass, setNewClass] = useState('9-A');
  const [newDeviceId, setNewDeviceId] = useState('PC-LAB-01');

  // Bulk Student Paste State
  const [isBulkStudentOpen, setIsBulkStudentOpen] = useState(false);
  const [bulkStudentText, setBulkStudentText] = useState('');

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Add Question Handler
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      alert('Mohon lengkapi teks soal dan semua pilihan A, B, C, D.');
      return;
    }

    const newQ: MathQuestion = {
      id: Date.now(),
      topic: topic.trim() || 'Matematika Kelas 9',
      question: questionText.trim(),
      formula: formula.trim() || undefined,
      options: [
        { key: 'A', text: optA.trim() },
        { key: 'B', text: optB.trim() },
        { key: 'C', text: optC.trim() },
        { key: 'D', text: optD.trim() },
      ],
      correctAnswer,
      points: Number(points) || 10,
      explanation: explanation.trim() || 'Pembahasan belum ditambahkan.',
    };

    const updated = [...questions, newQ];
    onUpdateQuestions(updated);
    setIsAddingQuestion(false);
    // Reset form
    setQuestionText('');
    setFormula('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExplanation('');
    showToast('Soal berhasil ditambahkan ke bank soal!');
  };

  const handleDeleteQuestion = (id: number) => {
    if (questions.length <= 1) {
      alert('Minimal harus ada 1 butir soal dalam ujian.');
      return;
    }
    if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
      const updated = questions.filter(q => q.id !== id);
      onUpdateQuestions(updated);
      showToast('Soal berhasil dihapus.');
    }
  };

  const handleResetDefaultQuestions = () => {
    if (confirm('Kembalikan bank soal ke 10 soal standar kurikulum Kelas 9?')) {
      onUpdateQuestions(GRADE_9_MATH_QUESTIONS);
      showToast('Bank soal dikembalikan ke 10 butir standar.');
    }
  };

  const handleLoad50Questions = () => {
    if (confirm('Muat paket lengkap 50 butir soal matematika kelas 9 (Perpangkatan, Akar, Persamaan Kuadrat, Fungsi Kuadrat, Transformasi Geometri, Kesebangunan, Bangun Ruang, Statistika, Peluang)?')) {
      onUpdateQuestions(GRADE_9_MATH_QUESTIONS_50);
      showToast('Berhasil memuat paket lengkap 50 butir soal!');
    }
  };

  const handleImportQuestions = (imported: MathQuestion[]) => {
    const updated = [...questions, ...imported];
    onUpdateQuestions(updated);
    showToast(`Berhasil menambahkan ${imported.length} butir soal dari dokumen / Google Form!`);
  };

  // Template CSV Downloads
  const downloadQuestionTemplateCSV = () => {
    const csvContent = 
`Topic,Question,Formula,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Points,Explanation
"Bentuk Akar","Sederhanakan nilai dari akar 50 + akar 18","\\sqrt{50} + \\sqrt{18}","6\\sqrt{2}","7\\sqrt{2}","8\\sqrt{2}","9\\sqrt{2}","C",10,"5\\sqrt{2} + 3\\sqrt{2} = 8\\sqrt{2}"
"Persamaan Kuadrat","Akar dari x^2 - 9 = 0 adalah...","x^2 - 9 = 0","x = 3 atau x = -3","x = 9","x = 0","x = 1","A",10,"x^2 = 9 maka x = +- 3"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_impor_soal_matematika_kelas9.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStudentTemplateCSV = () => {
    const csvContent = 
`NISN,NamaLengkap,Kelas,PerangkatLab
0081234501,Budi Santoso,9-A,PC-LAB-01
0081234502,Siti Nurhaliza,9-A,PC-LAB-02
0081234503,Ahmad Rizky Pratama,9-A,PC-LAB-03
0081234504,Dwi Cahyono,9-A,PC-LAB-04
0081234505,Rina Rahmawati,9-A,PC-LAB-05`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_data_siswa_kelas9.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Student Handler
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNisn.trim() || !newName.trim()) {
      alert('Mohon isi NISN dan Nama Siswa.');
      return;
    }

    const newS: StudentInfo = {
      nisn: newNisn.trim(),
      name: newName.trim(),
      gradeClass: newClass,
      deviceId: newDeviceId.trim() || `PC-LAB-${students.length + 1}`,
    };

    onUpdateStudents([...students, newS]);
    setIsAddingStudent(false);
    setNewNisn('');
    setNewName('');
    showToast('Data siswa berhasil ditambahkan.');
  };

  const handleDeleteStudent = (nisn: string) => {
    if (students.length <= 1) {
      alert('Minimal harus ada 1 siswa dalam daftar.');
      return;
    }
    const updated = students.filter(s => s.nisn !== nisn);
    onUpdateStudents(updated);
    showToast('Data siswa dihapus.');
  };

  // Bulk Paste Student Handler (from Excel column copy)
  const handleBulkStudentImport = () => {
    if (!bulkStudentText.trim()) return;

    const lines = bulkStudentText.trim().split('\n');
    const imported: StudentInfo[] = [];

    lines.forEach((line, index) => {
      // Split by tab (if copied from Excel) or comma
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        const sNisn = parts[0]?.trim();
        const sName = parts[1]?.trim();
        const sClass = parts[2]?.trim() || '9-A';
        const sPc = parts[3]?.trim() || `PC-LAB-${String(index + 1).padStart(2, '0')}`;

        if (sNisn && sName) {
          imported.push({
            nisn: sNisn,
            name: sName,
            gradeClass: sClass,
            deviceId: sPc,
          });
        }
      }
    });

    if (imported.length > 0) {
      onUpdateStudents(imported);
      setIsBulkStudentOpen(false);
      setBulkStudentText('');
      showToast(`Berhasil mengimpor ${imported.length} data siswa dari Excel/Teks!`);
    } else {
      alert('Format teks tidak valid. Pastikan berisi minimal NISN dan Nama Siswa.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">
              MANAJEMEN UJIAN
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Kurikulum Merdeka / 2013
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Kelola Bank Soal & Data Peserta Ujian
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambahkan soal matematika dengan rumus LaTeX, atur kunci jawaban, atau impor daftar nama siswa langsung dari Excel.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('QUESTIONS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeSubTab === 'QUESTIONS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Bank Soal ({questions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('STUDENTS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${activeSubTab === 'STUDENTS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Siswa Lab ({students.length})</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: BANK SOAL MATEMATIKA KELAS 9
         ===================================================================== */}
      {activeSubTab === 'QUESTIONS' && (
        <div className="space-y-4">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingQuestion(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Soal Manual</span>
              </button>

              <button
                onClick={() => setIsSmartImportOpen(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                title="Impor langsung dari naskah PDF, Word, atau Google Formulir"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Impor dari PDF / Google Form</span>
              </button>

              {onOpenGoogleSheets && (
                <button
                  onClick={onOpenGoogleSheets}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  title="Impor butir soal langsung dari dokumen Google Sheets Anda"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Impor dari Google Sheets</span>
                </button>
              )}

              <button
                onClick={downloadQuestionTemplateCSV}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Unduh contoh template format Excel/CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Format CSV</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDefaultQuestions}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Kembalikan ke paket 10 soal matematika standar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Paket 10 Soal</span>
              </button>

              <button
                onClick={handleLoad50Questions}
                className="px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                title="Muat paket lengkap 50 butir soal Matematika Kelas 9"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Muat Paket 50 Soal (Maksimal)</span>
              </button>
            </div>
          </div>

          {/* Info Banner: Kapasitas Soal & Fleksibilitas */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-sky-50/60 to-emerald-50/80 border border-indigo-100/80 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                50+
              </div>
              <div>
                <span className="font-bold text-slate-800">
                  Kapasitas Soal: Mendukung Hingga 50 Soal Pilihan Ganda (Bisa Lebih)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Saat ini aktif: <strong>{questions.length} butir soal</strong>. Nilai akhir otomatis dinormalkan ke skala 100 ({questions.length > 0 ? (100 / questions.length).toFixed(1) : 0} poin per soal) dan durasi disesuaikan otomatis ({questions.length > 30 ? '90 Menit' : (questions.length > 15 ? '60 Menit' : '45 Menit')}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                <Check className="w-3 h-3 text-emerald-600" />
                Siap Ujian 50 Soal
              </span>
            </div>
          </div>

          {/* Form Modal: Tambah Soal */}
          {isAddingQuestion && (
            <div className="bg-white rounded-xl shadow-md border-2 border-indigo-200 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>Input Butir Soal Matematika Baru</span>
                </h3>
                <button
                  onClick={() => setIsAddingQuestion(false)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Topik / Bab Materi
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      placeholder="Contoh: Bentuk Akar / Fungsi Kuadrat"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kunci Jawaban Benar
                    </label>
                    <select
                      value={correctAnswer}
                      onChange={e => setCorrectAnswer(e.target.value as 'A' | 'B' | 'C' | 'D')}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                    >
                      <option value="A">Pilihan A</option>
                      <option value="B">Pilihan B</option>
                      <option value="C">Pilihan C</option>
                      <option value="D">Pilihan D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bobot Poin
                    </label>
                    <input
                      type="number"
                      value={points}
                      onChange={e => setPoints(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teks Pertanyaan
                  </label>
                  <textarea
                    rows={3}
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    placeholder="Tuliskan soal di sini, contoh: Tentukan himpunan penyelesaian dari persamaan kuadrat x² - 5x + 6 = 0..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rumus Matematika / LaTeX (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formula}
                    onChange={e => setFormula(e.target.value)}
                    placeholder="Contoh: x^2 - 5x + 6 = 0 atau \sqrt{75} + \sqrt{12}"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Choices A, B, C, D */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan A
                    </label>
                    <input
                      type="text"
                      value={optA}
                      onChange={e => setOptA(e.target.value)}
                      placeholder="Jawaban A..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan B
                    </label>
                    <input
                      type="text"
                      value={optB}
                      onChange={e => setOptB(e.target.value)}
                      placeholder="Jawaban B..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan C
                    </label>
                    <input
                      type="text"
                      value={optC}
                      onChange={e => setOptC(e.target.value)}
                      placeholder="Jawaban C..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilihan D
                    </label>
                    <input
                      type="text"
                      value={optD}
                      onChange={e => setOptD(e.target.value)}
                      placeholder="Jawaban D..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pembahasan / Langkah Pengerjaan
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    placeholder="Contoh: Faktorisasi (x - 2)(x - 3) = 0 sehingga x = 2 atau x = 3."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingQuestion(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan ke Bank Soal</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Active Questions */}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 transition-all hover:border-slate-300"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {q.topic}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Bobot: {q.points} Poin
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Kunci: {q.correctAnswer}
                    </span>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus soal ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs">
                  <p className="font-semibold text-slate-800 leading-relaxed">
                    {q.question}
                  </p>
                  {q.formula && (
                    <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-700 text-xs">
                      {q.formula}
                    </div>
                  )}

                  {/* Options Preview */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50 text-[11px] text-slate-600">
                    {q.options.map(opt => (
                      <div
                        key={opt.key}
                        className={`p-1.5 rounded border flex items-center gap-1.5 ${opt.key === q.correctAnswer ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-semibold' : 'bg-slate-50/50 border-slate-100'}`}
                      >
                        <span className="font-bold">{opt.key}.</span>
                        <span>{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-400 italic">
                    Pembahasan: {q.explanation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: DAFTAR SISWA & PERANGKAT LAB
         ===================================================================== */}
      {activeSubTab === 'STUDENTS' && (
        <div className="space-y-4">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingStudent(true)}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah 1 Siswa</span>
              </button>

              <button
                onClick={() => setIsBulkStudentOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tempel dari Excel (Impor Cepat)</span>
              </button>
            </div>

            <button
              onClick={downloadStudentTemplateCSV}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Format CSV Siswa</span>
            </button>
          </div>

          {/* Form Modal: Tambah 1 Siswa */}
          {isAddingStudent && (
            <div className="bg-white rounded-xl shadow-md border-2 border-indigo-200 p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                Tambah Siswa Peserta Ujian
              </h3>
              <form onSubmit={handleSaveStudent} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NISN (10 Digit)
                  </label>
                  <input
                    type="text"
                    value={newNisn}
                    onChange={e => setNewNisn(e.target.value)}
                    placeholder="Contoh: 0089876543"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Nama Lengkap Siswa
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Contoh: Annisa Putri"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={newClass}
                    onChange={e => setNewClass(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                  >
                    <option value="9-A">Kelas 9-A</option>
                    <option value="9-B">Kelas 9-B</option>
                    <option value="9-C">Kelas 9-C</option>
                    <option value="9-D">Kelas 9-D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ID Komputer Lab
                  </label>
                  <input
                    type="text"
                    value={newDeviceId}
                    onChange={e => setNewDeviceId(e.target.value)}
                    placeholder="Contoh: PC-LAB-08"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingStudent(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Simpan Siswa
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal: Bulk Paste Siswa dari Excel */}
          {isBulkStudentOpen && (
            <div className="bg-white rounded-xl shadow-md border-2 border-indigo-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Tempel Data Siswa Massal dari Excel / Spreadsheet
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Salin kolom NISN dan Nama dari Excel sekolah Anda, lalu tempelkan di kotak di bawah ini.
                  </p>
                </div>
                <button
                  onClick={() => setIsBulkStudentOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Tutup
                </button>
              </div>

              <textarea
                rows={6}
                value={bulkStudentText}
                onChange={e => setBulkStudentText(e.target.value)}
                placeholder={`0081234501\tBudi Santoso\t9-A\tPC-LAB-01\n0081234502\tSiti Nurhaliza\t9-A\tPC-LAB-02\n0081234503\tDwi Cahyono\t9-A\tPC-LAB-03`}
                className="w-full p-3 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Format per baris: NISN [Tab/Koma] Nama Lengkap [Tab/Koma] Kelas [Tab/Koma] PC
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsBulkStudentOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBulkStudentImport}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Impor Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table of Registered Students */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Daftar Peserta Terdaftar ({students.length} Siswa)
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Ruang Lab Komputer 1
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">NISN</th>
                    <th className="p-3">Nama Lengkap Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 font-mono">ID Perangkat Komputer</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st, idx) => (
                    <tr key={st.nisn} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-medium text-slate-700">{st.nisn}</td>
                      <td className="p-3 font-bold text-slate-900">{st.name}</td>
                      <td className="p-3 font-mono text-slate-500">{st.gradeClass}</td>
                      <td className="p-3 font-mono text-slate-600">{st.deviceId}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteStudent(st.nisn)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Hapus siswa ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Smart Import Modal (PDF / Word / Google Form) */}
      <SmartImportModal
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        onImportQuestions={handleImportQuestions}
      />
    </div>
  );
};
