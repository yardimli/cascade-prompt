export const SheetDOM = {
	collectDOMData: function (manager, sheetObj) {
		function isNumeric(v) {
			return typeof v === "number" ? Number.isFinite(v) : (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)));
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
				if (Math.abs(h - manager.defaults.defaultRowHeight) > 1) rowHeights[r] = h;
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

				let typeObj = { name: 'text', details: { value: innerText } };
				const existingCell = oldCells[cellKey];

				if (existingCell && existingCell.type) {
					if (['llm_formula', 'dropdown'].includes(existingCell.type.name)) {
						typeObj = existingCell.type.name === 'llm_formula'
							? JSON.parse(JSON.stringify(existingCell.type))
							: { name: 'dropdown', details: { options: existingCell.type.details.options || [], selected: innerText } };
					} else if (existingCell.type.name === 'image') {
						typeObj = (innerText === '')
							? JSON.parse(JSON.stringify(existingCell.type))
							: (isNumeric(innerText) ? { name: 'number', details: { value: innerText } } : { name: 'text', details: { value: innerText } });
					} else {
						typeObj = isNumeric(innerText) ? { name: 'number', details: { value: innerText } } : { name: 'text', details: { value: innerText } };
					}
				} else if (isNumeric(innerText)) {
					typeObj = { name: 'number', details: { value: innerText } };
				}

				const style = {};
				const allowedStyles = ['color', 'backgroundColor', 'fontWeight', 'fontStyle', 'fontSize', 'textAlign'];
				let cleanCssText = '';
				const styleSource = contentDiv.querySelector('.llm-run-btn') || contentDiv;

				allowedStyles.forEach(prop => {
					if (styleSource.style[prop]) {
						const kebabProp = prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
						cleanCssText += `${kebabProp}:${styleSource.style[prop]};`;
					}
				});
				if (cleanCssText.length > 0) style.cssText = cleanCssText;

				const cellStyle = {};
				if (cell.style.backgroundColor) cellStyle.backgroundColor = cell.style.backgroundColor;
				['border', 'borderLeft', 'borderRight', 'borderTop', 'borderBottom'].forEach(prop => {
					if (cell.style[prop]) cellStyle[prop] = cell.style[prop];
				});

				if ((typeObj.name === 'text' && typeObj.details.value !== '') || ['dropdown', 'llm_formula', 'image'].includes(typeObj.name) || Object.keys(style).length > 0 || Object.keys(cellStyle).length > 0 || rowspan > 1 || colspan > 1) {
					cells[cellKey] = { type: typeObj, rowspan, colspan, style, cellStyle };
				}
			}
		}

		const headerCells = table.querySelectorAll('thead th.letter-cell');
		headerCells.forEach(cell => {
			const index = parseInt(cell.getAttribute('data-col'));
			const w = cell.offsetWidth;
			if (Math.abs(w - manager.defaults.defaultColWidth) > 1) colWidths[index] = w;
		});

		sheetObj.rowCount = rows.length;
		sheetObj.colCount = headerCells.length;
		sheetObj.cells = cells;
		sheetObj.colWidths = colWidths;
		sheetObj.rowHeights = rowHeights;

		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			sheetObj.selection = {
				active: { r: selectedCell.parentElement.rowIndex - 1, c: parseInt(selectedCell.getAttribute('data-col')) },
				range: null
			};
			if (window.startCell && window.endCell && window.startCell !== window.endCell) {
				sheetObj.selection.range = {
					startR: window.startCell.parentElement.rowIndex - 1,
					startC: parseInt(window.startCell.getAttribute('data-col')),
					endR: window.endCell.parentElement.rowIndex - 1,
					endC: parseInt(window.endCell.getAttribute('data-col'))
				};
			}
		} else {
			sheetObj.selection = null;
		}
		return sheetObj;
	}
};