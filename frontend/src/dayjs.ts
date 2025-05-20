import dayjs, { Dayjs, PluginFunc } from "dayjs";
import duration, { Duration } from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

declare module "dayjs/plugin/duration" {
	interface Duration {
		formatDuration(): string;
	}
}

const formatDuration: PluginFunc = (option, dayjsClass, dayjsFactory) => {
	const durationPrototype = Object.getPrototypeOf(dayjsFactory.duration(0));

	durationPrototype.formatDuration = function formatDuration() {
		if (this.hours() === 0) {
			return this.format("mm:ss");
		}

		return this.format("HH:mm:ss");
	};
};

dayjs.extend(duration);
dayjs.extend(formatDuration);
dayjs.extend(relativeTime);
dayjs.extend(utc);

export default dayjs;

export type { Dayjs, Duration };
