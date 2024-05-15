var isEditing = false;
var isSelecting = false, mouseDown = false, startCell = null, endCell = null;

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

function scrollToViewWithOffsets(cell) {
	var $container = $('.spreadsheet-container');
	var containerRect = $container[0].getBoundingClientRect();
	var cellRect = cell.getBoundingClientRect();
	
	// Assuming sticky header and sidebar have fixed heights and widths respectively
	var stickyHeaderHeight = $('.letter-cell').first().outerHeight() || 0;
	var stickySidebarWidth = $('.counter-cell').first().outerWidth() || 0;
	
	// Calculate offsets considering the sticky elements
	var topOffset = cellRect.top - containerRect.top - stickyHeaderHeight;
	var leftOffset = cellRect.left - containerRect.left - stickySidebarWidth;
	
	// Scroll adjustments
	if (topOffset < 0) {
		$container.scrollTop($container.scrollTop() + topOffset);
	} else if (cellRect.bottom > containerRect.bottom-30) {
		$container.scrollTop($container.scrollTop() + cellRect.bottom - containerRect.bottom + 30);
	}
	
	if (leftOffset < 0) {
		$container.scrollLeft($container.scrollLeft() + leftOffset);
	} else if (cellRect.right > containerRect.right - 20) {
		$container.scrollLeft($container.scrollLeft() + cellRect.right - containerRect.right + 20);
	}
}



function updateSelection() {
	$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell"); // Clear existing selection
	
	var startRow = Math.min(startCell.parent().index(), endCell.parent().index()),
		endRow = Math.max(startCell.parent().index(), endCell.parent().index()),
		startCol = Math.min(startCell.index(), endCell.index()),
		endCol = Math.max(startCell.index(), endCell.index());
	
	for (var i = startRow; i <= endRow; i++) {
		for (var j = startCol; j <= endCol; j++) {
			$(".spreadsheet tr").eq(i + 1).find("td").eq(j - 1).addClass("area-selected-cell");
		}
	}
}


function makeCellEditable($cell) {
	
	if (!$cell.hasClass("selected-cell")) {
		higlightCell($cell);
	}
	
	if (!$cell.hasClass("edit-cell")) {
		$cell.addClass("edit-cell");
	}
	
	$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell"); // Clear existing selection
	
	// Lock the cell size
	var cellWidth = $cell.width();
	var cellHeight = $cell.height();
	$cell.css({
		"width": cellWidth + "px",
		"height": cellHeight + "px",
		"min-width": cellWidth + "px",
		"min-height": cellHeight + "px",
		"max-width": cellWidth + "px",
		"max-height": cellHeight + "px",
	});
	
	$cell.attr("contenteditable", "true").focus();
	isEditing = true;
}


function addNewRow() {
	var columnCount = $('.spreadsheet tr:first th').length;
	var rowCount = $('.spreadsheet tr').length;
	
	var newRow = '<tr><th class="counter-cell">' + (rowCount) + '</th>';
	for (var i = 1; i < columnCount; i++) {
		newRow += '<td class="text-cell"></td>';
	}
	newRow += '</tr>';
	$('.spreadsheet').append(newRow);
	restCellEvents();
}

function addNewColumn() {
	var letter = String.fromCharCode("A".charCodeAt(0) + $('.letter-cell').length); // Next letter
	$('.spreadsheet tr:first').append('<th class="letter-cell">' + letter + '</th>');
	var rowCount = $('.spreadsheet tr').length;
	
	for (var i = 1; i < rowCount; i++) {
		$('.spreadsheet tr').eq(i).append('<td class="text-cell"></td>');
	}
	
	var table = $(".spreadsheet"); // Assuming your table has the class .spreadsheet
	var startTableWidth = table.outerWidth();
	var newTableWidth = startTableWidth + 200;
	table.width(newTableWidth); // Adjust the table width as the column width is adjusted
	
	restCellEvents();
}

