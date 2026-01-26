var isEditing = false;
var isSelecting = false;
var mouseDown = false;
var startCell = null;
var endCell = null;

let draggingEdge = null;
let initialMousePos = {top: 0, left: 0};
let initialHelperPos = {top: 0, left: 0};

let initialStartCellIndex = {row: 0, col: 0};
let initialEndCellIndex = {row: 0, col: 0};


//--------------------------------------------------//
function highlightCell(cell) {
	var $this = cell;
	// Use data-col attribute instead of index()
	var cellIndex = parseInt($this.attr('data-col'));
	var rowIndex = $this.parent().index(); // Row index is still reliable from TR
	
	console.log('1) Cell Col: ' + cellIndex + ', Row Index: ' + rowIndex);
	
	// Remove previous highlights and selection
	$('.spreadsheet .highlight').removeClass('highlight');
	$('.spreadsheet .selected-cell').removeClass('selected-cell');
	$('.spreadsheet .edit-cell').removeClass('edit-cell');
	
	// Highlight the column header using data-col
	$('.letter-cell[data-col="' + cellIndex + '"]').addClass('highlight');
	
	// Highlight the row number
	$('.counter-cell').eq(rowIndex).addClass('highlight');
	
	// Highlight the clicked cell
	$this.addClass('selected-cell');
	
	// Update Formula Bar - Read from inner div
	var cellContent = $this.find('.content-cut').text();
	$('#formula-input').val(cellContent).prop('disabled', false);
	
	scrollToViewWithOffsets($this[0]);
	
	// Check for merged status to toggle buttons
	var rowspan = parseInt($this.attr('rowspan')) || 1;
	var colspan = parseInt($this.attr('colspan')) || 1;
	
	if (rowspan > 1 || colspan > 1) {
		$('#unmerge-btn').prop('disabled', false);
	} else {
		$('#unmerge-btn').prop('disabled', true);
	}
	
	// Disable merge button when only one cell is selected
	$('#merge-btn').prop('disabled', true);
	
	// Save state on selection change (captures cursor position)
	saveState();
}

//--------------------------------------------------//
// Function to get the cumulative width of columns in a given range
function getColumnWidthRange(startCol, endCol) {
	let totalWidth = 0;
	for (let i = startCol; i <= endCol; i++) {
		totalWidth += $('.spreadsheet .letter-cell[data-col="' + i + '"]').outerWidth();
	}
	return totalWidth;
}

//--------------------------------------------------//
// Function to get the cumulative height of rows in a given range
function getRowHeightRange(startRow, endRow) {
	let totalHeight = 0;
	for (let i = startRow; i <= endRow; i++) {
		totalHeight += $('.spreadsheet .counter-cell').eq(i).outerHeight();
	}
	return totalHeight;
}

//--------------------------------------------------//
// Function to get an array of column widths
function getColumnWidths() {
	let widths = [];
	$('.spreadsheet .letter-cell').each(function () {
		widths.push($(this).outerWidth());
	});
	return widths;
}

//--------------------------------------------------//
// Function to get an array of row heights
function getRowHeights() {
	let heights = [];
	$('.spreadsheet .counter-cell').each(function () {
		heights.push($(this).outerHeight());
	});
	return heights;
}

