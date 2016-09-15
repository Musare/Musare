<template>
	<div class="station">
		<div class="row">
			<div class="col-md-8 col-md-push-2 col-sm-10 col-sm-push-1 col-xs-12">
				<div class="video-container">
					<!--div id="player"></div-->
					<iframe id="player" frameborder="0" allowfullscreen="1" title="YouTube video player" width="480" height="270" src="https://www.youtube.com/embed/xo1VInw-SKc?controls=0&amp;iv_load_policy=3&amp;rel=0&amp;showinfo=0&amp;enablejsapi=1&amp;origin=https%3A%2F%2Fmusare.com&amp;widgetid=1" kwframeid="1"></iframe>
				</div>
			</div>
			<div class="col-md-8 col-md-push-2 col-sm-10 col-sm-push-1 col-xs-12">
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
</template>

<style lang="sass">
	.station {
		flex: 1 0 auto;
		padding-top: 4.5vw;
		transition: all 0.1s;
		margin: 0 auto;
		max-width: 1280px;
		width: 90%;

		@media only screen and (min-width: 993px) {
			width: 70%;
		}

		@media only screen and (min-width: 601px) {
			width: 85%;
		}

		input[type=range] {
			-webkit-appearance: none;
			width: 100%;
			margin: 7.3px 0;
		}

		input[type=range]:focus {
			outline: none;
		}

		input[type=range]::-webkit-slider-runnable-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: #c2c0c2;
			border-radius: 0;
			border: 0;
		}

		input[type=range]::-webkit-slider-thumb {
			box-shadow: 0;
			border: 0;
			height: 19px;
			width: 19px;
			border-radius: 15px;
			background: #03a9f4;
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6.5px;
		}

		input[type=range]::-moz-range-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: #c2c0c2;
			border-radius: 0;
			border: 0;
		}

		input[type=range]::-moz-range-thumb {
			box-shadow: 0;
			border: 0;
			height: 19px;
			width: 19px;
			border-radius: 15px;
			background: #03a9f4;
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6.5px;
		}

		input[type=range]::-ms-track {
			width: 100%;
			height: 5.2px;
			cursor: pointer;
			box-shadow: 0;
			background: #c2c0c2;
			border-radius: 1.3px;
		}

		input[type=range]::-ms-fill-lower {
			background: #c2c0c2;
			border: 0;
			border-radius: 0;
			box-shadow: 0;
		}

		input[type=range]::-ms-fill-upper {
			background: #c2c0c2;
			border: 0;
			border-radius: 0;
			box-shadow: 0;
		}

		input[type=range]::-ms-thumb {
			box-shadow: 0;
			border: 0;
			height: 15px;
			width: 15px;
			border-radius: 15px;
			background: #03a9f4;
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: 1.5px;
		}

		.video-container {
			position: relative;
			padding-bottom: 56.25%;
			height: 0;
			overflow: hidden;

			iframe {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
			}
		}
	}

	.room-title {
		left: 50%;
		-webkit-transform: translateX(-50%);
		transform: translateX(-50%);
		font-size: 2.1em;
	}

	#ratings {
		span {
			font-size: 1.68rem;
		}

		i {
			color: #9e9e9e !important;
			cursor: pointer;
			transition: 0.1s color;
		}
	}

	#time-display {
		margin-top: 30px;
		float: right;
	}

	#thumbs_up:hover {
		color: #87D37C !important;
	}

	#thumbs_down:hover {
		color: #EC644B !important;
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

	ul {
		list-style: none;
		margin: 0;
		display: block;
	}

	h1, h2, h3, h4, h5, h6 {
		font-weight: 400;
		line-height: 1.1;
	}

	h1 a, h2 a, h3 a, h4 a, h5 a, h6 a {
		font-weight: inherit;
	}

	h1 {
		font-size: 4.2rem;
		line-height: 110%;
		margin: 2.1rem 0 1.68rem 0;
	}

	h2 {
		font-size: 3.56rem;
		line-height: 110%;
		margin: 1.78rem 0 1.424rem 0;
	}

	h3 {
		font-size: 2.92rem;
		line-height: 110%;
		margin: 1.46rem 0 1.168rem 0;
	}

	h4 {
		font-size: 2.28rem;
		line-height: 110%;
		margin: 1.14rem 0 0.912rem 0;
	}

	h5 {
		font-size: 1.64rem;
		line-height: 110%;
		margin: 0.82rem 0 0.656rem 0;
	}

	h6 {
		font-size: 1rem;
		line-height: 110%;
		margin: 0.5rem 0 0.4rem 0;
	}

	.thin {
		font-weight: 200;
	}

	.left {
		float: left !important;
	}

	.right {
		float: right !important;
	}

	.light-blue {
		background-color: #03a9f4 !important;
	}

	.white {
		background-color: #FFFFFF !important;
	}
</style>
