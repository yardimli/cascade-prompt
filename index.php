<?php
	require_once 'vite_loader.php';
	$vite = new ViteLoader('/cascade-prompt/'); // Ensure this matches your folder name
?>
<!doctype html>
<html lang="en" data-theme="light">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Cascade Prompt</title>
	<!-- Icons -->
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
	
	<!-- Vite Entry Point -->
	<?php echo $vite->render('src/main.js'); ?>
</head>

<body>

<!-- Top Menu Bar (DaisyUI Navbar) -->
<div class="navbar bg-base-100 min-h-[40px] border-b border-base-300 shadow-sm z-50 px-2">
	<div class="flex-none mr-4 font-bold flex items-center">
		<img src="./images/android-chrome-192x192.png" style="height: 20px; margin-right:5px;">
		Cascade
	</div>
	
	<div class="flex-none">
		<ul class="menu menu-horizontal px-1 p-0 text-sm">
			<!-- File Menu -->
			<li>
				<details>
					<summary>File</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52 shadow-lg border border-base-200 z-[1001]">
						<li><a onclick="openProjectModal('new')">New...</a></li>
						<li><a onclick="openProjectModal('open')">Open... <span class="text-xs opacity-50 float-right">Ctrl+O</span></a></li>
						<div class="divider my-0"></div>
						<li><a onclick="performSave()">Save <span class="text-xs opacity-50 float-right">Ctrl+S</span></a></li>
						<li><a onclick="openProjectModal('save-as')">Save As...</a></li>
						<div class="divider my-0"></div>
						<li><a onclick="LLMManager.openSettings()">LLM Settings...</a></li>
						<div class="divider my-0"></div>
						<li><a onclick="window.print()">Print <span class="text-xs opacity-50 float-right">Ctrl+P</span></a></li>
					</ul>
				</details>
			</li>
			
			<!-- Edit Menu -->
			<li>
				<details>
					<summary>Edit</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52 shadow-lg border border-base-200 z-[1001]">
						<li><a onclick="HistoryManager.undo()">Undo <span class="text-xs opacity-50 float-right">Ctrl+Z</span></a></li>
						<li><a onclick="HistoryManager.redo()">Redo <span class="text-xs opacity-50 float-right">Ctrl+Y</span></a></li>
						<div class="divider my-0"></div>
						<li><a onclick="ClipboardManager.cut()">Cut <span class="text-xs opacity-50 float-right">Ctrl+X</span></a></li>
						<li><a onclick="ClipboardManager.copy(false)">Copy <span class="text-xs opacity-50 float-right">Ctrl+C</span></a></li>
						<li><a onclick="ClipboardManager.paste()">Paste <span class="text-xs opacity-50 float-right">Ctrl+V</span></a></li>
						<div class="divider my-0"></div>
						<li><a onclick="SheetPropertiesManager.open()">Sheet Properties...</a></li>
						<div class="divider my-0"></div>
						<li><a onclick="LLMManager.openFormulaBuilder()">Insert LLM Formula</a></li>
						<li><a onclick="DropdownManager.openDropdownBuilder()">Insert Dropdown</a></li>
					</ul>
				</details>
			</li>
			
			<!-- View Menu -->
			<li>
				<details>
					<summary>View</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52 shadow-lg border border-base-200 z-[1001]">
						<li><a onclick="toggleTheme()">Light/Dark Mode</a></li>
						<div class="divider my-0"></div>
						<li><a onclick="document.documentElement.requestFullscreen()">Full Screen</a></li>
					</ul>
				</details>
			</li>
			
			<!-- Help Menu -->
			<li>
				<details>
					<summary>Help</summary>
					<ul class="bg-base-100 rounded-t-none p-2 w-52 shadow-lg border border-base-200 z-[1001]">
						<li><a onclick="showCustomAlert('Cascade Prompt v1.0<br>Use Arrow keys to navigate.<br>Double click to edit.')">About</a></li>
					</ul>
				</details>
			</li>
		</ul>
	</div>
</div>

