import { SheetDataManager } from '../cascade-prompt-data.js';
import { PropertyPanelManager } from './property-panel.js';
import { SelectionManager } from '../core/selection-manager.js';

export const CheckboxManager = {
	openCheckboxBuilder: function () {
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
			PropertyPanelManager.open('checkbox');

			const formulaInput = document.getElementById('formula-input');
			if (formulaInput) {
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const cellData = sheet.cells[`${targetR}-${targetC}`];
				if (!cellData || !cellData.type || cellData.type.name !== 'checkbox') {
					formulaInput.innerHTML = `<div class="formula-btn"><i class="bi bi-pencil-square"></i><span>=checkbox("",FALSE)</span></div>`;
					formulaInput.setAttribute('contenteditable', 'false');
					formulaInput.classList.add('pointer-cursor');
				}
			}
		});
	},

	initPanel: function() {
		SheetDataManager.propertyPanel.isModified = false;
		this.populatePanelData();
		this.registerEvents();
	},

	populatePanelData: function() {
		const labelInput = document.getElementById('prop-checkbox-label');
		const valueInput = document.getElementById('prop-checkbox-value');
		const targetDisplay = document.getElementById('prop-checkbox-target-display');

		if(!labelInput || !valueInput) return;

		let cellLabel = 'None';
		let initialLabel = 'Checkbox';
		let initialValue = 0;

		if (SheetDataManager.propertyPanel && SheetDataManager.propertyPanel.targetedCell) {
			const { r, c } = SheetDataManager.propertyPanel.targetedCell;
			if (r !== null && c !== null) {
				cellLabel = `${SheetDataManager.getColumnLetter(c)}${r + 1}`;
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const key = r + '-' + c;
				const cellData = sheet.cells[key];

				if (cellData && cellData.type && cellData.type.name === 'checkbox') {
					const details = cellData.type.details;
					initialLabel = details.label || '';
					initialValue = details.value || 0;
				}
			}
		}

		if (targetDisplay) targetDisplay.textContent = `Target: ${cellLabel}`;
		labelInput.value = initialLabel;
		valueInput.checked = initialValue === 1;
	},

	registerEvents: function() {
		const replaceElement = (id) => {
			const el = document.getElementById(id);
			if (el) {
				const newEl = el.cloneNode(true);
				el.parentNode.replaceChild(newEl, el);
				return newEl;
			}
			return null;
		};

		const labelInput = document.getElementById('prop-checkbox-label');
		const valueInput = document.getElementById('prop-checkbox-value');
		const btnSave = replaceElement('prop-btn-save-checkbox');
		const btnRemove = replaceElement('prop-btn-remove-checkbox');

		const markModified = () => {
			SheetDataManager.propertyPanel.isModified = true;
		};

		if (labelInput) labelInput.oninput = markModified;
		if (valueInput) valueInput.onchange = markModified;

		if (btnSave) btnSave.addEventListener('click', () => this.saveCheckbox());
		if (btnRemove) btnRemove.addEventListener('click', () => this.removeCheckbox());
	},

	saveCheckbox: function () {
		const labelInput = document.getElementById('prop-checkbox-label');
		const valueInput = document.getElementById('prop-checkbox-value');

		const label = labelInput.value.trim();
		const value = valueInput.checked ? 1 : 0;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const { r, c } = SheetDataManager.propertyPanel.targetedCell;
		if (r !== null && c !== null) {
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;

			if (!sheet.cells[key]) {
				sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
			}

			sheet.cells[key].type = {
				name: 'checkbox',
				details: {
					label: label,
					value: value
				}
			};

			delete sheet.cells[key].text;
			delete sheet.cells[key].html;
			delete sheet.cells[key].llm;

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
		}

		window.showToast('Checkbox Applied');
	},

	removeCheckbox: function () {
		const { r, c } = SheetDataManager.propertyPanel.targetedCell;
		if (r === null || c === null) return;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;

		if (sheet.cells[key]) {
			sheet.cells[key].type = {
				name: 'text',
				details: { value: '' }
			};
		}

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		SheetDataManager.propertyPanel.isModified = false;

		PropertyPanelManager.close();
		window.showToast('Checkbox Removed');
	},

	toggleCheckbox: function(r, c, isChecked) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = `${r}-${c}`;

		if (sheet.cells[key] && sheet.cells[key].type && sheet.cells[key].type.name === 'checkbox') {
			sheet.cells[key].type.details.value = isChecked ? 1 : 0;
			SheetDataManager.setModified(true);

			const selected = document.querySelector('.selected-cell');
			if (selected) {
				const selR = selected.parentElement.rowIndex - 1;
				const selC = parseInt(selected.getAttribute('data-col'));
				if (selR === r && selC === c) {
					SelectionManager.updateFormulaBar(r, c);
				}
			}

			if (SheetDataManager.propertyPanel && SheetDataManager.propertyPanel.targetedCell) {
				const target = SheetDataManager.propertyPanel.targetedCell;
				if (target.r === r && target.c === c) {
					const valueInput = document.getElementById('prop-checkbox-value');
					if (valueInput) {
						valueInput.checked = isChecked;
					}
				}
			}
		}
	}
};