export function getImageUrl(image: string): string;
export function getImageUrl(image: string | null): string | null;
export function getImageUrl(image: string | null) {
  return image ? `${process.env.IMAGE_URL}/${image}` : null;
}
