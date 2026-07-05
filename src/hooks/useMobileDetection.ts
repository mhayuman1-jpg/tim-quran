'use client';

import { useEffect, useState } from 'react';

interface MobileInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  isCapacitor: boolean;
  isPWA: boolean;
  screenWidth: number;
  screenHeight: number;
  hasNotch: boolean;
  /**
   * Safe area INSETS (CSS env variables)
   */
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /**
   * Device pixel ratio (for high-DPI screens)
   */
  devicePixelRatio: number;
}

/**
 * Custom hook untuk mendeteksi platform mobile & Capacitor
 * Memberikan info untuk menyesuaikan UI saat dijalankan di APK atau PWA
 */
export function useMobileDetection(): MobileInfo {
  const [info, setInfo] = useState<MobileInfo>({
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    isStandalone: false,
    isCapacitor: false,
    isPWA: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    hasNotch: false,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isMobile = isAndroid || isIOS || /mobile/i.test(ua);

    // Deteksi Capacitor runtime
    const isCapacitor =
      typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor.isNativePlatform();

    // Deteksi PWA standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    const isPWA = isStandalone || isCapacitor;

    // Deteksi notch/tear drop dengan CSS env variables
    const hasNotch =
      CSS.supports('padding-top', 'env(safe-area-inset-top)') &&
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) > 0;

    // Baca safe area dari CSS env variables
    const safeArea = {
      top: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0,
      right: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sar')) || 0,
      bottom: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0,
      left: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sal')) || 0,
    };

    const updateSize = () => {
      setInfo((prev) => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      }));
    };

    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', () => {
      // Resize setelah rotasi selesai
      setTimeout(updateSize, 300);
    });

    setInfo({
      isMobile,
      isAndroid,
      isIOS,
      isStandalone,
      isCapacitor,
      isPWA,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      hasNotch,
      safeArea,
      devicePixelRatio: window.devicePixelRatio,
    });

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return info;
}

/**
 * Helper: Apakah app berjalan di CAPACITOR (APK)?
 */
export function isCapacitorApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor.isNativePlatform()
  );
}

/**
 * Helper: Apakah app berjalan di PWA (standalone mode)?
 */
export function isPWAApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}
