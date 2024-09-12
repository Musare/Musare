import "@/tests/support/setup";
import sinon from "sinon";
import NewsCreatedEvent from "@models/News/events/NewsCreatedEvent";
import NewsUpdatedEvent from "@models/News/events/NewsUpdatedEvent";
import NewsDeletedEvent from "@models/News/events/NewsDeletedEvent";
import { NewsStatus } from "@models/News/NewsStatus";
import { Sequelize } from "sequelize";
import ObjectID from "bson-objectid";
import { TestModule } from "@/tests/support/TestModule";
import Subscribe from "@/modules/EventsModule/jobs/Subscribe";
import DataModule from "@/modules/DataModule";
import EventsModule from "@/modules/EventsModule";
import GetModelPermissions from "@/modules/DataModule/models/User/jobs/GetModelPermissions";
import JobContext from "@/JobContext";
import { UserRole } from "@/modules/DataModule/models/User/UserRole";
import GetPermissions from "@/modules/DataModule/models/User/jobs/GetPermissions";
import CacheModule from "@/modules/CacheModule";
import News, { schema as NewsSchema } from "@/modules/DataModule/models/News";
import User from "@/modules/DataModule/models/User";

describe("Subscribe job", async function () {
	describe("execute", function () {
		function getJob(...payload: [unknown?]) {
			const job = new Subscribe(...payload);
			const module = new TestModule();
			Reflect.set(job, "_module", module);
			return job;
		}

		class TypeHelper {
			jobContextGetSocketIdStub = sinon.stub(
				JobContext.prototype,
				"getSocketId"
			);

			jobContextGetUserStub = sinon.stub(JobContext.prototype, "getUser");

			cacheModuleGetStub = sinon.stub(CacheModule, "get");

			cacheModuleSetStub = sinon.stub(CacheModule, "set");

			dataModuleGetEventsStub = sinon.stub(DataModule, "getEvents");

			dataModuleGetJobStub = sinon.stub(DataModule, "getJob");

			dataModuleGetJobsStub = sinon.stub(DataModule, "getJobs");

			dataModuleGetModelStub = sinon.stub(DataModule, "getModel");

			eventsModuleGetEventStub = sinon.stub(EventsModule, "getEvent");

			eventsModuleSubscribeSocketStub = sinon.stub(
				EventsModule,
				"subscribeSocket"
			);

			getPermissionsExecute = sinon.stub(
				GetPermissions.prototype,
				"execute"
			);

			userGetTableName = sinon.stub(User, "getTableName");

			sequelizeQueryStub;

			modelGetTableNameStub;

			newsFindByPkStub;

			Model;

			sequelize;

			restore() {
				this.jobContextGetSocketIdStub.restore();
				this.jobContextGetUserStub.restore();
				this.cacheModuleGetStub.restore();
				this.cacheModuleSetStub.restore();
				this.dataModuleGetEventsStub.restore();
				this.dataModuleGetJobStub.restore();
				this.dataModuleGetJobsStub.restore();
				this.dataModuleGetModelStub.restore();
				this.eventsModuleGetEventStub.restore();
				this.eventsModuleSubscribeSocketStub.restore();
				this.getPermissionsExecute.restore();
				this.userGetTableName.restore();
				this.sequelizeQueryStub.restore();
				this.modelGetTableNameStub.restore();
				this.newsFindByPkStub.restore();
			}

			constructor(
				sequelize: Sequelize,
				Model: typeof News,
				sequelizeQueryStub: any,
				modelGetTableNameStub: any,
				newsFindByPkStub: any
			) {
				this.sequelize = sequelize;
				this.Model = Model;
				this.sequelizeQueryStub = sequelizeQueryStub;
				this.modelGetTableNameStub = modelGetTableNameStub;
				this.newsFindByPkStub = newsFindByPkStub;
			}
		}
		let th: TypeHelper;

		const fakeUserId = ObjectID();
		// const userGuest = undefined;
		const userNormal = {
			_id: fakeUserId,
			role: UserRole.USER
		};
		// const userModerator = {
		// 	_id: fakeUserId,
		// 	role: UserRole.MODERATOR
		// };
		const userAdmin = {
			_id: fakeUserId,
			role: UserRole.ADMIN
		};

		async function createDocument(modelId: ObjectID, status: NewsStatus) {
			const news = await th.Model.build({
				_id: modelId.toHexString(),
				status,
				title: "Dummy",
				markdown: "Dummy",
				createdBy: "Dummy"
			});
			th.newsFindByPkStub.withArgs(modelId.toHexString()).returns(news);
		}

		beforeEach(async () => {
			const sequelize = new Sequelize("fake", "fake", "fake", {
				host: "fake",
				port: 0,
				dialect: "postgres"
			});

			const sequelizeQueryStub = sinon.stub(sequelize, "query");

			// @ts-ignore
			const Model = News.init(NewsSchema, {
				tableName: "News",
				...News.options,
				sequelize
			});

			const modelGetTableNameStub = sinon
				.stub(News, "getTableName")
				.returns("news");

			const newsFindByPkStub = sinon.stub(News, "findByPk");

			th = new TypeHelper(
				sequelize,
				Model,
				sequelizeQueryStub,
				modelGetTableNameStub,
				newsFindByPkStub
			);

			th.cacheModuleGetStub.resolves(null);
			// th.cacheModuleSetStub.resolves(null);

			th.dataModuleGetEventsStub.returns({
				// @ts-ignore
				"news.created": NewsCreatedEvent,
				// @ts-ignore
				"news.updated": NewsUpdatedEvent,
				// @ts-ignore
				"news.deleted": NewsDeletedEvent
			});
			th.dataModuleGetJobStub
				.withArgs("users.getModelPermissions")
				.returns(GetModelPermissions);
			th.dataModuleGetJobStub
				.withArgs("users.getPermissions")
				.returns(GetPermissions);
			th.dataModuleGetJobsStub.returns({});
			th.dataModuleGetModelStub.withArgs("news").resolves(th.Model);

			th.eventsModuleGetEventStub
				.withArgs("news.created")
				// @ts-ignore
				.returns(NewsCreatedEvent);
			th.eventsModuleGetEventStub
				.withArgs("news.updated")
				// @ts-ignore
				.returns(NewsUpdatedEvent);
			th.eventsModuleGetEventStub
				.withArgs("news.deleted")
				// @ts-ignore
				.returns(NewsDeletedEvent);
			th.userGetTableName.returns("users");

			Reflect.set(
				DataModule,
				"canRunJobs",
				sinon.fake(() => true)
			);
		});

		it("should not allow no payload", async function () {
			const job = getJob();

			await job
				.execute()
				.should.eventually.be.rejectedWith(`"value" is required`);
		});

		it("should not allow no channel", async function () {
			const job = getJob({});

			await job
				.execute()
				.should.eventually.be.rejectedWith('"channel" is required');
		});

		it("should not allow no socket id", async function () {
			const channel = "data.news.created";
			const job = getJob({
				channel
			});
			// @ts-ignore
			th.jobContextGetUserStub.resolves(userAdmin);
			th.getPermissionsExecute.resolves({
				"event.data.news.created": true
			});
			th.jobContextGetSocketIdStub.returns(undefined);

			await job
				.execute()
				.should.eventually.be.rejectedWith("No socketId specified");
		});

		it("should resolve with no errors", async function () {
			const channel = "data.news.created";
			const job = getJob({
				channel
			});
			// @ts-ignore
			th.jobContextGetUserStub.resolves(userAdmin);
			th.getPermissionsExecute.resolves({
				"event.data.news.created": true
			});
			th.jobContextGetSocketIdStub.returns("SomeSocketId");

			await job.execute().should.eventually.be.undefined;
			sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
			// TODO Assert/check socketSubscriptions
		});

		describe("data.news.created", function () {
			const channel = "data.news.created";

			it("should not work for users", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userNormal);
				th.getPermissionsExecute.resolves({});

				await job
					.execute()
					.should.eventually.be.rejectedWith(
						`Insufficient permissions for permission event.${channel}`
					);
				sinon.assert.notCalled(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});

			it("should work for admins", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userAdmin);
				th.getPermissionsExecute.resolves({
					"event.data.news.created": true
				});
				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job.execute().should.eventually.be.undefined;
				sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		describe("data.news.updated:${modelId}", function () {
			const modelId = ObjectID();
			const channel = `data.news.updated:${modelId}`;
			const permission = `event.data.news.updated:${modelId}`;

			it("should work for admins for all news", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userAdmin);
				th.getPermissionsExecute.resolves({
					"event.data.news.updated": true
				});

				await createDocument(modelId, NewsStatus.DRAFT);

				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job.execute().should.eventually.be.undefined;
				sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});

			it("should work for users for published news", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userNormal);
				th.getPermissionsExecute.resolves({});

				await createDocument(modelId, NewsStatus.PUBLISHED);

				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job.execute().should.eventually.be.undefined;
				sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});

			it("should not work for users for unpublished news", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userNormal);
				th.getPermissionsExecute.resolves({});

				await createDocument(modelId, NewsStatus.DRAFT);

				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job
					.execute()
					.should.eventually.be.rejectedWith(
						`Insufficient permissions for permission ${permission}`
					);
				sinon.assert.notCalled(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});
		});

		// eslint-disable-next-line no-template-curly-in-string
		describe("data.news.deleted:${modelId}", function () {
			const modelId = ObjectID();
			const channel = `data.news.deleted:${modelId}`;
			const permission = `event.data.news.deleted:${modelId}`;

			it("should work for admins for all news", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userAdmin);
				th.getPermissionsExecute.resolves({
					"event.data.news.deleted": true
				});

				await createDocument(modelId, NewsStatus.DRAFT);

				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job.execute().should.eventually.be.undefined;
				sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});

			it("should work for users for published news", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userNormal);
				th.getPermissionsExecute.resolves({});

				await createDocument(modelId, NewsStatus.PUBLISHED);

				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job.execute().should.eventually.be.undefined;
				sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});

			it("should not work for users for unpublished news", async function () {
				const job = getJob({
					channel
				});
				// @ts-ignore
				th.jobContextGetUserStub.resolves(userNormal);
				th.getPermissionsExecute.resolves({});

				await createDocument(modelId, NewsStatus.DRAFT);

				th.jobContextGetSocketIdStub.returns("SomeSocketId");

				await job
					.execute()
					.should.eventually.be.rejectedWith(
						`Insufficient permissions for permission ${permission}`
					);
				sinon.assert.notCalled(th.eventsModuleSubscribeSocketStub);
				// TODO Assert/check socketSubscriptions
			});
		});

		describe("data.news.published", function () {
			// const channel = `data.news.published`;

			it("should work for all users");
			// it("should work for all users", async function () {
			// 	const job = getJob({
			// 		channel,
			// 	});
			// 	// @ts-ignore
			// 	th.jobContextGetUserStub.resolves(userGuest);

			// 	th.jobContextGetSocketIdStub.returns("SomeSocketId");

			// 	await job.execute().should.eventually.be.undefined;
			// 	sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
			// 	// TODO Assert/check socketSubscriptions
			// });
		});

		// eslint-disable-next-line no-template-curly-in-string
		describe("data.news.unpublished:${modelId}", function () {
			// const modelId = ObjectID();
			// const channel = `data.news.unpublished:${modelId}`;
			// const permission = `event.data.news.unpublished:${modelId}`;

			it("should work for admins for all news");
			// it("should work for admins for all news", async function () {
			// 	const job = getJob({
			// 		channel,
			// 	});
			// 	// @ts-ignore
			// 	th.jobContextGetUserStub.resolves(userAdmin);

			// 	await createDocument(modelId, NewsStatus.DRAFT);

			// 	th.jobContextGetSocketIdStub.returns("SomeSocketId");

			// 	await job.execute().should.eventually.be.undefined;
			// 	sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
			// 	// TODO Assert/check socketSubscriptions
			// });

			it("should work for users for published news");
			// it("should work for users for published news", async function () {
			// 	const job = getJob({
			// 		channel,
			// 	});
			// 	// @ts-ignore
			// 	th.jobContextGetUserStub.resolves(userNormal);

			// 	await createDocument(modelId, NewsStatus.PUBLISHED);

			// 	th.jobContextGetSocketIdStub.returns("SomeSocketId");

			// 	await job.execute().should.eventually.be.undefined;
			// 	sinon.assert.calledOnce(th.eventsModuleSubscribeSocketStub);
			// 	// TODO Assert/check socketSubscriptions
			// });

			it("should not work for users for unpublished news");
			// it("should not work for users for unpublished news", async function () {
			// 	const job = getJob({
			// 		channel,
			// 	});
			// 	// @ts-ignore
			// 	th.jobContextGetUserStub.resolves(userNormal);

			// 	await createDocument(modelId, NewsStatus.DRAFT);

			// 	th.jobContextGetSocketIdStub.returns("SomeSocketId");

			// 	await job.execute().should.eventually.be.rejectedWith(`Insufficient permissions for permission ${permission}`);
			// 	sinon.assert.notCalled(th.eventsModuleSubscribeSocketStub);
			// 	// TODO Assert/check socketSubscriptions
			// });
		});

		afterEach(() => {
			th.sequelize.close();
			th.restore();
		});
	});
});
