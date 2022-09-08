import InfoIcon from "@/components/InfoIcon.vue";
import { useTestUtils } from "@/composables/useTestUtils";

const { getWrapper } = useTestUtils();

test("InfoIcon component", async () => {
	const wrapper = await getWrapper(InfoIcon, {
		props: { tooltip: "This is a tooltip" }
	});

	expect(wrapper.attributes("content")).toBe("This is a tooltip");

	// await wrapper.trigger("onmouseover");
});
