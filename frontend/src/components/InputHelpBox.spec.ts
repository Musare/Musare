import InputHelpBox from "@/components/InputHelpBox.vue";
import { getWrapper } from "@/tests/utils/utils";

describe("InputHelpBox component", () => {
	beforeEach(async context => {
		context.wrapper = await getWrapper(InputHelpBox, {
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

	describe.each([
		{ valid: true, entered: true, expected: "is-success" },
		{ valid: true, entered: false, expected: "is-grey" },
		{ valid: true, entered: undefined, expected: "is-success" },
		{ valid: false, entered: true, expected: "is-danger" },
		{ valid: false, entered: false, expected: "is-grey" },
		{ valid: false, entered: undefined, expected: "is-danger" }
	])("valid and entered props %j", ({ valid, entered, expected }) => {
		test("class updated", async ({ wrapper }) => {
			await wrapper.setProps({
				valid,
				entered
			});
			expect(wrapper.classes()).toContain(expected);
		});
	});
});
