// @ts-nocheck
import chai from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import chaiAsPromised from "chai-as-promised";
// import { ObjectId } from "mongodb";
// import JobContext from "../JobContext";
import JobQueue from "../JobQueue";
import LogBook from "../LogBook";
import ModuleManager from "../ModuleManager";
import DataModule from "./DataModule";

// const should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe("Data Module", function () {
	const moduleManager = Object.getPrototypeOf(
		sinon.createStubInstance(ModuleManager)
	);
	ModuleManager.setPrimaryInstance(moduleManager);
	const logBook = sinon.createStubInstance(LogBook);
	LogBook.setPrimaryInstance(logBook);
	moduleManager.jobQueue = sinon.createStubInstance(JobQueue);
	const dataModule = new DataModule();
	// const jobContext = sinon.createStubInstance(JobContext);
	// const testData = { abc: [] };

	before(async function () {
		await dataModule.startup();
		// dataModule.redisClient = sinon.spy(dataModule.redisClient);
	});

	// beforeEach(async function () {
	// 	testData.abc = await Promise.all(
	// 		Array.from({ length: 10 }).map(async () => {
	// 			const doc = {
	// 				name: `Test${Math.round(Math.random() * 1000)}`,
	// 				autofill: {
	// 					enabled: !!Math.round(Math.random())
	// 				},
	// 				someNumbers: Array.from({
	// 					length: Math.max(1, Math.round(Math.random() * 50))
	// 				}).map(() => Math.round(Math.random() * 10000)),
	// 				songs: Array.from({
	// 					length: Math.max(1, Math.round(Math.random() * 10))
	// 				}).map(() => ({
	// 					_id: new ObjectId()
	// 				})),
	// 				restrictedName: `RestrictedTest${Math.round(
	// 					Math.random() * 1000
	// 				)}`,
	// 				createdAt: new Date(),
	// 				updatedAt: new Date(),
	// 				testData: true
	// 			};
	// 			const res =
	// 				await dataModule.collections?.abc.collection.insertOne({
	// 					...doc,
	// 					testData: true
	// 				});
	// 			return { _id: res.insertedId, ...doc };
	// 		})
	// 	);
	// });

	it("module loaded and started", function () {
		logBook.log.should.have.been.called;
		dataModule.getName().should.equal("data");
		dataModule.getStatus().should.equal("STARTED");
	});

	afterEach(async function () {
		sinon.reset();
		// await dataModule.collections?.abc.collection.deleteMany({
		// 	testData: true
		// });
	});

	after(async function () {
		await dataModule.shutdown();
	});
});
