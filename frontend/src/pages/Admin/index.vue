<template>
	<div class="app">
		<main-header />
		<div class="tabs is-centered">
			<ul>
				<li
					:class="{ 'is-active': currentTab == 'unverifiedSongs' }"
					@click="showTab('unverifiedSongs')"
				>
					<router-link
						class="tab unverifiedSongs"
						to="/admin/unverifiedSongs"
					>
						<i class="material-icons">music_note</i>
						<span>&nbsp;Unverified Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'verifiedSongs' }"
					@click="showTab('verifiedSongs')"
				>
					<router-link
						class="tab verifiedSongs"
						to="/admin/verifiedSongs"
					>
						<i class="material-icons">music_note</i>
						<span>&nbsp;Verified Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'stations' }"
					@click="showTab('stations')"
				>
					<router-link class="tab stations" to="/admin/stations">
						<i class="material-icons">radio</i>
						<span>&nbsp;Stations</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'playlists' }"
					@click="showTab('playlists')"
				>
					<router-link class="tab playlists" to="/admin/playlists">
						<i class="material-icons">library_music</i>
						<span>&nbsp;Playlists</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'reports' }"
					@click="showTab('reports')"
				>
					<router-link class="tab reports" to="/admin/reports">
						<i class="material-icons">flag</i>
						<span>&nbsp;Reports</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'news' }"
					@click="showTab('news')"
				>
					<router-link class="tab news" to="/admin/news">
						<i class="material-icons">chrome_reader_mode</i>
						<span>&nbsp;News</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'users' }"
					@click="showTab('users')"
				>
					<router-link class="tab users" to="/admin/users">
						<i class="material-icons">people</i>
						<span>&nbsp;Users</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'statistics' }"
					@click="showTab('statistics')"
				>
					<router-link class="tab statistics" to="/admin/statistics">
						<i class="material-icons">show_chart</i>
						<span>&nbsp;Statistics</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'newstatistics' }"
					@click="showTab('newstatistics')"
				>
					<router-link
						class="tab newstatistics"
						to="/admin/newstatistics"
					>
						<i class="material-icons">show_chart</i>
						<span>&nbsp;New Statistics</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'punishments' }"
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

		<unverified-songs v-if="currentTab == 'unverifiedSongs'" />
		<verified-songs v-if="currentTab == 'verifiedSongs'" />
		<stations v-if="currentTab == 'stations'" />
		<playlists v-if="currentTab == 'playlists'" />
		<reports v-if="currentTab == 'reports'" />
		<news v-if="currentTab == 'news'" />
		<users v-if="currentTab == 'users'" />
		<statistics v-if="currentTab == 'statistics'" />
		<new-statistics v-if="currentTab == 'newstatistics'" />
		<punishments v-if="currentTab == 'punishments'" />
	</div>
</template>

<script>
import MainHeader from "../../components/layout/MainHeader.vue";

export default {
	components: {
		MainHeader,
		UnverifiedSongs: () => import("./tabs/UnverifiedSongs.vue"),
		VerifiedSongs: () => import("./tabs/VerifiedSongs.vue"),
		Stations: () => import("./tabs/Stations.vue"),
		Playlists: () => import("./tabs/Playlists.vue"),
		Reports: () => import("./tabs/Reports.vue"),
		News: () => import("./tabs/News.vue"),
		Users: () => import("./tabs/Users.vue"),
		Statistics: () => import("./tabs/Statistics.vue"),
		NewStatistics: () => import("./tabs/NewStatistics.vue"),
		Punishments: () => import("./tabs/Punishments.vue")
	},
	data() {
		return {
			currentTab: ""
		};
	},
	watch: {
		$route(route) {
			this.changeTab(route.path);
		}
	},
	mounted() {
		this.changeTab(this.$route.path);
	},
	methods: {
		changeTab(path) {
			switch (path) {
				case "/admin/unverifiedsongs":
					this.currentTab = "unverifiedSongs";
					break;
				case "/admin/verifiedsongs":
					this.currentTab = "verifiedSongs";
					break;
				case "/admin/stations":
					this.currentTab = "stations";
					break;
				case "/admin/playlists":
					this.currentTab = "playlists";
					break;
				case "/admin/reports":
					this.currentTab = "reports";
					break;
				case "/admin/news":
					this.currentTab = "news";
					break;
				case "/admin/users":
					this.currentTab = "users";
					break;
				case "/admin/statistics":
					this.currentTab = "statistics";
					break;
				case "/admin/newstatistics":
					this.currentTab = "newstatistics";
					break;
				case "/admin/punishments":
					this.currentTab = "punishments";
					break;
				default:
					this.currentTab = "verifiedSongs";
			}
		},
		showTab(tab) {
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
}

.tabs {
	padding-top: 10px;
	margin-top: -10px;
	background-color: var(--white);
	.unverifiedSongs {
		color: var(--teal);
		border-color: var(--teal);
	}
	.verifiedSongs {
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
	.newstatistics {
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
