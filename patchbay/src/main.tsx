import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/patchbay.css';
import './styles/overrides.css';
import './styles/popcard.css';
import { Patchbay } from './Patchbay';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Patchbay />
  </StrictMode>
);
