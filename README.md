# Scattered Photos

![Scattered Photos Animation Banner](./export-animation-example.gif)

Create authentic scattered-photo collages in the browser. Drag, stack, reorder, and style your layout like photos spread across a desk.

## Features

- **Drag & Drop Canvas** - Freely move photos anywhere on the board
- **Layer Management** - Reorder, bring to front/back, and organize stack depth
- **Custom Backgrounds** - Use default style, solid colors, or image backgrounds
- **Animation Preview** - Play collage animations with multiple effects:
  - Sequential
  - Shuffle
  - Flip
  - Fade
- **Animation Export (GIF/MP4)** - Export animated output as:
  - GIF (`gif.js`)
  - MP4 (`mp4-muxer` + WebCodecs)
  - FPS options: `15 / 24 / 30`
- **PNG Export** - Save a high-quality still image of the current layout
- **Persistent Storage** - Photos/settings are saved locally with IndexedDB + localStorage
- **Responsive UI** - Works across desktop and mobile viewports

## Live Demo

[https://scattered-photos.roysunghan.workers.dev/](https://scattered-photos.roysunghan.workers.dev/)

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite 6** - Dev server and production build
- **Tailwind CSS 4** - Styling system
- **Framer Motion** - UI and transition animations
- **html-to-image** - PNG/frame capture
- **gif.js** - GIF encoding
- **mp4-muxer + WebCodecs API** - MP4 export pipeline
- **lucide-react** - Icon set
- **IndexedDB + localStorage** - Client-side persistence

## Installation

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Setup

```bash
git clone https://github.com/RoySung/scattered-photos.git
cd scattered-photos
pnpm install
pnpm dev
```

Open the local URL shown in terminal (typically [http://localhost:3001](http://localhost:3001)).

## Build & Preview

```bash
pnpm build
pnpm preview
```

Production output is generated in `dist/`.

## Usage

1. **Add Photos** - Upload one or more images
2. **Arrange** - Drag and rotate to compose your collage
3. **Style** - Adjust background and global photo scale
4. **Manage Layers** - Fine-tune stacking order from the sidebar
5. **Animate** - Open animation panel, choose effect/speed/FPS, preview playback
6. **Export** - Save PNG, or export animation as GIF/MP4

## Project Structure

```text
scattered-photos/
├── components/
│   ├── AnimationDialog.tsx
│   ├── Controls.tsx
│   ├── EmptyState.tsx
│   ├── LayerSidebar.tsx
│   └── PhotoCard.tsx
├── utils/
│   ├── animationEffects.ts
│   ├── storage.ts
│   └── videoExport.ts
├── App.tsx
├── index.tsx
├── types.ts
└── vite.config.ts
```

## Contributing

Issues and pull requests are welcome.

## Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Motion system powered by [Framer Motion](https://www.framer.com/motion/)
