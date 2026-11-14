'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, Mouse, Pause, Play, Recycle, RotateCcw } from 'lucide-react';
import type { AssemblyController, AssemblyUpdate } from '@/lib/auth/assembly-scene';

const chapters = [
  ['Gabinete', 'Tudo começa com uma estrutura.'],
  ['Placa-mãe', 'Uma base para conectar possibilidades.'],
  ['Processador', 'O próximo ciclo ganha inteligência.'],
  ['Memória RAM', 'Mais espaço para novas ideias.'],
  ['Armazenamento', 'Histórias que merecem continuar.'],
  ['Refrigeração', 'Equilíbrio para ir mais longe.'],
  ['Placa de vídeo', 'Novas ideias ganham forma.'],
  ['Fonte de energia', 'Energia para um novo começo.'],
  ['Pronto para recomeçar', 'Peça por peça, a tecnologia renasce.'],
];
const chapterTimes = [0, 600, 2900, 5000, 7000, 8600, 10600, 12900, 15000];

export function AuthAssembly({ onComplete }: { onComplete: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<AssemblyController | null>(null);
  const range = useRef<HTMLInputElement>(null);
  const progressLabel = useRef<HTMLSpanElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [chapter, setChapter] = useState(0);
  const [playback, setPlayback] = useState({ mobile: false, paused: false, reduced: false });

  useEffect(() => {
    let cancelled = false;
    let instance: AssemblyController | null = null;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    const modal = dialog.current!;
    // The native modal keeps background controls out of keyboard and screen-reader navigation.
    modal.showModal();
    function clearCompletion() {
      clearTimeout(completionTimer);
      completionTimer = undefined;
    }
    function update(state: AssemblyUpdate) {
      if (cancelled) return;
      const percent = Math.round(state.progress * 100);
      if (range.current) {
        range.current.value = String(percent);
        range.current.style.setProperty('--assembly-progress', `${percent}%`);
      }
      if (progressLabel.current) progressLabel.current.textContent = `${percent}%`;
      const nextChapter = chapterTimes.findLastIndex(start => state.progress * 18000 >= start);
      setChapter(previous => previous === nextChapter ? previous : nextChapter);
      setPlayback(previous => previous.mobile === state.mobile && previous.paused === state.paused && previous.reduced === state.reduced
        ? previous : { mobile: state.mobile, paused: state.paused, reduced: state.reduced });
      if (state.progress === 1 && !state.reduced) {
        // Briefly show the finished PC before handing the screen over to the login.
        completionTimer ??= setTimeout(onComplete, 1100);
      } else clearCompletion();
    }
    // The skip button is usable immediately, including while WebGL is loading.
    void import('@/lib/auth/assembly-scene').then(({ createAssemblyScene }) => {
      if (cancelled || !host.current) return;
      instance = createAssemblyScene(host.current, update, () => {
        if (!cancelled) {
          clearCompletion();
          setStatus('fallback');
          instance?.dispose();
          controller.current = null;
        }
      });
      controller.current = instance;
      setStatus('ready');
    }).catch(() => { if (!cancelled) setStatus('fallback'); });
    return () => {
      cancelled = true;
      clearCompletion();
      instance?.dispose();
      controller.current = null;
      modal.close();
    };
  }, [onComplete]);

  return (
    <dialog ref={dialog} className="auth-intro" aria-labelledby="assembly-title"
      onCancel={event => { event.preventDefault(); onComplete(); }}>
      <div className="assembly-track">
        <section className="assembly-story" data-status={status}>
          <header className="assembly-header">
            <span className="brand" aria-label="EcoCiclo"><span className="brand-mark"><Recycle size={26} strokeWidth={2} /></span><span>eco<span className="brand-light">ciclo</span><span className="brand-dot">.</span></span></span>
            <button className="assembly-skip" type="button" onClick={onComplete}>
              Pular animação <ArrowRight size={17} aria-hidden="true" />
            </button>
          </header>
          <div className="assembly-heading">
            <span className="assembly-tag"><span aria-hidden="true" />Um novo ciclo começa aqui</span>
            <h2 id="assembly-title">Toda peça tem um próximo capítulo.</h2>
            <p>Veja um computador ganhar vida, peça por peça.</p>
          </div>
          <div className="assembly-art">
            <div className="assembly-shadow" aria-hidden="true" />
            {status !== 'ready' && <img className="assembly-poster" src="/visuals/pc-assembly.svg" width="640" height="500" alt="Computador com gabinete aberto e seus componentes internos" />}
            <div className="assembly-canvas" ref={host} aria-hidden="true" />
          </div>
          <div className="assembly-bottom">
            <div className="assembly-chapter">
              <span className="assembly-chapter-number" aria-hidden="true">{chapter === 8 ? <Check size={19} /> : String(chapter + 1).padStart(2, '0')}</span>
              <div><strong>{status === 'fallback' ? 'Um novo começo para a tecnologia' : chapters[chapter][0]}</strong><p>{status === 'fallback' ? 'Seu próximo ciclo começa no EcoCiclo.' : chapters[chapter][1]}</p></div>
              <span ref={progressLabel} className="assembly-percent" aria-hidden="true">0%</span>
            </div>
            {status === 'ready' && (
              <div className="assembly-controls">
                <label className="sr-only" htmlFor="assembly-progress">Progresso da montagem</label>
                <input id="assembly-progress" className="assembly-progress" ref={range} type="range" min="0" max="100" step="1" defaultValue={playback.reduced ? 100 : 0}
                  aria-valuetext={chapters[chapter][0]} onChange={event => controller.current?.seek(Number(event.target.value) / 100)} />
                <div className="assembly-actions">
                  <span className="assembly-instruction">{playback.reduced ? <><Check size={16} />Visualização com movimento reduzido</> : playback.mobile ? <><Play size={14} />{playback.paused ? 'Monte no seu ritmo' : 'Montagem automática'}</> : <><Mouse size={17} />Role para montar. Volte para desmontar.<ArrowDown size={14} /></>}</span>
                  <div>
                    {playback.mobile && !playback.reduced && <button type="button" aria-label={playback.paused ? 'Reproduzir montagem' : 'Pausar montagem'} onClick={() => controller.current?.toggle()}>{playback.paused ? <Play size={17} /> : <Pause size={17} />}</button>}
                    {!playback.reduced && <button type="button" aria-label="Reiniciar montagem" onClick={() => controller.current?.replay()}><RotateCcw size={17} /></button>}
                  </div>
                </div>
              </div>
            )}
            {status === 'loading' && <p className="assembly-fallback-note" role="status">Preparando a montagem… Você pode pular a qualquer momento.</p>}
            {status === 'fallback' && <p className="assembly-fallback-note">Visualização simplificada neste dispositivo. <button type="button" onClick={onComplete}>Ir para o login <ArrowRight size={14} aria-hidden="true" /></button></p>}
          </div>
        </section>
      </div>
    </dialog>
  );
}
