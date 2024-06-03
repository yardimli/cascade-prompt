var isEditing = false;
var isSelecting = false;
var mouseDown = false
var startCell = null;
var endCell = null;


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
function updateSelection() {
	$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell"); // Clear existing selection
	
	if (startCell === null || endCell === null || startCell.is(endCell)) {
		$("#selection-helper").hide();
		return;
	}
	
	var startRow = Math.min(startCell.parent().index(), endCell.parent().index()),
		endRow = Math.max(startCell.parent().index(), endCell.parent().index()),
		startCol = Math.min(startCell.index(), endCell.index()),
		endCol = Math.max(startCell.index(), endCell.index());
	
	for (var i = startRow; i <= endRow; i++) {
		for (var j = startCol; j <= endCol; j++) {
			$(".spreadsheet tr").eq(i + 1).find("td").eq(j - 1).addClass("area-selected-cell");
		}
	}
	
	var firstSelectedCell = $(".spreadsheet .area-selected-cell").first();
	var lastSelectedCell = $(".spreadsheet .area-selected-cell").last();
	
	var containerOffset = $(".spreadsheet-container").offset();
	var firstCellOffset = firstSelectedCell.offset();
	var lastCellOffset = lastSelectedCell.offset();
	var helperDiv = $("#selection-helper");
	
	var scrollLeft = $(".spreadsheet-container").scrollLeft();
	var scrollTop = $(".spreadsheet-container").scrollTop();
	
	var top = firstCellOffset.top - containerOffset.top - 1 + scrollTop;
	var left = firstCellOffset.left - containerOffset.left - 1 + scrollLeft;
	var width = lastCellOffset.left - firstCellOffset.left + lastSelectedCell.outerWidth();
	var height = lastCellOffset.top - firstCellOffset.top + lastSelectedCell.outerHeight();
	
	helperDiv.css({
		"top": top,
		"left": left,
		"width": width,
		"height": height
	});
	helperDiv.show();
	
}



//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	
	$("#selection-helper").on('mousedown', function (e) {
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
	
});
