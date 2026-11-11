import { Workspace } from '@/components/workspace';
const sections=['componentes','analisar','painel','impacto','destinacao','conta','tecnico','administracao','privacidade','termos','compatibilidade'];
export function generateStaticParams(){return sections.map(section=>({section}));}
export const dynamicParams=false;
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;return <Workspace section={section}/>;}
