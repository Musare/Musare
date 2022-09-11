import { flushPromises } from "@vue/test-utils";
import { h } from "vue";
import { getWrapper } from "@/tests/utils/utils";
import { useModalsStore } from "@/stores/modals";
import Modal from "@/components/Modal.vue";

describe("Modal component", () => {
	beforeEach(async context => {
		context.wrapper = await getWrapper(Modal);
	});

	test("title prop", async ({ wrapper }) => {
		const title = "Modal Title";
		await wrapper.setProps({ title });
		expect(wrapper.find(".modal-card-title").text()).toBe(title);
	});

	test("size prop", async ({ wrapper }) => {
		await wrapper.setProps({ size: "slim" });
		expect(wrapper.find(".modal-card").classes()).toContain("modal-slim");

		await wrapper.setProps({ size: "wide" });
		expect(wrapper.find(".modal-card").classes()).toContain("modal-wide");
	});

	test("split prop", async ({ wrapper }) => {
		expect(wrapper.find(".modal-card").classes()).not.toContain(
			"modal-split"
		);
		await wrapper.setProps({ split: true });
		expect(wrapper.find(".modal-card").classes()).toContain("modal-split");
	});

	test("christmas lights render if enabled", async () => {
		const wrapper = await getWrapper(Modal, {
			shallow: true,
			lofig: { siteSettings: { christmas: true } }
		});
		expect(
			wrapper.findComponent({ name: "ChristmasLights" }).exists()
		).toBeTruthy();
	});

	test("click to close modal emits if intercepted", async ({ wrapper }) => {
		await wrapper.setProps({ interceptClose: true });
		await wrapper.find(".modal-background").trigger("click");
		await wrapper.find(".modal-card-head > .delete").trigger("click");
		expect(wrapper.emitted()).toHaveProperty("close");
		expect(wrapper.emitted().close).toHaveLength(2);
	});

	test("click to close modal calls store action if not intercepted", async ({
		wrapper
	}) => {
		const modalsStore = useModalsStore();
		await wrapper.find(".modal-background").trigger("click");
		await wrapper.find(".modal-card-head > .delete").trigger("click");
		await flushPromises();
		expect(modalsStore.closeCurrentModal).toHaveBeenCalledTimes(2);
	});

	test("renders slots", async () => {
		const wrapper = await getWrapper(Modal, {
			slots: {
				sidebar: h("div", {}, "Sidebar Slot"),
				toggleMobileSidebar: h("div", {}, "Toggle Mobile Sidebar Slot"),
				body: h("div", {}, "Body Slot"),
				footer: h("div", {}, "Footer Slot")
			}
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
