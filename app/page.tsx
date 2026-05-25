import { redirect } from 'next/navigation'

export default function RootPage() {
	// Redirect root to the canonical auth login route
	redirect('/login')
}
