<template>
	<div class="app">
		<main-header></main-header>
		<div class="tabs is-centered">
			<ul>
				<li :class="{ 'is-active': currentTab == 'queueSongs' }" @click="showTab('queueSongs')">
					<a>
						<span class="icon is-small"><i class="fa fa-music"></i></span>
						<span>Queue Songs</span>
					</a>
				</li>
				<li :class="{ 'is-active': currentTab == 'stations' }" @click="showTab('stations')">
					<a>
						<span class="icon is-small"><i class="fa fa-headphones"></i></span>
						<span>Stations</span>
					</a>
				</li>
			</ul>
		</div>
		<queue-songs v-if="currentTab == 'queueSongs'"></queue-songs>
		<stations v-if="currentTab == 'stations'"></stations>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue'
	import MainFooter from '../MainFooter.vue'

	import QueueSongs from '../Admin/QueueSongs.vue'
	import Stations from '../Admin/Stations.vue'

	export default {
		components: { MainHeader, MainFooter, QueueSongs, Stations },
		data() {
			return {
				currentTab: 'queueSongs'
			}
		},
		methods: {
			showTab: function(tab) {
				this.currentTab = tab;
			}
		}
	}
</script>

<style lang="scss" scoped></style>
