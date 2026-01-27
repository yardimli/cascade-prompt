<?php

	/**
	 * Save Project API
	 * Receives JSON data and saves it to a file.
	 * Follows PSR-12 standards.
	 */

	header('Content-Type: application/json');

// Get JSON input
	$input = json_decode(file_get_contents('php://input'), true);

// Validate Input
	if (!isset($input['filename']) || !isset($input['data'])) {
		echo json_encode(['success' => false, 'message' => 'Invalid input']);
		exit;
	}

// Sanitize Filename
	$filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['filename']);

	if (empty($filename)) {
		echo json_encode(['success' => false, 'message' => 'Invalid filename']);
		exit;
	}

	$filePath = '../projects/' . $filename . '.json';

// Encode data with Pretty Print for readability, though strictly not required for machine reading
// The input['data'] should already be sparse (optimized) from the frontend
	$jsonData = json_encode($input['data'], JSON_PRETTY_PRINT);

	if (file_put_contents($filePath, $jsonData)) {
		echo json_encode(['success' => true, 'message' => 'File saved successfully']);
	} else {
		echo json_encode(['success' => false, 'message' => 'Failed to write file']);
	}
