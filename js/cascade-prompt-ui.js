var isChangingTableCellWidth = false;

// --------------------------------------------------//
// Theme Management Functions
// --------------------------------------------------//

/**
 * Initialize theme from localStorage or system preference
 */
function initTheme() {
	const savedTheme = localStorage.getItem('cascade_theme');
	if (savedTheme) {
		document.documentElement.setAttribute('data-theme', savedTheme);
	} else {
		// Check system preference
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else {
			document.documentElement.setAttribute('data-theme', 'light');
		}
	}
}

/**
 * Toggle between light and dark modes
 */
function toggleTheme() {
	const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
	const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
	
	document.documentElement.setAttribute('data-theme', newTheme);
	localStorage.setItem('cascade_theme', newTheme);
}

// --------------------------------------------------//
function scrollToViewWithOffsets(cell) {
	const container = document.querySelector('.spreadsheet-container');
	const containerRect = container.getBoundingClientRect();
	const cellRect = cell.getBoundingClientRect();
	
	// Assuming sticky header and sidebar have fixed heights and widths respectively
	const firstLetterCell = document.querySelector('.letter-cell');
	const stickyHeaderHeight = firstLetterCell ? firstLetterCell.offsetHeight : 0;
	
	const firstCounterCell = document.querySelector('.counter-cell');
	const stickySidebarWidth = firstCounterCell ? firstCounterCell.offsetWidth : 0;
	
	// Calculate offsets considering the sticky elements
	const topOffset = cellRect.top - containerRect.top - stickyHeaderHeight;
	const leftOffset = cellRect.left - containerRect.left - stickySidebarWidth;
	
	// Scroll adjustments
	if (topOffset < 0) {
		container.scrollTop += topOffset;
	} else if (cellRect.bottom > containerRect.bottom - 30) {
		container.scrollTop += (cellRect.bottom - containerRect.bottom + 30);
	}
	
	if (leftOffset < 0) {
		container.scrollLeft += leftOffset;
	} else if (cellRect.right > containerRect.right - 20) {
		container.scrollLeft += (cellRect.right - containerRect.right + 20);
	}
}

// --------------------------------------------------//
function makeCellEditable(cell) {
	// Ensure cell is a DOM element
	if (!cell.classList.contains('selected-cell')) {
		highlightCell(cell);
	}
	
	// --- NEW: Prevent editing if cell contains LLM button ---
	if (cell.querySelector('.llm-run-btn')) {
		if (typeof showToast === 'function') {
			showToast('LLM Button cells cannot be edited directly.');
		}
		return;
	}
	
	if (!cell.classList.contains('edit-cell')) {
		cell.classList.add('edit-cell');
	}
	
	// Clear existing selection
	document.querySelectorAll('.spreadsheet .area-selected-cell').forEach(el => el.classList.remove('area-selected-cell'));
	
	// Get the inner content div
	const contentDiv = cell.querySelector('.content-cut');
	
	// Get cell position relative to container
	const width = cell.offsetWidth;
	const height = cell.offsetHeight;
	
	const cellLeft = cell.offsetLeft;
	const cellTop = cell.offsetTop;
	
	// Setup the overlay editor (div contenteditable)
	const editor = document.getElementById('cell-editor');
	editor.style.top = cellTop + 'px';
	editor.style.left = cellLeft + 'px';
	editor.style.width = width + 'px';
	editor.style.height = height + 'px';
	editor.style.minWidth = width + 'px';
	editor.style.minHeight = height + 'px';
	editor.style.display = 'block';
	
	// Copy computed styles from the content div to the editor
	// This ensures font, alignment, color match exactly while editing
	const computedStyle = window.getComputedStyle(contentDiv);
	editor.style.textAlign = computedStyle.textAlign;
	editor.style.fontWeight = computedStyle.fontWeight;
	editor.style.fontStyle = computedStyle.fontStyle;
	editor.style.color = computedStyle.color;
	editor.style.fontSize = computedStyle.fontSize;
	editor.style.fontFamily = computedStyle.fontFamily;
	editor.style.backgroundColor = window.getComputedStyle(cell).backgroundColor; // Match cell background
	
	// --- UPDATED: Check for Dropdown Formula ---
	const formula = contentDiv.getAttribute('data-formula');
	const dropdownRegex = /^=dropdown\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
	
	if (formula && formula.match(dropdownRegex)) {
		// It is a dropdown: Render a floating select element
		const match = formula.match(dropdownRegex);
		const optionsStr = match[1];
		const currentSelection = match[2] || '';
		const options = optionsStr.split(',').map(o => o.trim());
		
		// Create wrapper for custom arrow styling
		const wrapper = document.createElement('div');
		wrapper.className = 'floating-select-wrapper';
		
		const select = document.createElement('select');
		select.className = 'floating-select';
		
		// Apply alignment specifically to select (text-align works differently on inputs)
		select.style.textAlign = computedStyle.textAlign;
		select.style.textAlignLast = computedStyle.textAlign; // Browser support varies
		
		// Populate options
		options.forEach(opt => {
			const option = document.createElement('option');
			option.value = opt;
			option.textContent = opt;
			if (opt === currentSelection) {
				option.selected = true;
			}
			select.appendChild(option);
		});
		
		// Add event listeners for the select
		select.addEventListener('change', function () {
			// Commit change immediately on selection
			stopEditing();
		});
		
		select.addEventListener('blur', function () {
			stopEditing();
		});
		
		// Prevent click propagation
		select.addEventListener('click', function (e) {
			e.stopPropagation();
		});
		
		wrapper.appendChild(select);
		editor.innerHTML = ''; // Clear text
		editor.appendChild(wrapper);
		editor.contentEditable = false; // Disable text editing on the container
		editor.style.padding = '0'; // Remove padding for select to fit
		
		// Focus the select
		select.focus();
		
	} else {
		// Normal Text Editing
		editor.innerText = contentDiv.innerText; // Use innerText for editing to avoid HTML tags
		editor.contentEditable = true;
		editor.style.padding = '2px 5px'; // Restore padding
		editor.focus();
		
		// Auto-resize logic (only for text)
		editor.oninput = function () {
			this.style.height = 'auto';
			this.style.width = 'auto';
			
			const scrollHeight = this.scrollHeight;
			const scrollWidth = this.scrollWidth;
			
			// Grow vertically
			if (scrollHeight > height) {
				this.style.height = scrollHeight + 'px';
			} else {
				this.style.height = height + 'px';
			}
			
			// Grow horizontally
			if (scrollWidth > width) {
				this.style.width = scrollWidth + 'px';
			} else {
				this.style.width = width + 'px';
			}
		};
		
		// Trigger resize immediately
		editor.dispatchEvent(new Event('input'));
	}
	
	// Hide the inner div content while editing so it doesn't duplicate visually
	contentDiv.style.visibility = 'hidden';
	
	isEditing = true;
}

