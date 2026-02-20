import { SheetDataManager } from '../cascade-prompt-data.js';

export const FormatManager = {
	savedRange: null,
	activeColorMode: null,

	toggleStyle: function (command) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		if (window.isEditing) {
			document.execCommand(command, false, null);
		} else {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (!contentDiv) return;

				const btn = contentDiv.querySelector('.llm-run-btn');
				const target = btn || contentDiv;

				if (command === 'bold') {
					target.style.fontWeight = (target.style.fontWeight === 'bold') ? 'normal' : 'bold';
				} else if (command === 'italic') {
					target.style.fontStyle = (target.style.fontStyle === 'italic') ? 'normal' : 'italic';
				}
			});
			if (typeof window.saveState === 'function') window.saveState();
		}
	},

	setFontSize: function (size) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		let pixelSize = '14px';
		switch (size) {
			case 'small':
				pixelSize = '11px';
				break;
			case 'normal':
				pixelSize = '14px';
				break;
			case 'large':
				pixelSize = '18px';
				break;
			case 'xl':
				pixelSize = '24px';
				break;
		}

		if (window.isEditing) {
			const editor = document.getElementById('cell-editor');
			if (editor) editor.style.fontSize = pixelSize;
		} else {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (contentDiv) {
					const btn = contentDiv.querySelector('.llm-run-btn');
					const target = btn || contentDiv;
					target.style.fontSize = pixelSize;
				}
			});
			if (typeof window.saveState === 'function') window.saveState();
		}
	},

	toggleFontSizeMenu: function (btn) {
		this.saveSelectionContext();
		const dropdownContent = btn.nextElementSibling;
		const isActive = dropdownContent.classList.contains('active');

		document.querySelectorAll('.border-dropdown.active').forEach(el => el.classList.remove('active'));
		document.querySelectorAll('.dropdown-content.active').forEach(el => el.classList.remove('active'));

		if (!isActive) {
			dropdownContent.classList.add('active');
			const closeMenu = function (e) {
				if (!dropdownContent.contains(e.target) && !btn.contains(e.target)) {
					dropdownContent.classList.remove('active');
					document.removeEventListener('click', closeMenu);
				}
			};
			setTimeout(() => document.addEventListener('click', closeMenu), 0);
		}
	},

	setAlignment: function (align) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		if (window.isEditing) {
			document.execCommand('justify' + align, false, null);
		} else {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				if (contentDiv) {
					const btn = contentDiv.querySelector('.llm-run-btn');
					const target = btn || contentDiv;
					target.style.textAlign = align;
				}
			});
			if (typeof window.saveState === 'function') window.saveState();
		}
	},

	openColorDialog: function (mode) {
		this.activeColorMode = mode;
		this.saveSelectionContext();

		const modal = document.getElementById('colorPickerModal');
		const modalTitle = document.getElementById('colorPickerTitle');
		const colorInput = document.getElementById('modal-color-input');

		if (mode === 'text') modalTitle.textContent = 'Text Color';
		else if (mode === 'background') modalTitle.textContent = 'Background Color';
		else if (mode === 'border') modalTitle.textContent = 'Border Color';

		colorInput.value = '#000000';
		modal.showModal();
	},

	applyColorDialog: function () {
		const colorInput = document.getElementById('modal-color-input');
		const color = colorInput.value;
		const mode = this.activeColorMode;

		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		if (mode === 'text') {
			if (window.isEditing) {
				document.execCommand('foreColor', false, color);
			} else {
				this.applyToSelection(function (cell) {
					const contentDiv = cell.querySelector('.content-cut');
					if (contentDiv) {
						const btn = contentDiv.querySelector('.llm-run-btn');
						const target = btn || contentDiv;
						target.style.color = color;
					}
				}, true);
			}
		} else if (mode === 'background') {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				const btn = contentDiv ? contentDiv.querySelector('.llm-run-btn') : null;
				if (btn) {
					btn.style.backgroundColor = color;
				} else {
					cell.style.backgroundColor = color;
				}
			}, true);
		} else if (mode === 'border') {
			this.setBorder('all', color);
		}

		if (typeof window.saveState === 'function') window.saveState();
		document.getElementById('colorPickerModal').close();
	},

	resetColorDialog: function () {
		const mode = this.activeColorMode;
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		if (mode === 'text') {
			if (window.isEditing) {
				document.execCommand('removeFormat', false, 'foreColor');
			} else {
				this.applyToSelection(function (cell) {
					const contentDiv = cell.querySelector('.content-cut');
					if (contentDiv) {
						const btn = contentDiv.querySelector('.llm-run-btn');
						const target = btn || contentDiv;
						target.style.color = '';
					}
				}, true);
			}
		} else if (mode === 'background') {
			this.applyToSelection(function (cell) {
				const contentDiv = cell.querySelector('.content-cut');
				const btn = contentDiv ? contentDiv.querySelector('.llm-run-btn') : null;
				if (btn) {
					btn.style.backgroundColor = '';
				} else {
					cell.style.backgroundColor = '';
				}
			}, true);
		} else if (mode === 'border') {
			this.setBorder('none');
		}

		if (typeof window.saveState === 'function') window.saveState();
		document.getElementById('colorPickerModal').close();
	},

	setBorder: function (type, color) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const borderColor = color || '#000000';
		const borderStyle = '1px solid ' + borderColor;
		let range = null;
		let sR, eR, sC, eC;

		if (this.savedRange) {
			sR = this.savedRange.sR;
			eR = this.savedRange.eR;
			sC = this.savedRange.sC;
			eC = this.savedRange.eC;
		} else if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			sR = Math.min(r1, r2);
			eR = Math.max(r1, r2);
			sC = Math.min(c1, c2);
			eC = Math.max(c1, c2);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				sR = selected.parentElement.rowIndex;
				eR = sR;
				sC = parseInt(selected.getAttribute('data-col'));
				eC = sC;
			}
		}

		if (sR !== undefined) {
			range = { minR: sR, maxR: eR, minC: sC, maxC: eC };
		}

		this.applyToSelection(function (cell) {
			if (type === 'none') {
				cell.style.border = '';
				cell.style.borderLeft = '';
				cell.style.borderRight = '';
				cell.style.borderTop = '';
				cell.style.borderBottom = '';
				return;
			}

			const r = cell.parentElement.rowIndex;
			const c = parseInt(cell.getAttribute('data-col'));

			if (type === 'all') {
				cell.style.border = borderStyle;
			} else if (type === 'left') {
				cell.style.borderLeft = borderStyle;
			} else if (type === 'right') {
				cell.style.borderRight = borderStyle;
			} else if (type === 'top') {
				cell.style.borderTop = borderStyle;
			} else if (type === 'bottom') {
				cell.style.borderBottom = borderStyle;
			} else if (type === 'outer' && range) {
				if (c === range.minC) cell.style.borderLeft = borderStyle;
				if (c === range.maxC) cell.style.borderRight = borderStyle;
				if (r === range.minR) cell.style.borderTop = borderStyle;
				if (r === range.maxR) cell.style.borderBottom = borderStyle;
			}
		}, true);

		if (typeof window.saveState === 'function') window.saveState();
	},

	applyToSelection: function (callback, useSaved) {
		if (useSaved && this.savedRange) {
			const { sR, eR, sC, eC } = this.savedRange;
			const table = document.querySelector('.spreadsheet');
			for (let r = sR; r <= eR; r++) {
				const row = table.rows[r];
				if (!row) continue;
				for (let c = sC; c <= eC; c++) {
					const cell = row.querySelector(`td[data-col="${c}"]`);
					if (cell) callback(cell);
				}
			}
			this.savedRange = null;
			return;
		}

		const areaCells = document.querySelectorAll('.area-selected-cell');
		if (areaCells.length > 0) {
			areaCells.forEach(callback);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				callback(selected);
			}
		}
	},

	saveSelectionContext: function () {
		let sR, sC, eR, eC;
		if (window.startCell && window.endCell) {
			const r1 = window.startCell.parentElement.rowIndex;
			const c1 = parseInt(window.startCell.getAttribute('data-col'));
			const r2 = window.endCell.parentElement.rowIndex;
			const c2 = parseInt(window.endCell.getAttribute('data-col'));
			sR = Math.min(r1, r2);
			eR = Math.max(r1, r2);
			sC = Math.min(c1, c2);
			eC = Math.max(c1, c2);
		} else {
			const selected = document.querySelector('.selected-cell');
			if (selected) {
				sR = selected.parentElement.rowIndex;
				eR = sR;
				sC = parseInt(selected.getAttribute('data-col'));
				eC = sC;
			} else {
				this.savedRange = null;
				return;
			}
		}
		this.savedRange = { sR, eR, sC, eC };
	},

	toggleBorderMenu: function () {
		this.saveSelectionContext();
		const dropdown = document.getElementById('border-dropdown');
		dropdown.classList.toggle('active');
		const closeMenu = function (e) {
			if (!dropdown.contains(e.target) && !e.target.closest('#btn-borders')) {
				dropdown.classList.remove('active');
				document.removeEventListener('click', closeMenu);
			}
		};
		setTimeout(() => document.addEventListener('click', closeMenu), 0);
	}
};