<!doctype html>
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="author" content="DSAThemes">
	<meta name="description" content="Discover a new beginning.">
	<meta name="keywords"
	      content="Responsive, HTML5, DSAThemes, Landing, Software, Mobile App, SaaS, Startup, Creative, Digital Product">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="csrf-token" content="">
	
	<!-- SITE TITLE -->
	<title>Cascade Prompt</title>
	
	<!-- FAVICON AND TOUCH ICONS -->
	<link rel="shortcut icon" href="./images/favicon.ico" type="image/x-icon">
	<link rel="icon" href="./images/favicon.ico" type="image/x-icon">
	<link rel="apple-touch-icon" sizes="152x152" href="images/apple-touch-icon-152x152.png">
	<link rel="apple-touch-icon" sizes="120x120" href="images/apple-touch-icon-120x120.png">
	<link rel="apple-touch-icon" sizes="76x76" href="images/apple-touch-icon-76x76.png">
	<link rel="apple-touch-icon" href="./images/apple-touch-icon.png">
	<link rel="icon" href="./images/apple-touch-icon.png" type="image/x-icon">
	
	<link rel="stylesheet" href="./css/bootstrap-icons.min.css">
	<link rel="stylesheet" href="css/cascade-prompt.css">
	
	<link href="./css/bootstrap.min.css" rel="stylesheet">
	<script src="./js/bootstrap.min.js"></script>
	
	<!-- Scripts -->
	<script src="js/cascade-prompt-data.js"></script>
	<script src="js/cascade-prompt-history.js"></script>
	<script src="js/cascade-prompt-formatting.js"></script>
	<script src="js/cascade-prompt-clipboard.js"></script>
	<script src="js/cascade-prompt-llm.js"></script> <!-- Added LLM Manager -->
	<script src="js/cascade-prompt.js"></script>
	<script src="js/cascade-prompt-keypress.js"></script>
	<script src="js/cascade-prompt-ui.js"></script>

</head>

<body style="margin-left: 0px; padding-left: 0px; overflow: hidden;">

<!-- Top Menu Bar -->
<div class="top-menu-bar">
	<div style="margin-right: 15px; font-weight: bold; display:flex; align-items:center;">
		<img src="./images/android-chrome-192x192.png" style="height: 20px; margin-right:5px;">
		Cascade
	</div>
	
	<!-- File Menu -->
	<div class="menu-item">
		File
		<div class="dropdown-content">
			<div class="menu-dropdown-item" onclick="openProjectModal('new')">New...</div>
			<div class="menu-dropdown-item" onclick="openProjectModal('open')">Open... <span
					class="shortcut-key">Ctrl+O</span></div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="performSave()">Save <span class="shortcut-key">Ctrl+S</span></div>
			<div class="menu-dropdown-item" onclick="openProjectModal('save-as')">Save As...</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="LLMManager.openSettings()">LLM Settings...</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="window.print()">Print <span class="shortcut-key">Ctrl+P</span></div>
		</div>
	</div>
	
	<!-- Edit Menu -->
	<div class="menu-item">
		Edit
		<div class="dropdown-content">
			<div class="menu-dropdown-item" onclick="HistoryManager.undo()">Undo <span class="shortcut-key">Ctrl+Z</span>
			</div>
			<div class="menu-dropdown-item" onclick="HistoryManager.redo()">Redo <span class="shortcut-key">Ctrl+Y</span>
			</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="ClipboardManager.cut()">Cut <span class="shortcut-key">Ctrl+X</span>
			</div>
			<div class="menu-dropdown-item" onclick="ClipboardManager.copy(false)">Copy <span
					class="shortcut-key">Ctrl+C</span></div>
			<div class="menu-dropdown-item" onclick="ClipboardManager.paste()">Paste <span class="shortcut-key">Ctrl+V</span>
			</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="LLMManager.openFormulaBuilder()">Insert LLM Formula</div>
		</div>
	</div>
	
	<!-- View Menu -->
	<div class="menu-item">
		View
		<div class="dropdown-content">
			<div class="menu-dropdown-item" id="theme-toggle-btn">Light/Dark Mode</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item">Freeze Rows (Coming Soon)</div>
			<div class="menu-dropdown-item">Freeze Columns (Coming Soon)</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="document.documentElement.requestFullscreen()">Full Screen</div>
		</div>
	</div>
	
	<!-- Help Menu -->
	<div class="menu-item">
		Help
		<div class="dropdown-content">
			<div class="menu-dropdown-item"
			     onclick="showCustomAlert('Cascade Prompt v1.0<br>Use Arrow keys to navigate.<br>Double click to edit.')">
				About
			</div>
		</div>
	</div>
