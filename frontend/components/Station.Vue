<template>
	<div class="app">
		<header>
			<div class="header-inner">
				<div class="link left"><i class="material-icons">home</i></div>
				<div class="link left"><i class="material-icons">playlist_add</i></div>
				<div class="link left"><i class="material-icons">flag</i></div>
				<div class="link left"><i class="material-icons">skip_next</i></div>
				<span class="room-title">Pop</span>
				<div class="link right"><i class="material-icons">queue_music</i></div>
				<div class="link right"><i class="material-icons">chat</i></div>
				<div class="link right"><i class="material-icons">people</i></div>
			</div>
		</header>
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
	// TODO: Implement these files
	import ComponentHeader from './MusareHeader.vue'
	import ComponentBody from './MusareBody.vue'
	import ComponentFooter from './MusareFooter.vue'

	export default {
		data() {
			return {}
		},
		components: { }
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


	header {
		width: 100%;
		height: 64px;
		line-height: 64px;
		text-align: center;
		box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.16), 0 2px 10px 0 rgba(0, 0, 0, 0.12);
	}

	.header-inner {
		width: 100%;
		height: 100%;
		background-color: #0091ea;
		.title {
			font-weight: 300;
			font-size: 32px;
		}

		* {
			color: white;
		}

		.link {
			z-index: 101;
			position: relative;
			padding: 0 16px 0 16px;
			cursor: pointer;

			height: 64px;
			min-width: 64px;
			line-height: 64px;
			font-size: 2rem;
			transition: background-color .3s;
		}

		.link:hover {
			background-color: rgba(0, 0, 0, 0.1);
		}

		.right {
			float: right;
		}

		.left {
			float: left;
		}

		i.material-icons {
			display: block;
			font-size: 2rem;
			line-height: 64px;
			height: 64px;
		}

		.room-title {
			left: 50%;
			-webkit-transform: translateX(-50%);
			transform: translateX(-50%);
			font-size: 2.1em;
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
