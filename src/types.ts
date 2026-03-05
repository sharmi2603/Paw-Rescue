export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'volunteer' | 'adopter';
}

export interface Pet {
  id: number;
  name: string;
  breed: string;
  age: number;
  type: string;
  description: string;
  image_url: string;
  status: 'available' | 'adopted' | 'rescue';
  location_lat?: number;
  location_lng?: number;
}

export interface Rescue {
  id: number;
  reporter_id: number;
  reporter_name?: string;
  pet_description: string;
  image_url: string;
  lat: number;
  lng: number;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_volunteer_id?: number;
  volunteer_name?: string;
  created_at: string;
}

export interface Adoption {
  id: number;
  pet_id: number;
  pet_name?: string;
  adopter_id: number;
  adopter_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  request_date: string;
}
