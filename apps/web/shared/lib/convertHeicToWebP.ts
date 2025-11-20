// HEIC 파일을 WebP로 변환하는 함수
export const convertHeicToWebP = async (file: File): Promise<File> => {
  try {
    // 브라우저 환경 체크
    if (typeof window === 'undefined') {
      throw new Error('브라우저 환경에서만 사용 가능합니다.');
    }

    // Dynamic import로 브라우저에서만 로드
    const heic2any = (await import('heic2any')).default;

    const convertedBlob = (await heic2any({
      blob: file,
      toType: 'image/webp',
      quality: 0.8,
    })) as Blob;

    // 변환된 Blob을 File 객체로 변환
    const convertedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.webp'), {
      type: 'image/webp', // MIME 타입도 WebP로 변경
    });

    return convertedFile;
  } catch (error) {
    console.error('HEIC → WebP 변환 실패:', error);
    throw error;
  }
};
