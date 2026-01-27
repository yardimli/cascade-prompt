// --------------------------------------------------//
// ----------------- Document Ready -----------------//
document.addEventListener('DOMContentLoaded', function () {
	const cellEditor = document.getElementById('cell-editor');
	const formulaInput = document.getElementById('formula-input');
	
	// Listener for the overlay editor (div contenteditable)
	cellEditor.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') {
			if (!e.shiftKey) { // Allow Shift+Enter for new lines
				e.preventDefault(); // Prevent default div behavior
				e.stopPropagation();
				console.log('Cell Editor Enter key pressed');
				
				// Identify the currently edited cell
				const editingCell = document.querySelector('.edit-cell');
				if (editingCell) {
					const currentRow = editingCell.closest('tr');
					const nextRow = currentRow ? currentRow.nextElementSibling : null; // Find the next row
					
					stopEditing();
					if (typeof saveState === 'function') saveState(); // Save on Enter
					
					// Find the cell directly below in the next row and start editing, if it exists
					if (nextRow) {
						const cellCol = parseInt(editingCell.getAttribute('data-col')); // Use data-col
						const nextCell = nextRow.querySelector('td[data-col="' + cellCol + '"]');
						if (nextCell) {
							highlightCell(nextCell);
							// makeCellEditable(nextCell); // Optional: Make the next cell editable immediately
						}
					}
				}
			}
		}
	});
	
	// Sync typing in overlay editor with formula bar
	cellEditor.addEventListener('input', function () {
		if (isEditing) {
			// For formula bar, we just show text content
			formulaInput.textContent = this.textContent;
		}
	});
	
	// --------------------------------------------------//
	
	document.addEventListener('keydown', function (e) {
		// Handle Undo/Redo Shortcuts
		if ((e.ctrlKey || e.metaKey) && !isEditing) {
			if (e.key === 'z') {
				e.preventDefault();
				if (typeof HistoryManager !== 'undefined') HistoryManager.undo();
				return;
			}
			if (e.key === 'y') {
				e.preventDefault();
				if (typeof HistoryManager !== 'undefined') HistoryManager.redo();
				return;
			}
			// Formatting Shortcuts
			if (e.key === 'b') {
				e.preventDefault();
				if (typeof FormatManager !== 'undefined') FormatManager.toggleStyle('bold');
				return;
			}
			if (e.key === 'i') {
				e.preventDefault();
				if (typeof FormatManager !== 'undefined') FormatManager.toggleStyle('italic');
				return;
			}
		}
		
		console.log('isEditing: ', isEditing);
		if (isEditing) return; // Skip navigation if we are in editing mode
		
		isSelecting = false;
		// Remove area-selected-cell class
		document.querySelectorAll('.spreadsheet .area-selected-cell').forEach(el => el.classList.remove('area-selected-cell'));
		
		startCell = null;
		endCell = null;
		updateSelection();
		
		const selectedCell = document.querySelector('.selected-cell');
		if (!selectedCell) return; // Skip if no cell is selected
		
		const row = selectedCell.closest('tr');
		const rows = Array.from(document.querySelectorAll('.spreadsheet tbody tr'));
		// Note: rowIndex in DOM includes thead, but the rows array is just tbody.
		// We can use the index within the rows array.
		const rowIndex = rows.indexOf(row);
		
		const cellCol = parseInt(selectedCell.getAttribute('data-col'));
		const colspan = parseInt(selectedCell.getAttribute('colspan')) || 1;
		
		switch (e.key) {
			case 'Enter':
				e.preventDefault(); // Prevent the default Enter behavior
				console.log('Document Enter key pressed');
				if (!isEditing) {
					makeCellEditable(selectedCell);
				}
				break;
			case 'ArrowLeft':
				// Prevent default to avoid horizontal scroll
				e.preventDefault();
				if (cellCol > 0) { // Check if there's a cell to the left
					// Find the cell with the largest data-col less than current cellCol
					const cells = Array.from(row.querySelectorAll('td'));
					// Filter and find last
					let prevCell = null;
					for (let i = cells.length - 1; i >= 0; i--) {
						if (parseInt(cells[i].getAttribute('data-col')) < cellCol) {
							prevCell = cells[i];
							break;
						}
					}
					
					if (prevCell) {
						highlightCell(prevCell);
					}
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				// Target column is current col + colspan
				var targetCol = cellCol + colspan;
				var nextCell = row.querySelector('td[data-col="' + targetCol + '"]');
				
				if (nextCell) {
					highlightCell(nextCell);
				} else {
					// Check if we are at the end of the row
					// addNewColumn();
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (rowIndex > 0) { // Check if there's a row above
					const prevRow = rows[rowIndex - 1];
					// Find cell in previous row at the same column
					// If that cell is merged, we might need to find the one covering it
					const cells = Array.from(prevRow.querySelectorAll('td'));
					const target = cells.find(function (cell) {
						const c = parseInt(cell.getAttribute('data-col'));
						const span = parseInt(cell.getAttribute('colspan')) || 1;
						return c <= cellCol && (c + span) > cellCol;
					});
					
					if (target) {
						highlightCell(target);
					}
				}
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (rowIndex < rows.length - 1) { // Check if there's a row below
					const nextRow = rows[rowIndex + 1];
					// Find cell in next row
					const cells = Array.from(nextRow.querySelectorAll('td'));
					const target = cells.find(function (cell) {
						const c = parseInt(cell.getAttribute('data-col'));
						const span = parseInt(cell.getAttribute('colspan')) || 1;
						return c <= cellCol && (c + span) > cellCol;
					});
					
					if (target) {
						highlightCell(target);
					}
				} else {
					// Add a new row if at the last cell
					// addNewRow();
				}
				break;
		}
	});
});
