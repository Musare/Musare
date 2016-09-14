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
							<h4 id="time-display"><span id="time-elapsed">2:58</span> / <span id="time-total">3:19</span></h4>
							<h3>Stitches</h3>
							<h4 class="thin" style="margin-left: 0">Shawn Mendes</h4>
							<div class="row">
								<form style="margin-top: 12px; margin-bottom: 0;" action="#" class="col-md-4 col-lg-4 col-xs-4 col-sm-4">
									<p style="margin-top: 0; position: relative;">
										<input type="range" id="volume_slider" min="0" max="100" class="active">
									</p>
								</form>
								<div class="col-xs-8 col-sm-5 col-md-5" style="float: right;">
									<ul id="ratings">
										<li id="like" class="right"><span class="flow-text">2 </span> <i id="thumbs_up" class="material-icons grey-text">thumb_up</i></li>
										<li style="margin-right: 10px;" id="dislike" class="right"><span class="flow-text">1 </span><i id="thumbs_down" class="material-icons grey-text">thumb_down</i></li>
									</ul>
								</div>
							</div>
							<div class="seeker-bar-container white" id="preview-progress">
								<div class="seeker-bar light-blue" style="width: 60.9869%;"></div>
							</div>
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
		/*width: 100%;
        line-height: 256px;*/
		flex: 1 0 auto;
		padding-top: 4.5vw;
		transition: all 0.1s;
		margin: 0 auto;
		max-width: 1280px;
		width: 90%;
		color: black;
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

	#ratings span {
		font-size: 1.68rem;
	}

	#ratings i {
		color: #9e9e9e !important;
		cursor: pointer;
		transition: 0.1s color;
	}

	#time-display {
		margin-top: 30px;
		float: right;
	}

	#thumbs_up:hover {
		color: #00bfa5 !important;
	}

	#thumbs_down:hover {
		color: #e53935 !important;
	}

	.seeker-bar-container {
		position: relative;
		height: 5px;
		display: block;
		width: 100%;
		overflow: hidden;
	}

	.seeker-bar {
		top: 0;
		left: 0;
		bottom: 0;
		position: absolute;
	}
</style>
