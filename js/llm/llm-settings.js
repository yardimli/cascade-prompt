import { SheetDataManager } from '../cascade-prompt-data.js';

export const LLMSettings = {
	openSettings: function () {
		const modal = document.getElementById('llmSettingsModal');
		document.getElementById('llm-api-key').value = SheetDataManager.data.llmSettings?.apiKey || '';
		document.getElementById('llm-fal-key').value = SheetDataManager.data.llmSettings?.falAiKey || '';
		modal.showModal();
	},
	saveSettings: function () {
		const apiKey = document.getElementById('llm-api-key').value.trim();
		const falKey = document.getElementById('llm-fal-key').value.trim();
		if (!SheetDataManager.data.llmSettings) SheetDataManager.data.llmSettings = {};
		SheetDataManager.data.llmSettings.apiKey = apiKey;
		SheetDataManager.data.llmSettings.falAiKey = falKey;
		SheetDataManager.setModified(true);
		document.getElementById('llmSettingsModal').close();
		window.showToast('Settings Saved. Please Save Project (Ctrl+S).');
	}
};