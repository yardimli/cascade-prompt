import { SheetDataManager } from '../cascade-prompt-data.js';
import { PropertyPanelManager } from './property-panel.js';

export const DropdownManager = {
	// Called when clicking the button or formula bar
	openDropdownBuilder: function () {
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please select a cell first.');
			}
			return;
		}

		// Open the panel
		PropertyPanelManager.open('dropdown');
	},

	// Called by PropertyPanelManager after rendering HTML
	populatePanelData: function() {
		const selected = document.querySelector('.selected-cell');
		if (!selected) return;

		const optionsInput = document.getElementById('prop-dropdown-options');
		const selectionInput = document.getElementById('prop-dropdown-selection');

		if(!optionsInput || !selectionInput) return;

		optionsInput.value = '';
		selectionInput.innerHTML = '<option value="">(None)</option>';
		selectionInput.value = '';

		const r = selected.parentElement.rowIndex - 1;
		const c = parseInt(selected.getAttribute('data-col'));
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;
		const cellData = sheet.cells[key];

		if (cellData && cellData.type && cellData.type.name === 'dropdown') {
			const details = cellData.type.details;
			const options = details.options || [];
			const currentSelection = details.selected || '';

			optionsInput.value = options.join('\n');
			this.updateSelectionPreview(options, currentSelection);
		}
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

		if (!selectedValue) selectedValue = selectionInput.value;

		selectionInput.innerHTML = '<option value="">(None)</option>';

		options.forEach(opt => {
			const optionEl = document.createElement('option');
			optionEl.value = opt;
			optionEl.textContent = opt;
			if (opt === selectedValue) optionEl.selected = true;
			selectionInput.appendChild(optionEl);
		});
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

		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const r = selectedCell.parentElement.rowIndex - 1;
			const c = parseInt(selectedCell.getAttribute('data-col'));

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

			setTimeout(() => {
				const newCell = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
				if (newCell && typeof window.highlightCell === 'function') {
					window.highlightCell(newCell);
				}
			}, 0);
		}

		window.showToast('Dropdown Applied');
		// We do NOT close the panel automatically on save, allowing quick edits.
	},

	removeDropdown: function () {
		const selectedCell = document.querySelector('.selected-cell');
		if (!selectedCell) return;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const r = selectedCell.parentElement.rowIndex - 1;
		const c = parseInt(selectedCell.getAttribute('data-col'));

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

		PropertyPanelManager.close();
	}
};