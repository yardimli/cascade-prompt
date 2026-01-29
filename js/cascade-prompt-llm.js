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
		
		// --- NEW: Add Filter Listener ---
		const filterInput = document.getElementById('llm-model-filter');
		if (filterInput) {
			filterInput.addEventListener('input', (e) => {
				this.filterModels(e.target.value);
			});
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
		targetInput.classList.remove('is-invalid');
		document.getElementById('llm-json-schema').classList.remove('is-invalid');
		
		const promptEditor = document.getElementById('llm-prompt-editor');
		
		if (selected) {
			const r = selected.parentElement.rowIndex; // 1-based index (includes header)
			const c = parseInt(selected.getAttribute('data-col'));
			
			// Internal 0-based row for data lookup
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = (r - 1) + '-' + c;
			
			// Check if cell already has LLM config
			if (sheet.cells[key] && sheet.cells[key].llm) {
				const config = sheet.cells[key].llm;
				
				promptEditor.innerText = config.prompt || '';
				// Trigger highlight immediately
				this.highlightPromptVariables();
				
				document.getElementById('llm-json-schema').value = config.jsonSchema || '';
				document.getElementById('llm-func-name').value = config.funcName || 'Run LLM';
				
				const targetLetter = SheetDataManager.getColumnLetter(config.targetCol);
				targetInput.value = targetLetter + (config.targetRow + 1);
				
				setTimeout(() => {
					document.getElementById('llm-model-select').value = config.model || '';
				}, 100);
			} else {
				const letter = SheetDataManager.getColumnLetter(c);
				targetInput.value = letter + r;
				
				promptEditor.innerText = '';
				document.getElementById('llm-json-schema').value = '{\n  "Key": "Value"\n}';
				document.getElementById('llm-func-name').value = 'Run LLM';
			}
		} else {
			targetInput.value = '';
		}
		
		this.populateModelSelect();
		this.attachEditorListeners();
		modal.show();
	},
	
	/**
	 * Attach event listeners for the modal inputs
	 */
	attachEditorListeners: function () {
		const promptEditor = document.getElementById('llm-prompt-editor');
		
		// Clone to remove old listeners
		const newEditor = promptEditor.cloneNode(true);
		promptEditor.parentNode.replaceChild(newEditor, promptEditor);
		
		const editor = document.getElementById('llm-prompt-editor');
		
		// Debounce the highlight function to prevent cursor jitter and focus loss
		let timeout;
		const debouncedHighlight = () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				this.highlightPromptVariables();
			}, 300); // 300ms delay
		};
		
		editor.addEventListener('input', () => {
			debouncedHighlight();
		});
		
		// Paste handler to strip HTML
		editor.addEventListener('paste', (e) => {
			e.preventDefault();
			const text = (e.originalEvent || e).clipboardData.getData('text/plain');
			document.execCommand('insertText', false, text);
		});
		
		// Tooltip delegation (Global Tooltip)
		editor.addEventListener('mouseover', (e) => {
			if (e.target.classList.contains('llm-var-tag')) {
				const preview = e.target.getAttribute('data-preview');
				this.showTooltip(e.target, preview);
			}
		});
		
		editor.addEventListener('mouseout', (e) => {
			if (e.target.classList.contains('llm-var-tag')) {
				this.hideTooltip();
			}
		});
		
		// JSON Schema Validation
		const schemaInput = document.getElementById('llm-json-schema');
		schemaInput.onblur = function() {
			try {
				JSON.parse(this.value);
				this.classList.remove('is-invalid');
			} catch (e) {
				this.classList.add('is-invalid');
			}
		};
		
		// Target Cell Validation
		const targetInput = document.getElementById('llm-target-cell');
		targetInput.oninput = function() {
			const val = this.value.toUpperCase();
			if (/^[A-Z]+[0-9]+$/.test(val)) {
				this.classList.remove('is-invalid');
			} else {
				this.classList.add('is-invalid');
			}
		};
	},
	
	/**
	 * Parse prompt text and wrap variables in spans
	 */
	highlightPromptVariables: function () {
		const editor = document.getElementById('llm-prompt-editor');
		if (!editor) return;
		
		// 1. Save Cursor Position (Character Offset)
		const selection = window.getSelection();
		let savedOffset = 0;
		if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
			const range = selection.getRangeAt(0);
			const preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(editor);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			savedOffset = preCaretRange.toString().length;
		}
		
		// 2. Get Text and Highlight
		const text = editor.innerText; // Gets visible text, ignoring HTML tags
		
		// Escape HTML
		let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		
		// Regex for Range (#A1:B2) or Single Cell (#A1)
		const regex = /#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi;
		
		html = html.replace(regex, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);
			// Store preview in data attribute, remove contenteditable="false" to allow typing
			return `<span class="llm-var-tag" data-preview="${preview.replace(/"/g, '&quot;')}">${match}</span>`;
		});
		
		// 3. Update HTML only if changed
		if (editor.innerHTML !== html) {
			editor.innerHTML = html;
			
			// 4. Restore Cursor Position
			try {
				const newRange = document.createRange();
				const sel = window.getSelection();
				let charIndex = 0;
				let rangeFound = false;
				
				// Helper to traverse text nodes
				function traverseNodes(node) {
					if (rangeFound) return;
					if (node.nodeType === 3) { // Text node
						const nextIndex = charIndex + node.length;
						if (savedOffset >= charIndex && savedOffset <= nextIndex) {
							newRange.setStart(node, savedOffset - charIndex);
							newRange.setEnd(node, savedOffset - charIndex);
							rangeFound = true;
						}
						charIndex = nextIndex;
					} else {
						for (let i = 0; i < node.childNodes.length; i++) {
							traverseNodes(node.childNodes[i]);
						}
					}
				}
				
				traverseNodes(editor);
				if (rangeFound) {
					sel.removeAllRanges();
					sel.addRange(newRange);
				} else {
					// Fallback: move to end
					const range = document.createRange();
					range.selectNodeContents(editor);
					range.collapse(false);
					sel.removeAllRanges();
					sel.addRange(range);
				}
			} catch (e) {
				console.warn('Cursor restore failed', e);
			}
		}
	},
	
	/**
	 * Get preview text for a cell or range
	 */
	getRangePreview: function(c1, r1, c2, r2) {
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		
		const getColIdx = (letter) => {
			let idx = 0;
			letter = letter.toUpperCase();
			for (let i = 0; i < letter.length; i++) {
				idx = idx * 26 + (letter.charCodeAt(i) - 64);
			}
			return idx - 1;
		};
		
		const startC = getColIdx(c1);
		const startR = parseInt(r1) - 1;
		
		// Helper to extract value from cell, handling Dropdowns
		const getCellValue = (r, c) => {
			const key = r + '-' + c;
			const cellData = sheet.cells[key];
			if (!cellData) return 'Empty';
			
			// Check for Dropdown Formula
			const text = cellData.text || '';
			const dropdownRegex = /^=dropdown\s*\(\s*"[^"]+"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
			const match = text.match(dropdownRegex);
			
			if (match) {
				// Return the selected value (group 1) or empty string if not selected
				return match[1] || '';
			}
			
			return text;
		};
		
		if (c2 && r2) {
			// Range Logic
			const endC = getColIdx(c2);
			const endR = parseInt(r2) - 1;
			
			const minC = Math.min(startC, endC);
			const maxC = Math.max(startC, endC);
			const minR = Math.min(startR, endR);
			const maxR = Math.max(startR, endR);
			
			let count = 0;
			let previewText = "";
			
			for(let r = minR; r <= maxR; r++) {
				for(let c = minC; c <= maxC; c++) {
					count++;
					if (count <= 3) {
						const val = getCellValue(r, c);
						previewText += `${val.substring(0, 20)}${val.length>20?'...':''}, `;
					}
				}
			}
			
			if (count > 3) previewText += `...and ${count - 3} more`;
			return `Range: ${count} cells\n${previewText}`;
		} else {
			// Single Cell Logic
			const val = getCellValue(startR, startC);
			return `${val}`;
		}
	},
	
	/**
	 * Show Global Tooltip
	 */
	showTooltip: function(target, text) {
		let tooltip = document.getElementById('llm-global-tooltip');
		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.id = 'llm-global-tooltip';
			tooltip.className = 'llm-var-tooltip-global';
			document.body.appendChild(tooltip);
		}
		tooltip.textContent = text;
		tooltip.style.display = 'block';
		
		const rect = target.getBoundingClientRect();
		// Position above the tag
		let top = rect.top - tooltip.offsetHeight - 5;
		let left = rect.left;
		
		// Flip if too close to top
		if (top < 0) {
			top = rect.bottom + 5;
		}
		
		tooltip.style.top = top + 'px';
		tooltip.style.left = left + 'px';
	},
	
	hideTooltip: function() {
		const tooltip = document.getElementById('llm-global-tooltip');
		if (tooltip) tooltip.style.display = 'none';
	},
	
	/**
	 * Fetch Models from OpenRouter via PHP Proxy
	 */
	fetchModels: function () {
		if (!SheetDataManager.currentFileName) {
			showCustomAlert('Please save your project first (Ctrl+S) to use LLM features.');
			return;
		}
		
		const btn = document.getElementById('refresh-models-btn');
		const icon = btn.querySelector('i');
		icon.classList.add('spin-anim');
		
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
					this.models = data.data.map(m => ({id: m.id, name: m.name}));
					localStorage.setItem('openrouter_models', JSON.stringify(this.models));
					this.populateModelSelect();
					showToast('Models list updated');
				} else {
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
		
		// Reset filter
		const filterInput = document.getElementById('llm-model-filter');
		if (filterInput) filterInput.value = '';
	},
	
	// --- NEW: Filter Models Logic ---
	filterModels: function (query) {
		const select = document.getElementById('llm-model-select');
		const options = select.querySelectorAll('option');
		const lowerQuery = query.toLowerCase();
		
		options.forEach(opt => {
			if (opt.value === '') return; // Skip placeholder
			const text = opt.textContent.toLowerCase();
			if (text.includes(lowerQuery)) {
				opt.style.display = '';
			} else {
				opt.style.display = 'none';
			}
		});
	},
	
	/**
	 * Insert/Save the LLM Formula into the cell
	 */
	insertFormula: function () {
		const prompt = document.getElementById('llm-prompt-editor').innerText;
		const model = document.getElementById('llm-model-select').value;
		const schema = document.getElementById('llm-json-schema').value;
		const targetStr = document.getElementById('llm-target-cell').value;
		const funcName = document.getElementById('llm-func-name').value || 'Run LLM';
		
		if (!prompt || !model || !targetStr) {
			showCustomAlert('Please fill in all required fields.');
			return;
		}
		
		try {
			JSON.parse(schema);
		} catch (e) {
			showCustomAlert('Invalid JSON Schema syntax: ' + e.message);
			document.getElementById('llm-json-schema').classList.add('is-invalid');
			return;
		}
		
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			showCustomAlert('No cell selected to place the button.');
			return;
		}
		const sourceRow = selected.parentElement.rowIndex - 1;
		const sourceCol = parseInt(selected.getAttribute('data-col'));
		
		const match = targetStr.match(/^([A-Z]+)([0-9]+)$/i);
		if (!match) {
			showCustomAlert('Invalid target cell format. Use A1, B2, etc.');
			document.getElementById('llm-target-cell').classList.add('is-invalid');
			return;
		}
		
		const colLetter = match[1].toUpperCase();
		const rowNum = parseInt(match[2]);
		
		let targetColIndex = 0;
		for (let i = 0; i < colLetter.length; i++) {
			targetColIndex = targetColIndex * 26 + (colLetter.charCodeAt(i) - 64);
		}
		targetColIndex -= 1;
		const targetRowIndex = rowNum - 1;
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = sourceRow + '-' + sourceCol;
		
		if (!sheet.cells[key]) {
			sheet.cells[key] = {};
		}
		
		sheet.cells[key].llm = {
			prompt: prompt,
			model: model,
			jsonSchema: schema,
			targetRow: targetRowIndex,
			targetCol: targetColIndex,
			funcName: funcName
		};
		
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
		if (event) event.stopPropagation();
		
		if (!SheetDataManager.currentFileName) {
			showCustomAlert('Please save your project first (Ctrl+S) to run LLM functions.');
			return;
		}
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;
		const cellData = sheet.cells[key];
		
		if (!cellData || !cellData.llm) return;
		
		const btn = document.querySelector(`.text-cell[data-col="${c}"]`).parentElement.parentElement.children[r].querySelector(`td[data-col="${c}"] .llm-run-btn`);
		const originalIcon = btn.innerHTML;
		btn.innerHTML = '<div class="llm-spinner"></div>';
		btn.disabled = true;
		
		const statusContainer = document.getElementById('status-llm-busy');
		const statusText = document.getElementById('status-llm-text');
		const targetName = SheetDataManager.getColumnLetter(cellData.llm.targetCol) + (cellData.llm.targetRow + 1);
		
		if (statusContainer) {
			statusContainer.style.display = 'flex';
			if (statusText) {
				statusText.textContent = `Running ${cellData.llm.model} -> ${targetName}...`;
			}
		}
		
		let finalPrompt = cellData.llm.prompt;
		
		// Regex for Range or Single Cell
		const regex = /#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi;
		
		finalPrompt = finalPrompt.replace(regex, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);
			// Remove the "Range: X cells" header for the actual prompt content
			return preview.replace(/^Range: \d+ cells\n/, '');
		});
		
		finalPrompt += '\n\nIMPORTANT: Respond ONLY with valid JSON matching this structure, repeat the structure for each result:\n' + cellData.llm.jsonSchema;
		
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
					{role: 'user', content: finalPrompt}
				]
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success && data.data) {
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
				if (btn) {
					btn.innerHTML = originalIcon;
					btn.disabled = false;
				}
				if (statusContainer) {
					statusContainer.style.display = 'none';
				}
			});
	},
	
	validateStructure: function (returnedData, schemaString) {
		try {
			const schema = JSON.parse(schemaString);
			const getKeys = (obj) => {
				if (Array.isArray(obj)) {
					if (obj.length > 0 && typeof obj[0] === 'object') {
						return Object.keys(obj[0]).sort();
					}
					return [];
				}
				if (typeof obj === 'object' && obj !== null) {
					return Object.keys(obj).sort();
				}
				return [];
			};
			
			const schemaKeys = getKeys(schema);
			const dataKeys = getKeys(returnedData);
			
			if (schemaKeys.length === 0) return true;
			
			if (JSON.stringify(schemaKeys) !== JSON.stringify(dataKeys)) {
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
			return true;
		}
	},
	
	parseAndInsert: function (jsonData, startR, startC, schemaString) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		let headers = [];
		try {
			const schema = JSON.parse(schemaString);
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
		
		if (headers.length > 0) {
			headers.forEach((header, idx) => {
				this.setCellValue(sheet, startR, startC + idx, header);
			});
			startR++;
		}
		
		let rowsToInsert = [];
		if (Array.isArray(jsonData)) {
			rowsToInsert = jsonData;
		} else if (typeof jsonData === 'object') {
			if (headers.length > 0) {
				rowsToInsert.push(jsonData);
			} else {
				const hasComplexValues = Object.values(jsonData).some(v => typeof v === 'object' && v !== null);
				if (!hasComplexValues) {
					Object.keys(jsonData).forEach(k => {
						rowsToInsert.push({key: k, value: jsonData[k]});
					});
				} else {
					rowsToInsert.push(jsonData);
				}
			}
		}
		
		rowsToInsert.forEach((rowObj, rOffset) => {
			const currentRow = startR + rOffset;
			if (typeof rowObj !== 'object' || rowObj === null) {
				this.setCellValue(sheet, currentRow, startC, rowObj);
			} else {
				if (headers.length > 0) {
					headers.forEach((key, idx) => {
						const currentCol = startC + idx;
						const val = rowObj[key];
						let valStr = (val === undefined || val === null) ? '' : val;
						if (typeof val === 'object') valStr = JSON.stringify(val);
						this.setCellValue(sheet, currentRow, currentCol, valStr);
					});
				} else {
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

document.addEventListener('DOMContentLoaded', function () {
	LLMManager.init();
});
