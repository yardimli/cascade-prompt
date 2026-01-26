// cascade.js
class ExcelGrid {
	constructor() {
		this.rows = 100;
		this.cols = 26; // A to Z
		this.data = [];
		this.settings = {
			cellWidth: 100,
			cellHeight: 25,
			backgroundColor: '#ffffff',
			headerBackgroundColor: '#f0f0f0',
			borderColor: '#ccc',
			borderWidth: 1,
			cursorRow: 1,
			cursorCol: 1
		};
		this.columnWidths = new Array(this.cols + 1).fill(this.settings.cellWidth);
		this.rowHeights = new Array(this.rows + 1).fill(this.settings.cellHeight);
		
		this.suppressScrollRender = false;
		this.selectedCells = new Set();
		this.isRendering = false;
		
		this.initializeData();
		this.initializeResizeHandlers();
		this.initializeClickHandlers();
		
		this.render(1);
		
		$('body').addClass('no-select');
	}
	
	initializeData() {
		for (let i = 0; i <= this.rows; i++) {
			this.data[i] = [];
			for (let j = 0; j <= this.cols; j++) {
				this.data[i][j] = {
					value: '',
					cellWidth: 1,
					cellHeight: 1,
					isHidden: false,
					isHeader: i === 0 || j === 0,
					address: i === 0 ? (j === 0 ? '' : this.getColumnLetter(j - 1)) :
						j === 0 ? i : `${this.getColumnLetter(j - 1)}${i}`
				};
			}
		}
	}
	
	initializeClickHandlers() {
		const self = this;
		$(document).on('click', function (e) {
			const $target = $(e.target);
			const $cell = $target.closest('.grid-cell:not(.corner-cell)');
			
			if ($cell.length && !$cell.closest('.header-row, .header-column').length) {
				self.clearSelection();
				self.setCursorPosition(parseInt($cell.attr('data-row')), parseInt($cell.attr('data-col')));
				console.log("Cell clicked");
			}
		});
	}
		
		
		debounce = (func, wait) => {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}
	
	getColumnLetter(col) {
		return String.fromCharCode(65 + col); // A=65, B=66, etc.
	}
	
	getColumnIndex(letter) {
		return letter.toUpperCase().charCodeAt(0) - 65;
	}
	
	getCursorPosition() {
		return {
			row: this.settings.cursorRow,
			col: this.settings.cursorCol
		};
	}
	
	setCursorPosition(row, col) {
		this.settings.cursorRow = row;
		this.settings.cursorCol = col;
		
		// Clear any existing selection in the grid data
		for (let i = 1; i <= this.rows; i++) {
			for (let j = 1; j <= this.cols; j++) {
				this.data[i][j].selected = false;
			}
		}
		
		// Remove selected class from all cells and add it to the current cell
		$('.grid-cell').removeClass('selected selected-cell');
		
		this.drawCursor();
	}
	
	drawCursor() {
		$('.grid-cell').removeClass('selected');
		const cell = $(`.grid-cell[data-row="${this.settings.cursorRow}"][data-col="${this.settings.cursorCol}"]`);
		$(cell).addClass('selected');
	}
	
