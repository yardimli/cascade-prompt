/**
 * Cascade Prompt Data Manager
 * Handles data structure, persistence, and DOM rendering for multiple sheets.
 */

var SheetDataManager = {
	data: {
		activeSheetIndex: 0,
		sheets: []
	},
	
	// Default configuration
	defaults: {
		rows: 100,
		cols: 26,
		sheetNamePrefix: 'Sheet',
		defaultRowHeight: 25, // Fallback, will be overwritten by measureDefaults
		defaultColWidth: 200  // Fallback, will be overwritten by measureDefaults
	},
	
	/**
	 * Initialize the data manager
	 */
	init: function () {
		// Measure defaults from the DOM (PHP generated table) before loading data
		// This ensures new sheets match the CSS styling of the initial sheet
		this.measureDefaults();
		
		this.loadFromLocalStorage();
		
		// If no data exists, create the initial sheet based on the current DOM or defaults
		if (this.data.sheets.length === 0) {
			this.createSheet(this.defaults.sheetNamePrefix + '1', true);
		}
		
		this.renderTabs();
		
		// If we loaded data, we might need to render the active sheet
		// (unless it's a fresh load where the PHP rendered the default grid)
		if (this.data.sheets.length > 0) {
			this.renderSheet(this.data.activeSheetIndex);
		}
	},
	
	/**
	 * Measure the dimensions of the currently rendered table to set defaults
	 */
	measureDefaults: function() {
		// Measure Row Height from the first row header
		var $sampleRowHeader = $('.spreadsheet tbody tr:first th.counter-cell');
		if ($sampleRowHeader.length) {
			// outerHeight includes padding and borders, which matches how we apply css('height') with border-box
			this.defaults.defaultRowHeight = $sampleRowHeader.outerHeight();
		}
		
		// Measure Column Width from the first column header
		var $sampleColHeader = $('.spreadsheet thead th.letter-cell').first();
		if ($sampleColHeader.length) {
			this.defaults.defaultColWidth = $sampleColHeader.outerWidth();
		}
	},
	
	/**
	 * Create a new sheet
	 * @param {string} name - Name of the sheet
	 * @param {boolean} isInitial - If true, captures current DOM state instead of creating empty
	 */
	createSheet: function (name, isInitial) {
		var newSheet = {
			name: name,
			rowCount: this.defaults.rows,
			colCount: this.defaults.cols,
			cells: {}, // Format: "rowIndex-colIndex": { text: "...", rowspan: 1, colspan: 1 }
			colWidths: {}, // Sparse object: { colIndex: width }
			rowHeights: {} // Sparse object: { rowIndex: height }
		};
		
		if (isInitial) {
			// Capture the state of the PHP-generated table currently in DOM
			newSheet = this.collectDOMData(newSheet);
		}
		
		this.data.sheets.push(newSheet);
		
		if (!isInitial) {
			// Switch to the new sheet immediately
			this.selectSheet(this.data.sheets.length - 1);
		} else {
			this.renderTabs();
			this.saveToLocalStorage();
		}
	},
	
	/**
	 * Switch to a specific sheet
	 * @param {number} index
	 */
	selectSheet: function (index) {
		if (index < 0 || index >= this.data.sheets.length) return;
		if (index === this.data.activeSheetIndex) return;
		
		// 1. Save current sheet state from DOM
		this.updateCurrentSheetData();
		
		// 2. Update active index
		this.data.activeSheetIndex = index;
		
		// 3. Render new sheet
		this.renderSheet(index);
		this.renderTabs();
		this.saveToLocalStorage();
	},
	
	/**
	 * Scrape current DOM to update the active sheet's data object
	 */
	updateCurrentSheetData: function () {
		var activeIndex = this.data.activeSheetIndex;
		if (this.data.sheets[activeIndex]) {
			this.data.sheets[activeIndex] = this.collectDOMData(this.data.sheets[activeIndex]);
		}
	},
	
	/**
	 * Helper to scrape DOM
	 * @param {object} sheetObj - The sheet object to update
	 * @returns {object} - Updated sheet object
	 */
	collectDOMData: function (sheetObj) {
		var cells = {};
		var colWidths = {};
		var rowHeights = {};
		
		// 1. Save Cell Content and Merges
		$('.spreadsheet .text-cell').each(function () {
			var $cell = $(this);
			var text = $cell.find('.content-cut').text();
			var rowspan = parseInt($cell.attr('rowspan')) || 1;
			var colspan = parseInt($cell.attr('colspan')) || 1;
			
			// Only save if interesting (content or merge)
			if (text || rowspan > 1 || colspan > 1) {
				var rowIndex = $cell.parent().index();
				var colIndex = parseInt($cell.attr('data-col'));
				
				cells[rowIndex + '-' + colIndex] = {
					text: text,
					rowspan: rowspan,
					colspan: colspan
				};
			}
		});
		
		// 2. Save Column Widths
		$('.letter-cell').each(function () {
			var index = parseInt($(this).attr('data-col'));
			colWidths[index] = $(this).outerWidth();
		});
		
		// 3. Save Row Heights
		$('.counter-cell').each(function () {
			var index = $(this).parent().index();
			rowHeights[index] = $(this).outerHeight();
		});
		
		// 4. Update Counts
		sheetObj.rowCount = $('.spreadsheet tbody tr').length;
		sheetObj.colCount = $('.spreadsheet thead th.letter-cell').length;
		
		sheetObj.cells = cells;
		sheetObj.colWidths = colWidths;
		sheetObj.rowHeights = rowHeights;
		
		return sheetObj;
	},
	
	/**
	 * Render a sheet to the DOM
	 * @param {number} index
	 */
	renderSheet: function (index) {
		var sheet = this.data.sheets[index];
		if (!sheet) return;
		
		// Reset selection/editing state
		if (typeof stopEditing === 'function') stopEditing();
		$('.selected-cell').removeClass('selected-cell');
		$('.highlight').removeClass('highlight');
		$('#formula-input').val('').prop('disabled', true);
		
		var $table = $('.spreadsheet');
		var $thead = $table.find('thead');
		var $tbody = $table.find('tbody');
		
		// --- Rebuild Header (Columns) ---
		var $headerRow = $thead.find('tr');
		$headerRow.empty();
		$headerRow.append('<th class="top-corner-cell"></th>');
		
		var tableWidth = 0;
		
		for (var c = 0; c < sheet.colCount; c++) {
			var letter = this.getColumnLetter(c);
			// Use stored width or measured default
			var width = sheet.colWidths[c] || this.defaults.defaultColWidth;
			var $th = $('<th class="letter-cell" data-col="' + c + '">' + letter + '</th>');
			
			$th.css('width', (width) + 'px');
			
			$headerRow.append($th);
			tableWidth += width;
		}
		
		// Adjust table width
		$table.width(tableWidth + 50); // +50 for row counter
		
		// --- Rebuild Body (Rows & Cells) ---
		$tbody.empty();
		
		for (var r = 0; r < sheet.rowCount; r++) {
			// Use stored height or measured default
			var height = sheet.rowHeights[r] || this.defaults.defaultRowHeight;
			var $tr = $('<tr></tr>');
			
			// Row Header
			var $rowHeader = $('<th class="counter-cell">' + (r + 1) + '</th>');
			$rowHeader.css('height', height + 'px');
			$tr.append($rowHeader);
			
			// Cells
			for (var c = 0; c < sheet.colCount; c++) {
				// Check if this cell is skipped due to a merge from above or left
				if (this.isCellHiddenByMerge(sheet, r, c)) {
					continue;
				}
				
				var cellKey = r + '-' + c;
				var cellData = sheet.cells[cellKey];
				
				var $td = $('<td class="text-cell" data-col="' + c + '"></td>');
				var $content = $('<div class="content-cut"></div>');
				
				// Apply dimensions
				var cellWidth = sheet.colWidths[c] || this.defaults.defaultColWidth;
				
				if (cellData) {
					$content.text(cellData.text || '');
					
					if (cellData.rowspan > 1) $td.attr('rowspan', cellData.rowspan);
					if (cellData.colspan > 1) $td.attr('colspan', cellData.colspan);
					
					// Calculate merged dimensions
					if (cellData.colspan > 1) {
						cellWidth = 0;
						for (var k = 0; k < cellData.colspan; k++) {
							cellWidth += (sheet.colWidths[c + k] || this.defaults.defaultColWidth);
						}
					}
					
					var cellHeight = height;
					if (cellData.rowspan > 1) {
						cellHeight = 0;
						for (var k = 0; k < cellData.rowspan; k++) {
							cellHeight += (sheet.rowHeights[r + k] || this.defaults.defaultRowHeight);
						}
					}
					
					$content.css('height', cellHeight + 'px');
				} else {
					// Empty cell
					$content.css('height', height + 'px');
				}
				
				$content.css('width', cellWidth + 'px');
				$td.append($content);
				$tr.append($td);
			}
			
			$tbody.append($tr);
		}
		
		// Re-attach resize handlers (UI function)
		this.rebindResizeHandlers();
	},
	
	/**
	 * Check if a specific coordinate is covered by a merge
	 */
	isCellHiddenByMerge: function (sheet, row, col) {
		// This is computationally expensive for large sheets if done naively.
		// Since we store merges in 'cells', we iterate known merges.
		
		for (var key in sheet.cells) {
			var parts = key.split('-');
			var r = parseInt(parts[0]);
			var c = parseInt(parts[1]);
			var data = sheet.cells[key];
			
			if (data.rowspan > 1 || data.colspan > 1) {
				// Check if (row, col) falls within this merge, EXCLUDING the start cell itself
				var endR = r + (data.rowspan || 1) - 1;
				var endC = c + (data.colspan || 1) - 1;
				
				if (row >= r && row <= endR && col >= c && col <= endC) {
					if (row === r && col === c) return false; // It's the master cell
					return true; // It's a hidden cell
				}
			}
		}
		return false;
	},
	
	/**
	 * Helper to get column letter from index (0 -> A, 25 -> Z, 26 -> AA)
	 */
	getColumnLetter: function (index) {
		var letter = '';
		while (index >= 0) {
			letter = String.fromCharCode((index % 26) + 65) + letter;
			index = Math.floor(index / 26) - 1;
		}
		return letter;
	},
	
	/**
	 * Re-apply jQuery events for resizing that are attached to specific elements
	 */
	rebindResizeHandlers: function () {
		$(document).trigger('sheetRendered');
	},
	
	/**
	 * Render the tabs at the bottom
	 */
	renderTabs: function () {
		var $container = $('#sheet-tabs-container');
		$container.find('.sheet-tab').remove(); // Remove existing tabs
		
		var self = this;
		
		this.data.sheets.forEach(function (sheet, index) {
			var $tab = $('<div class="sheet-tab">' + sheet.name + '</div>');
			if (index === self.data.activeSheetIndex) {
				$tab.addClass('active');
			}
			
			$tab.on('click', function () {
				self.selectSheet(index);
			});
			
			$container.find('.add-sheet-btn').before($tab);
		});
	},
	
	/**
	 * Persistence
	 */
	saveToLocalStorage: function () {
		// Always update current sheet before saving
		this.updateCurrentSheetData();
		localStorage.setItem('cascadePromptData', JSON.stringify(this.data));
		console.log('Data saved to LocalStorage');
	},
	
	loadFromLocalStorage: function () {
		var saved = localStorage.getItem('cascadePromptData');
		if (saved) {
			try {
				this.data = JSON.parse(saved);
			} catch (e) {
				console.error('Failed to load data', e);
			}
		}
	},
	
	resetData: function () {
		localStorage.removeItem('cascadePromptData');
		location.reload();
	}
};
