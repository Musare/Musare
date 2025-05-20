import dayjs, { Dayjs } from "dayjs";
import duration, { Duration } from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(utc);

export default dayjs;

export type { Dayjs, Duration };