</div>

<!-- Toolbar -->
<div class="toolbar-container">
	<button type="button" class="btn btn-sm btn-outline-info" onclick="HistoryManager.undo()" title="Undo">
		<i class="bi bi-arrow-counterclockwise"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="HistoryManager.redo()" title="Redo">
		<i class="bi bi-arrow-clockwise"></i>
	</button>
	
	<div style="width: 1px; height: 20px; background: var(--border-color); margin: 0 5px;"></div>
	
	<!-- Clipboard Toolbar Buttons -->
	<button type="button" class="btn btn-sm btn-outline-info" onclick="ClipboardManager.cut()" title="Cut (Ctrl+X)">
		<i class="bi bi-scissors"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="ClipboardManager.copy(false)"
	        title="Copy (Ctrl+C)">
		<i class="bi bi-files"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="ClipboardManager.paste()" title="Paste (Ctrl+V)">
		<i class="bi bi-clipboard"></i>
	</button>
	
	<div style="width: 1px; height: 20px; background: var(--border-color); margin: 0 5px;"></div>
	
	<!-- Text Formatting -->
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.toggleStyle('bold')" title="Bold">
		<i class="bi bi-type-bold"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.toggleStyle('italic')"
	        title="Italic">
		<i class="bi bi-type-italic"></i>
	</button>
	
	<!-- Font Size Dropdown -->
	<div class="border-dropdown" style="margin-left: 2px;">
		<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.toggleFontSizeMenu(this)"
		        title="Font Size">
			<i class="bi bi-type"></i>
		</button>
		<div class="dropdown-content" style="min-width: 100px; padding: 5px;">
			<div class="menu-dropdown-item"
			     onclick="FormatManager.setFontSize('small'); this.parentElement.classList.remove('active')">Small
			</div>
			<div class="menu-dropdown-item"
			     onclick="FormatManager.setFontSize('normal'); this.parentElement.classList.remove('active')">Normal
			</div>
			<div class="menu-dropdown-item"
			     onclick="FormatManager.setFontSize('large'); this.parentElement.classList.remove('active')">Large
			</div>
			<div class="menu-dropdown-item"
			     onclick="FormatManager.setFontSize('xl'); this.parentElement.classList.remove('active')">Extra Large
			</div>
		</div>
	</div>
	
	<div style="width: 1px; height: 20px; background: var(--border-color); margin: 0 5px;"></div>
	
	<!-- Colors (Updated to use Modal) -->
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.openColorDialog('text')"
	        title="Text Color">
		<i class="bi bi-palette"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.openColorDialog('background')"
	        title="Fill Color">
		<i class="bi bi-paint-bucket"></i>
	</button>
	
	<!-- Borders -->
	<div class="border-dropdown" id="border-dropdown">
		<button type="button" class="btn btn-sm btn-outline-info" id="btn-borders"
		        onclick="FormatManager.toggleBorderMenu()" title="Borders">
			<i class="bi bi-border-all"></i>
		</button>
		<div class="border-dropdown-content">
			<div class="border-option" onclick="FormatManager.setBorder('all')" title="All Borders"><i
					class="bi bi-border-all"></i></div>
			<div class="border-option" onclick="FormatManager.setBorder('outer')" title="Outer Borders"><i
					class="bi bi-border-outer"></i></div>
			<div class="border-option" onclick="FormatManager.setBorder('none')" title="No Borders"><i
					class="bi bi-border-none"></i></div>
			<div class="border-option" onclick="FormatManager.setBorder('top')" title="Top Border"><i
					class="bi bi-border-top"></i></div>
			<div class="border-option" onclick="FormatManager.setBorder('bottom')" title="Bottom Border"><i
					class="bi bi-border-bottom"></i></div>
			<div class="border-option" onclick="FormatManager.setBorder('left')" title="Left Border"><i
					class="bi bi-border-left"></i></div>
			<div class="border-option" onclick="FormatManager.setBorder('right')" title="Right Border"><i
					class="bi bi-border-right"></i></div>
			<!-- Border Color Trigger -->
			<div class="border-option" onclick="FormatManager.openColorDialog('border')" title="Border Color"><i
					class="bi bi-palette2"></i></div>
		</div>
	</div>
	
	<div style="width: 1px; height: 20px; background: var(--border-color); margin: 0 5px;"></div>
	
	<!-- Alignment -->
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.setAlignment('left')"
	        title="Align Left">
		<i class="bi bi-justify-left"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.setAlignment('center')"
	        title="Align Center">
		<i class="bi bi-text-center"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" onclick="FormatManager.setAlignment('right')"
	        title="Align Right">
		<i class="bi bi-justify-right"></i>
	</button>
	
	<div style="width: 1px; height: 20px; background: var(--border-color); margin: 0 5px;"></div>
	
	<button type="button" class="btn btn-sm btn-outline-info" id="merge-btn" title="Merge Cells" disabled>
		<i class="bi bi-arrows-collapse"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" id="unmerge-btn" title="Unmerge Cells" disabled>
		<i class="bi bi-arrows-expand"></i>
	</button>
	
	<div style="width: 1px; height: 20px; background: var(--border-color); margin: 0 5px;"></div>
	
	<!-- LLM Button -->
	<button type="button" class="btn btn-sm btn-outline-primary" onclick="LLMManager.openFormulaBuilder()"
	        title="Insert LLM Formula">
		<i class="bi bi-robot"></i> LLM
	</button>
