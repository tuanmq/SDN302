export interface Product {
  product_id?: string;  // legacy / mapped (Mongo _id)
  _id?: string;         // MongoDB raw _id
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
