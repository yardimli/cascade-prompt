<?php

	class ViteLoader {
		private $manifestPath;
		private $basePath;
		private $devServerUrl;

		public function __construct($basePath = '/cascade-prompt/') {
			$this->basePath = $basePath;
			$this->manifestPath = __DIR__ . '/dist/.vite/manifest.json';
			$this->devServerUrl = 'http://localhost:5173' . $basePath;
		}

		/**
		 * Checks if the Vite Dev Server is running.
		 * For simplicity, we assume Dev mode if the manifest doesn't exist
		 * or if we can connect to the dev server port.
		 */
		private function isDev() {
			// Simple check: If dist/manifest.json doesn't exist, we assume Dev.
			// You can also use an environment variable like define('VITE_ENV', 'dev');
			if (!file_exists($this->manifestPath)) {
				return true;
			}

			// Optional: Check if port 5173 is open (requires fsockopen enabled)
			$connection = @fsockopen('localhost', 5173);
			if ($connection) {
				fclose($connection);
				return true;
			}

			return false;
		}

		public function render($entryPoint) {
			if ($this->isDev()) {
				// Dev Mode: Point to the Vite Server
				$url = $this->devServerUrl . $entryPoint;
				return '
                <script type="module" src="' . $this->devServerUrl . '@vite/client"></script>
                <script type="module" src="' . $url . '"></script>
            ';
			} else {
				// Production Mode: Read from Manifest
				$manifest = json_decode(file_get_contents($this->manifestPath), true);

				if (isset($manifest[$entryPoint])) {
					$file = $manifest[$entryPoint]['file'];
					$cssFiles = $manifest[$entryPoint]['css'] ?? [];

					$output = '';

					// CSS
					foreach ($cssFiles as $css) {
						$output .= '<link rel="stylesheet" href="' . $this->basePath . 'dist/' . $css . '">';
					}

					// JS
					$output .= '<script type="module" src="' . $this->basePath . 'dist/' . $file . '"></script>';

					return $output;
				}
			}
			return '<!-- Vite Entry Point Not Found -->';
		}
	}
