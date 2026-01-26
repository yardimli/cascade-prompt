var isEditing = false;
var isSelecting = false;
var mouseDown = false;
var startCell = null;
var endCell = null;

let draggingEdge = null;
let initialMousePos = { top: 0, left: 0 };
let initialHelperPos = { top: 0, left: 0 };

let initialStartCellIndex = { row: 0, col: 0 };
let initialEndCellIndex = { row: 0, col: 0 };


//--------------------------------------------------//
function highlightCell (cell) {
	var $this = cell;
	var cellIndex = $this.index(); // Get the index of the clicked cell
	var rowIndex = $this.parent().index(); // Get the index of the row
	
	console.log('1) Cell Index: ' + cellIndex + ', Row Index: ' + rowIndex);
	
	// Remove previous highlights and selection
	$('.spreadsheet .highlight').removeClass('highlight');
	$('.spreadsheet .selected-cell').removeClass('selected-cell');
	$('.spreadsheet .edit-cell').removeClass('edit-cell');
	
	// Highlight the column header
	$('.letter-cell').eq(cellIndex - 1).addClass('highlight'); // Adjusting for row header
	
	// Highlight the row number
	$('.counter-cell').eq(rowIndex).addClass('highlight');
	
	// Highlight the clicked cell
	$this.addClass('selected-cell');
	
	// Update Formula Bar - Read from inner div
	var cellContent = $this.find('.content-cut').text();
	$('#formula-input').val(cellContent).prop('disabled', false);
	
	scrollToViewWithOffsets($this[0]);
	
	// Save state on selection change (captures cursor position)
	saveState();
}

//--------------------------------------------------//
// Function to get the cumulative width of columns in a given range
function getColumnWidthRange (startCol, endCol) {
	let totalWidth = 0;
	for (let i = startCol; i <= endCol; i++) {
		totalWidth += $('.spreadsheet .letter-cell').eq(i - 1).outerWidth();
	}
	return totalWidth;
}

//--------------------------------------------------//
// Function to get the cumulative height of rows in a given range
function getRowHeightRange (startRow, endRow) {
	let totalHeight = 0;
	for (let i = startRow; i <= endRow; i++) {
		totalHeight += $('.spreadsheet .counter-cell').eq(i).outerHeight();
	}
	return totalHeight;
}

//--------------------------------------------------//
// Function to get an array of column widths
function getColumnWidths () {
	let widths = [];
	$('.spreadsheet .letter-cell').each(function () {
		widths.push($(this).outerWidth());
	});
	return widths;
}

//--------------------------------------------------//
// Function to get an array of row heights
function getRowHeights () {
	let heights = [];
	$('.spreadsheet .counter-cell').each(function () {
		heights.push($(this).outerHeight());
	});
	return heights;
}

//--------------------------------------------------//
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

//--------------------------------------------------//
// Update the selection rectangle based on start and end cells
function updateSelection () {
	$('.spreadsheet .area-selected-cell').removeClass('area-selected-cell'); // Clear existing selection
	
	if (startCell === null || endCell === null || startCell.is(endCell)) {
		$('.selection-helper-edge').remove();
		$('#selection-helper').hide();
		return;
	}
	
	let startRow = Math.min(startCell.parent().index(), endCell.parent().index());
	let endRow = Math.max(startCell.parent().index(), endCell.parent().index());
	let startCol = Math.min(startCell.index(), endCell.index());
	let endCol = Math.max(startCell.index(), endCell.index());
	
	for (let i = startRow; i <= endRow; i++) {
		for (let j = startCol; j <= endCol; j++) {
			$('.spreadsheet tr').eq(i + 1).find('td').eq(j - 1).addClass('area-selected-cell');
		}
	}
	
	// Disable formula bar if multiple cells are selected
	$('#formula-input').val('').prop('disabled', true);
	
	let firstSelectedCell = $('.spreadsheet .area-selected-cell').first();
	let lastSelectedCell = $('.spreadsheet .area-selected-cell').last();
	let containerOffset = $('.spreadsheet-container').offset();
	let firstCellOffset = firstSelectedCell.offset();
	let lastCellOffset = lastSelectedCell.offset();
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
		$("<div class='selection-helper-edge top'></div>").css({ 'top': -3, 'left': 0, 'width': '100%' }),
		$("<div class='selection-helper-edge right'></div>").css({ 'top': 0, 'right': -3, 'height': '100%' }),
		$("<div class='selection-helper-edge bottom'></div>").css({ 'bottom': -3, 'left': 0, 'width': '100%' }),
		$("<div class='selection-helper-edge left'></div>").css({ 'top': 0, 'left': -3, 'height': '100%' })
	];
	
	edgeElements.forEach(function (edge) {
		helperDiv.append(edge);
	});
}

