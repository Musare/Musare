export default {
	guid: () => {
		[1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1]
			.map(b =>
				b
					? Math.floor((1 + Math.random()) * 0x10000)
							.toString(16)
							.substring(1)
					: "-"
			)
			.join("");
	},
	formatTime: originalDuration => {
		if (originalDuration) {
			if (originalDuration < 0) return "0:00";

			let duration = originalDuration;
			let hours = Math.floor(duration / (60 * 60));
			duration -= hours * 60 * 60;
			let minutes = Math.floor(duration / 60);
			duration -= minutes * 60;
			let seconds = Math.floor(duration);

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
	}
};
