import './style.css';

import { SheetDataManager } from '../js/cascade-prompt-data.js';
import { HistoryManager } from '../js/cascade-prompt-history.js';
import { FormatManager } from '../js/cascade-prompt-formatting.js';
import { ClipboardManager } from '../js/cascade-prompt-clipboard.js';
import { LLMManager } from '../js/cascade-prompt-llm.js';
import { DropdownManager } from '../js/cascade-prompt-dropdown.js';
import { initKeypressListeners } from '../js/cascade-prompt-keypress.js';
import {
	initTheme,
	setTheme,
	initUiSize,
	setUiFontSize,
	SheetPropertiesManager,
	scrollToViewWithOffsets,
	makeCellEditable,
	stopEditing,
	mergeCells,
	unmergeCells,
	attachResizeHandlers,
	initMenuHandlers
} from '../js/cascade-prompt-ui.js';
// Import Project UI handlers
import {
	openProjectModal,
	performSave,
	initProjectHandlers
} from '../js/cascade-prompt-project-ui.js';

// Expose Managers to Window for HTML event handlers
window.SheetDataManager = SheetDataManager;
window.HistoryManager = HistoryManager;
window.FormatManager = FormatManager;
window.ClipboardManager = ClipboardManager;
window.LLMManager = LLMManager;
window.DropdownManager = DropdownManager;
window.SheetPropertiesManager = SheetPropertiesManager;

// Expose UI Functions
window.setTheme = setTheme;
window.setUiFontSize = setUiFontSize;
window.scrollToViewWithOffsets = scrollToViewWithOffsets;
window.makeCellEditable = makeCellEditable;
window.stopEditing = stopEditing;
window.mergeCells = mergeCells;
window.unmergeCells = unmergeCells;
window.attachResizeHandlers = attachResizeHandlers;
window.initMenuHandlers = initMenuHandlers;

// Expose Project Functions to Window
window.openProjectModal = openProjectModal;
window.performSave = performSave;

// Global State Variables (migrated from cascade-prompt.js)
window.isEditing = false;
window.isSelecting = false;
window.startCell = null;
window.endCell = null;

// Global Helper Functions (migrated from cascade-prompt.js)
window.highlightCell = function (cell) {
	const cellIndex = parseInt(cell.getAttribute('data-col'));
	const row = cell.parentElement;
	const tbody = row.parentElement;
	if (!tbody) return;
	const rowIndex = Array.from(tbody.children).indexOf(row);
	
	const highlights = document.getElementsByClassName('highlight');
	while (highlights.length > 0) highlights[0].classList.remove('highlight');
	
	const selected = document.getElementsByClassName('selected-cell');
	while (selected.length > 0) selected[0].classList.remove('selected-cell');
	
	const editing = document.getElementsByClassName('edit-cell');
	while (editing.length > 0) editing[0].classList.remove('edit-cell');
	
	const letterCell = document.querySelector('.letter-cell[data-col="' + cellIndex + '"]');
	if (letterCell) letterCell.classList.add('highlight');
	
	const counterCells = document.querySelectorAll('.counter-cell');
	if (counterCells[rowIndex]) counterCells[rowIndex].classList.add('highlight');
	
	cell.classList.add('selected-cell');
	
	const contentDiv = cell.querySelector('.content-cut');
	const cellContent = contentDiv.textContent;
	const cellFormula = contentDiv.getAttribute('data-formula');
	const formulaInput = document.getElementById('formula-input');
	
	const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
	const key = rowIndex + '-' + cellIndex;
	
	formulaInput.classList.remove('pointer-cursor');
	
	if (sheet.cells[key] && sheet.cells[key].llm) {
		const funcName = sheet.cells[key].llm.funcName || 'Run LLM';
		formulaInput.textContent = `=LLM("${funcName}")`;
		formulaInput.setAttribute('contenteditable', 'false');
		formulaInput.classList.add('pointer-cursor');
	} else if (cellFormula && cellFormula.toLowerCase().startsWith('=dropdown')) {
		formulaInput.textContent = cellFormula;
		formulaInput.setAttribute('contenteditable', 'false');
		formulaInput.classList.add('pointer-cursor');
	} else {
		formulaInput.textContent = cellContent;
		formulaInput.setAttribute('contenteditable', 'true');
	}
	
	scrollToViewWithOffsets(cell);
	
	const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
	const colspan = parseInt(cell.getAttribute('colspan')) || 1;
	const unmergeBtn = document.getElementById('unmerge-btn');
	const mergeBtn = document.getElementById('merge-btn');
	
	if (rowspan > 1 || colspan > 1) {
		unmergeBtn.disabled = false;
	} else {
		unmergeBtn.disabled = true;
	}
	mergeBtn.disabled = true;
	
	window.updateStatusSelection(rowIndex, cellIndex);
	window.saveState();
};

