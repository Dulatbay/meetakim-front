import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        react()
    ],
    // Dev server proxy to backend (adjust target if your backend runs elsewhere)
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            // Proxy only the backend auth entry points, not /auth/callback
            '/auth/egov': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/auth/mock-callback': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        }
    }
})
