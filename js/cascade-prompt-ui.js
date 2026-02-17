// ... existing imports ...
import { SheetDataManager } from './cascade-prompt-data.js';

// ... existing initTheme, setTheme, updateThemeMenu, initUiSize, setUiFontSize, updateUiSizeMenu ...
export function initTheme() {
	let theme = localStorage.getItem('cascade_theme');
	if (!theme) {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			theme = 'dark';
		} else {
			theme = 'light';
		}
	}
	setTheme(theme, false);
}

export function setTheme(themeName, save = true) {
	document.documentElement.setAttribute('data-theme', themeName);
	if (save) {
		localStorage.setItem('cascade_theme', themeName);
	}
	updateThemeMenu(themeName);
}

function updateThemeMenu(activeTheme) {
	const themes = ['light', 'dark', 'cupcake', 'retro'];
	themes.forEach(t => {
		const icon = document.getElementById(`theme-check-${t}`);
		if (icon) {
			if (t === activeTheme) {
				icon.classList.remove('invisible');
			} else {
				icon.classList.add('invisible');
			}
		}
	});
}

export function initUiSize() {
	const savedSize = localStorage.getItem('cascade_ui_size') || 'normal';
	setUiFontSize(savedSize, false);
}

export function setUiFontSize(size, save = true) {
	document.documentElement.setAttribute('data-ui-size', size);
	if (save) {
		localStorage.setItem('cascade_ui_size', size);
	}
	updateUiSizeMenu(size);
}

function updateUiSizeMenu(activeSize) {
	const sizes = ['small', 'normal', 'large'];
	sizes.forEach(s => {
		const icon = document.getElementById(`size-check-${s}`);
		if (icon) {
			if (s === activeSize) {
				icon.classList.remove('invisible');
			} else {
				icon.classList.add('invisible');
			}
		}
	});
}

// ... existing SheetPropertiesManager ...
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
		const nameInput = document.getElementById('sheet-prop-name');
		const rowsInput = document.getElementById('sheet-prop-rows');
		const colsInput = document.getElementById('sheet-prop-cols');

		const newName = nameInput.value.trim();
		const newRows = parseInt(rowsInput.value);
		const newCols = parseInt(colsInput.value);

		if (!newName) {
			window.showCustomAlert('Sheet name cannot be empty.');
			return;
		}

		if (!/^[a-zA-Z0-9]+$/.test(newName)) {
			window.showCustomAlert('Sheet name must be alphanumeric and contain no spaces.');
			return;
		}

		const currentIndex = SheetDataManager.data.activeSheetIndex;
		const isDuplicate = SheetDataManager.data.sheets.some((sheet, idx) => {
			return idx !== currentIndex && sheet.name === newName;
		});

		if (isDuplicate) {
			window.showCustomAlert('Sheet name already exists. Please choose a unique name.');
			return;
		}

		if (isNaN(newRows) || newRows < 1 || newRows > 10000) {
			window.showCustomAlert('Rows must be between 1 and 10000.');
			return;
		}

		if (isNaN(newCols) || newCols < 1 || newCols > 200) {
			window.showCustomAlert('Columns must be between 1 and 200.');
			return;
		}

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		SheetDataManager.updateSheetProperties(currentIndex, newName, newRows, newCols);

		document.getElementById('sheetPropertiesModal').close();
		window.showToast('Sheet properties updated.');
	}
};

// ... existing scrollToViewWithOffsets ...
export function scrollToViewWithOffsets(cell) {
	const container = document.querySelector('.spreadsheet-container');
	const containerRect = container.getBoundingClientRect();
	const cellRect = cell.getBoundingClientRect();

	const firstLetterCell = document.querySelector('.letter-cell');
	const stickyHeaderHeight = firstLetterCell ? firstLetterCell.offsetHeight : 0;

	const firstCounterCell = document.querySelector('.counter-cell');
	const stickySidebarWidth = firstCounterCell ? firstCounterCell.offsetWidth : 0;

	const topOffset = cellRect.top - containerRect.top - stickyHeaderHeight;
	const leftOffset = cellRect.left - containerRect.left - stickySidebarWidth;

	if (topOffset < 0) {
		container.scrollTop += topOffset;
	} else if (cellRect.bottom > containerRect.bottom - 30) {
		container.scrollTop += (cellRect.bottom - containerRect.bottom + 30);
	}

	if (leftOffset < 0) {
		container.scrollLeft += leftOffset;
	} else if (cellRect.right > containerRect.right - 20) {
		container.scrollLeft += (cellRect.right - containerRect.right + 20);
	}
}

