'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';

interface ScrollAnimatedCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Component untuk kartu dengan scroll animation
 * Akan trigger animasi "revealUp" saat kartu masuk viewport
 */
export function ScrollAnimatedCard({ 
  children, 
  delay = 0, 
  className = '' 
}: ScrollAnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? 'animate-on-scroll in-view' : 'animate-on-scroll'}`}
    >
      {children}
    </div>
  );
}

interface ScrollAnimatedSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Component wrapper untuk section dengan stagger animation
 */
export function ScrollAnimatedSection({ 
  children, 
  className = '' 
}: ScrollAnimatedSectionProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * Wrapper untuk items yang akan di-stagger
 */
export function ScrollAnimatedItem({ 
  children, 
  index = 0,
  className = '',
}: { 
  children: ReactNode; 
  index?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, index * 100);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? 'animate-on-scroll in-view' : 'animate-on-scroll'}`}
    >
      {children}
    </div>
  );
}
