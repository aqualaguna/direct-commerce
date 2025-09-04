// Product Types
export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  currency: string;
  sku: string;
  stock: number;
  category?: string;
  images?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  slug: string;
  parentId?: number;
  isActive: boolean;
}
