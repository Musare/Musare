<template>
	<div class="upper-container">
		<banned v-if="banned" />
		<div v-else class="upper-container">
			<router-view
				:key="$route.fullPath"
				class="main-container"
				:class="{ 'main-container-modal-active': aModalIsOpen }"
			/>
			<what-is-new v-show="modals.whatIsNew" />
			<login-modal v-if="modals.login" />
			<register-modal v-if="modals.register" />
			<create-playlist-modal v-if="modals.createPlaylist" />
		</div>
	</div>
</template>

<script>
import { mapState, mapActions, mapGetters } from "vuex";
import Toast from "toasters";
import { defineAsyncComponent } from "vue";

import ws from "./ws";
import aw from "./aw";
import keyboardShortcuts from "./keyboardShortcuts";

export default {
	components: {
		WhatIsNew: defineAsyncComponent(() =>
			import("@/components/modals/WhatIsNew.vue")
		),
		LoginModal: defineAsyncComponent(() =>
			import("@/components/modals/Login.vue")
		),
		RegisterModal: defineAsyncComponent(() =>
			import("@/components/modals/Register.vue")
		),
		CreatePlaylistModal: defineAsyncComponent(() =>
			import("@/components/modals/CreatePlaylist.vue")
		),
		Banned: defineAsyncComponent(() => import("@/pages/Banned.vue"))
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
			nightmode: state => state.user.preferences.nightmode,
			activityWatch: state => state.user.preferences.activityWatch
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		}),
		aModalIsOpen() {
			return Object.keys(this.currentlyActive).length > 0;
		}
	},
	watch: {
		socketConnected(connected) {
			if (!connected) this.disconnectedMessage.show();
			else this.disconnectedMessage.hide();
		},
		nightmode(nightmode) {
			if (nightmode) this.enableNightMode();
			else this.disableNightMode();
		},
		activityWatch(activityWatch) {
			if (activityWatch) aw.enable();
			else aw.disable();
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

		// ctrl + alt + n
		keyboardShortcuts.registerShortcut("nightmode", {
			keyCode: 78,
			ctrl: true,
			alt: true,
			handler: () => {
				localStorage.setItem("nightmode", !this.nightmode);

				if (this.loggedIn) {
					this.socket.dispatch(
						"users.updatePreferences",
						{ nightmode: !this.nightmode },
						res => {
							if (res.status !== "success")
								new Toast(res.message);
						}
					);
				}

				this.changeNightmode(!this.nightmode);
			}
		});

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

		this.disconnectedMessage = new Toast({
			content: "Could not connect to the server.",
			persistent: true,
			interactable: false
		});

		this.disconnectedMessage.hide();

		ws.onConnect(true, () => {
			this.socketConnected = true;
		});

		ws.onDisconnect(true, () => {
			this.socketConnected = false;
		});

		this.apiDomain = await lofig.get("apiDomain");

		this.$router.isReady(() => {
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

		if (localStorage.getItem("nightmode") === "true") {
			this.changeNightmode(true);
			this.enableNightMode();
		}

		this.socket.dispatch("users.getPreferences", res => {
			if (res.status === "success") {
				const { preferences } = res.data;

				this.changeAutoSkipDisliked(preferences.autoSkipDisliked);
				this.changeNightmode(preferences.nightmode);
				this.changeActivityLogPublic(preferences.activityLogPublic);
				this.changeAnonymousSongRequests(
					preferences.anonymousSongRequests
				);
				this.changeActivityWatch(preferences.activityWatch);

				if (this.nightmode) this.enableNightMode();
				else this.disableNightMode();
			}
		});

		this.socket.on("keep.event:user.session.deleted", () =>
			window.location.reload()
		);
	},
	methods: {
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
			"changeActivityLogPublic",
			"changeAnonymousSongRequests",
			"changeActivityWatch"
		])
	}
};
</script>

<style lang="scss">
@import "tippy.js/dist/tippy.css";
@import "tippy.js/animations/scale.css";

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
		// color: var(--dark-grey-2);
		// background-color: var(--light-grey-3) !important;

		// &:last-of-type {
		// 	background-color: var(--light-grey) !important;
		// }
	}

	.input,
	.textarea,
	.select select {
		background-color: var(--dark-grey);
		border-color: var(--grey-3);
		color: var(--white);
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
	label,
	.label {
		color: var(--light-grey-2) !important;
	}

	.section,
	.content {
		background-color: var(--dark-grey-3) !important;
	}

	.content-box,
	.step:not(.selected) {
		background-color: var(--dark-grey-3) !important;
	}

	.tippy-box[data-theme~="songActions"] {
		background-color: var(--dark-grey);
	}
}

body.night-mode {
	background-color: var(--black) !important;
}

#toasts-container {
	z-index: 10000 !important;

	.toast {
		font-weight: 600;
		// background-color: var(--dark-grey) !important;

		// &:last-of-type {
		// 	background-color: var(--dark-grey-2) !important;
		// }
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

#page-title {
	margin-top: 0;
	font-size: 35px;
	text-align: center;
}

