import { getApiEndpoint } from '../api-config.js';

export const SheetIO = {
	saveProject: function (manager, filename) {
		manager.updateCurrentSheetData();
		if (!filename) { window.showCustomAlert('Filename is required.'); return; }

		fetch(getApiEndpoint('save_project'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: filename, data: manager.data })
		})
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					manager.currentFileName = filename;
					localStorage.setItem('lastOpenedFile', filename);
					document.title = filename + ' - Cascade Prompt';
					manager.setModified(false);
					window.showToast('Project saved successfully');
				} else {
					window.showCustomAlert('Error saving project: ' + data.message);
				}
			})
			.catch(error => { console.error('Error:', error); window.showCustomAlert('An error occurred while saving.'); });
	},

	loadProject: function (manager, filename, isInitialLoad) {
		fetch(getApiEndpoint('load_project') + '?filename=' + encodeURIComponent(filename))
			.then(response => response.json())
			.then(data => {
				if (data.success) {
					manager.data = data.data;
					if (!manager.data.llmSettings) manager.data.llmSettings = { apiKey: '', falAiKey: '' };
					manager.currentFileName = filename;
					localStorage.setItem('lastOpenedFile', filename);
					document.title = filename + ' - Cascade Prompt';
					manager.renderSheet(manager.data.activeSheetIndex || 0);
					manager.renderTabs();
					manager.setModified(false);
				} else {
					console.warn('Could not load project:', data.message);
					if (isInitialLoad) {
						manager.createSheet(manager.defaults.sheetNamePrefix + '1', true);
						manager.updateStatusUI();
					} else {
						window.showCustomAlert('Error loading project: ' + data.message);
					}
				}
			})
			.catch(error => { console.error('Error:', error); if (!isInitialLoad) window.showCustomAlert('An error occurred while loading.'); });
	},

	listProjects: function (callback) {
		fetch(getApiEndpoint('list_projects')).then(r => r.json()).then(data => { if (data.success && callback) callback(data.files); });
	},

	deleteProject: function (filename, callback) {
		if (!confirm('Are you sure you want to delete "' + filename + '"?')) return;
		fetch(getApiEndpoint('delete_project'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ filename: filename })
		}).then(r => r.json()).then(data => {
			if (data.success) { if (callback) callback(); } else { window.showCustomAlert('Error deleting file: ' + data.message); }
		});
	}
};