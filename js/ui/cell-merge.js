export const CellMerge = {
	mergeCells: function() {
		if (!window.startCell || !window.endCell || window.startCell === window.endCell) return;
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const startRowIdx = window.startCell.parentElement.rowIndex;
		const endRowIdx = window.endCell.parentElement.rowIndex;
		const rs1 = parseInt(window.startCell.getAttribute('rowspan')) || 1;
		const rs2 = parseInt(window.endCell.getAttribute('rowspan')) || 1;
		const startRow = Math.min(startRowIdx, endRowIdx), endRow = Math.max(startRowIdx + rs1 - 1, endRowIdx + rs2 - 1);

		const startColIdx = parseInt(window.startCell.getAttribute('data-col'));
		const endColIdx = parseInt(window.endCell.getAttribute('data-col'));
		const cs1 = parseInt(window.startCell.getAttribute('colspan')) || 1;
		const cs2 = parseInt(window.endCell.getAttribute('colspan')) || 1;
		const startCol = Math.min(startColIdx, endColIdx), endCol = Math.max(startColIdx + cs1 - 1, endColIdx + cs2 - 1);

		const tableRows = document.querySelectorAll('.spreadsheet tr');
		const topLeft = tableRows[startRow].querySelector('td[data-col="' + startCol + '"]');
		const mergedContent =[];

		for (let r = startRow; r <= endRow; r++) {
			for (let c = startCol; c <= endCol; c++) {
				const cell = tableRows[r].querySelector('td[data-col="' + c + '"]');
				if (cell) {
					const text = cell.querySelector('.content-cut').textContent.trim();
					if (text) mergedContent.push(text);
					if (!(r === startRow && c === startCol)) cell.remove();
				}
			}
		}

		topLeft.setAttribute('rowspan', endRow - startRow + 1);
		topLeft.setAttribute('colspan', endCol - startCol + 1);
		topLeft.querySelector('.content-cut').textContent = mergedContent.join(' ');
		topLeft.querySelector('.content-cut').style.width = (window.getColumnWidthRange(startCol, endCol) - 3) + 'px';

		window.startCell = null; window.endCell = null; window.isSelecting = false;
		window.highlightCell(topLeft); window.updateSelection(); window.saveState();
	},

	unmergeCells: function() {
		const cell = document.querySelector('.selected-cell');
		if (!cell) return;
		const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
		const colspan = parseInt(cell.getAttribute('colspan')) || 1;
		if (rowspan === 1 && colspan === 1) return;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		const startRow = cell.parentElement.rowIndex;
		const startCol = parseInt(cell.getAttribute('data-col'));
		const tableRows = document.querySelectorAll('.spreadsheet tr');

		for (let r = startRow; r < startRow + rowspan; r++) {
			for (let c = startCol; c < startCol + colspan; c++) {
				if (r === startRow && c === startCol) continue;
				const newCell = document.createElement('td');
				newCell.className = 'text-cell'; newCell.setAttribute('data-col', c);
				const contentDiv = document.createElement('div');
				contentDiv.className = 'content-cut';
				newCell.appendChild(contentDiv);

				const colWidth = document.querySelector('.letter-cell[data-col="' + c + '"]')?.offsetWidth || 100;
				contentDiv.style.width = (colWidth - 3) + 'px';
				const rowHeight = tableRows[r].querySelector('.counter-cell')?.offsetHeight || 25;
				contentDiv.style.height = (rowHeight - 3) + 'px';

				const row = tableRows[r];
				const cells = Array.from(row.querySelectorAll('td'));
				let prev = null;
				for (let i = cells.length - 1; i >= 0; i--) {
					if (parseInt(cells[i].getAttribute('data-col')) < c) { prev = cells[i]; break; }
				}
				prev ? prev.insertAdjacentElement('afterend', newCell) : (row.querySelector('td') ? row.querySelector('td').insertAdjacentElement('beforebegin', newCell) : row.appendChild(newCell));
			}
		}

		cell.removeAttribute('rowspan'); cell.removeAttribute('colspan');
		const singleColWidth = document.querySelector('.letter-cell[data-col="' + startCol + '"]')?.offsetWidth || 100;
		cell.querySelector('.content-cut').style.width = (singleColWidth - 3) + 'px';
		window.highlightCell(cell); window.saveState();
	}
};