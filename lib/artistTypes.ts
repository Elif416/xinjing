export type ArtistGridItem = {
  id: string;
  name: string;
  keywords: string[];
  keywordSummary: string;
  intro: string;
  image: string;
  price: string;
  avatar: string;
  href: string;
};

export type ArtistPortfolioItem = {
  id: string;
  postId: number;
  title: string;
  image: string;
  size: 'large' | 'tall' | 'wide' | 'normal';
  favoriteCount: number;
  createdAt: string;
};

export type ArtistServiceItem = {
  id: string;
  title: string;
  description: string;
  price: string;
};

export type ArtistStatItem = {
  label: string;
  value: string;
};

export type ArtistActivity = {
  progress: number;
  label: string;
  eta: string;
};

export type ArtistDetailData = {
  id: string;
  name: string;
  subtitle: string;
  intro: string;
  concept: string;
  startingPrice: string;
  avatar: string;
  heroImage: string;
  keywords: string[];
  stats: ArtistStatItem[];
  activity: ArtistActivity;
  portfolio: ArtistPortfolioItem[];
  services: ArtistServiceItem[];
};

export type ArtistsPageResponse = {
  items: ArtistGridItem[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  limit: number;
};
