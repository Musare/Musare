<template>
	<div class="upper-container">
		<banned v-if="banned" />
		<div v-else class="upper-container">
			<router-view :key="$route.fullPath" class="main-container" />
			<what-is-new />
			<login-modal v-if="modals.header.login" />
			<register-modal v-if="modals.header.register" />
		</div>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";

import ws from "./ws";
import keyboardShortcuts from "./keyboardShortcuts";

export default {
	components: {
		WhatIsNew: () => import("./components/modals/WhatIsNew.vue"),
		LoginModal: () => import("./components/modals/Login.vue"),
		RegisterModal: () => import("./components/modals/Register.vue"),
		Banned: () => import("./pages/Banned.vue")
	},
	replace: false,
	data() {
		return {
			apiDomain: "",
			socketConnected: true,
			keyIsDown: false
		};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			role: state => state.user.auth.role,
			username: state => state.user.auth.username,
			userId: state => state.user.auth.userId,
			banned: state => state.user.auth.banned,
			modals: state => state.modalVisibility.modals,
			currentlyActive: state => state.modalVisibility.currentlyActive,
			nightmode: state => state.user.preferences.nightmode
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	watch: {
		socketConnected(connected) {
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
	async mounted() {
		document.onkeydown = ev => {
			const event = ev || window.event;
			const { keyCode } = event;
			const shift = event.shiftKey;
			const ctrl = event.ctrlKey;
			const alt = event.altKey;

			const identifier = `${keyCode}.${shift}.${ctrl}`;

			if (this.keyIsDown === identifier) return;
			this.keyIsDown = identifier;

			keyboardShortcuts.handleKeyDown(event, keyCode, shift, ctrl, alt);
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
			this.$router.push(localStorage.getItem("github_redirect"));
			localStorage.removeItem("github_redirect");
		}

		ws.onConnect(true, () => {
			this.socketConnected = true;
		});

		ws.onDisconnect(true, () => {
			this.socketConnected = false;
		});

		this.apiDomain = await lofig.get("apiDomain");

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

		this.socket.dispatch("users.getPreferences", res => {
			if (res.status === "success") {
				this.changeAutoSkipDisliked(res.data.autoSkipDisliked);
				this.changeNightmode(res.data.nightmode);
				this.changeActivityLogPublic(res.data.activityLogPublic);

				if (this.nightmode) this.enableNightMode();
				else this.disableNightMode();
			}
		});

		this.socket.on("keep.event:user.session.removed", () =>
			window.location.reload()
		);
	},
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
		...mapActions("modalVisibility", ["closeCurrentModal"]),
		...mapActions("user/preferences", [
			"changeNightmode",
			"changeAutoSkipDisliked",
			"changeActivityLogPublic"
		])
	}
};
</script>

<style lang="scss">
:root {
	--primary-color: var(--blue);
	--blue: rgb(2, 166, 242);
	--light-blue: rgb(163, 224, 255);
	--dark-blue: rgb(0, 102, 244);
	--teal: rgb(0, 209, 178);
	--purple: rgb(143, 40, 140);
	--light-purple: rgb(170, 141, 216);
	--yellow: rgb(241, 196, 15);
	--light-pink: rgb(228, 155, 166);
	--dark-pink: rgb(234, 72, 97);
	--orange: rgb(255, 94, 0);
	--dark-orange: rgb(250, 50, 0);
	--green: rgb(68, 189, 50);
	--red: rgb(231, 77, 60);
	--white: rgb(255, 255, 255);
	--black: rgb(0, 0, 0);
	--light-grey: rgb(245, 245, 245);
	--light-grey-2: rgb(221, 221, 221);
	--light-grey-3: rgb(195, 193, 195);
	--grey: rgb(107, 107, 107);
	--grey-2: rgb(113, 113, 113);
	--grey-3: rgb(126, 126, 126);
	--dark-grey: rgb(77, 77, 77);
	--dark-grey-2: rgb(51, 51, 51);
	--dark-grey-3: rgb(34, 34, 34);
	--dark-grey-4: rgb(26, 26, 26);
	--youtube: rgb(189, 46, 46);
}

.night-mode {
	div {
		// background-color: var(--black);
		color: var(--light-grey-2);
	}

	#toasts-container .toast {
		color: var(--dark-grey-2);
		background-color: var(--light-grey-3) !important;

		&:last-of-type {
			background-color: var(--light-grey) !important;
		}
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		color: var(--white) !important;
	}

	p:not(.help),
	label {
		color: var(--light-grey-2) !important;
	}

	.content {
		background-color: var(--dark-grey-3) !important;
	}
}

body.night-mode {
	background-color: var(--black) !important;
}

#toasts-container {
	z-index: 10000 !important;

	.toast {
		font-weight: 600;
		background-color: var(--dark-grey) !important;

		&:last-of-type {
			background-color: var(--dark-grey-2) !important;
		}
	}
}

html {
	overflow: auto !important;
	height: 100%;
}

