import { SheetDataManager } from './cascade-prompt-data.js';
import { ThemeManager } from './ui/theme-manager.js';
import { CellEditor } from './ui/cell-editor.js';
import { GridResizer } from './ui/grid-resizer.js';
import { CellMerge } from './ui/cell-merge.js';

// Re-export functions to maintain compatibility with main.js imports
export const initTheme = () => ThemeManager.initTheme();
export const setTheme = (t, s) => ThemeManager.setTheme(t, s);
export const initUiSize = () => ThemeManager.initUiSize();
export const setUiFontSize = (s, sv) => ThemeManager.setUiFontSize(s, sv);

export const makeCellEditable = (c) => CellEditor.makeCellEditable(c);
export const stopEditing = () => CellEditor.stopEditing();

export const attachResizeHandlers = () => GridResizer.attachResizeHandlers();

export const mergeCells = () => CellMerge.mergeCells();
export const unmergeCells = () => CellMerge.unmergeCells();

export const SheetPropertiesManager = {
	open: function () {
		const modal = document.getElementById('sheetPropertiesModal');
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		if (!sheet) return;
		document.getElementById('sheet-prop-name').value = sheet.name;
		document.getElementById('sheet-prop-rows').value = sheet.rowCount;
		document.getElementById('sheet-prop-cols').value = sheet.colCount;
		modal.showModal();
	},
	save: function () {
		const newName = document.getElementById('sheet-prop-name').value.trim();
		const newRows = parseInt(document.getElementById('sheet-prop-rows').value);
		const newCols = parseInt(document.getElementById('sheet-prop-cols').value);

		if (!newName) return window.showCustomAlert('Sheet name cannot be empty.');
		if (!/^[a-zA-Z0-9]+$/.test(newName)) return window.showCustomAlert('Sheet name must be alphanumeric and contain no spaces.');
		if (SheetDataManager.data.sheets.some((s, i) => i !== SheetDataManager.data.activeSheetIndex && s.name === newName)) return window.showCustomAlert('Sheet name already exists.');
		if (isNaN(newRows) || newRows < 1 || newRows > 10000) return window.showCustomAlert('Rows must be between 1 and 10000.');
		if (isNaN(newCols) || newCols < 1 || newCols > 200) return window.showCustomAlert('Columns must be between 1 and 200.');

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		SheetDataManager.updateSheetProperties(SheetDataManager.data.activeSheetIndex, newName, newRows, newCols);
		document.getElementById('sheetPropertiesModal').close();
		window.showToast('Sheet properties updated.');
	}
};

export function scrollToViewWithOffsets(cell) {
	const container = document.querySelector('.spreadsheet-container');
	const containerRect = container.getBoundingClientRect();
	const cellRect = cell.getBoundingClientRect();
	const stickyHeaderHeight = document.querySelector('.letter-cell')?.offsetHeight || 0;
	const stickySidebarWidth = document.querySelector('.counter-cell')?.offsetWidth || 0;

	const topOffset = cellRect.top - containerRect.top - stickyHeaderHeight;
	const leftOffset = cellRect.left - containerRect.left - stickySidebarWidth;

	if (topOffset < 0) container.scrollTop += topOffset;
	else if (cellRect.bottom > containerRect.bottom - 30) container.scrollTop += (cellRect.bottom - containerRect.bottom + 30);

	if (leftOffset < 0) container.scrollLeft += leftOffset;
	else if (cellRect.right > containerRect.right - 20) container.scrollLeft += (cellRect.right - containerRect.right + 20);
}

export function initMenuHandlers() {
	document.addEventListener('click', function (event) {
		document.querySelectorAll('.navbar details').forEach(detail => {
			const summary = detail.querySelector('summary');
			if (detail.contains(event.target)) {
				if (summary && (event.target === summary || summary.contains(event.target))) {
					document.querySelectorAll('.navbar details').forEach(o => { if (o !== detail) o.removeAttribute('open'); });
				} else {
					detail.removeAttribute('open');
				}
			} else if (detail.hasAttribute('open')) {
				detail.removeAttribute('open');
			}
		});
		if (event.target.closest('.dropdown-content') && (event.target.closest('a') || event.target.closest('button'))) {
			if (document.activeElement?.closest('.dropdown')) document.activeElement.blur();
		}
	});
}