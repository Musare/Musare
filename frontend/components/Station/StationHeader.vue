<template>
	<div>
		<nav class="nav">
			<div class="nav-left">
				<router-link class="nav-item is-brand" :to="{ path: '/' }">
					<img
						:src="`${this.siteSettings.logo}`"
						:alt="`${this.siteSettings.siteName}` || `Musare`"
					/>
				</router-link>
			</div>

			<div class="nav-center stationDisplayName">
				{{ station.displayName }}
			</div>

			<span class="nav-toggle" v-on:click="controlBar = !controlBar">
				<span />
				<span />
				<span />
			</span>

			<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
				<router-link
					v-if="role === 'admin'"
					class="nav-item is-tab admin"
					:to="{ path: '/admin' }"
				>
					<strong>Admin</strong>
				</router-link>
				<span v-if="loggedIn" class="grouped">
					<router-link
						class="nav-item is-tab"
						:to="{ path: '/u/' + username }"
						>Profile</router-link
					>
					<router-link class="nav-item is-tab" to="/settings"
						>Settings</router-link
					>
					<a class="nav-item is-tab" @click="logout()">Logout</a>
				</span>
				<span v-else class="grouped">
					<a
						class="nav-item"
						href="#"
						@click="openModal({ sector: 'header', modal: 'login' })"
						>Login</a
					>
					<a
						class="nav-item"
						href="#"
						@click="
							openModal({ sector: 'header', modal: 'register' })
						"
						>Register</a
					>
				</span>
			</div>
		</nav>
		<div class="control-sidebar" :class="{ 'show-controlBar': controlBar }">
			<div class="inner-wrapper">
				<div v-if="isOwner()">
					<a class="sidebar-item" href="#" @click="settings()">
						<span class="icon">
							<i class="material-icons">settings</i>
						</span>
						<span class="icon-purpose">Station settings</span>
					</a>
					<a
						class="sidebar-item"
						href="#"
						@click="$parent.skipStation()"
					>
						<span class="icon">
							<i class="material-icons">skip_next</i>
						</span>
						<span class="icon-purpose">Skip current song</span>
					</a>
					<a
						v-if="paused"
						class="sidebar-item"
						href="#"
						@click="$parent.resumeStation()"
					>
						<span class="icon">
							<i class="material-icons">play_arrow</i>
						</span>
						<span class="icon-purpose">Resume station</span>
					</a>
					<a
						v-if="!paused"
						class="sidebar-item"
						href="#"
						@click="$parent.pauseStation()"
					>
						<span class="icon">
							<i class="material-icons">pause</i>
						</span>
						<span class="icon-purpose">Pause station</span>
					</a>
					<hr />
				</div>
				<div v-if="loggedIn">
					<a
						v-if="station.type === 'official'"
						class="sidebar-item"
						href="#"
						@click="
							openModal({
								sector: 'station',
								modal: 'addSongToQueue'
							})
						"
					>
						<span class="icon">
							<i class="material-icons">queue</i>
						</span>
						<span class="icon-purpose">Add song to queue</span>
					</a>
					<a
						v-if="!isOwner() && !noSong"
						class="sidebar-item"
						href="#"
						@click="$parent.voteSkipStation()"
					>
						<span class="icon">
							<i class="material-icons">skip_next</i>
						</span>
						<span class="skip-votes">{{
							currentSong.skipVotes
						}}</span>
						<span class="icon-purpose">Skip current song</span>
					</a>
					<a
						v-if="!noSong && !currentSong.simpleSong"
						class="sidebar-item"
						href="#"
						@click="
							openModal({
								sector: 'station',
								modal: 'report'
							})
						"
					>
						<span class="icon">
							<i class="material-icons">report</i>
						</span>
						<span class="icon-purpose">Report a song</span>
					</a>
					<a
						v-if="!noSong"
						class="sidebar-item"
						href="#"
						@click="
							openModal({
								sector: 'station',
								modal: 'addSongToPlaylist'
							})
						"
					>
						<span class="icon">
							<i class="material-icons">playlist_add</i>
						</span>
						<span class="icon-purpose"
							>Add current song to playlist</span
						>
					</a>
					<hr v-if="!noSong" />
				</div>
				<a
					v-if="
						station.partyMode === true ||
							station.type === 'official'
					"
					class="sidebar-item"
					href="#"
					@click="$parent.toggleSidebar('songslist')"
				>
					<span class="icon">
						<i class="material-icons">queue_music</i>
					</span>
					<span class="icon-purpose">Show the station queue</span>
				</a>
				<a
					class="sidebar-item"
					href="#"
					@click="$parent.toggleSidebar('users')"
				>
					<span class="icon">
						<i class="material-icons">people</i>
					</span>
					<span class="icon-purpose"
						>Display users in the station</span
					>
				</a>
				<a
					v-if="loggedIn && station.type === 'community'"
					class="sidebar-item"
					href="#"
					@click="$parent.toggleSidebar('playlist')"
				>
					<span class="icon">
						<i class="material-icons">library_music</i>
					</span>
					<span class="icon-purpose">Show your playlists</span>
				</a>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
	data() {
		return {
			title: this.$route.params.id,
			isMobile: false,
			controlBar: false,
			frontendDomain: "",
			siteSettings: {
				logo: "",
				siteName: ""
			}
		};
	},
	computed: mapState({
		loggedIn: state => state.user.auth.loggedIn,
		userId: state => state.user.auth.userId,
		username: state => state.user.auth.username,
		role: state => state.user.auth.role,
		station: state => state.station.station,
		paused: state => state.station.paused,
		noSong: state => state.station.noSong,
		currentSong: state => state.station.currentSong
	}),
	mounted() {
		lofig.get("frontendDomain", res => {
			this.frontendDomain = res;
			return res;
		});
		lofig.get("siteSettings", res => {
			this.siteSettings = res;
			return res;
		});
	},
	methods: {
		isOwner() {
			return (
				this.loggedIn &&
				(this.role === "admin" || this.userId === this.station.owner)
			);
		},
		settings() {
			this.editStation({
				_id: this.station._id,
				name: this.station.name,
				type: this.station.type,
				partyMode: this.station.partyMode,
				description: this.station.description,
				privacy: this.station.privacy,
				displayName: this.station.displayName
			});
			this.openModal({
				sector: "station",
				modal: "editStation"
			});
		},
		...mapActions("modals", ["openModal"]),
		...mapActions("station", ["editStation"]),
		...mapActions("user/auth", ["logout"])
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.nav {
	background-color: $primary-color;
	line-height: 64px;
	border-radius: 0% 0% 33% 33% / 0% 0% 7% 7%;

	.is-brand {
		font-size: 2.1rem !important;
		line-height: 38px !important;
		padding: 0 20px;
		color: $white;
		font-family: Pacifico, cursive;
		filter: brightness(0) invert(1);

		img {
			max-height: 38px;
		}
	}
}

a.nav-item {
	color: $white;
	font-size: 17px;

	&:hover {
		color: $white;
	}

	padding: 0 12px;
	.icon {
		height: 64px;
		i {
			font-size: 2rem;
			line-height: 64px;
			height: 64px;
			width: 34px;
		}
	}
}

a.nav-item.is-tab:hover {
	border-bottom: none;
	border-top: solid 1px $white;
}

.admin strong {
	color: $purple;
}

.grouped {
	margin: 0;
	display: flex;
	text-decoration: none;
}

.skip-votes {
	position: relative;
	left: 11px;
}

.nav-toggle {
	height: 64px;
}

@media screen and (max-width: 998px) {
	.nav-menu {
		background-color: $white;
		box-shadow: 0 4px 7px rgba(10, 10, 10, 0.1);
		left: 0;
		display: none;
		right: 0;
		top: 100%;
		position: absolute;
	}
	.nav-toggle {
		display: block;
	}
}

.logo {
	font-size: 2.1rem;
	line-height: 64px;
	padding-left: 20px !important;
	padding-right: 20px !important;
}

.nav-center {
	display: flex;
	align-items: center;
	color: $primary-color;
	font-size: 22px;
	position: absolute;
	margin: auto;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.nav-right.is-active .nav-item {
	background: $primary-color;
	border: 0;
}

.hidden {
	display: none;
}

.control-sidebar {
	position: fixed;
	z-index: 1;
	top: 0;
	left: 0;
	width: 64px;
	height: 100vh;
	background-color: $primary-color;
	box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16),
		0 2px 10px 0 rgba(0, 0, 0, 0.12);

	@media (max-width: 998px) {
		display: none;
	}
	.inner-wrapper {
		@media (min-width: 999px) {
			.mobile-only {
				display: none;
			}
			.desktop-only {
				display: flex;
			}
		}
		@media (max-width: 998px) {
			.mobile-only {
				display: flex;
			}
			.desktop-only {
				display: none;
				visibility: hidden;
			}
		}
	}
}

.show-controlBar {
	display: block;
}

.inner-wrapper {
	top: 64px;
	position: relative;
}

.control-sidebar .material-icons {
	width: 100%;
	font-size: 2rem;
}
.control-sidebar .sidebar-item {
	font-size: 2rem;
	height: 50px;
	color: $white;
	-webkit-box-align: center;
	-ms-flex-align: center;
	align-items: center;
	display: -webkit-box;
	display: -ms-flexbox;
	display: flex;
	-webkit-box-flex: 0;
	-ms-flex-positive: 0;
	flex-grow: 0;
	-ms-flex-negative: 0;
	flex-shrink: 0;
	-webkit-box-pack: center;
	-ms-flex-pack: center;
	justify-content: center;
	width: 100%;
	position: relative;
}
.control-sidebar .sidebar-top-hr {
	margin: 0 0 20px 0;
}

.sidebar-item .icon-purpose {
	visibility: hidden;
	width: 160px;
	font-size: 12px;
	background-color: rgba(3, 169, 244, 0.8);
	color: $white;
	text-align: center;
	border-radius: 6px;
	padding: 5px;
	position: absolute;
	z-index: 1;
	left: 115%;
	opacity: 0;
	transition: opacity 0.5s;
	display: none;
}

.sidebar-item .icon-purpose::after {
	content: "";
	position: absolute;
	top: 50%;
	right: 100%;
	margin-top: -5px;
	border-width: 5px;
	border-style: solid;
	border-color: transparent rgba(3, 169, 244, 0.8) transparent transparent;
}

.sidebar-item:hover .icon-purpose {
	visibility: visible;
	opacity: 1;
	display: block;
}
</style>
