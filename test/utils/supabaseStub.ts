type Row = Record<string, any>

export function makeSupabaseStub() {
  const users: Record<string, Row> = {}

  return {
    auth: {
      async updateUser(payload: any) {
        // No-op for integration stub
        return { data: null }
      },
      async getUser() {
        // return a default test user
        return { data: { user: { id: 'user-1' } } }
      },
      async resetPasswordForEmail() {
        return { data: null }
      },
    },
    from(table: string) {
      return {
        select() {
          return { single: async () => ({ role: users['user-1']?.role ?? 'driver' }) }
        },
        update(obj: any) {
          return {
            eq: async (field: string, value: string) => {
              if (value === 'user-1') {
                users['user-1'] = { ...(users['user-1'] ?? {}), ...obj }
                return { data: users['user-1'] }
              }
              return { data: null }
            },
          }
        },
      }
    },
  }
}
