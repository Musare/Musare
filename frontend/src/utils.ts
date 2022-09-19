export default {
	guid: () =>
		"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, symbol => {
			let array;

			if (symbol === "y") {
				array = ["8", "9", "a", "b"];
				return array[Math.floor(Math.random() * array.length)];
			}

			array = new Uint8Array(1);
			window.crypto.getRandomValues(array);
			return (array[0] % 16).toString(16);
		}),
	formatTime: originalDuration => {
		if (typeof originalDuration === "number") {
			if (originalDuration <= 0) return "0:00";

			let duration = originalDuration;
			let hours: number | string = Math.floor(duration / (60 * 60));
			duration -= hours * 60 * 60;
			let minutes: number | string = Math.floor(duration / 60);
			duration -= minutes * 60;
			let seconds: number | string = Math.floor(duration);

			if (hours === 0) {
				hours = "";
			}

			if (hours > 0) {
				if (minutes < 10) minutes = `0${minutes}`;
			}

			if (seconds < 10) {
				seconds = `0${seconds}`;
			}

			return `${hours}${hours ? ":" : ""}${minutes}:${seconds}`;
		}
		return false;
	},
	formatTimeLong: duration => {
		if (duration <= 0) return "0 seconds";

		const hours = Math.floor(duration / (60 * 60));
		const formatHours = () => {
			if (hours > 0) {
				if (hours > 1) return `${hours} hours `;
				return `${hours} hour `;
			}
			return "";
		};

		const minutes = Math.floor((duration - hours * 60 * 60) / 60);
		const formatMinutes = () => {
			if (minutes > 0) {
				if (minutes > 1) return `${minutes} minutes `;
				return `${minutes} minute `;
			}
			return "";
		};

		const seconds = Math.floor(duration - hours * 60 * 60 - minutes * 60);
		const formatSeconds = () => {
			if (seconds > 0) {
				if (seconds > 1) return `${seconds} seconds `;
				return `${seconds} second `;
			}
			return "";
		};

		return formatHours() + formatMinutes() + formatSeconds();
	}
};
