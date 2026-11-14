'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function AuthAssembly({ onComplete }: { onComplete: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    const modal = dialog.current!;
    let cancelled = false;
    let disposeScene: (() => void) | undefined;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    modal.showModal();

    function onAssemblyFinish(complete: boolean) {
      clearTimeout(completionTimer);
      if (complete) completionTimer = setTimeout(onComplete, 1100);
    }

    function showPoster() {
      if (cancelled) return;
      clearTimeout(completionTimer);
      disposeScene?.();
      disposeScene = undefined;
      setStatus('fallback');
    }

    void import('@/lib/auth/assembly-scene').then(({ createAssemblyScene }) => {
      if (cancelled || !host.current) return;
      disposeScene = createAssemblyScene(host.current, onAssemblyFinish, showPoster);
      setStatus('ready');
    }).catch(showPoster);

    return () => {
      cancelled = true;
      clearTimeout(completionTimer);
      disposeScene?.();
      modal.close();
    };
  }, [onComplete]);

  return (
    <dialog ref={dialog} className="auth-intro" aria-label="Montagem de um computador"
      data-status={status} onCancel={event => { event.preventDefault(); onComplete(); }}>
      <div className="assembly-track">
        <div className="assembly-story">
          <button className="assembly-skip" type="button" onClick={onComplete}>
            Pular animação <ArrowRight size={17} aria-hidden="true" />
          </button>
          {status !== 'ready' && <img className="assembly-poster" src="/visuals/pc-assembly.svg" width="640" height="500"
            alt="Computador com gabinete aberto e seus componentes internos" />}
          <div className="assembly-canvas" ref={host} aria-hidden="true" />
        </div>
      </div>
    </dialog>
  );
}