</div>

<!-- Formula Bar -->
<div class="formula-bar-container">
	<div class="formula-icon">fx</div>
	<div id="formula-input" class="formula-input" contenteditable="false" placeholder="Select a cell..."></div>
</div>

<div class="spreadsheet-container" id="spreadsheet-container">
	<!-- Overlay Editor -->
	<div id="cell-editor" contenteditable="true"></div>
	
	<div id="selection-helper" class="no-select"></div>
	<table class="spreadsheet no-select">
		<thead>
		<tr>
			<th class="top-corner-cell"></th>
			<?php
				$alphabet = range('A', 'Z');
				$colIndex = 0;
				foreach ($alphabet as $letter) {
					echo "<th class='letter-cell' data-col='$colIndex'>$letter</th>";
					$colIndex++;
				}
			?>
		</tr>
		</thead>
		<tbody>
		<?php
			for ($i = 1; $i <= 100; $i++) {
				echo "<tr>";
				echo "<th class='counter-cell'>$i</th>";
				for ($j = 0; $j < count($alphabet); $j++) {
					echo "<td class='text-cell' data-col='$j'><div class='content-cut'></div></td>";
				}
				echo "</tr>";
			}
		?>
		</tbody>
	</table>
</div>

<!-- Sheet Tabs Container -->
<div class="sheet-tabs-container" id="sheet-tabs-container">
	<div class="add-sheet-btn" title="Add Sheet">+</div>
</div>

<!-- Status Bar -->
<div class="status-bar">
	<div class="status-left" style="display:flex;">
		<div class="status-item" title="Current Selection">
			<i class="bi bi-cursor"></i> <span id="status-selection">--</span>
		</div>
		<div class="status-item" title="File Name">
			<i class="bi bi-file-earmark-spreadsheet"></i>
			<span id="status-file">Untitled</span>
			<span id="status-modified" style="display:none; margin-left:2px;">*</span>
		</div>
		<!-- NEW: LLM Status Indicator -->
		<div class="status-item" id="status-llm-busy"
		     style="display:none; color: var(--accent-color); align-items: center;">
			<div class="llm-spinner"
			     style="border-top-color: var(--accent-color); border-color: rgba(128,128,128,0.3); width: 12px; height: 12px; margin-right: 5px; border-width: 2px;"></div>
			<span id="status-llm-text">Processing...</span>
		</div>
	</div>
	<div class="status-right">
		<span style="font-size: 10px; color: #999;">Ready</span>
	</div>
</div>

<!-- Toast Notification -->
<div id="toast-notification" class="custom-toast">
	Saved
</div>

<!-- Project Management Modal -->
<div class="modal fade" id="projectModal" tabindex="-1" aria-hidden="true">
	<div class="modal-dialog">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title" id="projectModalLabel">Project Manager</h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body">
				<!-- Save As Section -->
				<div id="modal-save-section" class="mb-3" style="display:none;">
					<label for="project-filename" class="form-label">Project Name:</label>
					<div class="input-group">
						<input type="text" class="form-control" id="project-filename" placeholder="MySpreadsheet">
						<span class="input-group-text">.json</span>
					</div>
				</div>
				
				<!-- Load/List Section -->
				<div id="modal-list-section">
					<h6>Existing Projects:</h6>
					<div class="list-group" id="project-list-group">
						<!-- Populated by JS -->
					</div>
					<div id="no-projects-msg" class="text-muted mt-2" style="display:none;">No projects found.</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
				<button type="button" class="btn btn-primary" id="modal-action-btn">Save</button>
			</div>
		</div>
	</div>
