import crypto from "crypto";
import CoreClass from "../core";

let UtilsModule;

class _UtilsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("utils");

		UtilsModule = this;
	}

	/**
	 * Initialises the utils module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => resolve());
	}

	/**
	 * Parses the cookie into a readable object
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.cookieString - the cookie string
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	PARSE_COOKIES(payload) {
		return new Promise((resolve, reject) => {
			const cookies = {};

			if (typeof payload.cookieString !== "string") return reject(new Error("Cookie string is not a string"));

			// eslint-disable-next-line array-callback-return
			payload.cookieString.split("; ").map(cookie => {
				cookies[cookie.substring(0, cookie.indexOf("="))] = cookie.substring(
					cookie.indexOf("=") + 1,
					cookie.length
				);
			});

			return resolve(cookies);
		});
	}

	// COOKIES_TO_STRING() {//cookies
	// 	return new Promise((resolve, reject) => {
	//         let newCookie = [];
	//         for (let prop in cookie) {
	//             newCookie.push(prop + "=" + cookie[prop]);
	//         }
	//         return newCookie.join("; ");
	//     });
	// }

	/**
	 * Removes a cookie by name
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.cookieString - the cookie string
	 * @param {string} payload.cookieName - the unique name of the cookie
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	REMOVE_COOKIE(payload) {
		return new Promise((resolve, reject) => {
			let cookies;

			try {
				cookies = UtilsModule.runJob(
					"PARSE_COOKIES",
					{
						cookieString: payload.cookieString
					},
					this
				);
			} catch (err) {
				return reject(err);
			}

			delete cookies[payload.cookieName];

			return resolve();
		});
	}

	/**
	 * Replaces any html reserved characters in a string with html entities
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.str - the string to replace characters with html entities
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	HTML_ENTITIES(payload) {
		return new Promise(resolve => {
			resolve(
				String(payload.str)
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
			);
		});
	}

	/**
	 * Generates a random string of a specified length
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {number} payload.length - the length the random string should be
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GENERATE_RANDOM_STRING(payload) {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");

		const promises = [];
		for (let i = 0; i < payload.length; i += 1) {
			promises.push(
				UtilsModule.runJob(
					"GET_RANDOM_NUMBER",
					{
						min: 0,
						max: chars.length - 1
					},
					this
				)
			);
		}

		const randomNums = await Promise.all(promises);

		const randomChars = [];
		for (let i = 0; i < payload.length; i += 1) {
			randomChars.push(chars[randomNums[i]]);
		}

		return new Promise(resolve => resolve(randomChars.join("")));
	}

	/**
	 * Creates a random number within a range
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {number} payload.min - the minimum number the result should be
	 * @param {number} payload.max - the maximum number the result should be
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_RANDOM_NUMBER(payload) {
		// min, max
		return new Promise(resolve =>
			resolve(Math.floor(Math.random() * (payload.max - payload.min + 1)) + payload.min)
		);
	}

	/**
	 * Converts ISO8601 time format (YouTube API) to HH:MM:SS
	 *
	 * @param  {object} payload - object contaiing the payload
	 * @param {string} payload.duration - string in the format of ISO8601
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CONVERT_TIME(payload) {
		// duration
		return new Promise(resolve => {
			let { duration } = payload;
			let a = duration.match(/\d+/g);

			if (duration.indexOf("M") >= 0 && duration.indexOf("H") === -1 && duration.indexOf("S") === -1) {
				a = [0, a[0], 0];
			}

			if (duration.indexOf("H") >= 0 && duration.indexOf("M") === -1) {
				a = [a[0], 0, a[1]];
			}
			if (duration.indexOf("H") >= 0 && duration.indexOf("M") === -1 && duration.indexOf("S") === -1) {
				a = [a[0], 0, 0];
			}

			duration = 0;

			if (a.length === 3) {
				duration += parseInt(a[0]) * 3600;
				duration += parseInt(a[1]) * 60;
				duration += parseInt(a[2]);
			}

			if (a.length === 2) {
				duration += parseInt(a[0]) * 60;
				duration += parseInt(a[1]);
			}

			if (a.length === 1) {
				duration += parseInt(a[0]);
			}

			const hours = Math.floor(duration / 3600);
			const minutes = Math.floor((duration % 3600) / 60);
			const seconds = Math.floor((duration % 3600) % 60);

			resolve(
				(hours < 10 ? `0${hours}:` : `${hours}:`) +
					(minutes < 10 ? `0${minutes}:` : `${minutes}:`) +
					(seconds < 10 ? `0${seconds}` : seconds)
			);
		});
	}

	/**
	 * Creates a random identifier for e.g. sessionId
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GUID() {
		return new Promise(resolve => {
			resolve(
				[1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1]
					.map(b =>
						b
							? Math.floor((1 + Math.random()) * 0x10000)
									.toString(16)
									.substring(1)
							: "-"
					)
					.join("")
			);
		});
	}

	/**
	 * Shuffles an array
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.array - an array of songs that should be shuffled
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SHUFFLE(payload) {
		// array
		return new Promise(resolve => {
			const { array } = payload;

			// sort the positions array
			let currentIndex = array.length;
			let temporaryValue;
			let randomIndex;

			// While there remain elements to shuffle...
			while (currentIndex !== 0) {
				// Pick a remaining element...
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = array[currentIndex];
				array[currentIndex] = array[randomIndex];
				array[randomIndex] = temporaryValue;
			}

			resolve({ array });
		});
	}

	/**
	 * Shuffles an array of songs by their position property
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.array - an array of songs that should be shuffled
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SHUFFLE_SONG_POSITIONS(payload) {
		// array
		return new Promise(resolve => {
			const { array } = payload;

			// get array of positions
			const positions = [];
			array.forEach(song => positions.push(song.position));

			// sort the positions array
			let currentIndex = positions.length;
			let temporaryValue;
			let randomIndex;

			// While there remain elements to shuffle...
			while (currentIndex !== 0) {
				// Pick a remaining element...
				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex -= 1;

				// And swap it with the current element.
				temporaryValue = positions[currentIndex];
				positions[currentIndex] = positions[randomIndex];
				positions[randomIndex] = temporaryValue;
			}

			// assign new positions
			array.forEach((song, index) => {
				song.position = positions[index];
			});

			resolve({ array });
		});
	}

	/**
	 * Creates an error
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.error - object that contains the error
	 * @param {string} payload.message - possible error message
	 * @param {object} payload.errors - possible object that contains multiple errors
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ERROR(payload) {
		return new Promise(resolve => {
			let error = "An error occurred.";
			if (typeof payload.error === "string") error = payload.error;
			else if (payload.error.message) {
				if (payload.error.message !== "Validation failed") error = payload.error.message;
				else error = payload.error.errors[Object.keys(payload.error.errors)].message;
			}
			resolve(error);
		});
	}

	/**
	 * Creates the gravatar url for a specified email address
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.email - the email address
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_GRAVATAR(payload) {
		return new Promise(resolve => {
			const hash = crypto.createHash("md5").update(payload.email).digest("hex");

			resolve(`https://www.gravatar.com/avatar/${hash}`);
		});
	}

	/**
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DEBUG() {
		return new Promise(resolve => resolve());
	}
}

export default new _UtilsModule();
