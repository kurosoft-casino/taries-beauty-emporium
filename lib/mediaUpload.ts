import { apiRequest } from './remoteApi'

function isDataUrl(value: string): boolean {
  return value.startsWith('data:')
}

async function dataUrlToFile(dataUrl: string, filename = 'image.jpg'): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

export async function uploadImageSource(source: string, filename?: string): Promise<string> {
  if (!isDataUrl(source)) return source

  const file = await dataUrlToFile(source, filename)
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiRequest<{ url?: string }>('/media/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok || !response.data?.url) {
    throw new Error(response.error || 'Could not upload image. Please try a smaller photo.')
  }

  return response.data.url
}

export async function normalizeProductImageSources(images: string[]): Promise<string[]> {
  return Promise.all(images.map((image, index) => uploadImageSource(image, `product-image-${index + 1}.jpg`)))
}
