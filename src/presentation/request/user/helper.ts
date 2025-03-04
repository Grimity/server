import { Transform, TransformFnParams } from 'class-transformer';

export function TrimString() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  });
}
