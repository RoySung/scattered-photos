# Scattered Memories Web App

A beautiful photo memories web application that lets you create, arrange, and export your cherished memories in a creative scattered layout. Built with React, Vite, and Framer Motion.

## ✨ Features

- **Drag & Drop Interface** — Freely arrange photos anywhere on the canvas
- **Layer Management** — Control the stacking order of your photos with an intuitive sidebar
- **Customizable Backgrounds** — Choose from solid colors, gradients, images, or patterns
- **AI-Powered Titles** — Generate creative titles using Gemini AI
- **Export to PNG** — Save your composition as a high-quality image
- **Persistent Storage** — Your photos and settings are saved locally using IndexedDB and localStorage
- **Responsive Design** — Works seamlessly on desktop and mobile devices

## 🚀 Live Demo

Visit the live app: [https://roysung.github.io/scattered-memories-web-app/](https://roysung.github.io/scattered-memories-web-app/)

## 🛠️ Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool and dev server
- **Framer Motion** — Smooth animations
- **html-to-image** — Canvas export functionality
- **IndexedDB** — Client-side photo storage

## 📦 Installation

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/RoySung/scattered-memories-web-app.git
   cd scattered-memories-web-app
   ```

2. Install dependencies:

   ```bash
   pnpm install
   # or
   npm install
   ```

3. Create a `.env` file with your Gemini API key (optional, for AI title generation):

   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:

   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Build & Deployment

### Build for Production

```bash
pnpm build
# or
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
pnpm preview
# or
npm run preview
```

## 📝 Usage

1. **Add Photos** — Click "Add photos" to upload images from your device
2. **Arrange** — Drag photos to your desired positions
3. **Customize** — Use the bottom toolbar to:
   - Change background colors, gradients, or images
   - Generate AI-powered titles
   - Clear all photos
4. **Manage Layers** — Click the layers icon (top-right) to:
   - Reorder photos by dragging
   - Highlight specific photos
   - Delete individual photos
5. **Export** — save your creation as PNG

## 🗂️ Project Structure

```
scattered-memories-web-app/
├── components/          # React components
│   ├── Controls.tsx     # Bottom toolbar controls
│   ├── EmptyState.tsx   # Empty state placeholder
│   ├── LayerSidebar.tsx # Layer management sidebar
│   └── PhotoCard.tsx    # Individual photo card
├── utils/
│   └── storage.ts       # IndexedDB utilities
├── App.tsx              # Main application component
├── types.ts             # TypeScript type definitions
├── vite.config.ts       # Vite configuration
└── .github/
    └── workflows/
        └── deploy.yml   # GitHub Actions deployment
```

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)
