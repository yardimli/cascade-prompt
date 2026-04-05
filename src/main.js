import './style.css';
import { SheetDataManager } from '../js/cascade-prompt-data.js';
import { HistoryManager } from '../js/core/history-manager.js';
import { FormatManager } from '../js/ui/format-manager.js';
import { ClipboardManager } from '../js/core/clipboard-manager.js';
import { LLMManager } from '../js/cascade-prompt-llm.js';
import { DropdownManager } from '../js/ui/dropdown-manager.js';
import { CheckboxManager } from '../js/ui/checkbox-manager.js';
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
	LLMManager, DropdownManager, CheckboxManager,SheetPropertiesManager, ImageManager,
	PropertyPanelManager,
	setTheme, setUiFontSize, scrollToViewWithOffsets, makeCellEditable,
	stopEditing, mergeCells, unmergeCells, attachResizeHandlers, initMenuHandlers,
	openProjectModal, performSave,
	isEditing: false, isSelecting: false, startCell: null, endCell: null
});

window.highlightCell = (c) => SelectionManager.highlightCell(c);
window.updateSelection = () => SelectionManager.updateSelection();
window.updateSelectionBounds = () => SelectionManager.updateSelectionBounds();
window.updateStatusSelection = (r, c) => SelectionManager.updateStatusSelection(r, c);
window.getColumnWidthRange = (s, e) => SelectionManager.getColumnWidthRange(s, e);
window.getRowHeightRange = (s, e) => SelectionManager.getRowHeightRange(s, e);

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

			const r = sel.parentElement.rowIndex - 1;
			const c = parseInt(sel.getAttribute('data-col'));
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = `${r}-${c}`;

			if (!sheet.cells[key]) {
				sheet.cells[key] = { rowspan: parseInt(sel.getAttribute('rowspan')) || 1, colspan: parseInt(sel.getAttribute('colspan')) || 1, style: {}, cellStyle: {} };
			}

			const val = this.textContent;
			const isNum = typeof val === "number" ? Number.isFinite(val) : (typeof val === "string" && val.trim() !== "" && Number.isFinite(Number(val)));
			sheet.cells[key].type = { name: isNum ? 'number' : 'text', details: { value: val } };

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
		else if (text.toLowerCase().startsWith('=checkbox(')) {
			CheckboxManager.openCheckboxBuilder();
		}
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

	const selectionHelper = document.getElementById('selection-helper');
	const dropZoneHelper = document.getElementById('drop-zone-helper');
	let isDraggingSelection = false;
	let dragSelectionData = null;

	document.addEventListener('mousedown', (e) => {
		if (e.target.classList.contains('selection-helper-edge')) {
			e.preventDefault();
			e.stopPropagation();

			if (window.isEditing) return;

			let sR, eR, sC, eC;
			if (window.startCell && window.endCell && window.startCell !== window.endCell) {
				const r1 = window.startCell.parentElement.rowIndex - 1;
				const c1 = parseInt(window.startCell.getAttribute('data-col'));
				const rs1 = parseInt(window.startCell.getAttribute('rowspan')) || 1;
				const cs1 = parseInt(window.startCell.getAttribute('colspan')) || 1;

				const r2 = window.endCell.parentElement.rowIndex - 1;
				const c2 = parseInt(window.endCell.getAttribute('data-col'));
				const rs2 = parseInt(window.endCell.getAttribute('rowspan')) || 1;
				const cs2 = parseInt(window.endCell.getAttribute('colspan')) || 1;

				sR = Math.min(r1, r2);
				eR = Math.max(r1 + rs1 - 1, r2 + rs2 - 1);
				sC = Math.min(c1, c2);
				eC = Math.max(c1 + cs1 - 1, c2 + cs2 - 1);
			} else {
				const selected = document.querySelector('.selected-cell');
				if (!selected) return;
				sR = selected.parentElement.rowIndex - 1;
				sC = parseInt(selected.getAttribute('data-col'));
				const rowspan = parseInt(selected.getAttribute('rowspan')) || 1;
				const colspan = parseInt(selected.getAttribute('colspan')) || 1;
				eR = sR + rowspan - 1;
				eC = sC + colspan - 1;
			}

			selectionHelper.style.pointerEvents = 'none';
			selectionHelper.querySelectorAll('.selection-helper-edge').forEach(el => el.style.pointerEvents = 'none');

			const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
			const cellUnderMouse = elementUnderMouse ? elementUnderMouse.closest('.text-cell') : null;

			let anchorR = sR;
			let anchorC = sC;

			if (cellUnderMouse) {
				anchorR = cellUnderMouse.parentElement.rowIndex - 1;
				anchorC = parseInt(cellUnderMouse.getAttribute('data-col'));
				anchorR = Math.max(sR, Math.min(eR, anchorR));
				anchorC = Math.max(sC, Math.min(eC, anchorC));
			}

			isDraggingSelection = true;
			dragSelectionData = {
				sR, eR, sC, eC,
				rows: eR - sR + 1,
				cols: eC - sC + 1,
				anchorOffsetR: anchorR - sR,
				anchorOffsetC: anchorC - sC,
				lastDropTarget: null
			};

			document.body.classList.add('dragging-selection');
		}
	});

	document.addEventListener('mousemove', (e) => {
		if (isDraggingSelection && dragSelectionData) {
			e.preventDefault();

			const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
			const cellUnderMouse = elementUnderMouse ? elementUnderMouse.closest('.text-cell') : null;

			if (cellUnderMouse) {
				const targetR = cellUnderMouse.parentElement.rowIndex - 1;
				const targetC = parseInt(cellUnderMouse.getAttribute('data-col'));

				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];

				let dropStartR = targetR - dragSelectionData.anchorOffsetR;
				let dropStartC = targetC - dragSelectionData.anchorOffsetC;

				dropStartR = Math.max(0, Math.min(sheet.rowCount - dragSelectionData.rows, dropStartR));
				dropStartC = Math.max(0, Math.min(sheet.colCount - dragSelectionData.cols, dropStartC));

				const dropEndR = dropStartR + dragSelectionData.rows - 1;
				const dropEndC = dropStartC + dragSelectionData.cols - 1;

				dragSelectionData.lastDropTarget = { dropStartR, dropStartC, dropEndR, dropEndC };

				const tbody = document.querySelector('.spreadsheet tbody');
				const startCellEl = tbody.children[dropStartR]?.querySelector(`td[data-col="${dropStartC}"]`);
				if (startCellEl) {
					const container = document.querySelector('.spreadsheet-container');
					const containerRect = container.getBoundingClientRect();
					const cellRect = startCellEl.getBoundingClientRect();

					const top = cellRect.top - containerRect.top - 1 + container.scrollTop;
					const left = cellRect.left - containerRect.left - 1 + container.scrollLeft;
					const width = window.getColumnWidthRange(dropStartC, dropEndC);
					const height = window.getRowHeightRange(dropStartR, dropEndR);

					Object.assign(dropZoneHelper.style, {
						top: top + 'px',
						left: left + 'px',
						width: width + 'px',
						height: height + 'px',
						display: 'block'
					});
				}
			} else {
				dragSelectionData.lastDropTarget = null;
				dropZoneHelper.style.display = 'none';
			}
		}
	});

	document.addEventListener('mouseup', (e) => {
		if (isDraggingSelection) {
			isDraggingSelection = false;
			document.body.classList.remove('dragging-selection');

			selectionHelper.style.pointerEvents = 'none';
			selectionHelper.querySelectorAll('.selection-helper-edge').forEach(el => el.style.pointerEvents = 'auto');

			dropZoneHelper.style.display = 'none';

			if (dragSelectionData && dragSelectionData.lastDropTarget) {
				const { dropStartR, dropStartC, dropEndR, dropEndC } = dragSelectionData.lastDropTarget;
				const { sR, eR, sC, eC } = dragSelectionData;

				if (dropStartR !== sR || dropStartC !== sC) {
					SheetDataManager.moveRange(
						{ startR: sR, endR: eR, startC: sC, endC: eC },
						dropStartR, dropStartC
					);

					const tbody = document.querySelector('.spreadsheet tbody');
					const newStartCell = tbody.children[dropStartR]?.querySelector(`td[data-col="${dropStartC}"]`);
					const newEndCell = tbody.children[dropEndR]?.querySelector(`td[data-col="${dropEndC}"]`);

					if (newStartCell && newEndCell) {
						window.startCell = newStartCell;
						window.endCell = newEndCell;
						window.isSelecting = false;
						window.highlightCell(newStartCell);
						window.updateSelection();
						SelectionManager.updateFormulaBar(dropStartR, dropStartC);
					}
				}
			}
			dragSelectionData = null;
		}
	});
});