</div>

<!-- LLM Settings Modal -->
<div class="modal fade" id="llmSettingsModal" tabindex="-1" aria-hidden="true">
	<div class="modal-dialog">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">LLM Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body">
				<div class="mb-3">
					<label for="llm-api-key" class="form-label">OpenRouter API Key:</label>
					<input type="password" class="form-control" id="llm-api-key" placeholder="sk-or-...">
					<div class="form-text">Your key is saved within the project file.</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
				<button type="button" class="btn btn-primary" onclick="LLMManager.saveSettings()">Save Settings</button>
			</div>
		</div>
	</div>
</div>

<!-- LLM Formula Builder Modal -->
<div class="modal fade" id="llmFormulaModal" tabindex="-1" aria-hidden="true">
	<div class="modal-dialog modal-lg">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Insert LLM Formula</h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body">
				<div class="row">
					<div class="col-md-6 mb-3">
						<label for="llm-model-select" class="form-label">Model:</label>
						<div class="input-group">
							<select class="form-select" id="llm-model-select">
								<option value="">Select a model...</option>
							</select>
							<button class="btn btn-outline-secondary" type="button" id="refresh-models-btn"
							        onclick="LLMManager.fetchModels()" title="Refresh Models">
								<i class="bi bi-arrow-clockwise"></i>
							</button>
						</div>
					</div>
					<div class="col-md-6 mb-3">
						<label for="llm-target-cell" class="form-label">Target Cell (Output):</label>
						<input type="text" class="form-control" id="llm-target-cell" placeholder="e.g. A1">
						<div class="form-text">Where the data will be inserted.</div>
					</div>
				</div>
				
				<!-- NEW: Function Name Input -->
				<div class="mb-3">
					<label for="llm-func-name" class="form-label">Function Name (Button Text):</label>
					<input type="text" class="form-control" id="llm-func-name" placeholder="Run LLM">
				</div>
				
				<div class="mb-3">
					<label for="llm-prompt" class="form-label">Prompt:</label>
					<textarea class="form-control" id="llm-prompt" rows="4"
					          placeholder="Describe what you want. Use #A-17 to reference cell A17."></textarea>
					<div class="form-text">Use #Column-Row (e.g., #A-1) to insert cell data.</div>
				</div>
				
				<div class="mb-3">
					<label for="llm-json-schema" class="form-label">Expected JSON Structure:</label>
					<textarea class="form-control" id="llm-json-schema" rows="4" style="font-family: monospace; font-size: 12px;">{
  "Key": "Value"
}</textarea>
					<div class="form-text">Define the JSON keys you expect. The result will be parsed into the sheet.</div>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
				<button type="button" class="btn btn-primary" onclick="LLMManager.insertFormula()">Insert Formula</button>
			</div>
		</div>
	</div>
</div>

<!-- Color Picker Modal -->
<div class="modal fade" id="colorPickerModal" tabindex="-1" aria-hidden="true">
	<div class="modal-dialog modal-sm">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title" id="colorPickerTitle">Select Color</h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body text-center">
				<input type="color" id="modal-color-input" class="form-control form-control-color w-100" value="#000000"
				       title="Choose your color">
				<div class="mt-3 d-flex justify-content-between">
					<button type="button" class="btn btn-outline-secondary btn-sm" onclick="FormatManager.resetColorDialog()">
						Reset
					</button>
					<button type="button" class="btn btn-primary btn-sm" onclick="FormatManager.applyColorDialog()">Apply</button>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Generic Alert Modal -->
<div class="modal fade" id="alertModal" tabindex="-1" aria-hidden="true">
	<div class="modal-dialog modal-sm">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title">Alert</h5>
				<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
			</div>
			<div class="modal-body" id="alert-modal-body">
				<!-- Content -->
			</div>
			<div class="modal-footer">
				<button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
			</div>
		</div>
	</div>
</div>