window.updateStatusSelection = function (rowIdx, colIdx) {
	const statusSel = document.getElementById('status-selection');
	if (statusSel) {
		const colLetter = SheetDataManager.getColumnLetter(colIdx);
		const rowNum = rowIdx + 1;
		statusSel.textContent = colLetter + rowNum;
	}
};

window.getColumnWidthRange = function (startCol, endCol) {
	let totalWidth = 0;
	for (let i = startCol; i <= endCol; i++) {
		const cell = document.querySelector('.spreadsheet .letter-cell[data-col="' + i + '"]');
		if (cell) totalWidth += cell.offsetWidth;
	}
	return totalWidth;
};

window.getRowHeightRange = function (startRow, endRow) {
	let totalHeight = 0;
	const counterCells = document.querySelectorAll('.spreadsheet .counter-cell');
	for (let i = startRow; i <= endRow; i++) {
		if (counterCells[i]) totalHeight += counterCells[i].offsetHeight;
	}
	return totalHeight;
};

window.getColumnWidths = function () {
	const widths = [];
	document.querySelectorAll('.spreadsheet .letter-cell').forEach(cell => {
		widths.push(cell.offsetWidth);
	});
	return widths;
};

window.getRowHeights = function () {
	const heights = [];
	document.querySelectorAll('.spreadsheet .counter-cell').forEach(cell => {
		heights.push(cell.offsetHeight);
	});
	return heights;
};

window.snapToCell = function (position, dimensionArray) {
	let cumulativeDimension = 0;
	let previousCumulativeDimension = cumulativeDimension;
	for (let i = 0; i < dimensionArray.length; i++) {
		if (position <= cumulativeDimension) {
			return previousCumulativeDimension;
		}
		previousCumulativeDimension = cumulativeDimension;
		cumulativeDimension += dimensionArray[i];
	}
	return cumulativeDimension;
};

