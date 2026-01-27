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
	isModified: false,
	
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
			this.updateStatusUI();
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
			this.setModified(true);
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
	 * Optimized: Uses direct row/cell iteration instead of querySelectorAll
	 */
	updateCurrentSheetData: function () {
		const activeIndex = this.data.activeSheetIndex;
		if (this.data.sheets[activeIndex]) {
			this.data.sheets[activeIndex] = this.collectDOMData(this.data.sheets[activeIndex]);
		}
	},
	
	/**
	 * Helper to scrape DOM
	 * Optimized for performance
	 */
	collectDOMData: function (sheetObj) {
		const cells = {};
		const colWidths = {};
		const rowHeights = {};
		
		const table = document.querySelector('.spreadsheet');
		const tbody = table.querySelector('tbody');
		const rows = tbody.rows; // Live collection, faster than querySelectorAll
		
		// 1. Collect Row Heights and Cell Data
		for (let r = 0; r < rows.length; r++) {
			const row = rows[r];
			const rowHeader = row.cells[0]; // The th.counter-cell
			
			// Capture Row Height
			if (rowHeader) {
				const h = rowHeader.offsetHeight;
				// Only save if different from default to save memory
				if (Math.abs(h - this.defaults.defaultRowHeight) > 1) {
					rowHeights[r] = h;
				}
			}
			
			// Iterate Cells (skip index 0 which is the header)
			for (let c = 1; c < row.cells.length; c++) {
				const cell = row.cells[c];
				// data-col might differ from index if we had hidden cols, but here we trust data-col
				const colIndex = parseInt(cell.getAttribute('data-col'));
				
				const contentDiv = cell.querySelector('.content-cut');
				if (!contentDiv) continue;
				
				const html = contentDiv.innerHTML;
				const text = contentDiv.textContent;
				const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
				const colspan = parseInt(cell.getAttribute('colspan')) || 1;
				
				// Capture Styles
				const style = {};
				if (contentDiv.style.cssText) {
					style.cssText = contentDiv.style.cssText;
				}
				
				// Capture Cell Background and Borders
				const cellStyle = {};
				// Check inline styles only
				if (cell.style.backgroundColor) cellStyle.backgroundColor = cell.style.backgroundColor;
				if (cell.style.border) cellStyle.border = cell.style.border;
				if (cell.style.borderLeft) cellStyle.borderLeft = cell.style.borderLeft;
				if (cell.style.borderRight) cellStyle.borderRight = cell.style.borderRight;
				if (cell.style.borderTop) cellStyle.borderTop = cell.style.borderTop;
				if (cell.style.borderBottom) cellStyle.borderBottom = cell.style.borderBottom;
				
				const hasContent = (text.trim() !== '') || (html !== '' && html !== '<br>');
				const hasStyle = Object.keys(style).length > 0 || Object.keys(cellStyle).length > 0;
				
				if (hasContent || rowspan > 1 || colspan > 1 || hasStyle) {
					cells[r + '-' + colIndex] = {
						html: html,
						text: text,
						rowspan: rowspan,
						colspan: colspan,
						style: style,
						cellStyle: cellStyle
					};
				}
			}
		}
		
		// 2. Collect Column Widths
		const headerCells = table.querySelectorAll('thead th.letter-cell');
		headerCells.forEach(cell => {
			const index = parseInt(cell.getAttribute('data-col'));
			const w = cell.offsetWidth;
			// Only save if different from default
			if (Math.abs(w - this.defaults.defaultColWidth) > 1) {
				colWidths[index] = w;
			}
		});
		
		sheetObj.rowCount = rows.length;
		sheetObj.colCount = headerCells.length;
		
		sheetObj.cells = cells;
		sheetObj.colWidths = colWidths;
		sheetObj.rowHeights = rowHeights;
		
		// --- Capture Selection State ---
		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const row = selectedCell.parentElement;
			const rowIndex = row.rowIndex - 1; // Adjust for thead
			const colIndex = parseInt(selectedCell.getAttribute('data-col'));
			
			sheetObj.selection = {
				active: { r: rowIndex, c: colIndex },
				range: null
			};
			
			// Check if there is a range selection
			if (window.startCell && window.endCell && window.startCell !== window.endCell) {
				const startRow = window.startCell.parentElement;
				const endRow = window.endCell.parentElement;
				const startRIndex = startRow.rowIndex - 1;
				const endRIndex = endRow.rowIndex - 1;
				
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
	 * Optimized: Uses HTML String Concatenation instead of individual DOM insertions.
	 */
	renderSheet: function (index) {
		//console log start time
		let startTime = performance.now();
		const sheet = this.data.sheets[index];
		if (!sheet) return;
		
		if (typeof stopEditing === 'function') stopEditing();
		
		// Clear existing selection state in DOM
		// Use getElementsByClassName for speed over querySelectorAll
		const selected = document.getElementsByClassName('selected-cell');
		while (selected.length > 0) selected[0].classList.remove('selected-cell');
		
		const highlighted = document.getElementsByClassName('highlight');
		while (highlighted.length > 0) highlighted[0].classList.remove('highlight');
		
		const areaSelected = document.getElementsByClassName('area-selected-cell');
		while (areaSelected.length > 0) areaSelected[0].classList.remove('area-selected-cell');
		
		// Reset global selection variables
		window.startCell = null;
		window.endCell = null;
		if (typeof updateSelection === 'function') updateSelection();
		
		const formulaInput = document.getElementById('formula-input');
		formulaInput.textContent = '';
		formulaInput.setAttribute('contenteditable', 'false');
		
		const table = document.querySelector('.spreadsheet');
		const thead = table.querySelector('thead');
		const tbody = table.querySelector('tbody');
		
		// --- Rebuild Header (String Building) ---
		let headerHTML = '<th class="top-corner-cell"></th>';
		let tableWidth = 0;
		
		for (let c = 0; c < sheet.colCount; c++) {
			const letter = this.getColumnLetter(c);
			const width = sheet.colWidths[c] || this.defaults.defaultColWidth;
			headerHTML += `<th class="letter-cell" data-col="${c}" style="width: ${width}px;">${letter}</th>`;
			tableWidth += width;
		}
		
		// Batch update header
		thead.rows[0].innerHTML = headerHTML;
		table.style.width = (tableWidth + 50) + 'px';
		
		// --- Rebuild Body (String Building - Massive Perf Boost) ---
		let bodyHTML = '';
		
		for (let r = 0; r < sheet.rowCount; r++) {
			const height = sheet.rowHeights[r] || this.defaults.defaultRowHeight;
			bodyHTML += '<tr>';
			
			// Row Header
			bodyHTML += `<th class="counter-cell" style="height: ${height}px;">${r + 1}</th>`;
			
			for (let c = 0; c < sheet.colCount; c++) {
				// Check merge visibility
				if (this.isCellHiddenByMerge(sheet, r, c)) {
					continue;
				}
				
				const cellKey = r + '-' + c;
				const cellData = sheet.cells[cellKey];
				let cellHTML = '';
				let tdAttrs = `class="text-cell" data-col="${c}"`;
				let tdStyle = '';
				
				let cellWidth = sheet.colWidths[c] || this.defaults.defaultColWidth;
				let cellHeight = height;
				
				if (cellData) {
					// Styles
					if (cellData.cellStyle) {
						for (const [prop, val] of Object.entries(cellData.cellStyle)) {
							// Convert camelCase to kebab-case for inline style string
							const cssProp = prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
							tdStyle += `${cssProp}:${val};`;
						}
					}
					
					// Spans
					if (cellData.rowspan > 1) tdAttrs += ` rowspan="${cellData.rowspan}"`;
					if (cellData.colspan > 1) tdAttrs += ` colspan="${cellData.colspan}"`;
					
					// Calculate Dimensions for Merged Cells
					if (cellData.colspan > 1) {
						cellWidth = 0;
						for (let k = 0; k < cellData.colspan; k++) {
							cellWidth += (sheet.colWidths[c + k] || this.defaults.defaultColWidth);
						}
					}
					
					if (cellData.rowspan > 1) {
						cellHeight = 0;
						for (let k = 0; k < cellData.rowspan; k++) {
							cellHeight += (sheet.rowHeights[r + k] || this.defaults.defaultRowHeight);
						}
					}
					
					// Content Div
					let contentStyle = `width:${cellWidth - 3}px; height:${cellHeight - 3}px;`;
					if (cellData.style && cellData.style.cssText) {
						contentStyle += cellData.style.cssText;
					}
					
					const content = cellData.html || cellData.text || '';
					cellHTML = `<div class="content-cut" style="${contentStyle}">${content}</div>`;
					
				} else {
					// Empty Cell
					cellHTML = `<div class="content-cut" style="width:${cellWidth - 3}px; height:${height - 3}px;"></div>`;
				}
				
				bodyHTML += `<td ${tdAttrs} style="${tdStyle}">${cellHTML}</td>`;
			}
			bodyHTML += '</tr>';
		}
		
		// Batch update body
		tbody.innerHTML = bodyHTML;
		
		// Defer handlers and selection restoration to next frame to allow paint
		requestAnimationFrame(() => {
			this.rebindResizeHandlers();
			this.restoreSelection(sheet, tbody);
		});
		console.log('Sheet rendered in ' + (performance.now() - startTime).toFixed(2) + ' ms');
	},
	
	/**
	 * Helper to restore selection after render
	 */
	restoreSelection: function (sheet, tbody) {
		if (sheet.selection && sheet.selection.active) {
			const activeR = sheet.selection.active.r;
			const activeC = sheet.selection.active.c;
			
			const targetRow = tbody.children[activeR];
			if (targetRow) {
				const targetCell = targetRow.querySelector(`td[data-col="${activeC}"]`);
				if (targetCell) {
					if (typeof highlightCell === 'function') {
						highlightCell(targetCell);
					}
					
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
		// Optimization: Checking every cell in the sheet object is slow.
		// Ideally, we should have a map of merged ranges.
		// For now, we stick to the logic but ensure we exit fast.
		for (const key in sheet.cells) {
			const data = sheet.cells[key];
			if ((data.rowspan || 1) === 1 && (data.colspan || 1) === 1) continue;
			
			const parts = key.split('-');
			const r = parseInt(parts[0]);
			const c = parseInt(parts[1]);
			
			const endR = r + (data.rowspan || 1) - 1;
			const endC = c + (data.colspan || 1) - 1;
			
			if (row >= r && row <= endR && col >= c && col <= endC) {
				if (row === r && col === c) return false;
				return true;
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
		// Remove existing tabs only
		const existingTabs = container.querySelectorAll('.sheet-tab');
		existingTabs.forEach(el => el.remove());
		
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
	
	/**
	 * Move a range of cells to a new location
	 */
	moveRange: function (range, targetR, targetC) {
		const sheet = this.data.sheets[this.data.activeSheetIndex];
		if (!sheet) return;
		
		const rowOffset = targetR - range.startR;
		const colOffset = targetC - range.startC;
		
		if (rowOffset === 0 && colOffset === 0) return;
		
		if (typeof HistoryManager !== 'undefined') {
			HistoryManager.addState();
		}
		
		const movingCells = [];
		
		for (let r = range.startR; r <= range.endR; r++) {
			for (let c = range.startC; c <= range.endC; c++) {
				const key = r + '-' + c;
				if (sheet.cells[key]) {
					const cellData = sheet.cells[key];
					movingCells.push({
						oldR: r,
						oldC: c,
						data: JSON.parse(JSON.stringify(cellData))
					});
				}
			}
		}
		
		movingCells.forEach(item => {
			delete sheet.cells[item.oldR + '-' + item.oldC];
		});
		
		movingCells.forEach(item => {
			const newR = item.oldR + rowOffset;
			const newC = item.oldC + colOffset;
			if (newR >= 0 && newC >= 0) {
				sheet.cells[newR + '-' + newC] = item.data;
			}
		});
		
		this.renderSheet(this.data.activeSheetIndex);
		this.setModified(true);
		
		// Update selection after render
		setTimeout(() => {
			const table = document.querySelector('.spreadsheet tbody');
			const newStartR = range.startR + rowOffset;
			const newStartC = range.startC + colOffset;
			const newEndR = range.endR + rowOffset;
			const newEndC = range.endC + colOffset;
			
			const startRow = table.children[newStartR];
			const endRow = table.children[newEndR];
			
			if (startRow && endRow) {
				const newStartCell = startRow.querySelector(`td[data-col="${newStartC}"]`);
				const newEndCell = endRow.querySelector(`td[data-col="${newEndC}"]`);
				
				if (newStartCell && newEndCell) {
					window.startCell = newStartCell;
					window.endCell = newEndCell;
					window.isSelecting = false;
					
					if (typeof updateSelection === 'function') {
						updateSelection();
					}
					if (typeof highlightCell === 'function') {
						highlightCell(newStartCell);
					}
				}
			}
		}, 0);
	},
	
	// -----------------------------------------------------------------------
	// Backend Interaction Methods
	// -----------------------------------------------------------------------
	
	saveProject: function (filename) {
		this.updateCurrentSheetData();
		
		if (!filename) {
			showCustomAlert('Filename is required.');
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
					this.setModified(false);
					showToast('Project saved successfully');
				} else {
					showCustomAlert('Error saving project: ' + data.message);
				}
			})
			.catch(error => {
				console.error('Error:', error);
				showCustomAlert('An error occurred while saving.');
			});
	},
	
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
					this.setModified(false);
				} else {
					console.warn('Could not load project:', data.message);
					if (isInitialLoad) {
						this.createSheet(this.defaults.sheetNamePrefix + '1', true);
						this.updateStatusUI();
					} else {
						showCustomAlert('Error loading project: ' + data.message);
					}
				}
			})
			.catch(error => {
				console.error('Error:', error);
				if (!isInitialLoad) showCustomAlert('An error occurred while loading.');
			});
	},
	
	listProjects: function (callback) {
		fetch('api/list_projects.php')
			.then(response => response.json())
			.then(data => {
				if (data.success && callback) {
					callback(data.files);
				}
			});
	},
	
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
					showCustomAlert('Error deleting file: ' + data.message);
				}
			});
	},
	
	newProject: function () {
		if (confirm('Create new project? Unsaved changes will be lost.')) {
			this.data = {
				activeSheetIndex: 0,
				sheets: []
			};
			this.currentFileName = null;
			localStorage.removeItem('lastOpenedFile');
			document.title = 'Cascade Prompt';
			
			const table = document.querySelector('.spreadsheet tbody');
			table.innerHTML = '';
			
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
			this.setModified(false);
		}
	},
	
	updateStatusUI: function () {
		const fileEl = document.getElementById('status-file');
		const modEl = document.getElementById('status-modified');
		
		if (fileEl) {
			fileEl.textContent = this.currentFileName || 'Untitled';
		}
		
		if (modEl) {
			modEl.style.display = this.isModified ? 'inline' : 'none';
		}
	},
	
	setModified: function (isModified) {
		this.isModified = isModified;
		this.updateStatusUI();
	}
};
