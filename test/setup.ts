import '@testing-library/jest-dom'

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

