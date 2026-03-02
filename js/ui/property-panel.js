import { SheetDataManager } from '../cascade-prompt-data.js';
import { DropdownManager } from './dropdown-manager.js';

export const PropertyPanelManager = {
	panel: null,
	content: null,
	title: null,

	init: function() {
		this.panel = document.getElementById('property-panel');
		this.content = document.getElementById('prop-panel-content');
		this.title = document.getElementById('prop-panel-title');
	},

	open: function(type) {
		if (!this.panel) this.init();

		this.panel.classList.remove('hidden');
		this.content.innerHTML = '';

		if (type === 'dropdown') {
			this.title.textContent = 'Formula Editor';
			this.renderDropdownForm();
		} else {
			this.title.textContent = 'Properties';
			this.content.innerHTML = '<div class="text-base-content/50 italic text-center mt-10">No properties available</div>';
		}
	},

	close: function() {
		if (!this.panel) this.init();
		this.panel.classList.add('hidden');
	},

	renderDropdownForm: function() {
		const container = document.createElement('div');
		container.className = 'flex flex-col gap-4';

		let cellLabel = 'None';
		if (SheetDataManager.propertyPanel && SheetDataManager.propertyPanel.targetedCell) {
			const { r, c } = SheetDataManager.propertyPanel.targetedCell;
			if (r !== null && c !== null) {
				const letter = SheetDataManager.getColumnLetter(c);
				cellLabel = `${letter}${r + 1}`;
			}
		}

		const targetDisplay = document.createElement('div');
		targetDisplay.className = 'text-xs font-bold text-base-content/70 uppercase tracking-wide border-b border-base-200 pb-2 mb-1';
		targetDisplay.textContent = `Target: ${cellLabel}`;
		container.appendChild(targetDisplay);

		const formControl1 = document.createElement('div');
		formControl1.className = 'form-control';
		formControl1.innerHTML = `
            <label class="label"><span class="label-text font-semibold">Options</span></label>
            <textarea class="textarea textarea-bordered h-32 text-sm font-mono" id="prop-dropdown-options" placeholder="Enter options separated by commas or new lines"></textarea>
            <label class="label"><span class="label-text-alt">One option per line or comma-separated</span></label>
        `;
		container.appendChild(formControl1);

		const formControl2 = document.createElement('div');
		formControl2.className = 'form-control';
		formControl2.innerHTML = `
            <label class="label"><span class="label-text font-semibold">Default / Selected</span></label>
            <select class="select select-bordered select-sm" id="prop-dropdown-selection">
                <option value="">(None)</option>
            </select>
        `;
		container.appendChild(formControl2);

		const actions = document.createElement('div');
		actions.className = 'flex justify-between mt-4 pt-4 border-t border-base-200';
		actions.innerHTML = `
            <button class="btn btn-error btn-sm btn-outline" id="prop-btn-remove">Remove</button>
            <button class="btn btn-primary btn-sm" id="prop-btn-save">Apply</button>
        `;
		container.appendChild(actions);

		this.content.appendChild(container);

		document.getElementById('prop-dropdown-options').addEventListener('input', () => DropdownManager.updateSelectionPreview());
		document.getElementById('prop-btn-save').addEventListener('click', () => DropdownManager.saveDropdown());
		document.getElementById('prop-btn-remove').addEventListener('click', () => DropdownManager.removeDropdown());

		DropdownManager.populatePanelData();
	}
};