import { SheetDataManager } from '../cascade-prompt-data.js';

let currentModalMode = '';

/**
 * Opens the Project Manager modal in the specified mode.
 * @param {string} mode - 'new', 'open', or 'save-as'
 */
export function openProjectModal (mode) {
	currentModalMode = mode;
	const modal = document.getElementById('projectModal');
	const title = document.getElementById('projectModalLabel');
	const saveSection = document.getElementById('modal-save-section');
	const listSection = document.getElementById('modal-list-section');
	const actionBtn = document.getElementById('modal-action-btn');
	const filenameInput = document.getElementById('project-filename');

	if (!modal) return;

	saveSection.style.display = 'none';
	listSection.style.display = 'none';
	filenameInput.value = '';

	if (mode === 'new') {
		SheetDataManager.newProject();
		return;
	}

	if (mode === 'save-as') {
		title.textContent = 'Save Project As';
		saveSection.style.display = 'block';
		listSection.style.display = 'block';
		actionBtn.textContent = 'Save';
		actionBtn.classList.remove('btn-disabled');
		if (SheetDataManager.currentFileName) {
			filenameInput.value = SheetDataManager.currentFileName;
		}
		loadProjectList(false);
	} else if (mode === 'open') {
		title.textContent = 'Open Project';
		listSection.style.display = 'block';
		actionBtn.textContent = 'Open';
		actionBtn.classList.add('btn-disabled');
		loadProjectList(true);
	}

	modal.showModal();
}

/**
 * Loads the list of available projects from the server.
 * @param {boolean} isSelectable - Defines interaction mode (currently unused but kept for consistency)
 */
function loadProjectList (isSelectable) {
	const listGroup = document.getElementById('project-list-group');
	const noMsg = document.getElementById('no-projects-msg');

	if (!listGroup) return;

	listGroup.innerHTML = '';

	SheetDataManager.listProjects(function (files) {
		if (files.length === 0) {
			noMsg.style.display = 'block';
		} else {
			noMsg.style.display = 'none';
			files.forEach(file => {
				const item = document.createElement('div');
				item.className = 'flex justify-between items-center p-2 hover:bg-base-200 cursor-pointer rounded project-list-item';

				const nameSpan = document.createElement('span');
				nameSpan.textContent = file;
				item.appendChild(nameSpan);

				const delBtn = document.createElement('button');
				delBtn.className = 'btn btn-xs btn-outline btn-error';
				delBtn.innerHTML = '<i class="bi bi-trash"></i>';
				delBtn.onclick = function (e) {
					e.stopPropagation();
					const isCurrentFile = file === SheetDataManager.currentFileName;

					SheetDataManager.deleteProject(file, function () {
						if (isCurrentFile) {
							document.getElementById('projectModal').close();
							SheetDataManager.newProject(true);
						} else {
							loadProjectList(isSelectable);
						}
					});
				};
				item.appendChild(delBtn);

				item.onclick = function () {
					document.querySelectorAll('.project-list-item').forEach(el => el.classList.remove('bg-primary', 'text-primary-content'));
					item.classList.add('bg-primary', 'text-primary-content');

					if (currentModalMode === 'save-as') {
						document.getElementById('project-filename').value = file;
					} else if (currentModalMode === 'open') {
						const btn = document.getElementById('modal-action-btn');
						btn.classList.remove('btn-disabled');
						btn.dataset.selectedFile = file;
					}
				};
				listGroup.appendChild(item);
			});
		}
	});
}

/**
 * Saves the current project. If no filename exists, opens 'Save As' modal.
 */
export function performSave () {
	if (SheetDataManager.currentFileName) {
		SheetDataManager.saveProject(SheetDataManager.currentFileName);
	} else {
		openProjectModal('save-as');
	}
}

/**
 * Initializes event listeners for the Project UI.
 */
export function initProjectHandlers () {
	const actionBtn = document.getElementById('modal-action-btn');
	if (actionBtn) {
		actionBtn.addEventListener('click', function () {
			if (currentModalMode === 'save-as') {
				const filenameInput = document.getElementById('project-filename');
				const filename = filenameInput.value.trim();
				if (filename) {
					SheetDataManager.saveProject(filename);
					document.getElementById('projectModal').close();
				} else {
					if (typeof window.showCustomAlert === 'function') {
						window.showCustomAlert('Please enter a filename');
					}
				}
			} else if (currentModalMode === 'open') {
				const filename = this.dataset.selectedFile;
				if (filename) {
					SheetDataManager.loadProject(filename);
					document.getElementById('projectModal').close();
				}
			}
		});
	}

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
}