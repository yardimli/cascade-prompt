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
					var cellIndex = $editingCell.index(); // Current cell's index
					var $nextCell = $nextRow.find('td').eq(cellIndex - 1); // Adjust index for td elements
					if ($nextCell.length) {
						highlightCell($nextCell);
						// makeCellEditable($nextCell); // Optional: Make the next cell editable immediately
					}
				}
			}
		}
	});
	
	// Sync typing in overlay textarea with formula bar
	$('#cell-editor').on('keyup', function() {
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
		var cellIndex = $selectedCell.index();
		
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
				if (cellIndex > 1) { // Check if there's a cell to the left
					highlightCell($selectedCell.prev());
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				if (cellIndex < $row.children('td').length) { // Check if there's a cell to the right
					highlightCell($selectedCell.next());
				} else {
					// Add a new column if at the last cell
					// addNewColumn();
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (rowIndex > 0) { // Check if there's a row above
					var $prevRow = $rows.eq(rowIndex);
					highlightCell($prevRow.find('td').eq(cellIndex - 1));
				}
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (rowIndex < $rows.length - 1) { // Check if there's a row below
					var $nextRow = $rows.eq(rowIndex + 2);
					highlightCell($nextRow.find('td').eq(cellIndex - 1));
				} else {
					// Add a new row if at the last cell
					// addNewRow();
				}
				break;
		}
	});
});
