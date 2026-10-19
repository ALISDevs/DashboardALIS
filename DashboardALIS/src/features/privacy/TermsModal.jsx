import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { Brand } from '../../shared/ui/Brand.jsx';

export function TermsModal({ terms, onAccept }) {
  const dialogRef = useRef(null);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const elements = [...dialogRef.current.querySelectorAll('[tabindex="0"], input:not(:disabled), button:not(:disabled)')];
    const first = elements[0];
    const last = elements.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  async function submit(event) {
    event.preventDefault();
    if (!checked) return;
    setPending(true);
    setError('');
    try { await onAccept(terms.version); }
    catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }

  return <div className="terms-backdrop"><motion.section ref={dialogRef} initial={reducedMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} tabIndex={-1} onKeyDown={trapFocus} className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-title">
    <Brand caption="Client portal" />
    <p className="eyebrow">UN ESPACIO DE CONFIANZA</p><h1 id="terms-title">Términos y Privacidad</h1><p className="terms-version"><ShieldCheck size={13} aria-hidden="true" />Versión {terms.version}</p>
    <p>Lee las condiciones de acceso antes de consultar los avances del proyecto.</p>
    <pre className="terms-content" tabIndex={0}>{terms.content}</pre>
    <form onSubmit={submit}><label className="terms-checkbox"><input type="checkbox" checked={checked} disabled={pending} onChange={(event) => setChecked(event.target.checked)} />He leído y acepto las condiciones de acceso y privacidad.</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={!checked || pending}>{pending ? 'Registrando aceptación...' : 'Aceptar y continuar'}<ArrowRight size={16} aria-hidden="true" /></button>
    </form>
    <p className="terms-version">Si no deseas aceptar, puedes cerrar esta pestaña. El proyecto permanecerá oculto.</p>
  </motion.section></div>;
}
