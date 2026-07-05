'use client'
import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ImageIcon, Link } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadImageSource } from '@/lib/mediaUpload'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
  onUploadingChange?: (uploading: boolean) => void
  maxImages?: number
  label?: string
}

const SUPPORTED_UPLOAD_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])
const LARGE_IMAGE_THRESHOLD_BYTES = 600 * 1024
const TARGET_IMAGE_BYTES = 350 * 1024
const WARNING_IMAGE_BYTES = 400 * 1024
const MAX_IMAGE_DIMENSION = 1600
const MIN_IMAGE_DIMENSION = 800
const MIN_JPEG_QUALITY = 0.5

function base64Size(dataUri: string): number {
  // approximate decoded byte size from base64 string
  const base64 = dataUri.split(',')[1] ?? ''
  return Math.floor((base64.length * 3) / 4)
}

function isBase64(src: string): boolean {
  return src.startsWith('data:')
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = event => resolve((event.target?.result as string) || '')
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not decode image file.'))
    }
    image.src = objectUrl
  })
}

function renderCompressedImage(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#111111'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

async function optimizeImage(file: File): Promise<string> {
  const fallback = await readFileAsDataUrl(file)
  if (typeof window === 'undefined') return fallback
  if (!file.type.startsWith('image/')) return fallback

  const needsNormalization = !SUPPORTED_UPLOAD_MIMES.has(file.type)
  if (!needsNormalization && file.size <= LARGE_IMAGE_THRESHOLD_BYTES) return fallback

  try {
    const image = await loadImageElement(file)
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const targetMaxDimension = needsNormalization ? longestSide : MAX_IMAGE_DIMENSION
    const initialScale = longestSide > targetMaxDimension ? targetMaxDimension / longestSide : 1
    let width = Math.max(1, Math.round(image.naturalWidth * initialScale))
    let height = Math.max(1, Math.round(image.naturalHeight * initialScale))
    let quality = needsNormalization ? 0.92 : 0.85
    let result = renderCompressedImage(image, width, height, quality)
    if (!result) return fallback

    while (base64Size(result) > TARGET_IMAGE_BYTES && quality > MIN_JPEG_QUALITY) {
      quality = Math.max(MIN_JPEG_QUALITY, quality - 0.08)
      const next = renderCompressedImage(image, width, height, quality)
      if (!next) break
      result = next
    }

    while (
      base64Size(result) > TARGET_IMAGE_BYTES &&
      Math.max(width, height) > MIN_IMAGE_DIMENSION
    ) {
      width = Math.max(1, Math.round(width * 0.85))
      height = Math.max(1, Math.round(height * 0.85))
      quality = 0.82
      let next = renderCompressedImage(image, width, height, quality)
      if (!next) break
      result = next

      while (base64Size(result) > TARGET_IMAGE_BYTES && quality > MIN_JPEG_QUALITY) {
        quality = Math.max(MIN_JPEG_QUALITY, quality - 0.08)
        next = renderCompressedImage(image, width, height, quality)
        if (!next) break
        result = next
      }
    }

    return result
  } catch {
    if (needsNormalization) {
      throw new Error('This photo format could not be processed. Please use JPG, PNG, WEBP, or AVIF.')
    }
    return fallback
  }
}

export default function ImageUploader({
  images,
  onChange,
  onUploadingChange,
  maxImages = 5,
  label,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [uploading, setUploading] = useState(false)

  const canAdd = !uploading && images.length < maxImages

  async function uploadMediaFile(file: File): Promise<string> {
    const optimized = await optimizeImage(file)
    return uploadImageSource(optimized, file.name)
  }

  function readFilesAsMediaUrls(files: FileList | File[]): Promise<string[]> {
    const arr = Array.from(files).slice(0, maxImages - images.length)
    return arr.reduce<Promise<string[]>>(async (promise, file) => {
      const uploaded = await promise
      const url = await uploadMediaFile(file)
      return [...uploaded, url]
    }, Promise.resolve([]))
  }

  async function handleFiles(files: FileList | File[]) {
    setUploading(true)
    onUploadingChange?.(true)
    try {
      const results = await readFilesAsMediaUrls(files)
      onChange([...images, ...results])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload image.')
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (!canAdd) return
      const files = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('image/'),
      )
      if (files.length) await handleFiles(files)
    },
    [canAdd, images], // eslint-disable-line react-hooks/exhaustive-deps
  )

  function remove(idx: number) {
    onChange(images.filter((_, i) => i !== idx))
  }

  function moveLeft(idx: number) {
    if (idx === 0) return
    const arr = [...images]
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    onChange(arr)
  }

  function moveRight(idx: number) {
    if (idx === images.length - 1) return
    const arr = [...images]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    onChange(arr)
  }

  function addUrl() {
    const url = urlValue.trim()
    if (!url) return
    onChange([...images, url])
    setUrlValue('')
    setShowUrlInput(false)
  }

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-brand-cream/50 text-xs uppercase tracking-wider">{label}</p>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {images.map((src, idx) => {
            const sizeBytes = isBase64(src) ? base64Size(src) : 0
            const oversized = sizeBytes > WARNING_IMAGE_BYTES
            return (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-brand-gold/20 bg-brand-black-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Product image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Main badge */}
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-brand-gold text-brand-black text-[9px] font-bold px-1.5 py-0.5 rounded-md z-10">
                    MAIN
                  </span>
                )}

                {/* Size warning */}
                {oversized && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md z-10">
                    {Math.round(sizeBytes / 1024)}KB
                  </span>
                )}

                {/* Controls overlay — always visible on touch, hover on desktop */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 sm:opacity-0 touch-device:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveLeft(idx)}
                      className="w-7 h-7 rounded-lg bg-brand-black/80 flex items-center justify-center text-brand-cream hover:text-brand-gold transition-colors"
                      title="Move left"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="w-7 h-7 rounded-lg bg-red-500/80 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {idx < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveRight(idx)}
                      className="w-7 h-7 rounded-lg bg-brand-black/80 flex items-center justify-center text-brand-cream hover:text-brand-gold transition-colors"
                      title="Move right"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Always-visible remove on mobile (small corner button) */}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="absolute top-1 right-1 sm:hidden w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white z-20"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
            dragging
              ? 'border-brand-gold bg-brand-gold/10'
              : 'border-brand-gold/25 hover:border-brand-gold/50 hover:bg-brand-gold/5'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          <motion.div
            animate={{ scale: dragging ? 1.04 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-2 pointer-events-none"
          >
            <ImageIcon className={`w-8 h-8 ${dragging ? 'text-brand-gold' : 'text-brand-gold/35'}`} />
            <p className="text-brand-cream/60 text-sm">
              {dragging ? 'Drop to add images' : 'Drag & drop images here'}
            </p>
            <p className="text-brand-cream/30 text-xs">or click to browse · JPG, PNG, WEBP, AVIF, HEIC</p>
            <p className="text-brand-cream/25 text-xs">
              {uploading ? 'Uploading images…' : 'Large photos are auto-compressed and uploaded safely'}
            </p>
            <p className="text-brand-cream/25 text-xs">
              {images.length}/{maxImages} images
            </p>
          </motion.div>
        </div>
      )}

      {/* URL paste toggle */}
      {canAdd && (
        <div>
          <button
            type="button"
            onClick={() => setShowUrlInput(v => !v)}
            className="flex items-center gap-1.5 text-brand-gold/60 hover:text-brand-gold text-xs transition-colors"
          >
            <Link className="w-3 h-3" />
            {showUrlInput ? 'Cancel' : 'Or paste image URL'}
          </button>

          <AnimatePresence>
            {showUrlInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlValue}
                    onChange={e => setUrlValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 bg-brand-black-3 border border-brand-gold/20 rounded-xl px-3 py-2 text-brand-cream text-sm placeholder:text-brand-cream/20 focus:outline-none focus:border-brand-gold/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addUrl}
                    className="btn-gold !px-4 !py-2 !text-xs"
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
