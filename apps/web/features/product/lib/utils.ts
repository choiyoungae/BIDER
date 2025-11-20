import { ProductEditFormData } from '@/features/product/types';
import { formatNumberWithComma } from '@/shared/lib/formatNumberWithComma';

export const getCountdownWithColor = (
  endTime: string | Date
): { text: string; color: 'gray' | 'orange' | 'blue' } => {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return { text: '경매 종료', color: 'gray' };

  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const days = totalDays;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  let timeText = '';

  if (totalMinutes >= 1) {
    if (days > 0) timeText += `${days}일 `;
    if (hours > 0) timeText += `${hours}시간 `;
    if (minutes > 0) timeText += `${minutes}분`;
  } else {
    timeText = `${seconds}초`;
  }

  const color = totalMinutes < 15 ? 'orange' : 'blue';

  return {
    text: `${timeText.trim()} 남음`,
    color,
  };
};

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const parseFormattedPrice = (formattedPrice: string): number => {
  return parseInt(formattedPrice.replace(/,/g, ''), 10);
};

export const formatPriceInput = (value: string): string => {
  const numericOnly = value.replace(/\D/g, '');
  return formatNumberWithComma(numericOnly);
};

export const combineDateTime = (date: string, time: string): Date => {
  return new Date(`${date}T${time}`);
};

export const validateProductEditForm = (data: ProductEditFormData): boolean => {
  const { title, category, description, minPrice, endDate, endTime, images } = data;

  return !!(
    title &&
    category &&
    description &&
    minPrice &&
    endDate &&
    endTime &&
    images.length > 0
  );
};

export const canEditProduct = (createdAt: string): boolean => {
  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + 1);
  const now = new Date();

  return now <= deadline;
};

export const isEndDateValid = (endDate: string, endTime: string): boolean => {
  if (!endDate || !endTime) return false;

  const end = new Date(`${endDate}T${endTime}`);
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  return end > oneHourLater;
};

export const isMinPriceValid = (minPrice: number): boolean => {
  if (!minPrice) return false;

  return minPrice > 0 && minPrice <= 2000000000;
};

export function isEndDateAfterInitialDate(
  endDate: string,
  endTime: string,
  createdAt: string
): boolean {
  if (!endDate || !endTime || !createdAt) return false;

  const end = new Date(`${endDate}T${endTime}`);
  const created = new Date(createdAt);
  const createdPlusOneHour = new Date(created.getTime() + 60 * 60 * 1000);

  return end > createdPlusOneHour;
}
