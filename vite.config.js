import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],

	server: {
		proxy: {
			'/api': {
				target: 'http://api.favorit-parts.ru',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '/hs/hsprice'),
			},
		},
	},

	test: {
		environment: 'jsdom',
		setupFiles: './src/test/setup.js',

		// Фиксированный ключ, чтобы тесты не зависели от локального .env.
		env: { VITE_API_KEY: 'test-key' },
	},
});
