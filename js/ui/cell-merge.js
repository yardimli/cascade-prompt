import { SheetDataManager } from '../cascade-prompt-data.js';

export const CellMerge = {
	mergeCells: function () {
		if (!window.startCell || !window.endCell || window.startCell === window.endCell) return;

		const startRowIdx = window.startCell.parentElement.rowIndex;
		const endRowIdx = window.endCell.parentElement.rowIndex;
		const rs1 = parseInt(window.startCell.getAttribute('rowspan')) || 1;
		const rs2 = parseInt(window.endCell.getAttribute('rowspan')) || 1;
		const startRow = Math.min(startRowIdx, endRowIdx);
		const endRow = Math.max(startRowIdx + rs1 - 1, endRowIdx + rs2 - 1);

		const startColIdx = parseInt(window.startCell.getAttribute('data-col'));
		const endColIdx = parseInt(window.endCell.getAttribute('data-col'));
		const cs1 = parseInt(window.startCell.getAttribute('colspan')) || 1;
		const cs2 = parseInt(window.endCell.getAttribute('colspan')) || 1;
		const startCol = Math.min(startColIdx, endColIdx);
		const endCol = Math.max(startColIdx + cs1 - 1, endColIdx + cs2 - 1);

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const cellsWithContent = [];

		for (let r = startRow - 1; r <= endRow - 1; r++) {
			for (let c = startCol; c <= endCol; c++) {
				const key = r + '-' + c;
				const cellData = sheet.cells[key];
				let hasValue = false;
				if (cellData && cellData.type) {
					if (cellData.type.details && (cellData.type.details.value || cellData.type.details.value === 0)) {
						hasValue = true;
					} else if (cellData.type.name === 'dropdown' && cellData.type.details.selected) {
						hasValue = true;
					} else if (['image', 'checkbox', 'llm_formula'].includes(cellData.type.name)) {
						hasValue = true;
					}
				}

				if (hasValue) {
					cellsWithContent.push({ r, c, data: JSON.parse(JSON.stringify(cellData)) });
				}
			}
		}

		const performMerge = (contentCellData) => {
			if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

			for (let r = startRow - 1; r <= endRow - 1; r++) {
				for (let c = startCol; c <= endCol; c++) {
					const key = r + '-' + c;
					delete sheet.cells[key];
				}
			}

			const newRowspan = (endRow - startRow) + 1;
			const newColspan = (endCol - startCol) + 1;
			const topLeftKey = (startRow - 1) + '-' + startCol;

			if (contentCellData) {
				sheet.cells[topLeftKey] = contentCellData;
				sheet.cells[topLeftKey].rowspan = newRowspan;
				sheet.cells[topLeftKey].colspan = newColspan;
			} else {
				sheet.cells[topLeftKey] = {
					type: { name: 'text', details: { value: '' } },
					rowspan: newRowspan,
					colspan: newColspan,
					style: {},
					cellStyle: {}
				};
			}

			SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
			SheetDataManager.setModified(true);

			setTimeout(() => {
				const tableBody = document.querySelector('.spreadsheet tbody');
				const topLeftCellDOM = tableBody.rows[startRow - 1]?.querySelector(`td[data-col="${startCol}"]`);
				if (topLeftCellDOM) {
					window.startCell = null;
					window.endCell = null;
					window.isSelecting = false;
					window.highlightCell(topLeftCellDOM);
					window.updateSelection();
				}
			}, 0);
		};

		if (cellsWithContent.length <= 1) {
			performMerge(cellsWithContent.length === 1 ? cellsWithContent[0].data : null);
		} else {
			window.showMergeConfirmation(() => {
				const topLeftContentCell = cellsWithContent.reduce((topLeft, current) => {
					if (current.r < topLeft.r) return current;
					if (current.r === topLeft.r && current.c < topLeft.c) return current;
					return topLeft;
				});
				performMerge(topLeftContentCell.data);
			});
		}
	},

	unmergeCells: function () {
		const cell = document.querySelector('.selected-cell');
		if (!cell) return;

		const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
		const colspan = parseInt(cell.getAttribute('colspan')) || 1;
		if (rowspan === 1 && colspan === 1) return;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const startR = cell.parentElement.rowIndex - 1;
		const startC = parseInt(cell.getAttribute('data-col'));

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = startR + '-' + startC;
		const cellData = sheet.cells[key];

		if (cellData) {
			delete cellData.rowspan;
			delete cellData.colspan;
		}

		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);

		setTimeout(() => {
			const tableBody = document.querySelector('.spreadsheet tbody');
			const topLeftCellDOM = tableBody.rows[startR]?.querySelector(`td[data-col="${startC}"]`);
			if (topLeftCellDOM) {
				window.highlightCell(topLeftCellDOM);
				window.updateSelection();
			}
		}, 0);
	}
};