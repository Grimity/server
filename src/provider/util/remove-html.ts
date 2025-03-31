import * as striptags from 'striptags';
import * as he from 'he';

export function removeHtml(content: string) {
  return he.decode(striptags(content));
}