export function makeCellEditable(cell) {
	if (!cell.classList.contains('selected-cell')) {
		window.highlightCell(cell);
	}

	if (cell.querySelector('.llm-run-btn')) {
		if (typeof window.showToast === 'function') {
			window.showToast('LLM Button cells cannot be edited directly.');
		}
		return;
	}

	if (!cell.classList.contains('edit-cell')) {
		cell.classList.add('edit-cell');
	}

	document.querySelectorAll('.spreadsheet .area-selected-cell').forEach(el => el.classList.remove('area-selected-cell'));

	const contentDiv = cell.querySelector('.content-cut');
	const width = cell.offsetWidth;
	const height = cell.offsetHeight;
	const cellLeft = cell.offsetLeft;
	const cellTop = cell.offsetTop;

	const editor = document.getElementById('cell-editor');
	editor.style.position = 'absolute';
	editor.style.top = cellTop + 'px';
	editor.style.left = cellLeft + 'px';
	editor.style.width = width + 'px';
	editor.style.height = height + 'px';
	editor.style.minWidth = width + 'px';
	editor.style.minHeight = height + 'px';
	editor.style.display = 'block';

	const computedStyle = window.getComputedStyle(contentDiv);
	editor.style.textAlign = computedStyle.textAlign;
	editor.style.fontWeight = computedStyle.fontWeight;
	editor.style.fontStyle = computedStyle.fontStyle;
	editor.style.color = computedStyle.color;
	editor.style.fontSize = computedStyle.fontSize;
	editor.style.fontFamily = computedStyle.fontFamily;
	editor.style.backgroundColor = window.getComputedStyle(cell).backgroundColor;

	const r = cell.parentElement.rowIndex - 1;
	const c = parseInt(cell.getAttribute('data-col'));
	const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
	const key = r + '-' + c;
	const cellData = sheet.cells[key];

	const isDropdown = cellData && cellData.type && cellData.type.name === 'dropdown';
	const isImage = cellData && cellData.type && cellData.type.name === 'image';

	if (isDropdown) {
		const options = cellData.type.details.options || [];
		const currentSelection = cellData.type.details.selected || '';

		const wrapper = document.createElement('div');
		wrapper.className = 'floating-select-wrapper w-full h-full';

		const select = document.createElement('select');
		select.className = 'select select-xs w-full h-full rounded-none focus:outline-none min-h-0 block p-0 m-0';

		select.style.textAlign = computedStyle.textAlign;
		select.style.fontWeight = computedStyle.fontWeight;
		select.style.fontStyle = computedStyle.fontStyle;
		select.style.fontSize = computedStyle.fontSize;
		select.style.fontFamily = computedStyle.fontFamily;
		select.style.color = computedStyle.color;
		select.style.backgroundColor = window.getComputedStyle(cell).backgroundColor;

		select.style.border = 'none';
		select.style.outline = 'none';
		select.style.boxShadow = 'none';
		select.style.padding = '0 5px';

		options.forEach(opt => {
			const option = document.createElement('option');
			option.value = opt;
			option.textContent = opt;
			if (opt === currentSelection) {
				option.selected = true;
			}
			select.appendChild(option);
		});

		select.addEventListener('change', function () {
			stopEditing();
		});

		select.addEventListener('blur', function () {
			stopEditing();
		});

		select.addEventListener('click', function (e) {
			e.stopPropagation();
		});

		wrapper.appendChild(select);
		editor.innerHTML = '';
		editor.appendChild(wrapper);
		editor.contentEditable = false;
		editor.style.padding = '0';
		select.focus();

		try {
			if (typeof select.showPicker === 'function') {
				select.showPicker();
			}
		} catch (e) {
			console.warn('Auto-open dropdown failed:', e);
		}

	} else if (isImage) {
		// For images, start with an empty editor
		editor.innerText = '';
		editor.contentEditable = true;
		editor.style.padding = '2px 5px';
		editor.focus();

		// Hide image while editing
		contentDiv.style.visibility = 'hidden';
	} else {
		editor.innerText = contentDiv.innerText;
		editor.contentEditable = true;
		editor.style.padding = '2px 5px';
		editor.focus();

		editor.oninput = function () {
			this.style.height = 'auto';
			this.style.width = 'auto';
			const scrollHeight = this.scrollHeight;
			const scrollWidth = this.scrollWidth;

			if (scrollHeight > height) {
				this.style.height = scrollHeight + 'px';
			} else {
				this.style.height = height + 'px';
			}
			if (scrollWidth > width) {
				this.style.width = scrollWidth + 'px';
			} else {
				this.style.width = width + 'px';
			}
		};
		editor.dispatchEvent(new Event('input'));
	}

	contentDiv.style.visibility = 'hidden';
	window.isEditing = true;
}

