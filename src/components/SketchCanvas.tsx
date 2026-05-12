import { useRef, useState, useEffect, useCallback, MouseEvent, TouchEvent } from 'react';
import { Eraser, Pencil, Trash2 } from 'lucide-react';

interface SketchCanvasProps {
  onSave: (base64: string) => void;
  className?: string;
}

export default function SketchCanvas({ onSave, className }: SketchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Check if we actually need to resize to avoid flickering
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      // Save content before clear
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) tempCtx.drawImage(canvas, 0, 0);

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Reset context state after resize
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      // Restore background
      ctx.fillStyle = '#f9f9f9';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      // Restore content if it exists
      if (tempCtx) {
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / dpr, tempCanvas.height / dpr, 0, 0, rect.width, rect.height);
      }
    }
  }, [color, lineWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      initializeCanvas();
    });

    const handleTouch = (e: TouchEvent) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', handleTouch as any, { passive: false });
    canvas.addEventListener('touchmove', handleTouch as any, { passive: false });

    resizeObserver.observe(canvas);
    initializeCanvas();
    
    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('touchstart', handleTouch as any);
      canvas.removeEventListener('touchmove', handleTouch as any);
    };
  }, [initializeCanvas]);

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    const ctx = getCanvasContext();
    if (!ctx) return;

    // Reset stroke settings to ensure they match current state
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    const { offsetX, offsetY } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  const getCoordinates = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return { offsetX: 0, offsetY: 0 };
    }

    // Account for potential subpixel variance and scaling
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, rect.width, rect.height);
    onSave('');
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-4 bg-black/5 p-2 rounded-lg border border-black/10 self-start">
        <button 
          onClick={() => setColor('#000000')}
          className={`p-2 rounded-md transition-all ${color === '#000000' ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setColor('#f9f9f9')}
          className={`p-2 rounded-md transition-all ${color === '#f9f9f9' ? 'bg-black text-white' : 'text-black/40 hover:text-black'}`}
        >
          <Eraser className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/10" />
        <button 
          onClick={clearCanvas}
          className="p-2 text-black/40 hover:text-red-500 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/10" />
        <div className="flex items-center gap-2 px-2">
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={lineWidth} 
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-24 accent-black"
          />
          <span className="font-mono text-[10px] text-black/40">{lineWidth}px</span>
        </div>
      </div>

      <div className="relative aspect-[16/9] bg-zinc-50 rounded-lg overflow-hidden border border-black/10">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
      </div>
      
      <p className="font-mono text-[8px] uppercase tracking-widest text-black/20 text-center">
        Draw your concept above. The canvas is live.
      </p>
    </div>
  );
}