@media only screen and (min-width: 700px) {
	#page-title {
		margin: 0;
		margin-bottom: 30px;
		font-size: 40px;
	}
}

.upper-container {
	height: 100%;
}

.main-container {
	height: 100%;
	min-height: 100vh;
	display: flex;
	flex-direction: column;

	> .container {
		flex: 1 0 auto;
	}
}

.main-container.main-container-modal-active {
	height: 100% !important;
	overflow: hidden;
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

.night-mode {
	.tippy-box {
		border: 1px solid var(--light-grey-3);
		box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
			0 10px 10px rgba(0, 0, 0, 0.22);
		background-color: var(--white);

		&:not([data-theme~="songActions"]) > .tippy-arrow::before {
			border-top-color: var(--white);
		}

		.tippy-content {
			color: var(--black);
		}

		&[data-theme~="songActions"] {
			background-color: var(--dark-grey-2);
			border: 0 !important;

			i,
			a {
				color: var(--white);
			}

			.youtube-icon {
				background-color: var(--white);
			}
		}
		&[data-theme~="addToPlaylist"] {
			background-color: var(--dark-grey-2);
			border: 0 !important;

			.nav-dropdown-items {
				.nav-item {
					background-color: var(--dark-grey);

					&:focus {
						outline-color: var(--dark-grey);
					}

					p {
						color: var(--white);
					}
				}
			}
		}
	}

	.tippy-box[data-placement^="top"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"] {
			> .tippy-arrow::before {
				border-top-color: var(--dark-grey-2);
			}
		}
	}

	.tippy-box[data-placement^="bottom"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"] {
			> .tippy-arrow::before {
				border-bottom-color: var(--dark-grey-2);
			}
		}
	}

	.tippy-box[data-placement^="left"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"] {
			> .tippy-arrow::before {
				border-left-color: var(--dark-grey-2);
			}
		}
	}

	.tippy-box[data-placement^="right"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"] {
			> .tippy-arrow::before {
				border-right-color: var(--dark-grey-2);
			}
		}
	}
}

.tippy-box[data-theme~="info"] {
	font-size: 12px;
	letter-spacing: 1px;
}

.tippy-box[data-theme~="confirm"] {
	background-color: var(--red);

	.tippy-content {
		padding: 0;
	}

	a {
		padding: 15px;
		line-height: 25px;
		color: var(--white);
		border-bottom: 0;
		font-size: 15px;
		font-weight: 600;

		&:hover,
		&:focus {
			filter: brightness(90%);
		}
	}
}

