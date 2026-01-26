<!doctype html>
<!--[if lt IE 7 ]>
<html class="ie ie6" lang="en"> <![endif]-->
<!--[if IE 7 ]>
<html class="ie ie7" lang="en"> <![endif]-->
<!--[if IE 8 ]>
<html class="ie ie8" lang="en"> <![endif]-->
<!--[if (gte IE 9)|!(IE)]><!-->
<html lang="en">

<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="author" content="DSAThemes">
	<meta name="description" content="Discover a new beginning.">
	<meta name="keywords" content="Responsive, HTML5, DSAThemes, Landing, Software, Mobile App, SaaS, Startup, Creative, Digital Product">
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
	<script src="js/cascade-prompt.js"></script>
	<script src="js/cascade-prompt-keypress.js"></script>
	<script src="js/cascade-prompt-ui.js"></script>

</head>

<body class="bg-light" style="margin-left: 0px; padding-left: 0px; overflow: hidden;">

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
			<div class="menu-dropdown-item" onclick="openProjectModal('open')">Open... <span class="shortcut-key">Ctrl+O</span></div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="performSave()">Save <span class="shortcut-key">Ctrl+S</span></div>
			<div class="menu-dropdown-item" onclick="openProjectModal('save-as')">Save As...</div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="window.print()">Print <span class="shortcut-key">Ctrl+P</span></div>
		</div>
	</div>
	
	<!-- Edit Menu -->
	<div class="menu-item">
		Edit
		<div class="dropdown-content">
			<div class="menu-dropdown-item" onclick="document.execCommand('undo')">Undo <span class="shortcut-key">Ctrl+Z</span></div>
			<div class="menu-dropdown-item" onclick="document.execCommand('redo')">Redo <span class="shortcut-key">Ctrl+Y</span></div>
			<div class="dropdown-divider"></div>
			<div class="menu-dropdown-item" onclick="document.execCommand('cut')">Cut <span class="shortcut-key">Ctrl+X</span></div>
			<div class="menu-dropdown-item" onclick="document.execCommand('copy')">Copy <span class="shortcut-key">Ctrl+C</span></div>
			<div class="menu-dropdown-item" onclick="document.execCommand('paste')">Paste <span class="shortcut-key">Ctrl+V</span></div>
		</div>
	</div>
	
	<!-- View Menu -->
	<div class="menu-item">
		View
		<div class="dropdown-content">
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
			<div class="menu-dropdown-item" onclick="showCustomAlert('Cascade Prompt v1.0<br>Use Arrow keys to navigate.<br>Double click to edit.')">About</div>
		</div>
	</div>
</div>

<!-- Toolbar -->
<div class="toolbar-container">
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-arrow-counterclockwise" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-arrow-clockwise" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-type-bold" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-type-italic" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-type-strikethrough" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-paint-bucket" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-grid" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info">
		<i class="bi bi-justify-left" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" id="merge-btn" title="Merge Cells" disabled>
		<i class="bi bi-arrows-collapse" style="color:black;"></i>
	</button>
	<button type="button" class="btn btn-sm btn-outline-info" id="unmerge-btn" title="Unmerge Cells" disabled>
		<i class="bi bi-arrows-expand" style="color:black;"></i>
	</button>
</div>

<!-- Formula Bar -->
<div class="formula-bar-container">
	<div class="formula-icon">fx</div>
	<input type="text" id="formula-input" class="formula-input" placeholder="Select a cell..." disabled>
</div>

<div class="spreadsheet-container" id="spreadsheet-container">
	<!-- Overlay Textarea for Editing -->
	<textarea id="cell-editor"></textarea>
	
	<div id="selection-helper" class="active-animation no-select"></div>
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
		
		SheetDataManager.listProjects(function(files) {
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
					delBtn.onclick = function(e) {
						e.stopPropagation();
						SheetDataManager.deleteProject(file, function() {
							loadProjectList(isSelectable);
						});
					};
					item.appendChild(delBtn);
					
					item.onclick = function() {
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
	document.getElementById('modal-action-btn').addEventListener('click', function() {
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
	document.addEventListener('keydown', function(e) {
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
