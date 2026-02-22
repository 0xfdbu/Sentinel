/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_SEPOLIA_RPC: string
  readonly VITE_REGISTRY_ADDRESS: string
  readonly VITE_GUARDIAN_ADDRESS: string
  readonly VITE_AUDIT_LOGGER_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
