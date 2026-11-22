import { HttpException } from '@nestjs/common';
import { BOARD_STROKE_LIMITS } from './board-limits';
import type {
  BoardStrokeInput,
  BoardStrokePreviewInput,
} from './board.protocol';

const STROKE_SCHEMA_VERSION = 1;
const MAX_CHANNELS = 12;
/** 좌표 외 채널(필압·시간·기울기 등) 값의 절댓값 */
const MAX_CHANNEL_VALUE = 1_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLOR = /^#[0-9a-f]{6}$/i;
const BRUSH_ID = /^[a-z0-9_-]{1,32}$/;
const CHANNEL = /^[a-zA-Z0-9_]{1,16}$/;

const badRequest = () => new HttpException('BAD_REQUEST', 400);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function assertUuid(value: unknown): string {
  if (!isUuid(value)) throw badRequest();
  return value;
}

function validateHeader(value: unknown): Omit<BoardStrokeInput, 'points'> {
  if (!isRecord(value) || value.v !== STROKE_SCHEMA_VERSION) throw badRequest();
  const { id, tool, brush, color, size, eraseScope, channels } = value;

  if (!isUuid(id)) throw badRequest();
  if (tool !== 'pen' && tool !== 'eraser') throw badRequest();
  if (eraseScope !== 'own' && eraseScope !== 'all') throw badRequest();
  // 범위 all은 지우개에만 뜻이 있다.
  if (tool === 'pen' && eraseScope === 'all') throw badRequest();
  if (
    !isRecord(brush) ||
    typeof brush.id !== 'string' ||
    !BRUSH_ID.test(brush.id) ||
    !Number.isInteger(brush.version) ||
    (brush.version as number) < 1
  ) {
    throw badRequest();
  }
  if (typeof color !== 'string' || !COLOR.test(color)) throw badRequest();
  if (
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > BOARD_STROKE_LIMITS.maxStrokeSize
  ) {
    throw badRequest();
  }
  if (
    !Array.isArray(channels) ||
    channels.length > MAX_CHANNELS ||
    !channels.every(
      (channel) => typeof channel === 'string' && CHANNEL.test(channel),
    ) ||
    new Set(channels).size !== channels.length ||
    !channels.includes('x') ||
    !channels.includes('y')
  ) {
    throw badRequest();
  }

  return {
    v: STROKE_SCHEMA_VERSION,
    id,
    tool,
    brush: { id: brush.id, version: brush.version as number },
    color,
    size,
    eraseScope,
    channels: channels as string[],
  };
}

function validatePoints(
  value: unknown,
  channels: string[],
  { minPoints, maxPoints }: { minPoints: number; maxPoints: number },
): number[] {
  if (!Array.isArray(value) || value.length % channels.length !== 0) {
    throw badRequest();
  }
  const count = value.length / channels.length;
  if (count < minPoints || count > maxPoints) throw badRequest();

  const xAt = channels.indexOf('x');
  const yAt = channels.indexOf('y');
  for (let i = 0; i < value.length; i++) {
    const number: unknown = value[i];
    if (typeof number !== 'number' || !Number.isFinite(number)) {
      throw badRequest();
    }
    const channel = i % channels.length;
    const limit =
      channel === xAt || channel === yAt
        ? BOARD_STROKE_LIMITS.maxCoordinate
        : MAX_CHANNEL_VALUE;
    if (Math.abs(number) > limit) throw badRequest();
  }
  return value as number[];
}

/** 모르는 필드는 버리고 아는 필드만 돌려준다. */
export function validateStroke(value: unknown): BoardStrokeInput {
  const header = validateHeader(value);
  const points = validatePoints(
    (value as BoardStrokeInput).points,
    header.channels,
    {
      minPoints: 1,
      maxPoints: BOARD_STROKE_LIMITS.maxPointsPerStroke,
    },
  );
  if (JSON.stringify(points).length > BOARD_STROKE_LIMITS.maxStrokeBytes) {
    throw badRequest();
  }
  return { ...header, points };
}

export function validatePreview(value: unknown): BoardStrokePreviewInput {
  const header = validateHeader(value);
  const { points, index, cancel } = value as BoardStrokePreviewInput;
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
    throw badRequest();
  }
  return {
    ...header,
    points: validatePoints(points, header.channels, {
      minPoints: 0,
      maxPoints: BOARD_STROKE_LIMITS.maxPointsPerMessage,
    }),
    index,
    ...(cancel === true ? { cancel: true } : {}),
  };
}
