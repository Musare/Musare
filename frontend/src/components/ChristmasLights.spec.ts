import { flushPromises } from "@vue/test-utils";
import ChristmasLights from "@/components/ChristmasLights.vue";
import { getWrapper } from "@/tests/utils/utils";
import { useUserAuthStore } from "@/stores/userAuth";

describe("ChristmasLights component", () => {
	beforeEach(async context => {
		context.wrapper = await getWrapper(ChristmasLights);
	});

	test("small prop", async ({ wrapper }) => {
		await wrapper.setProps({
			small: false
		});
		expect(wrapper.classes()).not.toContain("christmas-lights-small");

		await wrapper.setProps({
			small: true
		});
		expect(wrapper.classes()).toContain("christmas-lights-small");
	});

	test("lights prop", async ({ wrapper }) => {
		await wrapper.setProps({
			lights: 10
		});
		expect(
			wrapper.findAll(".christmas-lights .christmas-wire").length
		).toBe(10 + 1);
		expect(
			wrapper.findAll(".christmas-lights .christmas-light").length
		).toBe(10);
	});

	test("loggedIn state", async ({ wrapper }) => {
		const userAuthStore = useUserAuthStore();

		expect(userAuthStore.loggedIn).toEqual(false);
		expect(wrapper.classes()).not.toContain("loggedIn");

		userAuthStore.loggedIn = true;
		await flushPromises();
		expect(userAuthStore.loggedIn).toEqual(true);
		expect(wrapper.classes()).toContain("loggedIn");
	});
});
