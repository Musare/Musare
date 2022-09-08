import { createTestingPinia } from "@pinia/testing";
import VueTippy, { Tippy } from "vue-tippy";
import { flushPromises, mount } from "@vue/test-utils";
import "lofig";

const config = await import("../../dist/config/template.json");

export const useTestUtils = () => {
	const getWrapper = async (component, options?) => {
		const opts = options || {};

		if (!opts.global) opts.global = {};

		const plugins = [
			createTestingPinia(),
			[
				VueTippy,
				{
					directive: "tippy", // => v-tippy
					flipDuration: 0,
					popperOptions: {
						modifiers: {
							preventOverflow: {
								enabled: true
							}
						}
					},
					allowHTML: true,
					defaultProps: { animation: "scale", touch: "hold" }
				}
			]
		];
		if (opts.global.plugins)
			opts.global.plugins = [...opts.global.plugins, ...plugins];
		else opts.global.plugins = plugins;

		const components = { Tippy };
		if (opts.global.components)
			opts.global.components = {
				...opts.global.components,
				...components
			};
		else opts.global.components = components;

		if (opts.lofig) {
			lofig.config = {
				...config,
				...opts.lofig
			};
			delete opts.lofig;
		} else lofig.config = config;

		const wrapper = mount(component, opts);
		await flushPromises();
		return wrapper;
	};

	return { getWrapper };
};
