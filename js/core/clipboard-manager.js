import { SheetDataManager } from '../cascade-prompt-data.js';

export const ClipboardManager = {
	clipboardData: null,

	copy: function (isCut) {
		let sR, sC, eR, eC;

		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex - 1;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const rs1 = parseInt(window.startCell.getAttribute('rowspan')) || 1;
			const cs1 = parseInt(window.startCell.getAttribute('colspan')) || 1;

			const r2 = window.endCell.parentElement.rowIndex - 1;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			const rs2 = parseInt(window.endCell.getAttribute('rowspan')) || 1;
			const cs2 = parseInt(window.endCell.getAttribute('colspan')) || 1;

			sR = Math.min(r1, r2);
			eR = Math.max(r1 + rs1 - 1, r2 + rs2 - 1);
			sC = Math.min(c1, c2);
			eC = Math.max(c1 + cs1 - 1, c2 + cs2 - 1);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (!selected) return;
			sR = selected.parentElement.rowIndex - 1;
			sC = parseInt(selected.getAttribute('data-col'));
			const rowspan = parseInt(selected.getAttribute('rowspan')) || 1;
			const colspan = parseInt(selected.getAttribute('colspan')) || 1;
			eR = sR + rowspan - 1;
			eC = sC + colspan - 1;
		}

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const copiedCells =[];
		let plainTextBuffer = '';

		for (let r = sR; r <= eR; r++) {
			let rowText =[];
			for (let c = sC; c <= eC; c++) {
				const key = r + '-' + c;
				const cellData = sheet.cells[key];
				if (cellData && cellData.text) {
					rowText.push(cellData.text);
				} else {
					rowText.push('');
				}
				if (cellData) {
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

		if (navigator.clipboard) {
			navigator.clipboard.writeText(plainTextBuffer).catch(err => {
				console.error('Failed to write to system clipboard', err);
			});
		}

		if (!isCut) {
			const toastMsg = 'Copied ' + copiedCells.length + ' cell(s)';
			if (typeof window.showToast === 'function') window.showToast(toastMsg);
		}
	},

	cut: function () {
		this.copy(true);
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		let sR, sC, eR, eC;
		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex - 1;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const rs1 = parseInt(window.startCell.getAttribute('rowspan')) || 1;
			const cs1 = parseInt(window.startCell.getAttribute('colspan')) || 1;

			const r2 = window.endCell.parentElement.rowIndex - 1;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			const rs2 = parseInt(window.endCell.getAttribute('rowspan')) || 1;
			const cs2 = parseInt(window.endCell.getAttribute('colspan')) || 1;

			sR = Math.min(r1, r2);
			eR = Math.max(r1 + rs1 - 1, r2 + rs2 - 1);
			sC = Math.min(c1, c2);
			eC = Math.max(c1 + cs1 - 1, c2 + cs2 - 1);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (!selected) return;
			sR = selected.parentElement.rowIndex - 1;
			sC = parseInt(selected.getAttribute('data-col'));
			const rowspan = parseInt(selected.getAttribute('rowspan')) || 1;
			const colspan = parseInt(selected.getAttribute('colspan')) || 1;
			eR = sR + rowspan - 1;
			eC = sC + colspan - 1;
		}

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
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
		if (typeof window.showToast === 'function') window.showToast('Cut selection');
	},

	paste: function () {
		if (!this.clipboardData) {
			if (navigator.clipboard) {
				navigator.clipboard.readText().then(text => {
					if (text) this.pasteText(text);
				});
			}
			return;
		}

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		let targetR, targetC;
		const selected = document.querySelector('.selected-cell');

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

		this.clipboardData.cells.forEach(item => {
			const destR = targetR + item.rOffset;
			const destC = targetC + item.cOffset;
			if (destR < sheet.rowCount && destC < sheet.colCount) {
				const key = destR + '-' + destC;
				sheet.cells[key] = JSON.parse(JSON.stringify(item.data));
			}
		});

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);

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
						window.highlightCell(domStart);
						window.updateSelection();
					}
				}
			}
		}, 0);

		if (typeof window.showToast === 'function') window.showToast('Pasted');
	},

	pasteText: function (text) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const selected = document.querySelector('.selected-cell');
		if (!selected) return;

		const startR = selected.parentElement.rowIndex - 1;
		const startC = parseInt(selected.getAttribute('data-col'));
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];

		const rows = text.split(/\r\n|\n|\r/);

		rows.forEach((rowStr, rIdx) => {
			if (rowStr === '' && rIdx === rows.length - 1) return;
			const cols = rowStr.split('\t');
			cols.forEach((colData, cIdx) => {
				const destR = startR + rIdx;
				const destC = startC + cIdx;

				if (destR < sheet.rowCount && destC < sheet.colCount) {
					const key = destR + '-' + destC;
					if (!sheet.cells[key]) {
						sheet.cells[key] = { text: colData, html: colData };
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