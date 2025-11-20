'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@repo/ui/components/Input/Input';
import { Textarea } from '@repo/ui/components/Textarea/Textarea';
import { Button } from '@repo/ui/components/Button/Button';
import { useRouter } from 'next/navigation';
import ImageUploadPreview from '@/shared/lib/ImageUploadPreview';
import { categories, CategoryValue } from '@/features/category/types';
import { useAuthStore } from '@/shared/model/authStore';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@repo/ui/components/Select/Select';
import GoogleMap from '@/features/location/ui/GooggleMap';
import { toast } from '@repo/ui/components/Toast/Sonner';
import { Switch } from '@repo/ui/components/Switch/Switch';
import { Location } from '@/features/location/types';
import { Info } from 'lucide-react';
import { useSecretDialog } from '@/features/auction/secret/model/useSecretDialog';
import { useProductFormWithoutSubmitting } from '@/features/product/model/useProductForm';
import { useCreateProductWithValidation } from '@/features/product/model/useCreateProduct';
import {
  formatPriceInput,
  isEndDateValid,
  canEditProduct,
  isEndDateAfterInitialDate,
  validateProductEditForm,
  isMinPriceValid,
  parseFormattedPrice,
} from '@/features/product/lib/utils';
import { useProductUpdateMutation } from '@/features/product/model/useProductUpdate';
import {
  mapProductImagesToUploadedImages,
  formatProductDateTime,
  createFormDataFromProduct,
  handleMinPriceChange,
} from '@/features/product/lib/editFormUtils';
import Loading from '@/shared/ui/Loading/Loading';
import { useQuery } from '@tanstack/react-query';
import { fetchProductForEdit } from '../api/editProduct';

interface ProductFormProps {
  mode: 'create' | 'edit';
  shortId?: string;
}

