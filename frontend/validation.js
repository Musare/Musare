module.exports = {
	regex: {
		azAZ09_: /^[A-Za-z0-9_]+$/,
		az09_: /^[a-z0-9_]+$/,
		emailSimple: /^[\x00-\x7F]+@[a-z0-9]+\.[a-z0-9]+(\.[a-z0-9]+)?$/,
		ascii: /^[\x00-\x7F]+$/,
		custom: regex => {
			return new RegExp(`^[${regex}]+$`);
		}
	},
	isLength: (string, min, max) => {
		return !(
			typeof string !== "string" ||
			string.length < min ||
			string.length > max
		);
	}
};
