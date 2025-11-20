import React, { useState } from 'react';
import { MessageProps } from '../types';
import clsx from 'clsx';
import { Avatar } from '@repo/ui/components/Avatar/Avatar';
import { formatKoreanTime } from '../lib/utils';
import ImageGrid from './ImageGrid';
import ImageViewer from '@/shared/lib/ImageViewer';

const YourMessage = ({
  text,
  showTime,
  showAvatar,
  className,
  time,
  avatar,
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
    <div className={clsx('flex items-end', className)}>
      {showAvatar ? (
        <Avatar className="mr-[10px] size-[29px]" src={avatar} />
      ) : (
        <div className="ml-[39px]"></div>
      )}
      <div className="max-w-[70%] rounded-[10px] bg-neutral-100 px-[10px] py-[6px] text-neutral-800">
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
      {showTime && (
        <div className="typo-caption-regular ml-[8px] text-neutral-400">
          {formatKoreanTime(time)}
        </div>
      )}
    </div>
  );
};

export default YourMessage;
