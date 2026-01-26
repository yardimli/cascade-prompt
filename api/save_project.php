<?php

	header('Content-Type: application/json');

// Get JSON input
	$input = json_decode(file_get_contents('php://input'), true);

	if (!isset($input['filename']) || !isset($input['data'])) {
		echo json_encode(['success' => false, 'message' => 'Invalid input']);
		exit;
	}

	$filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['filename']); // Sanitize
	if (empty($filename)) {
		echo json_encode(['success' => false, 'message' => 'Invalid filename']);
		exit;
	}

	$filePath = '../projects/' . $filename . '.json';
	$jsonData = json_encode($input['data'], JSON_PRETTY_PRINT);

	if (file_put_contents($filePath, $jsonData)) {
		echo json_encode(['success' => true, 'message' => 'File saved successfully']);
	} else {
		echo json_encode(['success' => false, 'message' => 'Failed to write file']);
	}
