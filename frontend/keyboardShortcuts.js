const shortcuts = {};

let _shortcuts = [];

const lib = {
	handleKeyDown(keyCode, shift, ctrl) {
		_shortcuts.forEach(shortcut => {
			if (
				shortcut.keyCode === keyCode &&
				shortcut.shift === shift &&
				shortcut.ctrl === ctrl
			)
				shortcut.handler();
		});
	},

	registerShortcut(name, shortcut) {
		shortcuts[name] = shortcut;
		lib.remakeShortcutsArray();
	},

	unregisterShortcut: name => {
		delete shortcuts[name];
		lib.remakeShortcutsArray();
	},

	remakeShortcutsArray: () => {
		_shortcuts = Object.keys(shortcuts).map(key => shortcuts[key]);
	}
};

export default lib;
