'use strict';

const coreClass = require("../core");

const config = require('config');
const fs = require('fs');

const twoDigits = (num) => {
	return (num < 10) ? '0' + num : num;
};

const getTime = () => {
	let time = new Date();
	return {
		year: time.getFullYear(),
		month: time.getMonth() + 1,
		day: time.getDate(),
		hour: time.getHours(),
		minute: time.getMinutes(),
		second: time.getSeconds()
	}
};

const getTimeFormatted = () => {
	let time = getTime();
	return `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
}

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);
		this.lockdownImmune = true;
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.configDirectory = `${__dirname}/../../log`;

			if (!config.isDocker && !fs.existsSync(`${this.configDirectory}`))
				fs.mkdirSync(this.configDirectory);

			let time = getTimeFormatted();

			this.logCbs = [];

			this.colors = {
				Reset: "\x1b[0m",
				Bright: "\x1b[1m",
				Dim: "\x1b[2m",
				Underscore: "\x1b[4m",
				Blink: "\x1b[5m",
				Reverse: "\x1b[7m",
				Hidden: "\x1b[8m",

				FgBlack: "\x1b[30m",
				FgRed: "\x1b[31m",
				FgGreen: "\x1b[32m",
				FgYellow: "\x1b[33m",
				FgBlue: "\x1b[34m",
				FgMagenta: "\x1b[35m",
				FgCyan: "\x1b[36m",
				FgWhite: "\x1b[37m",

				BgBlack: "\x1b[40m",
				BgRed: "\x1b[41m",
				BgGreen: "\x1b[42m",
				BgYellow: "\x1b[43m",
				BgBlue: "\x1b[44m",
				BgMagenta: "\x1b[45m",
				BgCyan: "\x1b[46m",
				BgWhite: "\x1b[47m"
			};

			fs.appendFile(this.configDirectory + '/all.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/success.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/error.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/info.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/debugStation.log', `${time} BACKEND_RESTARTED\n`, ()=>{});

			if (this.moduleManager.fancyConsole) {
				process.stdout.write(Array(this.reservedLines).fill(`\n`).join(""));
			}

			resolve();
		});
	}

	async success(type, text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} SUCCESS - ${type} - ${text}`;

		this.writeFile('all.log', message);
		this.writeFile('success.log', message);

		if (display) this.log(this.colors.FgGreen, message);
	}

	async error(type, text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} ERROR - ${type} - ${text}`;

		this.writeFile('all.log', message);
		this.writeFile('error.log', message);

		if (display) this.log(this.colors.FgRed, message);
	}

	async info(type, text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} INFO - ${type} - ${text}`;

		this.writeFile('all.log', message);
		this.writeFile('info.log', message);
		if (display) this.log(this.colors.FgCyan, message);
	}

	async debug(text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} DEBUG - ${text}`;

		if (display) this.log(this.colors.FgMagenta, message);
	}

	async stationIssue(text, display = false) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} DEBUG_STATION - ${text}`;

		this.writeFile('debugStation.log', message);

		if (display) this.log(this.colors.FgMagenta, message);
	}

	log(color, message) {
		if (this.moduleManager.fancyConsole) {
			const rows = process.stdout.rows;
			const columns = process.stdout.columns;
			const lineNumber = rows - this.reservedLines;

			
			let lines = 0;
			
			message.split("\n").forEach((line) => {
				lines += Math.floor(line.replace("\t", "    ").length / columns) + 1;
			});

			if (lines > this.logger.reservedLines)
				lines = this.logger.reservedLines;

			process.stdout.cursorTo(0, rows - this.logger.reservedLines);
			process.stdout.clearScreenDown();

			process.stdout.cursorTo(0, lineNumber);
			process.stdout.write(`${color}${message}${this.colors.Reset}\n`);

			process.stdout.cursorTo(0, process.stdout.rows);
			process.stdout.write(Array(lines).fill(`\n!`).join(""));

			this.moduleManager.printStatus();
		} else console.log(`${color}${message}${this.colors.Reset}`);
	}

	writeFile(fileName, message) {
		fs.appendFile(`${this.configDirectory}/${fileName}`, `${message}\n`, ()=>{});
	}
}
