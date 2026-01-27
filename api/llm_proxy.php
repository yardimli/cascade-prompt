<?php

	/**
	 * LLM Proxy API
	 * Acts as a bridge between the frontend and OpenRouter API.
	 * Reads the API Key directly from the saved project file on the server.
	 * Follows PSR-12 standards.
	 */

	header('Content-Type: application/json');

// Get JSON input
	$input = json_decode(file_get_contents('php://input'), true);

// Basic Validation
	if (!isset($input['action'])) {
		echo json_encode(['error' => ['message' => 'Action required']]);
		exit;
	}

	if (!isset($input['filename'])) {
		echo json_encode(['error' => ['message' => 'Filename required. Please save your project first.']]);
		exit;
	}

// Sanitize Filename
	$filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['filename']);
	$filePath = '../projects/' . $filename . '.json';

// Check if file exists
	if (!file_exists($filePath)) {
		echo json_encode(['error' => ['message' => 'Project file not found. Please save your project.']]);
		exit;
	}

// Read Project File to get API Key
	$projectContent = file_get_contents($filePath);
	$projectData = json_decode($projectContent, true);

	$apiKey = '';
	if (isset($projectData['llmSettings']) && isset($projectData['llmSettings']['apiKey'])) {
		$apiKey = $projectData['llmSettings']['apiKey'];
	}

	if (empty($apiKey)) {
		echo json_encode(['error' => ['message' => 'API Key not found in project file. Please configure LLM Settings and Save the project.']]);
		exit;
	}

	$action = $input['action'];

// OpenRouter API Base URL
	$baseUrl = 'https://openrouter.ai/api/v1';

// Prepare Headers
	$headers = [
		'Content-Type: application/json',
		// Pass the Referer and Title for OpenRouter rankings/analytics
		'HTTP-Referer: ' . ($_SERVER['HTTP_REFERER'] ?? 'http://localhost'),
		'X-Title: Cascade Prompt',
		'Authorization: Bearer ' . $apiKey
	];

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Handle Actions
	if ($action === 'models') {
		// Fetch Models
		curl_setopt($ch, CURLOPT_URL, $baseUrl . '/models');
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
	} elseif ($action === 'chat') {
		// Chat Completions
		if (!isset($input['model']) || !isset($input['messages'])) {
			echo json_encode(['error' => ['message' => 'Model and messages required for chat']]);
			exit;
		}

		$payload = [
			'model' => $input['model'],
			'messages' => $input['messages']
		];

		curl_setopt($ch, CURLOPT_URL, $baseUrl . '/chat/completions');
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
	} else {
		echo json_encode(['error' => ['message' => 'Invalid action']]);
		exit;
	}

// Execute Request
	$response = curl_exec($ch);
	$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	$curlError = curl_error($ch);

	curl_close($ch);

// Error Handling
	if ($curlError) {
		echo json_encode(['error' => ['message' => 'cURL Error: ' . $curlError]]);
		exit;
	}

// Forward the HTTP status code
	http_response_code($httpCode);

// Return the raw response from OpenRouter
	echo $response;
