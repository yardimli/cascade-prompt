class GridEditor {
	constructor(grid) {
		this.grid = grid;
		this.selectedCell = null;
		this.editor = null;
		this.currentRow = 1; // Start at row 1
		this.currentCol = 1; // Start at column A
		this.initializeEventListeners();
		// Set initial selection when grid is created
		this.initializeSelection();
	}
	
	initializeSelection() {
		// Wait briefly for the grid to render
		setTimeout(() => {
			const initialCell = $(`.grid-cell[data-row="1"][data-col="1"]`);
			if (initialCell.length) {
				this.selectCell(initialCell[0]);
			}
		}, 100);
	}
	
	initializeEventListeners() {
		const self = this;
		
		// Update the cell click handler
		$(document).on('click', '.grid-cell:not(.corner-cell)', function (e) {
			if (!$(this).closest('.header-row, .header-column').length) {
				if (self.editor) {
					// If we're editing, save the current edit first
					self.saveEdit(1);
				}
				self.selectCell(this);
				e.stopPropagation();
			}
		});
		
		$(document).on('dblclick', '.grid-cell:not(.corner-cell)', function (e) {
			if (!$(this).closest('.header-row, .header-column').length) {
				self.startEditing(this);
				e.stopPropagation();
			}
		});
		
		// Update the document click handler
		$(document).on('click', function (e) {
			if (!$(e.target).closest('.grid-cell').length && !$(e.target).closest('.cell-editor').length) {
				if (self.editor) {
					self.saveEdit(2);
				} else {
					self.deselectCell();
				}
			}
		});
		
		// Add keyboard navigation
		$(document).on('keydown', (e) => {
			if (this.editor) {
				// Handle keys while editing
				switch (e.key) {
					case 'Enter':
						this.saveEdit(3);
						e.preventDefault();
						break;
					case 'Escape':
						this.removeEditor();
						e.preventDefault();
						break;
				}
			} else if (this.currentRow !== null && this.currentCol !== null) {
				// Only handle keyboard if we're not editing and have a selection
				switch (e.key) {
					case 'ArrowUp':
						if (this.currentRow > 1) {
							this.navigateToCell(this.currentRow - 1, this.currentCol);
						}
						e.preventDefault();
						break;
					case 'ArrowDown':
						if (this.currentRow < this.grid.rows) {
							this.navigateToCell(this.currentRow + 1, this.currentCol);
						}
						e.preventDefault();
						break;
					case 'ArrowLeft':
						if (this.currentCol > 1) {
							this.navigateToCell(this.currentRow, this.currentCol - 1);
						}
						e.preventDefault();
						break;
					case 'ArrowRight':
						if (this.currentCol < this.grid.cols) {
							this.navigateToCell(this.currentRow, this.currentCol + 1);
						}
						e.preventDefault();
						break;
					case 'Enter':
						const currentCell = $(`.grid-cell[data-row="${this.currentRow}"][data-col="${this.currentCol}"]`)[0];
						if (currentCell) {
							this.startEditing(currentCell);
						}
						e.preventDefault();
						break;
				}
			}
		});
	}
	
	navigateToCell(row, col) {
		const cell = $(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
		if (cell.length) {
			this.selectCell(cell[0]);
			
			// Get the container and its dimensions
			const container = $('.grid-content');
			const containerRect = container[0].getBoundingClientRect();
			
			// Get cell position and dimensions
			const cellRect = cell[0].getBoundingClientRect();
			
			// Define scroll buffer zones (in pixels)
			const scrollBuffer = {
				top: 50,    // Start scrolling when cell is 50px from top
				bottom: 50, // Start scrolling when cell is 50px from bottom
				left: 100,  // Start scrolling when cell is 100px from left
				right: 100  // Start scrolling when cell is 100px from right
			};
			
			// Calculate the current scroll position
			let newScrollTop = container.scrollTop();
			let newScrollLeft = container.scrollLeft();
			
			// Check if cell is within buffer zone vertically
			if (cellRect.top - containerRect.top < scrollBuffer.top) {
				// Cell is near top edge
				newScrollTop = container.scrollTop() -
					(scrollBuffer.top - (cellRect.top - containerRect.top));
			} else if (containerRect.bottom - cellRect.bottom < scrollBuffer.bottom) {
				// Cell is near bottom edge
				newScrollTop = container.scrollTop() +
					(scrollBuffer.bottom - (containerRect.bottom - cellRect.bottom));
			}
			
			// Check if cell is within buffer zone horizontally
			if (cellRect.left - containerRect.left < scrollBuffer.left) {
				// Cell is near left edge
				newScrollLeft = container.scrollLeft() -
					(scrollBuffer.left - (cellRect.left - containerRect.left));
			} else if (containerRect.right - cellRect.right < scrollBuffer.right) {
				// Cell is near right edge
				newScrollLeft = container.scrollLeft() +
					(scrollBuffer.right - (containerRect.right - cellRect.right));
			}
			
			// Only scroll if necessary
			if (newScrollTop !== container.scrollTop()) {
				container.scrollTop(newScrollTop);
			}
			if (newScrollLeft !== container.scrollLeft()) {
				container.scrollLeft(newScrollLeft);
			}
		}
	}
	
	selectCell(cell) {
		$('.grid-cell').removeClass('selected');
		$(cell).addClass('selected');
		this.selectedCell = cell;
		this.currentRow = parseInt($(cell).attr('data-row'));
		this.currentCol = parseInt($(cell).attr('data-col'));
	}
	
	deselectCell() {
		$('.grid-cell').removeClass('selected');
		this.selectedCell = null;
		this.currentRow = null;
		this.currentCol = null;
		this.removeEditor();
	}
	
	startEditing(cell) {
		if (this.editor) {
			this.removeEditor();
		}
		
		const $cell = $(cell);
		const row = parseInt($cell.attr('data-row'));
		const col = parseInt($cell.attr('data-col'));
		const cellContent = this.grid.data[row][col].value;
		const cellOffset = $cell.offset();
		const containerOffset = $('#grid-container').offset();
		const editorLeft = cellOffset.left - containerOffset.left;
		const editorTop = cellOffset.top - containerOffset.top;
		const cellWidth = $cell.outerWidth();
		const cellHeight = $cell.outerHeight();
		
		this.editor = $('<input>')
			.addClass('cell-editor')
			.val(cellContent)
			.css({
				position: 'absolute',
				left: editorLeft,
				top: editorTop,
				width: cellWidth,
				height: cellHeight,
				zIndex: 1000
			});
		
		$('#grid-container').append(this.editor);
		this.editor.focus();
		
		// Add blur handler with a flag to check if it's a keyboard exit
		let isKeyboardExit = false;
		
		this.editor.on('keydown', (e) => {
			if (e.key === 'Enter' || e.key === 'Escape') {
				isKeyboardExit = true;
			}
		});
		
		// Only need blur handler now
		this.editor.on('blur', () => {
			if (!isKeyboardExit) {
				this.saveEdit(4);
			}
			isKeyboardExit = false;
		});
	}
	
	saveEdit(callId) {
		console.log("Save edit called with callId: " + callId);
		if (this.editor && this.currentRow !== null && this.currentCol !== null) {
			// Save current scroll position
			let container = $('.grid-content');
			const scrollTop = container.scrollTop();
			const scrollLeft = container.scrollLeft();
			const newValue = this.editor.val();

			this.grid.suppressScrollRender = true;
			
			this.grid.data[this.currentRow][this.currentCol].value = newValue;
			this.grid.render(10);
			this.removeEditor();
			
			// Restore scroll position
			container = $('.grid-content');
			container.scrollTop(scrollTop);
			container.scrollLeft(scrollLeft);
			
			// Reselect the cell after saving
			const cell = $(`.grid-cell[data-row="${this.currentRow}"][data-col="${this.currentCol}"]`)[0];
			if (cell) {
				this.selectCell(cell);
			}
			
			setTimeout(() => {
				this.grid.suppressScrollRender = false;
			}, 250);
		}
	}
	
	removeEditor() {
		if (this.editor) {
			this.editor.remove();
			this.editor = null;
		}
	}
}
