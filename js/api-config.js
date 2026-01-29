/**
 * API Configuration
 * Determines the API endpoint based on the build environment.
 *
 * VITE_API_TARGET can be set in .env files or via command line.
 * 'php' (default) -> uses api/filename.php
 * 'node' -> uses api/filename (proxied to Express)
 */

const apiTarget = import.meta.env.VITE_API_TARGET || 'php'; // 'php' or 'node'

export const getApiEndpoint = (action) => {
	if (apiTarget === 'node') {
		// Node.js routes (e.g., /api/save_project)
		return `api/${action}`;
	}
	// PHP files (e.g., api/save_project.php)
	return `api/${action}.php`;
};
