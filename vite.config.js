import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	// IMPORTANT: This must match your Apache folder name
	base: '/cascade-prompt/',
	plugins: [
		tailwindcss()
	],
	server: {
		// specific settings to allow Apache to access the Vite dev server
		host: 'localhost',
		port: 5173,
		strictPort: true,
		cors: true,
		origin: 'http://localhost:5173',
	},
	build: {
		outDir: 'dist',
		manifest: true, // Required for PHP to find built files
		rollupOptions: {
			input: 'src/main.js' // Explicitly define the entry point
		}
	}
});
