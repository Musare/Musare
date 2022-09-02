import { mount } from "@vue/test-utils";
import InputHelpBox from "@/components/InputHelpBox.vue";

test("input help box component props", async () => {
	expect(InputHelpBox).toBeTruthy();

	const wrapper = mount(InputHelpBox, {
		props: {
			message: "This input has not been entered and is valid.",
			valid: true,
			entered: false
		}
	});

	expect(wrapper.text()).toBe(
		"This input has not been entered and is valid."
	);
	expect(wrapper.classes()).toContain("is-grey");

	await wrapper.setProps({
		message: "This input has not been entered and is invalid.",
		valid: false,
		entered: false
	});
	expect(wrapper.text()).toBe(
		"This input has not been entered and is invalid."
	);
	expect(wrapper.classes()).toContain("is-grey");

	await wrapper.setProps({
		message: "This input has been entered and is valid.",
		valid: true,
		entered: true
	});
	expect(wrapper.text()).toBe("This input has been entered and is valid.");
	expect(wrapper.classes()).toContain("is-success");

	await wrapper.setProps({
		message: "This input has potentially been entered and is valid.",
		valid: true,
		entered: undefined
	});
	expect(wrapper.text()).toBe(
		"This input has potentially been entered and is valid."
	);
	expect(wrapper.classes()).toContain("is-success");

	await wrapper.setProps({
		message: "This input has been entered and is invalid.",
		valid: false,
		entered: true
	});
	expect(wrapper.text()).toBe("This input has been entered and is invalid.");
	expect(wrapper.classes()).toContain("is-danger");

	await wrapper.setProps({
		message: "This input has potentially been entered and is invalid.",
		valid: false,
		entered: undefined
	});
	expect(wrapper.text()).toBe(
		"This input has potentially been entered and is invalid."
	);
	expect(wrapper.classes()).toContain("is-danger");

	expect(wrapper.html()).toMatchSnapshot();
	expect(wrapper.classes()).toContain("help");
});
