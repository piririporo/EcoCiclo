"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import HardwareViewer from "./hardware-viewer";
export default function DeviceScene() {
  return (
    <div className="device-studio">
      <HardwareViewer model="motherboard" compact startExploded />
      <Link className="studio-link" href="/componentes/?visualizacao=3d">
        <span>Conheça as peças de um novo começo</span>
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
