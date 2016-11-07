<template>
	<div class="app">
		<main-header></main-header>
		<div class="tabs is-centered">
			<ul>
				<li :class="{ 'is-active': currentTab == 'songs' }" @click="showTab('songs')">
					<a>
						<span class="icon is-small"><i class="fa fa-music"></i></span>
						<span>Songs</span>
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
		<admin-songs v-if="currentTab == 'songs'"></admin-songs>
		<admin-stations v-if="currentTab == 'stations'"></admin-stations>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue'
	import MainFooter from '../MainFooter.vue'

	import AdminSongs from '../AdminSongs.vue'
	import AdminStations from '../AdminStations.vue'

	export default {
		components: { MainHeader, MainFooter, AdminSongs, AdminStations },
		data() {
			return {
				currentTab: 'songs'
			}
		},
		methods: {
			showTab: function(tab) {
				this.currentTab = tab;
			}
		}
	}
</script>

<style lang="sass" scoped></style>
