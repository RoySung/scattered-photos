import React from 'react';
import { Reorder, motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, GripVertical, GripHorizontal } from 'lucide-react';
import { Photo } from '../types';

interface LayerSidebarProps {
  isOpen: boolean;
  photos: Photo[];
  onReorder: (photos: Photo[]) => void;
  onRemove: (id: string) => void;
  onHighlight: (id: string | null) => void;
  onClose: () => void;
}

export const LayerSidebar: React.FC<LayerSidebarProps> = ({
  isOpen,
  photos,
  onReorder,
  onRemove,
  onHighlight,
  onClose,
}) => {
  const dragControls = useDragControls();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          drag
          dragListener={false}
          dragControls={dragControls}
          dragMomentum={false}
          className="fixed right-8 top-24 w-72 bg-stone-900/90 backdrop-blur-xl border border-white/10 shadow-2xl z-[10000] flex flex-col rounded-xl overflow-hidden max-h-[60vh] no-export"
        >
          {/* Header - Drag Handle */}
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="flex items-center justify-between p-3 border-b border-white/10 cursor-move bg-white/5 select-none"
          >
            <div className="flex items-center gap-2 text-white/80">
               <GripHorizontal size={16} />
               <h2 className="text-sm font-medium">Layers</h2>
            </div>
            <button 
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {photos.length === 0 ? (
              <div className="text-white/30 text-center py-8 text-xs">
                No photos added yet.
              </div>
            ) : (
              <Reorder.Group axis="y" values={photos} onReorder={onReorder} className="space-y-2">
                {photos.map((photo) => (
                  <Reorder.Item
                    key={photo.id}
                    value={photo}
                    onPointerEnter={() => onHighlight(photo.id)}
                    onPointerLeave={() => onHighlight(null)}
                    className="bg-white/5 rounded-lg p-2 flex items-center gap-3 group cursor-default border border-white/5 hover:border-white/20 transition-colors"
                  >
                    {/* Drag Handle for Reorder */}
                    <div className="text-white/20 group-hover:text-white/50 cursor-grab active:cursor-grabbing p-1">
                      <GripVertical size={14} />
                    </div>

                    {/* Thumbnail */}
                    <div className="w-8 h-8 rounded bg-black/50 overflow-hidden flex-shrink-0 border border-white/10 select-none">
                      <img 
                        src={photo.url} 
                        alt="thumbnail" 
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 select-none">
                       <div className="text-[10px] text-white/40 truncate">
                         ID: {photo.id.slice(-4)}
                       </div>
                       <div className="text-[9px] text-white/30">
                         Z: {photo.zIndex}
                       </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(photo.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                      title="Remove layer"
                    >
                      <X size={14} />
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </div>
          
          <div className="p-2 border-t border-white/10 text-[9px] text-white/20 text-center select-none bg-black/20">
            Top item = Front of pile
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};