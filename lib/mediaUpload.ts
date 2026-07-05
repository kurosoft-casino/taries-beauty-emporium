import { apiRequest } from './remoteApi'

const MAX_UPLOAD_ATTEMPTS = 2

function isDataUrl(value: string): boolean {
  return value.startsWith('data:')
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',', 2)
  if (!header || !base64) throw new Error('Invalid image data. Please choose the photo again.')
  const mimeMatch = header.match(/^data:([^;]+);base64$/i)
  const mime = mimeMatch?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mime })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function uploadImageSource(source: string, filename?: string): Promise<string> {
  if (!isDataUrl(source)) return source

  const blob = dataUrlToBlob(source)

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    const formData = new FormData()
    formData.append('file', blob, filename || 'image.jpg')

    const response = await apiRequest<{ url?: string }>('/media/upload', {
      method: 'POST',
      body: formData,
    })

    if (response.ok && response.data?.url) {
      return response.data.url
    }

    const isTransientNetworkError = response.status === 0
    if (isTransientNetworkError && attempt < MAX_UPLOAD_ATTEMPTS) {
      await delay(400)
      continue
    }

    throw new Error(response.error || 'Could not upload image. Please try a smaller photo.')
  }

  throw new Error('Could not upload image. Please try again.')
}

export async function normalizeProductImageSources(images: string[]): Promise<string[]> {
  return Promise.all(images.map((image, index) => uploadImageSource(image, `product-image-${index + 1}.jpg`)))
}
