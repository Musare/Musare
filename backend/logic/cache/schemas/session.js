'use strict';

module.exports = (sessionId, userId) => {
	return {
		sessionId: sessionId,
		userId: userId,
		refreshDate: Date.now(),
		created: Date.now()
	};
};
