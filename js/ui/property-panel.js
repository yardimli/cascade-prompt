import { SheetDataManager } from '../cascade-prompt-data.js';
import { DropdownManager } from './dropdown-manager.js';

export const PropertyPanelManager = {
	panel: null,
	title: null,
	currentSaveHandler: null, // Function to call when "Yes" is clicked
	pendingAction: null,      // Function to call after the dialog closes (e.g., close panel or switch cell)

	init: function() {
		this.panel = document.getElementById('property-panel');
		this.title = document.getElementById('prop-panel-title');
	},

	/**
	 * Checks if there are unsaved changes.
	 * If yes, opens the confirmation dialog.
	 * If no, executes the callback immediately.
	 * @param {Function} callback - The action to perform next (e.g., close panel, open new cell)
	 */
	checkAndProceed: function(callback) {
		if (SheetDataManager.propertyPanel.isModified) {
			this.pendingAction = callback;
			const modal = document.getElementById('unsavedChangesModal');
			if (modal) modal.showModal();
		} else {
			if (callback) callback();
		}
	},

	/**
	 * Called by the "X" button on the panel.
	 */
	attemptClose: function() {
		this.checkAndProceed(() => {
			this.close();
		});
	},

	/**
	 * Called by the "Yes" (Apply) button in the dialog.
	 */
	confirmApply: function() {
		if (this.currentSaveHandler) {
			this.currentSaveHandler(); // Save the data
		}
		// Reset modified flag is handled by the specific manager (e.g., DropdownManager)
		// but we ensure it here just in case, though usually saveHandler does it.

		if (this.pendingAction) {
			this.pendingAction();
			this.pendingAction = null;
		}
		document.getElementById('unsavedChangesModal').close();
	},

	/**
	 * Called by the "No" (Discard) button in the dialog.
	 */
	confirmDiscard: function() {
		SheetDataManager.propertyPanel.isModified = false; // Discard changes
		if (this.pendingAction) {
			this.pendingAction();
			this.pendingAction = null;
		}
		document.getElementById('unsavedChangesModal').close();
	},

	open: function(type) {
		if (!this.panel) this.init();

		document.querySelectorAll('.prop-section').forEach(el => el.classList.add('hidden'));

		// Reset save handler
		this.currentSaveHandler = null;

		if (type === 'dropdown') {
			this.title.textContent = 'Dropdown Settings';
			const dropdownSection = document.getElementById('panel-section-dropdown');
			if (dropdownSection) {
				dropdownSection.classList.remove('hidden');
				DropdownManager.initPanel();
				// Register the save handler for the generic Apply button in the modal
				this.currentSaveHandler = () => DropdownManager.saveDropdown();
			}
		} else {
			this.title.textContent = 'Properties';
			const defaultSection = document.getElementById('panel-section-default');
			if (defaultSection) defaultSection.classList.remove('hidden');
		}

		this.panel.classList.remove('hidden');
	},

	close: function() {
		if (!this.panel) this.init();
		this.panel.classList.add('hidden');
		SheetDataManager.propertyPanel.isModified = false;
		this.currentSaveHandler = null;
	}
};