function restCellEvents() {
	$(".counter-cell").not('.processed').css({
		"position": "sticky",
		"user-select": "none", // prevents text selection during resize drag
	}).append($('<div/>', {
		"class": "resize-handle-row",
		"css": {
			"position": "absolute",
			"bottom": 0,
			"left": 0,
			"width": "100%",
			"height": "5px",
			"cursor": "row-resize",
			// "background-color": "#f4f4f4", // just to make the handle more visible
		}
	})).on("mousedown", function (e) {
		var th = $(this).parent();
		var startHeight = th.height();
		var startY = e.pageY;
		
		$(document).mousemove(function (e) {
			var newHeight = startHeight + (e.pageY - startY);
			th.height(newHeight);
		});
		
		$(document).on("mouseup", function () {
			$(document).off("mousemove");
		});
		
		e.preventDefault(); // prevents text selection
	}).addClass('processed');
	
	
	$(".letter-cell").not('.processed').css({
		"position": "sticky",
		"user-select": "none", // prevents text selection during resize drag
	}).append($('<div/>', {
		"class": "resize-handle",
		"css": {
			"position": "absolute",
			"top": 0,
			"right": 0,
			"width": "5px",
			"height": "100%",
			"cursor": "col-resize",
			// "background-color": "#f4f4f4", // just to make the handle more visible
		}
	})).on("mousedown", function (e) {
		var cell = $(this);
		console.log("Cell: ", cell);
		var startWidth = cell.width();
		var startX = e.pageX;
		var table = $(".spreadsheet"); // Assuming your table has the class .spreadsheet
		var startTableWidth = table.outerWidth();
		
		$(document).mousemove(function (e) {
			var newWidth = startWidth + (e.pageX - startX);
			var newTableWidth = startTableWidth + (e.pageX - startX);
			cell.width(newWidth);
			table.width(newTableWidth); // Adjust the table width as the column width is adjusted
		});
		
		$(document).on("mouseup", function () {
			$(document).off("mousemove");
		});
		
		e.preventDefault(); // prevents text selection
	}).addClass('processed');
	
	$(".text-cell").off('dblclick').on('dblclick', function () {
		makeCellEditable($(this));
	});
	
	$(".text-cell").off('blur').on("blur", function () {
		var $this = $(this);
		
		// Unlock the cell size
		$this.css({
			"min-width": "",
			"min-height": "",
			"max-width": "",
			"max-height": ""
		});
		
		$this.removeAttr("contenteditable");
		isEditing = false;
	});
	
	
	$(".text-cell").off('mousedown').on('mousedown', function (e) {
		console.log("mousedown");
		if (!$(this).hasClass("selected-cell")) {
			higlightCell($(this));
		}
		
		mouseDown = true;
		$(".spreadsheet .selected-cell").removeClass("area-selected-cell"); // Optional: Clear existing selection
		e.preventDefault(); // Prevent text selection
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
		
		if (!$(this).hasClass("selected-cell")) {
			higlightCell($(this));
		}
		
	});
	
	$(document).off('mouseup').on('mouseup', function (e) {
		mouseDown = false;
		if (isSelecting) {
			isSelecting = false;
			$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell"); // Clear existing selection
			updateSelection(); // This call can be optional depending on whether you update on mousemove
		}
	});
	
	
	// $(".text-cell").off('mousedown').on('mousedown', function () {
	// 	if (!$(this).hasClass("selected-cell")) {
	// 		higlightCell($(this));
	// 	}
	// });
	
	$(".text-cell").keydown(function (e) {
		if (e.key === "Enter") {
			e.preventDefault(); // Prevent the default Enter behavior
			e.stopPropagation();
			console.log("Cell Enter key pressed");
			
			var $this = $(this);
			var $nextRow = $this.closest("tr").next("tr"); // Find the next row
			
			// Stop editing the current cell
			$this.removeAttr("contenteditable").blur();
			isEditing = false;
			
			// Find the cell directly below in the next row and start editing, if it exists
			if ($nextRow.length) {
				var cellIndex = $this.index(); // Current cell's index
				var $nextCell = $nextRow.find("td").eq(cellIndex - 1); // Adjust index for td elements
				if ($nextCell.length) {
					higlightCell($nextCell); // Highlight the next cell
					// makeCellEditable($nextCell); // Make the next cell editable
				}
			}
		}
	});
	
}


$(document).ready(function () {
	// Add a resizable feature to the columns and rows of the table
	
	restCellEvents();
	
	$(document).keydown(function (e) {
		console.log("isEditing: ", isEditing);
		if (isEditing) return; // Skip navigation if we are in editing mode
		
		isSelecting = false;
		$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell"); // Clear existing selection
		
		var $selectedCell = $('.selected-cell');
		if ($selectedCell.length === 0) return; // Skip if no cell is selected
		
		var $row = $selectedCell.closest('tr');
		var $rows = $('.spreadsheet tr');
		var rowIndex = $row.index();
		var cellIndex = $selectedCell.index();
		
		switch (e.key) {
			case "Enter":
				e.preventDefault(); // Prevent the default Enter behavior
				console.log("Document Enter key pressed");
				if (!isEditing) {
					makeCellEditable($selectedCell);
				}
				break;
			case 'ArrowLeft':
				// Prevent default to avoid horizontal scroll
				e.preventDefault();
				if (cellIndex > 1) { // Check if there's a cell to the left
					higlightCell($selectedCell.prev());
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				if (cellIndex < $row.children('td').length) { // Check if there's a cell to the right
					higlightCell($selectedCell.next());
				} else {
					// Add a new column if at the last cell
					// addNewColumn();
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (rowIndex > 0) { // Check if there's a row above
					var $prevRow = $rows.eq(rowIndex);
					higlightCell($prevRow.find('td').eq(cellIndex - 1));
				}
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (rowIndex < $rows.length - 1) { // Check if there's a row below
					var $nextRow = $rows.eq(rowIndex + 2);
					higlightCell($nextRow.find('td').eq(cellIndex - 1));
				} else {
					// Add a new row if at the last cell
					// addNewRow();
				}
				break;
		}
	});
	
	
	var scrollableDiv = document.getElementById('spreadsheet-container');
	
	scrollableDiv.addEventListener('wheel', function (e) {
		if (e.deltaX < 0 && scrollableDiv.scrollLeft === 0) {
			e.preventDefault(); // Prevent the scroll if it's at the start and trying to go further left
		}
	});
	
	// Prevent touch devices from triggering swipe to navigate back
	scrollableDiv.addEventListener('touchstart', function (e) {
		var touchStartX = e.changedTouches[0].screenX;
		scrollableDiv.addEventListener('touchmove', function (e) {
			var touchCurrentX = e.changedTouches[0].screenX;
			if (touchCurrentX > touchStartX && scrollableDiv.scrollLeft === 0) {
				e.preventDefault(); // Prevent navigation swipe when at the start of the scroll
			}
		}, {passive: false});
	}, {passive: false});
	
});
