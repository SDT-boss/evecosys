export interface StoredSecret {
  secretId: string
}

export interface VaultStore {
  store(name: string, secret: string): Promise<StoredSecret>
  delete(secretId: string): Promise<void>
}

export class VaultStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VaultStorageError'
  }
}
