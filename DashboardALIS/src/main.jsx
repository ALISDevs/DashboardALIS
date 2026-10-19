import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './styles.css';
import { MotionConfig } from 'framer-motion';
import '@fontsource-variable/manrope';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user"><App /></MotionConfig>
  </StrictMode>
);