<script>
	// Modal Logic
	var projectModal = new bootstrap.Modal(document.getElementById('projectModal'));
	var alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
	var currentModalMode = '';
	
	// Helper to show custom alert
	function showCustomAlert(message) {
		document.getElementById('alert-modal-body').innerHTML = message;
		alertModal.show();
	}
	
	// Helper to show toast
	function showToast(message) {
		const toast = document.getElementById('toast-notification');
		toast.textContent = message;
		toast.classList.add('show');
		setTimeout(() => {
			toast.classList.remove('show');
		}, 3000);
	}
	
	function openProjectModal(mode) {
		currentModalMode = mode;
		const title = document.getElementById('projectModalLabel');
		const saveSection = document.getElementById('modal-save-section');
		const listSection = document.getElementById('modal-list-section');
		const actionBtn = document.getElementById('modal-action-btn');
		const filenameInput = document.getElementById('project-filename');
		
		// Reset UI
		saveSection.style.display = 'none';
		listSection.style.display = 'none';
		filenameInput.value = '';
		
		if (mode === 'new') {
			SheetDataManager.newProject();
			return; // No modal needed
		}
		
		if (mode === 'save-as') {
			title.textContent = 'Save Project As';
			saveSection.style.display = 'block';
			listSection.style.display = 'block'; // Show list to see existing names
			actionBtn.textContent = 'Save';
			actionBtn.className = 'btn btn-primary';
			if (SheetDataManager.currentFileName) {
				filenameInput.value = SheetDataManager.currentFileName;
			}
			loadProjectList(false); // List for reference
		} else if (mode === 'open') {
			title.textContent = 'Open Project';
			listSection.style.display = 'block';
			actionBtn.textContent = 'Open';
			actionBtn.className = 'btn btn-primary disabled'; // Disabled until selection
			loadProjectList(true); // List for selection
		}
		
		projectModal.show();
	}
	
	function loadProjectList(isSelectable) {
		const listGroup = document.getElementById('project-list-group');
		const noMsg = document.getElementById('no-projects-msg');
		listGroup.innerHTML = '';
		
		SheetDataManager.listProjects(function (files) {
			if (files.length === 0) {
				noMsg.style.display = 'block';
			} else {
				noMsg.style.display = 'none';
				files.forEach(file => {
					const item = document.createElement('div');
					item.className = 'list-group-item project-list-item';
					
					const nameSpan = document.createElement('span');
					nameSpan.textContent = file;
					item.appendChild(nameSpan);
					
					// Delete Button
					const delBtn = document.createElement('button');
					delBtn.className = 'btn btn-sm btn-outline-danger';
					delBtn.innerHTML = '<i class="bi bi-trash"></i>';
					delBtn.style.marginLeft = '10px';
					delBtn.onclick = function (e) {
						e.stopPropagation();
						SheetDataManager.deleteProject(file, function () {
							loadProjectList(isSelectable);
						});
					};
					item.appendChild(delBtn);
					
					item.onclick = function () {
						// Highlight selection
						document.querySelectorAll('.project-list-item').forEach(el => el.classList.remove('active'));
						item.classList.add('active');
						
						if (currentModalMode === 'save-as') {
							document.getElementById('project-filename').value = file;
						} else if (currentModalMode === 'open') {
							document.getElementById('modal-action-btn').classList.remove('disabled');
							document.getElementById('modal-action-btn').dataset.selectedFile = file;
						}
					};
					
					listGroup.appendChild(item);
				});
			}
		});
	}
	
	// Modal Action Button
	document.getElementById('modal-action-btn').addEventListener('click', function () {
		if (currentModalMode === 'save-as') {
			const filename = document.getElementById('project-filename').value.trim();
			if (filename) {
				SheetDataManager.saveProject(filename);
				projectModal.hide();
			} else {
				showCustomAlert('Please enter a filename');
			}
		} else if (currentModalMode === 'open') {
			const filename = this.dataset.selectedFile;
			if (filename) {
				SheetDataManager.loadProject(filename);
				projectModal.hide();
			}
		}
	});
	
	// Quick Save (Ctrl+S)
	function performSave() {
		if (SheetDataManager.currentFileName) {
			SheetDataManager.saveProject(SheetDataManager.currentFileName);
		} else {
			openProjectModal('save-as');
		}
	}
	
	// Keyboard Shortcuts for Save/Open
	document.addEventListener('keydown', function (e) {
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			performSave();
		}
		if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
			e.preventDefault();
			openProjectModal('open');
		}
	});
</script>

</body>

</html>