// --------------------------------------------------//
function stopEditing() {
	if (!isEditing) return;
	
	const editingCell = document.querySelector('.edit-cell');
	const editor = document.getElementById('cell-editor');
	
	if (editingCell) {
		const contentDiv = editingCell.querySelector('.content-cut');
		let newText = '';
		let isDropdownChange = false;
		
		// Check if we were editing a dropdown
		const select = editor.querySelector('select.floating-select');
		
		if (select) {
			// Handle Dropdown Save
			const selectedValue = select.value;
			const formula = contentDiv.getAttribute('data-formula');
			
			// Reconstruct formula: =dropdown("opts", "newVal")
			const regex = /^=dropdown\s*\(\s*"([^"]+)"(?:\s*,\s*"[^"]*")?\s*\)$/i;
			const match = formula ? formula.match(regex) : null;
			
			if (match) {
				const options = match[1];
				const newFormula = `=dropdown("${options}", "${selectedValue}")`;
				
				// Update data-formula immediately
				contentDiv.setAttribute('data-formula', newFormula);
				
				// For the text display, we just show the value
				newText = selectedValue;
				isDropdownChange = true;
			} else {
				// Fallback
				newText = selectedValue;
			}
		} else {
			// Handle Normal Text Save
			newText = editor.innerText;
		}
		
		const oldText = contentDiv.innerText;
		
		// Capture state if changed
		if (newText !== oldText || isDropdownChange) {
			if (typeof HistoryManager !== 'undefined') {
				HistoryManager.addState();
			}
		}
		
		// Update DOM
		contentDiv.innerText = newText;
		contentDiv.style.visibility = 'visible';
		
		// Copy styles back from editor to contentDiv (if text editing)
		if (!select) {
			contentDiv.style.fontWeight = editor.style.fontWeight;
			contentDiv.style.fontStyle = editor.style.fontStyle;
			contentDiv.style.textAlign = editor.style.textAlign;
			contentDiv.style.color = editor.style.color;
			contentDiv.style.fontSize = editor.style.fontSize;
		}
		
		// Update Data Model
		const r = editingCell.parentElement.rowIndex - 1;
		const c = parseInt(editingCell.getAttribute('data-col'));
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;
		
		if (!sheet.cells[key]) sheet.cells[key] = {};
		
		if (isDropdownChange) {
			// Save the formula, not just the text
			const updatedFormula = contentDiv.getAttribute('data-formula');
			sheet.cells[key].text = updatedFormula;
			sheet.cells[key].html = updatedFormula;
		} else {
			// Save plain text
			sheet.cells[key].text = newText;
			sheet.cells[key].html = newText;
		}
		
		// Reset and hide editor
		editor.innerHTML = '';
		editor.style.display = 'none';
		editor.style.width = '';
		editor.style.height = '';
		editor.oninput = null;
		
		editingCell.classList.remove('edit-cell');
		isEditing = false;
		
		SheetDataManager.setModified(true);
	}
}

