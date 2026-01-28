/**
 * Cascade Prompt LLM Manager
 * Handles OpenRouter API integration via PHP Proxy, model management, and formula execution.
 */

var LLMManager = {
	models: [],
	
	init: function () {
		// Load models from local storage if available
		const cachedModels = localStorage.getItem('openrouter_models');
		if (cachedModels) {
			this.models = JSON.parse(cachedModels);
		}
	},
	
	/**
	 * Open the Settings Modal
	 */
	openSettings: function () {
		const modal = new bootstrap.Modal(document.getElementById('llmSettingsModal'));
		const input = document.getElementById('llm-api-key');
		
		// Load existing key
		if (SheetDataManager.data.llmSettings && SheetDataManager.data.llmSettings.apiKey) {
			input.value = SheetDataManager.data.llmSettings.apiKey;
		} else {
			input.value = '';
		}
		
		modal.show();
	},
	
	/**
	 * Save Settings from Modal
	 */
	saveSettings: function () {
		const input = document.getElementById('llm-api-key');
		const key = input.value.trim();
		
		if (!SheetDataManager.data.llmSettings) {
			SheetDataManager.data.llmSettings = {};
		}
		
		SheetDataManager.data.llmSettings.apiKey = key;
		SheetDataManager.setModified(true);
		
		const modalEl = document.getElementById('llmSettingsModal');
		const modal = bootstrap.Modal.getInstance(modalEl);
		modal.hide();
		
		showToast('LLM Settings Saved. Please Save Project (Ctrl+S).');
	},
	
	/**
	 * Open the Formula Builder Modal
	 */
	openFormulaBuilder: function () {
		const modal = new bootstrap.Modal(document.getElementById('llmFormulaModal'));
		const selected = document.querySelector('.selected-cell');
		
		// Populate Target Cell Input
		const targetInput = document.getElementById('llm-target-cell');
		
		if (selected) {
			const r = selected.parentElement.rowIndex; // 1-based index (includes header)
			const c = parseInt(selected.getAttribute('data-col'));
			
			// Internal 0-based row for data lookup
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = (r - 1) + '-' + c;
			
			// Check if cell already has LLM config
			if (sheet.cells[key] && sheet.cells[key].llm) {
				const config = sheet.cells[key].llm;
				document.getElementById('llm-prompt').value = config.prompt || '';
				document.getElementById('llm-json-schema').value = config.jsonSchema || '';
				document.getElementById('llm-func-name').value = config.funcName || 'Run LLM';
				
				// Set the target input based on saved config
				const targetLetter = SheetDataManager.getColumnLetter(config.targetCol);
				targetInput.value = targetLetter + (config.targetRow + 1);
				
				// Model selection handled after population
				setTimeout(() => {
					document.getElementById('llm-model-select').value = config.model || '';
				}, 100);
			} else {
				// New Formula: Default target to current cell, but user can change it
				const letter = SheetDataManager.getColumnLetter(c);
				targetInput.value = letter + r;
				
				// Clear inputs
				document.getElementById('llm-prompt').value = '';
				document.getElementById('llm-json-schema').value = '{\n  "Key": "Value"\n}';
				document.getElementById('llm-func-name').value = 'Run LLM';
			}
		} else {
			targetInput.value = '';
		}
		
		this.populateModelSelect();
		modal.show();
	},
	
	/**
	 * Fetch Models from OpenRouter via PHP Proxy
	 */
	fetchModels: function () {
		// Check if project is saved
		if (!SheetDataManager.currentFileName) {
			showCustomAlert('Please save your project first (Ctrl+S) to use LLM features.');
			return;
		}
		
		const btn = document.getElementById('refresh-models-btn');
		const icon = btn.querySelector('i');
		icon.classList.add('spin-anim'); // Add CSS animation class if exists
		
		// Call local PHP proxy with filename
		fetch('api/llm_proxy.php', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				action: 'models',
				filename: SheetDataManager.currentFileName
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success && data.data) {
					this.models = data.data.map(m => ({ id: m.id, name: m.name }));
					localStorage.setItem('openrouter_models', JSON.stringify(this.models));
					this.populateModelSelect();
					showToast('Models list updated');
				} else {
					// Handle proxy or API errors
					showCustomAlert('Error fetching models: ' + (data.message || 'Unknown error'));
				}
			})
			.catch(err => {
				console.error(err);
				showCustomAlert('Failed to fetch models. Check console.');
			})
			.finally(() => {
				icon.classList.remove('spin-anim');
			});
	},
	
	populateModelSelect: function () {
		const select = document.getElementById('llm-model-select');
		select.innerHTML = '<option value="">Select a model...</option>';
		
		this.models.forEach(m => {
			const opt = document.createElement('option');
			opt.value = m.id;
			opt.textContent = m.name || m.id;
			select.appendChild(opt);
		});
	},
	
	/**
	 * Insert/Save the LLM Formula into the cell
	 */
	insertFormula: function () {
		const prompt = document.getElementById('llm-prompt').value;
		const model = document.getElementById('llm-model-select').value;
		const schema = document.getElementById('llm-json-schema').value;
		const targetStr = document.getElementById('llm-target-cell').value;
		const funcName = document.getElementById('llm-func-name').value || 'Run LLM';
		
		if (!prompt || !model || !targetStr) {
			showCustomAlert('Please fill in all required fields.');
			return;
		}
		
		// Validate Schema JSON syntax
		try {
			JSON.parse(schema);
		} catch (e) {
			showCustomAlert('Invalid JSON Schema syntax: ' + e.message);
			return;
		}
		
		// 1. Identify the Source Cell (Where the button lives)
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			showCustomAlert('No cell selected to place the button.');
			return;
		}
		const sourceRow = selected.parentElement.rowIndex - 1; // 0-based
		const sourceCol = parseInt(selected.getAttribute('data-col'));
		
		// 2. Parse Target Cell (Where the output goes)
		const match = targetStr.match(/^([A-Z]+)([0-9]+)$/i);
		if (!match) {
			showCustomAlert('Invalid target cell format. Use A1, B2, etc.');
			return;
		}
		
		const colLetter = match[1].toUpperCase();
		const rowNum = parseInt(match[2]);
		
		// Convert target to indices
		let targetColIndex = 0;
		for (let i = 0; i < colLetter.length; i++) {
			targetColIndex = targetColIndex * 26 + (colLetter.charCodeAt(i) - 64);
		}
		targetColIndex -= 1; // 0-based
		const targetRowIndex = rowNum - 1; // 0-based
		
		// Save to Data Manager
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		// Key is based on SOURCE cell
		const key = sourceRow + '-' + sourceCol;
		
		if (!sheet.cells[key]) {
			sheet.cells[key] = {};
		}
		
		// Save Config
		sheet.cells[key].llm = {
			prompt: prompt,
			model: model,
			jsonSchema: schema,
			targetRow: targetRowIndex,
			targetCol: targetColIndex,
			funcName: funcName
		};
		
		// Update visual text if empty
		if (!sheet.cells[key].text) {
			sheet.cells[key].text = 'LLM Formula';
			sheet.cells[key].html = 'LLM Formula';
		}
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		
		const modalEl = document.getElementById('llmFormulaModal');
		const modal = bootstrap.Modal.getInstance(modalEl);
		modal.hide();
	},
	
	/**
	 * Execute the LLM call for a specific cell via PHP Proxy
	 */
	executeLLM: function (r, c, event) {
		if (event) event.stopPropagation(); // Prevent cell selection logic
		
		// Check if project is saved
		if (!SheetDataManager.currentFileName) {
			showCustomAlert('Please save your project first (Ctrl+S) to run LLM functions.');
			return;
		}
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;
		const cellData = sheet.cells[key];
		
		if (!cellData || !cellData.llm) return;
		
		// Visual Feedback in Cell
		const btn = document.querySelector(`.text-cell[data-col="${c}"]`).parentElement.parentElement.children[r].querySelector(`td[data-col="${c}"] .llm-run-btn`);
		const originalIcon = btn.innerHTML;
		btn.innerHTML = '<div class="llm-spinner"></div>';
		btn.disabled = true;
		
		// Visual Feedback in Status Bar
		const statusContainer = document.getElementById('status-llm-busy');
		const statusText = document.getElementById('status-llm-text');
		const targetName = SheetDataManager.getColumnLetter(cellData.llm.targetCol) + (cellData.llm.targetRow + 1);
		
		if (statusContainer) {
			statusContainer.style.display = 'flex';
			if (statusText) {
				statusText.textContent = `Running ${cellData.llm.model} -> ${targetName}...`;
			}
		}
		
		// 1. Parse Prompt (Replace #A-17)
		let finalPrompt = cellData.llm.prompt;
		const regex = /#([A-Z]+)-([0-9]+)/gi;
		
		finalPrompt = finalPrompt.replace(regex, (match, colLet, rowNum) => {
			// Convert ref to value
			let colIdx = 0;
			colLet = colLet.toUpperCase();
			for (let i = 0; i < colLet.length; i++) {
				colIdx = colIdx * 26 + (colLet.charCodeAt(i) - 64);
			}
			colIdx -= 1;
			const rowIdx = parseInt(rowNum) - 1;
			
			const refKey = rowIdx + '-' + colIdx;
			if (sheet.cells[refKey]) {
				return sheet.cells[refKey].text || '';
			}
			return '';
		});
		
		// Append JSON instruction
		finalPrompt += '\n\nIMPORTANT: Respond ONLY with valid JSON matching this structure, repeat the structure for each result:\n' + cellData.llm.jsonSchema;
		
		// 2. Call API via PHP Proxy
		fetch('api/llm_proxy.php', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				action: 'chat',
				filename: SheetDataManager.currentFileName,
				model: cellData.llm.model,
				messages: [
					{ role: 'user', content: finalPrompt }
				]
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success && data.data) {
					// 3. Validate Structure against Schema
					const isValid = this.validateStructure(data.data, cellData.llm.jsonSchema);
					
					if (isValid) {
						this.parseAndInsert(data.data, cellData.llm.targetRow, cellData.llm.targetCol, cellData.llm.jsonSchema);
						if (data.usage) {
							console.log('Token Usage:', data.usage);
						}
					} else {
						showCustomAlert('<b>Structure Mismatch:</b><br>The LLM returned JSON that does not match your requested schema.<br><br>Please try again or refine your prompt.');
						console.warn('Returned Data:', data.data);
						console.warn('Expected Schema:', cellData.llm.jsonSchema);
					}
				} else {
					showCustomAlert('LLM Error: ' + (data.message || 'Unknown error'));
					if (data.raw_content) {
						console.error('Raw Content:', data.raw_content);
					}
				}
			})
			.catch(err => {
				console.error(err);
				showCustomAlert('Network or Script Error: ' + err.message);
			})
			.finally(() => {
				// Restore button
				if (btn) {
					btn.innerHTML = originalIcon;
					btn.disabled = false;
				}
				// Hide Status Bar
				if (statusContainer) {
					statusContainer.style.display = 'none';
				}
			});
	},
	
	/**
	 * Compare keys of returned data against schema
	 */
	validateStructure: function (returnedData, schemaString) {
		try {
			const schema = JSON.parse(schemaString);
			
			// Helper to get keys recursively (simplified for depth 1 or 2)
			const getKeys = (obj) => {
				if (Array.isArray(obj)) {
					if (obj.length > 0 && typeof obj[0] === 'object') {
						return Object.keys(obj[0]).sort();
					}
					return []; // Array of primitives
				}
				if (typeof obj === 'object' && obj !== null) {
					return Object.keys(obj).sort();
				}
				return [];
			};
			
			const schemaKeys = getKeys(schema);
			const dataKeys = getKeys(returnedData);
			
			// If schema is empty or simple, be lenient
			if (schemaKeys.length === 0) return true;
			
			// Compare keys
			if (JSON.stringify(schemaKeys) !== JSON.stringify(dataKeys)) {
				// Fallback: If returned data is an array but schema was object, check if array items match schema keys
				if (Array.isArray(returnedData) && !Array.isArray(schema)) {
					const itemKeys = getKeys(returnedData);
					if (JSON.stringify(itemKeys) === JSON.stringify(Object.keys(schema).sort())) {
						return true;
					}
				}
				return false;
			}
			
			return true;
		} catch (e) {
			console.error('Validation Logic Error', e);
			return true; // Allow if we can't validate
		}
	},
	
	/**
	 * Insert structured data into sheet
	 * @param {Object|Array} jsonData - The parsed JSON object from PHP
	 * @param {number} startR - Row index
	 * @param {number} startC - Column index
	 * @param {string} schemaString - The JSON schema string
	 */
	parseAndInsert: function (jsonData, startR, startC, schemaString) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		
		// 1. Extract Headers from Schema
		let headers = [];
		try {
			const schema = JSON.parse(schemaString);
			
			// Helper to get keys
			const getKeys = (obj) => {
				if (Array.isArray(obj)) {
					if (obj.length > 0 && typeof obj[0] === 'object') {
						return Object.keys(obj[0]);
					}
					return [];
				}
				if (typeof obj === 'object' && obj !== null) {
					return Object.keys(obj);
				}
				return [];
			};
			
			headers = getKeys(schema);
		} catch (e) {
			console.warn('Could not parse schema for headers', e);
		}
		
		// 2. Insert Headers
		if (headers.length > 0) {
			headers.forEach((header, idx) => {
				this.setCellValue(sheet, startR, startC + idx, header);
			});
			startR++; // Move data down
		}
		
		// 3. Prepare Data Rows
		let rowsToInsert = [];
		
		if (Array.isArray(jsonData)) {
			rowsToInsert = jsonData;
		} else if (typeof jsonData === 'object') {
			// If we have headers, treat as single horizontal row
			if (headers.length > 0) {
				rowsToInsert.push(jsonData);
			} else {
				// Fallback: Vertical Key/Value if no headers (schema was empty/invalid)
				// Check complexity
				const hasComplexValues = Object.values(jsonData).some(v => typeof v === 'object' && v !== null);
				if (!hasComplexValues) {
					Object.keys(jsonData).forEach(k => {
						rowsToInsert.push({ key: k, value: jsonData[k] });
					});
				} else {
					rowsToInsert.push(jsonData);
				}
			}
		}
		
		// 4. Insert Data
		rowsToInsert.forEach((rowObj, rOffset) => {
			const currentRow = startR + rOffset;
			
			if (typeof rowObj !== 'object' || rowObj === null) {
				// Primitive value in array
				this.setCellValue(sheet, currentRow, startC, rowObj);
			} else {
				// Object
				if (headers.length > 0) {
					// Map by Header
					headers.forEach((key, idx) => {
						const currentCol = startC + idx;
						const val = rowObj[key];
						
						let valStr = (val === undefined || val === null) ? '' : val;
						if (typeof val === 'object') valStr = JSON.stringify(val);
						
						this.setCellValue(sheet, currentRow, currentCol, valStr);
					});
				} else {
					// Map by Iteration (Fallback)
					let cOffset = 0;
					Object.values(rowObj).forEach(val => {
						const currentCol = startC + cOffset;
						let valStr = val;
						if (typeof val === 'object') valStr = JSON.stringify(val);
						
						this.setCellValue(sheet, currentRow, currentCol, valStr);
						cOffset++;
					});
				}
			}
		});
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		showToast('LLM Data Inserted');
	},
	
	setCellValue: function (sheet, r, c, val) {
		const key = r + '-' + c;
		if (!sheet.cells[key]) {
			sheet.cells[key] = {};
		}
		sheet.cells[key].text = String(val);
		sheet.cells[key].html = String(val);
	}
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function () {
	LLMManager.init();
});
