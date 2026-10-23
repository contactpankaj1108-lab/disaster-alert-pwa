import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import apiApp from './server/server.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/api')) {
            apiApp(req, res, next);
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 5173
  }
})
