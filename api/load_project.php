<?php

	/**
	 * Load Project API
	 * Loads JSON data from a specific file.
	 * Follows PSR-12 standards.
	 */

	header('Content-Type: application/json');

	if (!isset($_GET['filename'])) {
		echo json_encode(['success' => false, 'message' => 'Filename required']);
		exit;
	}

// Sanitize Filename
	$filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['filename']);
	$filePath = '../projects/' . $filename . '.json';

	if (file_exists($filePath)) {
		$content = file_get_contents($filePath);
		// Return the content directly. The frontend handles the sparse data structure.
		echo json_encode(['success' => true, 'data' => json_decode($content)]);
	} else {
		echo json_encode(['success' => false, 'message' => 'File not found']);
	}