window.updateSelection = function () {
	const areaSelected = document.getElementsByClassName('area-selected-cell');
	while (areaSelected.length > 0) areaSelected[0].classList.remove('area-selected-cell');
	
	const helperDiv = document.getElementById('selection-helper');
	const mergeBtn = document.getElementById('merge-btn');
	const formulaInput = document.getElementById('formula-input');
	
	if (window.startCell === null || window.endCell === null || window.startCell === window.endCell) {
		helperDiv.querySelectorAll('.selection-helper-edge').forEach(el => el.remove());
		helperDiv.style.display = 'none';
		mergeBtn.disabled = true;
		return;
	}
	
	mergeBtn.disabled = false;
	
	const startRowIdx = window.startCell.parentElement.rowIndex;
	const endRowIdx = window.endCell.parentElement.rowIndex;
	const startRow = Math.min(startRowIdx, endRowIdx);
	const endRow = Math.max(startRowIdx, endRowIdx);
	const startCol = Math.min(parseInt(window.startCell.getAttribute('data-col')), parseInt(window.endCell.getAttribute('data-col')));
	const endCol = Math.max(parseInt(window.startCell.getAttribute('data-col')), parseInt(window.endCell.getAttribute('data-col')));
	
	const tableRows = document.querySelectorAll('.spreadsheet tr');
	
	for (let i = startRow; i <= endRow; i++) {
		const row = tableRows[i];
		if (!row) continue;
		for (let j = startCol; j <= endCol; j++) {
			const cell = row.querySelector('td[data-col="' + j + '"]');
			if (cell) cell.classList.add('area-selected-cell');
		}
	}
	
	formulaInput.textContent = '';
	formulaInput.setAttribute('contenteditable', 'false');
	
	const container = document.querySelector('.spreadsheet-container');
	const containerRect = container.getBoundingClientRect();
	
	let firstSelectedCell = tableRows[startRow].querySelector('td[data-col="' + startCol + '"]');
	if (!firstSelectedCell) {
		const cells = Array.from(tableRows[startRow].querySelectorAll('td'));
		for (let i = cells.length - 1; i >= 0; i--) {
			if (parseInt(cells[i].getAttribute('data-col')) <= startCol) {
				firstSelectedCell = cells[i];
				break;
			}
		}
	}
	
	if (!firstSelectedCell) return;
	
	const firstCellRect = firstSelectedCell.getBoundingClientRect();
	const scrollLeft = container.scrollLeft;
	const scrollTop = container.scrollTop;
	
	const top = firstCellRect.top - containerRect.top - 1 + scrollTop;
	const left = firstCellRect.left - containerRect.left - 1 + scrollLeft;
	
	const heightStart = startRow - 1;
	const heightEnd = endRow - 1;
	
	const width = window.getColumnWidthRange(startCol, endCol);
	const height = window.getRowHeightRange(heightStart, heightEnd);
	
	helperDiv.style.top = top + 'px';
	helperDiv.style.left = left + 'px';
	helperDiv.style.width = width + 'px';
	helperDiv.style.height = height + 'px';
	helperDiv.style.display = 'block';
	
	helperDiv.querySelectorAll('.selection-helper-edge').forEach(el => el.remove());
	
	const edges = [
		{ class: 'top', style: { top: '-3px', left: '0', width: '100%' } },
		{ class: 'right', style: { top: '0', right: '-3px', height: '100%' } },
		{ class: 'bottom', style: { bottom: '-3px', left: '0', width: '100%' } },
		{ class: 'left', style: { top: '0', left: '-3px', height: '100%' } }
	];
	
	edges.forEach(edgeData => {
		const div = document.createElement('div');
		div.className = 'selection-helper-edge ' + edgeData.class;
		Object.assign(div.style, edgeData.style);
		helperDiv.appendChild(div);
	});
};

window.saveState = function () {
	if (SheetDataManager.currentFileName && !document.title.endsWith('*')) {
		document.title += '*';
	}
	SheetDataManager.setModified(true);
};

window.updateColumnWidth = function (colIndex, newWidth) {
	const header = document.querySelector('.letter-cell[data-col="' + colIndex + '"]');
	if (header) header.style.width = newWidth + 'px';
	
	const rows = document.querySelectorAll('.spreadsheet tbody tr');
	rows.forEach(row => {
		const cell = row.querySelector('td[data-col="' + colIndex + '"]');
		if (cell) {
			const colspan = parseInt(cell.getAttribute('colspan')) || 1;
			const contentDiv = cell.querySelector('.content-cut');
			if (colspan === 1) {
				contentDiv.style.width = (newWidth - 3) + 'px';
			} else {
				const totalWidth = window.getColumnWidthRange(colIndex, colIndex + colspan - 1);
				contentDiv.style.width = (totalWidth - 3) + 'px';
			}
		} else {
			const cells = Array.from(row.querySelectorAll('td'));
			const coveringCell = cells.find(c => {
				const cIdx = parseInt(c.getAttribute('data-col'));
				const span = parseInt(c.getAttribute('colspan')) || 1;
				return cIdx < colIndex && (cIdx + span) > colIndex;
			});
			if (coveringCell) {
				const startCol = parseInt(coveringCell.getAttribute('data-col'));
				const span = parseInt(coveringCell.getAttribute('colspan'));
				const totalWidth = window.getColumnWidthRange(startCol, startCol + span - 1);
				coveringCell.querySelector('.content-cut').style.width = (totalWidth - 3) + 'px';
			}
		}
	});
};

