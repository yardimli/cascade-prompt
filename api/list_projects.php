<?php

	header('Content-Type: application/json');

	$directory = '../projects/';
	$files = [];

	if (is_dir($directory)) {
		$scanned_files = scandir($directory);
		foreach ($scanned_files as $file) {
			if ($file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'json') {
				$files[] = pathinfo($file, PATHINFO_FILENAME);
			}
		}
	}

	echo json_encode(['success' => true, 'files' => $files]);
