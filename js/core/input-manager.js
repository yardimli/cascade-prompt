import { SheetDataManager } from '../cascade-prompt-data.js';

export function initKeypressListeners() {
	const cellEditor = document.getElementById('cell-editor');
	const formulaInput = document.getElementById('formula-input');

	cellEditor.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') {
			if (!e.shiftKey) {
				e.preventDefault();
				e.stopPropagation();
				console.log('Cell Editor Enter key pressed');

				const editingCell = document.querySelector('.edit-cell');
				if (editingCell) {
					const currentRow = editingCell.closest('tr');
					const nextRow = currentRow ? currentRow.nextElementSibling : null;

					window.stopEditing();
					if (typeof window.saveState === 'function') window.saveState();

					if (nextRow) {
						const cellCol = parseInt(editingCell.getAttribute('data-col'));
						const nextCell = nextRow.querySelector('td[data-col="' + cellCol + '"]');
						if (nextCell) {
							window.highlightCell(nextCell);
						}
					}
				}
			}
		}
	});

	cellEditor.addEventListener('input', function () {
		if (window.isEditing) {
			if (this.querySelector('select')) return;
			formulaInput.textContent = this.textContent;
		}
	});

	document.addEventListener('keydown', function (e) {

		const openDialog = document.querySelector('dialog[open]');
		if (openDialog) {
			return;
		}

		if (e.target.closest('#property-panel')) {
			return;
		}

		if ((e.ctrlKey || e.metaKey) && !window.isEditing) {
			if (e.key === 'z') {
				e.preventDefault();
				if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.undo();
				return;
			}
			if (e.key === 'y') {
				e.preventDefault();
				if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.redo();
				return;
			}
			if (e.key === 'b') {
				e.preventDefault();
				if (typeof window.FormatManager !== 'undefined') window.FormatManager.toggleStyle('bold');
				return;
			}
			if (e.key === 'i') {
				e.preventDefault();
				if (typeof window.FormatManager !== 'undefined') window.FormatManager.toggleStyle('italic');
				return;
			}
			if (e.key === 'c') {
				e.preventDefault();
				if (typeof window.ClipboardManager !== 'undefined') window.ClipboardManager.copy(false);
				return;
			}
			if (e.key === 'x') {
				e.preventDefault();
				if (typeof window.ClipboardManager !== 'undefined') window.ClipboardManager.cut();
				return;
			}
			if (e.key === 'v') {
				e.preventDefault();
				if (typeof window.ClipboardManager !== 'undefined') window.ClipboardManager.paste();
				return;
			}
		}

		if (e.key === 'Delete' && !window.isEditing) {
			e.preventDefault();
			if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];

			const clearCell = (cell) => {
				const r = cell.parentElement.rowIndex - 1;
				const c = parseInt(cell.getAttribute('data-col'));
				const key = r + '-' + c;

				const contentDiv = cell.querySelector('.content-cut');
				if (contentDiv) {
					contentDiv.innerHTML = '';
					contentDiv.textContent = '';
				}

				if (sheet.cells[key]) {
					sheet.cells[key].text = '';
					sheet.cells[key].html = '';
					if (sheet.cells[key].llm) {
						delete sheet.cells[key].llm;
					}
				}
			};

			const areaCells = document.querySelectorAll('.area-selected-cell');
			if (areaCells.length > 0) {
				areaCells.forEach(clearCell);
			} else {
				const selected = document.querySelector('.selected-cell');
				if (selected) clearCell(selected);
			}

			SheetDataManager.setModified(true);
			if (typeof window.updateSelection === 'function') window.updateSelection();
			return;
		}

		if (window.isEditing) return;

		window.isSelecting = false;
		document.querySelectorAll('.spreadsheet .area-selected-cell').forEach(el => el.classList.remove('area-selected-cell'));

		window.startCell = null;
		window.endCell = null;
		window.updateSelection();

		const selectedCell = document.querySelector('.selected-cell');
		if (!selectedCell) return;

		const row = selectedCell.closest('tr');
		const rows = Array.from(document.querySelectorAll('.spreadsheet tbody tr'));
		const rowIndex = rows.indexOf(row);

		const cellCol = parseInt(selectedCell.getAttribute('data-col'));
		const colspan = parseInt(selectedCell.getAttribute('colspan')) || 1;

		switch (e.key) {
			case 'Enter':
				e.preventDefault();
				console.log('Document Enter key pressed');
				if (!window.isEditing) {
					window.makeCellEditable(selectedCell);
				}
				break;
			case 'ArrowLeft':
				e.preventDefault();
				if (cellCol > 0) {
					const cells = Array.from(row.querySelectorAll('td'));
					let prevCell = null;
					for (let i = cells.length - 1; i >= 0; i--) {
						if (parseInt(cells[i].getAttribute('data-col')) < cellCol) {
							prevCell = cells[i];
							break;
						}
					}
					if (prevCell) {
						window.highlightCell(prevCell);
					}
				}
				break;
			case 'ArrowRight':
				e.preventDefault();
				var targetCol = cellCol + colspan;
				var nextCell = row.querySelector('td[data-col="' + targetCol + '"]');
				if (nextCell) {
					window.highlightCell(nextCell);
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (rowIndex > 0) {
					const prevRow = rows[rowIndex - 1];
					const cells = Array.from(prevRow.querySelectorAll('td'));
					const target = cells.find(function (cell) {
						const c = parseInt(cell.getAttribute('data-col'));
						const span = parseInt(cell.getAttribute('colspan')) || 1;
						return c <= cellCol && (c + span) > cellCol;
					});
					if (target) {
						window.highlightCell(target);
					}
				}
				break;
			case 'ArrowDown':
				e.preventDefault();
				if (rowIndex < rows.length - 1) {
					const nextRow = rows[rowIndex + 1];
					const cells = Array.from(nextRow.querySelectorAll('td'));
					const target = cells.find(function (cell) {
						const c = parseInt(cell.getAttribute('data-col'));
						const span = parseInt(cell.getAttribute('colspan')) || 1;
						return c <= cellCol && (c + span) > cellCol;
					});
					if (target) {
						window.highlightCell(target);
					}
				}
				break;
		}
	});
}