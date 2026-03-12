export type ResonancePost = {
  id: number;
  title: string;
  content: string;
  address: string;
  township: string;
  lng: number;
  lat: number;
  createdAt: string;
  userId?: number;
};

export type ResonancePostInput = {
  title?: string;
  content: string;
  address: string;
  township?: string;
  lng: number;
  lat: number;
};
