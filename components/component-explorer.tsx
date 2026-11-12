"use client";
import { useState } from "react";
import {
  ArrowRight,
  CircuitBoard,
  Cpu,
  HardDrive,
  Info,
  Laptop,
  MemoryStick,
  ScanEye,
  Check,
} from "lucide-react";
import {
  hardwareCatalog,
  hardwareForCategory,
  type HardwareId,
} from "@/lib/hardware/catalog";
import HardwareViewer from "./hardware-viewer";
const icons = {
  motherboard: CircuitBoard,
  memory: MemoryStick,
  ssd: HardDrive,
  processor: Cpu,
  gpu: ScanEye,
  notebook: Laptop,
};
export default function ComponentExplorer({
  category,
  onCatalog,
}: {
  category: string;
  onCatalog: (category: string) => void;
}) {
  const [selected, setSelected] = useState<HardwareId>(
      () => hardwareForCategory(category).id,
    ),
    item = hardwareCatalog.find((x) => x.id === selected)!;
  return (
    <section
      className="component-explorer"
      aria-label="Explorador de componentes 3D"
    >
      <div className="explorer-intro">
        <div>
          <h2>Veja de perto. Entenda por dentro.</h2>
          <p>Escolha uma peça e explore cada ângulo.</p>
        </div>
        <span className="explorer-count">
          <CircuitBoard size={16} />6 modelos para explorar
        </span>
      </div>
      <div className="explorer-layout">
        <div className="explorer-sidebar">
          <span className="explorer-sidebar-title">Escolha o componente</span>
          <div
            className="explorer-picker"
            role="group"
            aria-label="Componentes disponíveis em 3D"
          >
            {hardwareCatalog.map((model) => {
              const Icon = icons[model.id];
              return (
                <button
                  type="button"
                  key={model.id}
                  aria-pressed={selected === model.id}
                  onClick={() => setSelected(model.id)}
                >
                  <span className="explorer-picker-icon">
                    <Icon size={21} />
                  </span>
                  <span>
                    <strong>{model.name}</strong>
                    <small>{model.format}</small>
                  </span>
                  {selected === model.id && <Check size={16} />}
                </button>
              );
            })}
          </div>
          <div className="explorer-sidebar-note">
            <Info size={16} />
            <p>Explore os modelos mesmo quando não houver peças anunciadas.</p>
          </div>
        </div>
        <HardwareViewer model={selected} />
      </div>
      <div className="explorer-details" aria-live="polite">
        <div className="explorer-description">
          <span>{item.name}</span>
          <h3>{item.subtitle}</h3>
          <p>{item.description}</p>
        </div>
        <div className="explorer-parts">
          <h4>O que observar no modelo</h4>
          <ul>
            {item.parts.map((part) => (
              <li key={part}>
                <span />
                {part}
              </li>
            ))}
          </ul>
        </div>
        <div className="explorer-compatibility">
          <h4>Antes de reutilizar</h4>
          <p>{item.check}</p>
          <button type="button" onClick={() => onCatalog(item.category)}>
            Ver peças no catálogo
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <p className="explorer-disclaimer">
        <Info size={14} />
        Modelos 3D de referência. Não são digitalizações dos anúncios.
        Aparência, medidas e conexões variam conforme o fabricante e o modelo.
      </p>
    </section>
  );
}
