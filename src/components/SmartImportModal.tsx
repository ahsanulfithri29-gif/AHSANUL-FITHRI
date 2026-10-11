import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Copy, 
  Trash2, 
  Calculator, 
  CheckCircle2, 
  FileSpreadsheet,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { MathQuestion } from '../types/exam';
import { 
  parseDocumentText, 
  SAMPLE_PDF_EXAM_TEXT, 
  SAMPLE_GOOGLE_FORM_TEXT 
} from '../services/smartQuestionParser';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (importedQuestions: MathQuestion[]) => void;
}

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'FILE_UPLOAD' | 'PASTE_PDF' | 'GOOGLE_FORM'>('PASTE_PDF');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<MathQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Text Parsing
  const handleParse = (textToParse?: string) => {
    const content = textToParse !== undefined ? textToParse : inputText;
    if (!content.trim()) {
      setErrorMessage('Mohon masukkan teks naskah soal atau pilih file terlebih dahulu.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const result = parseDocumentText(content);
      if (result.questions.length === 0) {
        setErrorMessage('Tidak ditemukan format soal yang valid. Pastikan terdapat nomor soal (1., 2.) dan pilihan (A., B., C., D.).');
      } else {
        setParsedPreview(result.questions);
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat memproses dokumen.');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle File Upload (PDF / TXT / CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // If file starts with PDF signature %PDF and contains binary streams
        if (text.startsWith('%PDF-')) {
          // Attempt simple ASCII extraction
          const plainMatches = text.match(/\(([^)]+)\)\s*Tj/g);
          let extractedFromPdf = '';
          if (plainMatches && plainMatches.length > 5) {
            extractedFromPdf = plainMatches.map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')).join(' ');
          }

          if (extractedFromPdf && extractedFromPdf.length > 50) {
            setInputText(extractedFromPdf);
            handleParse(extractedFromPdf);
          } else {
            setErrorMessage(
              'Berkas PDF ini memiliki format biner terkompresi. Cara paling mudah & 100% rapi: Buka berkas PDF Anda, tekan Ctrl+A (Pilih Semua), lalu Ctrl+C (Salin), dan tempelkan di tab "Salin-Tempel dari PDF / Word" di atas.'
            );
            setActiveTab('PASTE_PDF');
          }
        } else {
          setInputText(text);
          handleParse(text);
        }
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca berkas. Coba gunakan metode Salin-Tempel Teks.');
    };

    reader.readAsText(file);
  };

  const handleApplySamplePdf = () => {
    setInputText(SAMPLE_PDF_EXAM_TEXT);
    handleParse(SAMPLE_PDF_EXAM_TEXT);
  };

  const handleApplySampleGoogleForm = () => {
    setInputText(SAMPLE_GOOGLE_FORM_TEXT);
    handleParse(SAMPLE_GOOGLE_FORM_TEXT);
  };

  const handleRemovePreviewItem = (id: number) => {
    setParsedPreview(prev => prev.filter(q => q.id !== id));
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportQuestions(parsedPreview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Impor Soal Otomatis (Dari PDF / Word / Google Formulir)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ekstrak pertanyaan matematika, pilihan A/B/C/D, rumus, dan kunci jawaban secara instan.
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

        {/* Source Mode Tabs */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('PASTE_PDF');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${activeTab === 'PASTE_PDF' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Salin-Tempel dari PDF / Word</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('GOOGLE_FORM');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${activeTab === 'GOOGLE_FORM' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              <span>Impor dari Google Formulir</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('FILE_UPLOAD');
                setErrorMessage(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${activeTab === 'FILE_UPLOAD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unggah File Dokumen (.pdf / .txt / .csv)</span>
            </button>
          </div>

          {activeTab === 'PASTE_PDF' && (
            <button
              onClick={handleApplySamplePdf}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
            >
              Coba Contoh Naskah PDF
            </button>
          )}

          {activeTab === 'GOOGLE_FORM' && (
            <button
              onClick={handleApplySampleGoogleForm}
              className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 underline"
            >
              Coba Contoh Google Form
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'FILE_UPLOAD' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">
                  Pilih atau Tarik Berkas Soal Anda ke Sini
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Mendukung file teks <strong>.pdf</strong>, <strong>.txt</strong>, dan <strong>.csv</strong>. Sistem akan membaca dan memformat nomor serta pilihan otomatis.
                </p>

                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
                    <span>Pilih Berkas Komputer</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {fileName && (
                  <div className="mt-3 text-xs font-mono font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block border border-emerald-200">
                    Berkas Terpilih: {fileName}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SALIN-TEMPEL DARI PDF / WORD */}
          {activeTab === 'PASTE_PDF' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Tempel Teks Naskah Soal dari File PDF / Microsoft Word Anda:
                </label>
                <span className="text-[11px] text-slate-400">
                  Format otomatis mendeteksi 1. Soal ... A. ... B. ... C. ... D. ... Kunci: A
                </span>
              </div>

              <textarea
                rows={7}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Contoh:\n1. Sederhanakan nilai dari √72 + √50 - √18\nA. 8√2\nB. 6√2\nC. 5√2\nD. 4√2\nKunci: A\n\n2. Himpunan penyelesaian dari x^2 - 7x + 10 = 0...\nA. x = 2 atau x = 5\nB. x = -2 atau x = -5\nC. x = -2\nD. x = 5\nKunci: A`}
                className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/30"
              />

              <div className="flex justify-end">
                <button
                  onClick={() => handleParse()}
                  disabled={isParsing}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isParsing ? 'Mengekstrak Soal...' : 'Ekstrak & Susun Soal Otomatis'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE FORMULIR */}
          {activeTab === 'GOOGLE_FORM' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-950">
                <h4 className="font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  <span>Cara Impor dari Google Formulir:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px]">
                  <li>Buka kuis di <strong>Google Formulir</strong> Anda.</li>
                  <li>Blok dan salin (*Copy / Ctrl+C*) naskah pertanyaan kuis atau buka tab <em>Tanggapan $\rightarrow$ Buka di Spreadsheet $\rightarrow$ Unduh CSV</em>.</li>
                  <li>Tempelkan teks soal atau isi spreadsheet di kotak bawah ini, lalu klik tombol ekstrak.</li>
                </ol>
              </div>

              <textarea
                rows={6}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Pertanyaan 1\nBentuk rasional dari pecahan 15 / √5 adalah...\nA. 3√5\nB. 5√5\nC. 15√5\nD. √5\nKunci: A\n\nPertanyaan 2\nAkar-akar dari persamaan kuadrat 2x^2 + 5x - 3 = 0...`}
                className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/30"
              />

              <div className="flex justify-end">
                <button
                  onClick={() => handleParse()}
                  disabled={isParsing}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isParsing ? 'Memproses Google Form...' : 'Ekstrak dari Google Form'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Extracted Questions Preview */}
          {parsedPreview.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pratinjau Hasil Ekstraksi: {parsedPreview.length} Butir Soal Terdeteksi
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  Periksa dan sesuaikan kunci jawaban jika diperlukan sebelum disimpan.
                </span>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {parsedPreview.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold text-[11px]">
                          {q.topic}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-medium">Kunci:</label>
                        <select
                          value={q.correctAnswer}
                          onChange={e => {
                            const newKey = e.target.value as 'A' | 'B' | 'C' | 'D';
                            setParsedPreview(old =>
                              old.map(item => item.id === q.id ? { ...item, correctAnswer: newKey } : item)
                            );
                          }}
                          className="px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold rounded text-xs"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>

                        <button
                          onClick={() => handleRemovePreviewItem(q.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus soal ini dari daftar impor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="font-semibold text-slate-800 leading-relaxed">
                      {q.question}
                    </p>

                    {q.formula && (
                      <div className="p-2 bg-white border border-slate-200 rounded text-slate-800 font-mono text-[11px]">
                        {q.formula}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      {q.options.map(opt => (
                        <div
                          key={opt.key}
                          className={`p-1.5 rounded border ${opt.key === q.correctAnswer ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                        >
                          <span className="font-bold mr-1">{opt.key}.</span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {parsedPreview.length > 0 ? (
              <span className="font-semibold text-emerald-700">
                ✓ {parsedPreview.length} soal siap ditambahkan ke ujian
              </span>
            ) : (
              <span>Unggah berkas atau tempelkan naskah soal terlebih dahulu</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={parsedPreview.length === 0}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan {parsedPreview.length} Soal ke Bank Soal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
