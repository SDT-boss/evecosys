'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger } from '@evecosys/design-system'

const TABS = [
  { label: 'Branding',        href: '/board/settings/branding' },
  { label: 'Users',           href: '/board/settings/users' },
  { label: 'BYODB',           href: '/board/settings/byodb' },
  { label: 'Feature Toggles', href: '/board/settings/toggles' },
] as const

export function SettingsTabNav() {
  const pathname = usePathname()
  const activeTab = TABS.find(t => pathname.startsWith(t.href))?.href ?? TABS[0].href

  return (
    <nav aria-label="Settings navigation">
      <Tabs value={activeTab}>
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab.href} value={tab.href} asChild>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  )
}
