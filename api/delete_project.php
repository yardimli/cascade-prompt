<?php

	header('Content-Type: application/json');

	$input = json_decode(file_get_contents('php://input'), true);

	if (!isset($input['filename'])) {
		echo json_encode(['success' => false, 'message' => 'Filename required']);
		exit;
	}

	$filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['filename']);
	$filePath = '../projects/' . $filename . '.json';

	if (file_exists($filePath)) {
		if (unlink($filePath)) {
			echo json_encode(['success' => true, 'message' => 'File deleted']);
		} else {
			echo json_encode(['success' => false, 'message' => 'Could not delete file']);
		}
	} else {
		echo json_encode(['success' => false, 'message' => 'File not found']);
	}
