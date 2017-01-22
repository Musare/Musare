'use strict';

const fs = require('fs');
/*const log_file = fs.createWriteStream(__dirname + '/../../all.log', {flags : 'w'});
const success_log_file = fs.createWriteStream(__dirname + '/../../success.log', {flags : 'w'});
const error_log_file = fs.createWriteStream(__dirname + '/../../error.log', {flags : 'w'});
const info_log_file = fs.createWriteStream(__dirname + '/../../info.log', {flags : 'w'});*/

let twoDigits = (num) => {
	return (num < 10) ? '0' + num : num;
};

let getTime = (cb) => {
	let time = new Date();
	return cb ({
		year: time.getFullYear(),
		month: time.getMonth() + 1,
		day: time.getDate(),
		hour: time.getHours(),
		minute: time.getMinutes(),
		second: time.getSeconds()
	});
};

module.exports = {
	success: (type, message) => {
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(__dirname + '/../../all.log', `${timeString} SUCCESS - ${type} - ${message}\n`);
			fs.appendFile(__dirname + '/../../success.log', `${timeString} SUCCESS - ${type} - ${message}\n`);
			console.info('\x1b[32m', timeString, 'SUCCESS', '-', type, '-', message, '\x1b[0m');
		});
	},
	error: (type, message) => {
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(__dirname + '/../../all.log', `${timeString} ERROR - ${type} - ${message}\n`);
			fs.appendFile(__dirname + '/../../error.log', `${timeString} ERROR - ${type} - ${message}\n`);
			console.warn('\x1b[31m', timeString, 'ERROR', '-', type, '-', message, '\x1b[0m');
		});
	},
	info: (type, message) => {
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			fs.appendFile(__dirname + '/../../all.log', `${timeString} INFO - ${type} - ${message}\n`);
			fs.appendFile(__dirname + '/../../info.log', `${timeString} INFO - ${type} - ${message}\n`);

			console.info('\x1b[36m', timeString, 'INFO', '-', type, '-', message, '\x1b[0m');
		});
	}
};
