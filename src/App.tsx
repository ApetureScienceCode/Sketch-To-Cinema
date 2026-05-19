/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Camera,
  Layers,
  ChevronRight,
  Download,
  AlertCircle,
  Key,
  Pencil,
  Edit2,
  Play,
  Check,
  Loader2,
  Fullscreen,
  Volume2,
  Lock,
  Unlock,
  History,
  Trash2,
  Clock,
  Calendar,
  Copy
} from 'lucide-react';
import { interpretSketch, InterpretationResult, generateNanoBananaImage, generateVeoVideo } from './services/ai';
import { HistoryItem, saveHistoryItem, getAllHistory, deleteHistoryItem } from './services/history';
import SketchCanvas from './components/SketchCanvas';
import { downloadBase64 } from './lib/utils';

// Cinematic Motion Preview Component
function MotionPreview({ videoUrl, image, prompt, isActive }: { videoUrl?: string, image: string, prompt: string, isActive: boolean }) {
  if (videoUrl) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-black group">
        <video 
          src={videoUrl} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        />
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[10%] bg-black opacity-40" />
          <div className="absolute inset-x-0 bottom-0 h-[10%] bg-black opacity-40" />
          <div className="absolute top-12 left-8 font-mono text-[8px] text-white/50 tracking-widest uppercase">
            LIVE ● PROJECTION
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black group">
      <motion.img 
        src={image} 
        alt="Motion Projection" 
        className="w-full h-full object-cover opacity-80"
        initial={{ scale: 1, x: 0, y: 0 }}
        animate={isActive ? {
          scale: [1, 1.15, 1.05],
          x: [0, -20, 10],
          y: [0, 10, -5],
        } : {}}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
        referrerPolicy="no-referrer"
      />
      
      {/* Cinematic Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grain/Noise emulation */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grain-y.com/grain.png')] mix-blend-overlay" />
        
        {/* Letterbox */}
        <div className="absolute inset-x-0 top-0 h-[10%] bg-black" />
        <div className="absolute inset-x-0 bottom-0 h-[10%] bg-black" />
        
        {/* Vignette */}
        <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_0%,_black_90%] opacity-40" />
        
        {/* UI HUD Elements */}
        <div className="absolute top-12 left-8 font-mono text-[8px] text-white/50 tracking-widest uppercase">
          REC ● 24FPS (SYNTH)
        </div>
        <div className="absolute bottom-12 right-8 font-mono text-[8px] text-white/50 tracking-widest uppercase">
          VEO CORE PROJECTION // 00:00:10:00
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// History Card Component
function HistoryCard({ item, onDelete }: { item: HistoryItem, onDelete: (id: string) => void | Promise<void>, key?: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'intent' | 'image' | 'video' | null>(null);

  const date = new Date(item.timestamp).toLocaleDateString();
  const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const togglePlay = () => {
    if (!videoUrl && item.videoBlob) {
      setVideoUrl(URL.createObjectURL(item.videoBlob));
    }
    setIsPlaying(!isPlaying);
  };

  const downloadVideo = () => {
    if (!item.videoBlob) return;
    const url = URL.createObjectURL(item.videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.videoFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSketch = () => {
    downloadBase64(item.sketch, `sketch-${item.timestamp}.png`);
  };

  const downloadImage = () => {
    downloadBase64(item.generatedImage, `projection-${item.timestamp}.png`);
  };

  const copyToClipboard = (text: string, type: 'intent' | 'image' | 'video') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-panel rounded-lg border border-black/10 overflow-hidden flex flex-col bg-white shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Station Control Header */}
      <div className="p-4 border-b border-black/5 bg-zinc-50 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/5 px-2.5 py-1 rounded font-mono text-[9px] text-black/60 uppercase tracking-widest">
            <Clock className="w-3 h-3 text-black/40" />
            <span>SESSION: #{item.id.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-black/40 text-[10px] uppercase font-mono tracking-wider">
            <Calendar className="w-3 h-3 text-black/30" />
            <span>{date} // {time}</span>
          </div>
        </div>

        <button 
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1.5 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 rounded text-[10px] uppercase font-mono tracking-widest transition-all"
        >
          <Trash2 className="w-3 h-3" /> Delete Record
        </button>
      </div>

      {/* Grid of 3 Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-black/5">
        
        {/* Step 1: Founding Sketch */}
        <div className="p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-black/5">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-black/30">01 /</span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-black/50">Founding Sketch</span>
            </div>
            <button 
              onClick={downloadSketch}
              className="flex items-center gap-1 text-[9px] uppercase font-mono text-black/50 hover:text-black hover:underline transition-all"
            >
              <Download className="w-2.5 h-2.5" /> Sketch
            </button>
          </div>

          <div className="relative aspect-[16/10] bg-zinc-50 rounded border border-black/5 p-4 flex items-center justify-center overflow-hidden">
            <img src={item.sketch} alt="Input sketch" className="w-full h-full object-contain mix-blend-multiply opacity-75" />
          </div>

          <div className="flex-1 flex flex-col gap-1.5 min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-black/30 uppercase tracking-widest">Original Intent Context</span>
              <button 
                onClick={() => copyToClipboard(item.userContext || "Zero-shot projection", 'intent')}
                className="text-black/30 hover:text-black transition-colors"
                title="Copy context string"
              >
                {copiedType === 'intent' ? <span className="text-[8px] font-mono text-green-600">Copied!</span> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="bg-zinc-50 border border-black/5 rounded p-3 h-20 overflow-y-auto scrollbar-thin text-xs text-black/70 italic">
              {item.userContext || "Zero-shot projection (No custom instructions or context supplied)"}
            </div>
          </div>
        </div>

        {/* Step 2: High-Fidelity Projection */}
        <div className="p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-black/5">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-black/30">02 /</span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-black/50">Nano Projection</span>
            </div>
            <button 
              onClick={downloadImage}
              className="flex items-center gap-1 text-[9px] uppercase font-mono text-black/50 hover:text-black hover:underline transition-all"
            >
              <Download className="w-2.5 h-2.5" /> Projection
            </button>
          </div>

          <div className="relative aspect-[16/10] bg-black rounded border border-black/5 overflow-hidden">
            <img src={item.generatedImage} alt="Nano Banana original image projection" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 flex flex-col gap-1.5 min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-black/30 uppercase tracking-widest">Image Logic Script</span>
              <button 
                onClick={() => copyToClipboard(item.imagePrompt, 'image')}
                className="text-black/30 hover:text-black transition-colors"
                title="Copy prompt logic"
              >
                {copiedType === 'image' ? <span className="text-[8px] font-mono text-green-600">Copied!</span> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="bg-zinc-50 border border-black/5 rounded p-3 h-20 overflow-y-auto scrollbar-thin text-[10px] font-mono text-black/60 leading-relaxed scrollbar-thumb-zinc-200">
              {item.imagePrompt}
            </div>
          </div>
        </div>

        {/* Step 3: Cinematic Video (Veo) */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-black/30">03 /</span>
              <span className="text-[10px] uppercase tracking-[0.15em] font-mono text-blue-500">Cinematic Motion (Veo)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[9px] uppercase font-mono font-bold tracking-widest transition-all border border-blue-200/50"
              >
                {isPlaying ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-2 h-2 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>
              <button 
                onClick={downloadVideo}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded text-[9px] uppercase font-mono font-bold tracking-widest transition-all border border-black/5"
              >
                <Download className="w-2.5 h-2.5" /> Movie (MP4)
              </button>
            </div>
          </div>

          <button 
            onClick={togglePlay}
            className="text-left relative aspect-[16/10] bg-zinc-900 rounded border border-black/5 overflow-hidden flex items-center justify-center cursor-pointer group"
            title="Click to play / pause cinematic presentation"
          >
            {isPlaying && videoUrl ? (
              <video 
                src={videoUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={item.generatedImage} 
                alt="Video thumbnail preview" 
                className="w-full h-full object-cover opacity-65 group-hover:opacity-75 transition-opacity"
              />
            )}
          </button>

          <div className="flex-1 flex flex-col gap-1.5 min-h-[90px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-black/30 uppercase tracking-widest">Motion & Audio Script</span>
              <button 
                onClick={() => copyToClipboard(item.videoPrompt, 'video')}
                className="text-black/30 hover:text-black transition-colors"
                title="Copy audio / cue directions"
              >
                {copiedType === 'video' ? <span className="text-[8px] font-mono text-green-600">Copied!</span> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="bg-zinc-50 border border-black/5 rounded p-3 h-20 overflow-y-auto scrollbar-thin text-[10px] font-mono text-black/60 leading-relaxed scrollbar-thumb-zinc-200">
              {item.videoPrompt}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export default function App() {
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('sketch_cinema_auth') === 'true';
  });

  const [sketch, setSketch] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'upload' | 'draw'>('draw');
  const [userContext, setUserContext] = useState('');
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [editableImagePrompt, setEditableImagePrompt] = useState('');
  const [editableVideoPrompt, setEditableVideoPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenerated, setVideoGenerated] = useState(false);
  const [stage, setStage] = useState<'upload' | 'interpreting' | 'rendering' | 'final'>('upload');
  const [videoStatusMsg, setVideoStatusMsg] = useState('Initializing Veo Core...');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [canvasRefKey, setCanvasRefKey] = useState(0);

  const handlePasscodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'FCAT2026') {
      localStorage.setItem('sketch_cinema_auth', 'true');
      setIsAuthenticated(true);
      setPasscodeError(null);
    } else {
      setPasscodeError('ACCESS DENIED. PLEASE VERIFY CREDENTIALS.');
      setPasscode('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sketch_cinema_auth');
    setIsAuthenticated(false);
    setPasscode('');
  };

  useEffect(() => {
    checkApiKey();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const items = await getAllHistory();
      setHistory(items.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } else {
      // Fallback if not in AI Studio environment (e.g. local dev with .env)
      setHasApiKey(!!process.env.GEMINI_API_KEY || !!process.env.API_KEY);
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSketch(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSketchSave = (base64: string) => {
    setSketch(base64);
  };

  const startPipeline = async () => {
    if (!sketch || sketch === 'data:,') {
      setError("Please provide a sketch first.");
      return;
    }
    
    setIsProcessing(true);
    setInterpretation(null);
    setGeneratedImage(null);
    setStage('interpreting');
    setError(null);

    try {
      // Stage 1: Interpretation
      const result = await interpretSketch(sketch, userContext);
      setInterpretation(result);
      setEditableImagePrompt(result.imagePrompt);
      setEditableVideoPrompt(result.videoPrompt);
      
      // Stage 2: Nano Banana Generation
      setStage('rendering');
      setIsGeneratingImage(true);
      const imageUrl = await generateNanoBananaImage(result.imagePrompt);
      setGeneratedImage(imageUrl);
      setIsGeneratingImage(false);
      
      setStage('final');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during projection.");
      setStage('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const regenerateImage = async () => {
    if (!editableImagePrompt) return;
    
    setIsGeneratingImage(true);
    setVideoUrl(null);
    setVideoGenerated(false);
    setError(null);
    
    try {
      const imageUrl = await generateNanoBananaImage(editableImagePrompt);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to regenerate image.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateVideo = async () => {
    if (!generatedImage || !editableVideoPrompt) return;
    
    // Revoke previous URL to release memory if re-generating
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    
    setIsGeneratingVideo(true);
    setError(null);
    
    const messages = [
      "Initializing Veo Core...",
      "Interpolating Latent Space...",
      "Synthesizing Temporal Coherence...",
      "Optimizing Motion Vectors...",
      "Refining Atmospheric Physics...",
      "Finalizing Cinematic Sequence..."
    ];
    
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setVideoStatusMsg(messages[msgIndex]);
    }, 5000);

    try {
      if (!hasApiKey) {
        await handleSelectKey();
      }
      
      const blob = await generateVeoVideo(editableVideoPrompt, generatedImage);
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoGenerated(true);

      // Save to history
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        sketch: sketch!,
        userContext: userContext,
        imagePrompt: editableImagePrompt,
        generatedImage: generatedImage!,
        videoPrompt: editableVideoPrompt,
        videoBlob: blob,
        videoFileName: `veo3-cinematic-${Date.now()}.mp4`
      };
      await saveHistoryItem(historyItem);
      setHistory(prev => [historyItem, ...prev]);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Video generation failed.";
      
      if (errMsg.includes("Requested entity was not found") || errMsg.includes("403") || errMsg.includes("400")) {
        errMsg = "API Authentication error. Please ensure you have selected a valid, billing-enabled API key for Veo 3.1.";
        setHasApiKey(false); // Force re-selection
      } else if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        errMsg = "Quota exhausted. Please try again later or upgrade your billing tier.";
      }
      
      setError(errMsg);
    } finally {
      clearInterval(msgInterval);
      setIsGeneratingVideo(false);
    }
  };

  const reset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSketch(null);
    setUserContext('');
    setInterpretation(null);
    setGeneratedImage(null);
    setVideoUrl(null);
    setEditableImagePrompt('');
    setEditableVideoPrompt('');
    setVideoGenerated(false);
    setStage('upload');
    setError(null);
    setCanvasRefKey(prev => prev + 1);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen font-sans selection:bg-black/20 bg-zinc-50 relative flex items-center justify-center overflow-hidden">
        {/* Background & Effects */}
        <div className="fixed inset-0 studio-grid opacity-20 pointer-events-none" />
        <div className="fixed inset-0 bg-radial-at-t from-zinc-200/50 to-transparent pointer-events-none" />
        <div className="scanline" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-50 w-full max-w-md mx-4"
        >
          <div className="glass-panel rounded-lg border border-black/10 p-8 shadow-xl bg-white/70 backdrop-blur-xl relative overflow-hidden flex flex-col gap-6">
            
            {/* Top Indicator */}
            <div className="flex justify-between items-center text-[9px] font-mono text-black/40 uppercase tracking-widest border-b border-black/5 pb-4">
              <span className="flex items-center gap-1.5 font-bold text-orange-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                SYSTEM LOCK
              </span>
              <span>EST. 2026</span>
            </div>

            {/* Emblem and Title */}
            <div className="flex flex-col items-center gap-3 my-2 text-center">
              <div className="w-12 h-12 bg-black flex items-center justify-center rounded-sm shadow-md">
                <Layers className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display font-bold text-2xl uppercase tracking-tighter">Sketch-to-Cinema</h1>
                <p className="text-[10px] uppercase font-mono text-black/40 tracking-[0.2em] mt-1">Creative Director Terminal</p>
              </div>
            </div>

            {/* Restricted access notice */}
            <div className="bg-black/[0.02] border border-black/5 rounded p-4 font-mono text-[10px] text-black/60 leading-relaxed flex items-start gap-3">
              <Lock className="w-4 h-4 text-black/40 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-black/80 mb-1 uppercase">ACCESS RESTRICTED</p>
                <p>Please enter the secure authorization passcode provided for FCAT2026 session deployment to unlock the generator pipelines and the archive console.</p>
              </div>
            </div>

            {/* Error Message */}
            {passcodeError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-200 text-red-600 p-3 rounded text-[11px] font-mono text-center"
              >
                ⚠ {passcodeError}
              </motion.div>
            )}

            {/* Security Passcode Entry */}
            <form onSubmit={handlePasscodeSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-mono uppercase text-black/40 tracking-widest font-bold">
                  Enter Password Credentials
                </label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (passcodeError) setPasscodeError(null);
                  }}
                  placeholder="••••••••••••"
                  autoFocus
                  className="w-full bg-black/[0.03] border border-black/15 focus:border-black rounded px-4 py-3 font-mono text-sm tracking-[0.25em] text-center text-black placeholder-black/20 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black hover:bg-zinc-800 text-white py-3 rounded text-[10px] uppercase font-bold tracking-[0.2em] transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Initialize Platform</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="border-t border-black/5 pt-4 text-center">
              <p className="text-[9px] font-mono text-black/30 uppercase tracking-[0.15em]">
                AUTHENTICATION PORT // SECURE CONTROL
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-black/20">
      {/* Background & Effects */}
      <div className="fixed inset-0 studio-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-radial-at-t from-zinc-200/50 to-transparent pointer-events-none" />
      <div className="scanline" />

      {/* Header */}
      <header className="relative z-50 p-6 flex justify-between items-center border-b border-black/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black flex items-center justify-center rounded-sm">
            <Layers className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl uppercase tracking-tighter">Sketch-to-Cinema</h1>
            <p className="text-[10px] uppercase font-mono text-black/40 tracking-[0.2em]">Creative Director v3.1</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!hasApiKey && (
            <button 
              onClick={handleSelectKey}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <Key className="w-4 h-4" />
              Select API Key
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-black/5 hover:bg-black/10 text-black/60 hover:text-black border border-black/10 px-3 py-1.5 rounded font-mono text-[9px] uppercase tracking-widest transition-all"
            title="Lock terminal and sign out"
          >
            <Lock className="w-3 h-3" />
            Lock Session
          </button>
        </div>
      </header>

      <main className="relative z-40 container mx-auto px-6 py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column: Input */}
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase text-black/30 tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 bg-black/40 rounded-full" /> Input Terminal
              </span>
              <div className="flex justify-between items-end">
                <h2 className="font-display text-4xl font-light">The Founding Sketch</h2>
                <div className="flex items-center gap-4">
                  {(sketch || interpretation || generatedImage) && (
                    <button 
                      onClick={reset}
                      className="flex items-center gap-2 text-[10px] uppercase font-mono text-black/40 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Start Fresh
                    </button>
                  )}
                  <div className="flex bg-black/5 p-1 rounded-md border border-black/10">
                    <button 
                      onClick={() => { setInputMode('draw'); setSketch(null); }}
                      className={`px-3 py-1 rounded text-[10px] uppercase tracking-widest transition-all ${inputMode === 'draw' ? 'bg-black text-white font-bold' : 'text-black/40 hover:text-black'}`}
                    >
                      Draw
                    </button>
                    <button 
                      onClick={() => { setInputMode('upload'); setSketch(null); }}
                      className={`px-3 py-1 rounded text-[10px] uppercase tracking-widest transition-all ${inputMode === 'upload' ? 'bg-black text-white font-bold' : 'text-black/40 hover:text-black'}`}
                    >
                      Upload
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-black/60 text-sm max-w-md">
                {inputMode === 'draw' 
                  ? "Sketch your vision directly on the terminal. Use the tools to refine your geometry." 
                  : "Upload your hand-drawn vision. Files will be analyzed for spatial intent."}
              </p>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase text-black/40 tracking-widest">Additional Context / Narrative (Optional)</label>
                <textarea 
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="Describe materials, lighting styles, or specific thematic elements..."
                  className="w-full h-24 bg-black/5 border border-black/10 rounded-lg p-3 text-xs text-black/80 focus:outline-none focus:border-black/30 placeholder:text-black/20 resize-none transition-all"
                />
              </div>
            </div>

            <div className="relative group">
              {inputMode === 'upload' ? (
                !sketch ? (
                  <div className="aspect-[16/9] glass-panel rounded-lg flex flex-col items-center justify-center gap-4 transition-all hover:bg-black/5 border-dashed border-2 border-black/10 group-hover:border-black/30">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center">
                      <Upload className="text-black/40 w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-black font-medium uppercase text-xs tracking-widest">Drop Sketch Files</p>
                      <p className="text-black/30 text-[10px] uppercase mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden glass-panel border border-black/20">
                    <img src={sketch} alt="Sketch" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setSketch(null)}
                      className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full backdrop-blur-md border border-black/10 transition-all"
                    >
                      <RefreshCw className="w-4 h-4 text-black" />
                    </button>
                  </div>
                )
              ) : (
                <SketchCanvas key={canvasRefKey} onSave={handleSketchSave} className="w-full" />
              )}
            </div>

            {sketch && sketch !== 'data:,' && !isProcessing && stage === 'upload' && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={startPipeline}
                className="w-full py-4 bg-black text-white font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all rounded-sm"
              >
                Assemble Concept <ChevronRight className="w-5 h-5" />
              </motion.button>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 mt-4">
                <AlertCircle className="text-red-500 w-5 h-5 shrink-0" />
                <p className="text-red-500 text-xs font-mono">{error}</p>
              </div>
            )}
          </section>

          {/* Right Column: AI Projections */}
          <section className="flex flex-col gap-8">
            <AnimatePresence mode="wait">
              {stage === 'upload' ? (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12 glass-panel rounded-lg border-black/5"
                >
                  <Sparkles className="w-12 h-12 text-black/10 mb-6" />
                  <p className="text-black/20 uppercase font-mono text-xs tracking-[0.4em]">Awaiting Instruction</p>
                  <p className="text-black/10 text-[10px] max-w-xs mt-4">Initiate the pipeline to see Nano Banana and Veo 3 projections.</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="active"
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-12"
                >
                  {/* Nano Banana Panel */}
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] uppercase text-black/30 tracking-widest flex items-center gap-2">
                          <div className={`w-1 h-1 rounded-full ${stage === 'interpreting' || stage === 'rendering' ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} /> 
                          Stage 1: Nano Banana
                        </span>
                        <h3 className="font-display text-2xl">Photorealistic Projection</h3>
                      </div>
                      {generatedImage && (
                        <button 
                          onClick={() => downloadBase64(generatedImage, 'nano-banana-render.png')}
                          className="p-2 text-black/40 hover:text-black transition-colors"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden glass-panel border border-black/10 flex items-center justify-center bg-zinc-50">
                      {(isProcessing && stage === 'interpreting') && (
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCw className="w-8 h-8 animate-spin text-black/20" />
                          <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">Interpreting Geometry...</p>
                        </div>
                      )}
                      {(isProcessing || isGeneratingImage) && stage === 'rendering' && (
                        <div className="flex flex-col items-center gap-4">
                          <ImageIcon className="w-8 h-8 animate-pulse text-black/20" />
                          <p className="font-mono text-[10px] uppercase tracking-widest text-black/40">Synthesizing Textures...</p>
                        </div>
                      )}
                      {generatedImage && !isGeneratingImage && (
                        <motion.img 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          src={generatedImage} 
                          alt="Nano Banana Output" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>

                    {interpretation && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-black/5 rounded-lg border border-black/10 flex flex-col gap-3 group active:border-black/30 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <label htmlFor="image-prompt" className="font-mono text-[10px] uppercase text-black/40 tracking-widest flex items-center gap-2 cursor-pointer">
                            <Edit2 className="w-3 h-3" /> Image Generation Prompt
                          </label>
                          <span className="text-[10px] font-mono text-black/20 italic select-none">Editable Terminal</span>
                        </div>
                        <textarea 
                          id="image-prompt"
                          disabled={isProcessing || isGeneratingImage}
                          value={editableImagePrompt}
                          onChange={(e) => setEditableImagePrompt(e.target.value)}
                          placeholder="Refine the visual direction..."
                          className="w-full bg-transparent text-black/80 text-xs leading-relaxed italic border-none focus:outline-none resize-none h-24 scrollbar-thin scrollbar-thumb-black/10"
                        />
                        {generatedImage && !isGeneratingImage && !isProcessing && (
                          <div className="flex justify-end">
                            <button 
                              onClick={regenerateImage}
                              className="text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black flex items-center gap-2 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" /> Re-Project Image
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Veo 3 Panel */}
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] uppercase text-black/30 tracking-widest flex items-center gap-2">
                          <div className={`w-1 h-1 rounded-full ${videoGenerated ? 'bg-green-500' : isGeneratingVideo ? 'bg-orange-500 animate-pulse' : 'bg-black/10'}`} /> 
                          Stage 2: Veo 3
                        </span>
                        <h3 className="font-display text-2xl">Motion Synthesis</h3>
                      </div>
                    </div>

                    {interpretation && stage === 'final' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-black/5 rounded-lg border border-black/10 flex flex-col gap-3 group active:border-black/30 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <label htmlFor="motion-prompt" className="font-mono text-[10px] uppercase text-black/40 tracking-widest flex items-center gap-2 cursor-pointer">
                            <Edit2 className="w-3 h-3" /> Motion & SFX Logic
                          </label>
                          <div className="flex items-center gap-2">
                             {videoGenerated && !isGeneratingVideo && (
                               <span className="text-[10px] font-mono text-green-600 bg-green-500/10 px-1 rounded">Generated</span>
                             )}
                             <span className="text-[10px] font-mono text-black/20 italic select-none">Editable Terminal</span>
                          </div>
                        </div>
                        <textarea 
                          id="motion-prompt"
                          disabled={isGeneratingVideo}
                          value={editableVideoPrompt}
                          onChange={(e) => {
                            setEditableVideoPrompt(e.target.value);
                          }}
                          placeholder="Describe camera movement, atmosphere, and soundscape..."
                          className="w-full bg-transparent text-black/80 text-xs leading-relaxed italic border-none focus:outline-none resize-none h-32 scrollbar-thin scrollbar-thumb-black/10"
                        />
                        {videoGenerated && !isGeneratingVideo && (
                          <div className="flex justify-end">
                            <button 
                              onClick={generateVideo}
                              className="text-[10px] font-bold uppercase tracking-widest text-black/40 hover:text-black flex items-center gap-2 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" /> Re-Project Video
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden glass-panel border border-black/10 flex items-center justify-center bg-zinc-50">
                      {stage !== 'final' ? (
                        <div className="flex flex-col items-center gap-4">
                          <Video className="w-8 h-8 text-black/10" />
                          <p className="font-mono text-[10px] uppercase tracking-widest text-black/20">Awaiting Image Render</p>
                        </div>
                      ) : isGeneratingVideo ? (
                        <div className="flex flex-col items-center gap-4 text-center px-12">
                          <Loader2 className="w-10 h-10 animate-spin text-black/20" />
                          <div className="flex flex-col gap-1">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] animate-pulse">{videoStatusMsg}</p>
                            <p className="text-[9px] text-black/30 font-mono">Neural rendering engine v3.1 // VEO_CORE_ACTIVE</p>
                          </div>
                        </div>
                      ) : !videoGenerated ? (
                        <div className="flex flex-col items-center gap-6 text-center px-12">
                          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center">
                            <Video className="text-white w-8 h-8" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="font-display text-lg">Director's Script Ready</p>
                            <p className="text-black/40 text-[10px] uppercase tracking-widest">Adjust the choreography above and generate the cinematic sequence.</p>
                          </div>
                          <button 
                            onClick={generateVideo}
                            className="w-full max-w-sm py-4 bg-black text-white font-bold uppercase text-[10px] tracking-[0.3em] rounded-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10"
                          >
                            <Play className="w-3 h-3 fill-current" /> Generate Video
                          </button>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <MotionPreview 
                            videoUrl={videoUrl || undefined}
                            image={generatedImage!} 
                            prompt={editableVideoPrompt} 
                            isActive={videoGenerated} 
                          />
                        </div>
                      )}

                      {videoGenerated && (
                        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
                           {videoUrl && (
                             <a 
                               href={videoUrl} 
                               download="veo3-cinematic.mp4"
                               className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                             >
                               <Download className="w-3 h-3" /> Save Sequence
                             </a>
                           )}
                           {!videoUrl && (
                             <button 
                              onClick={() => downloadBase64(generatedImage!, 'veo3-motion-frame.png')}
                              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                            >
                              <Download className="w-3 h-3" /> Save Frame
                            </button>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* History Section */}
        <section className="mt-24 pt-12 border-t border-black/5">
          <div className="flex items-center justify-between mb-12">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase text-black/30 tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" /> Archive Terminal
              </span>
              <h2 className="font-display text-3xl font-light">Project History</h2>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="glass-panel border-dashed border-2 border-black/15 rounded-lg p-12 text-center flex flex-col items-center justify-center bg-black/[0.01]">
              <div className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center mb-4 bg-zinc-50">
                <History className="w-5 h-5 text-black/30" />
              </div>
              <h3 className="font-display text-sm uppercase tracking-wider text-black/70 mb-1">ARCHIVE COLD STORAGE // STANDBY</h3>
              <p className="text-xs text-black/40 max-w-md mx-auto leading-relaxed">
                No active session experiments have been logged in local IndexedDB database. Complete your first "Sketch-to-Cinema" process above (generating an image projection and running motion synthesis), and you will find your complete timeline of sketches, visual images, motion guides, and downloads recorded here.
              </p>
              <div className="mt-6 flex gap-6 text-[8px] font-mono uppercase tracking-[0.2em] text-black/30">
                <span>DATABASE STATUS: LOGS_VACANT</span>
                <span>//</span>
                <span>CORE: ONLINE</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-12">
              {history.map((item: HistoryItem) => (
                <HistoryCard 
                  key={item.id} 
                  item={item} 
                  onDelete={async (id) => {
                    await deleteHistoryItem(id);
                    setHistory(prev => prev.filter(h => h.id !== id));
                  }} 
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer Info */}
      <footer className="relative z-50 p-12 border-t border-black/5 mt-20">
        <div className="container mx-auto flex flex-col md:flex-row justify-between gap-12">
          <div className="flex flex-col gap-6 max-w-sm">
            <h4 className="font-display text-xl uppercase tracking-widest">The Pipeline</h4>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="text-black/30 font-mono text-sm shrink-0">01</div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider">Nano Banana</p>
                  <p className="text-xs text-black/50 mt-1">Translates rough geometry into high-fidelity materials, lighting, and textures while preserving spatial intent.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="text-black/30 font-mono text-sm shrink-0">02</div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider">Veo 3</p>
                  <p className="text-xs text-black/50 mt-1">Analyzes the generated concept to orchestrate cinematic motion, camera choreography, and atmospheric physics.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-20">
            <div className="flex flex-col gap-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-black/30">System Status</span>
              <ul className="text-xs flex flex-col gap-2 font-mono uppercase tracking-wider">
                <li className="flex items-center gap-2 underline underline-offset-4 decoration-green-500/50">Core: Operational</li>
                <li className="flex items-center gap-2 underline underline-offset-4 decoration-green-500/50">GenAI: Ready</li>
                <li className="flex items-center gap-2 underline underline-offset-4 decoration-black/10 opacity-50">Local Auth: Active</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-20 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-mono uppercase text-black/20 tracking-widest">© 2026 Creative Director Studio. All AI Projections rights reserved.</p>
          <div className="flex gap-8 items-center text-[10px] font-mono uppercase text-black/40 tracking-widest">
            <a href="#" className="hover:text-black transition-colors">Documentation</a>
            <a href="#" className="hover:text-black transition-colors">API Reference</a>
            <a href="#" className="hover:text-black transition-colors">Gallery</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
