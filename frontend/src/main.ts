/* eslint-disable vue/one-component-per-file */
import { createApp } from "vue";

import VueTippy, { Tippy } from "vue-tippy";

import { useConfigStore } from "@/stores/config";
import { useWebsocketsStore } from "@/stores/websockets";
import i18n from "@/i18n";

import AppComponent from "./App.vue";

import { pinia } from "./pinia";
import { abilitiesPlugin } from "@casl/vue";
import { useCaslStore } from "./stores/casl";
import { useAuthStore } from "./stores/auth";
import { router } from "./router";

const handleMetadata = attrs => {
	const configStore = useConfigStore();
	document.title = `${configStore.sitename} | ${attrs.title}`;
};

const app = createApp(AppComponent);

app.use(i18n);

app.use(VueTippy, {
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
});

app.component("Tippy", Tippy);

app.component("PageMetadata", {
	watch: {
		$attrs: {
			// eslint-disable-next-line vue/no-arrow-functions-in-watch
			handler: attrs => {
				handleMetadata(attrs);
			},
			deep: true,
			immediate: true
		}
	},
	render() {
		return null;
	}
});

app.directive("scroll", {
	mounted(el, binding) {
		const f = (evt: Event) => {
			clearTimeout(window.scrollDebounceId);
			window.scrollDebounceId = setTimeout(() => {
				if (binding.value(evt, el)) {
					document.body.removeEventListener("scroll", f);
				}
			}, 200);
		};
		document.body.addEventListener("scroll", f);
	}
});

app.directive("focus", {
	mounted(el) {
		window.focusedElementBefore = document.activeElement;
		el.focus();
	}
});

app.use(pinia);

const authStore = useAuthStore();
const caslStore = useCaslStore();

app.use(abilitiesPlugin, caslStore.ability);

authStore.$onAction(async ({ name, after }) => {
	switch (name) {
	  case 'authenticate':
	  case 'reAuthenticate': {
		after(result => {
			caslStore.rules = result ? result.rules : []
		})
	  } break;
	  case 'logout': 
	  case 'isTokenExpired': {
		after(() => caslStore.rules = [])
	  } break;
	  default:
		break;
	}
  })

authStore.reAuthenticate();

const { createSocket } = useWebsocketsStore();
createSocket();

app.use(router);

app.mount("#root");

// console.log(222, await api.service('users').create({
// 	username: 'test',
// 	email: 'test@test.com',
// 	password: 'password'
// }));

// const authStore = useAuthStore();
// authStore.authenticate({
// 	strategy: 'local',
// 	email: 'test@test.com',
// 	password: 'password'
// })
// authStore.authenticate()
// 	.then(async () => {
// 		const users = await api.service('users').find();

// 		console.log(333, users);
// 	});

// 	socket.on("ready", res => {
// 		const { loggedIn, role, username, userId, email } = res.user;

// 		userAuthStore.authData({
// 			loggedIn,
// 			role,
// 			username,
// 			email,
// 			userId
// 		});

// 		if (loggedIn) {
// 			userAuthStore.resetCookieExpiration();
// 		}

// 		if (configStore.experimental.media_session) ms.initialize();
// 		else ms.uninitialize();
// 	});

// 	socket.on("keep.event:user.banned", res =>
// 		userAuthStore.banUser(res.data.ban)
// 	);

// 	socket.on("keep.event:user.username.updated", res =>
// 		userAuthStore.updateUsername(res.data.username)
// 	);

// 	socket.on("keep.event:user.preferences.updated", res => {
// 		const { preferences } = res.data;

// 		const {
// 			changeAutoSkipDisliked,
// 			changeNightmode,
// 			changeActivityLogPublic,
// 			changeAnonymousSongRequests,
// 			changeActivityWatch
// 		} = useUserPreferencesStore();

// 		if (preferences.autoSkipDisliked !== undefined)
// 			changeAutoSkipDisliked(preferences.autoSkipDisliked);

// 		if (preferences.nightmode !== undefined) {
// 			changeNightmode(preferences.nightmode);
// 		}

// 		if (preferences.activityLogPublic !== undefined)
// 			changeActivityLogPublic(preferences.activityLogPublic);

// 		if (preferences.anonymousSongRequests !== undefined)
// 			changeAnonymousSongRequests(preferences.anonymousSongRequests);

// 		if (preferences.activityWatch !== undefined)
// 			changeActivityWatch(preferences.activityWatch);
// 	});

// 	socket.on("keep.event:user.role.updated", res => {
// 		userAuthStore.updateRole(res.data.role);
// 		userAuthStore.updatePermissions().then(() => {
// 			const { meta } = router.currentRoute.value;
// 			if (
// 				meta &&
// 				meta.permissionRequired &&
// 				!userAuthStore.hasPermission(`${meta.permissionRequired}`)
// 			)
// 				router.push({
// 					path: "/",
// 					query: {
// 						toast: "You no longer have access to the page you were viewing."
// 					}
// 				});
// 		});
// 	});