window.updateRowHeight = function (rowIndex, newHeight) {
	const counterCells = document.querySelectorAll('.counter-cell');
	if (counterCells[rowIndex]) {
		counterCells[rowIndex].style.height = newHeight + 'px';
	}
	
	const rows = document.querySelectorAll('.spreadsheet tbody tr');
	const row = rows[rowIndex];
	
	row.querySelectorAll('td.text-cell').forEach(cell => {
		const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
		const contentDiv = cell.querySelector('.content-cut');
		if (rowspan === 1) {
			contentDiv.style.height = (newHeight - 3) + 'px';
		} else {
			const totalHeight = window.getRowHeightRange(rowIndex, rowIndex + rowspan - 1);
			contentDiv.style.height = (totalHeight - 3) + 'px';
		}
	});
	
	for (let i = 0; i < rowIndex; i++) {
		const prevRow = rows[i];
		prevRow.querySelectorAll('td[rowspan]').forEach(pCell => {
			const span = parseInt(pCell.getAttribute('rowspan')) || 1;
			if (i + span > rowIndex) {
				const totalHeight = window.getRowHeightRange(i, i + span - 1);
				pCell.querySelector('.content-cut').style.height = (totalHeight - 3) + 'px';
			}
		});
	}
};

window.showCustomAlert = function (message) {
	document.getElementById('alert-modal-body').innerHTML = message;
	document.getElementById('alertModal').showModal();
};

window.showToast = function (message) {
	const toast = document.getElementById('toast-notification');
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => {
		toast.classList.remove('show');
	}, 3000);
};

