<template>
	<div class="app admin-area">
		<main-header />
		<div class="tabs is-centered">
			<ul>
				<li
					:class="{ 'is-active': currentTab == 'test' }"
					ref="test-tab"
					@click="showTab('test')"
				>
					<router-link class="tab test" to="/admin/test">
						<i class="material-icons">music_note</i>
						<span>&nbsp;Test</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'songs' }"
					ref="songs-tab"
					@click="showTab('songs')"
				>
					<router-link class="tab songs" to="/admin/songs">
						<i class="material-icons">music_note</i>
						<span>&nbsp;Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'stations' }"
					ref="stations-tab"
					@click="showTab('stations')"
				>
					<router-link class="tab stations" to="/admin/stations">
						<i class="material-icons">radio</i>
						<span>&nbsp;Stations</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'playlists' }"
					ref="playlists-tab"
					@click="showTab('playlists')"
				>
					<router-link class="tab playlists" to="/admin/playlists">
						<i class="material-icons">library_music</i>
						<span>&nbsp;Playlists</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'reports' }"
					ref="reports-tab"
					@click="showTab('reports')"
				>
					<router-link class="tab reports" to="/admin/reports">
						<i class="material-icons">flag</i>
						<span>&nbsp;Reports</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'news' }"
					ref="news-tab"
					@click="showTab('news')"
				>
					<router-link class="tab news" to="/admin/news">
						<i class="material-icons">chrome_reader_mode</i>
						<span>&nbsp;News</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'users' }"
					ref="users-tab"
					@click="showTab('users')"
				>
					<router-link class="tab users" to="/admin/users">
						<i class="material-icons">people</i>
						<span>&nbsp;Users</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'statistics' }"
					ref="statistics-tab"
					@click="showTab('statistics')"
				>
					<router-link class="tab statistics" to="/admin/statistics">
						<i class="material-icons">show_chart</i>
						<span>&nbsp;Statistics</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'punishments' }"
					ref="punishments-tab"
					@click="showTab('punishments')"
				>
					<router-link
						class="tab punishments"
						to="/admin/punishments"
					>
						<i class="material-icons">gavel</i>
						<span>&nbsp;Punishments</span>
					</router-link>
				</li>
			</ul>
		</div>

		<test v-if="currentTab == 'test'" />
		<songs v-if="currentTab == 'songs'" />
		<stations v-if="currentTab == 'stations'" />
		<playlists v-if="currentTab == 'playlists'" />
		<reports v-if="currentTab == 'reports'" />
		<news v-if="currentTab == 'news'" />
		<users v-if="currentTab == 'users'" />
		<statistics v-if="currentTab == 'statistics'" />
		<punishments v-if="currentTab == 'punishments'" />
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import MainHeader from "@/components/layout/MainHeader.vue";

