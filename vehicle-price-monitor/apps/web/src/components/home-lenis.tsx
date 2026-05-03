'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

export function HomeLenis() {
  useEffect(() => {
    const lenis = new Lenis();

    const onScroll = (e: unknown) => {
      console.log(e);
    };

    lenis.on('scroll', onScroll);

    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };

    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.off('scroll', onScroll);
      lenis.destroy();
    };
  }, []);

  return null;
}
