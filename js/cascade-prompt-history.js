/**
 * Cascade Prompt History Manager
 * Handles Undo/Redo stacks and state restoration.
 */

var HistoryManager = {
	undoStack: [],
	redoStack: [],
	maxDepth: 50, // Maximum number of undo steps
	
	/**
	 * Initialize History Manager
	 */
	init: function () {
		// Clear stacks on init
		this.undoStack = [];
		this.redoStack = [];
		this.updateUI();
	},
	
	/**
	 * Capture the current state and push it to the Undo stack.
	 * Should be called BEFORE a destructive action (edit, merge, resize, etc.).
	 */
	addState: function () {
		// Ensure the data model is up to date with the DOM before cloning
		if (typeof SheetDataManager !== 'undefined') {
			SheetDataManager.updateCurrentSheetData();
			
			// Deep clone the data object
			const stateSnapshot = JSON.parse(JSON.stringify(SheetDataManager.data));
			
			// Optimization: Deduplication
			// Don't push if the state hasn't actually changed from the last undo state
			if (this.undoStack.length > 0) {
				const lastState = this.undoStack[this.undoStack.length - 1];
				if (JSON.stringify(lastState) === JSON.stringify(stateSnapshot)) {
					console.log('History state identical to previous. Skipping push.');
					return;
				}
			}
			
			this.undoStack.push(stateSnapshot);
			
			// Limit stack size
			if (this.undoStack.length > this.maxDepth) {
				this.undoStack.shift();
			}
			
			// Clearing the redo stack is standard behavior when a new action occurs
			this.redoStack = [];
			
			this.updateUI();
			console.log('History state added. Undo stack size: ' + this.undoStack.length);
		}
	},
	
	/**
	 * Perform Undo
	 */
	undo: function () {
		if (this.undoStack.length === 0) return;
		
		// 1. Capture current state to Redo stack
		SheetDataManager.updateCurrentSheetData();
		const currentState = JSON.parse(JSON.stringify(SheetDataManager.data));
		this.redoStack.push(currentState);
		
		// 2. Pop previous state
		const previousState = this.undoStack.pop();
		
		// 3. Restore
		this.restoreState(previousState);
		this.updateUI();
		console.log('Undo performed.');
	},
	
	/**
	 * Perform Redo
	 */
	redo: function () {
		if (this.redoStack.length === 0) return;
		
		// 1. Capture current state to Undo stack
		SheetDataManager.updateCurrentSheetData();
		const currentState = JSON.parse(JSON.stringify(SheetDataManager.data));
		this.undoStack.push(currentState);
		
		// 2. Pop next state
		const nextState = this.redoStack.pop();
		
		// 3. Restore
		this.restoreState(nextState);
		this.updateUI();
		console.log('Redo performed.');
	},
	
	/**
	 * Restore the application data to a specific state object
	 */
	restoreState: function (stateObj) {
		if (!stateObj) return;
		
		// Update Data Manager
		SheetDataManager.data = stateObj;
		
		// Re-render the active sheet
		const activeIndex = SheetDataManager.data.activeSheetIndex || 0;
		SheetDataManager.renderSheet(activeIndex);
		SheetDataManager.renderTabs();
		
		// Mark as modified since we changed state
		SheetDataManager.setModified(true);
	},
	
	/**
	 * Update UI buttons (enable/disable)
	 */
	updateUI: function () {
		// This could toggle CSS classes on toolbar buttons if they had IDs
	}
};
