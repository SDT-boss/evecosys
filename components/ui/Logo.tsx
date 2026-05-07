import Image from 'next/image'

export function Logo({ width = 120 }: { width?: number }) {
  const height = Math.round((width * 204) / 858)
  return (
    <>
      <svg
        viewBox="0 0 230 54"
        width={width}
        xmlns="http://www.w3.org/2000/svg"
        className="block dark:hidden"
      >
        <rect x="0" y="1" width="74" height="52" rx="9" fill="#7cc242" />
        <text x="5" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="white">E</text>
        <text x="26" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="white">V</text>
        <text x="50" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="#1a7080">E</text>
        <text x="82" y="42" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="37" fill="var(--text)">cosys</text>
      </svg>
      <Image
        src="/EVecosys_dark.png"
        alt="EVecosys"
        width={width}
        height={height}
        priority
        className="hidden dark:block"
      />
    </>
  )
}
