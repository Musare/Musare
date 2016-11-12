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
		<songs v-if="currentTab == 'songs'"></songs>
		<stations v-if="currentTab == 'stations'"></stations>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue'
	import MainFooter from '../MainFooter.vue'

	import Songs from '../Admin/Songs.vue'
	import Stations from '../Admin/Stations.vue'

	export default {
		components: { MainHeader, MainFooter, Songs, Stations },
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

<style lang="scss" scoped></style>
