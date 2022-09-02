import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import ChristmasLights from "@/components/ChristmasLights.vue";
import { useUserAuthStore } from "@/stores/userAuth";

describe("christmas lights component", () => {
	test("mount", async () => {
		expect(ChristmasLights).toBeTruthy();

		const wrapper = mount(ChristmasLights, {
			global: {
				plugins: [createTestingPinia()]
			}
		});

		expect(wrapper.classes()).toContain("christmas-lights");
		expect(wrapper.html()).toMatchSnapshot();
	});

	test("props", async () => {
		expect(ChristmasLights).toBeTruthy();

		const wrapper = mount(ChristmasLights, {
			global: {
				plugins: [createTestingPinia()]
			},
			props: {
				small: false,
				lights: 1
			}
		});

		expect(wrapper.classes()).not.toContain("christmas-lights-small");
		expect(
			wrapper.findAll(".christmas-lights .christmas-wire").length
		).toBe(1 + 1);
		expect(
			wrapper.findAll(".christmas-lights .christmas-light").length
		).toBe(1);

		await wrapper.setProps({
			small: true,
			lights: 10
		});
		expect(wrapper.classes()).toContain("christmas-lights-small");
		expect(
			wrapper.findAll(".christmas-lights .christmas-wire").length
		).toBe(10 + 1);
		expect(
			wrapper.findAll(".christmas-lights .christmas-light").length
		).toBe(10);

		expect(wrapper.html()).toMatchSnapshot();
	});

	test("loggedIn state", async () => {
		expect(ChristmasLights).toBeTruthy();

		const wrapper = mount(ChristmasLights, {
			global: {
				plugins: [createTestingPinia()]
			}
		});

		const userAuthStore = useUserAuthStore();

		expect(userAuthStore.loggedIn).toEqual(false);
		expect(wrapper.classes()).not.toContain("loggedIn");

		userAuthStore.loggedIn = true;
		await flushPromises();
		expect(userAuthStore.loggedIn).toEqual(true);
		expect(wrapper.classes()).toContain("loggedIn");

		expect(wrapper.html()).toMatchSnapshot();
	});
});
