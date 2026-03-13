export type ResonanceVisibility = 'public' | 'private';

export type ResonanceMediaType = 'image' | 'video';

export type ResonanceAttachment = {
  id: number;
  url: string;
  mediaType: ResonanceMediaType;
  sortOrder: number;
};

export type ResonanceComment = {
  id: number;
  content: string;
  createdAt: string;
  userId?: number;
  authorName: string;
};

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
  authorName: string;
  visibility: ResonanceVisibility;
  attachments: ResonanceAttachment[];
  commentCount: number;
  favoriteCount: number;
  isFavorite: boolean;
  comments?: ResonanceComment[];
};

export type ResonancePostInput = {
  title?: string;
  content: string;
  address: string;
  township?: string;
  lng: number;
  lat: number;
  visibility?: ResonanceVisibility;
};

export type ResonanceCommentInput = {
  content: string;
};

export type ResonanceFavoriteState = {
  postId: number;
  favoriteCount: number;
  isFavorite: boolean;
};
