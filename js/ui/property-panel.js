import { SheetDataManager } from '../cascade-prompt-data.js';
import { DropdownManager } from './dropdown-manager.js';

export const PropertyPanelManager = {
	panel: null,
	title: null,

	init: function() {
		this.panel = document.getElementById('property-panel');
		this.title = document.getElementById('prop-panel-title');
	},

	open: function(type) {
		if (!this.panel) this.init();

		// Hide all sections first
		document.querySelectorAll('.prop-section').forEach(el => el.classList.add('hidden'));

		if (type === 'dropdown') {
			this.title.textContent = 'Dropdown Settings';
			const dropdownSection = document.getElementById('panel-section-dropdown');
			if (dropdownSection) {
				dropdownSection.classList.remove('hidden');
				// Call manager to populate data and register events
				DropdownManager.initPanel();
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
	}
};