//--------------------------------------------------//
//----------------- Document Ready -----------------//
$(document).ready(function () {
	$(".text-cell").keydown(function (e) {
		if (e.key === "Enter") {
			e.preventDefault(); // Prevent the default Enter behavior
			e.stopPropagation();
			console.log("Cell Enter key pressed");
			
			var $this = $(this);
			var $nextRow = $this.closest("tr").next("tr"); // Find the next row
			
			stopEditing();
			
			// Find the cell directly below in the next row and start editing, if it exists
			if ($nextRow.length) {
				var cellIndex = $this.index(); // Current cell's index
				var $nextCell = $nextRow.find("td").eq(cellIndex - 1); // Adjust index for td elements
				if ($nextCell.length) {
					higlightCell($nextCell);
					// makeCellEditable($nextCell); // Make the next cell editable
				}
			}
		}
	});
	
	//--------------------------------------------------//
	
	$(document).keydown(function (e) {
		console.log("isEditing: ", isEditing);
		if (isEditing) return; // Skip navigation if we are in editing mode
		
		isSelecting = false;
		$(".spreadsheet .area-selected-cell").removeClass("area-selected-cell");
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
});
