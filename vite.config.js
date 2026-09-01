import { defineConfig } from 'vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import aiHandler from './api/ai.js'
import legalSourceHandler from './api/legal-source.js'

function aiDevApi() {
  return {
    name: 'legal-flow-ai-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/ai', (req, res) => {
        aiHandler(req, res)
      })
      server.middlewares.use('/api/legal-source', (req, res) => {
        legalSourceHandler(req, res)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...env, ...process.env }

  return {
    plugins: [react(), aiDevApi()],
    resolve: {
      alias: { '@': '/src' }
    }
  }
})
