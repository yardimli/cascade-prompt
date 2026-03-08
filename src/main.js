import './style.css';
import { SheetDataManager } from '../js/cascade-prompt-data.js';
import { HistoryManager } from '../js/core/history-manager.js';
import { FormatManager } from '../js/ui/format-manager.js';
import { ClipboardManager } from '../js/core/clipboard-manager.js';
import { LLMManager } from '../js/cascade-prompt-llm.js';
import { DropdownManager } from '../js/ui/dropdown-manager.js';
import { PropertyPanelManager } from '../js/ui/property-panel.js';
import { ImageManager } from '../js/ui/image-manager.js';
import { initKeypressListeners } from '../js/core/input-manager.js';
import { SelectionManager } from '../js/core/selection-manager.js';
import {
	initTheme, setTheme, initUiSize, setUiFontSize, SheetPropertiesManager,
	scrollToViewWithOffsets, makeCellEditable, stopEditing, mergeCells,
	unmergeCells, attachResizeHandlers, initMenuHandlers
} from '../js/cascade-prompt-ui.js';
import { openProjectModal, performSave, initProjectHandlers } from '../js/ui/project-manager.js';

// Expose globals
Object.assign(window, {
	SheetDataManager, HistoryManager, FormatManager, ClipboardManager,
	LLMManager, DropdownManager, SheetPropertiesManager, ImageManager,
	PropertyPanelManager,
	setTheme, setUiFontSize, scrollToViewWithOffsets, makeCellEditable,
	stopEditing, mergeCells, unmergeCells, attachResizeHandlers, initMenuHandlers,
	openProjectModal, performSave,
	isEditing: false, isSelecting: false, startCell: null, endCell: null
});

// Bind Selection Manager functions to window
window.highlightCell = (c) => SelectionManager.highlightCell(c);
window.updateSelection = () => SelectionManager.updateSelection();
window.updateStatusSelection = (r, c) => SelectionManager.updateStatusSelection(r, c);
window.getColumnWidthRange = (s, e) => SelectionManager.getColumnWidthRange(s, e);
window.getRowHeightRange = (s, e) => SelectionManager.getRowHeightRange(s, e);

// Helper for snapping
window.getColumnWidths = () => Array.from(document.querySelectorAll('.spreadsheet .letter-cell')).map(c => c.offsetWidth);
window.getRowHeights = () => Array.from(document.querySelectorAll('.spreadsheet .counter-cell')).map(c => c.offsetHeight);
window.snapToCell = (pos, dims) => {
	let cum = 0, prev = 0;
	for (let i = 0; i < dims.length; i++) {
		if (pos <= cum) return prev;
		prev = cum; cum += dims[i];
	}
	return cum;
};
window.saveState = () => {
	if (SheetDataManager.currentFileName && !document.title.endsWith('*')) document.title += '*';
	SheetDataManager.setModified(true);
};
window.updateColumnWidth = (idx, w) => {
	document.querySelector(`.letter-cell[data-col="${idx}"]`).style.width = w + 'px';
	document.querySelectorAll('.spreadsheet tbody tr').forEach(row => {
		const cell = row.querySelector(`td[data-col="${idx}"]`);
		if (cell) {
			const span = parseInt(cell.getAttribute('colspan')) || 1;
			cell.querySelector('.content-cut').style.width = ((span === 1 ? w : window.getColumnWidthRange(idx, idx + span - 1)) - 3) + 'px';
		}
	});
};
window.updateRowHeight = (idx, h) => {
	const th = document.querySelectorAll('.counter-cell')[idx];
	if (th) th.style.height = h + 'px';
	const row = document.querySelectorAll('.spreadsheet tbody tr')[idx];
	row.querySelectorAll('td.text-cell').forEach(cell => {
		const span = parseInt(cell.getAttribute('rowspan')) || 1;
		cell.querySelector('.content-cut').style.height = ((span === 1 ? h : window.getRowHeightRange(idx, idx + span - 1)) - 3) + 'px';
	});
};
window.showCustomAlert = (msg) => { document.getElementById('alert-modal-body').innerHTML = msg; document.getElementById('alertModal').showModal(); };
window.showToast = (msg) => { const t = document.getElementById('toast-notification'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); };

