import InputHelpBox from "@/components/InputHelpBox.vue";
import { useTestUtils } from "@/composables/useTestUtils";

const { getWrapper } = useTestUtils();

describe("InputHelpBox component", () => {
	beforeEach(context => {
		context.wrapper = getWrapper(InputHelpBox, {
			props: {
				message: "",
				valid: true
			}
		});
	});

	test("message prop", async ({ wrapper }) => {
		await wrapper.setProps({
			message: "This input has not been entered and is valid."
		});
		expect(wrapper.text()).toBe(
			"This input has not been entered and is valid."
		);
	});

	describe("valid and entered props", () => {
		test("valid and entered", async ({ wrapper }) => {
			await wrapper.setProps({
				valid: true,
				entered: true
			});
			expect(wrapper.classes()).toContain("is-success");
		});

		test("valid and not entered", async ({ wrapper }) => {
			await wrapper.setProps({
				valid: true,
				entered: false
			});
			expect(wrapper.classes()).toContain("is-grey");
		});

		test("valid and entered undefined", async ({ wrapper }) => {
			await wrapper.setProps({
				valid: true,
				entered: undefined
			});
			expect(wrapper.classes()).toContain("is-success");
		});

		test("not valid and entered", async ({ wrapper }) => {
			await wrapper.setProps({
				valid: false,
				entered: true
			});
			expect(wrapper.classes()).toContain("is-danger");
		});

		test("not valid and not entered", async ({ wrapper }) => {
			await wrapper.setProps({
				valid: false,
				entered: false
			});
			expect(wrapper.classes()).toContain("is-grey");
		});

		test("not valid and entered undefined", async ({ wrapper }) => {
			await wrapper.setProps({
				valid: false,
				entered: undefined
			});
			expect(wrapper.classes()).toContain("is-danger");
		});
	});
});
