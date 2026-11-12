"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Hand,
  Layers3,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";
import { hardwareCatalog, type HardwareId } from "@/lib/hardware/catalog";
import type { mountHardwareScene } from "@/lib/hardware/scene";

type Controller = ReturnType<typeof mountHardwareScene>;
export default function HardwareViewer({
  model = "motherboard",
  compact = false,
  startExploded = false,
}: {
  model?: HardwareId;
  compact?: boolean;
  startExploded?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null),
    host = useRef<HTMLDivElement>(null),
    controller = useRef<Controller | null>(null),
    hint = useId();
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
      "loading",
    ),
    [exploded, setExploded] = useState(startExploded),
    [rotating, setRotating] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [attempt, setAttempt] = useState(0),
    [canFullscreen, setCanFullscreen] = useState(false);
  const item = hardwareCatalog.find((x) => x.id === model)!;
  useEffect(() => {
    let cancelled = false;
    const element = host.current;
    if (!element) return;
    setStatus("loading");
    setRotating(false);
    setExploded(startExploded);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void import("@/lib/hardware/scene")
          .then(({ mountHardwareScene }) => {
            if (cancelled) return;
            controller.current = mountHardwareScene(
              element,
              model,
              startExploded,
              () => {
                controller.current?.dispose();
                controller.current = null;
                setStatus("unavailable");
                setRotating(false);
              },
            );
            setStatus("ready");
          })
          .catch(() => {
            if (!cancelled) {
              element.replaceChildren();
              setStatus("unavailable");
            }
          });
      },
      { rootMargin: "160px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      controller.current?.dispose();
      controller.current = null;
    };
  }, [model, startExploded, attempt]);
  useEffect(() => {
    setCanFullscreen(document.fullscreenEnabled);
    const changed = () =>
        setFullscreen(document.fullscreenElement === root.current),
      media = matchMedia("(prefers-reduced-motion: reduce)"),
      motion = () => {
        if (media.matches) setRotating(false);
      };
    document.addEventListener("fullscreenchange", changed);
    media.addEventListener("change", motion);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      media.removeEventListener("change", motion);
    };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.current?.requestFullscreen();
    } catch {
      setCanFullscreen(false);
    }
  }
  return (
    <div
      ref={root}
      className={`hardware-viewer ${compact ? "hardware-viewer-compact" : ""}`}
    >
      <div className="viewer-heading">
        <span>
          <Box size={15} />
          {compact ? "Design que merece continuar" : "Estúdio de componentes"}
        </span>
        <span className="viewer-live">
          <span />
          {status === "unavailable" ? "Prévia ilustrativa" : "3D interativo"}
        </span>
      </div>
      <div className="viewer-surface">
        <span className="viewer-watermark" aria-hidden="true">
          {compact ? "um novo ciclo." : item.name}
        </span>
        <div
          ref={host}
          className="hardware-canvas"
          role="img"
          aria-label={`Modelo 3D interativo de ${item.name}`}
          aria-describedby={hint}
          tabIndex={status === "ready" ? 0 : -1}
          onKeyDown={(event) => {
            if (!controller.current) return;
            const keys: Record<string, () => void> = {
              ArrowLeft: () => controller.current?.turn(0.2),
              ArrowRight: () => controller.current?.turn(-0.2),
              ArrowUp: () => controller.current?.turn(0, -0.15),
              ArrowDown: () => controller.current?.turn(0, 0.15),
              "+": () => controller.current?.zoom(1),
              "=": () => controller.current?.zoom(1),
              "-": () => controller.current?.zoom(-1),
              Home: () => controller.current?.reset(),
            };
            if (keys[event.key]) {
              event.preventDefault();
              keys[event.key]();
            }
          }}
        />
        {status !== "ready" && (
          <div className="viewer-placeholder" role="status">
            {status === "loading" ? (
              <>
                <LoaderCircle className="viewer-loader" size={24} />
                <span>Preparando {item.name.toLowerCase()} em 3D…</span>
              </>
            ) : (
              <>
                <img
                  src={`/visuals/${item.image}.svg`}
                  width="500"
                  height="350"
                  alt={`Ilustração de ${item.name}`}
                />
                <p>
                  Ative a aceleração gráfica do navegador para explorar em 3D.
                </p>
                <button type="button" onClick={() => setAttempt((v) => v + 1)}>
                  Tentar novamente
                </button>
              </>
            )}
          </div>
        )}
        <div className="viewer-product-caption">
          <strong>{item.name}</strong>
          <span>{item.format}</span>
        </div>
        <div className="viewer-zoom" aria-label="Zoom e enquadramento">
          <button
            type="button"
            disabled={status !== "ready"}
            aria-label="Aproximar componente"
            title="Aproximar"
            onClick={() => controller.current?.zoom(1)}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            aria-label="Afastar componente"
            title="Afastar"
            onClick={() => controller.current?.zoom(-1)}
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            aria-label="Restaurar enquadramento"
            title="Restaurar enquadramento"
            onClick={() => {
              controller.current?.setRotating(false);
              setRotating(false);
              controller.current?.reset();
            }}
          >
            <RotateCcw size={16} />
          </button>
          {!compact && canFullscreen && (
            <button
              type="button"
              aria-label={
                fullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"
              }
              title="Tela cheia"
              onClick={toggleFullscreen}
            >
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
          )}
        </div>
      </div>
      <div className="viewer-controls">
        <div className="viewer-assembly" aria-label="Montagem do componente">
          <button
            type="button"
            disabled={status !== "ready"}
            aria-pressed={!exploded}
            onClick={() => {
              controller.current?.setExploded(false);
              setExploded(false);
            }}
          >
            <Box size={15} />
            Montado
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            aria-pressed={exploded}
            onClick={() => {
              controller.current?.setExploded(true);
              setExploded(true);
            }}
          >
            <Layers3 size={15} />
            Vista explodida
          </button>
        </div>
        <button
          type="button"
          className="viewer-rotate"
          disabled={status !== "ready"}
          aria-pressed={rotating}
          aria-label={rotating ? "Pausar rotação" : "Girar automaticamente"}
          onClick={() => {
            controller.current?.setRotating(!rotating);
            setRotating(!rotating);
          }}
        >
          {rotating ? <Pause size={16} /> : <Play size={16} />}
          <span>{rotating ? "Pausar" : "Girar"}</span>
        </button>
      </div>
      <div className="viewer-help" id={hint}>
        <Hand size={14} />
        <span>
          Arraste para girar. Use dois dedos ou os botões para ampliar.
        </span>
        <span className="sr-only">
          Teclado: setas para girar, mais e menos para zoom, Home para
          restaurar.
        </span>
      </div>
      {!compact && (
        <div className="viewer-accessible-rotation">
          <button
            type="button"
            disabled={status !== "ready"}
            onClick={() => controller.current?.turn(0.3)}
            aria-label="Girar componente para a esquerda"
          >
            <ChevronLeft size={16} />
            Girar à esquerda
          </button>
          <button
            type="button"
            disabled={status !== "ready"}
            onClick={() => controller.current?.turn(-0.3)}
            aria-label="Girar componente para a direita"
          >
            Girar à direita
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
