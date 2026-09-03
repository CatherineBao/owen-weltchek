import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { apiPlugin } from './vite-plugin-api.ts'

// The API handlers read process.env directly (DATABASE_URL, ADMIN_PASSWORD_HASH,
// SESSION_SECRET). Vite only exposes VITE_-prefixed vars to import.meta.env and
// never touches process.env, so load the file here for the dev server.
// These stay server-side: nothing here reaches the client bundle.
try {
  process.loadEnvFile('.env.local')
} catch {
  /* no .env.local — `npm run dev` still serves the frontend */
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
})