export function stopEditing() {
	if (!window.isEditing) return;

	const editingCell = document.querySelector('.edit-cell');
	const editor = document.getElementById('cell-editor');

	if (editingCell) {
		const contentDiv = editingCell.querySelector('.content-cut');
		const r = editingCell.parentElement.rowIndex - 1;
		const c = parseInt(editingCell.getAttribute('data-col'));
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const key = r + '-' + c;

		let newText = '';
		let isDropdownChange = false;

		const select = editor.querySelector('select');

		if (select) {
			newText = select.value;
			isDropdownChange = true;
		} else {
			newText = editor.innerText;
		}

		const oldText = contentDiv.innerText;
		// Check if it was an image
		const wasImage = sheet.cells[key] && sheet.cells[key].type && sheet.cells[key].type.name === 'image';

		if (newText !== oldText || isDropdownChange || (wasImage && newText !== '')) {
			if (typeof window.HistoryManager !== 'undefined') {
				window.HistoryManager.addState();
			}
		}

		if (!sheet.cells[key]) {
			sheet.cells[key] = {
				rowspan: parseInt(editingCell.getAttribute('rowspan')) || 1,
				colspan: parseInt(editingCell.getAttribute('colspan')) || 1,
				style: {},
				cellStyle: {}
			};
		}
		function isNumeric(v) {
			return typeof v === "number"
				? Number.isFinite(v)
				: (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));
		}

		if (isDropdownChange) {
			const existingOptions = (sheet.cells[key].type && sheet.cells[key].type.details.options)
				? sheet.cells[key].type.details.options
				: [];

			sheet.cells[key].type = {
				name: 'dropdown',
				details: {
					options: existingOptions,
					selected: newText
				}
			};
		} else if (wasImage && newText === '') {
			// If it was an image and user entered nothing, keep it as an image
			// No change to sheet.cells[key].type
		} else if (isNumeric(newText)) {
			sheet.cells[key].type = {
				name: 'number',
				details: {
					value: newText
				}
			};
		} else {
			sheet.cells[key].type = {
				name: 'text',
				details: {
					value: newText
				}
			};
		}

		// Update UI
		if (wasImage && newText === '') {
			// If reverting to image, we don't set innerText, the image element remains in contentDiv (which we just hid)
			// Actually, renderSheet will handle re-showing it correctly, but for immediate feedback:
			contentDiv.style.visibility = 'visible';
		} else {
			contentDiv.innerText = newText;
			contentDiv.style.visibility = 'visible';

			// If we overwrote an image, we need to clear the image HTML from contentDiv immediately
			// though renderSheet call below is cleaner.
		}

		if (!select) {
			contentDiv.style.fontWeight = editor.style.fontWeight;
			contentDiv.style.fontStyle = editor.style.fontStyle;
			contentDiv.style.textAlign = editor.style.textAlign;
			contentDiv.style.color = editor.style.color;
			contentDiv.style.fontSize = editor.style.fontSize;

			if (!sheet.cells[key].style) sheet.cells[key].style = {};
			sheet.cells[key].style.cssText = `color:${editor.style.color};font-weight:${editor.style.fontWeight};font-style:${editor.style.fontStyle};font-size:${editor.style.fontSize};text-align:${editor.style.textAlign};`;
		}

		editor.innerHTML = '';
		editor.style.display = 'none';
		editor.style.width = '';
		editor.style.height = '';
		editor.oninput = null;

		editingCell.classList.remove('edit-cell');
		window.isEditing = false;

		SheetDataManager.setModified(true);

		// Re-render to ensure correct display (especially if reverting to image or overwriting image)
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);

		if (typeof window.highlightCell === 'function') {
			window.highlightCell(editingCell);
		}
	}
}

