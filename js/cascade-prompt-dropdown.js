import { SheetDataManager } from './cascade-prompt-data.js';

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
		
		const contentDiv = selected.querySelector('.content-cut');
		const formula = contentDiv.getAttribute('data-formula');
		
		if (formula && formula.toLowerCase().startsWith('=dropdown')) {
			const regex = /^=dropdown\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
			const match = formula.match(regex);
			
			if (match) {
				const optionsStr = match[1];
				const currentSelection = match[2] || '';
				const options = optionsStr.split(',').map(s => s.trim());
				optionsInput.value = options.join('\n');
				this.updateSelectionPreview(options, currentSelection);
			}
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
		
		const text = optionsInput.value;
		const options = text.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');
		const selected = selectionInput.value;
		
		if (options.length === 0) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please enter at least one option.');
			}
			return;
		}
		
		const optionsStr = options.join(',');
		const formula = `=dropdown("${optionsStr}", "${selected}")`;
		
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		
		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const r = selectedCell.parentElement.rowIndex - 1;
			const c = parseInt(selectedCell.getAttribute('data-col'));
			
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;
			
			if (!sheet.cells[key]) sheet.cells[key] = {};
			
			sheet.cells[key].text = formula;
			sheet.cells[key].html = formula;
			
			SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
			SheetDataManager.setModified(true);
			
			setTimeout(() => {
				const newCell = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
				if (newCell && typeof window.highlightCell === 'function') window.highlightCell(newCell);
			}, 0);
		}
		
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
			const contentDiv = selectedCell.querySelector('.content-cut');
			let currentVal = '';
			
			const select = contentDiv.querySelector('select');
			if (select) {
				currentVal = select.value;
			} else {
				const formula = contentDiv.getAttribute('data-formula');
				const regex = /^=dropdown\s*\(\s*"[^"]+"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
				const match = formula ? formula.match(regex) : null;
				if (match) currentVal = match[1] || '';
			}
			
			sheet.cells[key].text = currentVal;
			sheet.cells[key].html = currentVal;
		}
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		
		document.getElementById('dropdownModal').close();
	}
};