<!-- Toolbar -->
<div class="flex items-center gap-1 px-4 py-1 bg-base-200 border-b border-base-300 overflow-x-auto">
	<button class="btn btn-ghost btn-xs btn-square" onclick="HistoryManager.undo()" title="Undo"><i class="bi bi-arrow-counterclockwise"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="HistoryManager.redo()" title="Redo"><i class="bi bi-arrow-clockwise"></i></button>
	
	<div class="w-px h-4 bg-base-content/20 mx-1"></div>
	
	<button class="btn btn-ghost btn-xs btn-square" onclick="ClipboardManager.cut()" title="Cut"><i class="bi bi-scissors"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="ClipboardManager.copy(false)" title="Copy"><i class="bi bi-files"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="ClipboardManager.paste()" title="Paste"><i class="bi bi-clipboard"></i></button>
	
	<div class="w-px h-4 bg-base-content/20 mx-1"></div>
	
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.toggleStyle('bold')" title="Bold"><i class="bi bi-type-bold"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.toggleStyle('italic')" title="Italic"><i class="bi bi-type-italic"></i></button>
	
	<!-- Font Size Dropdown -->
	<div class="dropdown">
		<div tabindex="0" role="button" class="btn btn-ghost btn-xs btn-square" title="Font Size"><i class="bi bi-type"></i></div>
		<ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-200">
			<li><a onclick="FormatManager.setFontSize('small')">Small</a></li>
			<li><a onclick="FormatManager.setFontSize('normal')">Normal</a></li>
			<li><a onclick="FormatManager.setFontSize('large')">Large</a></li>
			<li><a onclick="FormatManager.setFontSize('xl')">Extra Large</a></li>
		</ul>
	</div>
	
	<div class="w-px h-4 bg-base-content/20 mx-1"></div>
	
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.openColorDialog('text')" title="Text Color"><i class="bi bi-palette"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.openColorDialog('background')" title="Fill Color"><i class="bi bi-paint-bucket"></i></button>
	
	<!-- Borders Dropdown -->
	<div class="dropdown">
		<div tabindex="0" role="button" class="btn btn-ghost btn-xs btn-square" title="Borders"><i class="bi bi-border-all"></i></div>
		<div tabindex="0" class="dropdown-content z-[1] card card-compact w-36 shadow bg-base-100 border border-base-200">
			<div class="card-body grid grid-cols-3 gap-1 p-2">
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('all')" title="All"><i class="bi bi-border-all"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('outer')" title="Outer"><i class="bi bi-border-outer"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('none')" title="None"><i class="bi bi-border-none"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('top')" title="Top"><i class="bi bi-border-top"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('bottom')" title="Bottom"><i class="bi bi-border-bottom"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('left')" title="Left"><i class="bi bi-border-left"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setBorder('right')" title="Right"><i class="bi bi-border-right"></i></button>
				<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.openColorDialog('border')" title="Color"><i class="bi bi-palette2"></i></button>
			</div>
		</div>
	</div>
	
	<div class="w-px h-4 bg-base-content/20 mx-1"></div>
	
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setAlignment('left')" title="Align Left"><i class="bi bi-justify-left"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setAlignment('center')" title="Align Center"><i class="bi bi-text-center"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" onclick="FormatManager.setAlignment('right')" title="Align Right"><i class="bi bi-justify-right"></i></button>
	
	<div class="w-px h-4 bg-base-content/20 mx-1"></div>
	
	<button class="btn btn-ghost btn-xs btn-square" id="merge-btn" title="Merge Cells" disabled onclick="mergeCells()"><i class="bi bi-arrows-collapse"></i></button>
	<button class="btn btn-ghost btn-xs btn-square" id="unmerge-btn" title="Unmerge Cells" disabled onclick="unmergeCells()"><i class="bi bi-arrows-expand"></i></button>
	
	<div class="w-px h-4 bg-base-content/20 mx-1"></div>
	
	<button class="btn btn-ghost btn-xs btn-square" onclick="DropdownManager.openDropdownBuilder()" title="Dropdown"><i class="bi bi-list-ul"></i></button>
	<button class="btn btn-primary btn-xs" onclick="LLMManager.openFormulaBuilder()"><i class="bi bi-robot mr-1"></i> LLM</button>
</div>

<!-- Formula Bar -->
<div class="formula-bar-container">
	<div class="formula-icon">fx</div>
	<div id="formula-input" class="formula-input" contenteditable="false" placeholder="Select a cell..."></div>
