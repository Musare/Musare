<template>
	<div class="app">
		<main-header />
		<div class="tabs is-centered">
			<ul>
				<li
					:class="{ 'is-active': currentTab == 'hiddensongs' }"
					ref="hiddensongs-tab"
					@click="showTab('hiddensongs')"
				>
					<router-link
						class="tab hiddensongs"
						to="/admin/hiddensongs"
					>
						<i class="material-icons">music_note</i>
						<span>&nbsp;Hidden Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'unverifiedsongs' }"
					ref="unverifiedsongs-tab"
					@click="showTab('unverifiedsongs')"
				>
					<router-link
						class="tab unverifiedsongs"
						to="/admin/unverifiedsongs"
					>
						<i class="material-icons">unpublished</i>
						<span>&nbsp;Unverified Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'verifiedsongs' }"
					ref="verifiedsongs-tab"
					@click="showTab('verifiedsongs')"
				>
					<router-link
						class="tab verifiedsongs"
						to="/admin/verifiedsongs"
					>
						<i class="material-icons">check_circle</i>
						<span>&nbsp;Verified Songs</span>
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

		<div class="admin-container">
			<unverified-songs v-if="currentTab == 'unverifiedsongs'" />
			<verified-songs v-if="currentTab == 'verifiedsongs'" />
			<hidden-songs v-if="currentTab == 'hiddensongs'" />
			<stations v-if="currentTab == 'stations'" />
			<playlists v-if="currentTab == 'playlists'" />
			<reports v-if="currentTab == 'reports'" />
			<news v-if="currentTab == 'news'" />
			<users v-if="currentTab == 'users'" />
			<statistics v-if="currentTab == 'statistics'" />
			<punishments v-if="currentTab == 'punishments'" />
		</div>

		<main-footer />
	</div>
</template>

<script>
import { mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";

import MainHeader from "@/components/layout/MainHeader.vue";
import MainFooter from "@/components/layout/MainFooter.vue";

export default {
	components: {
		MainHeader,
		MainFooter,
		UnverifiedSongs: defineAsyncComponent(() =>
			import("./tabs/UnverifiedSongs.vue")
		),
		VerifiedSongs: defineAsyncComponent(() =>
			import("./tabs/VerifiedSongs.vue")
		),
		HiddenSongs: defineAsyncComponent(() =>
			import("./tabs/HiddenSongs.vue")
		),
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
		this.socket.dispatch("apis.leaveRooms", () => {});
	},
	methods: {
		changeTab(path) {
			switch (path) {
				case "/admin/unverifiedsongs":
					this.showTab("unverifiedsongs");
					break;
				case "/admin/verifiedsongs":
					this.showTab("verifiedsongs");
					break;
				case "/admin/hiddensongs":
					this.showTab("hiddensongs");
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
					this.showTab("verifiedsongs");
			}
		},
		showTab(tab) {
			if (this.$refs[`${tab}-tab`])
				this.$refs[`${tab}-tab`].scrollIntoView({
					inline: "center"
				});
			this.currentTab = tab;
		}
	}
};
</script>

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

.main-container {
	height: auto;
	.admin-container {
		flex: 1 0 auto;
		margin-bottom: 10px;
	}
}

.tabs {
	padding-top: 10px;
	margin-top: -10px;
	background-color: var(--white);
	.unverifiedsongs {
		color: var(--teal);
		border-color: var(--teal);
	}
	.verifiedsongs {
		color: var(--primary-color);
		border-color: var(--primary-color);
	}
	.hiddensongs {
		color: var(--grey);
		border-color: var(--grey);
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
</style>
