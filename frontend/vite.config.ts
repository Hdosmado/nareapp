import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para el panel de coordinación.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // WSL2 no propaga eventos inotify para archivos en /mnt/c; sin polling
    // el HMR nunca detecta los cambios y el dev server sirve código viejo.
    watch: { usePolling: true, interval: 300 },
  },
});