document.addEventListener('DOMContentLoaded', function () {
	initTheme(); initUiSize(); initMenuHandlers();
	document.addEventListener('sheetRendered', attachResizeHandlers);
	SheetDataManager.init(); HistoryManager.init(); LLMManager.init(); PropertyPanelManager.init();
	initKeypressListeners(); initProjectHandlers(); attachResizeHandlers();

	document.querySelector('.add-sheet-btn')?.addEventListener('click', () => {
		if (typeof HistoryManager !== 'undefined') HistoryManager.addState();
		SheetDataManager.createSheet('Sheet' + (SheetDataManager.data.sheets.length + 1), false);
	});

	const formulaInput = document.getElementById('formula-input');
	let formulaBarDirty = false;
	formulaInput.addEventListener('focus', () => formulaBarDirty = false);
	formulaInput.addEventListener('keydown', () => { if (!formulaBarDirty) { HistoryManager.addState(); formulaBarDirty = true; } });
	formulaInput.addEventListener('input', function () {
		const sel = document.querySelector('.selected-cell');
		if (sel && !document.querySelector('.area-selected-cell')) {
			sel.querySelector('.content-cut').textContent = this.textContent;
			window.saveState();
		}
	});
	formulaInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault(); formulaBarDirty = false;
			const sel = document.querySelector('.selected-cell');
			if (sel) { sel.focus(); const next = sel.closest('tr').nextElementSibling?.querySelector(`td[data-col="${sel.getAttribute('data-col')}"]`); if (next) window.highlightCell(next); }
		}
	});
	formulaInput.addEventListener('click', function () {
		const text = this.textContent.trim();
		if (text.startsWith('=LLM(')) {
			LLMManager.openFormulaBuilder();
		}
		else if (text.toLowerCase().startsWith('=dropdown(')) {
			DropdownManager.openDropdownBuilder();
		}
	});

	const selectionHelper = document.getElementById('selection-helper');
	let isDraggingSelection = false, dragOffset = { top: 0, left: 0 }, draggingEdge = null;
	let initialStart = { row: 0, col: 0 }, initialEnd = { row: 0, col: 0 };

	selectionHelper.addEventListener('mousedown', (e) => {
		if (e.target.classList.contains('selection-helper-edge')) return;
		e.preventDefault(); e.stopPropagation();
		isDraggingSelection = true;
		const rect = selectionHelper.getBoundingClientRect();
		dragOffset = { left: e.clientX - rect.left, top: e.clientY - rect.top };
		initialStart = { row: window.startCell.parentElement.rowIndex, col: parseInt(window.startCell.getAttribute('data-col')) };
	});

	const spreadsheet = document.querySelector('.spreadsheet');
	spreadsheet.addEventListener('dblclick', (e) => {
		const cell = e.target.closest('.text-cell');
		if (cell) {
			if (cell.querySelector('.llm-run-btn')) LLMManager.executeLLM(cell.parentElement.rowIndex - 1, parseInt(cell.getAttribute('data-col')), e);
			else makeCellEditable(cell);
		}
	});

	let mouseDown = false;
	spreadsheet.addEventListener('mousedown', (e) => {
		const cell = e.target.closest('.text-cell');
		if (!cell || (window.isEditing && cell.classList.contains('edit-cell'))) return;
		if (document.activeElement && document.activeElement !== document.body) {
			document.activeElement.blur();
		}
		stopEditing();
		if (!cell.classList.contains('selected-cell')) window.highlightCell(cell);
		window.startCell = null; window.endCell = null; window.isSelecting = false; window.updateSelection();
		mouseDown = true; e.preventDefault();
	});

	spreadsheet.addEventListener('mousemove', (e) => {
		const cell = e.target.closest('.text-cell');
		if (!cell) return;
		if (mouseDown && !window.isSelecting) { window.isSelecting = true; window.startCell = cell; window.endCell = window.startCell; window.updateSelection(); }
		if (window.isSelecting) { window.endCell = cell; window.updateSelection(); }
	});

	document.addEventListener('mouseup', () => { mouseDown = false; window.isSelecting = false; });

	document.addEventListener('mousedown', (e) => {
		if (e.target.classList.contains('selection-helper-edge')) {
			draggingEdge = e.target;
			initialStart = { row: window.startCell.parentElement.rowIndex, col: parseInt(window.startCell.getAttribute('data-col')) };
			initialEnd = { row: window.endCell.parentElement.rowIndex, col: parseInt(window.endCell.getAttribute('data-col')) };
		}
	});

	document.addEventListener('mousemove', (e) => {
		if (isDraggingSelection) {
			e.preventDefault();
			const container = document.querySelector('.spreadsheet-container'), offset = container.getBoundingClientRect();
			const corner = document.querySelector('.top-corner-cell');
			const h = corner ? corner.offsetHeight : 0, w = corner ? corner.offsetWidth : 0;
			const top = window.snapToCell(e.clientY - offset.top + container.scrollTop - dragOffset.top - h, window.getRowHeights());
			const left = window.snapToCell(e.clientX - offset.left + container.scrollLeft - dragOffset.left - w, window.getColumnWidths());
			selectionHelper.style.top = (top + h) + 'px'; selectionHelper.style.left = (left + w) + 'px';
			return;
		}
		if (draggingEdge) {
			e.preventDefault(); e.stopPropagation();
			const container = document.querySelector('.spreadsheet-container'), offset = container.getBoundingClientRect();
			const corner = document.querySelector('.top-corner-cell');
			const h = corner ? corner.offsetHeight : 0, w = corner ? corner.offsetWidth : 0;
			const newTop = window.snapToCell(e.pageY - offset.top + container.scrollTop - h, window.getRowHeights()) + h;
			const newLeft = window.snapToCell(e.pageX - offset.left + container.scrollLeft - w, window.getColumnWidths()) + w;

			selectionHelper.style.top = newTop + 'px'; selectionHelper.style.left = newLeft + 'px';
		}
	});

	document.addEventListener('mouseup', () => {
		if (draggingEdge) draggingEdge = null;
		if (isDraggingSelection) {
			isDraggingSelection = false;
			const top = parseInt(selectionHelper.style.top), left = parseInt(selectionHelper.style.left);
			const corner = document.querySelector('.top-corner-cell');
			const h = corner ? corner.offsetHeight : 0, w = corner ? corner.offsetWidth : 0;
			const rowHeights = window.getRowHeights(), colWidths = window.getColumnWidths();

			let tR = 0, tC = 0, cur = 0;
			for(let i=0; i<rowHeights.length; i++) { if(cur >= top - h - 2) { tR = i; break; } cur += rowHeights[i]; tR = i+1; }
			cur = 0;
			for(let i=0; i<colWidths.length; i++) { if(cur >= left - w - 2) { tC = i; break; } cur += colWidths[i]; tC = i+1; }

			if (window.startCell && window.endCell) {
				const sR = window.startCell.parentElement.rowIndex - 1, eR = window.endCell.parentElement.rowIndex - 1;
				const sC = parseInt(window.startCell.getAttribute('data-col')), eC = parseInt(window.endCell.getAttribute('data-col'));
				SheetDataManager.moveRange({ startR: Math.min(sR, eR), endR: Math.max(sR, eR), startC: Math.min(sC, eC), endC: Math.max(sC, eC) }, tR, tC);
			} else window.updateSelection();
		}
	});
});