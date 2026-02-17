// ... existing imports ...
import { getApiEndpoint } from './api-config.js';

export const SheetDataManager = {
	// ... existing data properties ...
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
		defaultColWidth: 100
	},

	// ... existing init, measureDefaults, createSheet, generateUniqueSheetName ...
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
			this.defaults.defaultRowHeight = (h > 10) ? h : 25;
		} else {
			this.defaults.defaultRowHeight = 25;
		}

		const sampleColHeader = document.querySelector('.spreadsheet thead th.letter-cell');
		if (sampleColHeader) {
			const w = sampleColHeader.offsetWidth;
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
		function isNumeric(v) {
			return typeof v === "number"
				? Number.isFinite(v)
				: (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));
		}

		const oldCells = sheetObj.cells || {};
		const cells = {};
		const colWidths = {};
		const rowHeights = {};

		const table = document.querySelector('.spreadsheet');
		const tbody = table.querySelector('tbody');
		const rows = tbody.rows;

		for (let r = 0; r < rows.length; r++) {
			const row = rows[r];
			const rowHeader = row.cells[0];

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
				const innerText = contentDiv.innerText.trim();

				let typeObj = {
					name: 'text',
					details: { value: innerText }
				};

				const existingCell = oldCells[cellKey];

				if (existingCell && existingCell.type) {
					if (existingCell.type.name === 'llm_formula') {
						typeObj = JSON.parse(JSON.stringify(existingCell.type));
					}
					else if (existingCell.type.name === 'dropdown') {
						typeObj = {
							name: 'dropdown',
							details: {
								options: existingCell.type.details.options || [],
								selected: innerText
							}
						};
					}
					else if (existingCell.type.name === 'image') {
						// Preserve image type if the text content is empty (user didn't overwrite it)
						if (innerText === '') {
							typeObj = JSON.parse(JSON.stringify(existingCell.type));
						} else {
							// User typed text over the image, converting it to text
							if (isNumeric(innerText)) {
								typeObj = { name: 'number', details: { value: innerText } };
							} else {
								typeObj = { name: 'text', details: { value: innerText } };
							}
						}
					}
					else {
						if (isNumeric(innerText)) {
							typeObj = { name: 'number', details: { value: innerText } };
						} else {
							typeObj = { name: 'text', details: { value: innerText } };
						}
					}
				} else {
					if (isNumeric(innerText)) {
						typeObj = { name: 'number', details: { value: innerText } };
					}
				}

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

				const cellStyle = {};
				if (cell.style.backgroundColor) cellStyle.backgroundColor = cell.style.backgroundColor;
				const borderProps = ['border', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'];
				borderProps.forEach(prop => {
					if (cell.style[prop]) cellStyle[prop] = cell.style[prop];
				});

				const hasValue = (typeObj.name === 'text' && typeObj.details.value !== '') ||
					typeObj.name === 'dropdown' ||
					typeObj.name === 'llm_formula' ||
					typeObj.name === 'image'; // Image counts as value

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

		let bodyHTML = '';

		for (let r = 0; r < sheet.rowCount; r++) {
			const height = sheet.rowHeights[r] || this.defaults.defaultRowHeight;
			bodyHTML += '<tr>';
			bodyHTML += `<th class="counter-cell" style="height: ${height}px;">${r + 1}</th>`;

			for (let c = 0; c < sheet.colCount; c++) {
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
					if (cellData.cellStyle) {
						for (const [prop, val] of Object.entries(cellData.cellStyle)) {
							const cssProp = prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
							tdStyle += `${cssProp}:${val};`;
						}
					}

					if (cellData.rowspan > 1) tdAttrs += ` rowspan="${cellData.rowspan}"`;
					if (cellData.colspan > 1) tdAttrs += ` colspan="${cellData.colspan}"`;

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

					let divStyle = `width:${cellWidth - 3}px; height:${cellHeight - 3}px;`;
					let userStyle = (cellData.style && cellData.style.cssText) ? cellData.style.cssText : '';

					if (cellData.type) {
						const typeName = cellData.type.name;
						const details = cellData.type.details;

						if (typeName === 'llm_formula') {
							const btnText = details.funcName || 'Run LLM';
							const content = `<button class="llm-run-btn" style="${userStyle}; pointer-events: none;" contenteditable="false" title="Double Click to Run LLM Formula">${btnText}</button>`;
							cellHTML = `<div class="content-cut" style="${divStyle}">${content}</div>`;
						}
						else if (typeName === 'dropdown') {
							const selectedVal = details.selected || '';
							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle}">${selectedVal}</div>`;
						}
						else if (typeName === 'image') {
							// Render Image
							const url = details.url || '';
							// Flex center and object-fit: contain for "scale to fit" behavior
							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle} display: flex; justify-content: center; align-items: center; overflow: hidden;">
								<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none;">
							</div>`;
						}
						else if (typeName === 'text' || typeName === 'number') {
							const val = details.value || '';
							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle}">${val}</div>`;
						}
					} else {
						cellHTML = `<div class="content-cut" style="${divStyle}"></div>`;
					}
				} else {
					cellHTML = `<div class="content-cut" style="width:${cellWidth - 3}px; height:${height - 3}px;"></div>`;
				}

				bodyHTML += `<td ${tdAttrs} style="${tdStyle}">${cellHTML}</td>`;
			}
			bodyHTML += '</tr>';
		}

		tbody.innerHTML = bodyHTML;

		requestAnimationFrame(() => {
			this.rebindResizeHandlers();
			this.restoreSelection(sheet, tbody);
		});

		console.log('Sheet rendered in ' + (performance.now() - startTime).toFixed(2) + ' ms');
	},

	// ... existing restoreSelection, isCellHiddenByMerge, getColumnLetter, rebindResizeHandlers ...
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