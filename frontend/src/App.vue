<template>
	<div class="upper-container">
		<banned v-if="banned" />
		<div v-else class="upper-container">
			<router-view
				:key="$route.fullPath"
				class="main-container"
				:class="{ 'main-container-modal-active': aModalIsOpen2 }"
			/>
			<what-is-new v-show="modals.whatIsNew" />
			<login-modal v-if="modals.login" />
			<register-modal v-if="modals.register" />
			<create-playlist-modal v-if="modals.createPlaylist" />
		</div>
		<falling-snow v-if="christmas" />
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
		Banned: defineAsyncComponent(() => import("@/pages/Banned.vue")),
		FallingSnow: defineAsyncComponent(() =>
			import("@/components/FallingSnow.vue")
		)
	},
	replace: false,
	data() {
		return {
			apiDomain: "",
			socketConnected: true,
			keyIsDown: false,
			scrollPosition: { y: 0, x: 0 },
			aModalIsOpen2: false,
			broadcastChannel: null,
			christmas: false
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
			if (nightmode) this.enableNightmode();
			else this.disableNightmode();
		},
		activityWatch(activityWatch) {
			if (activityWatch) aw.enable();
			else aw.disable();
		},
		aModalIsOpen(aModalIsOpen) {
			if (aModalIsOpen) {
				this.scrollPosition = {
					x: window.scrollX,
					y: window.scrollY
				};
				this.aModalIsOpen2 = true;
			} else {
				this.aModalIsOpen2 = false;
				setTimeout(() => {
					window.scrollTo(
						this.scrollPosition.x,
						this.scrollPosition.y
					);
				}, 10);
			}
		}
	},
	async mounted() {
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", e => {
				if (e.matches === !this.nightmode) this.toggleNightMode();
			});

		if (!this.loggedIn) {
			lofig.get("cookie.SIDname").then(sid => {
				this.broadcastChannel = new BroadcastChannel(
					`${sid}.user_login`
				);
				this.broadcastChannel.onmessage = data => {
					if (data) {
						this.broadcastChannel.close();
						window.location.reload();
					}
				};
			});
		}

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
			handler: () => this.toggleNightMode()
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

		this.disconnectedMessage = new Toast({
			content: "Could not connect to the server.",
			persistent: true,
			interactable: false
		});

		this.disconnectedMessage.hide();

		ws.onConnect(() => {
			this.socketConnected = true;

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

					if (this.nightmode) this.enableNightmode();
					else this.disableNightmode();
				}
			});

			this.socket.on("keep.event:user.session.deleted", () =>
				window.location.reload()
			);
		});

		ws.onDisconnect(true, () => {
			this.socketConnected = false;
		});

		this.apiDomain = await lofig.get("backend.apiDomain");

		this.$router.isReady().then(() => {
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

			if (localStorage.getItem("github_redirect")) {
				this.$router.push(localStorage.getItem("github_redirect"));
				localStorage.removeItem("github_redirect");
			}
		});

		if (localStorage.getItem("nightmode") === "true") {
			this.changeNightmode(true);
			this.enableNightmode();
		}

		lofig.get("siteSettings.christmas").then(christmas => {
			if (christmas) {
				this.christmas = true;
				this.enableChristmasMode();
			}
		});
	},
	methods: {
		toggleNightMode() {
			localStorage.setItem("nightmode", !this.nightmode);

			if (this.loggedIn) {
				this.socket.dispatch(
					"users.updatePreferences",
					{ nightmode: !this.nightmode },
					res => {
						if (res.status !== "success") new Toast(res.message);
					}
				);
			}

			this.changeNightmode(!this.nightmode);
		},
		enableNightmode: () => {
			document
				.getElementsByTagName("html")[0]
				.classList.add("night-mode");
		},
		disableNightmode: () => {
			document
				.getElementsByTagName("html")[0]
				.classList.remove("night-mode");
		},
		enableChristmasMode: () => {
			document
				.getElementsByTagName("html")[0]
				.classList.add("christmas-mode");
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
@import "normalize.css/normalize.css";
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
	--dark-red: rgb(235, 41, 19);
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
	body {
		background-color: var(--black) !important;
	}

	div {
		color: var(--light-grey-2);
	}

	.input,
	.textarea,
	.select select {
		background-color: var(--dark-grey);
		border-color: var(--grey-3);
		color: var(--white);

		&::placeholder {
			color: var(--light-grey-3);
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

	code {
		background-color: var(--dark-grey-2) !important;
	}

	.button.is-dark {
		background-color: var(--light-grey) !important;
		color: var(--dark-grey-2) !important;
	}
}

.christmas-mode {
	--primary-color: var(--red);
}

/* inter-regular - latin */
@font-face {
	font-family: "Inter";
	font-style: normal;
	font-weight: 400;
	src: url("/fonts/inter-v3-latin-regular.eot"); /* IE9 Compat Modes */
	src: local(""),
		url("/fonts/inter-v3-latin-regular.eot?#iefix")
			format("embedded-opentype"),
		/* IE6-IE8 */ url("/fonts/inter-v3-latin-regular.woff2") format("woff2"),
		/* Super Modern Browsers */ url("/fonts/inter-v3-latin-regular.woff")
			format("woff"),
		/* Modern Browsers */ url("/fonts/inter-v3-latin-regular.ttf")
			format("truetype"),
		/* Safari, Android, iOS */
			url("/fonts/inter-v3-latin-regular.svg#Inter") format("svg"); /* Legacy iOS */
}

/* inter-200 - latin */
@font-face {
	font-family: "Inter";
	font-style: normal;
	font-weight: 200;
	src: url("/fonts/inter-v3-latin-200.eot"); /* IE9 Compat Modes */
	src: local(""),
		url("/fonts/inter-v3-latin-200.eot?#iefix") format("embedded-opentype"),
		/* IE6-IE8 */ url("/fonts/inter-v3-latin-200.woff2") format("woff2"),
		/* Super Modern Browsers */ url("/fonts/inter-v3-latin-200.woff")
			format("woff"),
		/* Modern Browsers */ url("/fonts/inter-v3-latin-200.ttf")
			format("truetype"),
		/* Safari, Android, iOS */ url("/fonts/inter-v3-latin-200.svg#Inter")
			format("svg"); /* Legacy iOS */
}

/* inter-800 - latin */
@font-face {
	font-family: "Inter";
	font-style: normal;
	font-weight: 800;
	src: url("/fonts/inter-v3-latin-800.eot"); /* IE9 Compat Modes */
	src: local(""),
		url("/fonts/inter-v3-latin-800.eot?#iefix") format("embedded-opentype"),
		/* IE6-IE8 */ url("/fonts/inter-v3-latin-800.woff2") format("woff2"),
		/* Super Modern Browsers */ url("/fonts/inter-v3-latin-800.woff")
			format("woff"),
		/* Modern Browsers */ url("/fonts/inter-v3-latin-800.ttf")
			format("truetype"),
		/* Safari, Android, iOS */ url("/fonts/inter-v3-latin-800.svg#Inter")
			format("svg"); /* Legacy iOS */
}

/* inter-600 - latin */
@font-face {
	font-family: "Inter";
	font-style: normal;
	font-weight: 600;
	src: url("/fonts/inter-v3-latin-600.eot"); /* IE9 Compat Modes */
	src: local(""),
		url("/fonts/inter-v3-latin-600.eot?#iefix") format("embedded-opentype"),
		/* IE6-IE8 */ url("/fonts/inter-v3-latin-600.woff2") format("woff2"),
		/* Super Modern Browsers */ url("/fonts/inter-v3-latin-600.woff")
			format("woff"),
		/* Modern Browsers */ url("/fonts/inter-v3-latin-600.ttf")
			format("truetype"),
		/* Safari, Android, iOS */ url("/fonts/inter-v3-latin-600.svg#Inter")
			format("svg"); /* Legacy iOS */
}

/* pacifico-regular - latin */
@font-face {
	font-family: "Pacifico";
	font-style: normal;
	font-weight: 400;
	src: url("/fonts/pacifico-v17-latin-regular.eot"); /* IE9 Compat Modes */
	src: local(""),
		url("/fonts/pacifico-v17-latin-regular.eot?#iefix")
			format("embedded-opentype"),
		/* IE6-IE8 */ url("/fonts/pacifico-v17-latin-regular.woff2")
			format("woff2"),
		/* Super Modern Browsers */
			url("/fonts/pacifico-v17-latin-regular.woff") format("woff"),
		/* Modern Browsers */ url("/fonts/pacifico-v17-latin-regular.ttf")
			format("truetype"),
		/* Safari, Android, iOS */
			url("/fonts/pacifico-v17-latin-regular.svg#Pacifico") format("svg"); /* Legacy iOS */
}

@font-face {
	font-family: "Material Icons";
	font-style: normal;
	font-weight: 400;
	src: url(/fonts/MaterialIcons-Regular.ttf); /* For IE6-8 */
	src: local("Material Icons"), local("MaterialIcons-Regular"),
		url(/fonts/MaterialIcons-Regular.ttf) format("truetype");
}

.material-icons {
	font-family: "Material Icons";
	font-weight: normal;
	font-style: normal;
	font-size: 24px; /* Preferred icon size */
	display: inline-block;
	line-height: 1;
	text-transform: none;
	letter-spacing: normal;
	word-wrap: normal;
	white-space: nowrap;
	direction: ltr;

	/* Support for all WebKit browsers. */
	-webkit-font-smoothing: antialiased;
	/* Support for Safari and Chrome. */
	text-rendering: optimizeLegibility;

	/* Support for Firefox. */
	-moz-osx-font-smoothing: grayscale;

	/* Support for IE. */
	font-feature-settings: "liga";
}

code {
	background-color: var(--light-grey) !important;
	color: var(--dark-red) !important;
}

#toasts-container {
	z-index: 10000 !important;

	.toast {
		font-weight: 600;
		z-index: 10000 !important;
	}
}

html {
	overflow: auto !important;
	height: 100%;
	background-color: inherit;
	font-size: 14px;
}

body {
	background-color: var(--light-grey);
	color: var(--dark-grey);
	height: 100%;
	line-height: 1.4285714;
	font-size: 1rem;
	font-family: "Inter", Helvetica, Arial, sans-serif;
}

.app {
	min-height: 100vh;
	position: relative;
}

#root {
	height: 100%;
}

.content-wrapper {
	/* padding: 60px 0 calc(230px + 60px) 0; */
	padding-top: 60px;
}

.column {
	display: flex;
	flex: 1 1 0;
	flex-direction: column;
	padding: 10px;
}

ul {
	list-style: none;
	margin: 0;
	display: block;
}

h1,
h2,
h3,
h4,
h5,
h6 {
	font-family: "Inter", Helvetica, Arial, sans-serif;
	font-weight: 400;
	line-height: 1.1;

	a {
		font-weight: inherit;
	}
}

h1 {
	font-size: 4.2rem;
	line-height: 110%;
	margin: 2.1rem 0 1.68rem 0;
}

h2 {
	font-size: 3.56rem;
	line-height: 110%;
	margin: 1.78rem 0 1.424rem 0;
}

h3 {
	font-size: 2.92rem;
	line-height: 110%;
	margin: 1.46rem 0 1.168rem 0;
}

h4 {
	font-size: 2.28rem;
	line-height: 110%;
	margin: 1.14rem 0 0.912rem 0;
}

h5 {
	font-size: 1.64rem;
	line-height: 110%;
	margin: 0.82rem 0 0.656rem 0;
}

h6 {
	font-size: 1rem;
	line-height: 110%;
	margin: 0.5rem 0 0.4rem 0;
}

.content {
	h4 {
		line-height: 1.125;
	}
}

.thin {
	font-weight: 200;
}

.left {
	float: left !important;
}

.right {
	float: right !important;
}

.white {
	background-color: var(--white) !important;
}

.btn-search {
	font-size: 14px;
}

a.nav-item.is-tab {
	border-bottom: 1px solid transparent;
	border-top: 1px solid transparent;
}

.button.is-info {
	border-width: 0;
	color: var(--white);
}

strong {
	color: inherit;
}

hr {
	background-color: var(--light-grey-2);
	border: none;
	height: 1px;
}

p,
button,
input,
select,
textarea {
	font-family: "Inter", Helvetica, Arial, sans-serif;
}

input,
select,
textarea {
	outline: none;
}

.label {
	display: flex;
	font-weight: 700;

	&:not(:last-child) {
		margin-bottom: 5px;
	}
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

@media screen and (min-width: 980px) {
	.container {
		max-width: 960px;
		margin-left: auto;
		margin-right: auto;
	}
}

@media screen and (min-width: 1180px) {
	.container {
		max-width: 1200px;
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

	&.main-container-modal-active {
		height: 100% !important;
		overflow: hidden !important;
	}

	> .container {
		position: relative;
		flex: 1 0 auto;
		margin: 0 auto;
		max-width: 1200px;
	}
}

a {
	color: var(--primary-color);
	text-decoration: none;
	cursor: pointer;

	&:hover,
	&:focus {
		filter: brightness(90%);
	}
}

table {
	border-collapse: collapse;
	width: 100%;

	thead {
		td {
			border-width: 0 0 2px;
		}
	}

	td {
		border: 1px solid var(--light-grey-2);
		border-width: 0 0 1px;
		padding: 8px 10px;
	}

	tbody {
		tr:last-child {
			td {
				border-bottom-width: 0;
			}
		}
	}
}

img {
	max-width: 100%;
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
	background-color: var(--dark-red);
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

		.tippy-content {
			color: var(--black);
		}

		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"],
		&[data-theme~="search"],
		&[data-theme~="stationSettings"] {
			background-color: var(--dark-grey-2);
			border: 0 !important;
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

		&[data-theme~="search"] {
			background-color: var(--dark-grey-2);
			border: 0 !important;
		}
	}

	.tippy-box[data-placement^="top"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"],
		&[data-theme~="search"] {
			> .tippy-arrow::before {
				border-top-color: var(--dark-grey-2);
			}
		}
	}

	.tippy-box[data-placement^="bottom"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"],
		&[data-theme~="search"],
		&[data-theme~="stationSettings"] {
			> .tippy-arrow::before {
				border-bottom-color: var(--dark-grey-2);
			}
		}
	}

	.tippy-box[data-placement^="left"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"],
		&[data-theme~="search"] {
			> .tippy-arrow::before {
				border-left-color: var(--dark-grey-2);
			}
		}
	}

	.tippy-box[data-placement^="right"] {
		&[data-theme~="songActions"],
		&[data-theme~="addToPlaylist"],
		&[data-theme~="search"] {
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
	background-color: var(--dark-red);
	border: 0;

	.tippy-content {
		padding: 0;
	}

	a {
		padding: 15px;
		line-height: 30px;
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

	.play-icon,
	.added-to-playlist-icon {
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
		color: var(--dark-red);
	}

	.report-icon {
		color: var(--yellow);
	}
}

.tippy-box[data-placement^="top"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"],
	&[data-theme~="search"] {
		> .tippy-arrow::before {
			border-top-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-top-color: var(--dark-red);
	}
}

.tippy-box[data-placement^="bottom"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"],
	&[data-theme~="stationSettings"],
	&[data-theme~="search"] {
		> .tippy-arrow::before {
			border-bottom-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-bottom-color: var(--dark-red);
	}
}

.tippy-box[data-placement^="left"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"],
	&[data-theme~="search"] {
		> .tippy-arrow::before {
			border-left-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-left-color: var(--dark-red);
	}
}

.tippy-box[data-placement^="right"] {
	&[data-theme~="songActions"],
	&[data-theme~="addToPlaylist"],
	&[data-theme~="search"] {
		> .tippy-arrow::before {
			border-right-color: var(--white);
		}
	}
	&[data-theme~="confirm"] > .tippy-arrow::before {
		border-right-color: var(--dark-red);
	}
}

.tippy-box[data-theme~="stationSettings"] {
	border: 1px solid var(--light-grey-3);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);

	button:not(:last-of-type) {
		margin-bottom: 5px;
	}
}

.tippy-box[data-theme~="addToPlaylist"] {
	font-size: 15px;
	padding: 0;
	border: 1px solid var(--light-grey-3);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);
	color: var(--dark-grey);
	width: 350px;

	.tippy-content {
		padding: 0;
	}

	.nav-dropdown-items {
		max-height: 220px;
		overflow-y: auto;
		padding: 10px 10px 0 10px;

		.nav-item {
			width: 100%;
			justify-content: flex-start;
			border: 0;
			padding: 8px 4px;
			font-size: 15.5px;
			min-height: 36px;
			background: var(--light-grey);
			border-radius: 5px;
			cursor: pointer;

			.checkbox-control {
				display: flex;
				flex-direction: row;
				align-items: center;
				overflow-wrap: anywhere;
				margin: 0 !important;

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
					width: 100%;
					position: absolute;
					cursor: pointer;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background-color: var(--light-grey-3);
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
					background-color: var(--white);
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

		button.nav-item {
			&:not(:last-of-type) {
				margin-bottom: 10px;
			}
		}
	}

	#create-playlist {
		margin: 10px 10px 10px 10px;
		width: unset;
	}
}

.tippy-box[data-theme~="search"] {
	font-size: 15px;
	padding: 0;
	border: 1px solid var(--light-grey-3);
	box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
	background-color: var(--white);
	color: var(--dark-grey);
	width: 500px;

	.tippy-content {
		padding: 0;

		& > span {
			display: flex;
			flex-direction: column;
			padding: 5px;

			.control {
				margin-bottom: 0 !important;
			}
		}
	}
}

.has-text-centered {
	text-align: center;
}

.select {
	position: relative;

	&:after {
		content: " ";
		border: 1.5px solid var(--primary-color);
		border-right: 0;
		border-top: 0;
		height: 7px;
		pointer-events: none;
		position: absolute;
		transform: rotate(-45deg);
		width: 7px;
		margin-top: -6px;
		right: 16px;
		top: 50%;
	}

	select {
		height: 36px;
		background-color: var(--white);
		border: 1px solid var(--light-grey-2);
		color: var(--dark-grey-2);
		appearance: none;
		border-radius: 3px;
		font-size: 14px;
		line-height: 24px;
		padding-left: 8px;
		position: relative;
		padding-right: 36px;
		cursor: pointer;
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

#tab-selection,
.tab-selection {
	overflow-x: auto;
	.button {
		white-space: nowrap;
	}
}

.table {
	background-color: var(--white);
	color: var(--dark-grey);
	width: 100%;
	border-collapse: collapse;
	border-spacing: 0;
	border-radius: 5px;

	thead th {
		padding: 5px 10px;
		text-align: left;
		font-weight: 600;
		color: var(--grey-3);
	}

	tr {
		&:nth-child(even) {
			background-color: #fafafa;
		}
		&:hover,
		&:focus {
			background-color: var(--light-grey);
		}
	}
}

.button {
	border: 1px solid var(--light-grey-2);
	background-color: var(--white);
	color: var(--dark-grey-2);
	border-radius: 3px;
	line-height: 24px;
	align-items: center;
	display: inline-flex;
	font-size: 14px;
	padding-left: 10px;
	padding-right: 10px;
	justify-content: center;
	cursor: pointer;
	user-select: none;
	white-space: nowrap;

	&:hover,
	&:focus {
		filter: brightness(95%);
	}

	&.is-success {
		background-color: var(--green) !important;
		border-width: 0;
		color: var(--white);
	}

	&.is-primary {
		background-color: var(--primary-color) !important;
		border-width: 0;
		color: var(--white);
	}

	&.is-danger {
		background-color: var(--dark-red) !important;
		border-width: 0;
		color: var(--white);
	}

	&.is-info {
		background-color: var(--primary-color) !important;
		border-width: 0;
		color: var(--white);
	}

	&.is-warning {
		background-color: var(--yellow) !important;
		border-width: 0;
		color: rgba(0, 0, 0, 0.7);
	}

	&.is-dark {
		background-color: var(--dark-grey-2);
		border-width: 0;
		color: var(--light-grey);
	}

	&.is-fullwidth {
		display: flex;
		width: 100%;
	}
}

.input,
.textarea {
	width: 100%;
	padding-left: 8px;
	padding-right: 8px;
	line-height: 24px;
	font-size: 14px;
	border-radius: 3px;
	box-shadow: inset 0 1px 2px rgba(10, 10, 10, 0.1);
	border: 1px solid var(--light-grey-2);
}

.input,
.button {
	height: 36px;
}

.textarea {
	display: block;
	line-height: 1.2;
	padding: 10px;
	max-height: 600px;
	min-height: 120px;
	min-width: 100%;
	resize: vertical;
}

.icon {
	height: 24px;
	width: 24px;
	line-height: 24px;
	margin-left: 4px;
	margin-right: -2px;
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

	&.is-grouped {
		display: flex;
	}

	&.is-expanded {
		flex: 1;
	}

	&.has-addons {
		display: flex;

		.button {
			border-radius: 0;
			margin-right: -1px;

			&:first-child {
				border-radius: 3px 0 0 3px;
			}

			&:last-child {
				border-radius: 0 3px 3px 0;
				padding-left: 10px;
			}
		}

		.input {
			margin-right: -1px;

			&:first-child {
				border-radius: 3px 0 0 3px;
			}
		}
	}
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

			&:not(:first-child) {
				margin-left: 5px;
			}
		}

		.play-icon,
		.added-to-playlist-icon {
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
			color: var(--dark-red);
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
	justify-content: flex-start;
	margin: 5px 0;
}

.steps-fade-leave-active {
	display: none;
}

.steps-fade-enter-active,
.steps-fade-leave-active {
	transition: all 0.3s ease;
}

.steps-fade-enter-from,
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
		user-select: none;

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

/* This class is used for content-box in ResetPassword, but not in RemoveAccount. This is because ResetPassword uses transitions and RemoveAccount does not */
.content-box-wrapper {
	margin-top: 90px;
	width: 100%;
	display: flex;
	align-items: center;
}

.content-box {
	border-radius: 3px;
	background-color: var(--white);
	border: 1px solid var(--dark-grey);
	max-width: 580px;
	padding: 40px;
	flex: 1;

	@media screen and (max-width: 300px) {
		margin-top: 30px;
		padding: 30px 20px;
	}
}

.content-box-optional-helper {
	margin-top: 15px;
	color: var(--primary-color);
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
		color: var(--grey-2);
		border-left: 0.25em solid var(--light-grey-2);
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
		background-color: var(--light-grey-3);
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
		background-color: var(--white);
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

html {
	&,
	* {
		scrollbar-color: var(--primary-color) transparent;
		scrollbar-width: thin;
	}

	&.night-mode {
		&,
		* {
			scrollbar-color: var(--light-grey) transparent !important;
		}

		&::-webkit-scrollbar-thumb,
		::-webkit-scrollbar-thumb {
			background-color: var(--light-grey);
		}
	}
}

::-webkit-scrollbar {
	height: 10px;
	width: 10px;
}

::-webkit-scrollbar-track {
	background-color: transparent;
}

::-webkit-scrollbar-thumb {
	background-color: var(--primary-color);
}

::-webkit-scrollbar-corner {
	background-color: transparent;
}
</style>
