// @ts-nocheck
import async from "async";
import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import mongoose from "mongoose";
import JobContext from "../JobContext";
import JobQueue from "../JobQueue";
import LogBook from "../LogBook";
import ModuleManager from "../ModuleManager";
import DataModule from "./DataModule";

chai.should();
chai.use(sinonChai);

describe("Data Module", function () {
	const moduleManager = Object.getPrototypeOf(
		sinon.createStubInstance(ModuleManager)
	);
	moduleManager.logBook = sinon.createStubInstance(LogBook);
	moduleManager.jobQueue = sinon.createStubInstance(JobQueue);
	const dataModule = new DataModule(moduleManager);
	const jobContext = sinon.createStubInstance(JobContext);
	const testData = { abc: [] };

	before(async function () {
		await dataModule.startup();
		dataModule.redis = sinon.spy(dataModule.redis);
	});

	beforeEach(async function () {
		testData.abc = await async.map(Array(10), async () =>
			dataModule.collections?.abc.model.create({
				_id: new mongoose.Types.ObjectId(),
				name: `Test${Math.round(Math.random() * 1000)}`,
				autofill: {
					enabled: !!Math.floor(Math.random())
				},
				createdAt: Date.now(),
				updatedAt: Date.now(),
				testData: true
			})
		);
	});

	it("module loaded and started", function () {
		moduleManager.logBook.log.should.have.been.called;
		dataModule.getName().should.equal("data");
		dataModule.getStatus().should.equal("STARTED");
	});

	describe("find job", function () {
		// Run cache test twice to validate mongo and redis sourced data
		[false, true, true].forEach(useCache => {
			it(`filter by one _id string ${
				useCache ? "with" : "without"
			} cache`, async function () {
				const [document] = testData.abc;

				const find = await dataModule.find(jobContext, {
					collection: "abc",
					filter: { _id: document._id },
					limit: 1,
					useCache
				});

				find.should.be.a("object");
				find._id.should.deep.equal(document._id);
				find.createdAt.should.deep.equal(document.createdAt);

				if (useCache) {
					dataModule.redis?.GET.should.have.been.called;
				}
			});
		});
	});

	afterEach(async function () {
		sinon.reset();
		await dataModule.collections?.abc.model.deleteMany({ testData: true });
	});

	after(async function () {
		await dataModule.shutdown();
	});
});