body {
	background-color: var(--light-grey);
	color: var(--dark-grey);
	height: 100%;
	font-family: "Inter", Helvetica, Arial, sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6,
.sidebar-title {
	font-family: "Inter", Helvetica, Arial, sans-serif;
}

.modal-card-title {
	font-weight: 600;
	font-family: "Inter", Helvetica, Arial, sans-serif;
}

p,
button,
input,
select,
textarea {
	font-family: "Inter", Helvetica, Arial, sans-serif;
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
	color: var(--primary-color);
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
	color: var(--white);
	background-color: var(--red);
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
		background-color: var(--dark-grey);
		font-size: 14px;
		line-height: 24px;
		text-transform: none;
		color: var(--white);
		content: attr(data-tooltip);
		opacity: 0;
		transition: all 0.2s ease-in-out 0.1s;
		visibility: hidden;
		z-index: 5;
	}

	&:hover:after,
	&:focus:after {
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

.tooltip-center {
	&:after {
		margin-left: 0;
	}

	&:hover {
		&:after {
			margin-left: 0;
		}
	}
}

.select {
	&:after {
		border-color: var(--primary-color);
		border-width: 1.5px;
		margin-top: -3px;
	}

	select {
		height: 36px;
	}
}

.button:focus,
.button:active {
	border-color: var(--light-grey-2) !important;
}

.input:focus,
.input:active,
.textarea:focus,
.textarea:active,
.select select:focus,
.select select:active {
	border-color: var(--primary-color) !important;
}

button.delete:focus {
	background-color: rgba(10, 10, 10, 0.3);
}

.tag {
	padding-right: 6px !important;
}

.button {
	&:hover,
	&:focus {
		filter: brightness(95%);
	}

	&.is-success {
		background-color: var(--green) !important;
	}

	&.is-primary {
		background-color: var(--primary-color) !important;
	}

	&.is-danger {
		background-color: var(--red) !important;
	}

	&.is-info {
		background-color: var(--primary-color) !important;
	}

	&.is-warning {
		background-color: var(--yellow) !important;
	}
}

.input,
.button {
	height: 36px;
}

.fadein-helpbox-enter-active {
	transition-duration: 0.3s;
	transition-timing-function: ease-in;
}

.fadein-helpbox-leave-active {
	transition-duration: 0.3s;
	transition-timing-function: cubic-bezier(0, 1, 0.5, 1);
}

.fadein-helpbox-enter-to,
.fadein-helpbox-leave {
	max-height: 100px;
	overflow: hidden;
}

.fadein-helpbox-enter,
.fadein-helpbox-leave-to {
	overflow: hidden;
	max-height: 0;
}

.control {
	margin-bottom: 5px !important;
}

.input-with-button {
	.control {
		margin-right: 0px !important;
	}

	input,
	select {
		width: 100%;
		height: 36px;
		border-radius: 3px 0 0 3px;
		border-right: 0;
		border-color: var(--light-grey-3);
	}

	.button {
		height: 36px;
		border-radius: 0 3px 3px 0;
	}
}

.page-title {
	margin: 0 0 50px 0;
}

.material-icons {
	user-select: none;
	-webkit-user-select: none;
}

.icon-with-button {
	margin-right: 3px;
	font-size: 18px;
}

.verified-song {
	font-size: 17px;
	color: var(--primary-color);
}

.section-title,
h4.section-title {
	font-size: 26px;
	font-weight: 600;
	margin: 0px;
}

.section-description {
	font-size: 16px;
	font-weight: 400;
	margin-bottom: 10px !important;
}

.section-horizontal-rule {
	margin: 15px 0 30px 0;
}

.section-margin-bottom {
	height: 30px;
}

.margin-top-zero {
	margin-top: 0 !important;
}

.margin-bottom-zero {
	margin-bottom: 0 !important;
}

/** Universial items e.g. playlist items, queue items, activity items */
.item-draggable {
	cursor: move;
}

.universal-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 7.5px;
	border: 1px solid var(--light-grey-3);
	border-radius: 3px;

	.item-thumbnail {
		width: 65px;
		height: 65px;
		margin: -7.5px;
		border-radius: 3px 0 0 3px;
	}

	.item-title {
		font-size: 20px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-description {
		font-size: 14px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.universal-item-actions {
		display: flex;
		flex-direction: row;
		margin-left: 10px;
		justify-content: center;

		@media screen and (max-width: 800px) {
			flex-wrap: wrap;
		}

		.button {
			width: 146px;
		}

		i {
			cursor: pointer;
			color: var(--dark-grey);

			&:hover,
			&:focus {
				filter: brightness(90%);
			}

			&:not(:first-of-type) {
				margin-left: 5px;
			}
		}

		.play-icon {
			color: var(--green);
		}

		.edit-icon,
		.view-icon,
		.add-to-playlist-icon {
			color: var(--primary-color);
		}

		.hide-icon {
			color: var(--light-grey-3);
		}

		.stop-icon,
		.delete-icon {
			color: var(--red);
		}

		.report-icon {
			color: var(--yellow);
		}
	}
}

.save-button-mixin {
	min-width: 200px;

	&:disabled {
		background-color: var(--light-grey) !important;
		color: var(--black);
	}
}

.save-button-transition-enter-active {
	transition: all 0.1s ease;
}

.save-button-transition-enter {
	transform: translateX(20px);
	opacity: 0;
}
</style>
