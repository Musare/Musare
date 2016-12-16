<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<section class='modal-card-body'>

				<h5 class='has-text-centered'>Video Preview</h5>
				<div class='video-container'>
					<div id='player'></div>
					<div class="controls">
						<form action="#" class="column is-7-desktop is-4-mobile">
							<p style="margin-top: 0; position: relative;">
								<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="$parent.changeVolume()" v-on:input="$parent.changeVolume()">
							</p>
						</form>
						<p class='control has-addons'>
							<a class='button' @click='$parent.video.settings("pause")' v-if='!$parent.video.paused' href='#'>
								<i class='material-icons'>pause</i>
							</a>
							<a class='button' @click='$parent.video.settings("play")' v-if='$parent.video.paused' href='#'>
								<i class='material-icons'>play_arrow</i>
							</a>
							<a class='button' @click='$parent.video.settings("stop")' href='#'>
								<i class='material-icons'>stop</i>
							</a>
							<a class='button' @click='$parent.video.settings("skipToLast10Secs")' href='#'>
								<i class='material-icons'>fast_forward</i>
							</a>
						</p>
					</div>
				</div>
				<h5 class='has-text-centered'>Thumbnail Preview</h5>
				<img class='thumbnail-preview' :src='$parent.editing.song.thumbnail' onerror="this.src='/assets/notes-transparent.png'">

				<div class="control is-horizontal">
					<div class="control-label">
						<label class="label">Thumbnail URL</label>
					</div>
					<div class="control">
						<input class='input' type='text' v-model='$parent.editing.song.thumbnail'>
					</div>
				</div>

				<h5 class='has-text-centered'>Edit Info</h5>

				<p class='control'>
					<label class='checkbox'>
						<input type='checkbox' v-model='$parent.editing.song.explicit'>
						Explicit
					</label>
				</p>
				<label class='label'>Song ID & Title</label>
				<div class="control is-horizontal">
					<div class="control is-grouped">
						<p class='control is-expanded'>
							<input class='input' type='text' v-model='$parent.editing.song._id'>
						</p>
						<p class='control is-expanded'>
							<input class='input' type='text' v-model='$parent.editing.song.title' autofocus>
						</p>
					</div>
				</div>
				<label class='label'>Artists & Genres</label>
				<div class='control is-horizontal'>
					<div class='control is-grouped artist-genres'>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-artist' type='text' placeholder='Artist'>
								<a class='button is-info' @click='$parent.addTag("artists")' href='#'>Add Artist</a>
							</p>
							<span class='tag is-info' v-for='(index, artist) in $parent.editing.song.artists' track-by='$index'>
								{{ artist }}
								<button class='delete is-info' @click='$parent.$parent.removeTag("artists", index)'></button>
							</span>
						</div>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-genre' type='text' placeholder='Genre'>
								<a class='button is-info' @click='$parent.addTag("genres")' href='#'>Add Genre</a>
							</p>
							<span class='tag is-info' v-for='(index, genre) in $parent.editing.song.genres' track-by='$index'>
								{{ genre }}
								<button class='delete is-info' @click='$parent.$parent.removeTag("genres", index)'></button>
							</span>
						</div>
					</div>
				</div>
				<label class='label'>Song Duration</label>
				<p class='control'>
					<input class='input' type='text' v-model='$parent.editing.song.duration'>
				</p>
				<label class='label'>Skip Duration</label>
				<p class='control'>
					<input class='input' type='text' v-model='$parent.editing.song.skipDuration'>
				</p>

			</section>
			<footer class='modal-card-foot'>
				<a class='button is-success' @click='$parent.save($parent.editing.song)' href='#'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Save</span>
				</a>
				<a class='button is-danger' @click='$parent.toggleModal()' href='#'>
					<span>&nbsp;Cancel</span>
				</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		methods: {
			toggleModal: function () {
				this.$dispatch('toggleModal', 'login');
			},
			submitModal: function () {
				this.$dispatch('login');
				this.toggleModal();
			}
		},
		events: {
			closeModal: function() {
				this.$parent.toggleModal()
			}
		}
	}
</script>

<style type='scss' scoped>
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

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.artist-genres {
		display: flex;
    	justify-content: space-between;
	}

	#volumeSlider { margin-bottom: 15px; }

	.has-text-centered { padding: 10px; }

	.thumbnail-preview {
		display: flex;
		margin: 0 auto 25px auto;
		max-width: 200px;
		width: 100%;
	}

	.modal-card-body, .modal-card-foot { border-top: 0; }

	.label, .checkbox, h5 {
		font-weight: normal;
	}

	.video-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px;

		iframe { pointer-events: none; }
	}

	.save-changes { color: #fff; }

	.tag:not(:last-child) { margin-right: 5px; }
</style>