/**
 * LLM Manager
 * Handles LLM configuration, formula building, and execution.
 */

import { SheetDataManager } from './cascade-prompt-data.js';
import { getApiEndpoint } from './api-config.js';

export const LLMManager = {
	models: [],

	init: function () {
		const cachedModels = localStorage.getItem('openrouter_models');
		if (cachedModels) {
			this.models = JSON.parse(cachedModels);
		}
	},

	openSettings: function () {
		const modal = document.getElementById('llmSettingsModal');
		const apiKeyInput = document.getElementById('llm-api-key');
		const falKeyInput = document.getElementById('llm-fal-key');

		if (SheetDataManager.data.llmSettings) {
			apiKeyInput.value = SheetDataManager.data.llmSettings.apiKey || '';
			falKeyInput.value = SheetDataManager.data.llmSettings.falAiKey || '';
		} else {
			apiKeyInput.value = '';
			falKeyInput.value = '';
		}

		modal.showModal();
	},

	saveSettings: function () {
		const apiKeyInput = document.getElementById('llm-api-key');
		const falKeyInput = document.getElementById('llm-fal-key');

		const apiKey = apiKeyInput.value.trim();
		const falKey = falKeyInput.value.trim();

		if (!SheetDataManager.data.llmSettings) {
			SheetDataManager.data.llmSettings = {};
		}

		SheetDataManager.data.llmSettings.apiKey = apiKey;
		SheetDataManager.data.llmSettings.falAiKey = falKey;

		SheetDataManager.setModified(true);

		document.getElementById('llmSettingsModal').close();
		window.showToast('Settings Saved. Please Save Project (Ctrl+S).');
	},

	openFormulaBuilder: function () {
		const modal = document.getElementById('llmFormulaModal');
		const selected = document.querySelector('.selected-cell');

		const titleEl = document.getElementById('llm-modal-title');
		const btnEl = document.getElementById('llm-save-btn');
		const targetInput = document.getElementById('llm-target-cell');
		const modelInput = document.getElementById('llm-model-input');
		const schemaInput = document.getElementById('llm-json-schema');
		const funcNameInput = document.getElementById('llm-func-name');
		const headersCheckbox = document.getElementById('llm-include-headers');
		const modeRadios = document.getElementsByName('llm-insert-mode');

		this.populateModelSelect();
		this.attachEditorListeners();

		let promptText = '';
		let modelToSelect = '';
		let isUpdate = false;

		if (selected) {
			const r = selected.parentElement.rowIndex - 1;
			const c = parseInt(selected.getAttribute('data-col'));
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;
			const cell = sheet.cells[key];

			if (cell && cell.type && cell.type.name === 'llm_formula') {
				isUpdate = true;
				const config = cell.type.details;
				promptText = config.prompt || '';
				schemaInput.value = config.jsonSchema || '';
				funcNameInput.value = config.funcName || 'Run LLM';
				const targetLetter = SheetDataManager.getColumnLetter(config.targetCol);
				targetInput.value = targetLetter + (config.targetRow + 1);
				modelToSelect = config.model || '';
				headersCheckbox.checked = !!config.includeHeaders;

				const savedMode = config.insertMode || 'overwrite';
				for (const radio of modeRadios) {
					if (radio.value === savedMode) radio.checked = true;
				}
			} else {
				const letter = SheetDataManager.getColumnLetter(c);
				targetInput.value = letter + (r + 1);
				promptText = '';
				schemaInput.value = '{\n  "Key": "Value"\n}';
				funcNameInput.value = 'Run LLM';
				headersCheckbox.checked = false;
				modeRadios[0].checked = true;
			}
		}

		titleEl.textContent = isUpdate ? 'Update LLM Formula' : 'Insert LLM Formula';
		btnEl.textContent = isUpdate ? 'Update' : 'Insert Formula';
		document.getElementById('llm-prompt-editor').textContent = promptText;
		modelInput.value = modelToSelect;

		modal.showModal();
		this.highlightPromptVariables();
	},

	attachEditorListeners: function () {
		const promptEditor = document.getElementById('llm-prompt-editor');
		const newEditor = promptEditor.cloneNode(true);
		promptEditor.parentNode.replaceChild(newEditor, promptEditor);
		const editor = document.getElementById('llm-prompt-editor');

		let timeout;
		const debouncedHighlight = () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				this.highlightPromptVariables();
			}, 300);
		};

		editor.addEventListener('input', () => {
			debouncedHighlight();
		});

		editor.addEventListener('paste', (e) => {
			e.preventDefault();
			const text = (e.originalEvent || e).clipboardData.getData('text/plain');
			document.execCommand('insertText', false, text);
		});

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

		const schemaInput = document.getElementById('llm-json-schema');
		schemaInput.onblur = function () {
			try {
				JSON.parse(this.value);
				this.classList.remove('textarea-error');
			} catch (e) {
				this.classList.add('textarea-error');
			}
		};

		const targetInput = document.getElementById('llm-target-cell');
		targetInput.oninput = function () {
			const val = this.value.toUpperCase();
			if (/^[A-Z]+[0-9]+$/.test(val)) {
				this.classList.remove('input-error');
			} else {
				this.classList.add('input-error');
			}
		};
	},

	highlightPromptVariables: function () {
		const editor = document.getElementById('llm-prompt-editor');
		if (!editor) return;

		const selection = window.getSelection();
		let savedOffset = 0;
		if (selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
			const range = selection.getRangeAt(0);
			const preCaretRange = range.cloneRange();
			preCaretRange.selectNodeContents(editor);
			preCaretRange.setEnd(range.endContainer, range.endOffset);
			savedOffset = preCaretRange.toString().length;
		}

		const text = editor.innerText;
		let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		const regex = /#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi;

		html = html.replace(regex, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);
			return `<span class="llm-var-tag" data-preview="${preview.replace(/"/g, '&quot;')}">${match}</span>`;
		});

		if (editor.innerHTML !== html) {
			editor.innerHTML = html;
			try {
				const newRange = document.createRange();
				const sel = window.getSelection();
				let charIndex = 0;
				let rangeFound = false;

				function traverseNodes(node) {
					if (rangeFound) return;
					if (node.nodeType === 3) {
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

	getRangePreview: function (c1, r1, c2, r2) {
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

		const getCellValue = (r, c) => {
			const key = r + '-' + c;
			const cellData = sheet.cells[key];
			if (!cellData || !cellData.type) return 'Empty';

			const type = cellData.type;
			if (type.name === 'text' || type.name === 'number') {
				return type.details.value || '';
			}
			if (type.name === 'dropdown') {
				return type.details.selected || '';
			}
			return '';
		};

		if (c2 && r2) {
			const endC = getColIdx(c2);
			const endR = parseInt(r2) - 1;
			const minC = Math.min(startC, endC);
			const maxC = Math.max(startC, endC);
			const minR = Math.min(startR, endR);
			const maxR = Math.max(startR, endR);

			let count = 0;
			let previewText = "";

			for (let r = minR; r <= maxR; r++) {
				for (let c = minC; c <= maxC; c++) {
					count++;
					if (count <= 3) {
						const val = getCellValue(r, c);
						previewText += `${val.substring(0, 20)}${val.length > 20 ? '...' : ''}, `;
					}
				}
			}

			if (count > 3) previewText += `...and ${count - 3} more`;
			return `Range: ${count} cells\n${previewText}`;
		} else {
			const val = getCellValue(startR, startC);
			return `${val}`;
		}
	},

	showTooltip: function (target, text) {
		let tooltip = document.getElementById('llm-global-tooltip');
		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.id = 'llm-global-tooltip';
			tooltip.className = 'llm-var-tooltip-global';
			document.body.appendChild(tooltip);
		}

		const modal = document.getElementById('llmFormulaModal');
		if (modal && modal.hasAttribute('open') && tooltip.parentElement !== modal) {
			modal.appendChild(tooltip);
		} else if ((!modal || !modal.hasAttribute('open')) && tooltip.parentElement !== document.body) {
			document.body.appendChild(tooltip);
		}

		tooltip.textContent = text;
		tooltip.style.display = 'block';

		const rect = target.getBoundingClientRect();
		let top = rect.top - tooltip.offsetHeight - 5;
		let left = rect.left;

		if (top < 10) top = rect.bottom + 5;
		if (left + tooltip.offsetWidth > window.innerWidth) {
			left = window.innerWidth - tooltip.offsetWidth - 10;
		}

		tooltip.style.top = top + 'px';
		tooltip.style.left = left + 'px';
	},

	hideTooltip: function () {
		const tooltip = document.getElementById('llm-global-tooltip');
		if (tooltip) tooltip.style.display = 'none';
	},

	fetchModels: function () {
		if (!SheetDataManager.currentFileName) {
			window.showCustomAlert('Please save your project first (Ctrl+S) to use LLM features.');
			return;
		}

		const btn = document.getElementById('refresh-models-btn');
		const icon = btn.querySelector('i');
		icon.classList.add('animate-spin');

		fetch(getApiEndpoint('llm_proxy'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
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
					window.showToast('Models list updated');
				} else {
					window.showCustomAlert('Error fetching models: ' + (data.message || 'Unknown error'));
				}
			})
			.catch(err => {
				console.error(err);
				window.showCustomAlert('Failed to fetch models. Check console.');
			})
			.finally(() => {
				icon.classList.remove('animate-spin');
			});
	},

	populateModelSelect: function () {
		const datalist = document.getElementById('llm-models-datalist');
		datalist.innerHTML = '';

		this.models.forEach(m => {
			const opt = document.createElement('option');
			opt.value = m.id;
			opt.textContent = m.name || m.id;
			datalist.appendChild(opt);
		});
	},

	insertFormula: function () {
		const prompt = document.getElementById('llm-prompt-editor').innerText;
		const model = document.getElementById('llm-model-input').value;
		const schema = document.getElementById('llm-json-schema').value;
		const targetStr = document.getElementById('llm-target-cell').value;
		const funcName = document.getElementById('llm-func-name').value || 'Run LLM';

		const includeHeaders = document.getElementById('llm-include-headers').checked;
		const insertMode = document.querySelector('input[name="llm-insert-mode"]:checked').value;

		if (!prompt || !model || !targetStr) {
			window.showCustomAlert('Please fill in all required fields.');
			return;
		}

		try {
			JSON.parse(schema);
		} catch (e) {
			window.showCustomAlert('Invalid JSON Schema syntax: ' + e.message);
			document.getElementById('llm-json-schema').classList.add('textarea-error');
			return;
		}

		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			window.showCustomAlert('No cell selected to place the button.');
			return;
		}
		const sourceRow = selected.parentElement.rowIndex - 1;
		const sourceCol = parseInt(selected.getAttribute('data-col'));

		const match = targetStr.match(/^([A-Z]+)([0-9]+)$/i);
		if (!match) {
			window.showCustomAlert('Invalid target cell format. Use A1, B2, etc.');
			document.getElementById('llm-target-cell').classList.add('input-error');
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

		if (targetRowIndex === sourceRow && targetColIndex === sourceCol) {
			window.showCustomAlert('Target cell cannot be the same as the button cell.');
			document.getElementById('llm-target-cell').classList.add('input-error');
			return;
		}

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = sourceRow + '-' + sourceCol;

		if (!sheet.cells[key]) {
			sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
		}

		sheet.cells[key].type = {
			name: 'llm_formula',
			details: {
				prompt: prompt,
				model: model,
				jsonSchema: schema,
				targetRow: targetRowIndex,
				targetCol: targetColIndex,
				funcName: funcName,
				includeHeaders: includeHeaders,
				insertMode: insertMode,
				component: 'button'
			}
		};

		delete sheet.cells[key].llm;
		delete sheet.cells[key].text;
		delete sheet.cells[key].html;

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);

		document.getElementById('llmFormulaModal').close();
		window.showToast(document.getElementById('llm-save-btn').textContent === 'Update' ? 'Formula Updated' : 'Formula Inserted');
	},

	executeLLM: function (r, c, event) {
		if (event) event.stopPropagation();

		if (!SheetDataManager.currentFileName) {
			window.showCustomAlert('Please save your project first (Ctrl+S) to run LLM functions.');
			return;
		}

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;
		const cellData = sheet.cells[key];

		if (!cellData || !cellData.type || cellData.type.name !== 'llm_formula') return;

		const config = cellData.type.details;

		const btn = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"] .llm-run-btn`);
		const originalIcon = btn.innerHTML;
		btn.innerHTML = '<div class="llm-spinner"></div>';
		btn.disabled = true;

		const statusContainer = document.getElementById('status-llm-busy');
		const statusText = document.getElementById('status-llm-text');
		const targetName = SheetDataManager.getColumnLetter(config.targetCol) + (config.targetRow + 1);

		if (statusContainer) {
			statusContainer.style.display = 'flex';
			if (statusText) statusText.textContent = `Running ${config.model} -> ${targetName}...`;
		}

		let finalPrompt = config.prompt;
		const regex = /#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi;
		finalPrompt = finalPrompt.replace(regex, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);
			return preview.replace(/^Range: \d+ cells\n/, '');
		});

		finalPrompt += '\n\nIMPORTANT: Respond ONLY with valid JSON matching this structure:\n' + config.jsonSchema;

		fetch(getApiEndpoint('llm_proxy'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				action: 'chat',
				filename: SheetDataManager.currentFileName,
				model: config.model,
				messages: [{ role: 'user', content: finalPrompt }]
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success && data.data) {
					// RESTORED: Validate structure before inserting
					const isValid = this.validateStructure(data.data, config.jsonSchema);
					if (isValid) {
						this.parseAndInsert(
							data.data,
							config.targetRow,
							config.targetCol,
							config.jsonSchema,
							config.includeHeaders,
							config.insertMode
						);
						if (data.usage) {
							console.log('Token Usage:', data.usage);
						}
					} else {
						window.showCustomAlert('LLM returned data that does not match the expected JSON schema.');
						console.warn('Schema mismatch. Data:', data.data, 'Schema:', config.jsonSchema);
					}
				} else {
					window.showCustomAlert('LLM Error: ' + (data.message || 'Unknown error'));
				}
			})
			.catch(err => window.showCustomAlert('Error: ' + err.message))
			.finally(() => {
				if (btn) { btn.innerHTML = originalIcon; btn.disabled = false; }
				if (statusContainer) statusContainer.style.display = 'none';
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

	parseAndInsert: function (jsonData, startR, startC, schemaString, includeHeaders, insertMode) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];

		let actualStartR = startR;

		if (insertMode === 'append') {
			let r = startR;
			while (r < sheet.rowCount) {
				const key = r + '-' + startC;
				const cell = sheet.cells[key];
				if (!cell || !cell.type || (cell.type.name === 'text' && !cell.type.details.value)) {
					actualStartR = r;
					break;
				}
				r++;
			}
			if (r >= sheet.rowCount) actualStartR = sheet.rowCount;
		}

		let headers = [];
		try {
			const schema = JSON.parse(schemaString);
			const getKeys = (obj) => {
				if (Array.isArray(obj)) {
					if (obj.length > 0 && typeof obj[0] === 'object') return Object.keys(obj[0]);
					return [];
				}
				if (typeof obj === 'object' && obj !== null) return Object.keys(obj);
				return [];
			};
			headers = getKeys(schema);
		} catch (e) {
			console.warn('Could not parse schema for headers', e);
		}

		let currentRow = actualStartR;

		if (includeHeaders && headers.length > 0) {
			headers.forEach((header, idx) => {
				this.setCellValue(sheet, currentRow, startC + idx, header);
			});
			currentRow++;
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
						rowsToInsert.push({ key: k, value: jsonData[k] });
					});
				} else {
					rowsToInsert.push(jsonData);
				}
			}
		}

		rowsToInsert.forEach((rowObj) => {
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
			currentRow++;
		});

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		window.showToast('LLM Data Inserted');
	},

	setCellValue: function (sheet, r, c, val) {
		const key = r + '-' + c;
		if (!sheet.cells[key]) {
			sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
		}

		sheet.cells[key].type = {
			name: 'text',
			details: {
				value: String(val)
			}
		};

		delete sheet.cells[key].text;
		delete sheet.cells[key].html;
		delete sheet.cells[key].llm;
	}
};