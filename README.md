# Scattered Photos

Create stunning photo collages with authentic scattered and stacking effects. Arrange your photos freely on the canvas, just like spreading pictures across a desk, each draggable, layered, and naturally positioned.

## Features

- **Drag & Drop Interface** - Freely arrange photos anywhere on the canvas
- **Layer Management** - Control the stacking order of your photos with an intuitive sidebar
- **Customizable Backgrounds** - Choose from solid colors, gradients, images, or patterns
- **Export to PNG** - Save your composition as a high-quality image
- **Persistent Storage** - Your photos and settings are saved locally using IndexedDB and localStorage
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## Live Demo

[https://roysung.github.io/scattered-photos/](https://roysung.github.io/scattered-photos/)

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Framer Motion** - Smooth animations
- **html-to-image** - Canvas export functionality
- **IndexedDB** - Client-side photo storage

## Installation

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/RoySung/scattered-photos.git
   cd scattered-photos
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build & Deployment

```bash
# Production build
pnpm build

# Preview production build
pnpm preview
```

The built files will be in the `dist` directory.

## Usage

1. **Add Photos** - Click "Add photos" to upload images from your device
2. **Arrange** - Drag photos to your desired positions
3. **Customize** - Use the bottom toolbar to change background colors, gradients, or images
4. **Manage Layers** - Click the layers icon to reorder, highlight, or delete individual photos
5. **Export** - Save your creation as a PNG

## Project Structure

```
scattered-photos/
├── components/          # React components
│   ├── Controls.tsx     # Bottom toolbar controls
│   ├── EmptyState.tsx   # Empty state placeholder
│   ├── LayerSidebar.tsx # Layer management sidebar
│   └── PhotoCard.tsx    # Individual photo card
├── utils/
│   └── storage.ts       # IndexedDB utilities
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
└── vite.config.ts       # Vite configuration
```

## Contributing

Contributions are welcome - feel free to report bugs, suggest features, or submit pull requests.

## Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)
