export default (sessionId, userId) => ({
	sessionId,
	userId,
	refreshDate: Date.now(),
	created: Date.now()
});
