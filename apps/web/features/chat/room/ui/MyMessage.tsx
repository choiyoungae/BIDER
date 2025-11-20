import React, { useState } from 'react';
import { MessageProps } from '../types';
import clsx from 'clsx';
import { formatKoreanTime } from '../lib/utils';
import ImageGrid from './ImageGrid';
import ImageViewer from '@/shared/lib/ImageViewer';

const MyMessage = ({
  text,
  showTime,
  isRead,
  isLast,
  className,
  time,
  isImage,
  images = [],
}: MessageProps) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleImageClick = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className={clsx('flex items-end justify-end gap-[8px]', className)}>
      <div className="flex translate-y-[5px] flex-col justify-end text-right">
        {isLast && isRead ? (
          <div className="text-[12px] leading-none text-neutral-400">읽음</div>
        ) : (
          <></>
        )}
        {showTime && <div className="text-[12px] text-neutral-400">{formatKoreanTime(time)}</div>}
      </div>
      <div className="bg-main text-neutral-0 max-w-[70%] break-words rounded-[10px] px-[10px] py-[6px]">
        {isImage && images.length > 0 ? (
          <>
            <ImageGrid images={images} onClick={handleImageClick} />
            {viewerOpen && (
              <ImageViewer
                images={images.map((img) => img.image_url)}
                initialIndex={viewerIndex}
                onClose={() => setViewerOpen(false)}
              />
            )}
          </>
        ) : (
          <p className="break-words">{text}</p>
        )}
      </div>
    </div>
  );
};

export default MyMessage;
