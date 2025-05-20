import { faker } from "@faker-js/faker";
import dayjs from "@/dayjs";

describe("dayjs formatDuration plugin", () => {
	test("value < 1 hour displays minutes and seconds", () => {
		dayjs.duration(faker.number.int({ max: 359 }), "s");
	});

	test("value >= 1 hour displays hours, minutes and seconds", () => {
		dayjs.duration(faker.number.int({ min: 360 }), "s");
	});
});
