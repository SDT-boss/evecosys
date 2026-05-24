// Minimal ambient test declarations to satisfy TypeScript in this environment
declare const describe: (name: string, fn: () => void) => void
declare const it: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: any
declare const beforeEach: (fn: () => void) => void
declare const afterEach: (fn: () => void) => void
declare const vi: any

declare module '@testing-library/react' {
	export function render(...args: any[]): any
	export const screen: any
	export const fireEvent: {
		change: (...args: any[]) => any
		click: (...args: any[]) => any
		input?: (...args: any[]) => any
	}
	export function waitFor(...args: any[]): any
}

declare module '@testing-library/jest-dom' {
	// jest-dom extends expect; keep as placeholder
}
