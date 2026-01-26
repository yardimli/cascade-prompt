var isEditing = false;
var isSelecting = false;
var mouseDown = false
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
	var cellIndex = $this.index(); // Get the index of the clicked cell
	var rowIndex = $this.parent().index(); // Get the index of the row
	
	console.log("1) Cell Index: " + cellIndex + ", Row Index: " + rowIndex);
	
	// Remove previous highlights and selection
	$(".spreadsheet .highlight").removeClass("highlight");
	$(".spreadsheet .selected-cell").removeClass("selected-cell");
	$(".spreadsheet .edit-cell").removeClass("edit-cell");
	
	// Highlight the column header
	$(".letter-cell").eq(cellIndex - 1).addClass("highlight"); // Adjusting for row header
	
	// Highlight the row number
	$(".counter-cell").eq(rowIndex).addClass("highlight");
	
	// Highlight the clicked cell
	$this.addClass("selected-cell");
	
	scrollToViewWithOffsets($this[0]);
}

//--------------------------------------------------//
// Function to get the cumulative width of columns in a given range
function getColumnWidthRange(startCol, endCol) {
	let totalWidth = 0;
	for (let i = startCol; i <= endCol; i++) {
		totalWidth += $(".spreadsheet .letter-cell").eq(i - 1).outerWidth();
	}
	return totalWidth;
}

//--------------------------------------------------//
// Function to get the cumulative height of rows in a given range
function getRowHeightRange(startRow, endRow) {
	let totalHeight = 0;
	for (let i = startRow; i <= endRow; i++) {
		totalHeight += $(".spreadsheet .counter-cell").eq(i).outerHeight();
	}
	return totalHeight;
}

//--------------------------------------------------//
// Function to get an array of column widths
function getColumnWidths() {
	let widths = [];
	$(".spreadsheet .letter-cell").each(function () {
		widths.push($(this).outerWidth());
	});
	return widths;
}

//--------------------------------------------------//
// Function to get an array of row heights
function getRowHeights() {
	let heights = [];
	$(".spreadsheet .counter-cell").each(function () {
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
	$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell"); // Clear existing selection
	
	if (startCell === null || endCell === null || startCell.is(endCell)) {
		$(".selection-helper-edge").remove();
		$("#selection-helper").hide();
		return;
	}
	
	let startRow = Math.min(startCell.parent().index(), endCell.parent().index());
	let endRow = Math.max(startCell.parent().index(), endCell.parent().index());
	let startCol = Math.min(startCell.index(), endCell.index());
	let endCol = Math.max(startCell.index(), endCell.index());
	
	for (let i = startRow; i <= endRow; i++) {
		for (let j = startCol; j <= endCol; j++) {
			$(".spreadsheet tr").eq(i + 1).find("td").eq(j - 1).addClass("area-selected-cell");
		}
	}
	
	let firstSelectedCell = $(".spreadsheet .area-selected-cell").first();
	let lastSelectedCell = $(".spreadsheet .area-selected-cell").last();
	let containerOffset = $(".spreadsheet-container").offset();
	let firstCellOffset = firstSelectedCell.offset();
	let lastCellOffset = lastSelectedCell.offset();
	let helperDiv = $("#selection-helper");
	
	let scrollLeft = $(".spreadsheet-container").scrollLeft();
	let scrollTop = $(".spreadsheet-container").scrollTop();
	
	let top = firstCellOffset.top - containerOffset.top - 1 + scrollTop;
	let left = firstCellOffset.left - containerOffset.left - 1 + scrollLeft;
	let width = getColumnWidthRange(startCol, endCol);
	let height = getRowHeightRange(startRow, endRow);
	
	helperDiv.css({
		"top": top,
		"left": left,
		"width": width,
		"height": height
	});
	
	helperDiv.show();
	
	// Remove any existing edge elements
	$(".selection-helper-edge").remove();
	
	// Add edge elements
	let edgeElements = [
		$("<div class='selection-helper-edge top'></div>").css({"top": -3, "left": 0, "width": "100%"}),
		$("<div class='selection-helper-edge right'></div>").css({"top": 0, "right": -3, "height": "100%"}),
		$("<div class='selection-helper-edge bottom'></div>").css({"bottom": -3, "left": 0, "width": "100%"}),
		$("<div class='selection-helper-edge left'></div>").css({"top": 0, "left": -3, "height": "100%"})
	];
	
	edgeElements.forEach(function (edge) {
		helperDiv.append(edge);
	});
}


//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	
	$("#selection-helper").on('mousedown', function (e) {
		if ($(e.target).hasClass("selection-helper-edge")) {
			return;
		}
		stopEditing(); // Stop editing any cell before highlighting a new cell
		startCell = null;
		endCell = null;
		isSelecting = false;
		updateSelection();
	});
	
	$(".text-cell").off('dblclick').on('dblclick', function () {
		makeCellEditable($(this));
	});
	
	$(".text-cell").off('blur').on("blur", function () {
		stopEditing();
	});
	
	$(".text-cell").off('mousedown').on('mousedown', function (e) {
		console.log("mousedown");
		
		if (isEditing && $(this).hasClass("edit-cell")) {
			console.log("Selection helper clicked while editing");
			return;
		}
		
		stopEditing(); // Stop editing any cell before highlighting a new cell
		if (!$(this).hasClass("selected-cell")) {
			highlightCell($(this));
		}
		startCell = null;
		endCell = null;
		isSelecting = false;
		updateSelection();
		
		mouseDown = true;
		e.preventDefault();
	});
	
	$(".spreadsheet").off('mousemove').on('mousemove', ".text-cell", function (e) {
		
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
		initialHelperPos = $("#selection-helper").position();
		
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
			
			var scrollLeft = $(".spreadsheet-container").scrollLeft();
			var scrollTop = $(".spreadsheet-container").scrollTop();
			let containerOffset = $(".spreadsheet-container").offset();
			let delta = {
				top: e.pageY - containerOffset.top + scrollTop - $(".top-corner-cell").outerHeight(),
				left: e.pageX - containerOffset.left + scrollLeft - $(".top-corner-cell").outerWidth()
			};
			console.log("Delta: ", delta);
			
			let columnWidths = getColumnWidths();
			let rowHeights = getRowHeights();
			
			let newPos = {
				top: snapToCell(delta.top, rowHeights) + $(".top-corner-cell").outerHeight(),
				left: snapToCell(delta.left, columnWidths) + $(".top-corner-cell").outerWidth()
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

			console.log("Snapped to: ", topCellIndex, leftCellIndex, delta.left, delta.top);
			
			// Ensure the selection rectangle resizes proportionally to the initial selection size
			let newWidth = getColumnWidthRange(leftCellIndex+1, leftCellIndex + (initialEndCellIndex.col - initialStartCellIndex.col)+1);
			
			let newHeight = getRowHeightRange(topCellIndex+1, topCellIndex + (initialEndCellIndex.row - initialStartCellIndex.row)+1);
			
			$("#selection-helper").css({
				"top": newPos.top,
				"left": newPos.left,
				"width": newWidth,
				"height": newHeight
			});
		}
	});
	
	$(document).off('mouseup.edgeDrag').on('mouseup.edgeDrag', function () {
		if (draggingEdge) {
			draggingEdge = null;
		}
	});
	
});
