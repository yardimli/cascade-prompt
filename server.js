import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';
import multer from 'multer'; // Required for file uploads
import crypto from 'crypto'; // Required for random filenames
import sharp from 'sharp';   // Required for image resizing

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large JSON projects

// Paths
const PROJECTS_DIR = path.join(__dirname, 'projects');
const IMAGES_DIR = path.join(PROJECTS_DIR, 'images'); // Path for images
const LOG_FILE = path.join(__dirname, 'api', 'llm-log.json');
const SERVER_LOG_FILE = path.join(__dirname, 'server.log');

// Console Log Redirection
const serverLogStream = fs.createWriteStream(SERVER_LOG_FILE, { flags: 'a' });

console.log = (...args) => {
	const message = util.format(...args);
	serverLogStream.write(`[${new Date().toISOString()}] ${message}\n`);
};

process.on('exit', () => {
	serverLogStream.end();
});

if (!fs.existsSync(PROJECTS_DIR)) {
	fs.mkdirSync(PROJECTS_DIR);
}
if (!fs.existsSync(IMAGES_DIR)) {
	fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// --- Static File Serving ---
// This allows the frontend to access images via http://localhost:3000/projects/images/filename.jpg
app.use('/projects', express.static(PROJECTS_DIR));

// --- Multer Configuration (Image Uploads) ---
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, IMAGES_DIR);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname).toLowerCase();
		const randomName = crypto.randomBytes(5).toString('hex');
		cb(null, randomName + ext);
	}
});

const upload = multer({
	storage: storage,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
	fileFilter: function (req, file, cb) {
		const filetypes = /jpeg|jpg|png/;
		const mimetype = filetypes.test(file.mimetype);
		const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

		if (mimetype && extname) {
			return cb(null, true);
		}
		cb(new Error('Invalid file type. Only JPG and PNG are allowed.'));
	}
});

// Helper: Sanitize Filename
const sanitizeFilename = (filename) => {
	return filename.replace(/[^a-zA-Z0-9_-]/g, '');
};

// --- API Routes ---

// 1. List Projects
app.get('/api/list_projects', (req, res) => {
	fs.readdir(PROJECTS_DIR, (err, files) => {
		if (err) {
			return res.status(500).json({ success: false, message: 'Unable to scan directory' });
		}

		const jsonFiles = files
			.filter(file => path.extname(file) === '.json')
			.map(file => path.parse(file).name);

		res.json({ success: true, files: jsonFiles });
	});
});

// 2. Save Project
app.post('/api/save_project', (req, res) => {
	const { filename, data } = req.body;

	if (!filename || !data) {
		return res.status(400).json({ success: false, message: 'Invalid input' });
	}

	const cleanName = sanitizeFilename(filename);
	if (!cleanName) {
		return res.status(400).json({ success: false, message: 'Invalid filename' });
	}

	const filePath = path.join(PROJECTS_DIR, `${cleanName}.json`);
	const jsonData = JSON.stringify(data, null, 2);

	fs.writeFile(filePath, jsonData, (err) => {
		if (err) {
			return res.status(500).json({ success: false, message: 'Failed to write file' });
		}
		res.json({ success: true, message: 'File saved successfully' });
	});
});

// 3. Load Project
app.get('/api/load_project', (req, res) => {
	const { filename } = req.query;

	if (!filename) {
		return res.status(400).json({ success: false, message: 'Filename required' });
	}

	const cleanName = sanitizeFilename(filename);
	const filePath = path.join(PROJECTS_DIR, `${cleanName}.json`);

	if (fs.existsSync(filePath)) {
		fs.readFile(filePath, 'utf8', (err, data) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Error reading file' });
			}
			try {
				res.json({ success: true, data: JSON.parse(data) });
			} catch (e) {
				res.status(500).json({ success: false, message: 'Invalid JSON in file' });
			}
		});
	} else {
		res.status(404).json({ success: false, message: 'File not found' });
	}
});

