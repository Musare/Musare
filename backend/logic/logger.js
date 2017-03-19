'use strict';

const dir = `${__dirname}/../../log`;
const fs = require('fs');
const config = require('config');
let utils;

if (!config.isDocker && !fs.existsSync(`${dir}`)) {
	fs.mkdirSync(dir);
}

let started;
let success = 0;
let successThisMinute = 0;
let successThisHour = 0;
let error = 0;
let errorThisMinute = 0;
let errorThisHour = 0;
let info = 0;
let infoThisMinute = 0;
let infoThisHour = 0;

let successUnitsPerMinute = [0,0,0,0,0,0,0,0,0,0];
let errorUnitsPerMinute = [0,0,0,0,0,0,0,0,0,0];
let infoUnitsPerMinute = [0,0,0,0,0,0,0,0,0,0];

let successUnitsPerHour = [0,0,0,0,0,0,0,0,0,0];
let errorUnitsPerHour = [0,0,0,0,0,0,0,0,0,0];
let infoUnitsPerHour = [0,0,0,0,0,0,0,0,0,0];

function calculateUnits(units, unit) {
	units.push(unit);
	if (units.length > 10) units.shift();
	return units;
}

function calculateHourUnits() {
	successUnitsPerHour = calculateUnits(successUnitsPerHour, successThisHour);
	errorUnitsPerHour = calculateUnits(errorUnitsPerHour, errorThisHour);
	infoUnitsPerHour = calculateUnits(infoUnitsPerHour, infoThisHour);

	successThisHour = 0;
	errorThisHour = 0;
	infoThisHour = 0;

	utils.emitToRoom('admin.statistics', 'event:admin.statistics.success.units.hour', successUnitsPerHour);
	utils.emitToRoom('admin.statistics', 'event:admin.statistics.error.units.hour', errorUnitsPerHour);
	utils.emitToRoom('admin.statistics', 'event:admin.statistics.info.units.hour', infoUnitsPerHour);

	setTimeout(calculateHourUnits, 1000 * 60 * 60)
}

function calculateMinuteUnits() {
	successUnitsPerMinute = calculateUnits(successUnitsPerMinute, successThisMinute);
	errorUnitsPerMinute = calculateUnits(errorUnitsPerMinute, errorThisMinute);
	infoUnitsPerMinute = calculateUnits(infoUnitsPerMinute, infoThisMinute);

	successThisMinute = 0;
	errorThisMinute = 0;
	infoThisMinute = 0;

	utils.emitToRoom('admin.statistics', 'event:admin.statistics.success.units.minute', successUnitsPerMinute);
	utils.emitToRoom('admin.statistics', 'event:admin.statistics.error.units.minute', errorUnitsPerMinute);
	utils.emitToRoom('admin.statistics', 'event:admin.statistics.info.units.minute', infoUnitsPerMinute);
	
	setTimeout(calculateMinuteUnits, 1000 * 60)
}

let twoDigits = (num) => {
	return (num < 10) ? '0' + num : num;
};

let getTime = () => {
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

let getTimeFormatted = () => {
	let time = getTime();
	return `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
}

module.exports = {
	init: function(cb) {
		utils = require('./utils');
		started = Date.now();

		setTimeout(calculateMinuteUnits, 1000 * 60);
		setTimeout(calculateHourUnits, 1000 * 60 * 60);
		setTimeout(this.calculate, 1000 * 30);

		let time = getTimeFormatted();
		fs.appendFile(dir + '/all.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
		fs.appendFile(dir + '/success.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
		fs.appendFile(dir + '/error.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
		fs.appendFile(dir + '/info.log', `${time} BACKEND_RESTARTED\n`, ()=>{});
		fs.appendFile(dir + '/debugStation.log', `${time} BACKEND_RESTARTED\n`, ()=>{});

		cb();
	},
	success: (type, message) => {
		success++;
		successThisMinute++;
		successThisHour++;
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(dir + '/all.log', `${timeString} SUCCESS - ${type} - ${message}\n`, ()=>{});
			fs.appendFile(dir + '/success.log', `${timeString} SUCCESS - ${type} - ${message}\n`, ()=>{});
			console.info('\x1b[32m', timeString, 'SUCCESS', '-', type, '-', message, '\x1b[0m');
		});
	},
	error: (type, message) => {
		error++;
		errorThisMinute++;
		errorThisHour++;
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(dir + '/all.log', `${timeString} ERROR - ${type} - ${message}\n`, ()=>{});
			fs.appendFile(dir + '/error.log', `${timeString} ERROR - ${type} - ${message}\n`, ()=>{});
			console.warn('\x1b[31m', timeString, 'ERROR', '-', type, '-', message, '\x1b[0m');
		});
	},
	info: (type, message) => {
		info++;
		infoThisMinute++;
		infoThisHour++;
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(dir + '/all.log', `${timeString} INFO - ${type} - ${message}\n`, ()=>{});
			fs.appendFile(dir + '/info.log', `${timeString} INFO - ${type} - ${message}\n`, ()=>{});

			console.info('\x1b[36m', timeString, 'INFO', '-', type, '-', message, '\x1b[0m');
		});
	},
	stationIssue: (string) => {
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(dir + '/debugStation.log', `${timeString} - ${string}\n`, ()=>{});

			console.info('\x1b[35m', timeString, '-', string, '\x1b[0m');
		});
	},
	calculatePerSecond: function(number) {
		let secondsRunning = Math.floor((Date.now() - started) / 1000);
		let perSecond = number / secondsRunning;
		return perSecond;
	},
	calculatePerMinute: function(number) {
		let perMinute = this.calculatePerSecond(number) * 60;
		return perMinute;
	},
	calculatePerHour: function(number) {
		let perHour = this.calculatePerMinute(number) * 60;
		return perHour;
	},
	calculatePerDay: function(number) {
		let perDay = this.calculatePerHour(number) * 24;
		return perDay;
	},
	calculate: function() {
		let _this = module.exports;
		utils.emitToRoom('admin.statistics', 'event:admin.statistics.logs', {
			second: {
				success: _this.calculatePerSecond(success),
				error: _this.calculatePerSecond(error),
				info: _this.calculatePerSecond(info)
			},
			minute: {
				success: _this.calculatePerMinute(success),
				error: _this.calculatePerMinute(error),
				info: _this.calculatePerMinute(info)
			},
			hour: {
				success: _this.calculatePerHour(success),
				error: _this.calculatePerHour(error),
				info: _this.calculatePerHour(info)
			},
			day: {
				success: _this.calculatePerDay(success),
				error: _this.calculatePerDay(error),
				info: _this.calculatePerDay(info)
			}
		});
		setTimeout(_this.calculate, 1000 * 30);
	}
};
