export const ThemeManager = {
	initTheme: function() {
		let theme = localStorage.getItem('cascade_theme');
		if (!theme) theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
		this.setTheme(theme, false);
	},
	setTheme: function(themeName, save = true) {
		document.documentElement.setAttribute('data-theme', themeName);
		if (save) localStorage.setItem('cascade_theme', themeName);
		this.updateThemeMenu(themeName);
	},
	updateThemeMenu: function(activeTheme) {
		['light', 'dark', 'cupcake', 'retro'].forEach(t => {
			const icon = document.getElementById(`theme-check-${t}`);
			if (icon) icon.classList.toggle('invisible', t !== activeTheme);
		});
	},
	initUiSize: function() {
		const savedSize = localStorage.getItem('cascade_ui_size') || 'normal';
		this.setUiFontSize(savedSize, false);
	},
	setUiFontSize: function(size, save = true) {
		document.documentElement.setAttribute('data-ui-size', size);
		if (save) localStorage.setItem('cascade_ui_size', size);
		this.updateUiSizeMenu(size);
	},
	updateUiSizeMenu: function(activeSize) {
		['small', 'normal', 'large'].forEach(s => {
			const icon = document.getElementById(`size-check-${s}`);
			if (icon) icon.classList.toggle('invisible', s !== activeSize);
		});
	}
};