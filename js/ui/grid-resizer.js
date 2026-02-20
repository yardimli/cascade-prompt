export const GridResizer = {
	attachResizeHandlers: function() {
		console.log('Attaching resize handlers...');
		document.querySelectorAll('.counter-cell:not(.processed)').forEach(th => {
			const handle = document.createElement('div');
			handle.className = 'resize-handle-row'; handle.style.zIndex = '50';
			th.appendChild(handle);
			handle.addEventListener('mousedown', (e) => this.initRowResize(e, th));
			th.classList.add('processed');
		});

		document.querySelectorAll('.letter-cell:not(.processed)').forEach(cell => {
			const handle = document.createElement('div');
			handle.className = 'resize-handle'; handle.style.zIndex = '50';
			cell.appendChild(handle);
			handle.addEventListener('mousedown', (e) => this.initColResize(e, cell));
			cell.classList.add('processed');
		});
	},

	initRowResize: function(e, th) {
		e.preventDefault(); e.stopPropagation();
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		const startHeight = th.offsetHeight, startY = e.pageY, row = th.parentElement;

		const onMouseMove = (e) => {
			const newHeight = Math.max(20, startHeight + (e.pageY - startY));
			th.style.height = newHeight + 'px';
			row.querySelectorAll('.content-cut').forEach(div => div.style.height = (newHeight - 3) + 'px');
		};
		const onMouseUp = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			window.updateRowHeight(Array.from(row.parentElement.children).indexOf(row), th.offsetHeight);
			if (typeof window.saveState === 'function') window.saveState();
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	},

	initColResize: function(e, cell) {
		e.preventDefault(); e.stopPropagation();
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		const startWidth = cell.offsetWidth, startX = e.pageX;
		const table = document.querySelector('.spreadsheet');
		const startTableWidth = table.offsetWidth, colIndex = parseInt(cell.getAttribute('data-col'));

		const onMouseMove = (e) => {
			const diff = e.pageX - startX;
			const newWidth = Math.max(30, startWidth + diff);
			cell.style.width = newWidth + 'px';
			table.style.width = (startTableWidth + diff) + 'px';
			window.updateColumnWidth(colIndex, newWidth);
		};
		const onMouseUp = () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			if (typeof window.saveState === 'function') window.saveState();
		};
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);
	}
};