var isEditing = false;
var isSelecting = false;
var mouseDown = false;
var startCell = null;
var endCell = null;

var isDraggingSelection = false;
var dragOffset = { top: 0, left: 0 };

let draggingEdge = null;
let initialMousePos = { top: 0, left: 0 };
let initialHelperPos = { top: 0, left: 0 };

let initialStartCellIndex = { row: 0, col: 0 };
let initialEndCellIndex = { row: 0, col: 0 };

// --------------------------------------------------//
function highlightCell (cell) {
	const cellIndex = parseInt(cell.getAttribute('data-col'));
	// Row index from TR. Note: parentElement is TR.
	const row = cell.parentElement;
	// We need the index in the tbody to match counter-cell
	const tbody = row.parentElement;
	const rowIndex = Array.from(tbody.children).indexOf(row);
	
	console.log('1) Cell Col: ' + cellIndex + ', Row Index: ' + rowIndex);
	
	// Remove previous highlights and selection
	// Optimization: Use getElementsByClassName for live collection speed
	const highlights = document.getElementsByClassName('highlight');
	while (highlights.length > 0) highlights[0].classList.remove('highlight');
	
	const selected = document.getElementsByClassName('selected-cell');
	while (selected.length > 0) selected[0].classList.remove('selected-cell');
	
	const editing = document.getElementsByClassName('edit-cell');
	while (editing.length > 0) editing[0].classList.remove('edit-cell');
	
	// Highlight the column header
	const letterCell = document.querySelector('.letter-cell[data-col="' + cellIndex + '"]');
	if (letterCell) letterCell.classList.add('highlight');
	
	// Highlight the row number
	const counterCells = document.querySelectorAll('.counter-cell');
	if (counterCells[rowIndex]) counterCells[rowIndex].classList.add('highlight');
	
	// Highlight the clicked cell
	cell.classList.add('selected-cell');
	
	// Update Formula Bar - Read from inner div
	const cellContent = cell.querySelector('.content-cut').textContent;
	const formulaInput = document.getElementById('formula-input');
	
	// --- NEW: Check for LLM Data to display special formula text ---
	const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
	const key = rowIndex + '-' + cellIndex;
	if (sheet.cells[key] && sheet.cells[key].llm) {
		const funcName = sheet.cells[key].llm.funcName || 'Run LLM';
		formulaInput.textContent = `=LLM("${funcName}")`;
		// Make it read-only for direct editing, force click to open dialog
		formulaInput.setAttribute('contenteditable', 'false');
	} else {
		formulaInput.textContent = cellContent;
		formulaInput.setAttribute('contenteditable', 'true');
	}
	
	scrollToViewWithOffsets(cell);
	
	// Check for merged status to toggle buttons
	const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
	const colspan = parseInt(cell.getAttribute('colspan')) || 1;
	
	const unmergeBtn = document.getElementById('unmerge-btn');
	const mergeBtn = document.getElementById('merge-btn');
	
	if (rowspan > 1 || colspan > 1) {
		unmergeBtn.disabled = false;
	} else {
		unmergeBtn.disabled = true;
	}
	
	// Disable merge button when only one cell is selected
	mergeBtn.disabled = true;
	
	// Update Status Bar Selection
	updateStatusSelection(rowIndex, cellIndex);
	
	// Save state on selection change (captures cursor position)
	saveState();
}

// --------------------------------------------------//
// Helper to update status bar selection text
function updateStatusSelection (rowIdx, colIdx) {
	const statusSel = document.getElementById('status-selection');
	if (statusSel) {
		const colLetter = SheetDataManager.getColumnLetter(colIdx);
		const rowNum = rowIdx + 1;
		statusSel.textContent = colLetter + rowNum;
	}
}

// --------------------------------------------------//
// Function to get the cumulative width of columns in a given range
function getColumnWidthRange (startCol, endCol) {
	let totalWidth = 0;
	for (let i = startCol; i <= endCol; i++) {
		const cell = document.querySelector('.spreadsheet .letter-cell[data-col="' + i + '"]');
		if (cell) totalWidth += cell.offsetWidth;
	}
	return totalWidth;
}