// --- NEW: Handle Dropdown Selection Change ---
function updateDropdownValue(r, c, selectElement) {
	if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
	
	const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
	const key = r + '-' + c;
	const selectedValue = selectElement.value;
	
	// Retrieve the original formula from the parent div's data attribute
	const contentDiv = selectElement.parentElement;
	const formula = contentDiv.getAttribute('data-formula');
	
	if (formula) {
		// Regex to find the options and replace the selection
		// Pattern: =dropdown("options", "oldSelection") or =dropdown("options")
		const regex = /^=dropdown\s*\(\s*"([^"]+)"(?:\s*,\s*"[^"]*")?\s*\)$/i;
		const match = formula.match(regex);
		
		if (match) {
			const options = match[1];
			// Construct new formula with selected value
			const newFormula = `=dropdown("${options}", "${selectedValue}")`;
			
			// Update Data
			if (!sheet.cells[key]) sheet.cells[key] = {};
			sheet.cells[key].text = newFormula;
			sheet.cells[key].html = newFormula; // Will be re-rendered as HTML select
			
			// Update DOM attribute for consistency until re-render
			contentDiv.setAttribute('data-formula', newFormula);
			
			SheetDataManager.setModified(true);
		}
	}
}

// --------------------------------------------------//
function addNewRow() {
	// Capture history before adding row
	if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
	
	const firstRow = document.querySelector('.spreadsheet tr');
	const columnCount = firstRow.querySelectorAll('th').length;
	const rowCount = document.querySelectorAll('.spreadsheet tbody tr').length;
	
	let newRowHtml = '<tr><th class="counter-cell">' + (rowCount + 1) + '</th>';
	for (let i = 1; i < columnCount; i++) {
		// Note: New rows need data-col
		newRowHtml += '<td class="text-cell" data-col="' + (i - 1) + '"><div class="content-cut"></div></td>';
	}
	newRowHtml += '</tr>';
	
	// Append to tbody
	document.querySelector('.spreadsheet tbody').insertAdjacentHTML('beforeend', newRowHtml);
	
	// Re-attach resize handlers for the new row header
	attachResizeHandlers();
}

// --------------------------------------------------//
function addNewColumn() {
	// Capture history before adding column
	if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
	
	const letterCells = document.querySelectorAll('.letter-cell');
	const colIndex = letterCells.length;
	const letter = String.fromCharCode('A'.charCodeAt(0) + colIndex); // Next letter (simplified logic)
	
	// Append header
	const headerRow = document.querySelector('.spreadsheet thead tr');
	headerRow.insertAdjacentHTML('beforeend', '<th class="letter-cell" data-col="' + colIndex + '">' + letter + '</th>');
	
	const rows = document.querySelectorAll('.spreadsheet tbody tr');
	rows.forEach(row => {
		row.insertAdjacentHTML('beforeend', '<td class="text-cell" data-col="' + colIndex + '"><div class="content-cut"></div></td>');
	});
	
	const table = document.querySelector('.spreadsheet');
	const startTableWidth = table.offsetWidth;
	const newTableWidth = startTableWidth + 200;
	table.style.width = newTableWidth + 'px';
	
	// Re-attach resize handlers for the new col header
	attachResizeHandlers();
}

