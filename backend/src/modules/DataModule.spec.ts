// @ts-nocheck
import async from "async";
import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import { ObjectId } from "mongodb";
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
		dataModule.redisClient = sinon.spy(dataModule.redisClient);
	});

	beforeEach(async function () {
		testData.abc = await async.map(Array(10), async () =>
			dataModule.collections?.abc.collection.insertOne({
				_id: new ObjectId(),
				name: `Test${Math.round(Math.random() * 1000)}`,
				autofill: {
					enabled: !!Math.floor(Math.random())
				},
				someNumbers: Array(Math.round(Math.random() * 50)).map(() =>
					Math.round(Math.random() * 10000)
				),
				songs: Array(Math.round(Math.random() * 10)).map(() => ({
					_id: new mongoose.Types.ObjectId()
				})),
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

				find.should.be.an("object");
				find._id.should.deep.equal(document._id);
				find.createdAt.should.deep.equal(document.createdAt);

				if (useCache) {
					dataModule.redisClient?.GET.should.have.been.called;
				}
			});
		});

		it(`filter by name string without cache`, async function () {
			const [document] = testData.abc;

			const find = await dataModule.find(jobContext, {
				collection: "abc",
				filter: { name: document.name },
				limit: 1,
				useCache: false
			});

			find.should.be.an("object");
			find._id.should.deep.equal(document._id);
			find.should.have.keys([
				"_id",
				"createdAt",
				"updatedAt",
				// "name", - Name is restricted, so it won't be returned
				"autofill",
				"someNumbers",
				"songs"
			]);
		});
	});

	afterEach(async function () {
		sinon.reset();
		await dataModule.collections?.abc.collection.deleteMany({
			testData: true
		});
	});

	after(async function () {
		await dataModule.shutdown();
	});
});