// --------------------------------------------------//
// Function to get the cumulative height of rows in a given range
function getRowHeightRange (startRow, endRow) {
	let totalHeight = 0;
	const counterCells = document.querySelectorAll('.spreadsheet .counter-cell');
	for (let i = startRow; i <= endRow; i++) {
		if (counterCells[i]) totalHeight += counterCells[i].offsetHeight;
	}
	return totalHeight;
}

// --------------------------------------------------//
// Function to get an array of column widths
function getColumnWidths () {
	const widths = [];
	document.querySelectorAll('.spreadsheet .letter-cell').forEach(cell => {
		widths.push(cell.offsetWidth);
	});
	return widths;
}

// --------------------------------------------------//
// Function to get an array of row heights
function getRowHeights () {
	const heights = [];
	document.querySelectorAll('.spreadsheet .counter-cell').forEach(cell => {
		heights.push(cell.offsetHeight);
	});
	return heights;
}

// --------------------------------------------------//
function snapToCell (position, dimensionArray) {
	let cumulativeDimension = 0;
	let previousCumulativeDimension = cumulativeDimension;
	for (let i = 0; i < dimensionArray.length; i++) {
		if (position <= cumulativeDimension) {
			return previousCumulativeDimension;
		}
		previousCumulativeDimension = cumulativeDimension;
		cumulativeDimension += dimensionArray[i];
	}
	return cumulativeDimension; // Fallback to the last cell boundary
}

