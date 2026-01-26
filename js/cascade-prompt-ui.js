var isChangingTableCellWidth = false;

//--------------------------------------------------//
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
	} else if (cellRect.bottom > containerRect.bottom - 30) {
		$container.scrollTop($container.scrollTop() + cellRect.bottom - containerRect.bottom + 30);
	}
	
	if (leftOffset < 0) {
		$container.scrollLeft($container.scrollLeft() + leftOffset);
	} else if (cellRect.right > containerRect.right - 20) {
		$container.scrollLeft($container.scrollLeft() + cellRect.right - containerRect.right + 20);
	}
}

//--------------------------------------------------//
function makeCellEditable($cell) {
	if (!$cell.hasClass('selected-cell')) {
		highlightCell($cell);
	}
	
	if (!$cell.hasClass('edit-cell')) {
		$cell.addClass('edit-cell');
	}
	
	$('.spreadsheet .area-selected-cell').removeClass('area-selected-cell'); // Clear existing selection
	
	// Get the inner content div
	var $contentDiv = $cell.find('.content-cut');
	var currentText = $contentDiv.text();
	
	// Get cell position relative to container
	var position = $cell.position();
	var width = $cell.outerWidth();
	var height = $cell.outerHeight();
	
	// Setup the overlay textarea
	var $editor = $('#cell-editor');
	$editor.css({
		'top': position.top + 'px',
		'left': position.left + 'px',
		'width': width + 'px',
		'height': height + 'px',
		'min-width': width + 'px',
		'min-height': height + 'px',
		'display': 'block'
	});
	
	// Load content and focus
	$editor.val(currentText).focus();
	
	// Hide the inner div content while editing so it doesn't duplicate visually
	$contentDiv.css('visibility', 'hidden');
	
	isEditing = true;
	
	// Auto-resize logic
	$editor.off('input.autoResize').on('input.autoResize', function () {
		$(this).css('height', 'auto');
		$(this).css('width', 'auto');
		
		var scrollHeight = this.scrollHeight;
		var scrollWidth = this.scrollWidth;
		
		// Grow vertically
		if (scrollHeight > height) {
			$(this).height(scrollHeight);
		} else {
			$(this).height(height);
		}
		
		// Grow horizontally
		if (scrollWidth > width) {
			$(this).width(scrollWidth);
		} else {
			$(this).width(width);
		}
	});
}

//--------------------------------------------------//
function stopEditing() {
	if (!isEditing) return;
	
	var $editingCell = $('.edit-cell');
	var $editor = $('#cell-editor');
	
	if ($editingCell.length) {
		// Get value from textarea
		var newValue = $editor.val();
		
		// Update the inner div
		var $contentDiv = $editingCell.find('.content-cut');
		$contentDiv.text(newValue);
		$contentDiv.css('visibility', 'visible'); // Make visible again
		
		// Reset and hide editor
		$editor.val('').hide().css({
			'width': '',
			'height': ''
		});
		
		$editingCell.removeClass('edit-cell');
		isEditing = false;
	}
}

//--------------------------------------------------//
function addNewRow() {
	var columnCount = $('.spreadsheet tr:first th').length;
	var rowCount = $('.spreadsheet tr').length;
	
	var newRow = '<tr><th class="counter-cell">' + (rowCount) + '</th>';
	for (var i = 1; i < columnCount; i++) {
		// Note: New rows need data-col
		newRow += '<td class="text-cell" data-col="'+(i-1)+'"><div class="content-cut"></div></td>';
	}
	newRow += '</tr>';
	$('.spreadsheet').append(newRow);
	
	// Re-attach resize handlers for the new row header
	attachResizeHandlers();
}

//--------------------------------------------------//
function addNewColumn() {
	var colIndex = $('.letter-cell').length;
	var letter = String.fromCharCode('A'.charCodeAt(0) + colIndex); // Next letter
	$('.spreadsheet tr:first').append('<th class="letter-cell" data-col="'+colIndex+'">' + letter + '</th>');
	var rowCount = $('.spreadsheet tr').length;
	
	for (var i = 1; i < rowCount; i++) {
		$('.spreadsheet tr').eq(i).append('<td class="text-cell" data-col="'+colIndex+'"><div class="content-cut"></div></td>');
	}
	
	var table = $('.spreadsheet'); // Assuming your table has the class .spreadsheet
	var startTableWidth = table.outerWidth();
	var newTableWidth = startTableWidth + 200;
	table.width(newTableWidth); // Adjust the table width as the column width is adjusted
	
	// Re-attach resize handlers for the new col header
	attachResizeHandlers();
}

