import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, FileCode, BookOpen, Layers } from 'lucide-react';
import { 
  ELECTRON_MAIN_JS, 
  ELECTRON_PRELOAD_JS, 
  ELECTRON_PACKAGE_JSON, 
  ELECTRON_README 
} from '../services/electronExport';

interface ElectronViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ElectronViewerModal: React.FC<ElectronViewerModalProps> = ({ isOpen, onClose }) => {
  const [activeFile, setActiveFile] = useState<'main' | 'preload' | 'package' | 'readme'>('main');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getFileContent = () => {
    switch (activeFile) {
      case 'main': return ELECTRON_MAIN_JS;
      case 'preload': return ELECTRON_PRELOAD_JS;
      case 'package': return ELECTRON_PACKAGE_JSON;
      case 'readme': return ELECTRON_README;
    }
  };

  const getFileName = () => {
    switch (activeFile) {
      case 'main': return 'main.js';
      case 'preload': return 'preload.js';
      case 'package': return 'package.json';
      case 'readme': return 'README.md';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFileContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([getFileContent()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Terminal className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Paket Sumber Kode Kiosk Electron JS
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Modul Window Focus Tracking, Shortcut Blocking, & Kiosk Lockdown Layar Penuh.
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

        {/* Tab Selection Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFile('main')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono font-medium transition-colors ${activeFile === 'main' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600" />
              <span>main.js (Kiosk & Shortcuts)</span>
            </button>

            <button
              onClick={() => setActiveFile('preload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono font-medium transition-colors ${activeFile === 'preload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-600" />
              <span>preload.js (IPC Bridge)</span>
            </button>

            <button
              onClick={() => setActiveFile('package')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono font-medium transition-colors ${activeFile === 'package' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>package.json</span>
            </button>

            <button
              onClick={() => setActiveFile('readme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono font-medium transition-colors ${activeFile === 'readme' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>PANDUAN_LAB.md</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh {getFileName()}</span>
            </button>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="flex-1 bg-slate-950 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
          <pre className="select-text whitespace-pre">
            {getFileContent()}
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Dapat langsung dikompilasi menjadi <strong>.exe</strong> untuk lab komputer menggunakan <code>npm run build:win</code>
          </span>
          <span className="font-semibold text-slate-700">
            PIN Kunci Utama Guru: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-900">GURU9MAT</code>
          </span>
        </div>
      </div>
    </div>
  );
};