// --------------------------------------------------//
// Update the selection rectangle based on start and end cells
function updateSelection () {
	// Optimization: Use getElementsByClassName for faster clearing
	const areaSelected = document.getElementsByClassName('area-selected-cell');
	while (areaSelected.length > 0) areaSelected[0].classList.remove('area-selected-cell');
	
	const helperDiv = document.getElementById('selection-helper');
	const mergeBtn = document.getElementById('merge-btn');
	const formulaInput = document.getElementById('formula-input');
	
	if (startCell === null || endCell === null || startCell === endCell) {
		// Remove edges
		helperDiv.querySelectorAll('.selection-helper-edge').forEach(el => el.remove());
		helperDiv.style.display = 'none';
		mergeBtn.disabled = true;
		return;
	}
	
	// Enable merge button if an area is selected
	mergeBtn.disabled = false;
	
	const startRowIdx = startCell.parentElement.rowIndex;
	const endRowIdx = endCell.parentElement.rowIndex;
	
	const startRow = Math.min(startRowIdx, endRowIdx);
	const endRow = Math.max(startRowIdx, endRowIdx);
	
	const startCol = Math.min(parseInt(startCell.getAttribute('data-col')), parseInt(endCell.getAttribute('data-col')));
	const endCol = Math.max(parseInt(startCell.getAttribute('data-col')), parseInt(endCell.getAttribute('data-col')));
	
	const tableRows = document.querySelectorAll('.spreadsheet tr');
	
	// Loop through relevant rows (adjusting for thead which is row 0)
	for (let i = startRow; i <= endRow; i++) {
		const row = tableRows[i];
		if (!row) continue;
		for (let j = startCol; j <= endCol; j++) {
			const cell = row.querySelector('td[data-col="' + j + '"]');
			if (cell) cell.classList.add('area-selected-cell');
		}
	}
	
	// Disable formula bar if multiple cells are selected
	formulaInput.textContent = '';
	formulaInput.setAttribute('contenteditable', 'false');
	
	// Calculate dimensions
	const container = document.querySelector('.spreadsheet-container');
	const containerRect = container.getBoundingClientRect();
	
	// Find top-left cell of the selection area
	let firstSelectedCell = tableRows[startRow].querySelector('td[data-col="' + startCol + '"]');
	
	// Fallback if merged
	if (!firstSelectedCell) {
		const cells = Array.from(tableRows[startRow].querySelectorAll('td'));
		// Find last cell with data-col <= startCol
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
	
	// Adjust row indices for height calculation.
	// getRowHeightRange expects 0-based index of counter cells (tbody rows)
	// startRow is TR index (0 is header). So subtract 1.
	const heightStart = startRow - 1;
	const heightEnd = endRow - 1;
	
	const width = getColumnWidthRange(startCol, endCol);
	const height = getRowHeightRange(heightStart, heightEnd);
	
	helperDiv.style.top = top + 'px';
	helperDiv.style.left = left + 'px';
	helperDiv.style.width = width + 'px';
	helperDiv.style.height = height + 'px';
	helperDiv.style.display = 'block';
	
	// Remove existing edges
	helperDiv.querySelectorAll('.selection-helper-edge').forEach(el => el.remove());
	
	// Add edge elements
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
}

// --------------------------------------------------//
// Persistence Functions (Delegated to SheetDataManager)
// --------------------------------------------------//

function saveState () {
	if (SheetDataManager.currentFileName && !document.title.endsWith('*')) {
		document.title += '*';
	}
	// Mark as modified in data manager
	SheetDataManager.setModified(true);
}

// Helper to update column width including merged cells
function updateColumnWidth (colIndex, newWidth) {
	// Update header
	const header = document.querySelector('.letter-cell[data-col="' + colIndex + '"]');
	if (header) header.style.width = newWidth + 'px';
	
	// Update cells
	const rows = document.querySelectorAll('.spreadsheet tbody tr');
	rows.forEach(row => {
		// Find exact cell
		const cell = row.querySelector('td[data-col="' + colIndex + '"]');
		if (cell) {
			const colspan = parseInt(cell.getAttribute('colspan')) || 1;
			const contentDiv = cell.querySelector('.content-cut');
			if (colspan === 1) {
				contentDiv.style.width = (newWidth - 3) + 'px';
			} else {
				// Merged cell starting here
				const totalWidth = getColumnWidthRange(colIndex, colIndex + colspan - 1);
				contentDiv.style.width = (totalWidth - 3) + 'px';
			}
		} else {
			// Cell might be merged from the left
			const cells = Array.from(row.querySelectorAll('td'));
			const coveringCell = cells.find(c => {
				const cIdx = parseInt(c.getAttribute('data-col'));
				const span = parseInt(c.getAttribute('colspan')) || 1;
				return cIdx < colIndex && (cIdx + span) > colIndex;
			});
			
			if (coveringCell) {
				const startCol = parseInt(coveringCell.getAttribute('data-col'));
				const span = parseInt(coveringCell.getAttribute('colspan'));
				const totalWidth = getColumnWidthRange(startCol, startCol + span - 1);
				coveringCell.querySelector('.content-cut').style.width = (totalWidth - 3) + 'px';
			}
		}
	});
}

function updateRowHeight (rowIndex, newHeight) {
	// Update the header cell height
	const counterCells = document.querySelectorAll('.counter-cell');
	if (counterCells[rowIndex]) {
		counterCells[rowIndex].style.height = newHeight + 'px';
	}
	
	const rows = document.querySelectorAll('.spreadsheet tbody tr');
	const row = rows[rowIndex];
	
	// 1. Handle cells starting in this row
	row.querySelectorAll('td.text-cell').forEach(cell => {
		const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
		const contentDiv = cell.querySelector('.content-cut');
		
		if (rowspan === 1) {
			contentDiv.style.height = (newHeight - 3) + 'px';
		} else {
			const totalHeight = getRowHeightRange(rowIndex, rowIndex + rowspan - 1);
			contentDiv.style.height = (totalHeight - 3) + 'px';
		}
	});
	
	// 2. Handle cells starting in previous rows that span into this row
	for (let i = 0; i < rowIndex; i++) {
		const prevRow = rows[i];
		prevRow.querySelectorAll('td[rowspan]').forEach(pCell => {
			const span = parseInt(pCell.getAttribute('rowspan')) || 1;
			// Check overlap
			if (i + span > rowIndex) {
				const totalHeight = getRowHeightRange(i, i + span - 1);
				pCell.querySelector('.content-cut').style.height = (totalHeight - 3) + 'px';
			}
		});
	}
}

function resetState () {
	SheetDataManager.newProject();
}

// --------------------------------------------------//
// ----------------- Document Ready -----------------//
document.addEventListener('DOMContentLoaded', function () {
	// Initialize Data Manager
	if (typeof SheetDataManager !== 'undefined') {
		SheetDataManager.init();
	}
	
	// Initialize History Manager
	if (typeof HistoryManager !== 'undefined') {
		HistoryManager.init();
	}
	
	// Add Sheet Button Listener
	const addSheetBtn = document.querySelector('.add-sheet-btn');
	if (addSheetBtn) {
		addSheetBtn.addEventListener('click', function () {
			// Capture history before adding sheet
			if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
			
			const nextNum = SheetDataManager.data.sheets.length + 1;
			SheetDataManager.createSheet('Sheet' + nextNum, false);
		});
	}
	
	// Reset Button Listener
	const resetBtn = document.getElementById('reset-sheet-btn');
	if (resetBtn) {
		resetBtn.addEventListener('click', function () {
			resetState();
		});
	}
	
	// Formula Bar Input Listener
	const formulaInput = document.getElementById('formula-input');
	// We need to capture history before the user starts typing in the formula bar,
	// but 'input' fires on every keystroke. 'focus' is too early (no change yet).
	// 'keydown' is suitable to capture state once before changes begin.
	let formulaBarDirty = false;
	
	formulaInput.addEventListener('focus', function () {
		formulaBarDirty = false;
	});
	
	formulaInput.addEventListener('keydown', function () {
		if (!formulaBarDirty) {
			if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
			formulaBarDirty = true;
		}
	});
	
	formulaInput.addEventListener('input', function () {
		// Fix: Use textContent for div
		const val = this.textContent;
		const selected = document.querySelector('.selected-cell');
		const areaSelected = document.querySelector('.area-selected-cell');
		
		if (selected && !areaSelected) {
			selected.querySelector('.content-cut').textContent = val;
			saveState();
		}
	});
	
	// Handle Enter in Formula Bar
	formulaInput.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') {
			e.preventDefault(); // Prevent newline in formula bar
			formulaBarDirty = false; // Reset dirty flag on commit
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				selected.focus();
				// Optional: Move selection down
				const row = selected.closest('tr');
				const nextRow = row.nextElementSibling;
				if (nextRow) {
					const cellCol = parseInt(selected.getAttribute('data-col'));
					const nextCell = nextRow.querySelector('td[data-col="' + cellCol + '"]');
					if (nextCell) {
						highlightCell(nextCell);
					}
				}
			}
		}
	});
	
	// --- NEW: Handle Click on Formula Bar to open LLM Dialog ---
	formulaInput.addEventListener('click', function () {
		const text = this.textContent;
		if (text.startsWith('=LLM(')) {
			LLMManager.openFormulaBuilder();
		}
	});
	
	const selectionHelper = document.getElementById('selection-helper');
	
	selectionHelper.addEventListener('mousedown', function (e) {
		// If clicking an edge resizer, let the document listener handle it
		if (e.target.classList.contains('selection-helper-edge')) {
			return;
		}
		
		// Start dragging the selection block
		e.preventDefault();
		e.stopPropagation();
		
		isDraggingSelection = true;
		
		// Calculate offset of mouse relative to the helper's top-left
		const rect = selectionHelper.getBoundingClientRect();
		dragOffset = {
			left: e.clientX - rect.left,
			top: e.clientY - rect.top
		};
		
		// Store initial indices to calculate move delta later
		initialStartCellIndex = {
			row: startCell.parentElement.rowIndex, // Note: includes header row (0)
			col: parseInt(startCell.getAttribute('data-col'))
		};
	});
	
	const spreadsheet = document.querySelector('.spreadsheet');
	
	// Double click delegation
	spreadsheet.addEventListener('dblclick', function (e) {
		const cell = e.target.closest('.text-cell');
		if (cell) {
			makeCellEditable(cell);
		}
	});
	
	// Mousedown delegation
	spreadsheet.addEventListener('mousedown', function (e) {
		const cell = e.target.closest('.text-cell');
		if (!cell) return;
		
		console.log('mousedown');
		
		if (isEditing && cell.classList.contains('edit-cell')) {
			console.log('Selection helper clicked while editing');
			return;
		}
		
		stopEditing();
		if (!cell.classList.contains('selected-cell')) {
			highlightCell(cell);
		}
		startCell = null;
		endCell = null;
		isSelecting = false;
		updateSelection();
		
		mouseDown = true;
		e.preventDefault();
	});
	
	// Mousemove delegation
	spreadsheet.addEventListener('mousemove', function (e) {
		const cell = e.target.closest('.text-cell');
		if (!cell) return;
		
		if (mouseDown && !isSelecting) {
			isSelecting = true;
			startCell = cell;
			endCell = startCell;
			updateSelection();
		}
		
		if (!isSelecting) return;
		endCell = cell;
		updateSelection();
	});
	
	document.addEventListener('mouseup', function () {
		mouseDown = false;
		isSelecting = false;
	});
	
	// --------------------------------------------------//
	// Handle dragging edges
	document.addEventListener('mousedown', function (e) {
		if (e.target.classList.contains('selection-helper-edge')) {
			draggingEdge = e.target;
			initialMousePos = { top: e.pageY, left: e.pageX };
			
			// Helper position
			const rect = selectionHelper.getBoundingClientRect();
			// We need offset relative to parent, but selectionHelper is absolute.
			// We can use offsetLeft/Top
			initialHelperPos = { top: selectionHelper.offsetTop, left: selectionHelper.offsetLeft };
			
			initialStartCellIndex = {
				row: startCell.parentElement.rowIndex,
				col: parseInt(startCell.getAttribute('data-col'))
			};
			initialEndCellIndex = {
				row: endCell.parentElement.rowIndex,
				col: parseInt(endCell.getAttribute('data-col'))
			};
		}
	});
	
	// Unified Mouse Move for Dragging Edge OR Dragging Selection
	document.addEventListener('mousemove', function (e) {
		const container = document.querySelector('.spreadsheet-container');
		const containerOffset = container.getBoundingClientRect();
		const scrollLeft = container.scrollLeft;
		const scrollTop = container.scrollTop;
		
		const topCorner = document.querySelector('.top-corner-cell');
		const cornerHeight = topCorner ? topCorner.offsetHeight : 0;
		const cornerWidth = topCorner ? topCorner.offsetWidth : 0;
		
		// 1. Handle Dragging the Whole Selection (Move Cells)
		if (isDraggingSelection) {
			e.preventDefault();
			
			// Calculate desired top/left based on mouse pos minus offset
			// Adjust for container scroll and position
			const rawTop = e.clientY - containerOffset.top + scrollTop - dragOffset.top - cornerHeight;
			const rawLeft = e.clientX - containerOffset.left + scrollLeft - dragOffset.left - cornerWidth;
			
			const columnWidths = getColumnWidths();
			const rowHeights = getRowHeights();
			
			// Snap to nearest cell
			const snappedTop = snapToCell(rawTop, rowHeights);
			const snappedLeft = snapToCell(rawLeft, columnWidths);
			
			// Apply position (add corner offsets back)
			selectionHelper.style.top = (snappedTop + cornerHeight) + 'px';
			selectionHelper.style.left = (snappedLeft + cornerWidth) + 'px';
			
			return;
		}
		
		// 2. Handle Resizing Selection Edge
		if (draggingEdge) {
			e.preventDefault();
			e.stopPropagation();
			
			const delta = {
				top: e.pageY - containerOffset.top + scrollTop - cornerHeight,
				left: e.pageX - containerOffset.left + scrollLeft - cornerWidth
			};
			
			const columnWidths = getColumnWidths();
			const rowHeights = getRowHeights();
			
			const newPos = {
				top: snapToCell(delta.top, rowHeights) + cornerHeight,
				left: snapToCell(delta.left, columnWidths) + cornerWidth
			};
			
			// Get cell indices
			let topCellIndex = 0;
			let leftCellIndex = 0;
			let topPos = newPos.top - cornerHeight; // Adjust back for calculation
			let leftPos = newPos.left - cornerWidth;
			
			for (let i = 0; i < rowHeights.length; i++) {
				if (topPos <= 0) break; // Approximate
				if (topPos < rowHeights[i]) {
					topCellIndex = i;
					break;
				}
				topPos -= rowHeights[i];
				topCellIndex = i; // Keep advancing
			}
			
			for (let i = 0; i < columnWidths.length; i++) {
				if (leftPos <= 0) break;
				if (leftPos < columnWidths[i]) {
					leftCellIndex = i;
					break;
				}
				leftPos -= columnWidths[i];
				leftCellIndex = i;
			}
			
			// Calculate new width/height based on indices
			const colDiff = initialEndCellIndex.col - initialStartCellIndex.col;
			const rowDiff = initialEndCellIndex.row - initialStartCellIndex.row;
			
			const newWidth = getColumnWidthRange(leftCellIndex, leftCellIndex + colDiff);
			const newHeight = getRowHeightRange(topCellIndex, topCellIndex + rowDiff);
			
			selectionHelper.style.top = newPos.top + 'px';
			selectionHelper.style.left = newPos.left + 'px';
			selectionHelper.style.width = newWidth + 'px';
			selectionHelper.style.height = newHeight + 'px';
		}
	});
	
	// Unified Mouse Up
	document.addEventListener('mouseup', function () {
		if (draggingEdge) {
			draggingEdge = null;
		}
		
		if (isDraggingSelection) {
			isDraggingSelection = false;
			
			// Determine where we dropped it
			const helperTop = parseInt(selectionHelper.style.top);
			const helperLeft = parseInt(selectionHelper.style.left);
			
			const topCorner = document.querySelector('.top-corner-cell');
			const cornerHeight = topCorner ? topCorner.offsetHeight : 0;
			const cornerWidth = topCorner ? topCorner.offsetWidth : 0;
			
			// Convert pixels back to row/col indices
			const rowHeights = getRowHeights();
			const colWidths = getColumnWidths();
			
			let targetRow = 0;
			let targetCol = 0;
			
			let currentH = 0;
			// Adjust for header height
			const effectiveTop = helperTop - cornerHeight;
			for (let i = 0; i < rowHeights.length; i++) {
				if (currentH >= effectiveTop - 2) { // -2 for fuzzy tolerance
					targetRow = i;
					break;
				}
				currentH += rowHeights[i];
				targetRow = i + 1;
			}
			
			let currentW = 0;
			// Adjust for sidebar width
			const effectiveLeft = helperLeft - cornerWidth;
			for (let i = 0; i < colWidths.length; i++) {
				if (currentW >= effectiveLeft - 2) {
					targetCol = i;
					break;
				}
				currentW += colWidths[i];
				targetCol = i + 1;
			}
			
			// Perform the move via DataManager
			if (startCell && endCell) {
				const startRowIdx = startCell.parentElement.rowIndex - 1; // 0-based index in tbody
				const endRowIdx = endCell.parentElement.rowIndex - 1;
				
				const startColIdx = parseInt(startCell.getAttribute('data-col'));
				const endColIdx = parseInt(endCell.getAttribute('data-col'));
				
				const range = {
					startR: Math.min(startRowIdx, endRowIdx),
					endR: Math.max(startRowIdx, endRowIdx),
					startC: Math.min(startColIdx, endColIdx),
					endC: Math.max(startColIdx, endColIdx)
				};
				
				SheetDataManager.moveRange(range, targetRow, targetCol);
			} else {
				// Revert visual if something went wrong
				updateSelection();
			}
		}
	});
});
