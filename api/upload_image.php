<?php

/**
 * Upload Image API
 * Handles image uploads for the spreadsheet cells.
 * Saves to ../projects/images/
 */

header('Content-Type: application/json');

// 1. Check Request Method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	echo json_encode(['success' => false, 'message' => 'Invalid request method']);
	exit;
}

// 2. Check if file exists
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
	$msg = isset($_FILES['image']) ? 'File upload error code: ' . $_FILES['image']['error'] : 'No file uploaded';
	echo json_encode(['success' => false, 'message' => $msg]);
	exit;
}

$file = $_FILES['image'];

// 3. Validate File Size (Max 10MB)
$maxSize = 10 * 1024 * 1024; // 10MB in bytes
if ($file['size'] > $maxSize) {
	echo json_encode(['success' => false, 'message' => 'File size exceeds 10MB limit']);
	exit;
}

// 4. Validate File Type (JPG or PNG)
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);
$allowedMimes = ['image/jpeg', 'image/png'];

if (!in_array($mimeType, $allowedMimes)) {
	echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG and PNG are allowed.']);
	exit;
}

// 5. Generate Random Filename (10 chars)
$extension = ($mimeType === 'image/png') ? 'png' : 'jpg';
$randomName = bin2hex(random_bytes(5)); // 5 bytes = 10 hex characters
$newFileName = $randomName . '.' . $extension;

// 6. Define Target Directory
$targetDir = '../projects/images/';
if (!is_dir($targetDir)) {
	if (!mkdir($targetDir, 0777, true)) {
		echo json_encode(['success' => false, 'message' => 'Failed to create upload directory']);
		exit;
	}
}

$targetPath = $targetDir . $newFileName;

// 7. Move File
if (move_uploaded_file($file['tmp_name'], $targetPath)) {
	// Return the path relative to the domain root (assuming projects is at root level accessible via web)
	// Adjust this path string based on your server's public folder structure
	$publicPath = '/projects/images/' . $newFileName;

	echo json_encode([
		'success' => true,
		'path' => $publicPath
	]);
} else {
	echo json_encode(['success' => false, 'message' => 'Failed to save file to server']);
}