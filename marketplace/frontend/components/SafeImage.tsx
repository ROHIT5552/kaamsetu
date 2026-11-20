'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import {
  Wrench,
  Zap,
  Hammer,
  Paintbrush,
  Home,
  HardHat,
  Utensils,
  Truck,
  Sprout,
  Briefcase,
  Laptop,
  GraduationCap,
  HeartHandshake,
  ShoppingBag,
  Sparkles,
  User
} from 'lucide-react';

interface SafeImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string;
  fallbackText?: string;
  categoryIcon?: string;
  containerClassName?: string;
}

export default function SafeImage({
  src,
  alt,
  fallbackText,
  categoryIcon,
  className = '',
  containerClassName = '',
  fill,
  width,
  height,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset error when src changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  // Fallback icon resolver
  const renderFallbackIcon = () => {
    const iconProps = { className: 'w-8 h-8 text-[#5A5448] dark:text-[#A7B1C4]' };
    switch (categoryIcon?.toLowerCase()) {
      case 'wrench':
      case 'plumber':
        return <Wrench {...iconProps} />;
      case 'zap':
      case 'electrician':
        return <Zap {...iconProps} />;
      case 'hammer':
      case 'carpenter':
      case 'mason':
        return <Hammer {...iconProps} />;
      case 'paintbrush':
      case 'painter':
        return <Paintbrush {...iconProps} />;
      case 'home':
      case 'home-services':
        return <Home {...iconProps} />;
      case 'hardhat':
      case 'construction':
        return <HardHat {...iconProps} />;
      case 'utensils':
      case 'hospitality':
        return <Utensils {...iconProps} />;
      case 'truck':
      case 'transport':
        return <Truck {...iconProps} />;
      case 'sprout':
      case 'agriculture':
        return <Sprout {...iconProps} />;
      case 'briefcase':
      case 'office-admin':
        return <Briefcase {...iconProps} />;
      case 'laptop':
      case 'digital-it':
        return <Laptop {...iconProps} />;
      case 'graduationcap':
      case 'education':
        return <GraduationCap {...iconProps} />;
      case 'hearthandshake':
      case 'care-personal':
        return <HeartHandshake {...iconProps} />;
      case 'shoppingbag':
      case 'retail-sales':
        return <ShoppingBag {...iconProps} />;
      default:
        return <User {...iconProps} />;
    }
  };

  if (hasError || !src) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-[#F4EEE0] to-[#E8E2D6] dark:from-[#131C2E] dark:to-[#1F2A44] border border-[#E8E2D6] dark:border-[#24304A] text-center p-4 overflow-hidden select-none ${
          fill ? 'w-full h-full' : ''
        } ${containerClassName}`}
        style={!fill && width && height ? { width, height } : undefined}
      >
        <div className="p-3 bg-white/70 dark:bg-[#1B253B]/70 rounded-full shadow-sm mb-2 backdrop-blur-sm">
          {renderFallbackIcon()}
        </div>
        {fallbackText && (
          <span className="text-xs font-semibold text-[#1B1A17] dark:text-[#F3F5F9] line-clamp-1 max-w-[90%]">
            {fallbackText}
          </span>
        )}
        <span className="text-[10px] text-[#5A5448] dark:text-[#A7B1C4] mt-0.5 tracking-tight uppercase font-medium">
          Verified Swabhiman Pro
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${
        fill ? 'w-full h-full' : 'inline-block'
      } ${containerClassName}`}
      style={!fill && width && height ? { width, height } : undefined}
    >
      {isLoading && (
        <div
          className={`absolute inset-0 bg-gradient-to-r from-[#F4EEE0]/80 via-white/50 to-[#F4EEE0]/80 dark:from-[#131C2E] dark:via-[#1F2A44] dark:to-[#131C2E] animate-pulse z-10`}
        />
      )}
      <Image
        src={src}
        alt={alt || fallbackText || 'Swabhiman service visual'}
        className={`transition-opacity duration-300 ease-out ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${className}`}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        {...props}
      />
    </div>
  );
}
