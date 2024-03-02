import { flushPromises } from "@vue/test-utils";
import LongJobs from "@/components/LongJobs.vue";
import FloatingBox from "@/components/FloatingBox.vue";
import { getWrapper } from "@/tests/utils/utils";
import { useLongJobsStore } from "@/stores/longJobs";
import { useWebsocketsStore } from "@/stores/websockets";

describe("LongJobs component", async () => {
	beforeEach(async context => {
		context.mockSocket = {
			data: {
				dispatch: {
					"users.getLongJobs": () => ({
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
					}),
					"users.getLongJob": id =>
						id === "bf3dc3aa-e7aa-4b69-bfd1-8e979fe7dfa5"
							? {
									status: "success",
									data: {
										longJob: {
											id,
											name: "Bulk editing tags",
											status: "success",
											message: "Successfully edited tags."
										}
									}
								}
							: {
									status: "error",
									message: "Long job not found."
								},
					"users.removeLongJob": () => ({
						status: "success"
					})
				},
				progress: {
					"users.getLongJob": id =>
						id === "bf3dc3aa-e7aa-4b69-bfd1-8e979fe7dfa5"
							? [
									{
										id,
										name: "Bulk editing tags",
										status: "started",
										message: "Updating tags."
									},
									{
										id,
										name: "Bulk editing tags",
										status: "update",
										message: "Updating tags in MongoDB."
									}
								]
							: []
				},
				on: {
					"keep.event:longJob.added": {
						data: { jobId: "bf3dc3aa-e7aa-4b69-bfd1-8e979fe7dfa5" }
					},
					"keep.event:longJob.removed": {
						data: { jobId: "8704d336-660f-4d23-8c18-a7271c6656b5" }
					}
				}
			}
		};
	});

	test("component does not render if there are no jobs", async () => {
		const wrapper = await getWrapper(LongJobs, { mockSocket: true });
		expect(wrapper.findComponent(FloatingBox).exists()).toBeFalsy();
	});

	test("component and jobs render if jobs exists", async ({ mockSocket }) => {
		const wrapper = await getWrapper(LongJobs, {
			mockSocket,
			stubs: { FloatingBox },
			loginRequired: true
		});
		expect(wrapper.findComponent(FloatingBox).exists()).toBeTruthy();
		const activeJobs = wrapper.findAll(".active-jobs .active-job");
		const { longJobs } =
			mockSocket.data.dispatch["users.getLongJobs"]().data;
		expect(activeJobs.length).toBe(longJobs.length);
	});

	describe.each(["started", "update", "success", "error"])(
		"job with %s status",
		status => {
			const isRemoveable = status === "success" || status === "error";

			beforeEach(async context => {
				const getLongJobs =
					context.mockSocket.data.dispatch["users.getLongJobs"]();
				getLongJobs.data.longJobs[0].status = status;
				context.mockSocket.data.dispatch["users.getLongJobs"] = () =>
					getLongJobs;

				context.wrapper = await getWrapper(LongJobs, {
					mockSocket: context.mockSocket,
					stubs: { FloatingBox },
					loginRequired: true
				});
			});

			test("status icon, name and message render correctly", ({
				wrapper,
				mockSocket
			}) => {
				const activeJob = wrapper.find(".active-jobs .active-job");
				const job =
					mockSocket.data.dispatch["users.getLongJobs"]().data
						.longJobs[0];
				let icon;
				if (job.status === "success") icon = "Complete";
				else if (job.status === "error") icon = "Failed";
				else if (job.status === "started" || job.status === "update")
					icon = "In Progress";
				icon = `i[content="${icon}"]`;
				expect(activeJob.find(icon).exists()).toBeTruthy();
				expect(activeJob.find(".name").text()).toBe(job.name);
				(<any>(
					activeJob.find(".actions .message").element.parentElement
				))._tippy.show();
				expect(
					document.body.querySelector(
						"body > [id^=tippy] .tippy-box .long-job-message"
					).textContent
				).toBe(`Latest Update:${job.message}`);
			});

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
		}
	);

	test("keep.event:longJob.added", async ({ mockSocket }) => {
		const wrapper = await getWrapper(LongJobs, {
			mockSocket,
			stubs: { FloatingBox },
			loginRequired: true
		});
		const websocketsStore = useWebsocketsStore();
		websocketsStore.socket.trigger("on", "keep.event:longJob.added");
		await flushPromises();
		const longJobsStore = useLongJobsStore();
		expect(longJobsStore.setJob).toBeCalledTimes(3);
		const activeJobs = wrapper.findAll(".active-jobs .active-job");
		const { longJobs } =
			mockSocket.data.dispatch["users.getLongJobs"]().data;
		expect(activeJobs.length).toBe(longJobs.length + 1);
	});

	test("keep.event:longJob.removed", async ({ mockSocket }) => {
		const wrapper = await getWrapper(LongJobs, {
			mockSocket,
			stubs: { FloatingBox },
			loginRequired: true
		});
		const websocketsStore = useWebsocketsStore();
		websocketsStore.socket.trigger("on", "keep.event:longJob.removed");
		await flushPromises();
		const longJobsStore = useLongJobsStore();
		expect(longJobsStore.removeJob).toBeCalledTimes(1);
		expect(wrapper.findComponent(FloatingBox).exists()).toBeFalsy();
	});
});
