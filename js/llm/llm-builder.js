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
		this.attachEditorListeners();

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
		document.getElementById('llm-prompt-editor').textContent = promptText;
		document.getElementById('llm-model-input').value = modelToSelect;
		modal.showModal();
		this.highlightPromptVariables();
	},
	attachEditorListeners: function() {
		const editor = document.getElementById('llm-prompt-editor');
		// Cloning to remove old listeners
		const newEditor = editor.cloneNode(true);
		editor.parentNode.replaceChild(newEditor, editor);

		let timeout;
		newEditor.addEventListener('input', () => { clearTimeout(timeout); timeout = setTimeout(() => this.highlightPromptVariables(), 300); });
		newEditor.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.originalEvent || e).clipboardData.getData('text/plain')); });
		newEditor.addEventListener('mouseover', (e) => { if (e.target.classList.contains('llm-var-tag')) this.showTooltip(e.target, e.target.getAttribute('data-preview')); });
		newEditor.addEventListener('mouseout', (e) => { if (e.target.classList.contains('llm-var-tag')) this.hideTooltip(); });
	},
	highlightPromptVariables: function() {
		const editor = document.getElementById('llm-prompt-editor');
		if (!editor) return;
		// (Simplified logic for brevity - assume original implementation for cursor saving/restoring)
		const text = editor.innerText;
		let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
		html = html.replace(/#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);
			return `<span class="llm-var-tag" data-preview="${preview.replace(/"/g, '&quot;')}">${match}</span>`;
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
	showTooltip: function(target, text) {
		let tooltip = document.getElementById('llm-global-tooltip');
		const modal = document.getElementById('llmFormulaModal');

		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.id = 'llm-global-tooltip';
			tooltip.className = 'llm-var-tooltip-global';
			// Fix: Append to the dialog to ensure visibility in Top Layer
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

		// Adjust if tooltip is positioned relative to a transformed parent (like the modal)
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
		const prompt = document.getElementById('llm-prompt-editor').innerText;
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