import "@/tests/support/setup";
import sinon from "sinon";
import mongoose from "mongoose";
import news from "logic/db/schemas/news";
import { TestModule } from "@/tests/support/TestModule";
import Subscribe from "@/modules/EventsModule/jobs/Subscribe";
import DataModule from "@/modules/DataModule";
import EventsModule from "@/modules/EventsModule";
import NewsCreatedEvent from "@/modules/DataModule/models/news/events/NewsCreatedEvent";
import GetModelPermissions from "@/modules/DataModule/models/users/jobs/GetModelPermissions";
import JobContext from "@/JobContext";
import { UserRole } from "@/modules/DataModule/models/users/UserRole";
import GetPermissions from "@/modules/DataModule/models/users/jobs/GetPermissions";
import CacheModule from "@/modules/CacheModule";
import NewsUpdatedEvent from "@/modules/DataModule/models/news/events/NewsUpdatedEvent";
import NewsDeletedEvent from "@/modules/DataModule/models/news/events/NewsDeletedEvent";
import { NewsStatus } from "@/modules/DataModule/models/news/NewsStatus";

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

			modelFindByIdStub;

			Model;

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
			}

			constructor(Model: mongoose.Model<any>, modelFindByIdStub: any) {
				this.Model = Model;
				this.modelFindByIdStub = modelFindByIdStub;
			}
		}
		let th: TypeHelper;

		const fakeUserId = new mongoose.Types.ObjectId();
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

		function createDocument(
			modelId: mongoose.Types.ObjectId,
			status: NewsStatus
		) {
			const news = new th.Model({
				_id: modelId,
				status
			});
			// @ts-ignore
			th.modelFindByIdStub.withArgs(modelId.toString()).returns(news);
		}

		beforeEach(() => {
			if (mongoose.modelNames().includes("news"))
				mongoose.deleteModel("news");
			const schema = new mongoose.Schema(news);
			const Model = mongoose.model("news", schema);
			const modelFindByIdStub = sinon.stub(Model, "findById");

			th = new TypeHelper(Model, modelFindByIdStub);

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
				.should.eventually.be.rejectedWith("Payload must be an object");
		});

		it("should not allow no channel", async function () {
			const job = getJob({});

			await job
				.execute()
				.should.eventually.be.rejectedWith("Channel must be a string");
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
			const modelId = new mongoose.Types.ObjectId();
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

				createDocument(modelId, NewsStatus.DRAFT);

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

				createDocument(modelId, NewsStatus.PUBLISHED);

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

				createDocument(modelId, NewsStatus.DRAFT);

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
			const modelId = new mongoose.Types.ObjectId();
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

				createDocument(modelId, NewsStatus.DRAFT);

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

				createDocument(modelId, NewsStatus.PUBLISHED);

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

				createDocument(modelId, NewsStatus.DRAFT);

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
			// const modelId = new mongoose.Types.ObjectId();
			// const channel = `data.news.unpublished:${modelId}`;
			// const permission = `event.data.news.unpublished:${modelId}`;

			it("should work for admins for all news");
			// it("should work for admins for all news", async function () {
			// 	const job = getJob({
			// 		channel,
			// 	});
			// 	// @ts-ignore
			// 	th.jobContextGetUserStub.resolves(userAdmin);

			// 	createDocument(modelId, NewsStatus.DRAFT);

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

			// 	createDocument(modelId, NewsStatus.PUBLISHED);

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

			// 	createDocument(modelId, NewsStatus.DRAFT);

			// 	th.jobContextGetSocketIdStub.returns("SomeSocketId");

			// 	await job.execute().should.eventually.be.rejectedWith(`Insufficient permissions for permission ${permission}`);
			// 	sinon.assert.notCalled(th.eventsModuleSubscribeSocketStub);
			// 	// TODO Assert/check socketSubscriptions
			// });
		});

		afterEach(() => {
			th.restore();
		});
	});
});
