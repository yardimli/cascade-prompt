/**
 * Cascade Prompt Dropdown Manager
 * Handles creation and editing of dropdown cells via Modal.
 */

var DropdownManager = {
	
	/**
	 * Open the Dropdown Configuration Modal
	 */
	openDropdownBuilder: function () {
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			if (typeof showCustomAlert === 'function') {
				showCustomAlert('Please select a cell first.');
			}
			return;
		}
		
		const modalEl = document.getElementById('dropdownModal');
		const modal = new bootstrap.Modal(modalEl);
		
		const optionsInput = document.getElementById('dropdown-options');
		const selectionInput = document.getElementById('dropdown-selection');
		
		// Reset inputs
		optionsInput.value = '';
		selectionInput.innerHTML = '<option value="">(None)</option>';
		selectionInput.value = '';
		
		// Check if cell already has a dropdown formula
		const contentDiv = selected.querySelector('.content-cut');
		const formula = contentDiv.getAttribute('data-formula');
		
		if (formula && formula.toLowerCase().startsWith('=dropdown')) {
			// Parse existing formula: =dropdown("opt1,opt2", "selected")
			const regex = /^=dropdown\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
			const match = formula.match(regex);
			
			if (match) {
				const optionsStr = match[1];
				const currentSelection = match[2] || '';
				
				// Format options for textarea (one per line is nicer, but comma is stored)
				const options = optionsStr.split(',').map(s => s.trim());
				optionsInput.value = options.join('\n');
				
				this.updateSelectionPreview(options, currentSelection);
			}
		}
		
		modal.show();
	},
	
	/**
	 * Update the "Current Selection" preview dropdown in the modal
	 * based on the text area input.
	 */
	updateSelectionPreview: function (optionsArray = null, selectedValue = '') {
		const optionsInput = document.getElementById('dropdown-options');
		const selectionInput = document.getElementById('dropdown-selection');
		
		let options = optionsArray;
		if (!options) {
			// Parse from textarea
			const text = optionsInput.value;
			// Split by newline or comma
			options = text.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');
		}
		
		// Save current selection if not provided
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
	
	/**
	 * Save the dropdown configuration to the selected cell
	 */
	saveDropdown: function () {
		const optionsInput = document.getElementById('dropdown-options');
		const selectionInput = document.getElementById('dropdown-selection');
		
		const text = optionsInput.value;
		const options = text.split(/[\n,]/).map(s => s.trim()).filter(s => s !== '');
		const selected = selectionInput.value;
		
		if (options.length === 0) {
			if (typeof showCustomAlert === 'function') {
				showCustomAlert('Please enter at least one option.');
			}
			return;
		}
		
		const optionsStr = options.join(',');
		const formula = `=dropdown("${optionsStr}", "${selected}")`;
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const r = selectedCell.parentElement.rowIndex - 1;
			const c = parseInt(selectedCell.getAttribute('data-col'));
			
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;
			
			if (!sheet.cells[key]) sheet.cells[key] = {};
			
			sheet.cells[key].text = formula;
			sheet.cells[key].html = formula; // Will be rendered as select
			
			// Update DOM immediately to reflect changes
			SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
			SheetDataManager.setModified(true);
			
			// Re-highlight to keep focus
			setTimeout(() => {
				const newCell = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
				if (newCell && typeof highlightCell === 'function') highlightCell(newCell);
			}, 0);
		}
		
		const modalEl = document.getElementById('dropdownModal');
		const modal = bootstrap.Modal.getInstance(modalEl);
		modal.hide();
	},
	
	/**
	 * Remove the dropdown and convert to plain text (current value)
	 */
	removeDropdown: function () {
		const selectedCell = document.querySelector('.selected-cell');
		if (!selectedCell) return;
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const r = selectedCell.parentElement.rowIndex - 1;
		const c = parseInt(selectedCell.getAttribute('data-col'));
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;
		
		if (sheet.cells[key]) {
			// Extract current value from formula or DOM
			const contentDiv = selectedCell.querySelector('.content-cut');
			let currentVal = '';
			
			// Try to get value from the select element if it exists
			const select = contentDiv.querySelector('select');
			if (select) {
				currentVal = select.value;
			} else {
				// Fallback to parsing formula
				const formula = contentDiv.getAttribute('data-formula');
				const regex = /^=dropdown\s*\(\s*"[^"]+"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
				const match = formula ? formula.match(regex) : null;
				if (match) currentVal = match[1] || '';
			}
			
			sheet.cells[key].text = currentVal;
			sheet.cells[key].html = currentVal;
			// Remove LLM config if it was somehow tied (optional)
		}
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		
		const modalEl = document.getElementById('dropdownModal');
		const modal = bootstrap.Modal.getInstance(modalEl);
		modal.hide();
	}
};
