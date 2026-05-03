'use client'

import { useEffect, useState } from 'react'
import Image, { type ImageProps } from 'next/image'

const DEFAULT_FALLBACK = '/images/logo.jpg'

type FallbackImageProps = Omit<ImageProps, 'src'> & {
  src: ImageProps['src']
  fallbackSrc?: string
}

export default function FallbackImage({ src, fallbackSrc = DEFAULT_FALLBACK, onError, ...props }: FallbackImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src)

  useEffect(() => {
    setCurrentSrc(src)
  }, [src])

  return (
    <Image
      {...props}
      src={currentSrc}
      onError={(event) => {
        onError?.(event)
        if (typeof currentSrc === 'string' && currentSrc === fallbackSrc) return
        setCurrentSrc(fallbackSrc)
      }}
    />
  )
}
