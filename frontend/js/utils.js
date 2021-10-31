export default {
	guid: () =>
		[1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1]
			.map(b =>
				b
					? Math.floor((1 + Math.random()) * 0x10000)
							.toString(16)
							.substring(1)
					: "-"
			)
			.join("")
};
