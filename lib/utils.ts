import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(value);
export const date = (value: string) => new Intl.DateTimeFormat('pt-BR',{dateStyle:'medium'}).format(new Date(value));
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Não foi possível concluir. Tente novamente.';
