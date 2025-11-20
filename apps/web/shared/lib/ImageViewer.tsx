'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Zoom, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/zoom';
import 'swiper/css/navigation';
import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900">
      {/* 닫기 버튼 */}
      <button
        className="absolute right-4 top-4 z-[110] cursor-pointer text-white"
        onClick={onClose}
      >
        <X size={30} />
      </button>

      {/* Swiper 컨테이너 */}
      <div
        className="relative h-full w-full"
        style={
          {
            '--swiper-navigation-color': '#ffffff',
            '--swiper-navigation-size': '30px',
            '--swiper-navigation-sides-offset': '20px',
          } as React.CSSProperties
        }
      >
        <Swiper
          modules={[Zoom, Navigation]}
          zoom
          navigation
          initialSlide={initialIndex}
          className="h-full w-full"
        >
          {images.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="swiper-zoom-container flex h-full w-full items-center justify-center">
                <img
                  src={src}
                  alt={`img-${idx}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
