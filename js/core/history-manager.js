import { SheetDataManager } from '../cascade-prompt-data.js';

export const HistoryManager = {
	undoStack: [],
	redoStack: [],
	maxDepth: 50,

	init: function () {
		this.undoStack = [];
		this.redoStack = [];
		this.updateUI();
	},

	addState: function () {
		if (typeof SheetDataManager !== 'undefined') {
			SheetDataManager.updateCurrentSheetData();
			const stateSnapshot = JSON.parse(JSON.stringify(SheetDataManager.data));

			if (this.undoStack.length > 0) {
				const lastState = this.undoStack[this.undoStack.length - 1];
				if (JSON.stringify(lastState) === JSON.stringify(stateSnapshot)) {
					console.log('History state identical to previous. Skipping push.');
					return;
				}
			}

			this.undoStack.push(stateSnapshot);
			if (this.undoStack.length > this.maxDepth) {
				this.undoStack.shift();
			}
			this.redoStack = [];
			this.updateUI();
			console.log('History state added. Undo stack size: ' + this.undoStack.length);
		}
	},

	undo: function () {
		if (this.undoStack.length === 0) return;
		SheetDataManager.updateCurrentSheetData();
		const currentState = JSON.parse(JSON.stringify(SheetDataManager.data));
		this.redoStack.push(currentState);
		const previousState = this.undoStack.pop();
		this.restoreState(previousState);
		this.updateUI();
		console.log('Undo performed.');
	},

	redo: function () {
		if (this.redoStack.length === 0) return;
		SheetDataManager.updateCurrentSheetData();
		const currentState = JSON.parse(JSON.stringify(SheetDataManager.data));
		this.undoStack.push(currentState);
		const nextState = this.redoStack.pop();
		this.restoreState(nextState);
		this.updateUI();
		console.log('Redo performed.');
	},

	restoreState: function (stateObj) {
		if (!stateObj) return;
		SheetDataManager.data = stateObj;
		const activeIndex = SheetDataManager.data.activeSheetIndex || 0;
		SheetDataManager.renderSheet(activeIndex);
		SheetDataManager.renderTabs();
		SheetDataManager.setModified(true);
	},

	updateUI: function () {
		// UI updates if needed
	}
};