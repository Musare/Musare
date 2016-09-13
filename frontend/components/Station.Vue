<template>
	<div class="app">
		<component-header></component-header>
		<div class="body">
			<div class="row">
				<div class="col-md-8 push-md-2 col-sm-10 push-sm-1 col-xs-12">
					<div id="player"></div>
				</div>
				<div class="col-md-8 push-md-2 col-sm-10 push-sm-1 col-xs-12">
					<div class="row">
						<div class="col-md-8 col-sm-12 col-sm-12">

						</div>
						<img alt="Not loading" class="img-responsive col-md-4 col-xs-12 col-sm-12" onerror="this.src='/notes.png'" id="song-image" style="margin-top: 10px !important" src="https://i.scdn.co/image/32031982517529900c02654c460dc9ac6c47c598" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import ComponentHeader from './MainHeader.vue'
	import ComponentBody from './HomepageBody.vue'
	import ComponentFooter from './MainFooter.vue'

	export default {
		data() {
			return {}
		},
		components: { ComponentHeader }
	}
</script>

<style lang="sass">
	.body {
		// width: 100%;
		// line-height: 256px;
		text-align: center;
		background-color: green;
		flex: 1 0 auto;
		padding-top: 4.5vw;
		transition: all 0.1s;
		margin: 0 auto;
		max-width: 1280px;
		width: 90%;
	}

	@media only screen and (min-width: 993px) {
		.body {
			width: 70%;
		}
	}
	@media only screen and (min-width: 601px) {
		.body {
			width: 85%;
		}
	}

	.room-title {
		left: 50%;
		-webkit-transform: translateX(-50%);
		transform: translateX(-50%);
		font-size: 2.1em;
	}
</style>
