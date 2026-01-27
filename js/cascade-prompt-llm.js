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
		// UPDATED: Check if project is saved
		if (!SheetDataManager.currentFileName) {
			showCustomAlert('Please save your project first (Ctrl+S) to use LLM features.');
			return;
		}
		
		const btn = document.getElementById('refresh-models-btn');
		const icon = btn.querySelector('i');
		icon.classList.add('spin-anim'); // Add CSS animation class if exists
		
		// UPDATED: Call local PHP proxy with filename
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
				if (data.data) {
					this.models = data.data.map(m => ({ id: m.id, name: m.name }));
					localStorage.setItem('openrouter_models', JSON.stringify(this.models));
					this.populateModelSelect();
					showToast('Models list updated');
				} else if (data.error) {
					// Handle proxy or API errors
					showCustomAlert('Error fetching models: ' + data.error.message);
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
		
		// UPDATED: Check if project is saved
		if (!SheetDataManager.currentFileName) {
			showCustomAlert('Please save your project first (Ctrl+S) to run LLM functions.');
			return;
		}
		
		// Warn if there are unsaved changes, as the server reads from disk
		if (SheetDataManager.isModified) {
			// Optional: You could auto-save here, but for now we just warn or proceed.
			// If the user just changed the API key but didn't save, the server will fail.
			// Let's rely on the server error message if the key is missing/old.
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
		finalPrompt += '\n\nIMPORTANT: Respond ONLY with valid JSON matching this structure:\n' + cellData.llm.jsonSchema;
		
		// 2. Call API via PHP Proxy
		// UPDATED: Send filename instead of apiKey
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
			.then(response => {
				if (!response.ok) {
					// Handle HTTP errors specifically
					return response.json().then(errData => {
						throw new Error(errData.error ? errData.error.message : 'HTTP ' + response.status);
					});
				}
				return response.json();
			})
			.then(data => {
				if (data.choices && data.choices.length > 0) {
					const content = data.choices[0].message.content;
					this.parseAndInsert(content, cellData.llm.targetRow, cellData.llm.targetCol);
				} else if (data.error) {
					showCustomAlert('LLM Error: ' + data.error.message);
				}
			})
			.catch(err => {
				console.error(err);
				showCustomAlert('LLM Error: ' + err.message);
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
	 * Parse JSON response and insert into sheet
	 */
	parseAndInsert: function (jsonString, startR, startC) {
		// Clean markdown code blocks if present
		const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
		
		let jsonData;
		try {
			jsonData = JSON.parse(cleanJson);
		} catch (e) {
			console.error('JSON Parse Error', e);
			showCustomAlert('Failed to parse LLM response as JSON. See console.');
			return;
		}
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		
		// Determine structure. Is it an Array of Objects? Or a single Object?
		let rowsToInsert = [];
		
		if (Array.isArray(jsonData)) {
			rowsToInsert = jsonData;
		} else if (typeof jsonData === 'object') {
			// If simple key-value, treat as one row? Or vertical?
			// Let's assume vertical for single object (Key | Value)
			// Actually, let's just make it a single row of values if it's flat,
			// or if the user provided a table structure in schema, follow that.
			// Simplest generic approach: Array of objects = Table. Single Object = Key/Value pairs vertically.
			
			// Let's check schema hint. If schema was { "k": "v" }, user likely expects that object.
			// We will output keys in col 1, values in col 2.
			Object.keys(jsonData).forEach(k => {
				rowsToInsert.push({ key: k, value: jsonData[k] });
			});
		}
		
		// Insert Data
		rowsToInsert.forEach((rowObj, rOffset) => {
			const currentRow = startR + rOffset;
			let cOffset = 0;
			
			// If rowObj is primitive (array of strings), handle that
			if (typeof rowObj !== 'object') {
				this.setCellValue(sheet, currentRow, startC, rowObj);
			} else {
				// Object
				Object.values(rowObj).forEach(val => {
					const currentCol = startC + cOffset;
					
					// Handle nested objects/arrays by stringifying
					let valStr = val;
					if (typeof val === 'object') valStr = JSON.stringify(val);
					
					this.setCellValue(sheet, currentRow, currentCol, valStr);
					cOffset++;
				});
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
