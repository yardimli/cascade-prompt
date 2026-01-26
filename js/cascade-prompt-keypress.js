//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	// Listener for the overlay textarea
	$('#cell-editor').keydown(function (e) {
		if (e.key === 'Enter') {
			e.preventDefault(); // Prevent the default Enter behavior (newline)
			e.stopPropagation();
			console.log('Cell Editor Enter key pressed');
			
			// Identify the currently edited cell
			var $editingCell = $('.edit-cell');
			if ($editingCell.length) {
				var $nextRow = $editingCell.closest('tr').next('tr'); // Find the next row
				
				stopEditing();
				if (typeof saveState === 'function') saveState(); // Save on Enter
				
				// Find the cell directly below in the next row and start editing, if it exists
				if ($nextRow.length) {
					var cellCol = parseInt($editingCell.attr('data-col')); // Use data-col
					var $nextCell = $nextRow.find('td[data-col="' + cellCol + '"]');
					if ($nextCell.length) {
						highlightCell($nextCell);
						// makeCellEditable($nextCell); // Optional: Make the next cell editable immediately
					}
				}
			}
		}
	});
	
	// Sync typing in overlay textarea with formula bar
	$('#cell-editor').on('keyup', function () {
		if (isEditing) {
			$('#formula-input').val($(this).val());
		}
	});
	
	//--------------------------------------------------//
	
	$(document).keydown(function (e) {
		console.log('isEditing: ', isEditing);
		if (isEditing) return; // Skip navigation if we are in editing mode
		
		isSelecting = false;
		$('.spreadsheet .area-selected-cell').removeClass('area-selected-cell');
		startCell = null;
		endCell = null;
		updateSelection();
		
		
		var $selectedCell = $('.selected-cell');
		if ($selectedCell.length === 0) return; // Skip if no cell is selected
		
		var $row = $selectedCell.closest('tr');
		var $rows = $('.spreadsheet tr');
		var rowIndex = $row.index();
		var cellCol = parseInt($selectedCell.attr('data-col'));
		var colspan = parseInt($selectedCell.attr('colspan')) || 1;
		
		switch (e.key) {
			case 'Enter':
				e.preventDefault(); // Prevent the default Enter behavior
				console.log('Document Enter key pressed');
				if (!isEditing) {
					makeCellEditable($selectedCell);
				}
				break;
			case 'ArrowLeft':
				// Prevent default to avoid horizontal scroll
				e.preventDefault();
				if (cellCol > 0) { // Check if there's a cell to the left
					// Find the cell with the largest data-col less than current cellCol
					var $prevCell = $row.find('td').filter(function() {
						return parseInt($(this).attr('data-col')) < cellCol;
					}).last();
					
					if ($prevCell.length) {
						highlightCell($prevCell);
					}
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				// Target column is current col + colspan
				var targetCol = cellCol + colspan;
				var $nextCell = $row.find('td[data-col="' + targetCol + '"]');
				
				if ($nextCell.length) {
					highlightCell($nextCell);
				} else {
					// Check if we are at the end of the row
					// addNewColumn();
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (rowIndex > 0) { // Check if there's a row above
					var $prevRow = $rows.eq(rowIndex);
					// Find cell in previous row at the same column
					// If that cell is merged, we might need to find the one covering it
					var $target = $prevRow.find('td').filter(function() {
						var c = parseInt($(this).attr('data-col'));
						var span = parseInt($(this).attr('colspan')) || 1;
						return c <= cellCol && (c + span) > cellCol;
					});
					
					if ($target.length) {
						highlightCell($target);
					}
				}
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (rowIndex < $rows.length - 1) { // Check if there's a row below
					var $nextRow = $rows.eq(rowIndex + 2);
					// Find cell in next row
					var $target = $nextRow.find('td').filter(function() {
						var c = parseInt($(this).attr('data-col'));
						var span = parseInt($(this).attr('colspan')) || 1;
						return c <= cellCol && (c + span) > cellCol;
					});
					
					if ($target.length) {
						highlightCell($target);
					}
				} else {
					// Add a new row if at the last cell
					// addNewRow();
				}
				break;
		}
	});
});
