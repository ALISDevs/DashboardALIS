import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function GlassCard({ children, className = '', hover = true, delay = 0, ...props }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={`glass-card p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md ${className}`}
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover && !reducedMotion ? { y: -5 } : undefined}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

