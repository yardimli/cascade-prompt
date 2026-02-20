import { SheetDataManager } from '../cascade-prompt-data.js';

export const DropdownManager = {
	openDropdownBuilder: function () {
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please select a cell first.');
			}
			return;
		}

		const modal = document.getElementById('dropdownModal');
		const optionsInput = document.getElementById('dropdown-options');
		const selectionInput = document.getElementById('dropdown-selection');

		optionsInput.value = '';
		selectionInput.innerHTML = '<option value="">(None)</option>';
		selectionInput.value = '';

		// --- CHANGED: Read from State instead of data-formula ---
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

		modal.showModal();
	},

	updateSelectionPreview: function (optionsArray = null, selectedValue = '') {
		const optionsInput = document.getElementById('dropdown-options');
		const selectionInput = document.getElementById('dropdown-selection');

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
		const optionsInput = document.getElementById('dropdown-options');
		const selectionInput = document.getElementById('dropdown-selection');

		// 1. Parse options from textarea (split by newline or comma)
		const text = optionsInput.value;
		const options = text.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');
		const selected = selectionInput.value;

		if (options.length === 0) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please enter at least one option.');
			}
			return;
		}

		// 2. Record history state before change
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const r = selectedCell.parentElement.rowIndex - 1;
			const c = parseInt(selectedCell.getAttribute('data-col'));

			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;

			// 3. Initialize cell object if it doesn't exist
			if (!sheet.cells[key]) {
				sheet.cells[key] = {
					rowspan: 1,
					colspan: 1,
					style: {},
					cellStyle: {}
				};
			}

			// 4. Update to the NEW JSON STRUCTURE
			sheet.cells[key].type = {
				name: 'dropdown',
				details: {
					options: options, // Saved as an array
					selected: selected  // Saved as a string
				}
			};

			// 5. Explicitly remove legacy keys to ensure clean JSON
			delete sheet.cells[key].text;
			delete sheet.cells[key].html;
			delete sheet.cells[key].llm;

			// 6. Refresh UI
			SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
			SheetDataManager.setModified(true);

			// Re-highlight the cell after rendering to ensure the formula bar updates
			setTimeout(() => {
				const newCell = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
				if (newCell && typeof window.highlightCell === 'function') {
					window.highlightCell(newCell);
				}
			}, 0);
		}

		// 7. Close Modal
		document.getElementById('dropdownModal').close();
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
			// Get current value from state to convert to plain text
			let currentVal = '';
			if (sheet.cells[key].type && sheet.cells[key].type.name === 'dropdown') {
				currentVal = sheet.cells[key].type.details.selected || '';
			}

			// Convert back to simple text type
			sheet.cells[key].type = {
				name: 'text',
				details: { value: currentVal }
			};
		}

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);

		document.getElementById('dropdownModal').close();
	}
};