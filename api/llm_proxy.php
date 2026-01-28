<?php

	/**
	 * LLM Proxy API
	 * Acts as a bridge between the frontend and OpenRouter API.
	 * Reads the API Key directly from the saved project file on the server.
	 * Logs interactions and processes JSON responses.
	 * Follows PSR-12 standards.
	 */

	header('Content-Type: application/json');

// Get JSON input
	$input = json_decode(file_get_contents('php://input'), true);

// Basic Validation
	if (!isset($input['action'])) {
		echo json_encode(['success' => false, 'message' => 'Action required']);
		exit;
	}

	if (!isset($input['filename'])) {
		echo json_encode(['success' => false, 'message' => 'Filename required. Please save your project first.']);
		exit;
	}

// Sanitize Filename
	$filename = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['filename']);
	$filePath = '../projects/' . $filename . '.json';

// Check if file exists
	if (!file_exists($filePath)) {
		echo json_encode(['success' => false, 'message' => 'Project file not found. Please save your project.']);
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
		echo json_encode(['success' => false, 'message' => 'API Key not found in project file.']);
		exit;
	}

	$action = $input['action'];

// OpenRouter API Base URL
	$baseUrl = 'https://openrouter.ai/api/v1';

// Prepare Headers
	$headers = [
		'Content-Type: application/json',
		'HTTP-Referer: ' . ($_SERVER['HTTP_REFERER'] ?? 'http://localhost'),
		'X-Title: Cascade Prompt',
		'Authorization: Bearer ' . $apiKey
	];

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Dev only
	curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);     // Dev only

// Handle Actions
	if ($action === 'models') {
		// Fetch Models
		curl_setopt($ch, CURLOPT_URL, $baseUrl . '/models');
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');

		$response = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$curlError = curl_error($ch);

		if ($curlError) {
			echo json_encode(['success' => false, 'message' => 'cURL Error: ' . $curlError]);
			exit;
		}

		// Pass through the models response directly, but wrap it for consistency
		$decoded = json_decode($response, true);
		echo json_encode(['success' => true, 'data' => $decoded['data'] ?? []]);
	} elseif ($action === 'chat') {
		// Chat Completions
		if (!isset($input['model']) || !isset($input['messages'])) {
			echo json_encode(['success' => false, 'message' => 'Model and messages required for chat']);
			exit;
		}

		$payload = [
			'model' => $input['model'],
			'messages' => $input['messages']
		];

		curl_setopt($ch, CURLOPT_URL, $baseUrl . '/chat/completions');
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

		$response = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$curlError = curl_error($ch);

		if ($curlError) {
			echo json_encode(['success' => false, 'message' => 'cURL Error: ' . $curlError]);
			exit;
		}

		// Process Response
		$jsonResponse = json_decode($response, true);

		// Logging Logic
		$logFile = __DIR__ . '/llm-log.json';
		$logEntry = [
			'timestamp' => date('Y-m-d H:i:s'),
			'request' => $payload,
			'response_raw' => $jsonResponse,
			'model' => $input['model'],
			'usage' => $jsonResponse['usage'] ?? null
		];

		// Read existing log, append, save
		$currentLog = [];
		if (file_exists($logFile)) {
			$currentLog = json_decode(file_get_contents($logFile), true);
			if (!is_array($currentLog)) {
				$currentLog = [];
			}
		}
		$currentLog[] = $logEntry;
		// Keep log size manageable (optional, e.g., last 100 entries)
		if (count($currentLog) > 100) {
			$currentLog = array_slice($currentLog, -100);
		}
		file_put_contents($logFile, json_encode($currentLog, JSON_PRETTY_PRINT));

		// Extract Content
		if (isset($jsonResponse['choices'][0]['message']['content'])) {
			$llmRawContent = $jsonResponse['choices'][0]['message']['content'];

			// Clean Markdown code blocks if present (```json ... ```)
			$cleanContent = preg_replace('/^```json\s*|\s*```$/s', '', $llmRawContent);
			$cleanContent = trim($cleanContent);

			// Attempt to decode the inner JSON
			$innerJson = json_decode($cleanContent, true);

			if (json_last_error() === JSON_ERROR_NONE) {
				echo json_encode([
					'success' => true,
					'data' => $innerJson,
					'usage' => $jsonResponse['usage'] ?? []
				]);
			} else {
				// JSON Parse Error on the inner content
				echo json_encode([
					'success' => false,
					'message' => 'LLM returned invalid JSON.',
					'raw_content' => $llmRawContent,
					'parse_error' => json_last_error_msg()
				]);
			}
		} else {
			// API Error or unexpected format
			$errorMessage = $jsonResponse['error']['message'] ?? 'Unknown API error';
			echo json_encode([
				'success' => false,
				'message' => 'OpenRouter API Error: ' . $errorMessage,
				'full_response' => $jsonResponse
			]);
		}
	} else {
		echo json_encode(['success' => false, 'message' => 'Invalid action']);
	}