// ... existing mergeCells, unmergeCells, attachResizeHandlers, initMenuHandlers ...
export function mergeCells() {
	if (!window.startCell || !window.endCell || window.startCell === window.endCell) return;

	if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

	const startRowIdx = window.startCell.parentElement.rowIndex;
	const endRowIdx = window.endCell.parentElement.rowIndex;

	const startRow = Math.min(startRowIdx, endRowIdx);
	const endRow = Math.max(startRowIdx, endRowIdx);

	const startCol = Math.min(parseInt(window.startCell.getAttribute('data-col')), parseInt(window.endCell.getAttribute('data-col')));
	const endCol = Math.max(parseInt(window.startCell.getAttribute('data-col')), parseInt(window.endCell.getAttribute('data-col')));

	const rowspan = endRow - startRow + 1;
	const colspan = endCol - startCol + 1;

	const tableRows = document.querySelectorAll('.spreadsheet tr');
	const topLeft = tableRows[startRow].querySelector('td[data-col="' + startCol + '"]');

	const mergedContent = [];

	for (let r = startRow; r <= endRow; r++) {
		for (let c = startCol; c <= endCol; c++) {
			const cell = tableRows[r].querySelector('td[data-col="' + c + '"]');

			if (cell) {
				const text = cell.querySelector('.content-cut').textContent.trim();
				if (text) {
					mergedContent.push(text);
				}

				if (r === startRow && c === startCol) {
					continue;
				}
				cell.remove();
			}
		}
	}

	topLeft.setAttribute('rowspan', rowspan);
	topLeft.setAttribute('colspan', colspan);
	topLeft.querySelector('.content-cut').textContent = mergedContent.join(' ');

	const totalWidth = window.getColumnWidthRange(startCol, endCol);
	topLeft.querySelector('.content-cut').style.width = (totalWidth - 3) + 'px';

	window.startCell = null;
	window.endCell = null;
	window.isSelecting = false;

	window.highlightCell(topLeft);
	window.updateSelection();
	window.saveState();
}

export function unmergeCells() {
	const cell = document.querySelector('.selected-cell');
	if (!cell) return;

	const rowspan = parseInt(cell.getAttribute('rowspan')) || 1;
	const colspan = parseInt(cell.getAttribute('colspan')) || 1;

	if (rowspan === 1 && colspan === 1) return;

	if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

	const startRow = cell.parentElement.rowIndex;
	const startCol = parseInt(cell.getAttribute('data-col'));

	const tableRows = document.querySelectorAll('.spreadsheet tr');

	for (let r = startRow; r < startRow + rowspan; r++) {
		for (let c = startCol; c < startCol + colspan; c++) {
			if (r === startRow && c === startCol) continue;

			const newCell = document.createElement('td');
			newCell.className = 'text-cell';
			newCell.setAttribute('data-col', c);
			const contentDiv = document.createElement('div');
			contentDiv.className = 'content-cut';
			newCell.appendChild(contentDiv);

			const colHeader = document.querySelector('.letter-cell[data-col="' + c + '"]');
			const colWidth = colHeader ? colHeader.offsetWidth : 100;
			contentDiv.style.width = (colWidth - 3) + 'px';

			const rowHeader = tableRows[r].querySelector('.counter-cell');
			const rowHeight = rowHeader ? rowHeader.offsetHeight : 25;
			contentDiv.style.height = (rowHeight - 3) + 'px';

			const row = tableRows[r];
			const cells = Array.from(row.querySelectorAll('td'));
			let prev = null;
			for (let i = cells.length - 1; i >= 0; i--) {
				if (parseInt(cells[i].getAttribute('data-col')) < c) {
					prev = cells[i];
					break;
				}
			}

			if (prev) {
				prev.insertAdjacentElement('afterend', newCell);
			} else {
				const firstTd = row.querySelector('td');
				if (firstTd) {
					firstTd.insertAdjacentElement('beforebegin', newCell);
				} else {
					row.appendChild(newCell);
				}
			}
		}
	}

	cell.removeAttribute('rowspan');
	cell.removeAttribute('colspan');

	const singleColHeader = document.querySelector('.letter-cell[data-col="' + startCol + '"]');
	const singleColWidth = singleColHeader ? singleColHeader.offsetWidth : 100;
	cell.querySelector('.content-cut').style.width = (singleColWidth - 3) + 'px';

	window.highlightCell(cell);
	window.saveState();
}

