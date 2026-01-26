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
// Persistence Functions
//--------------------------------------------------//

function saveState() {
	var state = {
		cells: {},
		colWidths: [],
		rowHeights: [],
		selectedCell: null
	};
	
	// Save Cell Content and Attributes (Merge status)
	$('.spreadsheet .text-cell').each(function () {
		var $cell = $(this);
		var text = $cell.find('.content-cut').text();
		var rowspan = parseInt($cell.attr('rowspan')) || 1;
		var colspan = parseInt($cell.attr('colspan')) || 1;
		
		// Only save if there is data or structural change
		if (text || rowspan > 1 || colspan > 1) {
			var rowIndex = $cell.parent().index();
			var colIndex = parseInt($cell.attr('data-col'));
			
			// If it's a complex cell (merged), save as object
			if (rowspan > 1 || colspan > 1) {
				state.cells[rowIndex + '-' + colIndex] = {
					text: text,
					rowspan: rowspan,
					colspan: colspan
				};
			} else {
				// Simple text save
				state.cells[rowIndex + '-' + colIndex] = text;
			}
		}
	});
	
	// Save Column Widths
	$('.letter-cell').each(function () {
		state.colWidths.push($(this).outerWidth());
	});
	
	// Save Row Heights
	$('.counter-cell').each(function () {
		state.rowHeights.push($(this).outerHeight());
	});
	
	// Save Selected Cell
	var $selected = $('.selected-cell');
	if ($selected.length) {
		state.selectedCell = {
			row: $selected.parent().index(),
			col: parseInt($selected.attr('data-col'))
		};
	}
	
	localStorage.setItem('cascadePromptState', JSON.stringify(state));
	console.log('State saved');
}

function loadState() {
	var saved = localStorage.getItem('cascadePromptState');
	if (!saved) return;
	
	var state = JSON.parse(saved);
	
	// Restore Column Widths
	if (state.colWidths) {
		var $table = $('.spreadsheet');
		var tableWidth = 0;
		$('.letter-cell').each(function (index) {
			if (state.colWidths[index]) {
				var w = state.colWidths[index];
				$(this).css('width', (w-2) + 'px');
				tableWidth += w;
			}
		});
		// Adjust table width
		if (tableWidth > 0) {
			$table.width(tableWidth + 50);
		}
	}
	
	// Restore Row Heights
	if (state.rowHeights) {
		$('.counter-cell').each(function (index) {
			if (state.rowHeights[index]) {
				var h = state.rowHeights[index];
				$(this).css('height', h + 'px');
			}
		});
	}
	
	// Restore Cell Content and Attributes
	if (state.cells) {
		for (var key in state.cells) {
			var parts = key.split('-');
			var r = parseInt(parts[0]);
			var c = parseInt(parts[1]);
			var cellData = state.cells[key];
			
			// Find cell by data-col
			var $cell = $('.spreadsheet tr').eq(r + 1).find('td[data-col="' + c + '"]');
			
			if (typeof cellData === 'object') {
				// Restore text
				$cell.find('.content-cut').text(cellData.text || '');
				
				// Restore attributes
				if (cellData.rowspan > 1) $cell.attr('rowspan', cellData.rowspan);
				if (cellData.colspan > 1) $cell.attr('colspan', cellData.colspan);
				
				// Remove covered cells
				if (cellData.rowspan > 1 || cellData.colspan > 1) {
					var rowspan = cellData.rowspan || 1;
					var colspan = cellData.colspan || 1;
					
					for (var i = r; i < r + rowspan; i++) {
						for (var j = c; j < c + colspan; j++) {
							if (i === r && j === c) continue;
							// Remove cell
							$('.spreadsheet tr').eq(i + 1).find('td[data-col="' + j + '"]').remove();
						}
					}
				}
				
			} else {
				// Legacy/Simple string format
				$cell.find('.content-cut').text(cellData);
			}
		}
	}
	
	// Restore Selection
	if (state.selectedCell) {
		var $cell = $('.spreadsheet tr').eq(state.selectedCell.row + 1).find('td[data-col="' + state.selectedCell.col + '"]');
		if ($cell.length) {
			highlightCell($cell);
		}
	}
	
	// After loading, we need to ensure widths are correct for merged cells
	// Trigger a resize update for all columns (simplified by just reapplying widths)
	if (state.colWidths) {
		state.colWidths.forEach(function(w, index) {
			updateColumnWidth(index, w);
		});
	}
	
	if (state.rowHeights) {
		state.rowHeights.forEach(function (h, index) {
			updateRowHeight(index, h)
		})
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
		localStorage.removeItem('cascadePromptState');
		location.reload();
	}
}

//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	
	// Load saved data immediately
	loadState();
	
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
	
	$('.text-cell').off('dblclick').on('dblclick', function () {
		makeCellEditable($(this));
	});
	
	// Note: blur event on .text-cell is less relevant now that we use an overlay textarea,
	// but we keep the logic in stopEditing() which is called by other interactions.
	
	// Listen for content changes in editable cells (via textarea sync)
	// This is now handled in makeCellEditable's input listener
	
	$('.text-cell').off('mousedown').on('mousedown', function (e) {
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
	
	$('.spreadsheet').off('mousemove').on('mousemove', '.text-cell', function (e) {
		
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
			console.log('Delta: ', delta);
			
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
			
			console.log('Snapped to: ', topCellIndex, leftCellIndex, delta.left, delta.top);
			
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
