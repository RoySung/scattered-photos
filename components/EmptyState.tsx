import React, { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 z-0 pointer-events-none no-export">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="flex flex-col items-center gap-6 p-12 border-2 border-dashed border-white/10 rounded-3xl bg-black/20 backdrop-blur-sm pointer-events-auto"
      >
        <div className="p-6 bg-white/5 rounded-full ring-1 ring-white/10 shadow-xl">
          <ImagePlus size={48} className="text-white/80" />
        </div>
        
        <div className="text-center space-y-2 max-w-sm">
          <h2 className="text-2xl font-light text-white">Scatter Your Memories</h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Upload photos to create your own messy, nostalgic pile of polaroids. Drag them around to rearrange.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 px-8 py-3 bg-white text-black font-medium rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
          Select Photos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />
      </motion.div>
    </div>
  );
};