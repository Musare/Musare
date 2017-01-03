<template>
	<div class='app'>
		<main-header></main-header>
		<div class='tabs is-centered'>
			<ul>
				<li :class='{ "is-active": currentTab == "queueSongs" }' @click='showTab("queueSongs")'>
					<a>
						<i class='material-icons'>queue_music</i>
						<span>&nbsp;Queue Songs</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "songs" }' @click='showTab("songs")'>
					<a>
						<i class='material-icons'>music_note</i>
						<span>&nbsp;Songs</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "stations" }' @click='showTab("stations")'>
					<a>
						<i class='material-icons'>hearing</i>
						<span>&nbsp;Stations</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "reports" }' @click='showTab("reports")'>
					<a>
						<i class="material-icons">report_problem</i>
						<span>&nbsp;Reports</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "news" }' @click='showTab("news")'>
					<a>
						<i class="material-icons">chrome_reader_mode</i>
						<span>&nbsp;News</span>
					</a>
				</li>
				<li :class='{ "is-active": currentTab == "users" }' @click='showTab("users")'>
					<a>
						<i class="material-icons">person</i>
						<span>&nbsp;Users</span>
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

	export default {
		components: {
			MainHeader,
			MainFooter,
			QueueSongs,
			Songs,
			Stations,
			Reports,
			News,
			Users
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
