import { getApiEndpoint } from './api-config.js';

export const SheetDataManager = {
	data: {
		activeSheetIndex: 0,
		sheets: [],
		llmSettings: {
			apiKey: '',
			falAiKey: ''
		}
	},
	
	currentFileName: null,
	isModified: false,
	
	defaults: {
		rows: 100,
		cols: 26,
		sheetNamePrefix: 'Sheet',
		defaultRowHeight: 25,
		defaultColWidth: 100 // Adjusted default
	},
	
	init: function () {
		this.measureDefaults();
		const lastFile = localStorage.getItem('lastOpenedFile');
		if (lastFile) {
			console.log('Attempting to load last opened file: ' + lastFile);
			this.loadProject(lastFile, true);
		} else {
			this.createSheet(this.defaults.sheetNamePrefix + '1', true);
			this.renderTabs();
			this.updateStatusUI();
		}
	},
	
	measureDefaults: function () {
		const sampleRowHeader = document.querySelector('.spreadsheet tbody tr:first-child th.counter-cell');
		if (sampleRowHeader) {
			const h = sampleRowHeader.offsetHeight;
			// FIX: If measurement is too small (collapsed), use hardcoded default
			this.defaults.defaultRowHeight = (h > 10) ? h : 25;
		} else {
			this.defaults.defaultRowHeight = 25;
		}
		
		const sampleColHeader = document.querySelector('.spreadsheet thead th.letter-cell');
		if (sampleColHeader) {
			const w = sampleColHeader.offsetWidth;
			// FIX: If measurement is too small, use hardcoded default
			this.defaults.defaultColWidth = (w > 20) ? w : 100;
		} else {
			this.defaults.defaultColWidth = 100;
		}
		
		console.log(`Defaults measured: RowHeight=${this.defaults.defaultRowHeight}, ColWidth=${this.defaults.defaultColWidth}`);
	},
	
	createSheet: function (name, isInitial) {
		let finalName = name;
		if (!isInitial) {
			finalName = this.generateUniqueSheetName(name);
		}
		
		let newSheet = {
			name: finalName,
			rowCount: this.defaults.rows,
			colCount: this.defaults.cols,
			cells: {},
			colWidths: {},
			rowHeights: {},
			selection: {
				active: { r: 0, c: 0 },
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
		}
	},
	
	generateUniqueSheetName: function (baseName) {
		let name = baseName;
		let counter = 1;
		if (baseName === this.defaults.sheetNamePrefix) {
			name = baseName + counter;
		}
		while (this.data.sheets.some(s => s.name === name)) {
			counter++;
			if (baseName.startsWith(this.defaults.sheetNamePrefix)) {
				name = this.defaults.sheetNamePrefix + counter;
			} else {
				name = baseName + '_' + counter;
			}
		}
		return name;
	},
	
	updateSheetProperties: function (index, newName, newRows, newCols) {
		if (index < 0 || index >= this.data.sheets.length) return;
		
		const sheet = this.data.sheets[index];
		sheet.name = newName;
		sheet.rowCount = parseInt(newRows);
		sheet.colCount = parseInt(newCols);
		
		if (index === this.data.activeSheetIndex) {
			this.renderSheet(index);
			this.renderTabs();
		} else {
			this.renderTabs();
		}
		
		this.setModified(true);
	},
	
	selectSheet: function (index) {
		if (index < 0 || index >= this.data.sheets.length) return;
		if (index === this.data.activeSheetIndex) return;
		
		this.updateCurrentSheetData();
		this.data.activeSheetIndex = index;
		this.renderSheet(index);
		this.renderTabs();
	},
	
	updateCurrentSheetData: function () {
		const activeIndex = this.data.activeSheetIndex;
		if (this.data.sheets[activeIndex]) {
			this.data.sheets[activeIndex] = this.collectDOMData(this.data.sheets[activeIndex]);
		}
	},

	collectDOMData: function (sheetObj) {
		const cells = {};
		const colWidths = {};
		const rowHeights = {};

		const table = document.querySelector('.spreadsheet');
		const tbody = table.querySelector('tbody');
		const rows = tbody.rows;

		for (let r = 0; r < rows.length; r++) {
			const row = rows[r];
			const rowHeader = row.cells[0];

			// Collect Row Heights
			if (rowHeader) {
				const h = rowHeader.offsetHeight;
				if (Math.abs(h - this.defaults.defaultRowHeight) > 1) {
					rowHeights[r] = h;
				}
			}

			for (let c = 1; c < row.cells.length; c++) {
				const cell = row.cells[c];
				const colIndex = parseInt(cell.getAttribute('data-col'));
				const contentDiv = cell.querySelector('.content-cut');
				if (!contentDiv) continue;

				const cellKey = r + '-' + colIndex;
				const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
				const colspan = parseInt(cell.getAttribute('colspan')) || 1;

				// --- NEW TYPE LOGIC START ---
				let typeObj = {
					name: 'text',
					details: {}
				};

				const dropdownFormula = contentDiv.getAttribute('data-formula');

				// 1. Check if it's an LLM Formula
				// We look at the existing data object to see if this cell was previously an LLM cell
				if (sheetObj.cells[cellKey] && (sheetObj.cells[cellKey].llm || sheetObj.cells[cellKey].type?.name === 'llm_formula')) {
					const llmConfig = sheetObj.cells[cellKey].llm || sheetObj.cells[cellKey].type.details;
					typeObj.name = 'llm_formula';
					typeObj.details = {
						...llmConfig,
						component: 'button' // Ensure component is set as requested
					};
				}
				// 2. Check if it's a Dropdown
				else if (dropdownFormula && dropdownFormula.toLowerCase().startsWith('=dropdown')) {
					const regex = /^=dropdown\s*\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?\s*\)$/i;
					const match = dropdownFormula.match(regex);
					typeObj.name = 'dropdown';
					typeObj.details = {
						options: match ? match[1].split(',').map(s => s.trim()) : [],
						selected: match ? (match[2] || '') : contentDiv.innerText.trim()
					};
				}
				// 3. Default to Text
				else {
					typeObj.name = 'text';
					typeObj.details = {
						value: contentDiv.innerText.trim()
					};
				}
				// --- NEW TYPE LOGIC END ---

				// Collect Inline Styles (on the content or button)
				const style = {};
				const allowedStyles = ['color', 'backgroundColor', 'fontWeight', 'fontStyle', 'fontSize', 'textAlign'];
				let cleanCssText = '';
				const llmBtn = contentDiv.querySelector('.llm-run-btn');
				const styleSource = llmBtn || contentDiv;

				allowedStyles.forEach(prop => {
					if (styleSource.style[prop]) {
						const kebabProp = prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
						cleanCssText += `${kebabProp}:${styleSource.style[prop]};`;
					}
				});

				if (cleanCssText.length > 0) {
					style.cssText = cleanCssText;
				}

				// Collect Cell (TD) Styles
				const cellStyle = {};
				if (cell.style.backgroundColor) cellStyle.backgroundColor = cell.style.backgroundColor;
				const borderProps = ['border', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'];
				borderProps.forEach(prop => {
					if (cell.style[prop]) cellStyle[prop] = cell.style[prop];
				});

				// Determine if cell is "empty" (to keep JSON sparse)
				const hasValue = (typeObj.name === 'text' && typeObj.details.value !== '') ||
					typeObj.name === 'dropdown' ||
					typeObj.name === 'llm_formula';
				const hasStyle = Object.keys(style).length > 0 || Object.keys(cellStyle).length > 0;
				const isMerged = rowspan > 1 || colspan > 1;

				if (hasValue || hasStyle || isMerged) {
					cells[cellKey] = {
						type: typeObj,
						rowspan: rowspan,
						colspan: colspan,
						style: style,
						cellStyle: cellStyle
					};
				}
			}
		}

		// Collect Column Widths
		const headerCells = table.querySelectorAll('thead th.letter-cell');
		headerCells.forEach(cell => {
			const index = parseInt(cell.getAttribute('data-col'));
			const w = cell.offsetWidth;
			if (Math.abs(w - this.defaults.defaultColWidth) > 1) {
				colWidths[index] = w;
			}
		});

		sheetObj.rowCount = rows.length;
		sheetObj.colCount = headerCells.length;
		sheetObj.cells = cells;
		sheetObj.colWidths = colWidths;
		sheetObj.rowHeights = rowHeights;

		// Preserve Selection State
		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const row = selectedCell.parentElement;
			const rowIndex = row.rowIndex - 1;
			const colIndex = parseInt(selectedCell.getAttribute('data-col'));

			sheetObj.selection = {
				active: { r: rowIndex, c: colIndex },
				range: null
			};

			if (window.startCell && window.endCell && window.startCell !== window.endCell) {
				const startRow = window.startCell.parentElement;
				const endRow = window.endCell.parentElement;
				sheetObj.selection.range = {
					startR: startRow.rowIndex - 1,
					startC: parseInt(window.startCell.getAttribute('data-col')),
					endR: endRow.rowIndex - 1,
					endC: parseInt(window.endCell.getAttribute('data-col'))
				};
			}
		} else {
			sheetObj.selection = null;
		}

		return sheetObj;
	},

	renderSheet: function (index) {
		const startTime = performance.now();
		const sheet = this.data.sheets[index];
		if (!sheet) return;

		// 1. Cleanup UI State
		if (typeof window.stopEditing === 'function') window.stopEditing();

		const selected = document.getElementsByClassName('selected-cell');
		while (selected.length > 0) selected[0].classList.remove('selected-cell');

		const highlighted = document.getElementsByClassName('highlight');
		while (highlighted.length > 0) highlighted[0].classList.remove('highlight');

		const areaSelected = document.getElementsByClassName('area-selected-cell');
		while (areaSelected.length > 0) areaSelected[0].classList.remove('area-selected-cell');

		window.startCell = null;
		window.endCell = null;
		if (typeof window.updateSelection === 'function') window.updateSelection();

		const formulaInput = document.getElementById('formula-input');
		formulaInput.textContent = '';
		formulaInput.setAttribute('contenteditable', 'false');

		const table = document.querySelector('.spreadsheet');
		const thead = table.querySelector('thead');
		const tbody = table.querySelector('tbody');

		// 2. Render Headers
		let headerHTML = '<th class="top-corner-cell"></th>';
		let tableWidth = 0;

		for (let c = 0; c < sheet.colCount; c++) {
			const letter = this.getColumnLetter(c);
			const width = sheet.colWidths[c] || this.defaults.defaultColWidth;
			headerHTML += `<th class="letter-cell" data-col="${c}" style="width: ${width}px;">${letter}</th>`;
			tableWidth += width;
		}

		thead.rows[0].innerHTML = headerHTML;
		table.style.width = (tableWidth + 50) + 'px';

		// 3. Render Body
		let bodyHTML = '';

		for (let r = 0; r < sheet.rowCount; r++) {
			const height = sheet.rowHeights[r] || this.defaults.defaultRowHeight;
			bodyHTML += '<tr>';
			bodyHTML += `<th class="counter-cell" style="height: ${height}px;">${r + 1}</th>`;

			for (let c = 0; c < sheet.colCount; c++) {
				// Skip cells that are covered by a merge (rowspan/colspan)
				if (this.isCellHiddenByMerge(sheet, r, c)) {
					continue;
				}

				const cellKey = r + '-' + c;
				const cellData = sheet.cells[cellKey];
				let cellHTML = '';
				let tdAttrs = `class="text-cell" data-col="${c}"`;
				let tdStyle = '';

				// Calculate dimensions for the current cell (considering merges)
				let cellWidth = sheet.colWidths[c] || this.defaults.defaultColWidth;
				let cellHeight = height;

				if (cellData) {
					// Apply TD (Cell) Styles (Borders, Background)
					if (cellData.cellStyle) {
						for (const [prop, val] of Object.entries(cellData.cellStyle)) {
							const cssProp = prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
							tdStyle += `${cssProp}:${val};`;
						}
					}

					if (cellData.rowspan > 1) tdAttrs += ` rowspan="${cellData.rowspan}"`;
					if (cellData.colspan > 1) tdAttrs += ` colspan="${cellData.colspan}"`;

					// Calculate total width if merged across columns
					if (cellData.colspan > 1) {
						cellWidth = 0;
						for (let k = 0; k < cellData.colspan; k++) {
							cellWidth += (sheet.colWidths[c + k] || this.defaults.defaultColWidth);
						}
					}

					// Calculate total height if merged across rows
					if (cellData.rowspan > 1) {
						cellHeight = 0;
						for (let k = 0; k < cellData.rowspan; k++) {
							cellHeight += (sheet.rowHeights[r + k] || this.defaults.defaultRowHeight);
						}
					}

					let divStyle = `width:${cellWidth - 3}px; height:${cellHeight - 3}px;`;
					let userStyle = (cellData.style && cellData.style.cssText) ? cellData.style.cssText : '';

					// --- NEW TYPE RENDERING LOGIC ---
					if (cellData.type) {
						const typeName = cellData.type.name;
						const details = cellData.type.details;

						if (typeName === 'llm_formula') {
							// Render LLM Button
							const btnText = details.funcName || 'Run LLM';
							// pointer-events: none allows the click to pass through to the TD for selection
							const content = `<button class="llm-run-btn" style="${userStyle}; pointer-events: none;" contenteditable="false" title="Double Click to Run LLM Formula">${btnText}</button>`;
							cellHTML = `<div class="content-cut" style="${divStyle}">${content}</div>`;
						}
						else if (typeName === 'dropdown') {
							// Render Dropdown
							const optionsStr = (details.options || []).join(',');
							const selectedVal = details.selected || '';
							const formula = `=dropdown("${optionsStr}", "${selectedVal}")`;
							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle}" data-formula="${formula.replace(/"/g, '&quot;')}">${selectedVal}</div>`;
						}
						else if (typeName === 'text') {
							// Render Standard Text
							const val = details.value || '';
							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle}">${val}</div>`;
						}
					} else {
						// Fallback for empty data objects
						cellHTML = `<div class="content-cut" style="${divStyle}"></div>`;
					}
				} else {
					// Render Empty Cell
					cellHTML = `<div class="content-cut" style="width:${cellWidth - 3}px; height:${height - 3}px;"></div>`;
				}

				bodyHTML += `<td ${tdAttrs} style="${tdStyle}">${cellHTML}</td>`;
			}
			bodyHTML += '</tr>';
		}

		tbody.innerHTML = bodyHTML;

		// 4. Post-Render: Re-attach resize handles and restore selection
		requestAnimationFrame(() => {
			this.rebindResizeHandlers();
			this.restoreSelection(sheet, tbody);
		});

		console.log('Sheet rendered in ' + (performance.now() - startTime).toFixed(2) + ' ms');
	},
	
	restoreSelection: function (sheet, tbody) {
		if (sheet.selection && sheet.selection.active) {
			const activeR = sheet.selection.active.r;
			const activeC = sheet.selection.active.c;
			
			const targetRow = tbody.children[activeR];
			if (targetRow) {
				const targetCell = targetRow.querySelector(`td[data-col="${activeC}"]`);
				if (targetCell) {
					if (typeof window.highlightCell === 'function') {
						window.highlightCell(targetCell);
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
								
								if (typeof window.updateSelection === 'function') {
									window.updateSelection();
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
	
	moveRange: function (range, targetR, targetC) {
		const sheet = this.data.sheets[this.data.activeSheetIndex];
		if (!sheet) return;
		
		const rowOffset = targetR - range.startR;
		const colOffset = targetC - range.startC;
		
		if (rowOffset === 0 && colOffset === 0) return;
		
		if (typeof window.HistoryManager !== 'undefined') {
			window.HistoryManager.addState();
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
					
					if (typeof window.updateSelection === 'function') {
						window.updateSelection();
					}
					if (typeof window.highlightCell === 'function') {
						window.highlightCell(newStartCell);
					}
				}
			}
		}, 0);
	},
	
	saveProject: function (filename) {
		this.updateCurrentSheetData();
		
		if (!filename) {
			window.showCustomAlert('Filename is required.');
			return;
		}
		
		fetch(getApiEndpoint('save_project'), {
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
					window.showToast('Project saved successfully');
				} else {
					window.showCustomAlert('Error saving project: ' + data.message);
				}
			})
			.catch(error => {
				console.error('Error:', error);
				window.showCustomAlert('An error occurred while saving.');
			});
	},
	
	loadProject: function (filename, isInitialLoad) {
		fetch(getApiEndpoint('load_project') + '?filename=' + encodeURIComponent(filename))
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					this.data = data.data;
					if (!this.data.llmSettings) {
						this.data.llmSettings = { apiKey: '', falAiKey: '' };
					}
					
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
						window.showCustomAlert('Error loading project: ' + data.message);
					}
				}
			})
			.catch(error => {
				console.error('Error:', error);
				if (!isInitialLoad) window.showCustomAlert('An error occurred while loading.');
			});
	},
	
	listProjects: function (callback) {
		fetch(getApiEndpoint('list_projects'))
			.then(response => response.json())
			.then(data => {
				if (data.success && callback) {
					callback(data.files);
				}
			});
	},
	
	deleteProject: function (filename, callback) {
		if (!confirm('Are you sure you want to delete "' + filename + '"?')) return;
		
		fetch(getApiEndpoint('delete_project'), {
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
					window.showCustomAlert('Error deleting file: ' + data.message);
				}
			});
	},
	
	newProject: function () {
		if (confirm('Create new project? Unsaved changes will be lost.')) {
			this.data = {
				activeSheetIndex: 0,
				sheets: [],
				llmSettings: { apiKey: '', falAiKey: '' }
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
