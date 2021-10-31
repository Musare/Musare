export default (punishment, punishmentId) => ({
	type: punishment.type,
	value: punishment.value,
	reason: punishment.reason,
	expiresAt: new Date(punishment.expiresAt).getTime(),
	punishmentId
});
