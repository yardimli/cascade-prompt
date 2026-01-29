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
			// 1. Match the full path including the base directory
			[`^${basePath}api`]: {
				target: 'http://localhost:3000',
				changeOrigin: true,
				// 2. Remove the base path before sending to Node server
				// e.g. /cascade-prompt/api/list_projects -> /api/list_projects
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
