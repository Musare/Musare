<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<section class='modal-card-body'>

				<h5 class='has-text-centered'>Video Preview</h5>
				<div class='video-container'>
					<div id='player'></div>
					<p class='control has-addons'>
						<a class='button'>
							<i class='material-icons' @click='$parent.video.settings("pause")' v-if='!$parent.video.paused'>pause</i>
							<i class='material-icons' @click='$parent.video.settings("play")' v-else>play_arrow</i>
						</a>
						<a class='button' @click='$parent.video.settings("stop")'>
							<i class='material-icons'>stop</i>
						</a>
						<a class='button' @click='$parent.video.settings("skipToLast10Secs")'>
							<i class='material-icons'>fast_forward</i>
						</a>
					</p>
				</div>
				<p style="margin-top: 0; position: relative;">
					<input type="range" id="volumeSlider" min="0" max="100" class="active" v-on:change="$parent.changeVolume()" v-on:input="$parent.changeVolume()">
				</p>

				<h5 class='has-text-centered'>Thumbnail Preview</h5>
				<img class='thumbnail-preview' :src='$parent.editing.song.thumbnail' onerror="this.src='/assets/notes.png'">

				<label class='label'>Thumbnail URL</label>
				<p class='control'>
					<input class='input' type='text' v-model='$parent.editing.song.thumbnail'>
				</p>

				<h5 class='has-text-centered'>Edit Info</h5>

				<p class='control'>
					<label class='checkbox'>
						<input type='checkbox' v-model='$parent.editing.song.explicit'>
						Explicit
					</label>
				</p>
				<label class='label'>Song ID</label>
				<p class='control'>
					<input class='input' type='text' v-model='$parent.editing.song._id'>
				</p>
				<label class='label'>Song Title</label>
				<p class='control'>
					<input class='input' type='text' v-model='$parent.editing.song.title'>
				</p>
				<div class='control is-horizontal'>
					<div class='control is-grouped'>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-artist' type='text' placeholder='Artist'>
								<a class='button is-info' @click='$parent.addTag("artists")'>Add Artist</a>
							</p>
							<span class='tag is-info' v-for='(index, artist) in $parent.editing.song.artists' track-by='$index'>
								{{ artist }}
								<button class='delete is-info' @click='$parent.removeTag("artists", index)'></button>
							</span>
						</div>
						<div>
							<p class='control has-addons'>
								<input class='input' id='new-genre' type='text' placeholder='Genre'>
								<a class='button is-info' @click='$parent.addTag("genres")'>Add Genre</a>
							</p>
							<span class='tag is-info' v-for='(index, genre) in $parent.editing.song.genres' track-by='$index'>
								{{ genre }}
								<button class='delete is-info' @click='$parent.removeTag("genres", index)'></button>
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
				<a class='button is-success' @click='$parent.save(editing.song)'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Save</span>
				</a>
				<a class='button is-danger' @click='$parent.toggleModal()'>
					<span>&nbspCancel</span>
				</a>
			</footer>
		</div>
	</div>
</template>