// Initialize
document.addEventListener('DOMContentLoaded', function () {
	initTheme();
	initUiSize();
	initMenuHandlers();
	
	// Listen for the custom event dispatched by renderSheet to re-attach handlers
	document.addEventListener('sheetRendered', function () {
		attachResizeHandlers();
	});
	
	SheetDataManager.init();
	HistoryManager.init();
	LLMManager.init();
	initKeypressListeners();
	initProjectHandlers(); // Initialize Project UI Handlers
	
	// Attach handlers for the initial server-rendered table
	attachResizeHandlers();
	
	const addSheetBtn = document.querySelector('.add-sheet-btn');
	if (addSheetBtn) {
		addSheetBtn.addEventListener('click', function () {
			if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
			const nextNum = SheetDataManager.data.sheets.length + 1;
			SheetDataManager.createSheet('Sheet' + nextNum, false);
		});
	}
	
	const formulaInput = document.getElementById('formula-input');
	let formulaBarDirty = false;
	formulaInput.addEventListener('focus', function () { formulaBarDirty = false; });
	formulaInput.addEventListener('keydown', function () {
		if (!formulaBarDirty) {
			if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
			formulaBarDirty = true;
		}
	});
	formulaInput.addEventListener('input', function () {
		const val = this.textContent;
		const selected = document.querySelector('.selected-cell');
		const areaSelected = document.querySelector('.area-selected-cell');
		if (selected && !areaSelected) {
			selected.querySelector('.content-cut').textContent = val;
			window.saveState();
		}
	});
	formulaInput.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			formulaBarDirty = false;
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				selected.focus();
				const row = selected.closest('tr');
				const nextRow = row.nextElementSibling;
				if (nextRow) {
					const cellCol = parseInt(selected.getAttribute('data-col'));
					const nextCell = nextRow.querySelector('td[data-col="' + cellCol + '"]');
					if (nextCell) window.highlightCell(nextCell);
				}
			}
		}
	});
	formulaInput.addEventListener('click', function () {
		const text = this.textContent;
		if (text.startsWith('=LLM(')) {
			LLMManager.openFormulaBuilder();
		} else if (text.toLowerCase().startsWith('=dropdown(')) {
			DropdownManager.openDropdownBuilder();
		}
	});
	
	const selectionHelper = document.getElementById('selection-helper');
	let isDraggingSelection = false;
	let dragOffset = { top: 0, left: 0 };
	let draggingEdge = null;
	let initialStartCellIndex = { row: 0, col: 0 };
	let initialEndCellIndex = { row: 0, col: 0 };
	
	selectionHelper.addEventListener('mousedown', function (e) {
		if (e.target.classList.contains('selection-helper-edge')) return;
		e.preventDefault();
		e.stopPropagation();
		isDraggingSelection = true;
		const rect = selectionHelper.getBoundingClientRect();
		dragOffset = { left: e.clientX - rect.left, top: e.clientY - rect.top };
		initialStartCellIndex = {
			row: window.startCell.parentElement.rowIndex,
			col: parseInt(window.startCell.getAttribute('data-col'))
		};
	});
	
	const spreadsheet = document.querySelector('.spreadsheet');
	spreadsheet.addEventListener('dblclick', function (e) {
		const cell = e.target.closest('.text-cell');
		if (cell) {
			// Check for LLM Button
			const llmBtn = cell.querySelector('.llm-run-btn');
			if (llmBtn) {
				const r = cell.parentElement.rowIndex - 1;
				const c = parseInt(cell.getAttribute('data-col'));
				LLMManager.executeLLM(r, c, e);
			} else {
				// Otherwise, standard edit/dropdown
				makeCellEditable(cell);
			}
		}
	});
	
	let mouseDown = false;
	spreadsheet.addEventListener('mousedown', function (e) {
		const cell = e.target.closest('.text-cell');
		if (!cell) return;
		if (window.isEditing && cell.classList.contains('edit-cell')) return;
		stopEditing();
		if (!cell.classList.contains('selected-cell')) window.highlightCell(cell);
		window.startCell = null;
		window.endCell = null;
		window.isSelecting = false;
		window.updateSelection();
		mouseDown = true;
		e.preventDefault();
	});
	
	spreadsheet.addEventListener('mousemove', function (e) {
		const cell = e.target.closest('.text-cell');
		if (!cell) return;
		if (mouseDown && !window.isSelecting) {
			window.isSelecting = true;
			window.startCell = cell;
			window.endCell = window.startCell;
			window.updateSelection();
		}
		if (!window.isSelecting) return;
		window.endCell = cell;
		window.updateSelection();
	});
	
	document.addEventListener('mouseup', function () {
		mouseDown = false;
		window.isSelecting = false;
	});
	
	document.addEventListener('mousedown', function (e) {
		if (e.target.classList.contains('selection-helper-edge')) {
			draggingEdge = e.target;
			initialStartCellIndex = {
				row: window.startCell.parentElement.rowIndex,
				col: parseInt(window.startCell.getAttribute('data-col'))
			};
			initialEndCellIndex = {
				row: window.endCell.parentElement.rowIndex,
				col: parseInt(window.endCell.getAttribute('data-col'))
			};
		}
	});
	
	document.addEventListener('mousemove', function (e) {
		const container = document.querySelector('.spreadsheet-container');
		const containerOffset = container.getBoundingClientRect();
		const scrollLeft = container.scrollLeft;
		const scrollTop = container.scrollTop;
		const topCorner = document.querySelector('.top-corner-cell');
		const cornerHeight = topCorner ? topCorner.offsetHeight : 0;
		const cornerWidth = topCorner ? topCorner.offsetWidth : 0;
		
		if (isDraggingSelection) {
			e.preventDefault();
			const rawTop = e.clientY - containerOffset.top + scrollTop - dragOffset.top - cornerHeight;
			const rawLeft = e.clientX - containerOffset.left + scrollLeft - dragOffset.left - cornerWidth;
			const columnWidths = window.getColumnWidths();
			const rowHeights = window.getRowHeights();
			const snappedTop = window.snapToCell(rawTop, rowHeights);
			const snappedLeft = window.snapToCell(rawLeft, columnWidths);
			selectionHelper.style.top = (snappedTop + cornerHeight) + 'px';
			selectionHelper.style.left = (snappedLeft + cornerWidth) + 'px';
			return;
		}
		
		if (draggingEdge) {
			e.preventDefault();
			e.stopPropagation();
			const delta = {
				top: e.pageY - containerOffset.top + scrollTop - cornerHeight,
				left: e.pageX - containerOffset.left + scrollLeft - cornerWidth
			};
			const columnWidths = window.getColumnWidths();
			const rowHeights = window.getRowHeights();
			const newPos = {
				top: window.snapToCell(delta.top, rowHeights) + cornerHeight,
				left: window.snapToCell(delta.left, columnWidths) + cornerWidth
			};
			
			let topCellIndex = 0;
			let leftCellIndex = 0;
			let topPos = newPos.top - cornerHeight;
			let leftPos = newPos.left - cornerWidth;
			
			for (let i = 0; i < rowHeights.length; i++) {
				if (topPos <= 0) break;
				if (topPos < rowHeights[i]) { topCellIndex = i; break; }
				topPos -= rowHeights[i];
				topCellIndex = i;
			}
			for (let i = 0; i < columnWidths.length; i++) {
				if (leftPos <= 0) break;
				if (leftPos < columnWidths[i]) { leftCellIndex = i; break; }
				leftPos -= columnWidths[i];
				leftCellIndex = i;
			}
			
			const colDiff = initialEndCellIndex.col - initialStartCellIndex.col;
			const rowDiff = initialEndCellIndex.row - initialStartCellIndex.row;
			const newWidth = window.getColumnWidthRange(leftCellIndex, leftCellIndex + colDiff);
			const newHeight = window.getRowHeightRange(topCellIndex, topCellIndex + rowDiff);
			
			selectionHelper.style.top = newPos.top + 'px';
			selectionHelper.style.left = newPos.left + 'px';
			selectionHelper.style.width = newWidth + 'px';
			selectionHelper.style.height = newHeight + 'px';
		}
	});
	
	document.addEventListener('mouseup', function () {
		if (draggingEdge) draggingEdge = null;
		if (isDraggingSelection) {
			isDraggingSelection = false;
			const helperTop = parseInt(selectionHelper.style.top);
			const helperLeft = parseInt(selectionHelper.style.left);
			const topCorner = document.querySelector('.top-corner-cell');
			const cornerHeight = topCorner ? topCorner.offsetHeight : 0;
			const cornerWidth = topCorner ? topCorner.offsetWidth : 0;
			const rowHeights = window.getRowHeights();
			const colWidths = window.getColumnWidths();
			
			let targetRow = 0;
			let targetCol = 0;
			let currentH = 0;
			const effectiveTop = helperTop - cornerHeight;
			for (let i = 0; i < rowHeights.length; i++) {
				if (currentH >= effectiveTop - 2) { targetRow = i; break; }
				currentH += rowHeights[i];
				targetRow = i + 1;
			}
			let currentW = 0;
			const effectiveLeft = helperLeft - cornerWidth;
			for (let i = 0; i < colWidths.length; i++) {
				if (currentW >= effectiveLeft - 2) { targetCol = i; break; }
				currentW += colWidths[i];
				targetCol = i + 1;
			}
			
			if (window.startCell && window.endCell) {
				const startRowIdx = window.startCell.parentElement.rowIndex - 1;
				const endRowIdx = window.endCell.parentElement.rowIndex - 1;
				const startColIdx = parseInt(window.startCell.getAttribute('data-col'));
				const endColIdx = parseInt(window.endCell.getAttribute('data-col'));
				const range = {
					startR: Math.min(startRowIdx, endRowIdx),
					endR: Math.max(startRowIdx, endRowIdx),
					startC: Math.min(startColIdx, endColIdx),
					endC: Math.max(startColIdx, endColIdx)
				};
				SheetDataManager.moveRange(range, targetRow, targetCol);
			} else {
				window.updateSelection();
			}
		}
	});
});