</div>

<!-- Spreadsheet Area -->
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
					// FIX: Added style="width: 100px;" to force initial width
					echo "<th class='letter-cell' data-col='$colIndex' style='width: 100px;'>$letter</th>";
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

<!-- Sheet Tabs -->
<div class="sheet-tabs-container" id="sheet-tabs-container">
	<div class="add-sheet-btn" title="Add Sheet"><i class="bi bi-plus"></i></div>
</div>

<!-- Status Bar -->
<div class="status-bar">
	<div class="flex gap-4">
		<div class="flex items-center gap-1" title="Current Selection">
			<i class="bi bi-cursor"></i> <span id="status-selection">--</span>
		</div>
		<div class="flex items-center gap-1" title="File Name">
			<i class="bi bi-file-earmark-spreadsheet"></i>
			<span id="status-file">Untitled</span>
			<span id="status-modified" style="display:none;" class="text-warning font-bold">*</span>
		</div>
		<div id="status-llm-busy" style="display:none;" class="flex items-center gap-1 text-primary">
			<span class="loading loading-spinner loading-xs"></span>
			<span id="status-llm-text">Processing...</span>
		</div>
	</div>
	<div>
		<span>Ready</span>
	</div>
</div>

<!-- Toast -->
<div id="toast-notification" class="custom-toast">Saved</div>

<!-- Modals (Native <dialog>) -->

<!-- Project Modal -->
<dialog id="projectModal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg" id="projectModalLabel">Project Manager</h3>
		<div class="py-4">
			<div id="modal-save-section" style="display:none;">
				<label class="label"><span class="label-text">Project Name:</span></label>
				<div class="join w-full">
					<input type="text" class="input input-bordered join-item w-full" id="project-filename" placeholder="MySpreadsheet">
					<span class="btn join-item no-animation cursor-default">.json</span>
				</div>
			</div>
			<div id="modal-list-section">
				<h6 class="font-bold text-sm mb-2">Existing Projects:</h6>
				<div class="flex flex-col gap-1 max-h-60 overflow-y-auto border border-base-200 rounded p-1" id="project-list-group">
					<!-- Populated by JS -->
				</div>
				<div id="no-projects-msg" class="text-xs text-base-content/50 mt-2" style="display:none;">No projects found.</div>
			</div>
		</div>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Cancel</button>
			</form>
			<button class="btn btn-primary" id="modal-action-btn">Save</button>
		</div>
	</div>
</dialog>

<!-- LLM Settings Modal -->
<dialog id="llmSettingsModal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">LLM Settings</h3>
		<div class="py-4 flex flex-col gap-3">
			<div class="form-control">
				<label class="label"><span class="label-text">OpenRouter API Key:</span></label>
				<input type="password" class="input input-bordered" id="llm-api-key" placeholder="sk-or-...">
				<label class="label"><span class="label-text-alt">Saved in project file.</span></label>
			</div>
			<div class="form-control">
				<label class="label"><span class="label-text">Fal.ai API Key:</span></label>
				<input type="password" class="input input-bordered" id="llm-fal-key" placeholder="key-...">
				<label class="label"><span class="label-text-alt">For image generation.</span></label>
			</div>
		</div>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Cancel</button>
			</form>
			<button class="btn btn-primary" onclick="LLMManager.saveSettings()">Save Settings</button>
		</div>
	</div>
</dialog>

<!-- Sheet Properties Modal -->
<dialog id="sheetPropertiesModal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Sheet Properties</h3>
		<div class="py-4 flex flex-col gap-3">
			<div class="form-control">
				<label class="label"><span class="label-text">Sheet Name:</span></label>
				<input type="text" class="input input-bordered" id="sheet-prop-name" placeholder="Sheet1">
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="form-control">
					<label class="label"><span class="label-text">Rows:</span></label>
					<input type="number" class="input input-bordered" id="sheet-prop-rows" min="1" max="10000">
				</div>
				<div class="form-control">
					<label class="label"><span class="label-text">Columns:</span></label>
					<input type="number" class="input input-bordered" id="sheet-prop-cols" min="1" max="200">
				</div>
			</div>
		</div>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Cancel</button>
			</form>
			<button class="btn btn-primary" onclick="SheetPropertiesManager.save()">Apply</button>
		</div>
	</div>
