<template>
	<div class="upper-container">
		<banned v-if="banned" />
		<div v-else class="upper-container">
			<router-view :key="$route.fullPath" class="main-container" />
			<what-is-new />
			<mobile-alert />
			<login-modal v-if="modals.header.login" />
			<register-modal v-if="modals.header.register" />
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
import Toast from "toasters";

import Banned from "./components/pages/Banned.vue";
import WhatIsNew from "./components/Modals/WhatIsNew.vue";
import MobileAlert from "./components/Modals/MobileAlert.vue";
import LoginModal from "./components/Modals/Login.vue";
import RegisterModal from "./components/Modals/Register.vue";
import io from "./io";
import keyboardShortcuts from "./keyboardShortcuts";

export default {
	replace: false,
	data() {
		return {
			serverDomain: "",
			socketConnected: true,
			keyIsDown: false
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		role: state => state.user.auth.role,
		username: state => state.user.auth.username,
		userId: state => state.user.auth.userId,
		banned: state => state.user.auth.banned,
		modals: state => state.modals.modals,
		currentlyActive: state => state.modals.currentlyActive,
		nightmode: state => state.user.preferences.nightmode
	}),
	methods: {
		submitOnEnter: (cb, event) => {
			if (event.which === 13) cb();
		},
		enableNightMode: () => {
			document
				.getElementsByTagName("body")[0]
				.classList.add("night-mode");
		},
		disableNightMode: () => {
			document
				.getElementsByTagName("body")[0]
				.classList.remove("night-mode");
		},
		...mapActions("modals", ["closeCurrentModal"]),
		...mapActions("user/preferences", ["changeNightmode"])
	},
	watch: {
		socketConnected(connected) {
			console.log(connected);
			if (!connected)
				new Toast({
					content: "Could not connect to the server.",
					persistant: true
				});
			else {
				// better implementation once vue-roaster is updated
				document
					.getElementById("toasts-content")
					.childNodes.forEach(toast => {
						if (
							toast.innerHTML ===
							"Could not connect to the server."
						) {
							toast.remove();
						}
					});
			}
		},
		nightmode(nightmode) {
			if (nightmode) this.enableNightMode();
			else this.disableNightMode();
		}
	},
	beforeMount() {
		const nightmode =
			false || JSON.parse(localStorage.getItem("nightmode"));
		this.changeNightmode(nightmode);
		if (nightmode) this.enableNightMode();
		else this.disableNightMode();
	},
	mounted() {
		document.onkeydown = ev => {
			const event = ev || window.event;
			const { keyCode } = event;
			const shift = event.shiftKey;
			const ctrl = event.ctrlKey;

			const identifier = `${keyCode}.${shift}.${ctrl}`;

			if (this.keyIsDown === identifier) return;
			this.keyIsDown = identifier;

			keyboardShortcuts.handleKeyDown(keyCode, shift, ctrl);
		};

		document.onkeyup = () => {
			this.keyIsDown = "";
		};

		keyboardShortcuts.registerShortcut("closeModal", {
			keyCode: 27,
			shift: false,
			ctrl: false,
			handler: () => {
				if (Object.keys(this.currentlyActive).length !== 0)
					this.closeCurrentModal();
			}
		});

		if (localStorage.getItem("github_redirect")) {
			this.$router.go(localStorage.getItem("github_redirect"));
			localStorage.removeItem("github_redirect");
		}

		io.onConnect(true, () => {
			this.socketConnected = true;
		});
		io.onConnectError(true, () => {
			this.socketConnected = false;
		});
		io.onDisconnect(true, () => {
			this.socketConnected = false;
		});

		lofig.get("serverDomain").then(serverDomain => {
			this.serverDomain = serverDomain;
		});

		this.$router.onReady(() => {
			if (this.$route.query.err) {
				let { err } = this.$route.query;
				err = err
					.replace(new RegExp("<", "g"), "&lt;")
					.replace(new RegExp(">", "g"), "&gt;");
				this.$router.push({ query: {} });
				new Toast({ content: err, timeout: 20000 });
			}
			if (this.$route.query.msg) {
				let { msg } = this.$route.query;
				msg = msg
					.replace(new RegExp("<", "g"), "&lt;")
					.replace(new RegExp(">", "g"), "&gt;");
				this.$router.push({ query: {} });
				new Toast({ content: msg, timeout: 20000 });
			}
		});
		io.getSocket(true, socket => {
			socket.on("keep.event:user.session.removed", () => {
				window.location.reload();
			});
		});
	},
	components: {
		WhatIsNew,
		MobileAlert,
		LoginModal,
		RegisterModal,
		Banned
	}
};
</script>

