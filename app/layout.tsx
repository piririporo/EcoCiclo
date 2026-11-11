import type { Metadata, Viewport } from 'next';
import './globals.css';
import './mobile.css';
import { PlatformProvider } from '@/components/platform-provider';
import { AccessGate } from '@/components/access-gate';
export const metadata:Metadata={title:{default:'EcoCiclo — Uma nova vida para a tecnologia',template:'%s | EcoCiclo'},description:'Recupere componentes, encontre peças e faça parte de uma economia mais circular. O próximo ciclo da tecnologia começa com você.',icons:{icon:'/favicon.svg'}};
export const viewport:Viewport={themeColor:[{media:'(prefers-color-scheme: light)',color:'#fafbf9'},{media:'(prefers-color-scheme: dark)',color:'#0e1c22'}],width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR" suppressHydrationWarning data-scroll-behavior="smooth"><head><link rel="preload" href="/fonts/manrope-400.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/></head><body><PlatformProvider><AccessGate>{children}</AccessGate></PlatformProvider></body></html>;}
