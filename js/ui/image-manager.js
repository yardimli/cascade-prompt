import { SheetDataManager } from '../cascade-prompt-data.js';
import { getApiEndpoint } from '../api-config.js';

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

		// Reset UI - Link Tab
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

		// Reset UI - Upload Tab
		const fileInput = document.getElementById('img-upload-input');
		const progressContainer = document.getElementById('img-upload-progress-container');
		const uploadError = document.getElementById('img-upload-error');

		if (fileInput) fileInput.value = '';
		if (progressContainer) progressContainer.style.display = 'none';
		if (uploadError) {
			uploadError.style.display = 'none';
			uploadError.textContent = '';
		}

		this.validImageUrl = null;
		this.switchTab('link'); // Default to link tab

		// Reset Tabs UI
		const tabs = document.getElementsByName('image_insert_tabs');
		if(tabs.length > 0) tabs[0].checked = true;

		const modal = document.getElementById('imageModal');
		if (modal) {
			modal.showModal();
		}
	},

	switchTab: function (tabName) {
		this.activeTab = tabName;
		const insertBtn = document.getElementById('btn-insert-image');
		// Hide insert button on upload tab because upload happens automatically/immediately
		if (insertBtn) {
			insertBtn.style.display = tabName === 'upload' ? 'none' : 'inline-flex';
		}
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

	handleFileUpload: function(files) {
		if (!files || files.length === 0) return;

		const file = files[0];
		const progressContainer = document.getElementById('img-upload-progress-container');
		const progressBar = document.getElementById('img-upload-progress');
		const progressText = document.getElementById('img-upload-pct');
		const uploadError = document.getElementById('img-upload-error');

		// Client-side validation
		if (file.size > 10 * 1024 * 1024) {
			uploadError.textContent = 'File too large. Max 10MB.';
			uploadError.style.display = 'block';
			return;
		}
		if (!['image/jpeg', 'image/png'].includes(file.type)) {
			uploadError.textContent = 'Invalid file type. Only JPG and PNG allowed.';
			uploadError.style.display = 'block';
			return;
		}

		uploadError.style.display = 'none';
		progressContainer.style.display = 'block';
		progressBar.value = 0;
		progressText.textContent = '0%';

		const formData = new FormData();
		formData.append('image', file);

		const xhr = new XMLHttpRequest();
		xhr.open('POST', getApiEndpoint('upload_image'), true);

		xhr.upload.onprogress = function(e) {
			if (e.lengthComputable) {
				const percentComplete = Math.round((e.loaded / e.total) * 100);
				progressBar.value = percentComplete;
				progressText.textContent = percentComplete + '%';
			}
		};

		xhr.onload = () => {
			if (xhr.status === 200) {
				try {
					const response = JSON.parse(xhr.responseText);
					if (response.success) {
						this.insertUploadedImage(response.path);
					} else {
						uploadError.textContent = response.message || 'Upload failed.';
						uploadError.style.display = 'block';
						progressContainer.style.display = 'none';
					}
				} catch (e) {
					uploadError.textContent = 'Invalid server response.';
					uploadError.style.display = 'block';
					progressContainer.style.display = 'none';
				}
			} else {
				uploadError.textContent = 'Upload error: ' + xhr.statusText;
				uploadError.style.display = 'block';
				progressContainer.style.display = 'none';
			}
		};

		xhr.onerror = () => {
			uploadError.textContent = 'Network error occurred.';
			uploadError.style.display = 'block';
			progressContainer.style.display = 'none';
		};

		xhr.send(formData);
	},

	insertUploadedImage: function(path) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

		const selectedCell = document.querySelector('.selected-cell');
		if (selectedCell) {
			const r = selectedCell.parentElement.rowIndex - 1;
			const c = parseInt(selectedCell.getAttribute('data-col'));
			const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
			const key = r + '-' + c;

			if (!sheet.cells[key]) {
				sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
			}

			// Structure for uploaded image
			sheet.cells[key].type = {
				name: 'image',
				details: {
					path: path
				}
			};

			delete sheet.cells[key].text;
			delete sheet.cells[key].html;
			delete sheet.cells[key].llm;

			SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
			SheetDataManager.setModified(true);

			// Re-highlight
			setTimeout(() => {
				const newCell = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"]`);
				if (newCell && typeof window.highlightCell === 'function') {
					window.highlightCell(newCell);
				}
			}, 0);
		}

		document.getElementById('imageModal').close();
	},

	insertImage: function () {
		// This is for the URL tab
		if (this.activeTab === 'link' && this.validImageUrl) {
			if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();

			const selectedCell = document.querySelector('.selected-cell');
			if (selectedCell) {
				const r = selectedCell.parentElement.rowIndex - 1;
				const c = parseInt(selectedCell.getAttribute('data-col'));
				const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
				const key = r + '-' + c;

				if (!sheet.cells[key]) {
					sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
				}

				// Structure for URL image
				sheet.cells[key].type = {
					name: 'image',
					details: {
						url: this.validImageUrl
					}
				};

				delete sheet.cells[key].text;
				delete sheet.cells[key].html;
				delete sheet.cells[key].llm;

				SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
				SheetDataManager.setModified(true);

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