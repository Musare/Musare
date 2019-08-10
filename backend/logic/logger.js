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
	initialize() {
		return new Promise((resolve, reject) => {
			this.configDirectory = `${__dirname}/../../log`;

			if (!config.isDocker && !fs.existsSync(`${this.configDirectory}`))
				fs.mkdirSync(this.configDirectory);

			let time = getTimeFormatted();

			fs.appendFile(this.configDirectory + '/all.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/success.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/error.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/info.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
			fs.appendFile(this.configDirectory + '/debugStation.log', `${time} BACKEND_RESTARTED\n`, ()=>{});

			resolve();
		});
	}

	async success(type, text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} SUCCESS - ${type} - ${text}`;

		this.writeFile('all.log', message);
		this.writeFile('success.log', message);

		if (display) console.info('\x1b[32m', message, '\x1b[0m');
	}

	async error(type, text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} ERROR - ${type} - ${text}`;

		this.writeFile('all.log', message);
		this.writeFile('error.log', message);

		if (display) console.warn('\x1b[31m', message, '\x1b[0m');
	}

	async info(type, text, display = true) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} INFO - ${type} - ${text}`;

		this.writeFile('all.log', message);
		this.writeFile('info.log', message);

		if (display) console.info('\x1b[36m', message, '\x1b[0m');
	}

	async stationIssue(text, display = false) {
		try { await this._validateHook(); } catch { return; }

		const time = getTimeFormatted();
		const message = `${time} DEBUG_STATION - ${text}`;

		this.writeFile('debugStation.log', message);

		if (display) console.info('\x1b[35m', message, '\x1b[0m');
	}

	

	writeFile(fileName, message) {
		fs.appendFile(`${this.configDirectory}/${fileName}`, `${message}\n`, ()=>{});
	}
}
