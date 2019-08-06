<template>
	<div>
		<banned v-if="banned" />
		<div v-else>
			<h1 v-if="!socketConnected" class="alert">
				Could not connect to the server.
			</h1>
			<!-- should be a persistant toast -->
			<router-view />
			<toast />
			<what-is-new />
			<mobile-alert />
			<login-modal v-if="modals.header.login" />
			<register-modal v-if="modals.header.register" />
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

import { Toast } from "vue-roaster";

import Banned from "./components/pages/Banned.vue";
import WhatIsNew from "./components/Modals/WhatIsNew.vue";
import MobileAlert from "./components/Modals/MobileAlert.vue";
import LoginModal from "./components/Modals/Login.vue";
import RegisterModal from "./components/Modals/Register.vue";
import auth from "./auth";
import io from "./io";

export default {
	replace: false,
	data() {
		return {
			banned: false,
			ban: {},
			loggedIn: false,
			role: "",
			username: "",
			userId: "",
			serverDomain: "",
			socketConnected: true
		};
	},
	computed: mapState({
		modals: state => state.modals.modals,
		currentlyActive: state => state.modals.currentlyActive
	}),
	methods: {
		logout() {
			const _this = this;
			_this.socket.emit("users.logout", result => {
				if (result.status === "success") {
					document.cookie =
						"SID=;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
					window.location.reload();
				} else Toast.methods.addToast(result.message, 4000);
			});
		},
		submitOnEnter: (cb, event) => {
			if (event.which === 13) cb();
		},
		...mapActions("modals", ["closeCurrentModal"])
	},
	mounted() {
		document.onkeydown = ev => {
			const event = ev || window.event;
			if (
				event.keyCode === 27 &&
				Object.keys(this.currentlyActive).length !== 0
			)
				this.closeCurrentModal();
		};

		const _this = this;
		if (localStorage.getItem("github_redirect")) {
			this.$router.go(localStorage.getItem("github_redirect"));
			localStorage.removeItem("github_redirect");
		}
		auth.isBanned((banned, ban) => {
			_this.ban = ban;
			_this.banned = banned;
		});
		auth.getStatus((authenticated, role, username, userId) => {
			_this.socket = window.socket;
			_this.loggedIn = authenticated;
			_this.role = role;
			_this.username = username;
			_this.userId = userId;
		});
		io.onConnect(true, () => {
			_this.socketConnected = true;
		});
		io.onConnectError(true, () => {
			_this.socketConnected = false;
		});
		io.onDisconnect(true, () => {
			_this.socketConnected = false;
		});
		lofig.get("serverDomain", res => {
			_this.serverDomain = res;
		});
		_this.$router.onReady(() => {
			if (_this.$route.query.err) {
				let { err } = _this.$route.query;
				err = err
					.replace(new RegExp("<", "g"), "&lt;")
					.replace(new RegExp(">", "g"), "&gt;");
				_this.$router.push({ query: {} });
				Toast.methods.addToast(err, 20000);
			}
			if (_this.$route.query.msg) {
				let { msg } = _this.$route.query;
				msg = msg
					.replace(new RegExp("<", "g"), "&lt;")
					.replace(new RegExp(">", "g"), "&gt;");
				_this.$router.push({ query: {} });
				Toast.methods.addToast(msg, 20000);
			}
		});
		io.getSocket(true, socket => {
			socket.on("keep.event:user.session.removed", () => {
				window.location.reload();
			});
		});
	},
	components: {
		Toast,
		WhatIsNew,
		MobileAlert,
		LoginModal,
		RegisterModal,
		Banned
	}
};
</script>

<style lang="scss">
.center {
	text-align: center;
}

#toast-container {
	z-index: 10000 !important;
}

html {
	overflow: auto !important;
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
	color: white;
	background-color: red;
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
		background-color: #323232;
		font-size: 0.9em;
		color: #fff;
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
	border-color: #03a9f4 !important;
}
button.delete:focus {
	background-color: rgba(10, 10, 10, 0.3);
}

.tag {
	padding-right: 6px !important;
}

.button.is-success {
	background-color: #00b16a !important;
}
</style>
