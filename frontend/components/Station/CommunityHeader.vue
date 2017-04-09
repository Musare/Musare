<template>
	<nav class='nav'>
		<div class='nav-left'>
			<a class='nav-item is-brand' href='#' v-link='{ path: "/" }' @click='this.$dispatch("leaveStation", title)'>
				Musare
			</a>
		</div>

		<div class='nav-center stationDisplayName'>
			{{$parent.station.displayName}}
		</div>

		<span class="nav-toggle" @click="controlBar = !controlBar">
			<span></span>
			<span></span>
			<span></span>
		</span>

		<div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
			<a class="nav-item is-tab admin" href="#" v-link="{ path: '/admin' }" v-if="$parent.$parent.role === 'admin'">
				<strong>Admin</strong>
			</a>
			<!--a class="nav-item is-tab" href="#">
				About
			</a-->
			<a class="nav-item is-tab" href="#" v-link="{ path: '/team' }">
				Team
			</a>
			<a class="nav-item is-tab" href="#" v-link="{ path: '/about' }">
				About
			</a>
			<a class="nav-item is-tab" href="#" v-link="{ path: '/news' }">
				News
			</a>
			<span class="grouped" v-if="$parent.$parent.loggedIn">
				<a class="nav-item is-tab" href="#" v-link="{ path: '/u/' + $parent.$parent.username }">
					Profile
				</a>
				<a class="nav-item is-tab" href="#" v-link="{ path: '/settings' }">
					Settings
				</a>
				<a class="nav-item is-tab" href="#" @click="$parent.$parent.logout()">
					Logout
				</a>
			</span>
			<span class="grouped" v-else>
				<a class="nav-item" href="#" @click="toggleModal('login')">
					Login
				</a>
				<a class="nav-item" href="#" @click="toggleModal('register')">
					Register
				</a>
			</span>
		</div>

	</nav>
	<div class="control-sidebar" :class="{ 'show-controlBar': controlBar }">
		<div class='inner-wrapper'>
			<div v-if='isOwner()'>
				<a class="sidebar-item" href='#' v-if='isOwner()' @click='$parent.editStation()'>
					<span class='icon'>
						<i class='material-icons'>settings</i>
					</span>
					<span class="icon-purpose">Station settings</span>
				</a>
				<a v-if='isOwner()' class="sidebar-item" href='#' @click='$parent.skipStation()'>
					<span class='icon'>
						<i class='material-icons'>skip_next</i>
					</span>
					<span class="icon-purpose">Skip current song</span>
				</a>
				<a class="sidebar-item" href='#' v-if='isOwner() && $parent.paused' @click='$parent.resumeStation()'>
					<span class='icon'>
						<i class='material-icons'>play_arrow</i>
					</span>
					<span class="icon-purpose">Resume station</span>
				</a>
				<a class="sidebar-item" href='#' v-if='isOwner() && !$parent.paused' @click='$parent.pauseStation()'>
					<span class='icon'>
						<i class='material-icons'>pause</i>
					</span>
					<span class="icon-purpose">Pause station</span>
				</a>
				<hr>
			</div>
			<div v-if="$parent.$parent.loggedIn && !$parent.noSong">
				<a v-if='!isOwner() && $parent.$parent.loggedIn && !$parent.noSong' class="sidebar-item" href='#' @click='$parent.voteSkipStation()'>
					<span class='icon'>
						<i class='material-icons'>skip_next</i>
					</span>
					<span class="skip-votes">{{ $parent.currentSong.skipVotes }}</span>
					<span class="icon-purpose">Skip current song</span>
				</a>
				<a v-if='$parent.$parent.loggedIn && !$parent.noSong' class="sidebar-item" href='#' @click='$parent.modals.addSongToPlaylist = true'>
					<span class='icon'>
						<i class='material-icons'>playlist_add</i>
					</span>
					<span class="icon-purpose">Add current song to playlist</span>
				</a>
				<hr>
			</div>
			<a class="sidebar-item" href='#' @click='$parent.toggleSidebar("songslist")'>
				<span class='icon'>
					<i class='material-icons'>queue_music</i>
				</span>
				<span class="icon-purpose">Show the station queue</span>
			</a>
			<a class="sidebar-item" href='#' @click='$parent.toggleSidebar("users")'>
				<span class='icon'>
					<i class='material-icons'>people</i>
				</span>
				<span class="icon-purpose">Display users in the station</span>
			</a>
			<a class="sidebar-item" href='#' @click='$parent.toggleSidebar("playlist")' v-if='$parent.$parent.loggedIn'>
				<span class='icon'>
					<i class='material-icons'>library_music</i>
				</span>
				<span class="icon-purpose">Show your playlists</span>
			</a>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				title: this.$route.params.id,
				isMobile: false,
				controlBar: true
			}
		},
		methods: {
			isOwner: function () {
				return this.$parent.$parent.loggedIn && (this.$parent.$parent.role === 'admin' || this.$parent.$parent.userId === this.$parent.station.owner);
			},
			toggleModal: function (type) {
				this.$dispatch('toggleModal', type);
			}
		}
	}
</script>

<style lang='scss' scoped>
	@import 'theme.scss';
	.nav {
		background-color: #03a9f4;
		line-height: 64px;

		.is-brand {
			font-size: 2.1rem !important;
			line-height: 64px !important;
			padding: 0 20px;
		}
	}

	a.nav-item {
		color: $white;
		font-size: 15px;

		&:hover {
			color: $white;
		}

		.admin {
			color: #424242;
		}

		padding: 0 18px;
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
		    background-color: white;
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
		color: $blue;
		font-size: 22px;
		position: absolute;
		margin: auto;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.nav-right.is-active .nav-item {
		background: #03a9f4;
    	border: 0;
	}

	.control-sidebar {
		position: fixed;
		z-index: 1;
		top: 0;
		left: 0;
		width: 64px;
		height: 100vh;
		background-color: #03a9f4;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);

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
		color: white;
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
		background-color: rgba(3, 169, 244,0.8);
		color: #fff;
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
	    border-color: transparent rgba(3, 169, 244,0.8) transparent transparent;
	}

	.sidebar-item:hover .icon-purpose {
		visibility: visible;
		opacity: 1;
		display: block;
	}
</style>
