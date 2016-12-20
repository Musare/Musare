'use strict';

let twoDigits = (num) => {
	return (num < 10) ? '0' + num : num;
}

module.exports = {
	log: function(type, level, message) {
		let time = new Date();
		let year = time.getFullYear();
		let month = time.getMonth() + 1;
		let day = time.getDate();
		let hour = time.getHours();
		let minute = time.getMinutes();
		let second = time.getSeconds();
		let timeString = year + '-' + twoDigits(month) + '-' + twoDigits(day) + ' ' + twoDigits(hour) + ':' + twoDigits(minute) + ':' + twoDigits(second);
		console.log(timeString, level, type, "-", message);
	}
};
