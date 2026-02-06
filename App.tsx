import React, { useState, useRef, useEffect, useMemo } from "react";
import { toPng } from "html-to-image";
import { Photo, BackgroundSettings } from "./types";
import { PhotoCard } from "./components/PhotoCard";
import { Controls } from "./components/Controls";
import { EmptyState } from "./components/EmptyState";
import { LayerSidebar } from "./components/LayerSidebar";
import { loadPhotos, savePhotos } from "./utils/storage";

const App: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [background, setBackground] = useState<BackgroundSettings>({
    type: "default",
    value: "",
  });
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load photos from IndexedDB and Settings from localStorage on mount
  useEffect(() => {
    const init = async () => {
      try {
        const loadedPhotos = await loadPhotos();
        setPhotos(loadedPhotos);

        const savedBg = localStorage.getItem("background_settings");
        if (savedBg) {
          setBackground(JSON.parse(savedBg));
        }
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoaded(true);
      }
    };
    init();
  }, []);

  // Save photos when they change, but only after initial load
  useEffect(() => {
    if (isLoaded) {
      savePhotos(photos);
    }
  }, [photos, isLoaded]);

  const handleBackgroundChange = (settings: BackgroundSettings) => {
    setBackground(settings);
    // Persist to localStorage for simplicity
    try {
      localStorage.setItem("background_settings", JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save background settings (likely too large)", e);
    }
  };

  // Derived state: photos sorted by zIndex (Highest first) for the Sidebar
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => b.zIndex - a.zIndex);
  }, [photos]);

  const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const containerWidth =
      containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight =
      containerRef.current?.clientHeight || window.innerHeight;
    const CARD_WIDTH = 220;
    const CARD_HEIGHT = 280;
    const PADDING = 40;

    const currentGlobalScale = photos.length > 0 ? photos[0].scale : 1;

    const processFile = (file: File): Promise<Omit<Photo, "zIndex">> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;

          const img = new Image();
          img.onload = () => {
            // Calculate available space for positioning
            const availableWidth = Math.max(
              containerWidth - CARD_WIDTH - PADDING * 2,
              100,
            );
            const availableHeight = Math.max(
              containerHeight - CARD_HEIGHT - PADDING * 2,
              100,
            );

            // Generate random position within available space
            const randomX = PADDING + Math.random() * availableWidth;
            const randomY = PADDING + Math.random() * availableHeight;
            const randomRotation = Math.random() * 40 - 20;

            resolve({
              id: generateId(),
              url: result,
              x: randomX,
              y: randomY,
              rotation: randomRotation,
              scale: currentGlobalScale,
              width: img.naturalWidth,
              height: img.naturalHeight,
              timestamp: Date.now(),
            });
          };
          img.onerror = () => {
            resolve({
              id: generateId(),
              url: result,
              x: PADDING + Math.random() * 100,
              y: PADDING + Math.random() * 100,
              rotation: Math.random() * 40 - 20,
              scale: currentGlobalScale,
              width: 800,
              height: 1000,
              timestamp: Date.now(),
            });
          };
          img.src = result;
        };
        reader.readAsDataURL(file);
      });
    };

    const newPhotoData = await Promise.all(Array.from(files).map(processFile));

    setPhotos((prev) => {
      const currentMaxZ =
        prev.length > 0 ? Math.max(...prev.map((p) => p.zIndex)) : 0;

      const newPhotos = newPhotoData.map((data, index) => ({
        ...data,
        zIndex: currentMaxZ + index + 1,
      }));

      return [...prev, ...newPhotos];
    });

    event.target.value = "";
  };

  const handleBringToFront = (id: string) => {
    setPhotos((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const index = sorted.findIndex((p) => p.id === id);
      if (index === -1) return prev;

      const [item] = sorted.splice(index, 1);
      sorted.push(item); // Add to end (highest z-index)

      return sorted.map((p, i) => ({ ...p, zIndex: i + 1 }));
    });
  };

  const handleSendToBack = (id: string) => {
    setPhotos((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const index = sorted.findIndex((p) => p.id === id);
      if (index === -1) return prev;

      const [item] = sorted.splice(index, 1);
      sorted.unshift(item); // Add to start (lowest z-index)

      return sorted.map((p, i) => ({ ...p, zIndex: i + 1 }));
    });
  };

  const handleMoveLayer = (id: string, direction: "up" | "down") => {
    setPhotos((prev) => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const index = sorted.findIndex((p) => p.id === id);
      if (index === -1) return prev;

      if (direction === "up" && index === sorted.length - 1) return prev;
      if (direction === "down" && index === 0) return prev;

      const targetIndex = direction === "up" ? index + 1 : index - 1;
      [sorted[index], sorted[targetIndex]] = [
        sorted[targetIndex],
        sorted[index],
      ];

      return sorted.map((p, i) => ({
        ...p,
        zIndex: i + 1,
      }));
    });
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePosition = (id: string, x: number, y: number) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, x, y } : p)));
  };

  const handleClearAll = () => {
    setPhotos([]);
  };

  const handleReshuffle = () => {
    const containerWidth =
      containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight =
      containerRef.current?.clientHeight || window.innerHeight;
    const CARD_WIDTH = 220;
    const CARD_HEIGHT = 280;
    const PADDING = 60;

    // Calculate available space with minimum to ensure variety
    const availableWidth = Math.max(
      containerWidth - CARD_WIDTH - PADDING * 2,
      100,
    );
    const availableHeight = Math.max(
      containerHeight - CARD_HEIGHT - PADDING * 2,
      100,
    );

    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        x: PADDING + Math.random() * availableWidth,
        y: PADDING + Math.random() * availableHeight,
        rotation: Math.random() * 40 - 20,
      })),
    );
  };

  const handleGlobalScale = (newScale: number) => {
    setPhotos((prev) => prev.map((p) => ({ ...p, scale: newScale })));
  };

  const handleLayerReorder = (reorderedPhotos: Photo[]) => {
    const maxZ = reorderedPhotos.length;
    const updatedPhotos = reorderedPhotos.map((photo, index) => ({
      ...photo,
      zIndex: maxZ - index,
    }));
    setPhotos(updatedPhotos);
  };

  const handleExportImage = async () => {
    if (!containerRef.current) return;
    try {
      // Small delay to ensure any hover states are cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        filter: (node) => {
          // Exclude any element with the 'no-export' class
          return !node.classList?.contains("no-export");
        },
      });

      const link = document.createElement("a");
      link.download = `scattered-memories-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
      alert(
        "Failed to generate image. If using a custom background URL, ensure it supports CORS.",
      );
    }
  };

  // Calculate style based on background settings
  const backgroundStyle: React.CSSProperties = useMemo(() => {
    const base = { touchAction: "none" };

    if (background.type === "color") {
      return { ...base, backgroundColor: background.value };
    }

    if (background.type === "image") {
      return {
        ...base,
        backgroundImage: `url(${background.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }

    // Default Wood Pattern
    return {
      ...base,
      backgroundColor: "#1a1a1a",
      backgroundImage: `url("https://www.transparenttextures.com/patterns/wood-pattern.png"), radial-gradient(circle at center, #2d2d2d 0%, #1a1a1a 100%)`,
      backgroundBlendMode: "overlay",
    };
  }, [background]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden transition-all duration-500 ease-in-out"
      style={backgroundStyle as any}
    >
      {/* Background Ambience Overlay (Only for default) */}
      {background.type === "default" && (
        <div className="absolute inset-0 pointer-events-none bg-black/20" />
      )}

      {photos.length === 0 && <EmptyState onUpload={handleFileUpload} />}

      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          isHighlighted={highlightedId === photo.id}
          containerRef={containerRef}
          onDragStart={() => handleBringToFront(photo.id)}
          onDragEnd={(x, y) => handleUpdatePosition(photo.id, x, y)}
          onRemove={() => handleRemovePhoto(photo.id)}
          onLayerUp={() => handleMoveLayer(photo.id, "up")}
          onLayerDown={() => handleMoveLayer(photo.id, "down")}
          onBringToFront={() => handleBringToFront(photo.id)}
          onSendToBack={() => handleSendToBack(photo.id)}
        />
      ))}

      <Controls
        onUpload={handleFileUpload}
        onClear={handleClearAll}
        onReshuffle={handleReshuffle}
        onScaleChange={handleGlobalScale}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onBackgroundChange={handleBackgroundChange}
        onExport={handleExportImage}
        currentScale={photos.length > 0 ? photos[0].scale : 1}
        hasPhotos={photos.length > 0}
      />

      <LayerSidebar
        isOpen={isSidebarOpen}
        photos={sortedPhotos}
        onReorder={handleLayerReorder}
        onRemove={handleRemovePhoto}
        onHighlight={setHighlightedId}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="absolute bottom-4 right-4 text-white/20 text-xs pointer-events-none select-none font-sans z-40 mix-blend-difference no-export">
        Scattered Memories • Drag to move • Click to focus
      </div>
    </div>
  );
};

export default App;
