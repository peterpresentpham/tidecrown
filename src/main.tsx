import './style.css';

import { createRoot } from 'react-dom/client';

import { loadModels } from './render/modelLibrary';
import { App } from './ui/App';
import { Gallery } from './ui/gallery/Gallery';

// Start fetching the 3D models while the setup screen is shown.
void loadModels();

// /gallery shows the visual library; every other path is the game (Vite serves index.html).
const page = location.pathname.replace(/\/+$/, '') === '/gallery' ? <Gallery /> : <App />;
createRoot(document.getElementById('root')!).render(page);
