export const SheetState = {
	data: {
		activeSheetIndex: 0,
		sheets: [],
		llmSettings: { apiKey: '', falAiKey: '' }
	},
	currentFileName: null,
	isModified: false,
	defaults: {
		rows: 100,
		cols: 26,
		sheetNamePrefix: 'Sheet',
		defaultRowHeight: 25,
		defaultColWidth: 100
	},
	getColumnLetter: function (index) {
		let letter = '';
		while (index >= 0) {
			letter = String.fromCharCode((index % 26) + 65) + letter;
			index = Math.floor(index / 26) - 1;
		}
		return letter;
	},
	generateUniqueSheetName: function (baseName) {
		let name = baseName;
		let counter = 1;
		if (baseName === this.defaults.sheetNamePrefix) {
			name = baseName + counter;
		}
		while (this.data.sheets.some(s => s.name === name)) {
			counter++;
			if (baseName.startsWith(this.defaults.sheetNamePrefix)) {
				name = this.defaults.sheetNamePrefix + counter;
			} else {
				name = baseName + '_' + counter;
			}
		}
		return name;
	}
};