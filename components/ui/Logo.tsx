import Image from 'next/image'

export function Logo({ width = 120, src = '/evecosys-dark.png' }: { width?: number; src?: string }) {
  const height = Math.round((width * 204) / 858)
  return (
    <Image
      src={src}
      alt="EVecosys"
      width={width}
      height={height}
      priority
    />
  )
}