// --------------------------------------------------//
function mergeCells() {
	if (!startCell || !endCell || startCell === endCell) return;
	
	// Capture history before merging
	if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
	
	const startRowIdx = startCell.parentElement.rowIndex; // Note: rowIndex includes thead
	const endRowIdx = endCell.parentElement.rowIndex;
	
	// We need index relative to tbody for logic, or just stick to rowIndex
	// Let's use rowIndex but remember thead is row 0.
	
	const startRow = Math.min(startRowIdx, endRowIdx);
	const endRow = Math.max(startRowIdx, endRowIdx);
	
	const startCol = Math.min(parseInt(startCell.getAttribute('data-col')), parseInt(endCell.getAttribute('data-col')));
	const endCol = Math.max(parseInt(startCell.getAttribute('data-col')), parseInt(endCell.getAttribute('data-col')));
	
	// Calculate spans
	const rowspan = endRow - startRow + 1;
	const colspan = endCol - startCol + 1;
	
	// Top Left Cell (Target) - Row index in `rows` collection
	// `rows` collection usually includes all rows in table.
	const tableRows = document.querySelectorAll('.spreadsheet tr');
	const topLeft = tableRows[startRow].querySelector('td[data-col="' + startCol + '"]');
	
	const mergedContent = [];
	
	// Iterate through range
	for (let r = startRow; r <= endRow; r++) {
		for (let c = startCol; c <= endCol; c++) {
			const cell = tableRows[r].querySelector('td[data-col="' + c + '"]');
			
			if (cell) {
				const text = cell.querySelector('.content-cut').textContent.trim();
				if (text) {
					mergedContent.push(text);
				}
				
				if (r === startRow && c === startCol) {
					continue; // Don't remove the top-left cell
				}
				
				// Remove other cells
				cell.remove();
			}
		}
	}
	
	// Apply changes to top-left cell
	topLeft.setAttribute('rowspan', rowspan);
	topLeft.setAttribute('colspan', colspan);
	topLeft.querySelector('.content-cut').textContent = mergedContent.join(' ');
	
	// Update width of the merged cell content
	const totalWidth = getColumnWidthRange(startCol, endCol);
	topLeft.querySelector('.content-cut').style.width = (totalWidth - 3) + 'px';
	
	// Reset selection
	startCell = null;
	endCell = null;
	isSelecting = false;
	
	// Highlight the merged cell
	highlightCell(topLeft);
	updateSelection(); // Clears the selection box
	saveState();
}

// --------------------------------------------------//
function unmergeCells() {
	const cell = document.querySelector('.selected-cell');
	if (!cell) return;
	
	const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
	const colspan = parseInt(cell.getAttribute('colspan')) || 1;
	
	if (rowspan === 1 && colspan === 1) return; // Not merged
	
	// Capture history before unmerging
	if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
	
	const startRow = cell.parentElement.rowIndex;
	const startCol = parseInt(cell.getAttribute('data-col'));
	
	const tableRows = document.querySelectorAll('.spreadsheet tr');
	
	// Iterate through the range covered by the merge
	for (let r = startRow; r < startRow + rowspan; r++) {
		for (let c = startCol; c < startCol + colspan; c++) {
			if (r === startRow && c === startCol) continue;
			
			// Create new cell
			const newCell = document.createElement('td');
			newCell.className = 'text-cell';
			newCell.setAttribute('data-col', c);
			const contentDiv = document.createElement('div');
			contentDiv.className = 'content-cut';
			newCell.appendChild(contentDiv);
			
			// Set width based on column width
			const colHeader = document.querySelector('.letter-cell[data-col="' + c + '"]');
			const colWidth = colHeader ? colHeader.offsetWidth : 100;
			contentDiv.style.width = (colWidth - 3) + 'px';
			
			// Set height based on row height
			// Note: counter-cell index matches row index in tbody (row index - 1 for header)
			// tableRows[r] is the TR. The counter cell is the first child.
			const rowHeader = tableRows[r].querySelector('.counter-cell');
			const rowHeight = rowHeader ? rowHeader.offsetHeight : 25;
			contentDiv.style.height = (rowHeight - 3) + 'px';
			
			// Insert cell at correct position
			const row = tableRows[r];
			
			// Find the insertion point: after the cell with data-col < c
			const cells = Array.from(row.querySelectorAll('td'));
			let prev = null;
			for (let i = cells.length - 1; i >= 0; i--) {
				if (parseInt(cells[i].getAttribute('data-col')) < c) {
					prev = cells[i];
					break;
				}
			}
			
			if (prev) {
				prev.insertAdjacentElement('afterend', newCell);
			} else {
				// If no previous cell (e.g. first col), prepend after the header
				// The first child is the TH (counter), so append after that or prepend to existing TDs
				const firstTd = row.querySelector('td');
				if (firstTd) {
					firstTd.insertAdjacentElement('beforebegin', newCell);
				} else {
					row.appendChild(newCell);
				}
			}
		}
	}
	
	// Remove attributes from top-left cell
	cell.removeAttribute('rowspan');
	cell.removeAttribute('colspan');
	
	// Reset width of top-left cell to single column width
	const singleColHeader = document.querySelector('.letter-cell[data-col="' + startCol + '"]');
	const singleColWidth = singleColHeader ? singleColHeader.offsetWidth : 100;
	cell.querySelector('.content-cut').style.width = (singleColWidth - 3) + 'px';
	
	// Re-highlight to update UI state
	highlightCell(cell);
	saveState();
}

