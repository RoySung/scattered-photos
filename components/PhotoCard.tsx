import React, { useRef, useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { X, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from "lucide-react";
import { Photo } from "../types";

interface PhotoCardProps {
  photo: Photo;
  isHighlighted?: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragStart: () => void;
  onDragEnd: (x: number, y: number) => void;
  onRemove: () => void;
  onLayerUp: () => void;
  onLayerDown: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isHighlighted = false,
  containerRef,
  onDragStart,
  onDragEnd,
  onRemove,
  onLayerUp,
  onLayerDown,
  onBringToFront,
  onSendToBack,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(photo.x);
  const y = useMotionValue(photo.y);
  const isDragging = useRef(false);

  // Sync motion values with photo position changes with animation
  useEffect(() => {
    // Don't animate position changes while dragging
    if (isDragging.current) return;

    const xAnimation = animate(x, photo.x, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
    const yAnimation = animate(y, photo.y, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });

    return () => {
      xAnimation.stop();
      yAnimation.stop();
    };
  }, [photo.x, photo.y, x, y]);

  const handleDragStart = () => {
    isDragging.current = true;
    onDragStart();
  };

  const handleDragEnd = (event: any, info: any) => {
    isDragging.current = false;
    // Get the final position directly from motion values
    onDragEnd(x.get(), y.get());
  };

  // Determine aspect ratio from photo metadata, defaulting to standard portrait (4:5) if missing
  const width = photo.width || 4;
  const height = photo.height || 5;
  const aspectRatio = width / height;

  // If the photo is significantly landscape, we widen the card to maintain visual balance
  const isLandscape = aspectRatio > 1.2;
  const cardBaseWidth = isLandscape ? 300 : 220;

  return (
    <motion.div
      ref={cardRef}
      drag
      dragConstraints={containerRef}
      dragElastic={0.05}
      dragMomentum={false}
      style={{
        x,
        y,
        width: `${cardBaseWidth}px`,
        height: "auto",
        boxShadow: "2px 4px 15px rgba(0,0,0,0.4)",
        zIndex: photo.zIndex,
      }}
      initial={{
        opacity: 0,
        scale: 0.8,
        rotate: photo.rotation + (Math.random() * 10 - 5), // Slight drift on entry
      }}
      animate={{
        opacity: 1,
        scale: isHighlighted ? photo.scale * 1.1 : photo.scale, // Scale up if highlighted
        rotate: photo.rotation,
        zIndex: photo.zIndex, // Keep original z-index even when highlighted
        boxShadow: isHighlighted
          ? "0 0 0 4px #60a5fa, 0 30px 60px -10px rgba(0, 0, 0, 0.6)" // Blue glow ring
          : "2px 4px 15px rgba(0,0,0,0.4)",
      }}
      whileHover={{ cursor: "grab" }}
      whileDrag={{
        scale: photo.scale * 1.05,
        cursor: "grabbing",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="absolute flex flex-col items-center justify-start bg-white p-3 pb-8 shadow-xl group"
    >
      {/* Photo Area - Dynamic Aspect Ratio */}
      <div
        className="relative w-full bg-gray-100 overflow-hidden pointer-events-none filter sepia-[0.1] contrast-[1.05]"
        style={{
          backgroundImage: `url(${photo.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          aspectRatio: `${aspectRatio}`,
        }}
      >
        {/* Inner shadow for depth inside the frame */}
        <div className="absolute inset-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"></div>
      </div>

      {/* Layer Controls (Top Left) */}
      <div className="absolute -top-3 -left-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onBringToFront();
          }}
          className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-100 active:scale-95 transition-all"
          title="Bring to Front"
        >
          <ChevronsUp size={14} strokeWidth={3} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onLayerUp();
          }}
          className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-100 active:scale-95 transition-all"
          title="Move Forward"
        >
          <ArrowUp size={14} strokeWidth={3} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onLayerDown();
          }}
          className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-100 active:scale-95 transition-all"
          title="Move Backward"
        >
          <ArrowDown size={14} strokeWidth={3} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSendToBack();
          }}
          className="bg-white text-gray-700 rounded-full p-2 shadow-md hover:bg-gray-100 active:scale-95 transition-all"
          title="Send to Back"
        >
          <ChevronsDown size={14} strokeWidth={3} />
        </button>
      </div>

      {/* Remove Button (Top Right) */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-50 hover:bg-red-600 active:scale-95"
        title="Remove photo"
      >
        <X size={16} strokeWidth={3} />
      </button>

      {/* Paper texture overlay for realism */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] bg-repeat"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </motion.div>
  );
};
