import { createTestingPinia } from "@pinia/testing";
import VueTippy, { Tippy } from "vue-tippy";
import { mount } from "@vue/test-utils";

export const useTestUtils = () => {
	const getWrapper = (component, options?) => {
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

		const components = { Tippy };

		const opts = options || {};
		if (!opts.global) opts.global = {};
		if (opts.global.plugins)
			opts.global.plugins = [...opts.global.plugins, ...plugins];
		else opts.global.plugins = plugins;
		if (opts.global.components)
			opts.global.components = {
				...opts.global.components,
				...components
			};
		else opts.global.components = components;

		return mount(component, opts);
	};

	return { getWrapper };
};