export const ProductForm: React.FC<ProductFormProps> = ({ mode, shortId }) => {
  const router = useRouter();
  const user = useAuthStore();
  const { DialogHost, openSecretGuide } = useSecretDialog();
  const minPriceRef = useRef<HTMLInputElement>(null);

  // Edit 모드일 때만 데이터 가져오기
  const shouldFetchEditData = mode === 'edit' && !!shortId;

  // useQuery를 조건부로 사용하기 위해 직접 import해서 사용
  const editQueryResult = useQuery({
    queryKey: ['product', 'edit', shortId || ''],
    queryFn: () => fetchProductForEdit(shortId || ''),
    enabled: shouldFetchEditData, // edit 모드이고 shortId가 있을 때만 실행
    staleTime: 1000 * 60 * 5,
  });

  const { data: editData, isLoading: editLoading, error: editError } = editQueryResult;

  // Update mutation (edit 모드일 때만)
  const { mutate: submitUpdate, isPending: isUpdating } = useProductUpdateMutation(shortId || '');

  const {
    // State
    title,
    category,
    description,
    dealAddress,
    dealLatitude,
    dealLongitude,
    minPrice,
    endDate,
    endTime,
    images,
    isSecret,
    // Actions
    setTitle,
    setCategory,
    setDescription,
    setDealAddress,
    setDealLatitude,
    setDealLongitude,
    setMinPrice,
    setEndDate,
    setEndTime,
    setImages,
    setIsSecret,
    reset,
  } = useProductFormWithoutSubmitting();

  // Create mutation (create 모드일 때만)
  const createProduct = useCreateProductWithValidation({
    onSuccess: () => {
      reset();
      router.push('/auction/listings');
    },
  });

  const [dealLocationUse, setDealLocationUse] = useState(false);

  // Edit 모드일 때 이미지 매핑 (useMemo로 최적화)
  const mappedImages = useMemo(() => {
    if (mode === 'edit' && editData) {
      return mapProductImagesToUploadedImages(editData.product_image);
    }
    return [];
  }, [mode, editData]);

  // Edit 모드일 때 데이터 초기화
  useEffect(() => {
    if (mode === 'edit' && editData) {
      setTitle(editData.title || '');
      setCategory(editData.category || '');
      setDescription(editData.description || '');
      setMinPrice(editData.min_price ? handleMinPriceChange(editData.min_price.toString()) : '');
      setDealAddress(editData.deal_address || '');
      setDealLatitude(editData.deal_latitude?.toString() || '');
      setDealLongitude(editData.deal_longitude?.toString() || '');
      setIsSecret(editData.is_secret);

      // 위치 정보가 있으면 거래 장소 사용으로 설정
      if (editData.deal_latitude !== null && editData.deal_longitude !== null) {
        setDealLocationUse(true);
      }

      // 종료 시간 설정
      if (editData.auction_end_at) {
        const { date, time } = formatProductDateTime(editData.auction_end_at);
        setEndDate(date);
        setEndTime(time);
      }

      // 이미지 설정
      const mappedImages = mapProductImagesToUploadedImages(editData.product_image);
      setImages(mappedImages);
    }
  }, [
    mode,
    editData,
    setTitle,
    setCategory,
    setDescription,
    setMinPrice,
    setDealAddress,
    setDealLatitude,
    setDealLongitude,
    setIsSecret,
    setEndDate,
    setEndTime,
    setImages,
  ]);

  const handleMinPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPriceInput(e.target.value);
    setMinPrice(formatted);
  };

  const handleCreateSubmit = () => {
    if (!user.user?.id) {
      return;
    }

    if (!isMinPriceValid(parseFormattedPrice(minPrice))) {
      toast({ content: '입찰 시작가의 최대 금액은 2,000,000,000원입니다.' });
      minPriceRef.current?.focus();
      return;
    }

    if (!isEndDateValid(endDate, endTime)) {
      toast({ content: '종료일시는 현재 시간 기준 1시간 이후여야 합니다.' });
      return;
    }

    createProduct.mutate({
      title,
      category,
      description,
      dealAddress: dealLocationUse ? dealAddress : undefined,
      dealLatitude: dealLocationUse ? Number(dealLatitude) : undefined,
      dealLongitude: dealLocationUse ? Number(dealLongitude) : undefined,
      minPrice,
      endDate,
      endTime,
      images,
      userId: user.user.id,
      isSecret,
    });
  };

  const handleEditSubmit = () => {
    if (!editData) return;

    if (!canEditProduct(editData.created_at)) {
      toast({ content: '상품 수정 가능 시간이 만료되었습니다!' });
      router.back();
      return;
    }

    if (!isMinPriceValid(parseFormattedPrice(minPrice))) {
      toast({ content: '입찰 시작가의 최대 금액은 2,000,000,000원입니다.' });
      minPriceRef.current?.focus();
      return;
    }

    if (!isEndDateAfterInitialDate(endDate, endTime, editData.created_at)) {
      toast({ content: '경매 종료일시는 상품 등록 시각 기준으로 1시간 이후여야 합니다.' });
      return;
    }

    const formData = {
      title,
      category,
      description,
      minPrice,
      endDate,
      endTime,
      images,
      dealLocationUse,
      dealAddress,
      dealLatitude: dealLatitude ? Number(dealLatitude) : null,
      dealLongitude: dealLongitude ? Number(dealLongitude) : null,
      isSecret,
    };

    if (!validateProductEditForm(formData)) {
      toast({ content: '모든 필수 항목을 입력해 주세요' });
      return;
    }

    const submitData = createFormDataFromProduct(formData, images);

    submitUpdate(submitData, {
      onSuccess: () => {
        toast({ content: '수정이 완료되었습니다!' });
        router.push('/auction/listings');
      },
      onError: () => {
        toast({ content: '알 수 없는 오류가 발생했어요.' });
      },
    });
  };

  const handleSubmit = mode === 'create' ? handleCreateSubmit : handleEditSubmit;
  const isSubmitting = mode === 'create' ? createProduct.isPending : isUpdating;

  // Edit 모드 로딩/에러 처리
  if (mode === 'edit') {
    if (editLoading) return <Loading />;
    if (editError)
      return <p>오류: {editError instanceof Error ? editError.message : '알 수 없는 오류'}</p>;
    if (shouldFetchEditData && !editData) return <p>상품 정보를 찾을 수 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-[26px]">
      <div className="p-box flex flex-col gap-[26px]">
        {/* 사진 업로드 */}
        <ImageUploadPreview exImages={mappedImages} onImagesChange={setImages} />

        {/* 상품 제목 */}
        <div className="flex flex-col gap-[10px]">
          <div className="typo-subtitle-small-medium">
            상품 제목<span className="text-main">*</span>
          </div>
          <Input
            name="title"
            placeholder="상품 제목을 입력해 주세요."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* 카테고리 */}
        <div className="flex flex-col gap-[10px]">
          <div className="typo-subtitle-small-medium">
            카테고리<span className="text-main">*</span>
          </div>
          <Select
            name="category"
            value={category}
            onValueChange={(value) => setCategory(value as CategoryValue)}
          >
            <SelectTrigger className="typo-body-regular rounded-sm px-[10.5px]">
              <SelectValue placeholder="카테고리를 선택해 주세요." />
            </SelectTrigger>
            <SelectContent>
              {categories
                .filter((category) => category.value !== 'all')
                .map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* 상품 설명 */}
        <div className="flex flex-col gap-[10px]">
          <div className="typo-subtitle-small-medium">
            자세한 설명<span className="text-main">*</span>
          </div>
          <Textarea
            name="description"
            className="h-[204px]"
            placeholder="상품의 상태, 구매 시기, 사용감 등을 자세히 설명해 주세요."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* 거래 희망 장소 */}
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-center justify-between">
            <div className="typo-subtitle-small-medium">거래 희망 장소</div>
            <Switch checked={dealLocationUse} onCheckedChange={setDealLocationUse} />
          </div>
          {dealLocationUse && (
            <div className="flex flex-col gap-[10px]">
              <div className="typo-caption-regular text-neutral-700">
                {mode === 'create'
                  ? '*지도의 핀을 이동해주시고, 입력창에 상세 주소를 입력해주세요.'
                  : '⁕ 지도의 핀을 이동해주시고, 입력창에 상세 주소를 입력해주세요.'}
              </div>
              <GoogleMap
                setLocation={(loc: Location) => {
                  setDealLatitude(loc.lat.toString());
                  setDealLongitude(loc.lng.toString());
                }}
                setAddress={mode === 'create' ? setDealAddress : undefined}
                draggable={true}
                mapId="product-registration"
                height="h-[300px]"
                initialLocation={
                  dealLatitude && dealLongitude
                    ? { lat: Number(dealLatitude), lng: Number(dealLongitude) }
                    : undefined
                }
              />
              <Input
                name="address"
                placeholder="위치 추가"
                value={dealAddress}
                onChange={(e) => setDealAddress(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="h-[8px] w-full bg-neutral-100"></div>

      <div className="p-box flex flex-col gap-[26px]">
        {/* 시크릿 경매 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-[5px]">
            <div className="typo-subtitle-small-medium">시크릿 경매 이용하기</div>
            <button onClick={() => openSecretGuide()}>
              <Info className="stroke-event size-[17px]" />
            </button>
          </div>
          <Switch checked={isSecret} onCheckedChange={setIsSecret} />
        </div>

        {/* 입찰 시작가 */}
        <div className="flex flex-col gap-[10px]">
          <div className="typo-subtitle-small-medium">
            입찰 시작가<span className="text-main">*</span>
          </div>
          <div className="flex items-end">
            <Input
              name="minPrice"
              ref={minPriceRef}
              value={minPrice}
              onChange={handleMinPriceInputChange}
              placeholder="희망하는 최소 입찰가를 적어주세요."
              required
            />
            <div className="typo-body-medium ml-[8px]">원</div>
          </div>
        </div>

        {/* 경매 종료 일자 */}
        <div className="flex w-full flex-col gap-[13px]">
          <div className="typo-subtitle-small-medium">
            경매 종료 일자<span className="text-main">*</span>
          </div>
          <div className="flex w-full gap-[16px]">
            <div className="flex w-[calc(50%-8px)] flex-1 basis-[0] flex-col">
              <div className="typo-caption-regular mb-[6px]">종료 날짜</div>
              <Input
                name="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="flex w-[calc(50%-8px)] flex-1 basis-[0] flex-col">
              <div className="typo-caption-regular mb-[6px]">종료 시간</div>
              <Input
                name="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <Button
          onClick={handleSubmit}
          variant={isSubmitting ? 'loading' : 'default'}
          disabled={isSubmitting}
          className={`${isSubmitting && 'animate-pulse'}`}
        >
          {isSubmitting
            ? mode === 'create'
              ? '출품 중...'
              : '수정 중...'
            : mode === 'create'
              ? '출품하기'
              : '수정하기'}
        </Button>

        {/* 출품 안내사항 (create 모드일 때만) */}
        {mode === 'create' && (
          <div className="bg-warning-light text-warning-medium typo-caption-medium rounded-[3px] p-[14px]">
            <div className="flex items-center">
              <Info strokeWidth={2} size={14} />
              <span className="pl-1">출품 전 안내사항</span>
            </div>
            <ul className="list-disc pl-[30px]">
              <li>상품을 출품하면 1시간 동안 '경매 대기' 상태로 유지됩니다.</li>
              <li>
                이 기간 동안에는 상품 목록에 노출되지 않으며, 내 경매 &gt; 출품 내역 페이지에서만
                확인할 수 있습니다.
              </li>
              <li>'경매 대기' 상태에서는 상품 정보를 자유롭게 수정하거나 삭제할 수 있습니다.</li>
              <li>
                1시간이 지나면 경매가 시작되며, 이후에는 수정 및 삭제가 불가능하니 주의해 주세요.
              </li>
            </ul>
          </div>
        )}
      </div>
      <DialogHost />
    </div>
  );
};
