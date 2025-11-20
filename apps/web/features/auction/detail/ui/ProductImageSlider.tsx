'use client';

import React, { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import type { Swiper as SwiperType } from 'swiper';
import { ProductImage } from '@/entities/productImage/model/types';
import Image from 'next/image';
import ImageViewer from '@/shared/lib/ImageViewer';

interface Props {
  images: ProductImage[];
}

export default function ProductImageSlider({ images }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const sortedImages = [...images].sort((a, b) => a.order_index - b.order_index);
  const imageUrls = sortedImages.map((img) => img.image_url);

  return (
    <div className="w-full">
      {/* Main Swiper */}
      <div className="flex h-[310px] items-center justify-center overflow-hidden">
        <Swiper
          modules={[Pagination]}
          spaceBetween={0}
          slidesPerView={1}
          pagination={{ clickable: true }}
          onSwiper={(swiper) => (swiperRef.current = swiper)}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="h-full p-0"
        >
          {sortedImages.map((img) => (
            <SwiperSlide key={img.image_id} className="flex items-center justify-center">
              <Image
                src={img.image_url}
                alt="product"
                width={1000} // dummy value, 실제 이미지 비율에 따라 렌더링됨
                height={1000}
                style={{
                  height: '100%',
                  width: 'auto',
                  objectFit: 'contain',
                }}
                sizes="100vw"
                className="mx-auto"
                priority
                onClick={() => setIsViewerOpen(true)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Thumbnail Gallery */}
      <div className="p-box mt-4 flex justify-between">
        {sortedImages.map((img, idx) => (
          <button
            key={img.image_id}
            onClick={() => {
              swiperRef.current?.slideTo(idx);
            }}
            className={`relative size-[60px] shrink-0 border ${
              activeIndex === idx ? 'border-neutral-900' : 'border-transparent'
            } overflow-hidden`}
          >
            <Image
              src={img.image_url}
              alt="thumbnail"
              fill
              style={{ objectFit: 'cover' }}
              sizes="60px"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
        {[...Array(5 - images.length)].map((_, idx) => (
          <div key={`empty-${idx}`} className="pointer-events-none h-16 w-16 shrink-0 opacity-0" />
        ))}
      </div>

      {isViewerOpen && (
        <ImageViewer
          images={imageUrls}
          initialIndex={activeIndex}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );
}
