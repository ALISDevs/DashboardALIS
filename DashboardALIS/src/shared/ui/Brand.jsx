import React from 'react';
import { Layers2 } from 'lucide-react';

export function Brand({ caption = 'Workspace' }) {
  return <div className="brand"><span className="brand-symbol"><Layers2 size={23} strokeWidth={1.8} aria-hidden="true" /></span><span className="brand-wordmark">ALIS<span className="brand-caption">{caption}</span></span></div>;
}

