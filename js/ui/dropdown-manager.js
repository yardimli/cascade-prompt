import { SheetDataManager } from '../cascade-prompt-data.js';
import { PropertyPanelManager } from './property-panel.js';

export const DropdownManager = {
	openDropdownBuilder: function () {
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
			PropertyPanelManager.open('dropdown');

			const formulaInput = document.getElementById('formula-input');
			if (formulaInput) {
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const cellData = sheet.cells[`${targetR}-${targetC}`];
				if (!cellData || !cellData.type || cellData.type.name !== 'dropdown') {
					formulaInput.innerHTML = `<div class="formula-btn"><i class="bi bi-pencil-square"></i><span>=dropdown("","")</span></div>`;
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
		const optionsInput = document.getElementById('prop-dropdown-options');
		const selectionInput = document.getElementById('prop-dropdown-selection');
		const targetDisplay = document.getElementById('prop-dropdown-target-display');

		if(!optionsInput || !selectionInput) return;

		let cellLabel = 'None';
		if (SheetDataManager.propertyPanel && SheetDataManager.propertyPanel.targetedCell) {
			const { r, c } = SheetDataManager.propertyPanel.targetedCell;
			if (r !== null && c !== null) {
				const letter = SheetDataManager.getColumnLetter(c);
				cellLabel = `${letter}${r + 1}`;
			}
		}
		if (targetDisplay) targetDisplay.textContent = `Target: ${cellLabel}`;

		optionsInput.value = '';

		let initialOptions = [];
		let initialSelection = '';

		if (SheetDataManager.propertyPanel && SheetDataManager.propertyPanel.targetedCell) {
			const { r, c } = SheetDataManager.propertyPanel.targetedCell;
			if (r !== null && c !== null) {
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const key = r + '-' + c;
				const cellData = sheet.cells[key];

				if (cellData && cellData.type && cellData.type.name === 'dropdown') {
					const details = cellData.type.details;
					initialOptions = details.options || [];
					initialSelection = details.selected || '';
					optionsInput.value = initialOptions.join('\n');
				}
			}
		}

		this.updateSelectionPreview(initialOptions, initialSelection);
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

		const optionsInput = document.getElementById('prop-dropdown-options');
		const selectionInput = document.getElementById('prop-dropdown-selection');
		const btnSave = replaceElement('prop-btn-save');
		const btnRemove = replaceElement('prop-btn-remove');

		const markModified = () => {
			SheetDataManager.propertyPanel.isModified = true;
		};

		if (optionsInput) {
			optionsInput.oninput = () => {
				this.updateSelectionPreview();
				markModified();
			};
		}

		if (selectionInput) {
			selectionInput.onchange = () => {
				markModified();
			};
		}

		if (btnSave) btnSave.addEventListener('click', () => this.saveDropdown());
		if (btnRemove) btnRemove.addEventListener('click', () => this.removeDropdown());
	},

	updateSelectionPreview: function (optionsArray = null, selectedValue = '') {
		const optionsInput = document.getElementById('prop-dropdown-options');
		const selectionInput = document.getElementById('prop-dropdown-selection');

		if(!optionsInput || !selectionInput) return;

		let options = optionsArray;
		if (!options) {
			const text = optionsInput.value;
			options = text.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');
		}

		if (!selectedValue && selectionInput.value) {
			selectedValue = selectionInput.value;
		}

		selectionInput.innerHTML = '';

		if (options.length === 0) {
			selectionInput.disabled = true;
			const placeholder = document.createElement('option');
			placeholder.text = "(No options)";
			selectionInput.add(placeholder);
			return;
		}

		selectionInput.disabled = false;

		options.forEach(opt => {
			const optionEl = document.createElement('option');
			optionEl.value = opt;
			optionEl.textContent = opt;
			selectionInput.appendChild(optionEl);
		});

		if (selectedValue && options.includes(selectedValue)) {
			selectionInput.value = selectedValue;
		} else {
			selectionInput.value = options[0];
		}
	},

	saveDropdown: function () {
		const optionsInput = document.getElementById('prop-dropdown-options');
		const selectionInput = document.getElementById('prop-dropdown-selection');

		const text = optionsInput.value;
		const options = text.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');

		const selected = selectionInput.value;

		if (options.length === 0) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please enter at least one option.');
			}
			return;
		}

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const { r, c } = SheetDataManager.propertyPanel.targetedCell;
		if (r !== null && c !== null) {
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;

			if (!sheet.cells[key]) {
				sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
			}

			sheet.cells[key].type = {
				name: 'dropdown',
				details: {
					options: options,
					selected: selected
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

		window.showToast('Dropdown Applied');
	},

	removeDropdown: function () {
		const { r, c } = SheetDataManager.propertyPanel.targetedCell;
		if (r === null || c === null) return;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;

		if (sheet.cells[key]) {
			let currentVal = '';
			if (sheet.cells[key].type && sheet.cells[key].type.name === 'dropdown') {
				currentVal = sheet.cells[key].type.details.selected || '';
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
		window.showToast('Dropdown Removed');
	}
};