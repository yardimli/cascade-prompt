import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
	// Define your base path in one place
	const basePath = '/cascade-prompt/';
	
	const config = {
		base: basePath,
		plugins: [
			tailwindcss()
		],
		server: {
			host: 'localhost',
			port: 5173,
			strictPort: true,
			cors: true,
			origin: 'http://localhost:5173'
		},
		build: {
			outDir: 'dist',
			manifest: true,
			rollupOptions: {
				input: 'src/main.js'
			}
		}
	};
	
	// Node.js Proxy Configuration
	if (mode === 'node') {
		config.server.proxy = {
			// 1. Proxy API requests
			[`^${basePath}api`]: {
				target: 'http://localhost:3000',
				changeOrigin: true,
				rewrite: (path) => path.replace(new RegExp(`^${basePath}`), '')
			},

			// 2. NEW: Proxy Image/Project file requests
			// This forwards /cascade-prompt/projects/... -> http://localhost:3000/projects/...
			[`^${basePath}projects`]: {
				target: 'http://localhost:3000',
				changeOrigin: true,
				rewrite: (path) => path.replace(new RegExp(`^${basePath}`), '')
			}
		};
		
		// 3. Force the environment variable for the frontend
		config.define = {
			'import.meta.env.VITE_API_TARGET': JSON.stringify('node')
		};
	}
	
	return config;
});
