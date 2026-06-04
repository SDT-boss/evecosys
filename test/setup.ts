import '@testing-library/jest-dom'

// Radix UI requires these browser APIs that jsdom does not provide
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Polyfills or global mocks can go here

// Provide minimal Next App Router mocks for components using next/navigation in tests
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn().mockResolvedValue(undefined),
	}),
	useSearchParams: () => ({
		get: (key: string) => null,
	}),
	usePathname: () => '/',
	useParams: () => ({}),
}))

