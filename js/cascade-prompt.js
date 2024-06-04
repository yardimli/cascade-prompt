var isEditing = false;
var isSelecting = false;
var mouseDown = false
var startCell = null;
var endCell = null;

let draggingEdge = null;
let initialMousePos = { top: 0, left: 0 };
let initialHelperPos = { top: 0, left: 0 };


//--------------------------------------------------//
function higlightCell(cell) {
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
function snapToCell(position, dimensionArray, offset = 0) {
	let cumulativeDimension = offset;
	for (let i = 0; i < dimensionArray.length; i++) {
		if (position <= cumulativeDimension) {
			return cumulativeDimension;
		}
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
		$("<div class='selection-helper-edge top'></div>").css({ "top": -3, "left": 0, "width": "100%" }),
		$("<div class='selection-helper-edge right'></div>").css({ "top": 0, "right": -3, "height": "100%" }),
		$("<div class='selection-helper-edge bottom'></div>").css({ "bottom": -3, "left": 0, "width": "100%" }),
		$("<div class='selection-helper-edge left'></div>").css({ "top": 0, "left": -3, "height": "100%" })
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
			higlightCell($(this));
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
		initialMousePos = { top: e.pageY, left: e.pageX };
		initialHelperPos = $("#selection-helper").position();
	});
	
	$(document).off('mousemove.edgeDrag').on('mousemove.edgeDrag', function (e) {
		if (draggingEdge) {
			e.preventDefault();
			e.stopPropagation();
			
			var scrollLeft = $(".spreadsheet-container").scrollLeft();
			var scrollTop = $(".spreadsheet-container").scrollTop();
			
			let delta = {
				top: e.pageY - initialMousePos.top + scrollTop - $(".top-corner-cell").outerHeight(),
				left: e.pageX - initialMousePos.left + scrollLeft -  $(".top-corner-cell").outerWidth()
			};
			
			let columnWidths = getColumnWidths();
			let rowHeights = getRowHeights();
			let newPos = {
				top: snapToCell(initialHelperPos.top + delta.top, rowHeights, $(".top-corner-cell").outerHeight()),
				left: snapToCell(initialHelperPos.left + delta.left, columnWidths, $(".top-corner-cell").outerWidth())
			};
			
			$("#selection-helper").css(newPos);
		}
	});
	
	$(document).off('mouseup.edgeDrag').on('mouseup.edgeDrag', function () {
		if (draggingEdge) {
			draggingEdge = null;
		}
	});
	
});
