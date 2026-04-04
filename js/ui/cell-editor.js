import { SheetDataManager } from '../cascade-prompt-data.js';
import { DropdownManager } from './dropdown-manager.js';

export const CellEditor = {
	makeCellEditable: function(cell) {
		if (!cell.classList.contains('selected-cell')) window.highlightCell(cell);

		const r = cell.parentElement.rowIndex - 1;
		const c = parseInt(cell.getAttribute('data-col'));
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const cellData = sheet.cells[`${r}-${c}`];
		const isCheckbox = cellData && cellData.type && cellData.type.name === 'checkbox';

		if (cell.querySelector('.llm-run-btn') || isCheckbox) {
			if (typeof window.showToast === 'function') {
				window.showToast(isCheckbox ? 'Checkbox cells cannot be edited directly.' : 'LLM Button cells cannot be edited directly.');
			}
			return;
		}

		if (!cell.classList.contains('edit-cell')) cell.classList.add('edit-cell');
		document.querySelectorAll('.spreadsheet .area-selected-cell').forEach(el => el.classList.remove('area-selected-cell'));

		const contentDiv = cell.querySelector('.content-cut');
		const editor = document.getElementById('cell-editor');
		const computedStyle = window.getComputedStyle(contentDiv);

		Object.assign(editor.style, {
			position: 'absolute', top: cell.offsetTop + 'px', left: cell.offsetLeft + 'px',
			width: cell.offsetWidth + 'px', height: cell.offsetHeight + 'px',
			minWidth: cell.offsetWidth + 'px', minHeight: cell.offsetHeight + 'px', display: 'block',
			textAlign: computedStyle.textAlign, fontWeight: computedStyle.fontWeight,
			fontStyle: computedStyle.fontStyle, color: computedStyle.color,
			fontSize: computedStyle.fontSize, fontFamily: computedStyle.fontFamily,
			backgroundColor: window.getComputedStyle(cell).backgroundColor
		});

		const isDropdown = cellData && cellData.type && cellData.type.name === 'dropdown';
		const isImage = cellData && cellData.type && cellData.type.name === 'image';

		if (isDropdown) {
			this.setupDropdownEditor(editor, cellData, computedStyle, cell);
		} else if (isImage) {
			editor.innerText = ''; editor.contentEditable = true; editor.style.padding = '2px 5px'; editor.focus();
			contentDiv.style.visibility = 'hidden';
		} else {
			editor.innerText = contentDiv.innerText; editor.contentEditable = true; editor.style.padding = '2px 5px'; editor.focus();
			editor.oninput = function() {
				this.style.height = 'auto'; this.style.width = 'auto';
				this.style.height = Math.max(this.scrollHeight, cell.offsetHeight) + 'px';
				this.style.width = Math.max(this.scrollWidth, cell.offsetWidth) + 'px';
			};
			editor.dispatchEvent(new Event('input'));
			contentDiv.style.visibility = 'hidden';
		}
		window.isEditing = true;
		if (typeof window.updateSelection === 'function') window.updateSelection();
	},

	setupDropdownEditor: function(editor, cellData, computedStyle, cell) {
		const wrapper = document.createElement('div');
		wrapper.className = 'floating-select-wrapper w-full h-full';
		const select = document.createElement('select');
		select.className = 'select select-xs w-full h-full rounded-none focus:outline-none min-h-0 block p-0 m-0';
		Object.assign(select.style, {
			textAlign: computedStyle.textAlign, fontWeight: computedStyle.fontWeight,
			fontSize: computedStyle.fontSize, fontFamily: computedStyle.fontFamily,
			color: computedStyle.color, backgroundColor: window.getComputedStyle(cell).backgroundColor,
			border: 'none', outline: 'none', boxShadow: 'none', padding: '0 5px'
		});

		(cellData.type.details.options ||[]).forEach(opt => {
			const option = document.createElement('option');
			option.value = opt; option.textContent = opt;
			if (opt === (cellData.type.details.selected || '')) option.selected = true;
			select.appendChild(option);
		});

		select.addEventListener('change', () => window.stopEditing());
		select.addEventListener('blur', () => window.stopEditing());
		select.addEventListener('click', (e) => e.stopPropagation());

		wrapper.appendChild(select);
		editor.innerHTML = ''; editor.appendChild(wrapper); editor.contentEditable = false; editor.style.padding = '0';
		select.focus();
		try { if (typeof select.showPicker === 'function') select.showPicker(); } catch (e) {}
	},

	stopEditing: function() {
		if (!window.isEditing) return;
		const editingCell = document.querySelector('.edit-cell');
		const editor = document.getElementById('cell-editor');
		if (editingCell) {
			const contentDiv = editingCell.querySelector('.content-cut');
			const r = editingCell.parentElement.rowIndex - 1;
			const c = parseInt(editingCell.getAttribute('data-col'));
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = `${r}-${c}`;

			const select = editor.querySelector('select');
			let newText = select ? select.value : editor.innerText;
			const oldText = contentDiv.innerText;
			const wasImage = sheet.cells[key] && sheet.cells[key].type && sheet.cells[key].type.name === 'image';

			if (newText !== oldText || select || (wasImage && newText !== '')) {
				if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
			}

			if (!sheet.cells[key]) sheet.cells[key] = { rowspan: parseInt(editingCell.getAttribute('rowspan')) || 1, colspan: parseInt(editingCell.getAttribute('colspan')) || 1, style: {}, cellStyle: {} };

			if (select) {
				sheet.cells[key].type = { name: 'dropdown', details: { options: sheet.cells[key].type?.details?.options ||[], selected: newText } };
			} else if (!(wasImage && newText === '')) {
				const isNum = typeof newText === "number" ? Number.isFinite(newText) : (typeof newText === "string" && newText.trim() !== "" && Number.isFinite(Number(newText)));
				sheet.cells[key].type = { name: isNum ? 'number' : 'text', details: { value: newText } };
			}

			if (!select) {
				if (!sheet.cells[key].style) sheet.cells[key].style = {};
				sheet.cells[key].style.cssText = `color:${editor.style.color};font-weight:${editor.style.fontWeight};font-style:${editor.style.fontStyle};font-size:${editor.style.fontSize};text-align:${editor.style.textAlign};`;
			}

			editor.innerHTML = ''; editor.style.display = 'none'; editor.oninput = null;
			editingCell.classList.remove('edit-cell');
			window.isEditing = false;
			SheetDataManager.setModified(true);
			SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);

			const propPanel = document.getElementById('property-panel');
			if (propPanel && !propPanel.classList.contains('hidden')) {
				const target = SheetDataManager.propertyPanel?.targetedCell;
				if (target && target.r === r && target.c === c) {
					DropdownManager.populatePanelData();
				}
			}

			if (typeof window.highlightCell === 'function') window.highlightCell(editingCell);
		}
	}
};