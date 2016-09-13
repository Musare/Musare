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
	import ComponentHeader from './MusareHeader.vue'
	import ComponentBody from './MusareBody.vue'
	import ComponentFooter from './MusareFooter.vue'

	export default {
		data() {
			return {}
		},
		components: { ComponentHeader }
	}
</script>

<style lang="sass">
	* { box-sizing: border-box; font-family: Roboto, sans-serif; }
	html {
		width: 100%;
		height: 100%;
		body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
		}
	}


	.body {
		/*width: 100%;
		line-height: 256px;
		text-align: center;*/
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
</style>
