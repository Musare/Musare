import InfoIcon from "@/components/InfoIcon.vue";
import { getWrapper } from "@/tests/utils/utils";

test("InfoIcon component", async () => {
	const wrapper = await getWrapper(InfoIcon, {
		props: { tooltip: "This is a tooltip" }
	});

	expect(wrapper.attributes("content")).toBe("This is a tooltip");

	// await wrapper.trigger("onmouseover");
});
