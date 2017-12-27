<template>
	<div class='app'>
		<main-header></main-header>
		<div class='tabs is-centered'>
			<ul>
				<li :class='{ "is-active": currentTab == "queueSongs" }' @click='showTab("queueSongs")'>
					<a v-link="{ path: '/admin/queuesongs' }">
						<i class='material-icons'>queue_music</i>
						<span>&nbsp;Queue Songs</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "songs" }' @click='showTab("songs")'>
					<a v-link="{ path: '/admin/songs' }">
						<i class='material-icons'>music_note</i>
						<span>&nbsp;Songs</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "stations" }' @click='showTab("stations")'>
					<a v-link="{ path: '/admin/stations' }">
						<i class='material-icons'>hearing</i>
						<span>&nbsp;Stations</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "reports" }' @click='showTab("reports")'>
					<a v-link="{ path: '/admin/reports' }">
						<i class="material-icons">report_problem</i>
						<span>&nbsp;Reports</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "news" }' @click='showTab("news")'>
					<a v-link="{ path: '/admin/news' }">
						<i class="material-icons">chrome_reader_mode</i>
						<span>&nbsp;News</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "users" }' @click='showTab("users")'>
					<a v-link="{ path: '/admin/users' }">
						<i class="material-icons">person</i>
						<span>&nbsp;Users</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "statistics" }' @click='showTab("statistics")'>
					<a v-link="{ path: '/admin/statistics' }">
						<i class="material-icons">show_chart</i>
						<span>&nbsp;Statistics</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "punishments" }' @click='showTab("punishments")'>
					<a v-link="{ path: '/admin/punishments' }">
						<i class="material-icons">gavel</i>
						<span>&nbsp;Punishments</span>
					</a>
				</li>
			</ul>
		</div>

		<queue-songs v-if='currentTab == "queueSongs"'></queue-songs>
		<songs v-if='currentTab == "songs"'></songs>
		<stations v-if='currentTab == "stations"'></stations>
		<reports v-if='currentTab == "reports"'></reports>
		<news v-if='currentTab == "news"'></news>
		<users v-if='currentTab == "users"'></users>
		<statistics v-if='currentTab == "statistics"'></statistics>
		<punishments v-if='currentTab == "punishments"'></punishments>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	import QueueSongs from '../Admin/QueueSongs.vue';
	import Songs from '../Admin/Songs.vue';
	import Stations from '../Admin/Stations.vue';
	import Reports from '../Admin/Reports.vue';
	import News from '../Admin/News.vue';
	import Users from '../Admin/Users.vue';
	import Statistics from '../Admin/Statistics.vue';
	import Punishments from '../Admin/Punishments.vue';

	export default {
		components: {
			MainHeader,
			MainFooter,
			QueueSongs,
			Songs,
			Stations,
			Reports,
			News,
			Users,
			Statistics,
			Punishments
		},
		ready() {
			switch(window.location.pathname) {
				case '/admin/queuesongs':
					this.currentTab = 'queueSongs';
					break;
				case '/admin/songs':
					this.currentTab = 'songs';
					break;
				case '/admin/stations':
					this.currentTab = 'stations';
					break;
				case '/admin/reports':
					this.currentTab = 'reports';
					break;
				case '/admin/news':
					this.currentTab = 'news';
					break;
				case '/admin/users':
					this.currentTab = 'users';
					break;
				case '/admin/statistics':
					this.currentTab = 'statistics';
					break;
				case '/admin/punishments':
					this.currentTab = 'punishments';
					break;
				default:
					this.currentTab = 'queueSongs';
			}
		},
		data() {
			return {
				currentTab: 'queueSongs'
			}
		},
		methods: {
			showTab: function (tab) {
				this.currentTab = tab;
			}
		}
	}
</script>

<style lang='scss' scoped>
	.is-active a {
		color: #03a9f4 !important;
		border-color: #03a9f4 !important;
	}
</style>
