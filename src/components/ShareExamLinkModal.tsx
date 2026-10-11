import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Lock, 
  ShieldCheck, 
  ExternalLink, 
  MessageSquare, 
  Sparkles,
  Key,
  Info
} from 'lucide-react';

interface ShareExamLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPin: string;
  onUpdatePin: (newPin: string) => void;
}

export const ShareExamLinkModal: React.FC<ShareExamLinkModalProps> = ({
  isOpen,
  onClose,
  masterPin,
  onUpdatePin,
}) => {
  const [copiedStudentLink, setCopiedStudentLink] = useState(false);
  const [copiedTeacherLink, setCopiedTeacherLink] = useState(false);
  const [copiedBroadcastText, setCopiedBroadcastText] = useState(false);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [customPinInput, setCustomPinInput] = useState(masterPin);

  if (!isOpen) return null;

  // Build clean URLs
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://sekolah.id/mathlock';

  const studentUrl = `${baseUrl}?role=siswa`;
  const teacherUrl = `${baseUrl}?role=guru`;

  const broadcastMessage = `📢 *ULANGAN HARIAN MATEMATIKA KELAS 9 (TERKUNCI)*
📅 Waktu Pengerjaan: Sesuai Jadwal Jam Pelajaran
⏱️ Durasi: Disesuaikan dengan jumlah soal

Kepada seluruh siswa Kelas 9, silakan klik tautan di bawah ini untuk memulai ulangan harian:
🔗 *Tautan Ujian Siswa:*
${studentUrl}

⚠️ *PERATURAN KEAMANAN UJIAN (ANTI-CONTEK):*
1. Gunakan Google Chrome di laptop atau komputer PC laboratorium.
2. Saat ujian dimulai, layar akan otomatis terkunci ke mode Layar Penuh (Kiosk).
3. DILARANG membuka tab baru, browser lain, atau aplikasi AI (ChatGPT/Gemini). Sistem akan otomatis mendeteksi dan membunyikan sirine alarm di kelas serta mencatat pelanggaran ke pengawas.
4. Lembar buram / coret-coretan digital sudah tersedia langsung di dalam layar ujian.

Selamat mengerjakan dengan jujur dan teliti!`;

  const copyToClipboard = (text: string, type: 'student' | 'teacher' | 'broadcast') => {
    navigator.clipboard.writeText(text);
    if (type === 'student') {
      setCopiedStudentLink(true);
      setTimeout(() => setCopiedStudentLink(false), 2500);
    } else if (type === 'teacher') {
      setCopiedTeacherLink(true);
      setTimeout(() => setCopiedTeacherLink(false), 2500);
    } else {
      setCopiedBroadcastText(true);
      setTimeout(() => setCopiedBroadcastText(false), 2500);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPinInput.trim() || customPinInput.trim().length < 4) {
      alert('PIN minimal 4 karakter!');
      return;
    }
    onUpdatePin(customPinInput.trim().toUpperCase());
    setIsEditingPin(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Pemisahan & Pembagian Tautan Ujian
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pastikan siswa hanya menerima tautan khusus ujian tanpa akses ke dasbor guru.
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Card 1: TAUTAN KHUSUS SISWA (AMAN 100%) */}
          <div className="p-5 bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h3 className="text-sm font-bold text-emerald-950">
                  Tautan Khusus Siswa (Aman & Bebas Dasbor Guru)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[11px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Mode Siswa Murni
              </span>
            </div>

            <p className="text-xs text-emerald-900 leading-relaxed">
              Bagikan tautan ini ke siswa melalui <strong>WhatsApp Grup Kelas</strong>, <strong>Google Classroom</strong>, atau komputer laboratorium. Pada tautan ini, <strong>TIDAK ADA DASBOR GURU</strong>, tidak ada kunci jawaban, dan tombol navigasi guru disembunyikan total.
            </p>

            {/* URL Box */}
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-300">
              <input
                type="text"
                readOnly
                value={studentUrl}
                className="flex-1 bg-transparent text-xs font-mono text-slate-800 focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(studentUrl, 'student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedStudentLink 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                }`}
              >
                {copiedStudentLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Tautan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Broadcast Message WhatsApp Ready */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <span>Format Pengumuman Siap Kirim (WhatsApp / Classroom)</span>
              </label>
              <button
                onClick={() => copyToClipboard(broadcastMessage, 'broadcast')}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  copiedBroadcastText 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                {copiedBroadcastText ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Teks Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin Pesan Lengkap</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              readOnly
              rows={5}
              value={broadcastMessage}
              className="w-full p-2.5 text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
            />
          </div>

          {/* Card 2: TAUTAN KHUSUS GURU & PROTEKSI PIN */}
          <div className="p-5 bg-slate-50 border border-slate-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  Tautan Khusus Guru & PIN Pengawas (Rahasia)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-700" />
                Diproteksi PIN
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Gunakan tautan ini untuk mengakses Dasbor Monitoring, Input Soal, dan Rekap Nilai di laptop/PC pengawas Anda:
            </p>

            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-300">
              <input
                type="text"
                readOnly
                value={teacherUrl}
                className="flex-1 bg-transparent text-xs font-mono text-slate-800 focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(teacherUrl, 'teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedTeacherLink 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {copiedTeacherLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Tautan</span>
                  </>
                )}
              </button>
            </div>

            {/* Master PIN Settings */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950">PIN Pengawas Saat Ini: </span>
                  <span className="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-sm tracking-wider">
                    {masterPin}
                  </span>
                </div>
              </div>

              {!isEditingPin ? (
                <button
                  onClick={() => setIsEditingPin(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 hover:underline"
                >
                  Ubah PIN
                </button>
              ) : (
                <form onSubmit={handleSavePin} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customPinInput}
                    onChange={e => setCustomPinInput(e.target.value.toUpperCase())}
                    className="w-24 px-2 py-1 text-xs font-mono font-bold border border-amber-400 rounded bg-white"
                    placeholder="PIN BARU"
                    maxLength={10}
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(false)}
                    className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Security guarantee note */}
          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              <strong>Jaminan Keamanan:</strong> Meskipun siswa mencoba menghapus parameter <code>?role=siswa</code> atau mengetik URL guru, sistem akan meminta <strong>PIN Pengawas</strong>. Tanpa PIN tersebut, siswa tidak akan pernah bisa membuka Dasbor Guru atau melihat kunci jawaban.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