export function attachResizeHandlers() {
	console.log('Attaching row resize handlers...');
	const counterCells = document.querySelectorAll('.counter-cell:not(.processed)');
	counterCells.forEach(th => {
		const handle = document.createElement('div');
		handle.className = 'resize-handle-row';
		handle.style.zIndex = '50';

		th.appendChild(handle);

		handle.addEventListener('mousedown', function (e) {
			e.preventDefault();
			e.stopPropagation();

			if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

			const startHeight = th.offsetHeight;
			const startY = e.pageY;
			const row = th.parentElement;

			function onMouseMove(e) {
				const newHeight = Math.max(20, startHeight + (e.pageY - startY));
				th.style.height = newHeight + 'px';

				const contentDivs = row.querySelectorAll('.content-cut');
				contentDivs.forEach(div => {
					div.style.height = (newHeight - 3) + 'px';
				});
			}

			function onMouseUp() {
				const rowIndex = Array.from(row.parentElement.children).indexOf(row);
				const rowHeight = th.offsetHeight;

				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);

				window.updateRowHeight(rowIndex, rowHeight);
				if (typeof window.saveState === 'function') window.saveState();
			}

			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});

		th.classList.add('processed');
	});

	console.log('Attaching column resize handlers...');
	const letterCells = document.querySelectorAll('.letter-cell:not(.processed)');
	letterCells.forEach(cell => {
		const handle = document.createElement('div');
		handle.className = 'resize-handle';
		handle.style.zIndex = '50';

		cell.appendChild(handle);

		handle.addEventListener('mousedown', function (e) {
			e.preventDefault();
			e.stopPropagation();

			if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

			const startWidth = cell.offsetWidth;
			const startX = e.pageX;
			const table = document.querySelector('.spreadsheet');
			const startTableWidth = table.offsetWidth;
			const colIndex = parseInt(cell.getAttribute('data-col'));

			function onMouseMove(e) {
				const diff = e.pageX - startX;
				const newWidth = Math.max(30, startWidth + diff);
				const newTableWidth = startTableWidth + diff;

				cell.style.width = newWidth + 'px';
				table.style.width = newTableWidth + 'px';

				window.updateColumnWidth(colIndex, newWidth);
			}

			function onMouseUp() {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				if (typeof window.saveState === 'function') window.saveState();
			}

			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});

		cell.classList.add('processed');
	});
}

export function initMenuHandlers() {
	document.addEventListener('click', function (event) {
		const navDetails = document.querySelectorAll('.navbar details');
		navDetails.forEach(detail => {
			const isClickInside = detail.contains(event.target);
			const summary = detail.querySelector('summary');
			const isSummaryClick = summary && (event.target === summary || summary.contains(event.target));

			if (isClickInside) {
				if (isSummaryClick) {
					navDetails.forEach(other => {
						if (other !== detail) other.removeAttribute('open');
					});
				} else {
					detail.removeAttribute('open');
				}
			} else {
				if (detail.hasAttribute('open')) {
					detail.removeAttribute('open');
				}
			}
		});

		const dropdownContent = event.target.closest('.dropdown-content');
		if (dropdownContent) {
			if (event.target.closest('a') || event.target.closest('button')) {
				if (document.activeElement instanceof HTMLElement) {
					if (document.activeElement.closest('.dropdown')) {
						document.activeElement.blur();
					}
				}
			}
		}
	});
}