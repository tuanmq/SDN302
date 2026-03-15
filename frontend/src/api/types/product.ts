export interface Product {
  product_id?: number;  // legacy / mapped
  _id?: string;        // MongoDB
  product_code: string;
  product_name: string;
  unit: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCreateRequest {
  product_code: string;
  product_name: string;
  unit: string;
}

export interface ProductUpdateRequest {
  product_code?: string; 
  product_name?: string;
  unit?: string;
}
