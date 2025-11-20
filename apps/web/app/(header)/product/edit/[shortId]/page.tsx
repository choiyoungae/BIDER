'use client';

import React, { use } from 'react';
import { ProductEditPageProps } from '@/features/product/types';
import ReactQueryProvider from '@/shared/providers/ReactQueryProvider';
import { ProductForm } from '@/features/product/ui/ProductForm';

const ProductEditPage: React.FC<ProductEditPageProps> = ({ params }) => {
  const resolvedParams = use(params);

  return (
    <ReactQueryProvider>
      <ProductForm mode="edit" shortId={resolvedParams.shortId} />
    </ReactQueryProvider>
  );
};

export default ProductEditPage;
