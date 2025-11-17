interface PushPayload {
  userId: string;
  title: string;
  text: string;
  imageUrl?: string | null;
  data?: Record<string, string>;
  silent?: boolean;
  key?: string;
  badge?: number;
}