// --------------------------------------------------//
// Function to attach resize handlers (extracted for re-use)
function attachResizeHandlers() {
	// Row Resizing
	const counterCells = document.querySelectorAll('.counter-cell:not(.processed)');
	counterCells.forEach(th => {
		th.style.position = 'sticky';
		th.style.userSelect = 'none';
		
		const handle = document.createElement('div');
		handle.className = 'resize-handle-row';
		handle.style.position = 'absolute';
		handle.style.bottom = '0';
		handle.style.left = '0';
		handle.style.width = '100%';
		handle.style.height = '5px';
		handle.style.cursor = 'row-resize';
		
		th.appendChild(handle);
		
		handle.addEventListener('mousedown', function (e) {
			e.preventDefault(); // prevents text selection
			// Capture history before resize starts
			if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
			
			const startHeight = th.offsetHeight;
			const startY = e.pageY;
			
			const row = th.parentElement;
			
			function onMouseMove(e) {
				const newHeight = startHeight + (e.pageY - startY);
				th.style.height = newHeight + 'px';
				
				// Apply height to all .content-cut divs in this row
				const contentDivs = row.querySelectorAll('.content-cut');
				contentDivs.forEach(div => {
					div.style.height = (newHeight - 3) + 'px';
				});
			}
			
			function onMouseUp() {
				const rowIndex = Array.from(row.parentElement.children).indexOf(row);
				const rowHeight = th.offsetHeight;
				
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				
				updateRowHeight(rowIndex, rowHeight);
				if (typeof saveState === 'function') saveState();
			}
			
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});
		
		th.classList.add('processed');
	});
	
	// Column Resizing
	const letterCells = document.querySelectorAll('.letter-cell:not(.processed)');
	letterCells.forEach(cell => {
		cell.style.position = 'sticky';
		cell.style.userSelect = 'none';
		
		const handle = document.createElement('div');
		handle.className = 'resize-handle';
		handle.style.position = 'absolute';
		handle.style.top = '0';
		handle.style.right = '0';
		handle.style.width = '5px';
		handle.style.height = '100%';
		handle.style.cursor = 'col-resize';
		
		cell.appendChild(handle);
		
		handle.addEventListener('mousedown', function (e) {
			e.preventDefault();
			// Capture history before resize starts
			if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
			
			console.log('Cell: ', cell);
			const startWidth = cell.offsetWidth;
			const startX = e.pageX;
			const table = document.querySelector('.spreadsheet');
			const startTableWidth = table.offsetWidth;
			
			const colIndex = parseInt(cell.getAttribute('data-col'));
			
			function onMouseMove(e) {
				const diff = e.pageX - startX;
				const newWidth = startWidth + diff;
				const newTableWidth = startTableWidth + diff;
				
				cell.style.width = newWidth + 'px';
				table.style.width = newTableWidth + 'px';
				
				updateColumnWidth(colIndex, newWidth);
			}
			
			function onMouseUp() {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				if (typeof saveState === 'function') saveState();
			}
			
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});
		
		cell.classList.add('processed');
	});
}

// --------------------------------------------------//
// ----------------- Document Ready -----------------//
document.addEventListener('DOMContentLoaded', function () {
	// Initialize Theme
	initTheme();
	
	// Theme Toggle Listener
	const themeBtn = document.getElementById('theme-toggle-btn');
	if (themeBtn) {
		themeBtn.addEventListener('click', function () {
			toggleTheme();
		});
	}
	
	// Merge Button Listener
	document.getElementById('merge-btn').addEventListener('click', function () {
		mergeCells();
	});
	
	// Unmerge Button Listener
	document.getElementById('unmerge-btn').addEventListener('click', function () {
		unmergeCells();
	});
	
	// --------------------------------------------------//
	
	attachResizeHandlers();
	
	// Listen for custom event from Data Manager to re-attach handlers after render
	document.addEventListener('sheetRendered', function () {
		attachResizeHandlers();
	});
	
	// --------------------------------------------------//
	
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
	
	// --------------------------------------------------//
});
