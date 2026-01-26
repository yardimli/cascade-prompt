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
		defaultColWidth: 200 // Fallback, will be overwritten by measureDefaults
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
	measureDefaults: function () {
		// Measure Row Height from the first row header
		const sampleRowHeader = document.querySelector('.spreadsheet tbody tr:first-child th.counter-cell');
		if (sampleRowHeader) {
			this.defaults.defaultRowHeight = sampleRowHeader.offsetHeight;
		}
		
		// Measure Column Width from the first column header
		const sampleColHeader = document.querySelector('.spreadsheet thead th.letter-cell');
		if (sampleColHeader) {
			this.defaults.defaultColWidth = sampleColHeader.offsetWidth;
		}
	},
	
	/**
	 * Create a new sheet
	 * @param {string} name - Name of the sheet
	 * @param {boolean} isInitial - If true, captures current DOM state instead of creating empty
	 */
	createSheet: function (name, isInitial) {
		let newSheet = {
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
		const activeIndex = this.data.activeSheetIndex;
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
		const cells = {};
		const colWidths = {};
		const rowHeights = {};
		
		// 1. Save Cell Content and Merges
		const textCells = document.querySelectorAll('.spreadsheet .text-cell');
		textCells.forEach(cell => {
			const contentDiv = cell.querySelector('.content-cut');
			const text = contentDiv ? contentDiv.textContent : '';
			const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
			const colspan = parseInt(cell.getAttribute('colspan')) || 1;
			
			// Only save if interesting (content or merge)
			if (text || rowspan > 1 || colspan > 1) {
				const row = cell.parentElement;
				const tbody = row.parentElement;
				const rowIndex = Array.from(tbody.children).indexOf(row);
				const colIndex = parseInt(cell.getAttribute('data-col'));
				
				cells[rowIndex + '-' + colIndex] = {
					text: text,
					rowspan: rowspan,
					colspan: colspan
				};
			}
		});
		
		// 2. Save Column Widths
		document.querySelectorAll('.letter-cell').forEach(cell => {
			const index = parseInt(cell.getAttribute('data-col'));
			colWidths[index] = cell.offsetWidth;
		});
		
		// 3. Save Row Heights
		document.querySelectorAll('.counter-cell').forEach(cell => {
			const row = cell.parentElement;
			const tbody = row.parentElement;
			const index = Array.from(tbody.children).indexOf(row);
			rowHeights[index] = cell.offsetHeight;
		});
		
		// 4. Update Counts
		sheetObj.rowCount = document.querySelectorAll('.spreadsheet tbody tr').length;
		sheetObj.colCount = document.querySelectorAll('.spreadsheet thead th.letter-cell').length;
		
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
		const sheet = this.data.sheets[index];
		if (!sheet) return;
		
		// Reset selection/editing state
		if (typeof stopEditing === 'function') stopEditing();
		document.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
		document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
		const formulaInput = document.getElementById('formula-input');
		formulaInput.value = '';
		formulaInput.disabled = true;
		
		const table = document.querySelector('.spreadsheet');
		const thead = table.querySelector('thead');
		const tbody = table.querySelector('tbody');
		
		// --- Rebuild Header (Columns) ---
		const headerRow = thead.querySelector('tr');
		headerRow.innerHTML = ''; // Clear existing
		headerRow.insertAdjacentHTML('beforeend', '<th class="top-corner-cell"></th>');
		
		let tableWidth = 0;
		
		for (let c = 0; c < sheet.colCount; c++) {
			const letter = this.getColumnLetter(c);
			// Use stored width or measured default
			const width = sheet.colWidths[c] || this.defaults.defaultColWidth;
			
			const th = document.createElement('th');
			th.className = 'letter-cell';
			th.setAttribute('data-col', c);
			th.textContent = letter;
			th.style.width = width + 'px';
			
			headerRow.appendChild(th);
			tableWidth += width;
		}
		
		// Adjust table width
		table.style.width = (tableWidth + 50) + 'px'; // +50 for row counter
		
		// --- Rebuild Body (Rows & Cells) ---
		tbody.innerHTML = '';
		
		for (let r = 0; r < sheet.rowCount; r++) {
			// Use stored height or measured default
			const height = sheet.rowHeights[r] || this.defaults.defaultRowHeight;
			const tr = document.createElement('tr');
			
			// Row Header
			const rowHeader = document.createElement('th');
			rowHeader.className = 'counter-cell';
			rowHeader.textContent = (r + 1);
			rowHeader.style.height = height + 'px';
			tr.appendChild(rowHeader);
			
			// Cells
			for (let c = 0; c < sheet.colCount; c++) {
				// Check if this cell is skipped due to a merge from above or left
				if (this.isCellHiddenByMerge(sheet, r, c)) {
					continue;
				}
				
				const cellKey = r + '-' + c;
				const cellData = sheet.cells[cellKey];
				
				const td = document.createElement('td');
				td.className = 'text-cell';
				td.setAttribute('data-col', c);
				
				const content = document.createElement('div');
				content.className = 'content-cut';
				
				// Apply dimensions
				let cellWidth = sheet.colWidths[c] || this.defaults.defaultColWidth;
				
				if (cellData) {
					content.textContent = cellData.text || '';
					
					if (cellData.rowspan > 1) td.setAttribute('rowspan', cellData.rowspan);
					if (cellData.colspan > 1) td.setAttribute('colspan', cellData.colspan);
					
					// Calculate merged dimensions
					if (cellData.colspan > 1) {
						cellWidth = 0;
						for (let k = 0; k < cellData.colspan; k++) {
							cellWidth += (sheet.colWidths[c + k] || this.defaults.defaultColWidth);
						}
					}
					
					let cellHeight = height;
					if (cellData.rowspan > 1) {
						cellHeight = 0;
						for (let k = 0; k < cellData.rowspan; k++) {
							cellHeight += (sheet.rowHeights[r + k] || this.defaults.defaultRowHeight);
						}
					}
					
					content.style.height = cellHeight + 'px';
				} else {
					// Empty cell
					content.style.height = height + 'px';
				}
				
				content.style.width = cellWidth + 'px';
				td.appendChild(content);
				tr.appendChild(td);
			}
			
			tbody.appendChild(tr);
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
		
		for (const key in sheet.cells) {
			const parts = key.split('-');
			const r = parseInt(parts[0]);
			const c = parseInt(parts[1]);
			const data = sheet.cells[key];
			
			if (data.rowspan > 1 || data.colspan > 1) {
				// Check if (row, col) falls within this merge, EXCLUDING the start cell itself
				const endR = r + (data.rowspan || 1) - 1;
				const endC = c + (data.colspan || 1) - 1;
				
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
		let letter = '';
		while (index >= 0) {
			letter = String.fromCharCode((index % 26) + 65) + letter;
			index = Math.floor(index / 26) - 1;
		}
		return letter;
	},
	
	/**
	 * Re-apply events for resizing that are attached to specific elements
	 */
	rebindResizeHandlers: function () {
		const event = new Event('sheetRendered');
		document.dispatchEvent(event);
	},
	
	/**
	 * Render the tabs at the bottom
	 */
	renderTabs: function () {
		const container = document.getElementById('sheet-tabs-container');
		// Remove existing tabs (keep the add button)
		container.querySelectorAll('.sheet-tab').forEach(el => el.remove());
		
		const self = this;
		const addBtn = container.querySelector('.add-sheet-btn');
		
		this.data.sheets.forEach(function (sheet, index) {
			const tab = document.createElement('div');
			tab.className = 'sheet-tab';
			tab.textContent = sheet.name;
			
			if (index === self.data.activeSheetIndex) {
				tab.classList.add('active');
			}
			
			tab.addEventListener('click', function () {
				self.selectSheet(index);
			});
			
			// Insert before the add button
			container.insertBefore(tab, addBtn);
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
		const saved = localStorage.getItem('cascadePromptData');
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
