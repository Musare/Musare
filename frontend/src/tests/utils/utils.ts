import { createTestingPinia } from "@pinia/testing";
import VueTippy, { Tippy } from "vue-tippy";
import { flushPromises, mount } from "@vue/test-utils";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";

let config;
const getConfig = async () => {
	if (!config) config = await import("../../../dist/config/template.json");
	return config;
};

export const getWrapper = async (
	component: any,
	options?: {
		global?: {
			plugins?: any[];
			components?: { [key: string]: any };
		};
		usePinia?: boolean;
		pinia?: {
			stubActions?: boolean;
		};
		mockSocket?: boolean | { data?: any; executeDispatch?: boolean };
		lofig?: any;
		loginRequired?: boolean;
		baseTemplate?: string;
		attachTo?: HTMLElement | null;
		beforeMount?: () => void;
		onMount?: () => void;
		afterMount?: () => void;
	}
) => {
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
		if (typeof opts.mockSocket === "object") {
			if (opts.mockSocket.data)
				websocketsStore.socket.data = opts.mockSocket.data;
			if (typeof opts.mockSocket.executeDispatch !== "undefined")
				websocketsStore.socket.executeDispatch =
					opts.mockSocket.executeDispatch;
		}
		delete opts.mockSocket;
	}

	if (opts.loginRequired) {
		const userAuthStore = useUserAuthStore();
		userAuthStore.loggedIn = true;
		await flushPromises();
		delete opts.loginRequired;
	}

	if (opts.beforeMount) {
		await opts.beforeMount();
		delete opts.beforeMount;
	}

	if (opts.baseTemplate) {
		document.body.innerHTML = opts.baseTemplate;
		delete opts.baseTemplate;
	} else
		document.body.innerHTML = `
			<div id="root"></div>
			<div id="toasts-container" class="position-right position-bottom">
				<div id="toasts-content"></div>
			</div>
		`;
	if (!opts.attachTo) opts.attachTo = document.getElementById("root");
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
