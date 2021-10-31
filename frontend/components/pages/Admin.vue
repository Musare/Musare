<template>
	<div class="app">
		<main-header />
		<div class="tabs is-centered">
			<ul>
				<li
					:class="{ 'is-active': currentTab == 'queueSongs' }"
					@click="showTab('queueSongs')"
				>
					<router-link class="tab queueSongs" to="/admin/queuesongs">
						<i class="material-icons">queue_music</i>
						<span>&nbsp;Queue Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'songs' }"
					@click="showTab('songs')"
				>
					<router-link class="tab songs" to="/admin/songs">
						<i class="material-icons">music_note</i>
						<span>&nbsp;Songs</span>
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
					:class="{ 'is-active': currentTab == 'reports' }"
					@click="showTab('reports')"
				>
					<router-link class="tab reports" to="/admin/reports">
						<i class="material-icons">report_problem</i>
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

		<queue-songs v-if="currentTab == 'queueSongs'" />
		<songs v-if="currentTab == 'songs'" />
		<stations v-if="currentTab == 'stations'" />
		<reports v-if="currentTab == 'reports'" />
		<news v-if="currentTab == 'news'" />
		<users v-if="currentTab == 'users'" />
		<statistics v-if="currentTab == 'statistics'" />
		<punishments v-if="currentTab == 'punishments'" />
	</div>
</template>

<script>
import MainHeader from "../MainHeader.vue";

export default {
	components: {
		MainHeader,
		QueueSongs: () => import("../Admin/QueueSongs.vue"),
		Songs: () => import("../Admin/Songs.vue"),
		Stations: () => import("../Admin/Stations.vue"),
		Reports: () => import("../Admin/Reports.vue"),
		News: () => import("../Admin/News.vue"),
		Users: () => import("../Admin/Users.vue"),
		Statistics: () => import("../Admin/Statistics.vue"),
		Punishments: () => import("../Admin/Punishments.vue")
	},
	data() {
		return {
			currentTab: "queueSongs"
		};
	},
	mounted() {
		this.changeTab(this.$route.path);
	},
	watch: {
		$route(route) {
			this.changeTab(route.path);
		}
	},
	methods: {
		changeTab(path) {
			switch (path) {
				case "/admin/queuesongs":
					this.currentTab = "queueSongs";
					break;
				case "/admin/songs":
					this.currentTab = "songs";
					break;
				case "/admin/stations":
					this.currentTab = "stations";
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
				case "/admin/punishments":
					this.currentTab = "punishments";
					break;
				default:
					this.currentTab = "queueSongs";
			}
		},
		showTab(tab) {
			this.currentTab = tab;
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.tabs {
	background-color: $white;
	.queueSongs {
		color: $teal;
		border-color: $teal;
	}
	.songs {
		color: $primary-color;
		border-color: $primary-color;
	}
	.stations {
		color: $purple;
		border-color: $purple;
	}
	.reports {
		color: $yellow;
		border-color: $yellow;
	}
	.news {
		color: $light-pink;
		border-color: $light-pink;
	}
	.users {
		color: $dark-pink;
		border-color: $dark-pink;
	}
	.statistics {
		color: $light-orange;
		border-color: $light-orange;
	}
	.punishments {
		color: $dark-orange;
		border-color: $dark-orange;
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
