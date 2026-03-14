import { SheetDataManager } from '../cascade-prompt-data.js';
import { getApiEndpoint } from '../api-config.js';
import { PropertyPanelManager } from '../ui/property-panel.js';

export const LLMBuilder = {
	models:[],
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
		if (!datalist) return;
		datalist.innerHTML = '';
		this.models.forEach(m => {
			const opt = document.createElement('option');
			opt.value = m.id; opt.textContent = m.name || m.id;
			datalist.appendChild(opt);
		});
	},

	openFormulaBuilder: function() {
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please select a cell first.');
			}
			return;
		}

		const targetR = selected.parentElement.rowIndex - 1;
		const targetC = parseInt(selected.getAttribute('data-col'));

		PropertyPanelManager.checkAndProceed(() => {
			if (!SheetDataManager.propertyPanel) {
				SheetDataManager.propertyPanel = { targetedCell: { r: null, c: null }, isModified: false };
			}

			SheetDataManager.propertyPanel.targetedCell = { r: targetR, c: targetC };
			PropertyPanelManager.open('llm');
		});
	},

	initPanel: function() {
		SheetDataManager.propertyPanel.isModified = false;
		this.populateModelSelect();
		this.populatePanelData();
		this.registerEvents();
	},

	populatePanelData: function() {
		const targetInput = document.getElementById('llm-target-cell');
		const schemaInput = document.getElementById('llm-json-schema');
		const funcNameInput = document.getElementById('llm-func-name');
		const headersCheckbox = document.getElementById('llm-include-headers');
		const targetDisplay = document.getElementById('prop-llm-target-display');

		let cellLabel = 'None';
		let promptText = '', modelToSelect = '', isUpdate = false;

		if (SheetDataManager.propertyPanel && SheetDataManager.propertyPanel.targetedCell) {
			const { r, c } = SheetDataManager.propertyPanel.targetedCell;
			if (r !== null && c !== null) {
				cellLabel = `${SheetDataManager.getColumnLetter(c)}${r + 1}`;
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const cell = sheet.cells[`${r}-${c}`];

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
					for (const radio of radios) if (radio.value === (config.insertMode || 'overwrite')) radio.checked = true;
				} else {
					targetInput.value = SheetDataManager.getColumnLetter(c) + (r + 1);
					schemaInput.value = '{\n  "Key": "Value"\n}';
					funcNameInput.value = 'Run LLM';
					headersCheckbox.checked = false;
					document.getElementsByName('llm-insert-mode')[0].checked = true;
				}
			}
		}

		if (targetDisplay) targetDisplay.textContent = `LLM Trigger Target: ${cellLabel}`;
		document.getElementById('llm-model-input').value = modelToSelect;

		const editor = document.getElementById('llm-prompt-editor');
		editor.textContent = promptText;

		this.highlightPromptVariables(editor);
		this.attachEditorListeners();
	},

	registerEvents: function() {
		const markModified = () => {
			SheetDataManager.propertyPanel.isModified = true;
		};

		const inputs =['llm-model-input', 'llm-target-cell', 'llm-func-name', 'llm-json-schema'];
		inputs.forEach(id => {
			const el = document.getElementById(id);
			if (el) {
				el.oninput = markModified;
				el.onchange = markModified;
			}
		});

		const headersCheckbox = document.getElementById('llm-include-headers');
		if (headersCheckbox) headersCheckbox.onchange = markModified;

		document.getElementsByName('llm-insert-mode').forEach(el => el.onchange = markModified);

		const editor = document.getElementById('llm-prompt-editor');
		if (editor) editor.addEventListener('input', markModified);

		const replaceElement = (id) => {
			const el = document.getElementById(id);
			if (el) {
				const newEl = el.cloneNode(true);
				el.parentNode.replaceChild(newEl, el);
				return newEl;
			}
			return null;
		};

		const btnSave = replaceElement('prop-btn-save-llm');
		const btnRemove = replaceElement('prop-btn-remove-llm');

		if (btnSave) btnSave.addEventListener('click', () => this.insertFormula());
		if (btnRemove) btnRemove.addEventListener('click', () => this.removeFormula());
	},

	attachEditorListeners: function() {
		const editor = document.getElementById('llm-prompt-editor');

		const newEditor = editor.cloneNode(true);
		editor.parentNode.replaceChild(newEditor, editor);

		newEditor.addEventListener('keydown', (e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				this.handleTagInsertion(e);
			}
		});

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

		newEditor.addEventListener('paste', (e) => {
			e.preventDefault();
			const text = (e.originalEvent || e).clipboardData.getData('text/plain');
			document.execCommand('insertText', false, text);

			setTimeout(() => this.highlightPromptVariables(newEditor), 0);
		});

		newEditor.addEventListener('mouseover', (e) => {
			if (e.target.classList.contains('llm-var-tag')) {

				const previewText = e.target.getAttribute('data-preview');
				if (previewText && previewText.trim() !== '') {
					this.showTooltip(e.target, previewText);
				}
			}
		});
		newEditor.addEventListener('mouseout', (e) => { if (e.target.classList.contains('llm-var-tag')) this.hideTooltip(); });
	},

	handleTagInsertion: function(e) {
		const selection = window.getSelection();
		if (!selection.rangeCount) return;
		const range = selection.getRangeAt(0);
		const node = range.startContainer;

		if (node.nodeType === Node.TEXT_NODE) {
			const textBefore = node.textContent.slice(0, range.startOffset);

			const regex = /(#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?)$/i;
			const match = textBefore.match(regex);

			if (match) {
				e.preventDefault();

				const fullMatch = match[0];
				const c1 = match[2], r1 = match[3], c2 = match[4], r2 = match[5];

				const startOffset = range.startOffset - fullMatch.length;
				node.deleteData(startOffset, fullMatch.length);

				const tag = document.createElement('span');
				tag.className = 'llm-var-tag';
				tag.contentEditable = 'false';
				tag.innerText = fullMatch;
				tag.setAttribute('data-preview', this.getRangePreview(c1, r1, c2, r2).replace(/"/g, '&quot;'));

				const insertRange = document.createRange();
				insertRange.setStart(node, startOffset);
				insertRange.collapse(true);
				insertRange.insertNode(tag);

				const spacerChar = e.key === 'Enter' ? '\n' : '\u00A0';
				const spacer = document.createTextNode(spacerChar);

				insertRange.setStartAfter(tag);
				insertRange.insertNode(spacer);

				insertRange.setStartAfter(spacer);
				insertRange.collapse(true);
				selection.removeAllRanges();
				selection.addRange(insertRange);
			}
		}
	},

	highlightPromptVariables: function(editor) {
		if (!editor) return;

		const text = editor.textContent;

		let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

		html = html.replace(/#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi, (match, c1, r1, c2, r2) => {
			const preview = this.getRangePreview(c1, r1, c2, r2);

			return `<span class="llm-var-tag" contenteditable="false" data-preview="${preview.replace(/"/g, '&quot;')}">${match}</span>`;
		});

		if (editor.innerHTML !== html) editor.innerHTML = html;
	},

	getRangePreview: function(c1, r1, c2, r2, isPreview = true) {
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const getColIdx = (l) => l.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
		const startC = getColIdx(c1), startR = parseInt(r1) - 1;

		const getVal = (r, c) => {
			const cell = sheet.cells[`${r}-${c}`];

			let val = (cell && cell.type && (cell.type.name === 'text' || cell.type.name === 'number')) ? cell.type.details.value : (cell?.type?.name === 'dropdown' ? cell.type.details.selected : '');
			return val !== undefined && val !== null ? String(val) : '';
		};

		if (c2 && r2) {
			const endC = getColIdx(c2), endR = parseInt(r2) - 1;
			let count = 0;
			let vals =[];
			for (let r = Math.min(startR, endR); r <= Math.max(startR, endR); r++) {
				for (let c = Math.min(startC, endC); c <= Math.max(startC, endC); c++) {
					count++;
					const val = getVal(r, c);
					if (val !== '') {
						if (isPreview) {
							if (vals.length < 3) {
								vals.push(val.length > 20 ? val.substring(0, 20) + '...' : val);
							}
						} else {
							vals.push(val);
						}
					}
				}
			}
			if (isPreview) {
				let previewText = vals.join(', ');
				if (count > 3) {
					previewText += previewText ? ', ...' : '...';
				}
				return `Range: ${count} cells\n${previewText}`;
			} else {
				return vals.join(', ');
			}
		}
		return `${getVal(startR, startC)}`;
	},

	showTooltip: function(target, text) {
		let tooltip = document.getElementById('llm-global-tooltip');
		const panel = document.getElementById('property-panel');

		if (!tooltip) {
			tooltip = document.createElement('div');
			tooltip.id = 'llm-global-tooltip';
			tooltip.className = 'llm-var-tooltip-global';
			if (panel) {
				panel.appendChild(tooltip);
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
		const prompt = document.getElementById('llm-prompt-editor').textContent;
		const model = document.getElementById('llm-model-input').value;
		const schema = document.getElementById('llm-json-schema').value;
		const targetStr = document.getElementById('llm-target-cell').value;
		const funcName = document.getElementById('llm-func-name').value || 'Run LLM';
		const includeHeaders = document.getElementById('llm-include-headers').checked;
		const insertMode = document.querySelector('input[name="llm-insert-mode"]:checked').value;

		if (!prompt || !model || !targetStr) return window.showCustomAlert('Please fill in all required fields.');
		try { JSON.parse(schema); } catch (e) { return window.showCustomAlert('Invalid JSON Schema.'); }

		const match = targetStr.match(/^([A-Z]+)([0-9]+)$/i);
		if (!match) return window.showCustomAlert('Invalid target cell format.');

		const colLetter = match[1].toUpperCase();
		let targetCol = 0;
		for (let i = 0; i < colLetter.length; i++) targetCol = targetCol * 26 + (colLetter.charCodeAt(i) - 64);
		targetCol -= 1;
		const targetRow = parseInt(match[2]) - 1;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const { r, c } = SheetDataManager.propertyPanel.targetedCell;
		if (r === null || c === null) return;

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
		SheetDataManager.propertyPanel.isModified = false;

		setTimeout(() => {
			const targetCellDom = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
			const currentSelected = document.querySelector('.selected-cell');

			let isSelected = false;
			if (currentSelected) {
				const curR = currentSelected.parentElement.rowIndex - 1;
				const curC = parseInt(currentSelected.getAttribute('data-col'));
				if (curR === r && curC === c) isSelected = true;
			}

			if (targetCellDom && !isSelected) {
				targetCellDom.classList.add('blink-border');
				setTimeout(() => targetCellDom.classList.remove('blink-border'), 1200);
			}
		}, 0);

		window.showToast('Formula Applied');
	},

	removeFormula: function() {
		const { r, c } = SheetDataManager.propertyPanel.targetedCell;
		if (r === null || c === null) return;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;

		if (sheet.cells[key]) {
			let currentVal = '';
			if (sheet.cells[key].type && sheet.cells[key].type.name === 'llm_formula') {
				currentVal = sheet.cells[key].type.details.funcName || 'Run LLM';
			}

			sheet.cells[key].type = {
				name: 'text',
				details: { value: currentVal }
			};
		}

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		SheetDataManager.propertyPanel.isModified = false;

		PropertyPanelManager.close();
		window.showToast('Formula Removed');
	}
};