export default {
	components: {
		MainHeader,
		Test: defineAsyncComponent(() => import("./tabs/Test.vue")),
		Songs: defineAsyncComponent(() => import("./tabs/Songs.vue")),
		Stations: defineAsyncComponent(() => import("./tabs/Stations.vue")),
		Playlists: defineAsyncComponent(() => import("./tabs/Playlists.vue")),
		Reports: defineAsyncComponent(() => import("./tabs/Reports.vue")),
		News: defineAsyncComponent(() => import("./tabs/News.vue")),
		Users: defineAsyncComponent(() => import("./tabs/Users.vue")),
		Statistics: defineAsyncComponent(() => import("./tabs/Statistics.vue")),
		Punishments: defineAsyncComponent(() =>
			import("./tabs/Punishments.vue")
		)
	},
	data() {
		return {
			currentTab: ""
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	watch: {
		$route(route) {
			this.changeTab(route.path);
		}
	},
	mounted() {
		this.changeTab(this.$route.path);
	},
	beforeUnmount() {
		this.socket.dispatch("apis.leaveRooms");
	},
	methods: {
		changeTab(path) {
			switch (path) {
				case "/admin/test":
					this.showTab("test");
					break;
				case "/admin/songs":
					this.showTab("songs");
					break;
				case "/admin/stations":
					this.showTab("stations");
					break;
				case "/admin/playlists":
					this.showTab("playlists");
					break;
				case "/admin/reports":
					this.showTab("reports");
					break;
				case "/admin/news":
					this.showTab("news");
					break;
				case "/admin/users":
					this.showTab("users");
					break;
				case "/admin/statistics":
					this.showTab("statistics");
					break;
				case "/admin/punishments":
					this.showTab("punishments");
					break;
				default:
					if (path.startsWith("/admin")) {
						if (localStorage.getItem("lastAdminPage")) {
							this.$router.push(
								`/admin/${localStorage.getItem(
									"lastAdminPage"
								)}`
							);
						} else {
							this.$router.push(`/admin/songs`);
						}
					}
			}
		},
		showTab(tab) {
			if (this.$refs[`${tab}-tab`])
				this.$refs[`${tab}-tab`].scrollIntoView({
					inline: "center",
					block: "nearest"
				});
			this.currentTab = tab;
			localStorage.setItem("lastAdminPage", tab);
		}
	}
};
</script>

<style lang="scss">
.christmas-mode .admin-area .christmas-lights {
	top: 102px !important;
}

.main-container .container {
	.button-row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		margin-bottom: 5px;

		& > .button,
		& > span {
			margin: 5px 0;
			&:not(:first-child) {
				margin-left: 5px;
			}
		}
	}
}
</style>

<style lang="scss" scoped>
.night-mode {
	.tabs {
		background-color: var(--dark-grey-2);
		border: 0;

		ul {
			border-bottom: 0;
		}
	}
}

/deep/ .container {
	position: relative;
}

/deep/ .box {
	box-shadow: 0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1);
	display: block;

	&:not(:last-child) {
		margin-bottom: 20px;
	}
}

.main-container {
	height: auto;
}

.tabs {
	padding-top: 10px;
	margin-top: -10px;
	background-color: var(--white);
	display: flex;
	line-height: 24px;
	overflow-y: hidden;
	overflow-x: auto;
	margin-bottom: 20px;
	user-select: none;

	ul {
		display: flex;
		align-items: center;
		/* -webkit-box-flex: 1; */
		flex-grow: 1;
		flex-shrink: 0;
		justify-content: center;
		border-bottom: 1px solid var(--light-grey-2);
	}

	.songs {
		color: var(--primary-color);
		border-color: var(--primary-color);
	}
	.stations {
		color: var(--purple);
		border-color: var(--purple);
	}
	.playlists {
		color: var(--light-purple);
		border-color: var(--light-purple);
	}
	.reports {
		color: var(--yellow);
		border-color: var(--yellow);
	}
	.news {
		color: var(--light-pink);
		border-color: var(--light-pink);
	}
	.users {
		color: var(--dark-pink);
		border-color: var(--dark-pink);
	}
	.statistics {
		color: var(--orange);
		border-color: var(--orange);
	}
	.punishments {
		color: var(--dark-orange);
		border-color: var(--dark-orange);
	}
	.tab {
		transition: all 0.2s ease-in-out;
		font-weight: 500;
		border-bottom: solid 0px;
		padding: 6px 12px;
		display: flex;
		margin-bottom: -1px;
	}
	.tab:hover {
		border-width: 3px;
		transition: all 0.2s ease-in-out;
		font-weight: 600;
	}
	.is-active .tab {
		font-weight: 600;
		border-width: 3px;
	}
}

@media screen and (min-width: 980px) {
	/deep/ .container {
		margin: 0 auto;
		max-width: 960px;
	}
}

@media screen and (min-width: 1180px) {
	/deep/ .container {
		max-width: 1200px;
	}
}
</style>