//--------------------------------------------------//
// Persistence Functions
//--------------------------------------------------//

function saveState () {
	var state = {
		cells: {},
		colWidths: [],
		rowHeights: [],
		selectedCell: null
	};
	
	// Save Cell Content
	$('.spreadsheet .text-cell').each(function () {
		// Read from inner div
		var text = $(this).find('.content-cut').text();
		if (text) {
			var rowIndex = $(this).parent().index();
			var colIndex = $(this).index();
			state.cells[rowIndex + '-' + colIndex] = text;
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
			col: $selected.index()
		};
	}
	
	localStorage.setItem('cascadePromptState', JSON.stringify(state));
	console.log('State saved');
}

function loadState () {
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
				$(this).css('width', w + 'px');
				tableWidth += w;
				
				// NEW: Apply width to all .content-cut divs in this column
				$('.spreadsheet tbody tr').each(function () {
					$(this).find('td').eq(index).find('.content-cut').css('width', w + 'px');
				});
			}
		});
		// Adjust table width
		if (tableWidth > 0) {
			// Add offset for row header
			$table.width(tableWidth + 50);
		}
	}
	
	// Restore Row Heights
	if (state.rowHeights) {
		$('.counter-cell').each(function (index) {
			if (state.rowHeights[index]) {
				var h = state.rowHeights[index];
				$(this).css('height', h + 'px');
				
				// NEW: Apply height to all .content-cut divs in this row
				// index corresponds to the row index in tbody
				$(this).parent().find('.content-cut').css('height', h + 'px');
			}
		});
	}
	
	// Restore Cell Content
	if (state.cells) {
		for (var key in state.cells) {
			var parts = key.split('-');
			var r = parseInt(parts[0]);
			var c = parseInt(parts[1]);
			// Write to inner div
			$('.spreadsheet tr').eq(r + 1).find('td').eq(c - 1).find('.content-cut').text(state.cells[key]);
		}
	}
	
	// Restore Selection
	if (state.selectedCell) {
		var $cell = $('.spreadsheet tr').eq(state.selectedCell.row + 1).find('td').eq(state.selectedCell.col - 1);
		if ($cell.length) {
			highlightCell($cell);
		}
	}
}

function resetState () {
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
	$('#formula-input').on('keydown', function(e) {
		if(e.key === "Enter") {
			var $selected = $('.selected-cell');
			if ($selected.length) {
				// Move focus back to cell or move down
				$selected.focus();
				// Optional: Move selection down like Excel
				var $nextRow = $selected.closest("tr").next("tr");
				if ($nextRow.length) {
					var cellIndex = $selected.index();
					var $nextCell = $nextRow.find("td").eq(cellIndex - 1);
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
		initialMousePos = { top: e.pageY, left: e.pageX };
		initialHelperPos = $('#selection-helper').position();
		
		// Save the initial start and end cell indices for column and row counts
		initialStartCellIndex = {
			row: startCell.parent().index(),
			col: startCell.index()
		};
		initialEndCellIndex = {
			row: endCell.parent().index(),
			col: endCell.index()
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
