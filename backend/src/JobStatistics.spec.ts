import { faker } from "@faker-js/faker";
import {
	JobStatistic,
	JobStatistics,
	JobStatisticsType
} from "./JobStatistics";

describe("JobStatistics", function () {
	describe("getStats", function () {
		it("should include jobs statistics", function () {
			const statistics = new JobStatistics();

			const jobName = faker.lorem.text();

			statistics.updateStats(jobName, JobStatisticsType.TOTAL);

			statistics.getStats()[jobName].total.should.be.equal(1);
		});

		[
			JobStatisticsType.CONSTRUCTED,
			JobStatisticsType.FAILED,
			JobStatisticsType.QUEUED,
			JobStatisticsType.SUCCESSFUL,
			JobStatisticsType.TOTAL
		].forEach(function (type) {
			it(`should sum ${type} count for total`, function () {
				const statistics = new JobStatistics();

				statistics.updateStats(faker.lorem.text(), type);
				statistics.updateStats(faker.lorem.text(), type);

				statistics
					.getStats()
					.total[type as keyof JobStatistic].should.be.equal(2);
			});
		});

		it(`should sum total duration for total`, function () {
			const statistics = new JobStatistics();

			const firstDuration = faker.number.int();
			const secondDuration = faker.number.int();
			const totalDuration = firstDuration + secondDuration;

			statistics.updateStats(
				faker.lorem.text(),
				JobStatisticsType.DURATION,
				firstDuration
			);
			statistics.updateStats(
				faker.lorem.text(),
				JobStatisticsType.DURATION,
				secondDuration
			);

			statistics
				.getStats()
				.total.totalTime.should.be.equal(totalDuration);
		});

		it("should calculate average time for total", function () {
			const statistics = new JobStatistics();

			const firstJobName = faker.lorem.text();
			const secondJobName = faker.lorem.text();
			const firstDuration = faker.number.int();
			const secondDuration = faker.number.int();
			const averageDuration = (firstDuration + secondDuration) / 2;

			statistics.updateStats(firstJobName, JobStatisticsType.TOTAL);
			statistics.updateStats(
				firstJobName,
				JobStatisticsType.DURATION,
				firstDuration
			);

			statistics.updateStats(secondJobName, JobStatisticsType.TOTAL);
			statistics.updateStats(
				secondJobName,
				JobStatisticsType.DURATION,
				secondDuration
			);

			statistics
				.getStats()
				.total.averageTime.should.be.equal(averageDuration);
		});
	});

	describe("updateStats", function () {
		const jobName = faker.lorem.text();

		[
			JobStatisticsType.CONSTRUCTED,
			JobStatisticsType.FAILED,
			JobStatisticsType.QUEUED,
			JobStatisticsType.SUCCESSFUL,
			JobStatisticsType.TOTAL
		].forEach(function (type) {
			it(`should increment ${type} count`, function () {
				const statistics = new JobStatistics();

				statistics.updateStats(jobName, type);
				statistics.updateStats(jobName, type);

				statistics
					.getStats()
					[jobName][type as keyof JobStatistic].should.be.equal(2);
			});
		});

		it(`should add to total duration`, function () {
			const statistics = new JobStatistics();

			const firstDuration = faker.number.int();
			const secondDuration = faker.number.int();
			const totalDuration = firstDuration + secondDuration;

			statistics.updateStats(
				jobName,
				JobStatisticsType.DURATION,
				firstDuration
			);
			statistics.updateStats(
				jobName,
				JobStatisticsType.DURATION,
				secondDuration
			);

			statistics
				.getStats()
				[jobName].totalTime.should.be.equal(totalDuration);
		});

		it("should calculate average time", function () {
			const statistics = new JobStatistics();

			const firstDuration = faker.number.int();
			const secondDuration = faker.number.int();
			const averageDuration = (firstDuration + secondDuration) / 2;

			statistics.updateStats(jobName, JobStatisticsType.TOTAL);
			statistics.updateStats(
				jobName,
				JobStatisticsType.DURATION,
				firstDuration
			);

			statistics.updateStats(jobName, JobStatisticsType.TOTAL);
			statistics.updateStats(
				jobName,
				JobStatisticsType.DURATION,
				secondDuration
			);

			statistics
				.getStats()
				[jobName].averageTime.should.be.equal(averageDuration);
		});
	});
});
