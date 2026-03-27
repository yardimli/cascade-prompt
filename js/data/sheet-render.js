export const SheetRender = {
	renderSheet: function (manager, index) {
		const startTime = performance.now();
		const sheet = manager.data.sheets[index];
		if (!sheet) return;

		if (typeof window.stopEditing === 'function') window.stopEditing();

		const classesToRemove = ['selected-cell', 'highlight', 'area-selected-cell'];
		classesToRemove.forEach(cls => {
			const els = document.getElementsByClassName(cls);
			while (els.length > 0) els[0].classList.remove(cls);
		});

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
			const letter = manager.getColumnLetter(c);
			const width = sheet.colWidths[c] || manager.defaults.defaultColWidth;
			headerHTML += `<th class="letter-cell" data-col="${c}" style="width: ${width}px;">${letter}</th>`;
			tableWidth += width;
		}
		thead.rows[0].innerHTML = headerHTML;
		table.style.width = (tableWidth + 50) + 'px';

		let bodyHTML = '';
		for (let r = 0; r < sheet.rowCount; r++) {
			const height = sheet.rowHeights[r] || manager.defaults.defaultRowHeight;
			bodyHTML += '<tr>';
			bodyHTML += `<th class="counter-cell" style="height: ${height}px;">${r + 1}</th>`;

			for (let c = 0; c < sheet.colCount; c++) {
				if (manager.isCellHiddenByMerge(sheet, r, c)) continue;

				const cellKey = r + '-' + c;
				const cellData = sheet.cells[cellKey];
				let cellHTML = '';
				let tdAttrs = `class="text-cell" data-col="${c}"`;
				let tdStyle = '';
				let cellWidth = sheet.colWidths[c] || manager.defaults.defaultColWidth;
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
							cellWidth += (sheet.colWidths[c + k] || manager.defaults.defaultColWidth);
						}
					}
					if (cellData.rowspan > 1) {
						cellHeight = 0;
						for (let k = 0; k < cellData.rowspan; k++) {
							cellHeight += (sheet.rowHeights[r + k] || manager.defaults.defaultRowHeight);
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
						} else if (typeName === 'dropdown') {
							const selectedVal = details.selected || '';
							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle}">${selectedVal}</div>`;
						} else if (typeName === 'checkbox') {
							const isChecked = details.value ? 'checked' : '';
							const label = details.label || '';
							const content = `<label class="cursor-pointer label justify-start gap-2 p-0 h-full w-full" style="pointer-events: auto;">
								<input type="checkbox" class="checkbox checkbox-sm checkbox-primary" ${isChecked} onchange="window.CheckboxManager.toggleCheckbox(${r}, ${c}, this.checked)" />
								<span class="label-text truncate">${label}</span>
							</label>`;
							cellHTML = `<div class="content-cut flex items-center" style="${divStyle}${userStyle}">${content}</div>`;
						} else if (typeName === 'image') {
							let src = '';

							if (details.url) {

								src = details.url;
							} else if (details.path) {

								const baseUrl = import.meta.env.BASE_URL;

								const cleanPath = details.path.startsWith('/') ? details.path.slice(1) : details.path;

								src = baseUrl + cleanPath;
							}

							cellHTML = `<div class="content-cut" style="${divStyle}${userStyle} display: flex; justify-content: center; align-items: center; overflow: hidden;">
        <img src="${src}" style="max-width: 100%; max-height: 100%; object-fit: contain; pointer-events: none;">
    </div>`;
						} else {
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
			manager.rebindResizeHandlers();
			manager.restoreSelection(sheet, tbody);
		});
		console.log('Sheet rendered in ' + (performance.now() - startTime).toFixed(2) + ' ms');
	},

	restoreSelection: function (sheet, tbody) {
		if (sheet.selection && sheet.selection.active) {
			const activeR = sheet.selection.active.r;
			const activeC = sheet.selection.active.c;
			const targetRow = tbody.children[activeR];
			if (targetRow) {
				const targetCell = targetRow.querySelector(`td[data-col="${activeC}"]`);
				if (targetCell) {
					if (typeof window.highlightCell === 'function') window.highlightCell(targetCell);
					if (sheet.selection.range) {
						const { startR, startC, endR, endC } = sheet.selection.range;
						const startRow = tbody.children[startR];
						const endRow = tbody.children[endR];
						if (startRow && endRow) {
							const domStart = startRow.querySelector(`td[data-col="${startC}"]`);
							const domEnd = endRow.querySelector(`td[data-col="${endC}"]`);
							if (domStart && domEnd) {
								window.startCell = domStart;
								window.endCell = domEnd;
								window.isSelecting = false;
								if (typeof window.updateSelection === 'function') window.updateSelection();
							}
						}
					}
				}
			}
		}
	}
};