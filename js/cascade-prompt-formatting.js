/**
 * Cascade Prompt Formatting Manager
 * Handles text formatting, alignment, colors, and borders.
 */

var FormatManager = {
	savedRange: null, // Stores {sR, eR, sC, eC} to persist selection across focus loss
	
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
	 * Set Text Color
	 * @param {string} color - Hex code
	 */
	setTextColor: function (color) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		if (isEditing) {
			document.execCommand('foreColor', false, color);
		} else {
			// Use saved context if available (from color picker trigger)
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (contentDiv) {
					contentDiv.style.color = color;
				}
			}, true);
			if (typeof saveState === 'function') saveState();
		}
	},
	
	/**
	 * Set Cell Background Color
	 * @param {string} color - Hex code
	 */
	setBackgroundColor: function (color) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		// Background color always applies to the cell, even if editing text
		this.applyToSelection(function (cell) {
			cell.style.backgroundColor = color;
		}, true);
		if (typeof saveState === 'function') saveState();
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
	 * Trigger the hidden color input
	 */
	triggerColorPicker: function (inputId) {
		this.saveSelectionContext();
		document.getElementById(inputId).click();
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