	navigateToCell(row, col, isPaging = false) {
		
		// Update cursor position in settings
		this.settings.cursorRow = row;
		this.settings.cursorCol = col;
		
		console.log("Navigate to cell: ", row, col);
		// First, ensure the scroll happens before selecting the cell
		const container = $('.grid-content');
		const cellHeight = this.settings.cellHeight;
		
		// Handle Page Up/Down differently
		if (isPaging) {
			// Just scroll the container without moving the cursor
			const targetScrollTop = (row - 1) * cellHeight;
			this.suppressScrollRender = false;
			container.scrollTop(targetScrollTop);
			
			return; // Exit early - don't change cell selection
		}
		
		this.setCursorPosition(row, col);
		
		// For normal navigation (arrows, etc.)
		const cell = $(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
		if (cell.length) {
			// Get the container and its dimensions
			const containerRect = container[0].getBoundingClientRect();
			
			// Get cell position and dimensions
			const cellRect = cell[0].getBoundingClientRect();
			
			// Define scroll buffer zones (in pixels)
			const scrollBuffer = {
				top: 50,
				bottom: 50,
				left: 100,
				right: 100
			};
			
			// Calculate the new scroll position
			let newScrollTop = container.scrollTop();
			let newScrollLeft = container.scrollLeft();
			
			if (cellRect.top - containerRect.top < scrollBuffer.top) {
				newScrollTop = container.scrollTop() - (scrollBuffer.top - (cellRect.top - containerRect.top));
			} else if (containerRect.bottom - cellRect.bottom < scrollBuffer.bottom) {
				newScrollTop = container.scrollTop() + (scrollBuffer.bottom - (containerRect.bottom - cellRect.bottom));
			}
			
			if (cellRect.left - containerRect.left < scrollBuffer.left) {
				newScrollLeft = container.scrollLeft() - (scrollBuffer.left - (cellRect.left - containerRect.left));
			} else if (containerRect.right - cellRect.right < scrollBuffer.right) {
				newScrollLeft = container.scrollLeft() + (scrollBuffer.right - (containerRect.right - cellRect.right));
			}
			
			// Apply the scroll if needed
			if (newScrollTop !== container.scrollTop()) {
				container.scrollTop(newScrollTop);
			}
			if (newScrollLeft !== container.scrollLeft()) {
				container.scrollLeft(newScrollLeft);
			}
		} else
		{
			console.log("Cell not found: ", row, col);
			// If the cell doesn't exist, just scroll to the row
		}
	}
	
	initializeResizeHandlers() {
		let startX, startY, startWidth, startHeight, resizingCol, resizingRow;
		let $resizeGuide = null;
		const self = this;
		
		// Column resize
		$(document).on('mousedown', '.resize-handle-col', function (e) {
			const $cell = $(this).closest('.grid-cell');
			// Get the actual column index from the cell's address
			resizingCol = self.getColumnIndex($cell.text()) + 1;
			
			startX = e.pageX;
			startWidth = self.columnWidths[resizingCol];
			
			// Create resize guide
			$resizeGuide = $('<div>')
				.addClass('resize-guide resize-guide-vertical')
				.css({
					left: (e.pageX - $('#grid-container').offset().left) + 'px'
				});
			$('#grid-container').append($resizeGuide);
			
			$(document).on('mousemove.resize', function (e) {
				$resizeGuide.css('left', (e.pageX - $('#grid-container').offset().left) + 'px');
			});
			
			$(document).on('mouseup.resize', function (e) {
				const diff = e.pageX - startX;
				const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
				self.columnWidths[resizingCol] = newWidth;
				
				$resizeGuide.remove();
				self.render(2);
				$(document).off('.resize');
			});
			e.preventDefault();
		});
		
		// Row resize
		$(document).on('mousedown', '.resize-handle-row', function (e) {
			const $cell = $(this).closest('.grid-cell');
			// Get the actual row index from the cell's text content
			resizingRow = parseInt($cell.text());
			
			startY = e.pageY;
			startHeight = self.rowHeights[resizingRow];
			
			// Create resize guide
			$resizeGuide = $('<div>')
				.addClass('resize-guide resize-guide-horizontal')
				.css({
					top: (e.pageY - $('#grid-container').offset().top) + 'px'
				});
			$('#grid-container').append($resizeGuide);
			
			$(document).on('mousemove.resize', function (e) {
				$resizeGuide.css('top', (e.pageY - $('#grid-container').offset().top) + 'px');
			});
			
			$(document).on('mouseup.resize', function (e) {
				const diff = e.pageY - startY;
				const newHeight = Math.max(20, startHeight + diff); // Minimum height of 20px
				self.rowHeights[resizingRow] = newHeight;
				
				$resizeGuide.remove();
				self.render(3);
				$(document).off('.resize');
			});
			e.preventDefault();
		});
	}
	
	setCellValue(row, col, value, updateGrid = true) {
		if (typeof col === 'string') {
			col = this.getColumnIndex(col) + 1;
		}
		if (row <= this.rows && col <= this.cols) {
			this.data[row][col].value = value;
			if (updateGrid) {
				this.render(4);
			}
		}
	}
	
	getCellValue(row, col) {
		if (typeof col === 'string') {
			col = this.getColumnIndex(col) + 1;
		}
		if (row <= this.rows && col <= this.cols) {
			return this.data[row][col].value;
		}
		return null;
	}
	
	setCellSize(row, col, width, height, updateGrid = true) {
		if (typeof col === 'string') {
			col = this.getColumnIndex(col) + 1;
		}
		if (row <= this.rows && col <= this.cols) {
			this.data[row][col].cellWidth = width;
			this.data[row][col].cellHeight = height;
			
			for (let i = row; i < row + height && i <= this.rows; i++) {
				for (let j = col; j < col + width && j <= this.cols; j++) {
					if (i !== row || j !== col) {
						this.data[i][j].isHidden = true;
					}
				}
			}
			if (updateGrid) {
				this.render(5);
			}
		}
	}
	
	getColumnPosition(col) {
		let position = 0;
		for (let i = 0; i < col; i++) {
			position += this.columnWidths[i];
		}
		return position - (col > 0 ? this.columnWidths[0] : 0);
	}
	
	getRowPosition(row) {
		let position = 0;
		for (let i = 0; i < row; i++) {
			position += this.rowHeights[i];
		}
		return position - (row > 0 ? this.rowHeights[0] : 0);
	}
	
	getSpanWidth(col, span) {
		let width = 0;
		for (let i = 0; i < span; i++) {
			width += this.columnWidths[col + i];
		}
		return width;
	}
	
	getSpanHeight(row, span) {
		let height = 0;
		for (let i = 0; i < span; i++) {
			height += this.rowHeights[row + i];
		}
		return height;
	}
	
	createCell(i, j, isHeader) {
		const cell = this.data[i][j];
		if (cell.isHidden) return null;
		
		const div = document.createElement('div');
		div.className = 'grid-cell';
		
		if (cell.value) {
			div.classList.add('has-content');
		}
		
		if (cell.wordWrap) {
			div.classList.add('word-wrap');
		} else {
			if (cell.value && j + 1 <= this.cols && !this.data[i][j + 1].value) {
				div.classList.add('expand-right');
			}
		}
		
		if (!isHeader && this.data[i][j].selected) {
			div.classList.add('selected-cell');
		}
		
		const transform = `translate(${this.getColumnPosition(j)}px, ${this.getRowPosition(i)}px)`;
		Object.assign(div.style, {
			transform,
			width: this.getSpanWidth(j, cell.cellWidth) + 'px',
			height: this.getSpanHeight(i, cell.cellHeight) + 'px',
			backgroundColor: isHeader ? this.settings.headerBackgroundColor : this.settings.backgroundColor,
			borderColor: this.settings.borderColor,
			borderWidth: this.settings.borderWidth + 'px'
		});
		
		div.setAttribute('data-row', i);
		div.setAttribute('data-col', j);
		
		if (isHeader) {
			div.textContent = cell.address;
			div.style.fontWeight = 'bold';
			if (i === 0 && j > 0) {
				const resizeHandle = document.createElement('div');
				resizeHandle.className = 'resize-handle-col';
				div.appendChild(resizeHandle);
			} else if (j === 0 && i > 0) {
				const resizeHandle = document.createElement('div');
				resizeHandle.className = 'resize-handle-row';
				div.appendChild(resizeHandle);
			}
		} else {
			div.textContent = cell.value;
		}
		
		return div;
	}
	
	renderVisibleCells(content, container, headerRow, headerColumn) {
		// Update header positions if content exists
		if (content.scrollLeft !== undefined && content.scrollTop !== undefined) {
			headerRow.scrollLeft = content.scrollLeft;
			headerColumn.scrollTop = content.scrollTop;
		}
		
		// Get scroll positions
		const scrollTop = content?.scrollTop || 0;
		const scrollLeft = content?.scrollLeft || 0;
		const viewportHeight = container.clientHeight;
		const viewportWidth = container.clientWidth;
		
		// Calculate visible range
		const startRow = Math.floor(scrollTop / this.settings.cellHeight);
		const endRow = Math.min(this.rows, Math.ceil((scrollTop + viewportHeight) / this.settings.cellHeight));
		const startCol = Math.floor(scrollLeft / this.settings.cellWidth);
		const endCol = Math.min(this.cols, Math.ceil((scrollLeft + viewportWidth) / this.settings.cellWidth));
		
		// Clear existing cells except headers
		const existingCells = content.querySelectorAll('.grid-cell:not(.header-row):not(.header-column)');
		existingCells.forEach(cell => {
			const row = parseInt(cell.getAttribute('data-row'));
			const col = parseInt(cell.getAttribute('data-col'));
			if (row === 0 || col === 0) return; // Skip headers
			cell.remove();
		});
		
		// Render only visible cells
		for (let i = startRow; i <= endRow; i++) {
			for (let j = startCol; j <= endCol; j++) {
				if (i === 0 || j === 0) continue; // Skip headers
				const cell = this.createCell(i, j, false);
				if (cell) {
					content.appendChild(cell);
				}
			}
		}
		this.drawCursor();
	}
	
	render(callId) {
		if (this.isRendering) return;
		let start_time = new Date().getTime();
		this.isRendering = true;
		console.log('Rendering grid... with callId: '+ callId + ' at ' + new Date().toLocaleTimeString());
		
		// Store previous scroll positions if content existed
		const previousScrollLeft = $('.grid-content').scrollLeft() || 0;
		const previousScrollTop = $('.grid-content').scrollTop() || 0;
		
		// Create document fragment for batch DOM updates
		const fragment = document.createDocumentFragment();
		const container = document.getElementById('grid-container');
		container.innerHTML = '';
		
		// Create main elements
		const content = document.createElement('div');
		content.className = 'grid-content';
		
		// Add these lines to set the total scrollable area
		const totalWidth = this.columnWidths.reduce((sum, width) => sum + width, 0);
		const totalHeight = this.rowHeights.reduce((sum, height) => sum + height, 0);
		
		// Create a div that defines the total scrollable area
		const scrollArea = document.createElement('div');
		scrollArea.style.position = 'absolute';
		scrollArea.style.width = `${totalWidth}px`;
		scrollArea.style.height = `${totalHeight}px`;
		content.appendChild(scrollArea);
		
		const headerRow = document.createElement('div');
		headerRow.className = 'header-row';
		
		const headerColumn = document.createElement('div');
		headerColumn.className = 'header-column';
		
		const cornerCell = document.createElement('div');
		cornerCell.className = 'corner-cell';
		
		// Render headers (always visible)
		for (let j = 0; j <= this.cols; j++) {
			const headerCell = this.createCell(0, j, true);
			if (headerCell) headerRow.appendChild(headerCell);
		}
		
		for (let i = 0; i <= this.rows; i++) {
			const headerCell = this.createCell(i, 0, true);
			if (headerCell) headerColumn.appendChild(headerCell);
		}
		
		// Append all elements to fragment
		fragment.appendChild(content);
		fragment.appendChild(headerRow);
		fragment.appendChild(headerColumn);
		fragment.appendChild(cornerCell);
		
		// Single DOM update
		container.appendChild(fragment);
		
		// Restore previous scroll positions
		content.scrollLeft = previousScrollLeft;
		content.scrollTop = previousScrollTop;
		
		this.renderVisibleCells(content, container, headerRow, headerColumn);
		
		// Add scroll handler using native JavaScript
		content.addEventListener('scroll', this.debounce(() => {
			if (!this.suppressScrollRender) {
				console.log('Scroll render at ' + new Date().toLocaleTimeString());
				this.renderVisibleCells(content, container, headerRow, headerColumn);
			}
		}, 50));
		
		// const initialScrollEvent = new Event('scroll');
		// content.dispatchEvent(initialScrollEvent);
		
		let end_time = new Date().getTime();
		console.log('Rendering took ' + (end_time - start_time) + ' ms');
		this.isRendering = false;
		
	}
	
	isSelected(row, col) {
		return this.selectedCells.has(`${row},${col}`);
	}
	
	clearSelection() {
		this.selectedCells.clear();
		this.updateSelectionState();
	}
	
	addToSelection(row, col) {
		this.selectedCells.add(`${row},${col}`);
		this.updateSelectionState();
	}
	
	removeFromSelection(row, col) {
		this.selectedCells.delete(`${row},${col}`);
		this.updateSelectionState();
	}
	
	updateSelectionState() {
		// Update the grid's data structure
		for (let i = 1; i <= this.rows; i++) {
			for (let j = 1; j <= this.cols; j++) {
				this.data[i][j].selected = this.isSelected(i, j);
			}
		}
	}
	
	getSelectionBounds() {
		let startRow = Infinity, startCol = Infinity;
		let endRow = -Infinity, endCol = -Infinity;
		
		this.selectedCells.forEach(cell => {
			const [row, col] = cell.split(',').map(Number);
			startRow = Math.min(startRow, row);
			startCol = Math.min(startCol, col);
			endRow = Math.max(endRow, row);
			endCol = Math.max(endCol, col);
		});
		
		return {startRow, startCol, endRow, endCol};
	}
	
	// Add this method to the ExcelGrid class
	toggleWordWrap(row, col, updateGrid = true) {
		if (typeof col === 'string') {
			col = this.getColumnIndex(col) + 1;
		}
		
		if (row <= this.rows && col <= this.cols) {
			// Initialize wordWrap property if it doesn't exist
			if (typeof this.data[row][col].wordWrap === 'undefined') {
				this.data[row][col].wordWrap = false;
			}
			
			// Toggle the wordWrap property
			this.data[row][col].wordWrap = !this.data[row][col].wordWrap;
			if (updateGrid) {
				this.render(6);
			}
		}
	}
	
	updateSettings(newSettings) {
		Object.assign(this.settings, newSettings);
		this.render(7);
	}
}
