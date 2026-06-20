'use client'

import { createContext, useContext, useState } from 'react'

interface TenantContextValue {
  activeTenantName: string | null
  setActiveTenantName: (name: string | null) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  children: React.ReactNode
  initialName: string | null
}

export function TenantProvider({ children, initialName }: TenantProviderProps) {
  const [activeTenantName, setActiveTenantName] = useState(initialName)
  return (
    <TenantContext.Provider value={{ activeTenantName, setActiveTenantName }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenantContext must be used within TenantProvider')
  return ctx
}
