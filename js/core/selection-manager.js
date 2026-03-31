import { SheetDataManager } from '../cascade-prompt-data.js';
import { scrollToViewWithOffsets } from '../cascade-prompt-ui.js';

export const SelectionManager = {
	highlightCell: function (cell) {
		const cellIndex = parseInt(cell.getAttribute('data-col'));
		const row = cell.parentElement;
		const tbody = row.parentElement;
		if (!tbody) return;
		const rowIndex = Array.from(tbody.children).indexOf(row);['highlight', 'selected-cell', 'edit-cell'].forEach(cls => {
			const els = document.getElementsByClassName(cls);
			while (els.length > 0) els[0].classList.remove(cls);
		});

		const letterCell = document.querySelector('.letter-cell[data-col="' + cellIndex + '"]');
		if (letterCell) letterCell.classList.add('highlight');
		const counterCells = document.querySelectorAll('.counter-cell');
		if (counterCells[rowIndex]) counterCells[rowIndex].classList.add('highlight');

		cell.classList.add('selected-cell');
		this.updateFormulaBar(rowIndex, cellIndex);
		scrollToViewWithOffsets(cell);

		const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
		const colspan = parseInt(cell.getAttribute('colspan')) || 1;
		document.getElementById('unmerge-btn').disabled = !(rowspan > 1 || colspan > 1);
		document.getElementById('merge-btn').disabled = true;

		this.updateStatusSelection(rowIndex, cellIndex);
	},

	updateFormulaBar: function(rowIndex, cellIndex) {
		const formulaInput = document.getElementById('formula-input');
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const cellData = sheet.cells[`${rowIndex}-${cellIndex}`];

		formulaInput.classList.remove('pointer-cursor');
		formulaInput.setAttribute('contenteditable', 'true');
		formulaInput.innerHTML = '';

		if (cellData && cellData.type) {
			const { name, details } = cellData.type;
			let text = '';

			if (['llm_formula', 'dropdown', 'checkbox'].includes(name)) {
				let icon = 'bi-pencil-square';

				if (name === 'llm_formula') {
					text = `=LLM("${details.funcName || 'Run LLM'}")`;
				} else if (name === 'dropdown') {
					text = `=dropdown("${(details.options ||[]).join(',')}", "${details.selected || ''}")`;
				} else if (name === 'checkbox') {
					text = `=checkbox("${details.label || ''}", "${details.trueValue || ''}", "${details.falseValue || ''}", ${details.value ? 'TRUE' : 'FALSE'})`;
				}

				formulaInput.innerHTML = `<div class="formula-btn"><i class="bi ${icon}"></i><span>${text}</span></div>`;
				formulaInput.setAttribute('contenteditable', 'false');
				formulaInput.classList.add('pointer-cursor');
			} else if (name === 'image') {
				formulaInput.textContent = '';
			} else {
				formulaInput.textContent = details.value || '';
			}
		} else {
			formulaInput.textContent = '';
		}
	},

	updateSelection: function () {
		const areaSelected = document.getElementsByClassName('area-selected-cell');
		while (areaSelected.length > 0) areaSelected[0].classList.remove('area-selected-cell');

		const helperDiv = document.getElementById('selection-helper');
		const mergeBtn = document.getElementById('merge-btn');

		if (!window.startCell || !window.endCell || window.startCell === window.endCell) {
			helperDiv.querySelectorAll('.selection-helper-edge').forEach(el => el.remove());
			helperDiv.style.display = 'none';
			mergeBtn.disabled = true;
			return;
		}
		mergeBtn.disabled = false;

		const startRowIdx = window.startCell.parentElement.rowIndex, endRowIdx = window.endCell.parentElement.rowIndex;
		const startRow = Math.min(startRowIdx, endRowIdx), endRow = Math.max(startRowIdx, endRowIdx);
		const startCol = Math.min(parseInt(window.startCell.getAttribute('data-col')), parseInt(window.endCell.getAttribute('data-col')));
		const endCol = Math.max(parseInt(window.startCell.getAttribute('data-col')), parseInt(window.endCell.getAttribute('data-col')));

		const tableRows = document.querySelectorAll('.spreadsheet tr');
		for (let i = startRow; i <= endRow; i++) {
			if (!tableRows[i]) continue;
			for (let j = startCol; j <= endCol; j++) {
				const cell = tableRows[i].querySelector('td[data-col="' + j + '"]');
				if (cell) cell.classList.add('area-selected-cell');
			}
		}

		document.getElementById('formula-input').textContent = '';
		document.getElementById('formula-input').setAttribute('contenteditable', 'false');

		const container = document.querySelector('.spreadsheet-container');
		const containerRect = container.getBoundingClientRect();
		let firstSelectedCell = tableRows[startRow].querySelector('td[data-col="' + startCol + '"]');

		if (!firstSelectedCell) {
			const cells = Array.from(tableRows[startRow].querySelectorAll('td'));
			for(let i=cells.length-1; i>=0; i--) { if(parseInt(cells[i].getAttribute('data-col')) <= startCol) { firstSelectedCell = cells[i]; break; } }
		}
		if (!firstSelectedCell) return;

		const firstRect = firstSelectedCell.getBoundingClientRect();
		const top = firstRect.top - containerRect.top - 1 + container.scrollTop;
		const left = firstRect.left - containerRect.left - 1 + container.scrollLeft;
		const width = this.getColumnWidthRange(startCol, endCol);
		const height = this.getRowHeightRange(startRow - 1, endRow - 1);

		Object.assign(helperDiv.style, { top: top + 'px', left: left + 'px', width: width + 'px', height: height + 'px', display: 'block' });
		helperDiv.querySelectorAll('.selection-helper-edge').forEach(el => el.remove());

		const edges =[
			{ class: 'top', style: { top: '-3px', left: '0', width: '100%' } },
			{ class: 'right', style: { top: '0', right: '-3px', height: '100%' } },
			{ class: 'bottom', style: { bottom: '-3px', left: '0', width: '100%' } },
			{ class: 'left', style: { top: '0', left: '-3px', height: '100%' } }
		];
		edges.forEach(e => {
			const div = document.createElement('div'); div.className = 'selection-helper-edge ' + e.class; Object.assign(div.style, e.style); helperDiv.appendChild(div);
		});
	},

	updateStatusSelection: function (rowIdx, colIdx) {
		const statusSel = document.getElementById('status-selection');
		if (statusSel) statusSel.textContent = SheetDataManager.getColumnLetter(colIdx) + (rowIdx + 1);
	},
	getColumnWidthRange: function (startCol, endCol) {
		let total = 0;
		for (let i = startCol; i <= endCol; i++) {
			const cell = document.querySelector('.spreadsheet .letter-cell[data-col="' + i + '"]');
			if (cell) total += cell.offsetWidth;
		}
		return total;
	},
	getRowHeightRange: function (startRow, endRow) {
		let total = 0;
		const cells = document.querySelectorAll('.spreadsheet .counter-cell');
		for (let i = startRow; i <= endRow; i++) { if (cells[i]) total += cells[i].offsetHeight; }
		return total;
	}
};