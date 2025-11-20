import React from 'react';
import { MessageImage } from '@/entities/messageImage/model/types';

interface ImageGridProps {
  images: MessageImage[];
  onClick: (index: number) => void;
}

export default function ImageGrid({ images, onClick }: ImageGridProps) {
  const rows: number[][] = [];

  // 이미지 개수별 줄 구성
  const n = images.length;
  if (n === 1) rows.push([0]);
  else if (n === 2) rows.push([0, 1]);
  else if (n === 3) rows.push([0, 1, 2]);
  else if (n === 4) rows.push([0, 1], [2, 3]);
  else if (n === 5) rows.push([0, 1, 2], [3, 4]);
  else if (n === 6) rows.push([0, 1, 2], [3, 4, 5]);
  else if (n === 7) rows.push([0, 1, 2], [3, 4], [5, 6]);
  else if (n === 8) rows.push([0, 1, 2], [3, 4, 5], [6, 7]);
  else if (n === 9) rows.push([0, 1, 2], [3, 4, 5], [6, 7, 8]);

  let imgIndex = 0;

  return (
    <div className="flex w-full flex-col gap-[4px]">
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`grid gap-[4px]`}
          style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)` }}
        >
          {row.map(() => {
            const currentIndex = imgIndex;
            const img = images[imgIndex++];
            return (
              <div
                key={img?.image_id}
                className="relative cursor-pointer bg-neutral-200"
                onClick={() => onClick(currentIndex)}
              >
                <img
                  src={img?.image_url}
                  alt={`chat-img-${currentIndex}`}
                  className="h-full w-full object-cover"
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
