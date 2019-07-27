<template>
	<div class="app">
		<main-header />
		<div class="tabs is-centered">
			<ul>
				<li
					:class="{ 'is-active': currentTab == 'queueSongs' }"
					@click="showTab('queueSongs')"
				>
					<router-link to="/admin/queuesongs">
						<i class="material-icons">queue_music</i>
						<span>&nbsp;Queue Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'songs' }"
					@click="showTab('songs')"
				>
					<router-link to="/admin/songs">
						<i class="material-icons">music_note</i>
						<span>&nbsp;Songs</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'stations' }"
					@click="showTab('stations')"
				>
					<router-link to="/admin/stations">
						<i class="material-icons">hearing</i>
						<span>&nbsp;Stations</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'reports' }"
					@click="showTab('reports')"
				>
					<router-link to="/admin/reports">
						<i class="material-icons">report_problem</i>
						<span>&nbsp;Reports</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'news' }"
					@click="showTab('news')"
				>
					<router-link to="/admin/news">
						<i class="material-icons">chrome_reader_mode</i>
						<span>&nbsp;News</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'users' }"
					@click="showTab('users')"
				>
					<router-link to="/admin/users">
						<i class="material-icons">person</i>
						<span>&nbsp;Users</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'statistics' }"
					@click="showTab('statistics')"
				>
					<router-link to="/admin/statistics">
						<i class="material-icons">show_chart</i>
						<span>&nbsp;Statistics</span>
					</router-link>
				</li>
				<li
					:class="{ 'is-active': currentTab == 'punishments' }"
					@click="showTab('punishments')"
				>
					<router-link to="/admin/punishments">
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

import QueueSongs from "../Admin/QueueSongs.vue";
import Songs from "../Admin/Songs.vue";
import Stations from "../Admin/Stations.vue";
import Reports from "../Admin/Reports.vue";
import News from "../Admin/News.vue";
import Users from "../Admin/Users.vue";
import Statistics from "../Admin/Statistics.vue";
import Punishments from "../Admin/Punishments.vue";

export default {
	components: {
		MainHeader,
		QueueSongs,
		Songs,
		Stations,
		Reports,
		News,
		Users,
		Statistics,
		Punishments
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
		changeTab: function(path) {
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
		showTab: function(tab) {
			this.currentTab = tab;
		}
	}
};
</script>

<style lang="scss" scoped>
.is-active a {
	color: #03a9f4 !important;
	border-color: #03a9f4 !important;
}
</style>