// 4. Delete Project
app.post('/api/delete_project', (req, res) => {
	const { filename } = req.body;

	if (!filename) {
		return res.status(400).json({ success: false, message: 'Filename required' });
	}

	const cleanName = sanitizeFilename(filename);
	const filePath = path.join(PROJECTS_DIR, `${cleanName}.json`);

	if (fs.existsSync(filePath)) {
		fs.unlink(filePath, (err) => {
			if (err) {
				return res.status(500).json({ success: false, message: 'Could not delete file' });
			}
			res.json({ success: true, message: 'File deleted' });
		});
	} else {
		res.status(404).json({ success: false, message: 'File not found' });
	}
});

// 5. Upload Image
app.post('/api/upload_image', (req, res) => {
	const uploader = upload.single('image');

	uploader(req, res, function (err) {
		if (err instanceof multer.MulterError) {
			return res.status(400).json({ success: false, message: err.message });
		} else if (err) {
			return res.status(400).json({ success: false, message: err.message });
		}

		if (!req.file) {
			return res.status(400).json({ success: false, message: 'No file uploaded' });
		}

		res.json({
			success: true,
			path: `/projects/images/${req.file.filename}`
		});
	});
});

// 6. LLM Proxy
app.post('/api/llm_proxy', async (req, res) => {
	const { action, filename, model, messages } = req.body;

	if (!action) return res.status(400).json({ success: false, message: 'Action required' });
	if (!filename) return res.status(400).json({ success: false, message: 'Filename required' });

	const cleanName = sanitizeFilename(filename);
	const filePath = path.join(PROJECTS_DIR, `${cleanName}.json`);

	if (!fs.existsSync(filePath)) {
		return res.status(404).json({ success: false, message: 'Project file not found' });
	}

	// Read API Key from project file
	let apiKey = '';
	try {
		const projectContent = fs.readFileSync(filePath, 'utf8');
		const projectData = JSON.parse(projectContent);
		if (projectData.llmSettings && projectData.llmSettings.apiKey) {
			apiKey = projectData.llmSettings.apiKey;
		}
	} catch (e) {
		return res.status(500).json({ success: false, message: 'Error reading project file' });
	}

	if (!apiKey) {
		return res.status(400).json({ success: false, message: 'API Key not found in project file' });
	}

	const baseUrl = 'https://openrouter.ai/api/v1';
	const headers = {
		'Content-Type': 'application/json',
		'HTTP-Referer': req.headers.referer || 'http://localhost:3000',
		'X-Title': 'Cascade Prompt',
		'Authorization': `Bearer ${apiKey}`
	};

	try {
		if (action === 'models') {
			const response = await fetch(`${baseUrl}/models`, { method: 'GET', headers });
			const data = await response.json();
			res.json({ success: true, data: data.data ||[] });
		} else if (action === 'chat') {
			if (!model || !messages) {
				return res.status(400).json({ success: false, message: 'Model and messages required' });
			}

			// Process messages for images
			for (let i = 0; i < messages.length; i++) {
				let msg = messages[i];
				if (msg.role === 'user' && typeof msg.content === 'string') {
					let textPart = msg.content;
					// Find all [Image ID: /path/to/img] tags
					const imageMatches =[...textPart.matchAll(/\[Image ([A-Z0-9]+):\s*(.+?)\]/g)];

					if (imageMatches.length > 0) {
						let newContent = [];
						let imageRefs =[];
						let attachments =[];

						for (const match of imageMatches) {
							const fullMatch = match[0];
							const cellId = match[1];
							const imgPathOrUrl = match[2];
							let base64Data = null;

							if (imgPathOrUrl.includes('/projects/images/')) {
								const imgFilename = imgPathOrUrl.split('/').pop();
								const localFilePath = path.join(IMAGES_DIR, imgFilename);

								if (fs.existsSync(localFilePath)) {
									try {
										const buffer = fs.readFileSync(localFilePath);
										const resizedBuffer = await sharp(buffer)
											.resize({ width: 500, height: 500, fit: 'inside' })
											.toFormat('jpeg')
											.toBuffer();
										base64Data = `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
									} catch (err) {
										console.error('Error processing local image:', err);
									}
								}
							}
							else if (imgPathOrUrl.startsWith('http')) {
								try {
									const response = await fetch(imgPathOrUrl);
									const arrayBuffer = await response.arrayBuffer();
									const buffer = Buffer.from(arrayBuffer);
									const resizedBuffer = await sharp(buffer)
										.resize({ width: 500, height: 500, fit: 'inside' })
										.toFormat('jpeg')
										.toBuffer();
									base64Data = `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
								} catch (err) {
									console.error('Error processing remote image:', err);
								}
							}

							if (base64Data) {
								textPart = textPart.replace(fullMatch, `[Image ${cellId}]`);

								imageRefs.push({ id: cellId, source: imgPathOrUrl });

								attachments.push({ type: "text", text: `Attachment for[Image ${cellId}]:` });
								attachments.push({ type: "image_url", image_url: { url: base64Data } });
							}
						}

						if (imageRefs.length > 0) {
							textPart += '\n\nImage References:\n' + JSON.stringify(imageRefs, null, 2);

							newContent.push({ type: "text", text: textPart });

							newContent = newContent.concat(attachments);

							msg.content = newContent;

							console.log("\n=== DEBUG: LLM Prompt Text Part (With Images) ===");
							console.log(textPart);
							console.log("=================================================\n");
						} else {
							console.log("\n=== DEBUG: LLM Prompt Text Part ===");
							console.log(msg.content);
							console.log("===================================\n");
						}
					} else {
						console.log("\n=== DEBUG: LLM Prompt Text Part ===");
						console.log(msg.content);
						console.log("===================================\n");
					}
				}
			}

			const payload = { model, messages };
			const response = await fetch(`${baseUrl}/chat/completions`, {
				method: 'POST',
				headers,
				body: JSON.stringify(payload)
			});

			const jsonResponse = await response.json();

			// Logging
			const logEntry = {
				timestamp: new Date().toISOString(),
				request: payload,
				response_raw: jsonResponse,
				model,
				usage: jsonResponse.usage || null
			};

			let currentLog =[];
			if (fs.existsSync(LOG_FILE)) {
				try {
					currentLog = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
					if (!Array.isArray(currentLog)) currentLog = [];
				} catch (e) { currentLog =[]; }
			}
			currentLog.push(logEntry);
			if (currentLog.length > 100) currentLog = currentLog.slice(-100);
			fs.writeFileSync(LOG_FILE, JSON.stringify(currentLog, null, 2));

			// Process Content
			if (jsonResponse.choices && jsonResponse.choices[0] && jsonResponse.choices[0].message) {
				const rawContent = jsonResponse.choices[0].message.content;
				const cleanContent = rawContent.replace(/^```json\s*|\s*```$/gs, '').trim();

				try {
					const innerJson = JSON.parse(cleanContent);
					res.json({
						success: true,
						data: innerJson,
						usage: jsonResponse.usage ||[]
					});
				} catch (e) {
					res.json({
						success: false,
						message: 'LLM returned invalid JSON',
						raw_content: rawContent,
						parse_error: e.message
					});
				}
			} else {
				res.json({
					success: false,
					message: 'OpenRouter API Error',
					full_response: jsonResponse
				});
			}
		} else {
			res.status(400).json({ success: false, message: 'Invalid action' });
		}
	} catch (error) {
		res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
	}
});

app.listen(PORT, () => {
	console.log(`Node API Server running on http://localhost:${PORT}`);
	console.log(`Serving projects from: ${PROJECTS_DIR}`);
});