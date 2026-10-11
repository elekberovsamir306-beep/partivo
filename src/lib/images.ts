import 'server-only'
import { createHash } from 'node:crypto'
import sharp, { type Metadata as SharpMetadata } from 'sharp'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // client pre-resizes; Vercel functions accept ≤4.5 MB bodies
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif', 'avif'])
const MIN_DIMENSION = 400
const MAX_PIXELS = 50_000_000

export class ImageValidationError extends Error {
  constructor(public readonly code: 'too_large' | 'unsupported_format' | 'too_small' | 'corrupt') {
    super(code)
  }
}

export const IMAGE_ERRORS: Record<ImageValidationError['code'], string> = {
  too_large: 'Şəkil çox böyükdür (maksimum 4 MB).',
  unsupported_format: 'Yalnız JPG, PNG və WEBP formatları qəbul olunur.',
  too_small: `Şəkil çox kiçikdir (ən azı ${MIN_DIMENSION}×${MIN_DIMENSION} piksel).`,
  corrupt: 'Şəkil faylı zədələnib və ya oxunmur.',
}

export interface ProcessedImage {
  full: Buffer
  thumb: Buffer
  width: number
  height: number
  hash: string
}



export async function processListingImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageValidationError('too_large')

  let meta: SharpMetadata
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata()
  } catch {
    throw new ImageValidationError('corrupt')
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new ImageValidationError('unsupported_format')
  if (!meta.width || !meta.height) throw new ImageValidationError('corrupt')
  if (Math.min(meta.width, meta.height) < MIN_DIMENSION) throw new ImageValidationError('too_small')

  try {
    const base = sharp(input, { limitInputPixels: MAX_PIXELS }).rotate()
    const { data: full, info } = await base
      .clone()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84, effort: 4 })
      .toBuffer({ resolveWithObject: true })
    const thumb = await base
      .clone()
      .resize({ width: 640, height: 480, fit: 'cover', position: 'attention' })
      .webp({ quality: 78, effort: 4 })
      .toBuffer()
    const hash = createHash('sha256').update(full).digest('hex')
    return { full, thumb, width: info.width, height: info.height, hash }
  } catch {
    throw new ImageValidationError('corrupt')
  }
}

export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageValidationError('too_large')
  let meta: SharpMetadata
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata()
  } catch {
    throw new ImageValidationError('corrupt')
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new ImageValidationError('unsupported_format')
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 96) throw new ImageValidationError('too_small')
  return sharp(input, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize(320, 320, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toBuffer()
}
