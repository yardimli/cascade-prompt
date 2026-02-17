import { SheetDataManager } from './cascade-prompt-data.js';

export const ImageManager = {
	activeTab: 'link',
	validImageUrl: null,

	openImageModal: function () {
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please select a cell first.');
			}
			return;
		}

		// Reset UI
		const input = document.getElementById('img-url-input');
		const previewImg = document.getElementById('img-preview-element');
		const previewText = document.querySelector('#img-url-preview span:not(#img-loading)');
		const errorLabel = document.getElementById('img-url-error');
		const insertBtn = document.getElementById('btn-insert-image');
		const loading = document.getElementById('img-loading');

		if (input) input.value = '';
		if (previewImg) {
			previewImg.src = '';
			previewImg.style.display = 'none';
		}
		if (previewText) previewText.style.display = 'block';
		if (errorLabel) errorLabel.style.display = 'none';
		if (insertBtn) insertBtn.disabled = true;
		if (loading) loading.style.display = 'none';

		this.validImageUrl = null;

		const modal = document.getElementById('imageModal');
		if (modal) {
			modal.showModal();
		}
	},

	switchTab: function (tabName) {
		this.activeTab = tabName;
	},

	handleUrlInput: function (url) {
		const previewImg = document.getElementById('img-preview-element');
		const previewText = document.querySelector('#img-url-preview span:not(#img-loading)');
		const errorLabel = document.getElementById('img-url-error');
		const insertBtn = document.getElementById('btn-insert-image');
		const loading = document.getElementById('img-loading');

		this.validImageUrl = null;
		insertBtn.disabled = true;
		errorLabel.style.display = 'none';

		if (!url || url.trim() === '') {
			previewImg.style.display = 'none';
			previewText.style.display = 'block';
			loading.style.display = 'none';
			return;
		}

		// Show loading state
		loading.style.display = 'block';
		previewText.style.display = 'none';
		previewImg.style.display = 'none';

		// Create a temp image to validate URL
		const tempImg = new Image();
		tempImg.onload = () => {
			loading.style.display = 'none';
			previewImg.src = url;
			previewImg.style.display = 'block';
			this.validImageUrl = url;
			insertBtn.disabled = false;
		};

		tempImg.onerror = () => {
			loading.style.display = 'none';
			previewText.style.display = 'block';
			errorLabel.style.display = 'block';
		};

		tempImg.src = url;
	},

	insertImage: function () {
		if (this.activeTab === 'link' && this.validImageUrl) {
			if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

			const selectedCell = document.querySelector('.selected-cell');
			if (selectedCell) {
				const r = selectedCell.parentElement.rowIndex - 1;
				const c = parseInt(selectedCell.getAttribute('data-col'));
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const key = r + '-' + c;

				// Initialize cell if needed
				if (!sheet.cells[key]) {
					sheet.cells[key] = {
						rowspan: 1,
						colspan: 1,
						style: {},
						cellStyle: {}
					};
				}

				// Set Type to Image
				sheet.cells[key].type = {
					name: 'image',
					details: {
						url: this.validImageUrl
					}
				};

				// Clean up other data types
				delete sheet.cells[key].text;
				delete sheet.cells[key].html;
				delete sheet.cells[key].llm;

				SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
				SheetDataManager.setModified(true);

				// Re-highlight to update formula bar
				setTimeout(() => {
					const newCell = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
					if (newCell && typeof window.highlightCell === 'function') {
						window.highlightCell(newCell);
					}
				}, 0);
			}
		}

		document.getElementById('imageModal').close();
	}
};