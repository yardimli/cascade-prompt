import { SheetDataManager } from '../cascade-prompt-data.js';
import { getApiEndpoint } from '../api-config.js';

export const LLMBuilder = {
	models: [],
	init: function() {
		const cached = localStorage.getItem('openrouter_models');
		if (cached) this.models = JSON.parse(cached);
	},

	fetchModels: function() {
		if (!SheetDataManager.currentFileName) return window.showCustomAlert('Please save your project first (Ctrl+S).');
		const icon = document.querySelector('#refresh-models-btn i');
		icon.classList.add('animate-spin');
		fetch(getApiEndpoint('llm_proxy'), {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'models', filename: SheetDataManager.currentFileName })
		}).then(r => r.json()).then(data => {
			if (data.success && data.data) {
				this.models = data.data.map(m => ({ id: m.id, name: m.name }));
				localStorage.setItem('openrouter_models', JSON.stringify(this.models));
				this.populateModelSelect();
				window.showToast('Models list updated');
			} else window.showCustomAlert('Error fetching models: ' + data.message);
		}).catch(e => window.showCustomAlert('Failed to fetch models.')).finally(() => icon.classList.remove('animate-spin'));
	},

	populateModelSelect: function() {
		const datalist = document.getElementById('llm-models-datalist');
		datalist.innerHTML = '';
		this.models.forEach(m => {
			const opt = document.createElement('option');
			opt.value = m.id; opt.textContent = m.name || m.id;
			datalist.appendChild(opt);
		});
	},

	openFormulaBuilder: function() {
		const modal = document.getElementById('llmFormulaModal');
		const selected = document.querySelector('.selected-cell');
		this.populateModelSelect();

		// 1. Initialize Editor Content First
		let promptText = '', modelToSelect = '', isUpdate = false;
		const targetInput = document.getElementById('llm-target-cell');
		const schemaInput = document.getElementById('llm-json-schema');
		const funcNameInput = document.getElementById('llm-func-name');
		const headersCheckbox = document.getElementById('llm-include-headers');

		if (selected) {
			const r = selected.parentElement.rowIndex - 1, c = parseInt(selected.getAttribute('data-col'));
			const cell = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex].cells[`${r}-${c}`];
			if (cell && cell.type && cell.type.name === 'llm_formula') {
				isUpdate = true;
				const config = cell.type.details;
				promptText = config.prompt || '';
				schemaInput.value = config.jsonSchema || '';
				funcNameInput.value = config.funcName || 'Run LLM';
				targetInput.value = SheetDataManager.getColumnLetter(config.targetCol) + (config.targetRow + 1);
				modelToSelect = config.model || '';
				headersCheckbox.checked = !!config.includeHeaders;
				const radios = document.getElementsByName('llm-insert-mode');
				for (const r of radios) if (r.value === (config.insertMode || 'overwrite')) r.checked = true;
			} else {
				targetInput.value = SheetDataManager.getColumnLetter(c) + (r + 1);
				schemaInput.value = '{\n  "Key": "Value"\n}';
				funcNameInput.value = 'Run LLM';
				headersCheckbox.checked = false;
				document.getElementsByName('llm-insert-mode')[0].checked = true;
			}
		}

		document.getElementById('llm-modal-title').textContent = isUpdate ? 'Update LLM Formula' : 'Insert LLM Formula';
		document.getElementById('llm-save-btn').textContent = isUpdate ? 'Update' : 'Insert Formula';
		document.getElementById('llm-model-input').value = modelToSelect;

		// 2. Set content and parse existing tags (for loading saved formulas)
		const editor = document.getElementById('llm-prompt-editor');
		// FIX: Use textContent instead of innerText because the modal is hidden (display:none)
		// innerText returns "" on hidden elements, causing data loss.
		editor.textContent = promptText;

		this.highlightPromptVariables(editor); // Initial highlight pass

		// 3. Attach listeners
		this.attachEditorListeners();

		modal.showModal();
	},

	attachEditorListeners: function() {
		const editor = document.getElementById('llm-prompt-editor');
		// Cloning to remove old listeners
		const newEditor = editor.cloneNode(true);
		editor.parentNode.replaceChild(newEditor, editor);

		// --- NEW: Keydown Logic for Space/Enter ---
		newEditor.addEventListener('keydown', (e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				this.handleTagInsertion(e);
			}
		});

		// --- NEW: Click Logic to force cursor before tag ---
		newEditor.addEventListener('click', (e) => {
			if (e.target.classList.contains('llm-var-tag')) {
				const range = document.createRange();
				range.setStartBefore(e.target);
				range.collapse(true);
				const sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
			}
		});

		// Paste: Parse full text
		newEditor.addEventListener('paste', (e) => {
			e.preventDefault();
			const text = (e.originalEvent || e).clipboardData.getData('text/plain');
			document.execCommand('insertText', false, text);
			// Run a full highlight pass after paste
			setTimeout(() => this.highlightPromptVariables(newEditor), 0);
		});

		// Tooltips
		newEditor.addEventListener('mouseover', (e) => { if (e.target.classList.contains('llm-var-tag')) this.showTooltip(e.target, e.target.getAttribute('data-preview')); });
		newEditor.addEventListener('mouseout', (e) => { if (e.target.classList.contains('llm-var-tag')) this.hideTooltip(); });
	},

	handleTagInsertion: function(e) {
		const selection = window.getSelection();
		if (!selection.rangeCount) return;
		const range = selection.getRangeAt(0);
		const node = range.startContainer;

		// Only process if we are inside a text node
		if (node.nodeType === Node.TEXT_NODE) {
			const textBefore = node.textContent.slice(0, range.startOffset);
			// Regex to match #A1 or #A1:B2 at the end of the string
			const regex = /(#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?)$/i;
			const match = textBefore.match(regex);

			if (match) {
				e.preventDefault(); // Stop the actual space/enter insertion temporarily

				const fullMatch = match[0];
				const c1 = match[2], r1 = match[3], c2 = match[4], r2 = match[5];

				// 1. Remove the plain text pattern
				const startOffset = range.startOffset - fullMatch.length;
				node.deleteData(startOffset, fullMatch.length);

				// 2. Create the atomic tag element
				const tag = document.createElement('span');
				tag.className = 'llm-var-tag';
				tag.contentEditable = 'false'; // Makes it atomic (delete/arrow keys work correctly)
				tag.innerText = fullMatch;
				tag.setAttribute('data-preview', this.getRangePreview(c1, r1, c2, r2).replace(/"/g, '&quot;'));

				// 3. Insert the tag
				const insertRange = document.createRange();
				insertRange.setStart(node, startOffset);
				insertRange.collapse(true);
				insertRange.insertNode(tag);

				// 4. Insert the trigger character (Space or Newline) AFTER the tag
				// We use a non-breaking space if it's a space key to ensure caret visibility
				const spacerChar = e.key === 'Enter' ? '\n' : '\u00A0';
				const spacer = document.createTextNode(spacerChar);

				insertRange.setStartAfter(tag);
				insertRange.insertNode(spacer);

				// 5. Move Cursor After the spacer
				insertRange.setStartAfter(spacer);
				insertRange.collapse(true);
				selection.removeAllRanges();
				selection.addRange(insertRange);
			}
		}
	},

	// Modified to only run on initialization or paste, not every input
	highlightPromptVariables: function(editor) {
		if (!editor) return;
		// FIX: Use textContent instead of innerText.
		// innerText relies on layout and returns "" if the modal is hidden.
		const text = editor.textContent;

		// Simple HTML encoding
		let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

		// Replace patterns with the atomic span structure
		html = html.replace(/#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);
			// contenteditable="false" is key here
			return `<span class="llm-var-tag" contenteditable="false" data-preview="${preview.replace(/"/g, '&quot;')}">${match}</span>`;
		});

		if (editor.innerHTML !== html) editor.innerHTML = html;
	},

	getRangePreview: function(c1, r1, c2, r2) {
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const getColIdx = (l) => l.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
		const startC = getColIdx(c1), startR = parseInt(r1) - 1;

		const getVal = (r, c) => {
			const cell = sheet.cells[`${r}-${c}`];
			return (cell && cell.type && (cell.type.name === 'text' || cell.type.name === 'number')) ? cell.type.details.value : (cell?.type?.name === 'dropdown' ? cell.type.details.selected : 'Empty');
		};

		if (c2 && r2) {
			const endC = getColIdx(c2), endR = parseInt(r2) - 1;
			let count = 0, preview = "";
			for (let r = Math.min(startR, endR); r <= Math.max(startR, endR); r++) {
				for (let c = Math.min(startC, endC); c <= Math.max(startC, endC); c++) {
					count++;
					if (count <= 3) preview += `${getVal(r, c).substring(0, 20)}..., `;
				}
			}
			return `Range: ${count} cells\n${preview}`;
		}
		return `${getVal(startR, startC)}`;
	},

	// ... [showTooltip, hideTooltip, insertFormula remain unchanged] ...
	showTooltip: function(target, text) {
		let tooltip = document.getElementById('llm-global-tooltip');
		const modal = document.getElementById('llmFormulaModal');

		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.id = 'llm-global-tooltip';
			tooltip.className = 'llm-var-tooltip-global';
			if (modal) {
				modal.appendChild(tooltip);
			} else {
				document.body.appendChild(tooltip);
			}
		}

		tooltip.textContent = text;
		tooltip.style.display = 'block';

		const rect = target.getBoundingClientRect();
		const offsetParent = tooltip.offsetParent;

		let top = rect.top - tooltip.offsetHeight - 5;
		let left = rect.left;

		if (offsetParent && offsetParent !== document.body && offsetParent !== document.documentElement) {
			const parentRect = offsetParent.getBoundingClientRect();
			top -= parentRect.top;
			left -= parentRect.left;
		}

		tooltip.style.top = top + 'px';
		tooltip.style.left = left + 'px';
	},
	hideTooltip: function() { document.getElementById('llm-global-tooltip').style.display = 'none'; },
	insertFormula: function() {
		// FIX: Use textContent to get the clean text without HTML tags
		const prompt = document.getElementById('llm-prompt-editor').textContent;
		const model = document.getElementById('llm-model-input').value;
		const schema = document.getElementById('llm-json-schema').value;
		const targetStr = document.getElementById('llm-target-cell').value;
		const funcName = document.getElementById('llm-func-name').value || 'Run LLM';
		const includeHeaders = document.getElementById('llm-include-headers').checked;
		const insertMode = document.querySelector('input[name="llm-insert-mode"]:checked').value;

		if (!prompt || !model || !targetStr) return window.showCustomAlert('Please fill in all required fields.');
		try { JSON.parse(schema); } catch (e) { return window.showCustomAlert('Invalid JSON Schema.'); }

		const selected = document.querySelector('.selected-cell');
		if (!selected) return window.showCustomAlert('No cell selected.');

		const match = targetStr.match(/^([A-Z]+)([0-9]+)$/i);
		if (!match) return window.showCustomAlert('Invalid target cell format.');

		const colLetter = match[1].toUpperCase();
		let targetCol = 0;
		for (let i = 0; i < colLetter.length; i++) targetCol = targetCol * 26 + (colLetter.charCodeAt(i) - 64);
		targetCol -= 1;
		const targetRow = parseInt(match[2]) - 1;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		const r = selected.parentElement.rowIndex - 1, c = parseInt(selected.getAttribute('data-col'));
		const key = `${r}-${c}`;
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];

		if (!sheet.cells[key]) sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
		sheet.cells[key].type = {
			name: 'llm_formula',
			details: { prompt, model, jsonSchema: schema, targetRow, targetCol, funcName, includeHeaders, insertMode, component: 'button' }
		};
		delete sheet.cells[key].text; delete sheet.cells[key].html; delete sheet.cells[key].llm;

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		document.getElementById('llmFormulaModal').close();
		window.showToast('Formula Inserted');
	}
};