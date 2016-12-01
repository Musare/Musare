'use strict';

module.exports = (sessionId, userId) => {
	return {
		sessionId: sessionId,
		userId: userId,
		created: Date.now()
	};
};