</dialog>

<!-- LLM Formula Modal -->
<dialog id="llmFormulaModal" class="modal">
	<div class="modal-box w-11/12 max-w-4xl">
		<h3 class="font-bold text-lg">Insert LLM Formula</h3>
		<div class="py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
			<div class="form-control">
				<label class="label"><span class="label-text">Model:</span></label>
				<input type="text" class="input input-sm input-bordered mb-1" id="llm-model-filter" placeholder="Search models...">
				<div class="join">
					<select class="select select-bordered join-item w-full" id="llm-model-select">
						<option value="">Select a model...</option>
					</select>
					<button class="btn join-item" id="refresh-models-btn" onclick="LLMManager.fetchModels()" title="Refresh"><i class="bi bi-arrow-clockwise"></i></button>
				</div>
			</div>
			<div class="form-control">
				<label class="label"><span class="label-text">Target Cell (Output):</span></label>
				<input type="text" class="input input-bordered" id="llm-target-cell" placeholder="e.g. A1">
			</div>
			<div class="form-control md:col-span-2">
				<label class="label"><span class="label-text">Function Name (Button Text):</span></label>
				<input type="text" class="input input-bordered" id="llm-func-name" placeholder="Run LLM">
			</div>
			<div class="form-control md:col-span-2">
				<label class="label"><span class="label-text">Prompt:</span></label>
				<div id="llm-prompt-editor" class="llm-prompt-editor" contenteditable="true"></div>
				<label class="label"><span class="label-text-alt">Use #A1 or #A1:B5 to reference cells.</span></label>
			</div>
			<div class="form-control md:col-span-2">
				<label class="label"><span class="label-text">Expected JSON Structure:</span></label>
				<textarea class="textarea textarea-bordered font-mono text-xs h-24" id="llm-json-schema">{
  "Key": "Value"
}</textarea>
			</div>
		</div>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn">Cancel</button>
			</form>
			<button class="btn btn-primary" onclick="LLMManager.insertFormula()">Insert Formula</button>
		</div>
	</div>
</dialog>

<!-- Dropdown Modal -->
<dialog id="dropdownModal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Configure Dropdown</h3>
		<div class="py-4 flex flex-col gap-3">
			<div class="form-control">
				<label class="label"><span class="label-text">Options (comma separated or new lines):</span></label>
				<textarea class="textarea textarea-bordered h-24" id="dropdown-options" oninput="DropdownManager.updateSelectionPreview()"></textarea>
			</div>
			<div class="form-control">
				<label class="label"><span class="label-text">Current Selection:</span></label>
				<select class="select select-bordered" id="dropdown-selection">
					<option value="">(None)</option>
				</select>
			</div>
		</div>
		<div class="modal-action justify-between">
			<button class="btn btn-error btn-outline" onclick="DropdownManager.removeDropdown()">Remove</button>
			<div class="flex gap-2">
				<form method="dialog">
					<button class="btn">Cancel</button>
				</form>
				<button class="btn btn-primary" onclick="DropdownManager.saveDropdown()">Save</button>
			</div>
		</div>
	</div>
</dialog>

<!-- Color Picker Modal -->
<dialog id="colorPickerModal" class="modal">
	<div class="modal-box w-64">
		<h3 class="font-bold text-lg mb-4" id="colorPickerTitle">Select Color</h3>
		<input type="color" id="modal-color-input" class="w-full h-12 cursor-pointer" value="#000000">
		<div class="modal-action justify-between">
			<button class="btn btn-sm btn-outline" onclick="FormatManager.resetColorDialog()">Reset</button>
			<button class="btn btn-sm btn-primary" onclick="FormatManager.applyColorDialog()">Apply</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>

<!-- Alert Modal -->
<dialog id="alertModal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Alert</h3>
		<div class="py-4" id="alert-modal-body"></div>
		<div class="modal-action">
			<form method="dialog">
				<button class="btn btn-primary">OK</button>
			</form>
		</div>
	</div>
</dialog>

</body>
</html>
