'use client';

import { useEffect, useRef, useState } from 'react';

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  delay?: number;
}

/**
 * Hook untuk trigger animasi saat elemen masuk viewport
 * Usage:
 * const { ref, isInView } = useScrollAnimation();
 * <div ref={ref} className={isInView ? 'animate-on-scroll in-view' : 'animate-on-scroll'} />
 */
export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    delay = 0,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          // Trigger animation dengan delay
          setTimeout(() => {
            setIsInView(true);
            setHasTriggered(true);
          }, delay);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, delay, hasTriggered]);

  return { ref, isInView, hasTriggered };
}

/**
 * Hook untuk trigger animasi stagger pada array elemen
 * Usage:
 * const refs = useStaggerAnimation(items.length);
 * items.map((item, idx) => (
 *   <div key={idx} ref={refs[idx]} className={`animate-on-scroll ${isInView ? 'in-view' : ''}`} />
 * ))
 */
export function useStaggerAnimation(count: number, options: UseScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px',
  } = options;

  const refs = useRef<Array<HTMLDivElement | null>>(Array(count).fill(null));
  const [inViewIndices, setInViewIndices] = useState<Set<number>>(new Set());
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const observers = refs.current.map((ref, index) => {
      if (!ref) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !inViewIndices.has(index) && !hasTriggered) {
            setInViewIndices((prev) => new Set(prev).add(index));
            setHasTriggered(true);
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      observer.observe(ref);
      return observer;
    });

    return () => {
      observers.forEach((observer) => {
        if (observer) {
          observer.disconnect();
        }
      });
    };
  }, [threshold, rootMargin, hasTriggered, inViewIndices]);

  return {
    refs: refs.current,
    inViewIndices,
    isInView: (index: number) => inViewIndices.has(index),
    getDelayClass: (index: number) => {
      if (!inViewIndices.has(index)) return '';
      if (index === 0) return 'in-view';
      if (index === 1) return 'in-view-delay-1';
      if (index === 2) return 'in-view-delay-2';
      return 'in-view-delay-3';
    },
  };
}
