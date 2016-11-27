'use strict';

module.exports = (userId) => {
	return {
		userId: userId,
		created: Date.now()
	};
};
