import { Button } from '@repo/ui/components/Button/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/Dialog/Dialog';
import { Camera, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChatImage } from '../types';
import { convertHeicToWebP } from '@/shared/lib/convertHeicToWebP';
import { toast } from '@repo/ui/components/Toast/Sonner';

interface ImageUploadForChatProps {
  onImagesChange: (images: ChatImage[]) => void;
  open?: boolean;
  onClose?: () => void;
}

const ImageUploadForChat = ({ onImagesChange, open = false, onClose }: ImageUploadForChatProps) => {
  const [images, setImages] = useState<ChatImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 9;

  const notifyParent = useCallback(
    (updatedImages: ChatImage[]) => {
      onImagesChange(updatedImages);
    },
    [onImagesChange]
  );

  useEffect(() => {
    if (images.length > 0) {
      notifyParent(images);
    }
  }, [images, notifyParent]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    onClose?.();

    const availableSlots = MAX_IMAGES - images.length;
    let newFiles = Array.from(files);

    if (newFiles.length > availableSlots) {
      newFiles = newFiles.slice(0, availableSlots);
      toast({ content: `한 번에 전송할 수 있는 이미지는 최대 ${MAX_IMAGES}장입니다.` });
    }

    const processedImages: ChatImage[] = await Promise.all(
      newFiles.map(async (f, i) => {
        let file: File = f;
        let isConverted = false;

        try {
          if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            file = await convertHeicToWebP(file);
            isConverted = true;
          }
        } catch (error) {
          console.warn(`HEIC 변환 실패, 원본으로 대체: ${file.name}`);
        }

        return {
          id: `image-${Date.now()}-${i}`,
          file,
          preview: URL.createObjectURL(file),
          isConverted,
        };
      })
    );

    // 기존 이미지 유지
    setImages((prev) => [...prev, ...processedImages]);

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // revoke는 unmount 시점에만
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  const handleGallerySelect = () => {
    if (fileInputRef.current && !isConverting) {
      fileInputRef.current.click();
    }
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current && !isConverting) {
      cameraInputRef.current.click();
    }
  };

  useEffect(() => {
    onImagesChange(images);
  }, [images, onImagesChange]);

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
        <DialogHeader className="sr-only">
          <DialogTitle>작업 선택</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            <Button
              onClick={handleCameraCapture}
              variant="outline"
              className="items-center"
              disabled={isConverting}
            >
              <Camera size={20} className="flex-shrink-0" />
              <span>카메라로 촬영</span>
            </Button>
            <Button onClick={handleGallerySelect} disabled={isConverting}>
              <Plus size={20} />
              <span>갤러리에서 선택</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </>
  );
};

export default ImageUploadForChat;
