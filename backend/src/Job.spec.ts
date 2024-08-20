import "@/tests/support/setup";
import { faker } from "@faker-js/faker";
import sinon from "sinon";
import Job, { JobOptions, JobStatus } from "@/Job";
import { TestModule } from "@/tests/support/TestModule";

describe("Job", function () {
	class TestJob extends Job {
		public constructor(options?: JobOptions) {
			super(new TestModule(), undefined, options);
		}

		protected async _execute() {}
	}

	describe("getName", function () {
		it("should return camelcase name of class", function () {
			TestJob.getName().should.be.equal("testJob");
			new TestJob().getName().should.be.equal("testJob");
		});
	});

	describe("getPath", function () {
		it("should return joined module and job name", function () {
			new TestJob().getPath().should.be.equal("test.testJob");
		});
	});

	describe("getPriority", function () {
		it("should return configured priority", function () {
			const priority = faker.number.int();
			new TestJob({ priority }).getPriority().should.be.equal(priority);
		});
	});

	describe("getUuid", function () {
		it("should return generated uuid", function () {
			const job = new TestJob();
			const uuid = faker.string.uuid();
			Reflect.set(job, "_uuid", uuid);
			job.getUuid().should.be.equal(uuid);
		});
	});

	describe("getStatus", function () {
		it("should return current status", function () {
			new TestJob().getStatus().should.be.equal(JobStatus.QUEUED);
		});
	});

	describe("getModule", function () {
		it("should return configured module", function () {
			const module = new TestModule();
			const job = new TestJob();
			Reflect.set(job, "_module", module);

			job.getModule().should.be.equal(module);
		});
	});

	describe("isApiEnabled", function () {
		it("should return configured value", function () {
			class EnabledJob extends TestJob {
				protected static _apiEnabled = true;
			}
			EnabledJob.isApiEnabled().should.be.true;
			new EnabledJob().isApiEnabled().should.be.true;

			class DisabledJob extends TestJob {
				protected static _apiEnabled = false;
			}
			DisabledJob.isApiEnabled().should.be.false;
			new DisabledJob().isApiEnabled().should.be.false;
		});
	});

	describe("execute", function () {
		it("should prevent multiple executions", async function () {
			const job = new TestJob();
			Reflect.set(job, "_authorize", sinon.stub());

			await job.execute();

			await job
				.execute()
				.should.eventually.be.rejectedWith(
					"Job has already been executed."
				);
		});

		it("should prevent execution if module can not run jobs", async function () {
			const module = new TestModule();
			Reflect.set(
				module,
				"canRunJobs",
				sinon.fake(() => false)
			);

			const job = new TestJob();
			Reflect.set(job, "_module", module);
			Reflect.set(job, "_authorize", sinon.stub());

			await job
				.execute()
				.should.eventually.be.rejectedWith(
					"Module can not currently run jobs."
				);
		});

		it("should update status to active", async function () {
			class ActiveJob extends TestJob {
				public callback?: (value?: unknown) => void;

				protected async _authorize() {}

				protected async _execute() {
					this.getStatus().should.be.equal(JobStatus.ACTIVE);
				}
			}

			await new ActiveJob().execute();
		});

		it("should call validation method", async function () {
			const job = new TestJob();
			const stub = sinon.stub();
			Reflect.set(job, "_validate", stub);
			Reflect.set(job, "_validated", true);
			Reflect.set(job, "_authorize", sinon.stub());

			await job.execute();

			stub.calledOnce.should.be.true;
		});

		it("should call authorize method", async function () {
			const job = new TestJob();
			const stub = sinon.stub();
			Reflect.set(job, "_authorize", stub);

			await job.execute();

			stub.calledOnce.should.be.true;
		});

		it("should publish callback event if ref configured on success");

		it("should add log on success");

		it("should update stats on success");

		it("should return data from private execute method on success", async function () {
			const job = new TestJob();
			const data = faker.word.words();
			Reflect.set(job, "_authorize", sinon.stub());
			Reflect.set(
				job,
				"_execute",
				sinon.fake(async () => data)
			);

			await job.execute().should.eventually.be.equal(data);
		});

		it("should publish callback event if ref configured on error");

		it("should add log on error");

		it("should update stats on error");

		it("should rethrow error");

		it("should update stats on completion", async function () {
			const job = new TestJob();
			Reflect.set(job, "_authorize", sinon.stub());

			await job.execute();

			job.getStatus().should.be.equal(JobStatus.COMPLETED);
		});
	});

	describe("log", function () {
		it("should adds log to logbook");

		it("should add path as category");

		it("should add job json to log data");
	});

	describe("toJSON", function () {
		it("should return job data as json object");
	});
});