.tippy-box[data-theme~="songActions"] {
	font-size: 15px;
	padding: 5px 10px;
	border: 1px solid var(--light-grey-3);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);

	.button {
		width: 146px;
	}

	i,
	a {
		display: inline-block;
		cursor: pointer;
		color: var(--dark-grey);
		vertical-align: middle;

		&:hover,
		&:focus {
			filter: brightness(90%);
		}

		&:not(:first) {
			margin-left: 5px;
		}
	}

	.play-icon {
		color: var(--green);
	}

	.edit-icon,
	.view-icon,
	.add-to-playlist-icon,
	.add-to-queue-icon {
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

.tippy-box[data-placement^="top"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"] {
		> .tippy-arrow::before {
			border-top-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-top-color: var(--red);
	}
}

.tippy-box[data-placement^="bottom"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"] {
		> .tippy-arrow::before {
			border-bottom-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-bottom-color: var(--red);
	}
}

.tippy-box[data-placement^="left"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"] {
		> .tippy-arrow::before {
			border-left-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-left-color: var(--red);
	}
}

.tippy-box[data-placement^="right"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"] {
		> .tippy-arrow::before {
			border-right-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-right-color: var(--red);
	}
}

.tippy-box[data-theme~="addToPlaylist"] {
	font-size: 15px;
	padding: 5px;
	border: 1px solid var(--light-grey-3);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);
	color: var(--dark-grey);

	.nav-dropdown-items {
		.nav-item {
			width: 100%;
			justify-content: flex-start;
			border: 0;
			padding: 10px;
			font-size: 15.5px;
			height: 36px;
			background: var(--light-grey);
			border-radius: 5px;
			cursor: pointer;

			.checkbox-control {
				display: flex;
				flex-direction: row;
				align-items: center;

				p {
					margin-left: 10px;
				}

				.switch {
					position: relative;
					display: inline-block;
					flex-shrink: 0;
					width: 40px;
					height: 24px;
				}

				.switch input {
					opacity: 0;
					width: 0;
					height: 0;
				}

				.slider {
					position: absolute;
					cursor: pointer;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background-color: #ccc;
					transition: 0.2s;
					border-radius: 34px;
				}

				.slider:before {
					position: absolute;
					content: "";
					height: 16px;
					width: 16px;
					left: 4px;
					bottom: 4px;
					background-color: white;
					transition: 0.2s;
					border-radius: 50%;
				}

				input:checked + .slider {
					background-color: var(--primary-color);
				}

				input:focus + .slider {
					box-shadow: 0 0 1px var(--primary-color);
				}

				input:checked + .slider:before {
					transform: translateX(16px);
				}
			}

			&:focus {
				outline-color: var(--light-grey-3);
			}

			&:not(:last-of-type) {
				margin-bottom: 5px;
			}
		}
	}
	.tippy-content > span {
		display: flex;
		flex-direction: column;
		button {
			width: 150px;
			&:not(:last-of-type) {
				margin-bottom: 10px;
			}
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
	flex-grow: 1;
	align-items: center;
	justify-content: space-between;
	padding: 7.5px;
	border: 1px solid var(--light-grey-3);
	border-radius: 3px;
	overflow: hidden;

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

		.action-dropdown-icon {
			display: flex;
			color: var(--primary-color);
		}

		.icons-group {
			display: flex;
			align-items: center;

			a {
				padding: 0;
			}
		}

		.button {
			width: 146px;
		}

		i,
		span {
			cursor: pointer;
			// color: var(--dark-grey);

			&:hover,
			&:focus {
				filter: brightness(90%);
			}

			&:not(:first-child) {
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

.youtube-icon {
	margin-right: 3px;
	height: 20px;
	width: 20px;
	-webkit-mask: url("/assets/social/youtube.svg") no-repeat center;
	mask: url("/assets/social/youtube.svg") no-repeat center;
	background-color: var(--youtube);
}

#forgot-password {
	display: flex;
	justify-content: flex-start;
	margin: 5px 0;
}

.steps-fade-enter-active,
.steps-fade-leave-active {
	transition: all 0.3s ease;
}

.steps-fade-enter,
.steps-fade-leave-to {
	opacity: 0;
}

.skip-step {
	background-color: var(--grey-3);
	color: var(--white);
}

#steps {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 50px;
	margin-top: 36px;

	@media screen and (max-width: 300px) {
		display: none;
	}

	.step {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 100%;
		border: 1px solid var(--dark-grey);
		min-width: 50px;
		min-height: 50px;
		background-color: var(--white);
		font-size: 30px;
		cursor: pointer;

		&.selected {
			background-color: var(--primary-color);
			color: var(--white) !important;
			border: 0;
		}
	}

	.divider {
		display: flex;
		justify-content: center;
		width: 180px;
		height: 1px;
		background-color: var(--dark-grey);
	}
}

.content-box {
	margin-top: 90px;
	border-radius: 3px;
	background-color: var(--white);
	border: 1px solid var(--dark-grey);
	max-width: 580px;
	padding: 40px;

	@media screen and (max-width: 300px) {
		margin-top: 30px;
		padding: 30px 20px;
	}
}

.content-box-optional-helper {
	margin-top: 15px;
	color: var(--primary-color);
	text-decoration: underline;
	font-size: 16px;

	a {
		color: var(--primary-color);
	}
}

.content-box-title {
	font-size: 25px;
	color: var(--black);
}

.content-box-description {
	font-size: 14px;
	color: var(--dark-grey);
}

.content-box-inputs {
	margin-top: 35px;

	.input-with-button {
		.button {
			width: 105px;
		}

		@media screen and (max-width: 450px) {
			flex-direction: column;
		}
	}

	label {
		font-size: 11px;
	}

	#change-password-button {
		margin-top: 36px;
		width: 175px;
	}
}

#password-visibility-container {
	display: flex;
	align-items: center;

	a {
		width: 0;
		margin-left: -30px;
		z-index: 0;
		top: 2px;
		position: relative;
		color: var(--light-grey-1);
	}
}

.news-item {
	font-family: "Karla";
	border-radius: 5px;
	padding: 20px;
	border: unset !important;
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);

	* {
		font-family: Karla, Arial, sans-serif;
		font-size: 16px;
	}

	h1 {
		font-size: 40px;

		&:first-of-type {
			margin-top: 0;
		}
	}

	h2 {
		font-size: 30px;
	}

	h3 {
		font-size: 25px;
	}

	h4,
	h5,
	h6 {
		font-size: 20px;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		margin: 10px 0;
	}

	ul {
		list-style: unset;
	}

	li {
		margin-left: 30px;
	}

	blockquote {
		padding: 0px 15px;
		color: #6a737d;
		border-left: 0.25em solid #dfe2e5;
	}

	code {
		font-style: italic;
	}
}
.checkbox-control {
	display: flex;
	flex-direction: row;
	align-items: center;

	p {
		margin-left: 10px;
	}

	.switch {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
		width: 40px;
		height: 24px;
	}

	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: 0.2s;
		border-radius: 34px;
	}

	.slider:before {
		position: absolute;
		content: "";
		height: 16px;
		width: 16px;
		left: 4px;
		bottom: 4px;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
	}

	input:checked + .slider {
		background-color: var(--primary-color);
	}

	input:focus + .slider {
		box-shadow: 0 0 1px var(--primary-color);
	}

	input:checked + .slider:before {
		transform: translateX(16px);
	}
}
</style>
