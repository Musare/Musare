import { flushPromises } from "@vue/test-utils";
import LongJobs from "@/components/LongJobs.vue";
import FloatingBox from "@/components/FloatingBox.vue";
import { getWrapper } from "@/tests/utils/utils";
import { useUserAuthStore } from "@/stores/userAuth";
import { useLongJobsStore } from "@/stores/longJobs";
import { useWebsocketsStore } from "@/stores/websockets";

describe("LongJobs component", async () => {
	beforeEach(async context => {
		context.socketData = {
			dispatch: {
				"users.getLongJobs": {
					status: "success",
					data: {
						longJobs: [
							{
								id: "8704d336-660f-4d23-8c18-a7271c6656b5",
								name: "Bulk verifying songs",
								status: "success",
								message:
									"50 songs have been successfully verified"
							}
						]
					}
				},
				"users.getLongJob": {
					status: "success",
					data: {
						longJob: {
							id: "bf3dc3aa-e7aa-4b69-bfd1-8e979fe7dfa5",
							name: "Successfully edited tags.",
							status: "success",
							message: "Bulk editing tags"
						}
					}
				},
				"users.removeLongJob": {
					status: "success"
				}
			}
		};
	});

	test("component does not render if there are no jobs", async () => {
		const wrapper = await getWrapper(LongJobs, { mockSocket: {} });
		expect(wrapper.findComponent(FloatingBox).exists()).toBeFalsy();
	});

	test("component and jobs render if jobs exists", async ({ socketData }) => {
		const wrapper = await getWrapper(LongJobs, {
			mockSocket: socketData,
			stubs: { FloatingBox },
			beforeMount: async () => {
				const userAuthStore = useUserAuthStore();
				userAuthStore.loggedIn = true;
				await flushPromises();
			}
		});
		expect(wrapper.findComponent(FloatingBox).exists()).toBeTruthy();
		const activeJobs = wrapper.findAll(".active-jobs .active-job");
		const { longJobs } = socketData.dispatch["users.getLongJobs"].data;
		expect(activeJobs.length).toBe(longJobs.length);
	});

	describe.each(["started", "update", "success", "error"])(
		"job with %s status",
		status => {
			const isRemoveable = status === "success" || status === "error";

			beforeEach(async context => {
				context.socketData.dispatch[
					"users.getLongJobs"
				].data.longJobs[0].status = status;

				context.wrapper = await getWrapper(LongJobs, {
					mockSocket: context.socketData,
					stubs: { FloatingBox },
					beforeMount: async () => {
						const userAuthStore = useUserAuthStore();
						userAuthStore.loggedIn = true;
						await flushPromises();
					}
				});
			});

			test("status icon and name render correctly", ({
				wrapper,
				socketData
			}) => {
				const activeJob = wrapper.find(".active-jobs .active-job");
				const job =
					socketData.dispatch["users.getLongJobs"].data.longJobs[0];
				let icon;
				if (job.status === "success") icon = "Complete";
				else if (job.status === "error") icon = "Failed";
				else if (job.status === "started" || job.status === "update")
					icon = "In Progress";
				icon = `i[content="${icon}"]`;
				expect(activeJob.find(icon).exists()).toBeTruthy();
				expect(activeJob.find(".name").text()).toBe(job.name);
			});
			test.todo("Latest update message validation");

			test(`job is ${
				isRemoveable ? "" : "not "
			}removed on click of clear icon`, async ({ wrapper }) => {
				await wrapper
					.find(".active-job .actions .clear")
					.trigger("click");
				await flushPromises();
				const longJobsStore = useLongJobsStore();
				expect(longJobsStore.removeJob).toBeCalledTimes(
					isRemoveable ? 1 : 0
				);
				expect(wrapper.findComponent(FloatingBox).exists()).not.toEqual(
					isRemoveable
				);
			});

			test("keep.event:longJob.added", async ({
				wrapper,
				socketData
			}) => {
				const websocketsStore = useWebsocketsStore();
				websocketsStore.socket.triggerEvent(
					"keep.event:longJob.added",
					{
						data: { jobId: "bf3dc3aa-e7aa-4b69-bfd1-8e979fe7dfa5" }
					}
				);
				await flushPromises();
				expect(wrapper.findAll(".active-jobs .active-job").length).toBe(
					socketData.dispatch["users.getLongJobs"].data.longJobs
						.length + 1
				);
			});

			test("keep.event:longJob.removed", async ({ wrapper }) => {
				const websocketsStore = useWebsocketsStore();
				websocketsStore.socket.triggerEvent(
					"keep.event:longJob.removed",
					{
						data: { jobId: "8704d336-660f-4d23-8c18-a7271c6656b5" }
					}
				);
				await flushPromises();
				const longJobsStore = useLongJobsStore();
				expect(longJobsStore.removeJob).toBeCalledTimes(1);
				expect(wrapper.findComponent(FloatingBox).exists()).toBeFalsy();
			});
		}
	);
});