//--------------------------------------------------//
function mergeCells() {
	if (!startCell || !endCell || startCell.is(endCell)) return;
	
	var startRow = Math.min(startCell.parent().index(), endCell.parent().index());
	var endRow = Math.max(startCell.parent().index(), endCell.parent().index());
	var startCol = Math.min(parseInt(startCell.attr('data-col')), parseInt(endCell.attr('data-col')));
	var endCol = Math.max(parseInt(startCell.attr('data-col')), parseInt(endCell.attr('data-col')));
	
	// Calculate spans
	var rowspan = endRow - startRow + 1;
	var colspan = endCol - startCol + 1;
	
	// Top Left Cell (Target)
	var $topLeft = $('.spreadsheet tr').eq(startRow + 1).find('td[data-col="' + startCol + '"]');
	var mergedContent = [];
	
	// Iterate through range
	for (var r = startRow; r <= endRow; r++) {
		for (var c = startCol; c <= endCol; c++) {
			// Skip the top-left cell in the loop for removal, but read its content
			var $cell = $('.spreadsheet tr').eq(r + 1).find('td[data-col="' + c + '"]');
			
			if ($cell.length) {
				var text = $cell.find('.content-cut').text().trim();
				if (text) {
					mergedContent.push(text);
				}
				
				if (r === startRow && c === startCol) {
					continue; // Don't remove the top-left cell
				}
				
				// Remove other cells
				$cell.remove();
			}
		}
	}
	
	// Apply changes to top-left cell
	$topLeft.attr('rowspan', rowspan);
	$topLeft.attr('colspan', colspan);
	$topLeft.find('.content-cut').text(mergedContent.join(' '));
	
	// Update width of the merged cell content
	var totalWidth = getColumnWidthRange(startCol, endCol);
	$topLeft.find('.content-cut').css('width', totalWidth + 'px');
	
	// Reset selection
	startCell = null;
	endCell = null;
	isSelecting = false;
	
	// Highlight the merged cell
	highlightCell($topLeft);
	updateSelection(); // Clears the selection box
	saveState();
}

//--------------------------------------------------//
function unmergeCells() {
	var $cell = $('.selected-cell');
	if (!$cell.length) return;
	
	var rowspan = parseInt($cell.attr('rowspan')) || 1;
	var colspan = parseInt($cell.attr('colspan')) || 1;
	
	if (rowspan === 1 && colspan === 1) return; // Not merged
	
	var startRow = $cell.parent().index();
	var startCol = parseInt($cell.attr('data-col'));
	
	// Iterate through the range covered by the merge
	for (var r = startRow; r < startRow + rowspan; r++) {
		for (var c = startCol; c < startCol + colspan; c++) {
			if (r === startRow && c === startCol) continue;
			
			// Create new cell
			var newCell = $('<td class="text-cell" data-col="' + c + '"><div class="content-cut"></div></td>');
			
			// Set width based on column width
			var colWidth = $('.letter-cell[data-col="' + c + '"]').outerWidth();
			newCell.find('.content-cut').css('width', colWidth + 'px');
			
			// Set height based on row height
			var rowHeight = $('.counter-cell').eq(r).outerHeight();
			newCell.find('.content-cut').css('height', rowHeight + 'px');
			
			// Insert cell at correct position
			var $row = $('.spreadsheet tr').eq(r + 1);
			
			// Find the insertion point: after the cell with data-col < c
			var $prev = $row.find('td').filter(function() {
				return parseInt($(this).attr('data-col')) < c;
			}).last();
			
			if ($prev.length) {
				$prev.after(newCell);
			} else {
				$row.prepend(newCell);
			}
		}
	}
	
	// Remove attributes from top-left cell
	$cell.removeAttr('rowspan');
	$cell.removeAttr('colspan');
	
	// Reset width of top-left cell to single column width
	var singleColWidth = $('.letter-cell[data-col="' + startCol + '"]').outerWidth();
	$cell.find('.content-cut').css('width', singleColWidth + 'px');
	
	// Re-highlight to update UI state
	highlightCell($cell);
	saveState();
}

