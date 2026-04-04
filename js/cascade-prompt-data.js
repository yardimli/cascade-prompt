import { SheetState } from './data/sheet-state.js';
import { SheetRender } from './data/sheet-render.js';
import { SheetDOM } from './data/sheet-dom.js';
import { SheetIO } from './data/sheet-io.js';

export const SheetDataManager = {
	...SheetState,

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
		this.defaults.defaultRowHeight = (sampleRowHeader && sampleRowHeader.offsetHeight > 10) ? sampleRowHeader.offsetHeight : 25;
		const sampleColHeader = document.querySelector('.spreadsheet thead th.letter-cell');
		this.defaults.defaultColWidth = (sampleColHeader && sampleColHeader.offsetWidth > 20) ? sampleColHeader.offsetWidth : 100;
		console.log(`Defaults measured: RowHeight=${this.defaults.defaultRowHeight}, ColWidth=${this.defaults.defaultColWidth}`);
	},

	createSheet: function (name, isInitial) {
		let finalName = isInitial ? name : this.generateUniqueSheetName(name);
		let newSheet = {
			name: finalName,
			rowCount: this.defaults.rows,
			colCount: this.defaults.cols,
			cells: {}, colWidths: {}, rowHeights: {},
			selection: { active: { r: 0, c: 0 }, range: null }
		};
		if (isInitial) newSheet = this.collectDOMData(newSheet);
		this.data.sheets.push(newSheet);
		if (!isInitial) {
			this.selectSheet(this.data.sheets.length - 1);
			this.setModified(true);
		} else {
			this.renderTabs();
		}
	},

	updateSheetProperties: function (index, newName, newRows, newCols) {
		if (index < 0 || index >= this.data.sheets.length) return;
		const sheet = this.data.sheets[index];
		sheet.name = newName;
		sheet.rowCount = parseInt(newRows);
		sheet.colCount = parseInt(newCols);
		if (index === this.data.activeSheetIndex) this.renderSheet(index);
		this.renderTabs();
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
		if (this.data.sheets[this.data.activeSheetIndex]) {
			this.data.sheets[this.data.activeSheetIndex] = this.collectDOMData(this.data.sheets[this.data.activeSheetIndex]);
		}
	},

	collectDOMData: function (sheetObj) { return SheetDOM.collectDOMData(this, sheetObj); },
	renderSheet: function (index) { SheetRender.renderSheet(this, index); },
	restoreSelection: function (sheet, tbody) { SheetRender.restoreSelection(sheet, tbody); },

	isCellHiddenByMerge: function (sheet, row, col) {
		for (const key in sheet.cells) {
			const data = sheet.cells[key];
			if ((data.rowspan || 1) === 1 && (data.colspan || 1) === 1) continue;
			const [r, c] = key.split('-').map(Number);
			if (row >= r && row <= r + (data.rowspan || 1) - 1 && col >= c && col <= c + (data.colspan || 1) - 1) {
				return !(row === r && col === c);
			}
		}
		return false;
	},

	rebindResizeHandlers: function () { document.dispatchEvent(new Event('sheetRendered')); },

	renderTabs: function () {
		const container = document.getElementById('sheet-tabs-container');
		container.querySelectorAll('.sheet-tab').forEach(el => el.remove());
		const addBtn = container.querySelector('.add-sheet-btn');
		this.data.sheets.forEach((sheet, index) => {
			const tab = document.createElement('div');
			tab.className = 'sheet-tab' + (index === this.data.activeSheetIndex ? ' active' : '');
			tab.textContent = sheet.name;
			tab.addEventListener('click', () => this.selectSheet(index));
			container.insertBefore(tab, addBtn);
		});
	},

	moveRange: function (range, targetR, targetC) {
		const sheet = this.data.sheets[this.data.activeSheetIndex];
		if (!sheet || (targetR === range.startR && targetC === range.startC)) return;
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const movingCells =[];
		for (let r = range.startR; r <= range.endR; r++) {
			for (let c = range.startC; c <= range.endC; c++) {
				const key = r + '-' + c;
				if (sheet.cells[key]) movingCells.push({ oldR: r, oldC: c, data: JSON.parse(JSON.stringify(sheet.cells[key])) });
			}
		}
		movingCells.forEach(item => delete sheet.cells[item.oldR + '-' + item.oldC]);
		const rOffset = targetR - range.startR, cOffset = targetC - range.startC;
		movingCells.forEach(item => {
			const newR = item.oldR + rOffset, newC = item.oldC + cOffset;
			if (newR >= 0 && newC >= 0) sheet.cells[newR + '-' + newC] = item.data;
		});

		sheet.selection = {
			active: { r: targetR, c: targetC },
			range: (range.startR !== range.endR || range.startC !== range.endC) ?
				{ startR: targetR, startC: targetC, endR: targetR + (range.endR - range.startR), endC: targetC + (range.endC - range.startC) } : null
		};

		this.renderSheet(this.data.activeSheetIndex);
		this.setModified(true);
		setTimeout(() => {
			if (typeof window.updateSelection === 'function') window.updateSelection();
		}, 0);
	},

	saveProject: function (filename) { SheetIO.saveProject(this, filename); },
	loadProject: function (filename, isInitial) { SheetIO.loadProject(this, filename, isInitial); },
	listProjects: function (cb) { SheetIO.listProjects(cb); },
	deleteProject: function (fn, cb) { SheetIO.deleteProject(fn, cb); },

	newProject: function () {
		if (confirm('Create new project? Unsaved changes will be lost.')) {
			this.data = { activeSheetIndex: 0, sheets:[], llmSettings: { apiKey: '', falAiKey: '' } };
			this.currentFileName = null;
			localStorage.removeItem('lastOpenedFile');
			document.title = 'Cascade Prompt';
			document.querySelector('.spreadsheet tbody').innerHTML = '';
			this.createSheet('Sheet1', true);
			this.setModified(false);
		}
	},

	updateStatusUI: function () {
		const fileEl = document.getElementById('status-file');
		const modEl = document.getElementById('status-modified');
		if (fileEl) fileEl.textContent = this.currentFileName || 'Untitled';
		if (modEl) modEl.style.display = this.isModified ? 'inline' : 'none';
	},

	setModified: function (isModified) {
		this.isModified = isModified;
		this.updateStatusUI();
	}
};