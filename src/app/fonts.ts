import { Bricolage_Grotesque, Instrument_Serif, Inter } from 'next/font/google';

export const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700', '800'] });
export const serif = Instrument_Serif({ subsets: ['latin'], variable: '--font-serif', weight: '400', style: ['italic'] });
export const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const fontVars = `${display.variable} ${serif.variable} ${sans.variable}`;
