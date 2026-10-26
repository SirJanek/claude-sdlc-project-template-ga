import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import './styles.css';
// Review engine (lekcja-07/silnik-przegladu): loads before React renders; start() runs after the first render.
import './review/comments.js';
import './review/prototype.js';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
flushSync(() => root.render(<App />));
(window as unknown as { __PROTOTYPE_START__?: () => boolean }).__PROTOTYPE_START__?.();
