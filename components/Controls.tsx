import React, { useRef, useState } from 'react';
import { Upload, RotateCcw, Shuffle, Scaling, Layers, Palette, Image as ImageIcon, Download } from 'lucide-react';
import { BackgroundSettings } from '../types';

interface ControlsProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onReshuffle: () => void;
  onScaleChange: (scale: number) => void;
  onToggleSidebar: () => void;
  onBackgroundChange: (settings: BackgroundSettings) => void;
  onExport: () => void;
  currentScale: number;
  hasPhotos: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ 
  onUpload, 
  onClear, 
  onReshuffle, 
  onScaleChange,
  onToggleSidebar,
  onBackgroundChange,
  onExport,
  currentScale,
  hasPhotos 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const [showSlider, setShowSlider] = useState(false);
  const [showBgMenu, setShowBgMenu] = useState(false);

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onBackgroundChange({
            type: 'image',
            value: event.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 no-export">
      
      {/* Background Menu Popup */}
      {showBgMenu && (
        <div className="p-4 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-3 min-w-[200px]">
           <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider text-center">Background Style</span>
           <div className="flex gap-3 justify-center">
              {/* Default */}
              <button 
                onClick={() => onBackgroundChange({type: 'default', value: ''})} 
                className="w-10 h-10 rounded-full bg-stone-800 border border-white/20 hover:border-white/60 transition-all flex items-center justify-center relative overflow-hidden group" 
                title="Default Wood"
              >
                 <div className="absolute inset-0 bg-[#2d2d2d]" />
                 <span className="relative text-xs text-white/70 font-bold">Def</span>
              </button>

              {/* Color Picker */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-white/60 transition-all cursor-pointer group bg-stone-800" title="Solid Color">
                 <input 
                   type="color" 
                   className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 m-0 cursor-pointer opacity-0 z-10" 
                   onChange={(e) => onBackgroundChange({type: 'color', value: e.target.value})} 
                 />
                 <div className="absolute inset-0 flex items-center justify-center text-white/70 pointer-events-none">
                    <Palette size={18} />
                 </div>
              </div>

              {/* Image Upload */}
              <button 
                onClick={() => bgImageInputRef.current?.click()} 
                className="w-10 h-10 rounded-full bg-stone-800 border border-white/20 hover:border-white/60 transition-all flex items-center justify-center text-white/70" 
                title="Upload Image"
              >
                 <ImageIcon size={18} />
              </button>
              <input 
                ref={bgImageInputRef} 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleBgImageUpload} 
              />
           </div>
        </div>
      )}

      {/* Scale Slider Popup */}
      {showSlider && hasPhotos && (
        <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs text-white/70 font-medium">Size</span>
          <input 
            type="range" 
            min="0.5" 
            max="1.5" 
            step="0.1" 
            value={currentScale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200"
          />
          <span className="text-xs text-white/70 w-8 text-right">{Math.round(currentScale * 100)}%</span>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center gap-4 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-2xl">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors font-medium text-sm"
        >
          <Upload size={18} />
          <span>Add Photos</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />

        <div className="w-px h-6 bg-white/20 mx-1" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowBgMenu(!showBgMenu);
            setShowSlider(false);
          }}
          className={`p-2 rounded-full transition-all ${showBgMenu ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          title="Change Background"
        >
          <Palette size={20} />
        </button>

        {hasPhotos && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSlider(!showSlider);
                setShowBgMenu(false);
              }}
              className={`p-2 rounded-full transition-all ${showSlider ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
              title="Adjust Size"
            >
              <Scaling size={20} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSidebar();
                setShowSlider(false);
                setShowBgMenu(false);
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Layers / Order"
            >
              <Layers size={20} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onReshuffle();
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Scatter Again"
            >
              <Shuffle size={20} />
            </button>

            <button
              onClick={(e) => {
                 e.stopPropagation();
                 onExport();
              }}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
              title="Save Image"
            >
              <Download size={20} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
                setShowSlider(false);
                setShowBgMenu(false);
              }}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full transition-all"
              title="Reset / Clear Board"
            >
              <RotateCcw size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};