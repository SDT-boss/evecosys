import Image from 'next/image'

export function Logo({ width = 120 }: { width?: number }) {
  const height = Math.round((width * 204) / 858)
  return (
    <Image
      src="/EVecosys_dark.png"
      alt="EVecosys"
      width={width}
      height={height}
      priority
    />
  )
}
