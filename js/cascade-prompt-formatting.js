/**
 * Cascade Prompt Formatting Manager
 * Handles text formatting, alignment, colors, and borders.
 */

var FormatManager = {
	savedRange: null, // Stores {sR, eR, sC, eC} to persist selection across focus loss
	activeColorMode: null, // 'text' or 'background' or 'border'
	
	/**
	 * Apply a style command (Bold, Italic)
	 * @param {string} command - 'bold' or 'italic'
	 */
	toggleStyle: function (command) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		if (isEditing) {
			// If editing a cell, use execCommand on the contenteditable div
			document.execCommand(command, false, null);
		} else {
			// Apply to selected cell(s)
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (!contentDiv) return;
				
				if (command === 'bold') {
					contentDiv.style.fontWeight = (contentDiv.style.fontWeight === 'bold') ? 'normal' : 'bold';
				} else if (command === 'italic') {
					contentDiv.style.fontStyle = (contentDiv.style.fontStyle === 'italic') ? 'normal' : 'italic';
				}
			});
			if (typeof saveState === 'function') saveState();
		}
	},
	
	/**
	 * Set Font Size
	 * @param {string} size - 'small', 'normal', 'large', 'xl'
	 */
	setFontSize: function (size) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		let pixelSize = '14px'; // Default
		switch (size) {
			case 'small': pixelSize = '11px'; break;
			case 'normal': pixelSize = '14px'; break;
			case 'large': pixelSize = '18px'; break;
			case 'xl': pixelSize = '24px'; break;
		}
		
		if (isEditing) {
			// For cell editing, update the editor directly
			const editor = document.getElementById('cell-editor');
			if (editor) editor.style.fontSize = pixelSize;
		} else {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (contentDiv) {
					contentDiv.style.fontSize = pixelSize;
				}
			});
			if (typeof saveState === 'function') saveState();
		}
	},
	
	/**
	 * Toggle the Font Size Menu (and handle closing on outside click)
	 */
	toggleFontSizeMenu: function (btn) {
		// Save selection context just in case
		this.saveSelectionContext();
		
		const dropdownContent = btn.nextElementSibling;
		const isActive = dropdownContent.classList.contains('active');
		
		// Close all other open dropdowns (like borders)
		document.querySelectorAll('.border-dropdown.active').forEach(el => el.classList.remove('active'));
		document.querySelectorAll('.dropdown-content.active').forEach(el => el.classList.remove('active'));
		
		if (!isActive) {
			dropdownContent.classList.add('active');
			
			// Close on click outside
			const closeMenu = function (e) {
				if (!dropdownContent.contains(e.target) && !btn.contains(e.target)) {
					dropdownContent.classList.remove('active');
					document.removeEventListener('click', closeMenu);
				}
			};
			// Delay adding listener to avoid immediate close
			setTimeout(() => document.addEventListener('click', closeMenu), 0);
		}
	},
	
	/**
	 * Set Text Alignment
	 * @param {string} align - 'left', 'center', 'right'
	 */
	setAlignment: function (align) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		if (isEditing) {
			document.execCommand('justify' + align, false, null);
		} else {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (contentDiv) {
					contentDiv.style.textAlign = align;
				}
			});
			if (typeof saveState === 'function') saveState();
		}
	},
	
	/**
	 * Open the Color Picker Dialog
	 * @param {string} mode - 'text', 'background', 'border'
	 */
	openColorDialog: function (mode) {
		this.activeColorMode = mode;
		this.saveSelectionContext();
		
		const modalEl = document.getElementById('colorPickerModal');
		const modalTitle = document.getElementById('colorPickerTitle');
		const colorInput = document.getElementById('modal-color-input');
		
		// Set Title
		if (mode === 'text') modalTitle.textContent = 'Text Color';
		else if (mode === 'background') modalTitle.textContent = 'Background Color';
		else if (mode === 'border') modalTitle.textContent = 'Border Color';
		
		// Reset input to default black or white
		colorInput.value = '#000000';
		
		const modal = new bootstrap.Modal(modalEl);
		modal.show();
	},
	
	/**
	 * Apply Color from Dialog
	 */
	applyColorDialog: function () {
		const colorInput = document.getElementById('modal-color-input');
		const color = colorInput.value;
		const mode = this.activeColorMode;
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		if (mode === 'text') {
			if (isEditing) {
				document.execCommand('foreColor', false, color);
			} else {
				this.applyToSelection(function (cell) {
					const contentDiv = cell.querySelector('.content-cut');
					if (contentDiv) contentDiv.style.color = color;
				}, true); // Use saved context
			}
		} else if (mode === 'background') {
			this.applyToSelection(function (cell) {
				cell.style.backgroundColor = color;
			}, true);
		} else if (mode === 'border') {
			this.setBorder('all', color); // Default to all borders when using generic picker
		}
		
		if (typeof saveState === 'function') saveState();
		
		// Close Modal
		const modalEl = document.getElementById('colorPickerModal');
		const modal = bootstrap.Modal.getInstance(modalEl);
		modal.hide();
	},
	
	/**
	 * Reset Color (Transparent/Default)
	 */
	resetColorDialog: function () {
		const mode = this.activeColorMode;
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		if (mode === 'text') {
			if (isEditing) {
				document.execCommand('removeFormat', false, 'foreColor');
			} else {
				this.applyToSelection(function (cell) {
					const contentDiv = cell.querySelector('.content-cut');
					if (contentDiv) contentDiv.style.color = ''; // Reset
				}, true);
			}
		} else if (mode === 'background') {
			this.applyToSelection(function (cell) {
				cell.style.backgroundColor = ''; // Reset
			}, true);
		} else if (mode === 'border') {
			this.setBorder('none');
		}
		
		if (typeof saveState === 'function') saveState();
		
		const modalEl = document.getElementById('colorPickerModal');
		const modal = bootstrap.Modal.getInstance(modalEl);
		modal.hide();
	},
	
	/**
	 * Set Cell Borders
	 * @param {string} type - 'left', 'right', 'top', 'bottom', 'all', 'none', 'outer'
	 * @param {string} color - Hex code (optional, defaults to black/theme)
	 */
	setBorder: function (type, color) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const borderColor = color || '#000000';
		const borderStyle = '1px solid ' + borderColor;
		
		// If 'outer', we need to know the range boundaries
		let range = null;
		
		// Determine range from saved context or current global
		let sR, eR, sC, eC;
		
		if (this.savedRange) {
			sR = this.savedRange.sR;
			eR = this.savedRange.eR;
			sC = this.savedRange.sC;
			eC = this.savedRange.eC;
		} else if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			sR = Math.min(r1, r2);
			eR = Math.max(r1, r2);
			sC = Math.min(c1, c2);
			eC = Math.max(c1, c2);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				sR = selected.parentElement.rowIndex;
				eR = sR;
				sC = parseInt(selected.getAttribute('data-col'));
				eC = sC;
			}
		}
		
		if (sR !== undefined) {
			range = { minR: sR, maxR: eR, minC: sC, maxC: eC };
		}
		
		this.applyToSelection(function (cell) {
			// Reset if 'none'
			if (type === 'none') {
				cell.style.border = '';
				cell.style.borderLeft = '';
				cell.style.borderRight = '';
				cell.style.borderTop = '';
				cell.style.borderBottom = '';
				return;
			}
			
			const r = cell.parentElement.rowIndex;
			const c = parseInt(cell.getAttribute('data-col'));
			
			if (type === 'all') {
				cell.style.border = borderStyle;
			} else if (type === 'left') {
				cell.style.borderLeft = borderStyle;
			} else if (type === 'right') {
				cell.style.borderRight = borderStyle;
			} else if (type === 'top') {
				cell.style.borderTop = borderStyle;
			} else if (type === 'bottom') {
				cell.style.borderBottom = borderStyle;
			} else if (type === 'outer' && range) {
				if (c === range.minC) cell.style.borderLeft = borderStyle;
				if (c === range.maxC) cell.style.borderRight = borderStyle;
				if (r === range.minR) cell.style.borderTop = borderStyle;
				if (r === range.maxR) cell.style.borderBottom = borderStyle;
			}
		}, true); // Use saved context if available
		
		if (typeof saveState === 'function') saveState();
	},
	
	/**
	 * Helper to iterate over selected cells
	 * @param {Function} callback - function(cellElement)
	 * @param {Boolean} useSaved - whether to use the saved range context
	 */
	applyToSelection: function (callback, useSaved) {
		// 1. Use Saved Context (from color picker)
		if (useSaved && this.savedRange) {
			const { sR, eR, sC, eC } = this.savedRange;
			const table = document.querySelector('.spreadsheet');
			
			// Iterate rows (start from sR, which is rowIndex)
			for (let r = sR; r <= eR; r++) {
				const row = table.rows[r]; // table.rows includes thead
				if (!row) continue;
				// Iterate cols
				for (let c = sC; c <= eC; c++) {
					const cell = row.querySelector(`td[data-col="${c}"]`);
					if (cell) callback(cell);
				}
			}
			
			// Clear saved range after use
			this.savedRange = null;
			return;
		}
		
		// 2. Use Current DOM Selection
		const areaCells = document.querySelectorAll('.area-selected-cell');
		if (areaCells.length > 0) {
			areaCells.forEach(callback);
		} else {
			// Just the active cell
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				callback(selected);
			}
		}
	},
	
	/**
	 * Save the current selection indices before focus is lost (e.g. to color picker)
	 */
	saveSelectionContext: function() {
		let sR, sC, eR, eC;
		
		// Check global selection variables from cascade-prompt.js
		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			
			sR = Math.min(r1, r2);
			eR = Math.max(r1, r2);
			sC = Math.min(c1, c2);
			eC = Math.max(c1, c2);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				sR = selected.parentElement.rowIndex;
				eR = sR;
				sC = parseInt(selected.getAttribute('data-col'));
				eC = sC;
			} else {
				this.savedRange = null;
				return;
			}
		}
		this.savedRange = { sR, eR, sC, eC };
	},
	
	/**
	 * Toggle the border dropdown visibility
	 */
	toggleBorderMenu: function () {
		// Save selection before opening menu
		this.saveSelectionContext();
		
		const dropdown = document.getElementById('border-dropdown');
		dropdown.classList.toggle('active');
		
		// Close on click outside
		const closeMenu = function (e) {
			if (!dropdown.contains(e.target) && !e.target.closest('#btn-borders')) {
				dropdown.classList.remove('active');
				document.removeEventListener('click', closeMenu);
			}
		};
		// Delay adding listener to avoid immediate close
		setTimeout(() => document.addEventListener('click', closeMenu), 0);
	}
};
