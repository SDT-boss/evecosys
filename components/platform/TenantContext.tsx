'use client'

import { createContext, useContext, useState } from 'react'

interface TenantContextValue {
  activeTenantId: string | null
  setActiveTenantId: (id: string | null) => void
  activeTenantName: string | null
  setActiveTenantName: (name: string | null) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  children: React.ReactNode
  initialId?: string | null
  initialName: string | null
}

export function TenantProvider({ children, initialId = null, initialName }: TenantProviderProps) {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(initialId)
  const [activeTenantName, setActiveTenantName] = useState(initialName)
  return (
    <TenantContext.Provider value={{ activeTenantId, setActiveTenantId, activeTenantName, setActiveTenantName }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider')
  return ctx
}
