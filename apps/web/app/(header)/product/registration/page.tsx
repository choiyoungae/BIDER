import React from 'react';
import ReactQueryProvider from '@/shared/providers/ReactQueryProvider';
import { ProductForm } from '@/features/product/ui/ProductForm';

const ProductRegistrationPage = () => {
  return (
    <ReactQueryProvider>
      <div className="pt-[16px]">
        <ProductForm mode="create" />
      </div>
    </ReactQueryProvider>
  );
};

export default ProductRegistrationPage;
