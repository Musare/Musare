// @ts-nocheck
import async from "async";
import chai, { expect } from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import chaiAsPromised from "chai-as-promised";
import { ObjectId } from "mongodb";
import JobContext from "../JobContext";
import JobQueue from "../JobQueue";
import LogBook from "../LogBook";
import ModuleManager from "../ModuleManager";
import DataModule from "./DataModule";

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

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
		testData.abc = await async.map(Array(10), async () => {
			const doc = {
				name: `Test${Math.round(Math.random() * 1000)}`,
				autofill: {
					enabled: !!Math.round(Math.random())
				},
				someNumbers: Array.from({
					length: Math.max(1, Math.round(Math.random() * 50))
				}).map(() => Math.round(Math.random() * 10000)),
				songs: Array.from({
					length: Math.max(1, Math.round(Math.random() * 10))
				}).map(() => ({
					_id: new ObjectId()
				})),
				createdAt: new Date(),
				updatedAt: new Date(),
				testData: true
			};
			const res = await dataModule.collections?.abc.collection.insertOne({
				...doc,
				testData: true
			});
			return { _id: res.insertedId, ...doc };
		});
	});

	it("module loaded and started", function () {
		moduleManager.logBook.log.should.have.been.called;
		dataModule.getName().should.equal("data");
		dataModule.getStatus().should.equal("STARTED");
	});

	describe("find job", function () {
		// Run cache test twice to validate mongo and redis sourced data
		[false, true, true].forEach(useCache => {
			const useCacheString = `${useCache ? "with" : "without"} cache`;

			it(`filter by one _id string ${useCacheString}`, async function () {
				const [document] = testData.abc;

				const find = await dataModule.find(jobContext, {
					collection: "abc",
					filter: { _id: document._id },
					limit: 1,
					useCache
				});

				find.should.deep.equal({
					_id: document._id,
					autofill: {
						enabled: document.autofill.enabled
					},
					someNumbers: document.someNumbers,
					songs: document.songs,
					createdAt: document.createdAt,
					updatedAt: document.updatedAt
				});

				if (useCache) {
					dataModule.redisClient?.GET.should.have.been.called;
				}
			});

			it(`filter by name string ${useCacheString}`, async function () {
				const [document] = testData.abc;

				const find = await dataModule.find(jobContext, {
					collection: "abc",
					filter: { name: document.name },
					limit: 1,
					useCache
				});

				find.should.be.an("object");
				find._id.should.deep.equal(document._id);
				find.should.have.keys([
					"_id",
					"createdAt",
					"updatedAt",
					"autofill",
					"someNumbers",
					"songs"
				]);

				// Name is restricted, so it won't be returned and the query should not be cached
				find.should.not.have.keys(["name"]);
				dataModule.redisClient?.GET.should.not.have.been.called;
				dataModule.redisClient?.SET.should.not.have.been.called;
			});
		});

		it(`filter by normal array item`, async function () {
			const [document] = testData.abc;

			const resultDocument = await dataModule.find(jobContext, {
				collection: "abc",
				filter: { someNumbers: document.someNumbers[0] },
				limit: 1,
				useCache: false
			});

			resultDocument.should.be.an("object");
			resultDocument._id.should.deep.equal(document._id);
		});

		it(`filter by normal array item that doesn't exist`, async function () {
			const resultDocument = await dataModule.find(jobContext, {
				collection: "abc",
				filter: { someNumbers: -1 },
				limit: 1,
				useCache: false
			});

			expect(resultDocument).to.be.null;
		});

		it(`filter by schema array item`, async function () {
			const [document] = testData.abc;

			const resultDocument = await dataModule.find(jobContext, {
				collection: "abc",
				filter: { songs: { _id: document.songs[0]._id } },
				limit: 1,
				useCache: false
			});

			resultDocument.should.be.an("object");
			resultDocument._id.should.deep.equal(document._id);
		});

		it(`filter by schema array item, invalid`, async function () {
			const jobPromise = dataModule.find(jobContext, {
				collection: "abc",
				filter: { songs: { randomProperty: "Value" } },
				limit: 1,
				useCache: false
			});

			await expect(jobPromise).to.be.rejectedWith(
				`Key "randomProperty" does not exist in the schema.`
			);
		});

		it(`filter by schema array item with dot notation`, async function () {
			const [document] = testData.abc;

			const resultDocument = await dataModule.find(jobContext, {
				collection: "abc",
				filter: { "songs._id": document.songs[0]._id },
				limit: 1,
				useCache: false
			});

			resultDocument.should.be.an("object");
			resultDocument._id.should.deep.equal(document._id);
		});

		it(`filter by schema array item with dot notation, invalid`, async function () {
			const jobPromise = dataModule.find(jobContext, {
				collection: "abc",
				filter: { "songs.randomProperty": "Value" },
				limit: 1,
				useCache: false
			});

			await expect(jobPromise).to.be.rejectedWith(
				`Key "randomProperty" does not exist in the schema.`
			);
		});

		it(`filter with simple $in`, async function () {
			const [document] = testData.abc;

			const resultDocument = await dataModule.find(jobContext, {
				collection: "abc",
				filter: { name: { $in: [document.name, "RandomName"] } },
				limit: 1,
				useCache: false
			});

			resultDocument.should.be.an("object");
			resultDocument._id.should.deep.equal(document._id);
		});

		it(`filter with simple $in 2`, async function () {
			const jobPromise = dataModule.find(jobContext, {
				collection: "abc",
				filter: { name: { $in: ["RandomName", "RandomName2"] } },
				limit: 1,
				useCache: false
			});

			await jobPromise.should.eventually.be.null;
		});
	});

	describe("normalize projection", function () {
		const dataModuleProjection = Object.getPrototypeOf(dataModule);

		it(`basics`, function () {
			dataModuleProjection.normalizeProjection.should.be.a("function");
		});

		it(`empty object/array projection`, function () {
			const expectedResult = { projection: [], mode: "includeAllBut" };

			const resultWithArray = dataModuleProjection.normalizeProjection(
				[]
			);
			const resultWithObject = dataModuleProjection.normalizeProjection(
				{}
			);

			resultWithArray.should.deep.equal(expectedResult);
			resultWithObject.should.deep.equal(expectedResult);
		});

		it(`null/undefined projection`, function () {
			const expectedResult = { projection: [], mode: "includeAllBut" };

			const resultWithNull =
				dataModuleProjection.normalizeProjection(null);
			const resultWithUndefined =
				dataModuleProjection.normalizeProjection(undefined);
			const resultWithNothing =
				dataModuleProjection.normalizeProjection();

			resultWithNull.should.deep.equal(expectedResult);
			resultWithUndefined.should.deep.equal(expectedResult);
			resultWithNothing.should.deep.equal(expectedResult);
		});

		it(`simple exclude projection`, function () {
			const expectedResult = {
				projection: [["name", false]],
				mode: "includeAllBut"
			};

			const resultWithBoolean = dataModuleProjection.normalizeProjection({
				name: false
			});
			const resultWithNumber = dataModuleProjection.normalizeProjection({
				name: 0
			});

			resultWithBoolean.should.deep.equal(expectedResult);
			resultWithNumber.should.deep.equal(expectedResult);
		});

		it(`simple include projection`, function () {
			const expectedResult = {
				projection: [["name", true]],
				mode: "excludeAllBut"
			};

			const resultWithObject = dataModuleProjection.normalizeProjection({
				name: true
			});
			const resultWithArray = dataModuleProjection.normalizeProjection([
				"name"
			]);

			resultWithObject.should.deep.equal(expectedResult);
			resultWithArray.should.deep.equal(expectedResult);
		});

		it(`simple include/exclude projection`, function () {
			const expectedResult = {
				projection: [
					["color", false],
					["name", true]
				],
				mode: "excludeAllBut"
			};

			const result = dataModuleProjection.normalizeProjection({
				color: false,
				name: true
			});

			result.should.deep.equal(expectedResult);
		});

		it(`simple nested include projection`, function () {
			const expectedResult = {
				projection: [["location.city", true]],
				mode: "excludeAllBut"
			};

			const resultWithObject = dataModuleProjection.normalizeProjection({
				location: {
					city: true
				}
			});
			const resultWithArray = dataModuleProjection.normalizeProjection([
				"location.city"
			]);

			resultWithObject.should.deep.equal(expectedResult);
			resultWithArray.should.deep.equal(expectedResult);
		});

		it(`simple nested exclude projection`, function () {
			const expectedResult = {
				projection: [["location.city", false]],
				mode: "includeAllBut"
			};

			const result = dataModuleProjection.normalizeProjection({
				location: {
					city: false
				}
			});

			result.should.deep.equal(expectedResult);
		});

		it(`path collision`, function () {
			expect(() => {
				dataModuleProjection.normalizeProjection({
					location: {
						city: false
					},
					"location.city": true
				});
			}).to.throw("Path collision, non-unique key");
		});

		it(`path collision 2`, function () {
			expect(() => {
				dataModuleProjection.normalizeProjection({
					location: {
						city: {
							extra: false
						}
					},
					"location.city": true
				});
			}).to.throw(
				"Path collision! location.city.extra collides with location.city"
			);
		});

		// TODO add more test cases
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