//--------------------------------------------------//
function snapToCell(position, dimensionArray) {
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

//--------------------------------------------------//
// Update the selection rectangle based on start and end cells
function updateSelection() {
	$('.spreadsheet .area-selected-cell').removeClass('area-selected-cell'); // Clear existing selection
	
	if (startCell === null || endCell === null || startCell.is(endCell)) {
		$('.selection-helper-edge').remove();
		$('#selection-helper').hide();
		$('#merge-btn').prop('disabled', true); // Disable merge if no area
		return;
	}
	
	// Enable merge button if an area is selected
	$('#merge-btn').prop('disabled', false);
	
	let startRow = Math.min(startCell.parent().index(), endCell.parent().index());
	let endRow = Math.max(startCell.parent().index(), endCell.parent().index());
	
	// Use data-col for column indices
	let startCol = Math.min(parseInt(startCell.attr('data-col')), parseInt(endCell.attr('data-col')));
	let endCol = Math.max(parseInt(startCell.attr('data-col')), parseInt(endCell.attr('data-col')));
	
	for (let i = startRow; i <= endRow; i++) {
		var $row = $('.spreadsheet tr').eq(i + 1);
		for (let j = startCol; j <= endCol; j++) {
			// Find cell by data-col
			$row.find('td[data-col="' + j + '"]').addClass('area-selected-cell');
		}
	}
	
	// Disable formula bar if multiple cells are selected
	$('#formula-input').val('').prop('disabled', true);
	
	// Calculate dimensions based on the theoretical grid, not just selected cells (which might be sparse)
	let containerOffset = $('.spreadsheet-container').offset();
	
	// Find top-left cell of the selection area (might be merged, so we look for the cell at startRow/startCol)
	// If it doesn't exist (merged away), we might need to adjust, but for standard selection it should be fine.
	let firstSelectedCell = $('.spreadsheet tr').eq(startRow + 1).find('td[data-col="' + startCol + '"]');
	
	// If the exact top-left cell is missing (covered by a merge starting elsewhere),
	// we should find the cell that covers this position.
	if (!firstSelectedCell.length) {
		// Fallback: find the closest cell before it
		firstSelectedCell = $('.spreadsheet tr').eq(startRow + 1).find('td').filter(function() {
			return parseInt($(this).attr('data-col')) <= startCol;
		}).last();
	}
	
	if (!firstSelectedCell.length) return; // Should not happen in valid grid
	
	let firstCellOffset = firstSelectedCell.offset();
	let helperDiv = $('#selection-helper');
	
	let scrollLeft = $('.spreadsheet-container').scrollLeft();
	let scrollTop = $('.spreadsheet-container').scrollTop();
	
	let top = firstCellOffset.top - containerOffset.top - 1 + scrollTop;
	let left = firstCellOffset.left - containerOffset.left - 1 + scrollLeft;
	let width = getColumnWidthRange(startCol, endCol);
	let height = getRowHeightRange(startRow, endRow);
	
	helperDiv.css({
		'top': top,
		'left': left,
		'width': width,
		'height': height
	});
	
	helperDiv.show();
	
	// Remove any existing edge elements
	$('.selection-helper-edge').remove();
	
	// Add edge elements
	let edgeElements = [
		$("<div class='selection-helper-edge top'></div>").css({'top': -3, 'left': 0, 'width': '100%'}),
		$("<div class='selection-helper-edge right'></div>").css({'top': 0, 'right': -3, 'height': '100%'}),
		$("<div class='selection-helper-edge bottom'></div>").css({'bottom': -3, 'left': 0, 'width': '100%'}),
		$("<div class='selection-helper-edge left'></div>").css({'top': 0, 'left': -3, 'height': '100%'})
	];
	
	edgeElements.forEach(function (edge) {
		helperDiv.append(edge);
	});
}

//--------------------------------------------------//
// Persistence Functions (Delegated to SheetDataManager)
//--------------------------------------------------//

function saveState() {
	if (typeof SheetDataManager !== 'undefined') {
		SheetDataManager.saveToLocalStorage();
	}
}

// Legacy loadState is replaced by SheetDataManager.init()
// Kept empty or redirected if called explicitly by old code
function loadState() {
	if (typeof SheetDataManager !== 'undefined') {
		// SheetDataManager handles loading internally on init
		// But if called manually, we can force a reload
		SheetDataManager.loadFromLocalStorage();
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
	}
}

// Helper to update column width including merged cells
function updateColumnWidth(colIndex, newWidth) {
	// Update header
	$('.letter-cell[data-col="' + colIndex + '"]').css('width', newWidth + 'px');
	
	// Update cells
	$('.spreadsheet tbody tr').each(function () {
		var $row = $(this);
		
		// Find exact cell
		var $cell = $row.find('td[data-col="' + colIndex + '"]');
		if ($cell.length) {
			// If it's a single cell or start of merge
			var colspan = parseInt($cell.attr('colspan')) || 1;
			if (colspan === 1) {
				$cell.find('.content-cut').css('width', newWidth + 'px');
			} else {
				// Merged cell starting here: recalculate total width
				var totalWidth = getColumnWidthRange(colIndex, colIndex + colspan - 1);
				$cell.find('.content-cut').css('width', totalWidth + 'px');
			}
		} else {
			// Cell might be merged from the left
			// Find the cell that covers this column
			var $coveringCell = $row.find('td').filter(function() {
				var c = parseInt($(this).attr('data-col'));
				var span = parseInt($(this).attr('colspan')) || 1;
				return c < colIndex && (c + span) > colIndex;
			});
			
			if ($coveringCell.length) {
				var startCol = parseInt($coveringCell.attr('data-col'));
				var span = parseInt($coveringCell.attr('colspan'));
				var totalWidth = getColumnWidthRange(startCol, startCol + span - 1);
				$coveringCell.find('.content-cut').css('width', totalWidth + 'px');
			}
		}
	});
}

function updateRowHeight (rowIndex, newHeight) {
	// Update the header cell height
	$('.counter-cell').eq(rowIndex).css('height', newHeight + 'px')
	
	// 1. Handle cells starting in this row
	var $row = $('.spreadsheet tbody tr').eq(rowIndex)
	$row.find('td.text-cell').each(function () {
		var $cell = $(this)
		var rowspan = parseInt($cell.attr('rowspan')) || 1
		
		if (rowspan === 1) {
			// Simple cell, matches row height
			$cell.find('.content-cut').css('height', newHeight + 'px')
		} else {
			// Merged cell starting here: recalculate total height based on range
			var totalHeight = getRowHeightRange(rowIndex, rowIndex + rowspan - 1)
			$cell.find('.content-cut').css('height', totalHeight + 'px')
		}
	})
	
	// 2. Handle cells starting in previous rows that span into this row
	// We iterate rows above the current one to find any overlapping merges
	$('.spreadsheet tbody tr').slice(0, rowIndex).each(function () {
		var $prevRow = $(this)
		var prevRowIndex = $prevRow.index()
		
		// Find cells in this previous row that have a rowspan
		$prevRow.find('td[rowspan]').each(function () {
			var $pCell = $(this)
			var span = parseInt($pCell.attr('rowspan')) || 1
			
			// Check if this merged cell overlaps the resized row
			if (prevRowIndex + span > rowIndex) {
				var totalHeight = getRowHeightRange(prevRowIndex, prevRowIndex + span - 1)
				$pCell.find('.content-cut').css('height', totalHeight + 'px')
			}
		})
	})
}

function resetState() {
	if (confirm('Are you sure you want to reset the spreadsheet? All data will be lost.')) {
		SheetDataManager.resetData();
	}
}

//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	
	// Initialize Data Manager
	if (typeof SheetDataManager !== 'undefined') {
		SheetDataManager.init();
	}
	
	// Add Sheet Button Listener
	$('.add-sheet-btn').on('click', function () {
		var nextNum = SheetDataManager.data.sheets.length + 1;
		SheetDataManager.createSheet('Sheet' + nextNum, false);
	});
	
	// Reset Button Listener
	$('#reset-sheet-btn').on('click', function () {
		resetState();
	});
	
	// Formula Bar Input Listener
	$('#formula-input').on('input', function () {
		var val = $(this).val();
		var $selected = $('.selected-cell');
		if ($selected.length && !$('.area-selected-cell').length) {
			// Update inner div
			$selected.find('.content-cut').text(val);
			saveState(); // Save on typing
		}
	});
	
	// Handle Enter in Formula Bar
	$('#formula-input').on('keydown', function (e) {
		if (e.key === "Enter") {
			var $selected = $('.selected-cell');
			if ($selected.length) {
				// Move focus back to cell or move down
				$selected.focus();
				// Optional: Move selection down like Excel
				var $nextRow = $selected.closest("tr").next("tr");
				if ($nextRow.length) {
					var cellCol = parseInt($selected.attr('data-col'));
					var $nextCell = $nextRow.find('td[data-col="' + cellCol + '"]');
					if ($nextCell.length) {
						highlightCell($nextCell);
					}
				}
			}
		}
	});
	
	$('#selection-helper').on('mousedown', function (e) {
		if ($(e.target).hasClass('selection-helper-edge')) {
			return;
		}
		stopEditing(); // Stop editing any cell before highlighting a new cell
		startCell = null;
		endCell = null;
		isSelecting = false;
		updateSelection();
	});
	
	// Use delegated event for double click to handle re-rendered sheets
	$('.spreadsheet').on('dblclick', '.text-cell', function () {
		makeCellEditable($(this));
	});
	
	// Use delegated event for mousedown
	$('.spreadsheet').on('mousedown', '.text-cell', function (e) {
		console.log('mousedown');
		
		if (isEditing && $(this).hasClass('edit-cell')) {
			console.log('Selection helper clicked while editing');
			return;
		}
		
		stopEditing(); // Stop editing any cell before highlighting a new cell
		if (!$(this).hasClass('selected-cell')) {
			highlightCell($(this));
		}
		startCell = null;
		endCell = null;
		isSelecting = false;
		updateSelection();
		
		mouseDown = true;
		e.preventDefault();
	});
	
	$('.spreadsheet').on('mousemove', '.text-cell', function (e) {
		
		if (mouseDown && !isSelecting) {
			isSelecting = true;
			startCell = $(this);
			endCell = startCell; // Initially, the start cell is the end cell
			updateSelection();
		}
		
		if (!isSelecting) return;
		endCell = $(this);
		updateSelection();
	});
	
	$(document).off('mouseup').on('mouseup', function (e) {
		mouseDown = false;
		isSelecting = false;
	});
	
	
	//--------------------------------------------------//
	// Handle dragging edges
	$(document).off('mousedown', '.selection-helper-edge').on('mousedown', '.selection-helper-edge', function (e) {
		draggingEdge = $(this);
		initialMousePos = {top: e.pageY, left: e.pageX};
		initialHelperPos = $('#selection-helper').position();
		
		// Save the initial start and end cell indices for column and row counts
		initialStartCellIndex = {
			row: startCell.parent().index(),
			col: parseInt(startCell.attr('data-col'))
		};
		initialEndCellIndex = {
			row: endCell.parent().index(),
			col: parseInt(endCell.attr('data-col'))
		};
	});
	
	$(document).off('mousemove.edgeDrag').on('mousemove.edgeDrag', function (e) {
		if (draggingEdge) {
			e.preventDefault();
			e.stopPropagation();
			
			var scrollLeft = $('.spreadsheet-container').scrollLeft();
			var scrollTop = $('.spreadsheet-container').scrollTop();
			let containerOffset = $('.spreadsheet-container').offset();
			let delta = {
				top: e.pageY - containerOffset.top + scrollTop - $('.top-corner-cell').outerHeight(),
				left: e.pageX - containerOffset.left + scrollLeft - $('.top-corner-cell').outerWidth()
			};
			
			let columnWidths = getColumnWidths();
			let rowHeights = getRowHeights();
			
			let newPos = {
				top: snapToCell(delta.top, rowHeights) + $('.top-corner-cell').outerHeight(),
				left: snapToCell(delta.left, columnWidths) + $('.top-corner-cell').outerWidth()
			};
			
			//get the top and left cell numbers being snapped to
			let topCellIndex = 0;
			let leftCellIndex = 0;
			let topPos = newPos.top;
			let leftPos = newPos.left;
			
			for (let i = 0; i < rowHeights.length; i++) {
				if (topPos <= rowHeights[i]) {
					topCellIndex = i;
					break;
				}
				topPos -= rowHeights[i];
			}
			for (let i = 0; i < columnWidths.length; i++) {
				if (leftPos <= columnWidths[i]) {
					leftCellIndex = i;
					break;
				}
				leftPos -= columnWidths[i];
			}
			
			// Ensure the selection rectangle resizes proportionally to the initial selection size
			let newWidth = getColumnWidthRange(leftCellIndex + 1, leftCellIndex + (initialEndCellIndex.col - initialStartCellIndex.col) + 1);
			
			let newHeight = getRowHeightRange(topCellIndex + 1, topCellIndex + (initialEndCellIndex.row - initialStartCellIndex.row) + 1);
			
			$('#selection-helper').css({
				'top': newPos.top,
				'left': newPos.left,
				'width': newWidth,
				'height': newHeight
			});
		}
	});
	
	$(document).off('mouseup.edgeDrag').on('mouseup.edgeDrag', function () {
		if (draggingEdge) {
			draggingEdge = null;
		}
	});
	
});
