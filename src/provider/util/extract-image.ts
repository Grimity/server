export function extractImage(htmlString: string): string | null {
  // 정규 표현식을 사용하여 첫 번째 <img> 태그의 src 속성을 추출
  const imgTagMatch = htmlString.match(/<img[^>]+src="([^">]+)"/);

  // img 태그가 있다면 src 값을 반환, 없다면 null 반환
  return imgTagMatch ? imgTagMatch[1] : null;
}
