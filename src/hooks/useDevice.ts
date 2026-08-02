import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isCompact: boolean; // 屏幕较窄，使用紧凑布局
  screenWidth: number;
  screenHeight: number;
}

export function useDevice(): DeviceInfo {
  const getDeviceInfo = (): DeviceInfo => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isPortrait: false, isLandscape: true, isCompact: false, screenWidth: 1920, screenHeight: 1080 };
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ua = navigator.userAgent || '';

    // UA 检测
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry/i.test(ua);

    // 触摸检测
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // CSS 媒体查询检测（更可靠）
    const isCoarsePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const isNoHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches;

    // 屏幕尺寸
    const minDim = Math.min(width, height);
    const isSmallScreen = minDim <= 900;

    // 移动端：UA + 触摸特性 + 屏幕尺寸，多维度判断
    const isMobile = isMobileUA || isCoarsePointer || isNoHover || (isTouch && isSmallScreen) || width <= 768 || minDim <= 600;

    // 紧凑布局：只要屏幕宽度较窄就触发，不依赖 UA（避免检测失败）
    const isCompact = width <= 1024 || minDim <= 600 || isMobile;

    const isPortrait = height > width;

    return {
      isMobile,
      isPortrait,
      isLandscape: width >= height,
      isCompact,
      screenWidth: width,
      screenHeight: height,
    };
  };

  const [device, setDevice] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const handleResize = () => setDevice(getDeviceInfo());
    const handleOrientation = () => {
      setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  return device;
}
