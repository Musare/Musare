const shortcuts = {};

let _shortcuts = [];

const lib = {
	handleKeyDown(event, keyCode, shift, ctrl, alt) {
		_shortcuts.forEach(shortcut => {
			if (
				shortcut.keyCode === keyCode &&
				shortcut.shift === shift &&
				shortcut.ctrl === ctrl &&
				shortcut.alt === alt
			) {
				console.log(
					`Executing shortcut ${shortcut.name}. Prevent default: ${shortcut.preventDefault}`
				);

				if (shortcut.preventDefault === true) event.preventDefault();

				shortcut.handler(event);
			}
		});
	},

	registerShortcut(name, shortcut) {
		shortcuts[name] = shortcut;
		shortcuts[name].name = name;
		shortcuts[name].alt = shortcuts[name].alt ? shortcuts[name].alt : false;
		shortcuts[name].ctrl = shortcuts[name].ctrl
			? shortcuts[name].ctrl
			: false;
		shortcuts[name].shift = shortcuts[name].shift
			? shortcuts[name].shift
			: false;
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
