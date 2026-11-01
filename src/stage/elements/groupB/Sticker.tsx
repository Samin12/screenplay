import React from 'react';
import type { ElementProps } from '../../ElementView';
import { useTheme } from '../../../theme/ThemeContext';
import { Fit, StickerSlab, stickerFont, stickerScale } from './kit';

// Standalone sticker (reference "a v2"): rotated accent slab, black-weight white type, pops in
// (scale 0.3 -> ~1.05 -> 1 in 250 ms, opacity over the first 100 ms). `rotate` in degrees (default -3).
export const Sticker: React.FC<ElementProps<'sticker'>> = ({ el, box, frame, fps }) => {
  const t = useTheme();
  const rotate = el.rotate ?? -3;
  const st = stickerScale(frame, fps, el.frame);
  // room for the rotation and the overshoot so Fit never clips the corners
  const pad = 40;
  return (
    <Fit box={box} measureKey={JSON.stringify([el.text, rotate])}>
      <div style={{ padding: pad }}>
        <StickerSlab text={el.text} fontSize={stickerFont(el.text, 190)} rotate={rotate} t={t} scale={st.scale} opacity={st.opacity} />
      </div>
    </Fit>
  );
};