<style lang="scss">
@import "styles/global.scss";

.night-mode {
	div {
		// background-color: #000;
		color: #ddd;
	}

	#toasts-container .toast {
		background-color: #ddd;
		color: #333;
	}
}

body.night-mode {
	background-color: #000 !important;
}

#toasts-container {
	z-index: 10000 !important;

	.toast {
		font-weight: 600;
	}
}

.toast:not(:first-of-type) {
	margin-top: 5px;
}

html {
	overflow: auto !important;
	height: 100%;
}

body {
	background-color: $light-grey;
	color: $dark-grey;
	height: 100%;
	font-family: "Karla", Helvetica, Arial, sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6,
.sidebar-title {
	font-family: "Hind", Helvetica, Arial, sans-serif;
}

.modal-card-title {
	font-weight: 600;
	font-family: "Hind", Helvetica, Arial, sans-serif;
}

p {
	font-family: "Karla", Helvetica, Arial, sans-serif;
}

.upper-container {
	height: 100%;
}

.main-container {
	height: 100%;
	display: flex;
	flex-direction: column;

	> .container {
		flex: 1 0 auto;
	}
}

a {
	color: $primary-color;
	text-decoration: none;
}

.modal-card {
	margin: 0 !important;
}

.absolute-a {
	width: 100%;
	height: 100%;
	position: absolute;
	top: 0;
	left: 0;
}

.alert {
	padding: 20px;
	color: $white;
	background-color: $red;
	position: fixed;
	top: 50px;
	right: 50px;
	font-size: 2em;
	border-radius: 5px;
	z-index: 10000000;
}

.tooltip {
	position: relative;

	&:after {
		position: absolute;
		min-width: 80px;
		margin-left: -75%;
		text-align: center;
		padding: 7.5px 6px;
		border-radius: 2px;
		background-color: $dark-grey;
		font-size: 0.9em;
		color: $white;
		content: attr(data-tooltip);
		opacity: 0;
		transition: all 0.2s ease-in-out 0.1s;
		visibility: hidden;
	}

	&:hover:after {
		opacity: 1;
		visibility: visible;
	}
}

.tooltip-top {
	&:after {
		bottom: 150%;
	}

	&:hover {
		&:after {
			bottom: 120%;
		}
	}
}

.tooltip-bottom {
	&:after {
		top: 155%;
	}

	&:hover {
		&:after {
			top: 125%;
		}
	}
}

.tooltip-left {
	&:after {
		bottom: -10px;
		right: 130%;
		min-width: 100px;
	}

	&:hover {
		&:after {
			right: 110%;
		}
	}
}

.tooltip-right {
	&:after {
		bottom: -10px;
		left: 190%;
		min-width: 100px;
	}

	&:hover {
		&:after {
			left: 200%;
		}
	}
}

.button:focus,
.button:active {
	border-color: #dbdbdb !important;
}
.input:focus,
.input:active {
	border-color: $primary-color !important;
}
button.delete:focus {
	background-color: rgba(10, 10, 10, 0.3);
}

.tag {
	padding-right: 6px !important;
}

.button {
	&.is-success {
		background-color: $green !important;

		&:hover,
		&:focus {
			background-color: darken($green, 5%) !important;
		}
	}
	&.is-primary {
		background-color: $primary-color !important;

		&:hover,
		&:focus {
			background-color: darken($primary-color, 5%) !important;
		}
	}
	&.is-danger {
		background-color: $red !important;

		&:hover,
		&:focus {
			background-color: darken($red, 5%) !important;
		}
	}
	&.is-info {
		background-color: $blue !important;

		&:hover,
		&:focus {
			background-color: darken($blue, 5%) !important;
		}
	}
}

.page-title {
	margin: 0 0 50px 0;
}

.icon-with-button {
	margin-right: 3px;
	font-size: 18px;
}
</style>
