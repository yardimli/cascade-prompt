class ExcelGrid {
	constructor(rows, cols) {
		this.rows = rows;
		this.cols = cols;
		this.data = [];
		this.settings = {
			cellWidth: 100,
			cellHeight: 25,
			backgroundColor: '#ffffff',
			borderColor: '#ccc',
			borderWidth: 1
		};
		
		this.initializeData();
		this.render();
		
		// Set container size
		$('#grid-container').css({
			width: (this.cols * this.settings.cellWidth) + 'px',
			height: (this.rows * this.settings.cellHeight) + 'px'
		});
	}
	
	initializeData() {
		for (let i = 0; i < this.rows; i++) {
			this.data[i] = [];
			for (let j = 0; j < this.cols; j++) {
				this.data[i][j] = {
					value: '',
					cellWidth: 1,
					cellHeight: 1,
					isHidden: false
				};
			}
		}
	}
	
	setCellValue(row, col, value) {
		if (row < this.rows && col < this.cols) {
			this.data[row][col].value = value;
			this.render();
		}
	}
	
	setCellSize(row, col, width, height) {
		if (row < this.rows && col < this.cols) {
			this.data[row][col].cellWidth = width;
			this.data[row][col].cellHeight = height;
			
			// Hide cells that would be overlapped
			for (let i = row; i < row + height && i < this.rows; i++) {
				for (let j = col; j < col + width && j < this.cols; j++) {
					if (i !== row || j !== col) {
						this.data[i][j].isHidden = true;
					}
				}
			}
			
			this.render();
		}
	}
	
	render() {
		$('#grid-container').empty();
		
		for (let i = 0; i < this.rows; i++) {
			for (let j = 0; j < this.cols; j++) {
				const cell = this.data[i][j];
				
				if (!cell.isHidden) {
					const $cell = $('<div>')
						.addClass('grid-cell')
						.css({
							left: (j * this.settings.cellWidth) + 'px',
							top: (i * this.settings.cellHeight) + 'px',
							width: (cell.cellWidth * this.settings.cellWidth) + 'px',
							height: (cell.cellHeight * this.settings.cellHeight) + 'px',
							backgroundColor: this.settings.backgroundColor,
							borderColor: this.settings.borderColor,
							borderWidth: this.settings.borderWidth + 'px'
						})
						.text(cell.value);
					
					$('#grid-container').append($cell);
				}
			}
		}
	}
	
	updateSettings(newSettings) {
		Object.assign(this.settings, newSettings);
		this.render();
		
		// Update container size
		$('#grid-container').css({
			width: (this.cols * this.settings.cellWidth) + 'px',
			height: (this.rows * this.settings.cellHeight) + 'px'
		});
	}
}

$(document).ready(function () {

// Usage example:
	const grid = new ExcelGrid(100, 100);

// Set some example values and sizes
	grid.setCellValue(0, 0, 'Hello World! This is a long text that might overflow');
	grid.setCellValue(0, 2, 'Another cell');
	grid.setCellSize(1, 1, 2, 2);
	grid.setCellValue(1, 1, 'Merged Cell');

// Update settings example
	grid.updateSettings({
		cellWidth: 120,
		cellHeight: 30,
		backgroundColor: '#f0f0f0',
		borderColor: '#999',
		borderWidth: 1
	});
	
});
