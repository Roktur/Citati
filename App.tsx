
import React, { useState, useRef, useEffect } from 'react';
import { QuoteStyle, QuoteProject } from './types';
import { generateBackgroundImage } from './services/gemini';
import { 
  Download, 
  Copy, 
  RefreshCw, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette, 
  Image as ImageIcon, 
  ZoomIn, 
  X,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Check,
  Key,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';

const STYLES = Object.values(QuoteStyle);

const STYLE_LABELS: Record<QuoteStyle, string> = {
  [QuoteStyle.MINIMAL]: 'Минимализм',
  [QuoteStyle.NATURE]: 'Природа',
  [QuoteStyle.URBAN]: 'Город',
  [QuoteStyle.ABSTRACT]: 'Абстракция',
  [QuoteStyle.CLASSIC]: 'Классика',
  [QuoteStyle.CYBERPUNK]: 'Киберпанк',
  [QuoteStyle.SOCIAL]: 'Социальный (Лайфстайл)',
  [QuoteStyle.MORNING]: 'Утренний',
  [QuoteStyle.DAYTIME]: 'Дневной'
};

const STYLE_TO_FONT: Partial<Record<QuoteStyle, string>> = {
  [QuoteStyle.DAYTIME]: "'Lora', serif",
  [QuoteStyle.MORNING]: "'Marck Script', cursive",
  [QuoteStyle.SOCIAL]: "'Playfair Display', serif"
};

const FONTS = [
  { name: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Playfair Display', family: "'Playfair Display', serif" },
  { name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { name: 'Cormorant', family: "'Cormorant Garamond', serif" },
  { name: 'Oswald', family: "'Oswald', sans-serif" },
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Marck Script', family: "'Marck Script', cursive" },
  { name: 'Lora', family: "'Lora', serif" },
  { name: 'Amatic SC', family: "'Amatic SC', cursive" },
  { name: 'Alice', family: "'Alice', serif" },
  { name: 'Lobster', family: "'Lobster', cursive" }
];

const VERTICAL_ALIGN_CLASSES = {
  top: 'justify-start pt-20',
  middle: 'justify-center',
  bottom: 'justify-end pb-20'
};

const QuotePreview = React.memo(({ project, showText, scale = 1, forwardedRef }: { project: QuoteProject; showText: boolean; scale?: number; forwardedRef?: React.Ref<HTMLDivElement> }) => {
  return (
    <div 
      ref={forwardedRef}
      className="relative w-full aspect-9-16 bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10"
      style={{ backgroundColor: project.imageUrl ? 'transparent' : '#1e293b' }}
    >
      {project.imageUrl ? (
        <img src={project.imageUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-slate-600">
           <div className="w-16 h-16 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center mb-4">
              <ImageIcon size={32} />
           </div>
           <p className="text-sm">Нажмите "Создать изображение"</p>
        </div>
      )}
      
      {showText && (
        <div className={`absolute inset-0 flex flex-col p-12 transition-all ${project.imageUrl ? 'bg-black/30' : ''} ${VERTICAL_ALIGN_CLASSES[project.verticalAlign]}`}>
          <div className="w-full leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" style={{ textAlign: project.textAlign }}>
            <p 
              className=""
              style={{
                fontSize: `${project.fontSize * scale}px`,
                color: project.textColor,
                fontFamily: project.fontFamily,
              }}
            >
              "{project.text}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

const App: React.FC = () => {
  const [project, setProject] = useState<QuoteProject>({
    id: '1',
    text: 'Ваше время ограничено, поэтому не тратьте его на то, чтобы жить чужой жизнью.',
    style: QuoteStyle.SOCIAL,
    fontSize: 28,
    textColor: '#ffffff',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontFamily: "'Playfair Display', serif"
  });
  
  const [showText, setShowText] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string | null>(null);
  
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio?.hasSelectedApiKey) {
        setHasKey(await win.aistudio.hasSelectedApiKey());
      }
    };
    checkKey();
  }, []);

  // Эффект для автоматической генерации "слоя для ПКМ"
  useEffect(() => {
    if (!project.imageUrl) {
      setRenderedPreviewUrl(null);
      return;
    }

    // Сбрасываем URL при любых изменениях, чтобы пользователь не скопировал старую версию
    setRenderedPreviewUrl(null);

    const generateOverlay = async () => {
      if (previewRef.current && !isGenerating) {
        try {
          await document.fonts.ready;
          const options = { 
            quality: 0.9, 
            pixelRatio: 1.5, // Достаточно для копирования, чуть меньше для производительности
            skipFonts: false, 
            backgroundColor: '#1e293b',
            includeQueryParams: true,
          };
          const dataUrl = await htmlToImage.toPng(previewRef.current, options);
          setRenderedPreviewUrl(dataUrl);
        } catch (e) {
          console.error("Silent render failed", e);
        }
      }
    };

    // Дебаунс 1.5 сек - генерируем картинку, когда пользователь перестал редактировать
    const timer = setTimeout(generateOverlay, 1500);
    return () => clearTimeout(timer);
  }, [project, showText, isGenerating]);

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio?.openSelectKey) {
      await win.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!project.text.trim()) return;
    setIsGenerating(true);
    setRenderedPreviewUrl(null); // Скрываем слой копирования во время генерации
    try {
      const imageUrl = await generateBackgroundImage(project.text, project.style);
      if (imageUrl) setProject(prev => ({ ...prev, imageUrl }));
    } catch (error: any) {
      if (error.message === 'KEY_RESET') {
        setHasKey(false);
      } else {
        alert("Ошибка генерации. Попробуйте еще раз.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const captureImage = async (mode: 'download' | 'copy') => {
    if (!previewRef.current) return;
    if (mode === 'copy') setIsCopying(true);

    const options = { 
      quality: 1.0, 
      pixelRatio: 2, 
      skipFonts: false, 
      backgroundColor: '#1e293b',
      includeQueryParams: true,
    };

    try {
      if (mode === 'download') {
        await document.fonts.ready;
        const dataUrl = await htmlToImage.toPng(previewRef.current, options);
        const link = document.createElement('a');
        link.download = `quote-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        setIsCopying(false);
      } else {
        const blobPromise = (async () => {
          await document.fonts.ready;
          const blob = await htmlToImage.toBlob(previewRef.current!, options);
          if (!blob) throw new Error("Failed to generate blob");
          return blob;
        })();

        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blobPromise
            })
          ]);
          
          await blobPromise;
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        } catch (clipErr) {
          console.error("Clipboard API error:", clipErr);
          alert("Браузер заблокировал доступ к буферу обмена. Пожалуйста, используйте 'Скачать'.");
        } finally {
          setIsCopying(false);
        }
      }
    } catch (err) {
      console.error("Capture error:", err);
      alert("Не удалось создать изображение. Попробуйте обновить страницу.");
      setIsCopying(false);
    }
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStyle = e.target.value as QuoteStyle;
    const newFont = STYLE_TO_FONT[newStyle] || project.fontFamily;
    setProject({ ...project, style: newStyle, fontFamily: newFont });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#b29700]">Готовые цитаты от @aiept</h1>
          <p className="text-slate-400 mt-2">Глубокая визуализация смыслов через ИИ.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleSelectKey} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${!hasKey ? 'bg-amber-600 animate-pulse' : 'bg-slate-800'}`}>
            <Key size={18} /> {hasKey ? 'Ключ выбран' : 'Выбрать API ключ'}
          </button>
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>
          
          <button 
            onClick={() => captureImage('copy')} 
            disabled={!project.imageUrl || isGenerating || isCopying} 
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${isCopied ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {isCopying ? <RefreshCw className="animate-spin" size={18} /> : isCopied ? <Check size={18} /> : <Copy size={18} />} 
            {isCopied ? 'Картинка готова!' : 'Копировать'}
          </button>

          <button 
            onClick={() => captureImage('download')} 
            disabled={!project.imageUrl || isGenerating || isCopying} 
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-full font-semibold text-white transition-all shadow-lg shadow-indigo-500/20"
          >
            <Download size={18} /> Скачать
          </button>
        </div>
      </header>

      {!hasKey && (
        <div className="max-w-6xl mx-auto mb-8 bg-amber-900/20 border border-amber-900/50 p-4 rounded-2xl flex items-center gap-4 text-amber-200">
          <AlertCircle className="shrink-0" size={24} />
          <div className="flex-1 text-sm">Требуется API ключ Gemini 2.5 для смыслового анализа.</div>
          <button onClick={handleSelectKey} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold">Выбрать</button>
        </div>
      )}

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl backdrop-blur-sm space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Цитата для анализа</label>
              <button 
                onClick={() => setShowText(!showText)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showText ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}
              >
                {showText ? <Eye size={14} /> : <EyeOff size={14} />}
                {showText ? 'Текст виден' : 'Текст скрыт'}
              </button>
            </div>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-lg focus:ring-2 focus:ring-indigo-500 transition-all min-h-[140px]"
              value={project.text}
              onChange={(e) => setProject({ ...project, text: e.target.value })}
              placeholder="Введите цитату..."
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Стиль визуализации</span>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={project.style}
                  onChange={handleStyleChange}
                >
                  {STYLES.map(s => <option key={s} value={s}>{STYLE_LABELS[s] || s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Шрифт</span>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm"
                  value={project.fontFamily}
                  onChange={(e) => setProject({ ...project, fontFamily: e.target.value })}
                >
                  {FONTS.map(f => <option key={f.name} value={f.family}>{f.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className={`space-y-4 pt-4 border-t border-slate-800 transition-opacity ${!showText ? 'opacity-30 grayscale' : 'opacity-100'}`}>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Цвет и Размер</span>
                <div className="flex items-center gap-3">
                  <input type="color" value={project.textColor} onChange={(e) => setProject({ ...project, textColor: e.target.value })} className="h-10 w-10 rounded bg-transparent border-0 cursor-pointer" />
                  <input type="range" min="16" max="72" value={project.fontSize} onChange={(e) => setProject({ ...project, fontSize: parseInt(e.target.value) })} className="flex-1 accent-indigo-500" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Выравнивание</span>
                <div className="flex justify-end gap-1">
                  {['left', 'center', 'right'].map(a => (
                    <button key={a} onClick={() => setProject({ ...project, textAlign: a as any })} className={`p-2 rounded ${project.textAlign === a ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
                      {a === 'left' ? <AlignLeft size={16} /> : a === 'center' ? <AlignCenter size={16} /> : <AlignRight size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Вертикальная позиция</span>
              <div className="flex gap-1">
                {['top', 'middle', 'bottom'].map(v => (
                  <button key={v} onClick={() => setProject({ ...project, verticalAlign: v as any })} className={`flex-1 py-2 flex justify-center rounded ${project.verticalAlign === v ? 'bg-indigo-600' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {v === 'top' ? <AlignVerticalJustifyStart size={18} /> : v === 'middle' ? <AlignVerticalJustifyCenter size={18} /> : <AlignVerticalJustifyEnd size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl text-white transition-all active:scale-[0.98]">
            {isGenerating ? <><RefreshCw className="animate-spin" size={24} /> Анализируем смысл...</> : <><ImageIcon size={24} /> Создать изображение 9:16</>}
          </button>
        </section>

        <section className="flex flex-col items-center">
          <div className="sticky top-8 w-full max-w-[320px] group">
            <div className="relative">
              <QuotePreview project={project} showText={showText} forwardedRef={previewRef} />
              
              {/* Прозрачный слой для поддержки нативного Right-Click */}
              {renderedPreviewUrl && (
                <img 
                  src={renderedPreviewUrl} 
                  className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-context-menu" 
                  alt="Готовое изображение для ПКМ"
                  title="Нажмите правой кнопкой мыши для копирования"
                />
              )}

              {project.imageUrl && (
                <button onClick={() => setIsZoomed(true)} className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-20">
                  <ZoomIn size={18} />
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {isZoomed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
          <button onClick={() => setIsZoomed(false)} className="absolute top-6 right-6 p-4 bg-slate-800 text-white rounded-full shadow-2xl transition-transform hover:scale-110"><X size={28} /></button>
          <div className="h-full max-h-[90vh] aspect-9-16 relative animate-in zoom-in-95"><QuotePreview project={project} showText={showText} scale={1.5} /></div>
        </div>
      )}
    </div>
  );
};

export default App;
