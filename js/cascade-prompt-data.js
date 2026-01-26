/**
 * Cascade Prompt Data Manager
 * Handles data structure, persistence (PHP Backend), and DOM rendering.
 */

var SheetDataManager = {
	data: {
		activeSheetIndex: 0,
		sheets: []
	},
	
	currentFileName: null, // Tracks the currently open file
	
	// Default configuration
	defaults: {
		rows: 100,
		cols: 26,
		sheetNamePrefix: 'Sheet',
		defaultRowHeight: 25,
		defaultColWidth: 200
	},
	
	/**
	 * Initialize the data manager
	 */
	init: function () {
		this.measureDefaults();
		
		// Check LocalStorage for the last opened file
		const lastFile = localStorage.getItem('lastOpenedFile');
		
		if (lastFile) {
			console.log('Attempting to load last opened file: ' + lastFile);
			this.loadProject(lastFile, true); // true = isInitialLoad
		} else {
			// If no last file, initialize empty sheet based on DOM
			this.createSheet(this.defaults.sheetNamePrefix + '1', true);
			this.renderTabs();
		}
	},
	
	/**
	 * Measure the dimensions of the currently rendered table to set defaults
	 */
	measureDefaults: function () {
		const sampleRowHeader = document.querySelector('.spreadsheet tbody tr:first-child th.counter-cell');
		if (sampleRowHeader) {
			this.defaults.defaultRowHeight = sampleRowHeader.offsetHeight;
		}
		
		const sampleColHeader = document.querySelector('.spreadsheet thead th.letter-cell');
		if (sampleColHeader) {
			this.defaults.defaultColWidth = sampleColHeader.offsetWidth;
		}
	},
	
	/**
	 * Create a new sheet
	 */
	createSheet: function (name, isInitial) {
		let newSheet = {
			name: name,
			rowCount: this.defaults.rows,
			colCount: this.defaults.cols,
			cells: {},
			colWidths: {},
			rowHeights: {},
			// Initialize default selection state
			selection: {
				active: { r: 0, c: 0 }, // Default to A1
				range: null
			}
		};
		
		if (isInitial) {
			newSheet = this.collectDOMData(newSheet);
		}
		
		this.data.sheets.push(newSheet);
		
		if (!isInitial) {
			this.selectSheet(this.data.sheets.length - 1);
		} else {
			this.renderTabs();
			// We don't auto-save to server on init, only on explicit save
		}
	},
	
	/**
	 * Switch to a specific sheet
	 */
	selectSheet: function (index) {
		if (index < 0 || index >= this.data.sheets.length) return;
		if (index === this.data.activeSheetIndex) return;
		
		this.updateCurrentSheetData();
		this.data.activeSheetIndex = index;
		this.renderSheet(index);
		this.renderTabs();
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
	 */
	collectDOMData: function (sheetObj) {
		const cells = {};
		const colWidths = {};
		const rowHeights = {};
		
		const textCells = document.querySelectorAll('.spreadsheet .text-cell');
		textCells.forEach(cell => {
			const contentDiv = cell.querySelector('.content-cut');
			const text = contentDiv ? contentDiv.textContent : '';
			const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
			const colspan = parseInt(cell.getAttribute('colspan')) || 1;
			
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
		
		document.querySelectorAll('.letter-cell').forEach(cell => {
			const index = parseInt(cell.getAttribute('data-col'));
			colWidths[index] = cell.offsetWidth;
		});
		
		document.querySelectorAll('.counter-cell').forEach(cell => {
			const row = cell.parentElement;
			const tbody = row.parentElement;
			const index = Array.from(tbody.children).indexOf(row);
			rowHeights[index] = cell.offsetHeight;
		});
		
		sheetObj.rowCount = document.querySelectorAll('.spreadsheet tbody tr').length;
		sheetObj.colCount = document.querySelectorAll('.spreadsheet thead th.letter-cell').length;
		
		sheetObj.cells = cells;
		sheetObj.colWidths = colWidths;
		sheetObj.rowHeights = rowHeights;
		
		// --- Capture Selection State ---
		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const row = selectedCell.parentElement;
			const tbody = row.parentElement;
			const rowIndex = Array.from(tbody.children).indexOf(row);
			const colIndex = parseInt(selectedCell.getAttribute('data-col'));
			
			sheetObj.selection = {
				active: { r: rowIndex, c: colIndex },
				range: null
			};
			
			// Check if there is a range selection (using globals from cascade-prompt.js)
			if (window.startCell && window.endCell && window.startCell !== window.endCell) {
				const startRow = window.startCell.parentElement;
				const endRow = window.endCell.parentElement;
				const startRIndex = Array.from(tbody.children).indexOf(startRow);
				const endRIndex = Array.from(tbody.children).indexOf(endRow);
				
				sheetObj.selection.range = {
					startR: startRIndex,
					startC: parseInt(window.startCell.getAttribute('data-col')),
					endR: endRIndex,
					endC: parseInt(window.endCell.getAttribute('data-col'))
				};
			}
		} else {
			sheetObj.selection = null;
		}
		
		return sheetObj;
	},
	
	/**
	 * Render a sheet to the DOM
	 */
	renderSheet: function (index) {
		const sheet = this.data.sheets[index];
		if (!sheet) return;
		
		if (typeof stopEditing === 'function') stopEditing();
		
		// Clear existing selection state in DOM
		document.querySelectorAll('.selected-cell').forEach(el => el.classList.remove('selected-cell'));
		document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
		document.querySelectorAll('.area-selected-cell').forEach(el => el.classList.remove('area-selected-cell'));
		
		// Reset global selection variables
		window.startCell = null;
		window.endCell = null;
		if (typeof updateSelection === 'function') updateSelection();
		
		const formulaInput = document.getElementById('formula-input');
		formulaInput.value = '';
		formulaInput.disabled = true;
		
		const table = document.querySelector('.spreadsheet');
		const thead = table.querySelector('thead');
		const tbody = table.querySelector('tbody');
		
		// --- Rebuild Header ---
		const headerRow = thead.querySelector('tr');
		headerRow.innerHTML = '';
		headerRow.insertAdjacentHTML('beforeend', '<th class="top-corner-cell"></th>');
		
		let tableWidth = 0;
		
		for (let c = 0; c < sheet.colCount; c++) {
			const letter = this.getColumnLetter(c);
			const width = sheet.colWidths[c] || this.defaults.defaultColWidth;
			
			const th = document.createElement('th');
			th.className = 'letter-cell';
			th.setAttribute('data-col', c);
			th.textContent = letter;
			th.style.width = width + 'px';
			
			headerRow.appendChild(th);
			tableWidth += width;
		}
		
		table.style.width = (tableWidth + 50) + 'px';
		
		// --- Rebuild Body ---
		tbody.innerHTML = '';
		
		for (let r = 0; r < sheet.rowCount; r++) {
			const height = sheet.rowHeights[r] || this.defaults.defaultRowHeight;
			const tr = document.createElement('tr');
			
			const rowHeader = document.createElement('th');
			rowHeader.className = 'counter-cell';
			rowHeader.textContent = (r + 1);
			rowHeader.style.height = height + 'px';
			tr.appendChild(rowHeader);
			
			for (let c = 0; c < sheet.colCount; c++) {
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
				
				let cellWidth = sheet.colWidths[c] || this.defaults.defaultColWidth;
				
				if (cellData) {
					content.textContent = cellData.text || '';
					
					if (cellData.rowspan > 1) td.setAttribute('rowspan', cellData.rowspan);
					if (cellData.colspan > 1) td.setAttribute('colspan', cellData.colspan);
					
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
					
					// FIX: Subtract 3px to account for borders/padding, preventing 1px growth bug.
					// Matches logic in cascade-prompt-ui.js resize handlers.
					content.style.height = (cellHeight - 3) + 'px';
				} else {
					// FIX: Subtract 3px here as well for empty cells.
					content.style.height = (height - 3) + 'px';
				}
				
				content.style.width = (cellWidth - 3) + 'px'; // Subtract 3px for width consistency too
				td.appendChild(content);
				tr.appendChild(td);
			}
			tbody.appendChild(tr);
		}
		
		this.rebindResizeHandlers();
		
		// --- Restore Selection ---
		if (sheet.selection && sheet.selection.active) {
			const activeR = sheet.selection.active.r;
			const activeC = sheet.selection.active.c;
			
			// Find the row (tbody children are 0-indexed)
			const targetRow = tbody.children[activeR];
			if (targetRow) {
				const targetCell = targetRow.querySelector(`td[data-col="${activeC}"]`);
				if (targetCell) {
					// Restore active cell highlight
					if (typeof highlightCell === 'function') {
						highlightCell(targetCell);
					}
					
					// Restore Range Selection if it exists
					if (sheet.selection.range) {
						const sR = sheet.selection.range.startR;
						const sC = sheet.selection.range.startC;
						const eR = sheet.selection.range.endR;
						const eC = sheet.selection.range.endC;
						
						const startRow = tbody.children[sR];
						const endRow = tbody.children[eR];
						
						if (startRow && endRow) {
							const domStartCell = startRow.querySelector(`td[data-col="${sC}"]`);
							const domEndCell = endRow.querySelector(`td[data-col="${eC}"]`);
							
							if (domStartCell && domEndCell) {
								// Update global variables used by cascade-prompt.js
								window.startCell = domStartCell;
								window.endCell = domEndCell;
								window.isSelecting = false;
								
								if (typeof updateSelection === 'function') {
									updateSelection();
								}
							}
						}
					}
				}
			}
		}
	},
	
	isCellHiddenByMerge: function (sheet, row, col) {
		for (const key in sheet.cells) {
			const parts = key.split('-');
			const r = parseInt(parts[0]);
			const c = parseInt(parts[1]);
			const data = sheet.cells[key];
			
			if (data.rowspan > 1 || data.colspan > 1) {
				const endR = r + (data.rowspan || 1) - 1;
				const endC = c + (data.colspan || 1) - 1;
				
				if (row >= r && row <= endR && col >= c && col <= endC) {
					if (row === r && col === c) return false;
					return true;
				}
			}
		}
		return false;
	},
	
	getColumnLetter: function (index) {
		let letter = '';
		while (index >= 0) {
			letter = String.fromCharCode((index % 26) + 65) + letter;
			index = Math.floor(index / 26) - 1;
		}
		return letter;
	},
	
	rebindResizeHandlers: function () {
		const event = new Event('sheetRendered');
		document.dispatchEvent(event);
	},
	
	renderTabs: function () {
		const container = document.getElementById('sheet-tabs-container');
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
			
			container.insertBefore(tab, addBtn);
		});
	},
	
	// -----------------------------------------------------------------------
	// Backend Interaction Methods
	// -----------------------------------------------------------------------
	
	/**
	 * Save current project to PHP backend
	 */
	saveProject: function (filename) {
		this.updateCurrentSheetData();
		
		if (!filename) {
			alert('Filename is required.');
			return;
		}
		
		fetch('api/save_project.php', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				filename: filename,
				data: this.data
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					this.currentFileName = filename;
					localStorage.setItem('lastOpenedFile', filename);
					document.title = filename + ' - Cascade Prompt';
					alert('Project saved successfully!');
					// Refresh list if modal is open (optional)
				} else {
					alert('Error saving project: ' + data.message);
				}
			})
			.catch(error => {
				console.error('Error:', error);
				alert('An error occurred while saving.');
			});
	},
	
	/**
	 * Load project from PHP backend
	 */
	loadProject: function (filename, isInitialLoad) {
		fetch('api/load_project.php?filename=' + encodeURIComponent(filename))
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					this.data = data.data;
					this.currentFileName = filename;
					localStorage.setItem('lastOpenedFile', filename);
					document.title = filename + ' - Cascade Prompt';
					
					this.renderSheet(this.data.activeSheetIndex || 0);
					this.renderTabs();
				} else {
					console.warn('Could not load project:', data.message);
					if (isInitialLoad) {
						// Fallback to empty sheet if last opened file is missing
						this.createSheet(this.defaults.sheetNamePrefix + '1', true);
					} else {
						alert('Error loading project: ' + data.message);
					}
				}
			})
			.catch(error => {
				console.error('Error:', error);
				if (!isInitialLoad) alert('An error occurred while loading.');
			});
	},
	
	/**
	 * List projects for the modal
	 */
	listProjects: function (callback) {
		fetch('api/list_projects.php')
			.then(response => response.json())
			.then(data => {
				if (data.success && callback) {
					callback(data.files);
				}
			});
	},
	
	/**
	 * Delete a project
	 */
	deleteProject: function (filename, callback) {
		if (!confirm('Are you sure you want to delete "' + filename + '"?')) return;
		
		fetch('api/delete_project.php', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ filename: filename })
		})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					if (callback) callback();
				} else {
					alert('Error deleting file: ' + data.message);
				}
			});
	},
	
	/**
	 * Reset to a blank state (New Project)
	 */
	newProject: function () {
		if (confirm('Create new project? Unsaved changes will be lost.')) {
			this.data = {
				activeSheetIndex: 0,
				sheets: []
			};
			this.currentFileName = null;
			localStorage.removeItem('lastOpenedFile');
			document.title = 'Cascade Prompt';
			
			// Reset UI
			const table = document.querySelector('.spreadsheet tbody');
			table.innerHTML = ''; // Clear current
			
			// Create default sheet
			this.data.sheets.push({
				name: 'Sheet1',
				rowCount: this.defaults.rows,
				colCount: this.defaults.cols,
				cells: {},
				colWidths: {},
				rowHeights: {},
				selection: { active: { r: 0, c: 0 }, range: null }
			});
			this.renderSheet(0);
			this.renderTabs();
		}
	}
};