//--------------------------------------------------//
// Function to attach resize handlers (extracted for re-use)
function attachResizeHandlers() {
	$('.counter-cell').not('.processed').css({
		'position': 'sticky',
		'user-select': 'none' // prevents text selection during resize drag
	}).append($('<div/>', {
		'class': 'resize-handle-row',
		'css': {
			'position': 'absolute',
			'bottom': 0,
			'left': 0,
			'width': '100%',
			'height': '5px',
			'cursor': 'row-resize'
			// "background-color": "#f4f4f4", // just to make the handle more visible
		}
	})).on('mousedown.resizeRow', function (e) {
		// Modified: Target the cell (th) directly instead of the row (tr).
		// This ensures we overwrite the height set by loadState on the cell, allowing shrinking.
		var th = $(this);
		var startHeight = th.height();
		var startY = e.pageY;
		
		$(document).on('mousemove.resizeRow', function (e) {
			var newHeight = startHeight + (e.pageY - startY);
			th.height(newHeight);
			
			// NEW: Apply height to all .content-cut divs in this row
			th.parent().find('.content-cut').css('height', newHeight + 'px');
		});
		
		$(document).on('mouseup.resizeRow', function () {
			var th = $(this);
			var rowIndex = th.parent().index();
			var rowHeight = th.height();
			
			$(document).off('mousemove.resizeRow');
			$(document).off('mouseup.resizeRow');
			updateRowHeight(rowIndex, rowHeight);
			if (typeof saveState === 'function') saveState(); // Save state after resize
		});
		
		e.preventDefault(); // prevents text selection
	}).addClass('processed');
	
	//--------------------------------------------------//
	
	$('.letter-cell').not('.processed').css({
		'position': 'sticky',
		'user-select': 'none' // prevents text selection during resize drag
	}).append($('<div/>', {
		'class': 'resize-handle',
		'css': {
			'position': 'absolute',
			'top': 0,
			'right': 0,
			'width': '5px',
			'height': '100%',
			'cursor': 'col-resize'
			// "background-color": "#f4f4f4", // just to make the handle more visible
		}
	})).on('mousedown.resizeCol', function (e) {
		var cell = $(this);
		console.log('Cell: ', cell);
		var startWidth = cell.width();
		var startX = e.pageX;
		var table = $('.spreadsheet'); // Assuming your table has the class .spreadsheet
		var startTableWidth = table.outerWidth();
		
		// Get column index to update specific cells
		var colIndex = parseInt(cell.attr('data-col'));
		
		$(document).on('mousemove.resizeCol', function (e) {
			var newWidth = startWidth + (e.pageX - startX);
			var newTableWidth = startTableWidth + (e.pageX - startX);
			cell.width(newWidth);
			table.width(newTableWidth); // Adjust the table width as the column width is adjusted
			
			updateColumnWidth(colIndex, newWidth);
		});
		
		$(document).on('mouseup.resizeCol', function () {
			$(document).off('mousemove.resizeCol');
			$(document).off('mouseup.resizeCol');
			if (typeof saveState === 'function') saveState(); // Save state after resize
		});
		
		e.preventDefault(); // prevents text selection
	}).addClass('processed');
}

//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	
	// Merge Button Listener
	$('#merge-btn').on('click', function () {
		mergeCells();
	});
	
	// Unmerge Button Listener
	$('#unmerge-btn').on('click', function () {
		unmergeCells();
	});
	
	//--------------------------------------------------//
	
	attachResizeHandlers();
	
	// Listen for custom event from Data Manager to re-attach handlers after render
	$(document).on('sheetRendered', function() {
		attachResizeHandlers();
	});
	
	//--------------------------------------------------//
	
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

//--------------------------------------------------//

});
