/**
 * Image Manager
 * Handles the UI for inserting images into cells.
 */
import { SheetDataManager } from './cascade-prompt-data.js';

export const ImageManager = {
	openImageModal: function () {
		const selected = document.querySelector('.selected-cell');
		if (!selected) {
			if (typeof window.showCustomAlert === 'function') {
				window.showCustomAlert('Please select a cell first.');
			}
			return;
		}

		const modal = document.getElementById('imageModal');
		if (modal) {
			modal.showModal();
		}
	},

	insertImage: function () {
		// Placeholder for future implementation
		console.log("Insert image logic goes here.");
		document.getElementById('imageModal').close();
	}
};