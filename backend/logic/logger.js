'use strict';

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
			console.info('\x1b[32m', timeString, 'SUCCESS', '-', type, '-', message, '\x1b[0m');
		});
	},
	error: (type, message) => {
		getTime((time) => {
			let timeString = `${time.year}-${twoDigits(time.month)}-${twoDigits(time.day)} ${twoDigits(time.hour)}:${twoDigits(time.minute)}:${twoDigits(time.second)}`;
			console.warn('\x1b[31m', timeString, 'ERROR', '-', type, '-', message, '\x1b[0m');
		});
	}
};
