var isChangingTableCellWidth = false;

//--------------------------------------------------//
function scrollToViewWithOffsets (cell) {
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
function makeCellEditable ($cell) {
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
function stopEditing () {
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
function addNewRow () {
	var columnCount = $('.spreadsheet tr:first th').length;
	var rowCount = $('.spreadsheet tr').length;
	
	var newRow = '<tr><th class="counter-cell">' + (rowCount) + '</th>';
	for (var i = 1; i < columnCount; i++) {
		newRow += '<td class="text-cell"><div class="content-cut"></div></td>';
	}
	newRow += '</tr>';
	$('.spreadsheet').append(newRow);
}

//--------------------------------------------------//
function addNewColumn () {
	var letter = String.fromCharCode('A'.charCodeAt(0) + $('.letter-cell').length); // Next letter
	$('.spreadsheet tr:first').append('<th class="letter-cell">' + letter + '</th>');
	var rowCount = $('.spreadsheet tr').length;
	
	for (var i = 1; i < rowCount; i++) {
		$('.spreadsheet tr').eq(i).append('<td class="text-cell"><div class="content-cut"></div></td>');
	}
	
	var table = $('.spreadsheet'); // Assuming your table has the class .spreadsheet
	var startTableWidth = table.outerWidth();
	var newTableWidth = startTableWidth + 200;
	table.width(newTableWidth); // Adjust the table width as the column width is adjusted
}

//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	
	//--------------------------------------------------//
	
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
		});
		
		$(document).on('mouseup.resizeRow', function () {
			$(document).off('mousemove.resizeRow');
			$(document).off('mouseup.resizeRow');
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
		
		$(document).on('mousemove.resizeCol', function (e) {
			var newWidth = startWidth + (e.pageX - startX);
			var newTableWidth = startTableWidth + (e.pageX - startX);
			cell.width(newWidth);
			table.width(newTableWidth); // Adjust the table width as the column width is adjusted
		});
		
		$(document).on('mouseup.resizeCol', function () {
			$(document).off('mousemove.resizeCol');
			$(document).off('mouseup.resizeCol');
			if (typeof saveState === 'function') saveState(); // Save state after resize
		});
		
		e.preventDefault(); // prevents text selection
	}).addClass('processed');
	
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
		}, { passive: false });
	}, { passive: false });

//--------------------------------------------------//

});
