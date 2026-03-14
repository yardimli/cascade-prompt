import { LLMSettings } from './llm/llm-settings.js';
import { LLMBuilder } from './llm/llm-builder.js';
import { LLMRunner } from './llm/llm-runner.js';

export const LLMManager = {
	models: [],
	init: function() { LLMBuilder.init(); this.models = LLMBuilder.models; },
	openSettings: function() { LLMSettings.openSettings(); },
	saveSettings: function() { LLMSettings.saveSettings(); },
	openFormulaBuilder: function() { LLMBuilder.openFormulaBuilder(); },
	fetchModels: function() { LLMBuilder.fetchModels(); },
	insertFormula: function() { LLMBuilder.insertFormula(); },
	executeLLM: function(r, c, e) { LLMRunner.executeLLM(r, c, e); },
	// Helper needed for UI
	getRangePreview: function(c1, r1, c2, r2, isPreview = true) { return LLMBuilder.getRangePreview(c1, r1, c2, r2, isPreview); }
};