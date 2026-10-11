import React, { useRef, useState, useEffect } from 'react';
import { Pen, Eraser, RotateCcw, X, Minimize2, Maximize2 } from 'lucide-react';

interface DigitalScratchpadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DigitalScratchpad: React.FC<DigitalScratchpadProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#1e293b');
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions to container size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [isOpen, isMinimized]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = tool === 'eraser' ? 18 : 2.5;
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-40 bg-white rounded-xl shadow-xl border border-slate-300 transition-all duration-200 overflow-hidden ${isMinimized ? 'w-64 h-12' : 'w-96 md:w-[480px] h-[360px]'}`}>
      {/* Scratchpad Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-medium text-slate-700">
        <span className="font-semibold text-slate-800">Papan Coret-Coret Buram Digital</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            title={isMinimized ? "Perbesar" : "Kecilkan"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-200 transition-colors"
            title="Tutup"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-40px)]">
          {/* Controls Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTool('pen')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-colors ${tool === 'pen' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                <Pen className="w-3 h-3" />
                <span>Pena</span>
              </button>
              <button
                onClick={() => setTool('eraser')}
                className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-colors ${tool === 'eraser' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                <Eraser className="w-3 h-3" />
                <span>Penghapus</span>
              </button>

              {tool === 'pen' && (
                <div className="flex items-center gap-1 ml-2">
                  {['#1e293b', '#2563eb', '#dc2626'].map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-4 h-4 rounded-full border ${color === c ? 'ring-2 ring-offset-1 ring-slate-800' : 'border-slate-300'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={clearCanvas}
              className="flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
              title="Bersihkan Coretan"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Bersihkan</span>
            </button>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-white relative cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full block touch-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
