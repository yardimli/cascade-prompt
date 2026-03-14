import { SheetDataManager } from '../cascade-prompt-data.js';
import { getApiEndpoint } from '../api-config.js';
import { LLMBuilder } from './llm-builder.js';

export const LLMRunner = {
	executeLLM: function (r, c, event) {
		if (event) event.stopPropagation();
		if (!SheetDataManager.currentFileName) return window.showCustomAlert('Please save your project first.');

		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		const cellData = sheet.cells[`${r}-${c}`];
		if (!cellData || !cellData.type || cellData.type.name !== 'llm_formula') return;

		const config = cellData.type.details;
		const btn = document.querySelector(`.spreadsheet tbody tr:nth-child(${r + 1}) td[data-col="${c}"] .llm-run-btn`);
		const originalIcon = btn.innerHTML;
		btn.innerHTML = '<div class="llm-spinner"></div>'; btn.disabled = true;
		document.getElementById('status-llm-busy').style.display = 'flex';

		let finalPrompt = config.prompt.replace(/#([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?/gi, (match, c1, r1, c2, r2) => {
			return LLMBuilder.getRangePreview(c1, r1, c2, r2, false);
		});
		finalPrompt += '\n\nIMPORTANT: Respond ONLY with valid JSON matching this structure:\n' + config.jsonSchema;

		fetch(getApiEndpoint('llm_proxy'), {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'chat', filename: SheetDataManager.currentFileName, model: config.model, messages: [{ role: 'user', content: finalPrompt }] })
		})
			.then(r => r.json()).then(data => {
			if (data.success && data.data) {
				if (this.validateStructure(data.data, config.jsonSchema)) {
					this.parseAndInsert(data.data, config.targetRow, config.targetCol, config.jsonSchema, config.includeHeaders, config.insertMode);
				} else window.showCustomAlert('LLM returned data mismatching schema.');
			} else window.showCustomAlert('LLM Error: ' + (data.message || 'Unknown'));
		})
			.catch(e => window.showCustomAlert('Error: ' + e.message))
			.finally(() => {
				if (btn) { btn.innerHTML = originalIcon; btn.disabled = false; }
				document.getElementById('status-llm-busy').style.display = 'none';
			});
	},
	validateStructure: function(data, schemaStr) {
		try {
			const schema = JSON.parse(schemaStr);
			const getKeys = o => (Array.isArray(o) && o[0] ? Object.keys(o[0]) : (o ? Object.keys(o) : [])).sort();
			return JSON.stringify(getKeys(schema)) === JSON.stringify(getKeys(data)) || (Array.isArray(data) && !Array.isArray(schema) && JSON.stringify(getKeys(data)) === JSON.stringify(Object.keys(schema).sort()));
		} catch (e) { return true; }
	},
	parseAndInsert: function(jsonData, startR, startC, schemaStr, headers, mode) {
		if (typeof window.HistoryManager !== 'undefined') window.HistoryManager.addState();
		const sheet = SheetDataManager.data.sheets[SheetDataManager.data.activeSheetIndex];
		let r = startR;
		if (mode === 'append') {
			while (r < sheet.rowCount) {
				const cell = sheet.cells[`${r}-${startC}`];
				if (!cell || !cell.type || (cell.type.name === 'text' && !cell.type.details.value)) break;
				r++;
			}
			if (r >= sheet.rowCount) r = sheet.rowCount;
		}

		let keys = [];
		try { const s = JSON.parse(schemaStr); keys = Array.isArray(s) && s[0] ? Object.keys(s[0]) : Object.keys(s); } catch (e) {}

		if (headers && keys.length) { keys.forEach((k, i) => this.setCellValue(sheet, r, startC + i, k)); r++; }

		const rows = Array.isArray(jsonData) ? jsonData : (keys.length ? [jsonData] : Object.keys(jsonData).map(k => ({key: k, value: jsonData[k]})));
		rows.forEach(row => {
			if (typeof row !== 'object' || row === null) this.setCellValue(sheet, r, startC, row);
			else if (keys.length) keys.forEach((k, i) => this.setCellValue(sheet, r, startC + i, typeof row[k] === 'object' ? JSON.stringify(row[k]) : row[k]));
			else Object.values(row).forEach((v, i) => this.setCellValue(sheet, r, startC + i, typeof v === 'object' ? JSON.stringify(v) : v));
			r++;
		});
		SheetDataManager.renderSheet(SheetDataManager.data.activeSheetIndex);
		SheetDataManager.setModified(true);
		window.showToast('LLM Data Inserted');
	},
	setCellValue: function(sheet, r, c, val) {
		const key = `${r}-${c}`;
		if (!sheet.cells[key]) sheet.cells[key] = { rowspan: 1, colspan: 1, style: {}, cellStyle: {} };
		sheet.cells[key].type = { name: 'text', details: { value: String(val === undefined || val === null ? '' : val) } };
		delete sheet.cells[key].llm; delete sheet.cells[key].html;
	}
};