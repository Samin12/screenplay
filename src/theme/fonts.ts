import { loadFont as loadOutfit } from '@remotion/google-fonts/Outfit';
import { loadFont as loadNewsreader } from '@remotion/google-fonts/Newsreader';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';

// Loaded once at module scope. Remotion waits for these before rendering any frame.
loadOutfit('normal', { weights: ['400', '500', '600', '700', '800', '900'], subsets: ['latin'] });
loadNewsreader('normal', { weights: ['500', '600', '700'], subsets: ['latin'] });
loadInter('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin'] });
loadMono('normal', { weights: ['400', '500', '700'], subsets: ['latin'] });
