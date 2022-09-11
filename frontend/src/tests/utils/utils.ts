import { createTestingPinia } from "@pinia/testing";
import VueTippy, { Tippy } from "vue-tippy";
import { flushPromises, mount } from "@vue/test-utils";
import { useWebsocketsStore } from "@/stores/websockets";

let config;
const getConfig = async () => {
	if (!config) config = await import("../../../dist/config/template.json");
	return config;
};

export const getWrapper = async (component, options?) => {
	const opts = options || {};

	if (!opts.global) opts.global = {};

	let pinia;
	if (opts.usePinia) pinia = opts.usePinia;
	else if (
		opts.mockSocket ||
		(opts.pinia && opts.pinia.stubActions === false)
	)
		pinia = createTestingPinia({ stubActions: false });
	else pinia = createTestingPinia();
	if (opts.usePinia) delete opts.usePinia;
	if (opts.pinia) delete opts.pinia;

	const plugins = [
		pinia,
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

	await getConfig();
	if (opts.lofig) {
		lofig.config = {
			...config,
			...opts.lofig
		};
		delete opts.lofig;
	} else lofig.config = config;

	if (opts.mockSocket) {
		const websocketsStore = useWebsocketsStore();
		await websocketsStore.createSocket();
		await flushPromises();
		websocketsStore.socket.data = JSON.parse(
			JSON.stringify(opts.mockSocket)
		);
		delete opts.mockSocket;
	}

	if (opts.beforeMount) {
		await opts.beforeMount();
		delete opts.beforeMount;
	}

	const wrapper = mount(component, opts);
	if (opts.onMount) {
		await opts.onMount();
		delete opts.onMount;
	}
	await flushPromises();

	if (opts.afterMount) {
		await opts.afterMount();
		delete opts.afterMount;
	}

	return wrapper;
};
