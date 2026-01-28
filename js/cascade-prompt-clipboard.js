/**
 * Cascade Prompt Clipboard Manager
 * Handles Copy, Cut, and Paste operations preserving data, styles, and merges.
 */

var ClipboardManager = {
	clipboardData: null, // Internal buffer for rich data { width, height, cells: [] }
	
	/**
	 * Copy the current selection to the internal clipboard
	 * @param {boolean} isCut - If true, this is part of a cut operation
	 */
	copy: function (isCut) {
		// Determine selection range
		let sR, sC, eR, eC;
		
		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex - 1; // Adjust for header
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex - 1;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			
			sR = Math.min(r1, r2);
			eR = Math.max(r1, r2);
			sC = Math.min(c1, c2);
			eC = Math.max(c1, c2);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (!selected) return;
			sR = selected.parentElement.rowIndex - 1;
			eR = sR;
			sC = parseInt(selected.getAttribute('data-col'));
			eC = sC;
		}
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const copiedCells = [];
		let plainTextBuffer = '';
		
		// Iterate through the range to capture data
		for (let r = sR; r <= eR; r++) {
			let rowText = [];
			for (let c = sC; c <= eC; c++) {
				const key = r + '-' + c;
				const cellData = sheet.cells[key];
				
				// Add to text buffer for system clipboard
				if (cellData && cellData.text) {
					rowText.push(cellData.text);
				} else {
					rowText.push('');
				}
				
				if (cellData) {
					// Deep copy the data object to prevent reference issues
					copiedCells.push({
						rOffset: r - sR,
						cOffset: c - sC,
						data: JSON.parse(JSON.stringify(cellData))
					});
				}
			}
			plainTextBuffer += rowText.join('\t') + '\n';
		}
		
		this.clipboardData = {
			rows: eR - sR + 1,
			cols: eC - sC + 1,
			cells: copiedCells
		};
		
		// Write plain text to system clipboard for external use
		if (navigator.clipboard) {
			navigator.clipboard.writeText(plainTextBuffer).catch(err => {
				console.error('Failed to write to system clipboard', err);
			});
		}
		
		if (!isCut) {
			// Visual feedback
			const toastMsg = 'Copied ' + copiedCells.length + ' cell(s)';
			if (typeof showToast === 'function') showToast(toastMsg);
		}
	},
	
	/**
	 * Cut the current selection (Copy + Delete content)
	 */
	cut: function () {
		this.copy(true); // Pass true to suppress "Copied" toast
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		// Determine range again to delete
		let sR, sC, eR, eC;
		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex - 1;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex - 1;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			sR = Math.min(r1, r2);
			eR = Math.max(r1, r2);
			sC = Math.min(c1, c2);
			eC = Math.max(c1, c2);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (!selected) return;
			sR = selected.parentElement.rowIndex - 1;
			sC = parseInt(selected.getAttribute('data-col'));
			eR = sR;
			eC = sC;
		}
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		
		// Delete data from source
		for (let r = sR; r <= eR; r++) {
			for (let c = sC; c <= eC; c++) {
				const key = r + '-' + c;
				if (sheet.cells[key]) {
					delete sheet.cells[key];
				}
			}
		}
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		if (typeof showToast === 'function') showToast('Cut selection');
	},
	
	/**
	 * Paste content from internal clipboard to current selection
	 */
	paste: function () {
		if (!this.clipboardData) {
			// Fallback: Try to read system clipboard text
			if (navigator.clipboard) {
				navigator.clipboard.readText().then(text => {
					if (text) this.pasteText(text);
				});
			}
			return;
		}
		
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		// Identify Target (Top-Left of current selection)
		let targetR, targetC;
		const selected = document.querySelector('.selected-cell');
		
		// If we have a range selection, use the top-left of that range
		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex - 1;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex - 1;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			targetR = Math.min(r1, r2);
			targetC = Math.min(c1, c2);
		} else if (selected) {
			targetR = selected.parentElement.rowIndex - 1;
			targetC = parseInt(selected.getAttribute('data-col'));
		} else {
			return;
		}
		
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		
		// Apply clipboard data
		this.clipboardData.cells.forEach(item => {
			const destR = targetR + item.rOffset;
			const destC = targetC + item.cOffset;
			
			// Boundary check
			if (destR < sheet.rowCount && destC < sheet.colCount) {
				const key = destR + '-' + destC;
				// Clone again to ensure unique references if pasted multiple times
				sheet.cells[key] = JSON.parse(JSON.stringify(item.data));
			}
		});
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		
		// Restore selection on the target area
		// We calculate the new range based on the pasted data dimensions
		setTimeout(() => {
			const tbody = document.querySelector('.spreadsheet tbody');
			const endR = targetR + this.clipboardData.rows - 1;
			const endC = targetC + this.clipboardData.cols - 1;
			
			if (endR < sheet.rowCount && endC < sheet.colCount) {
				const startRow = tbody.children[targetR];
				const endRow = tbody.children[endR];
				if (startRow && endRow) {
					const domStart = startRow.querySelector(`td[data-col="${targetC}"]`);
					const domEnd = endRow.querySelector(`td[data-col="${endC}"]`);
					
					if (domStart && domEnd) {
						window.startCell = domStart;
						window.endCell = domEnd;
						window.isSelecting = false;
						highlightCell(domStart); // Highlights top-left
						updateSelection(); // Draws box around range
					}
				}
			}
		}, 0);
		
		if (typeof showToast === 'function') showToast('Pasted');
	},
	
	/**
	 * Handle pasting plain text from system clipboard (fallback)
	 */
	pasteText: function (text) {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		
		const selected = document.querySelector('.selected-cell');
		if (!selected) return;
		
		const startR = selected.parentElement.rowIndex - 1;
		const startC = parseInt(selected.getAttribute('data-col'));
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		
		const rows = text.split(/\r\n|\n|\r/);
		
		rows.forEach((rowStr, rIdx) => {
			if (rowStr === '' && rIdx === rows.length - 1) return; // Skip trailing newline
			
			const cols = rowStr.split('\t');
			cols.forEach((colData, cIdx) => {
				const destR = startR + rIdx;
				const destC = startC + cIdx;
				
				if (destR < sheet.rowCount && destC < sheet.colCount) {
					const key = destR + '-' + destC;
					
					// Preserve existing style if possible, or init new
					if (!sheet.cells[key]) {
						sheet.cells[key] = {text: colData, html: colData};
					} else {
						sheet.cells[key].text = colData;
						sheet.cells[key].html = colData;
					}
				}
			});
		});
		
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
	}
};
