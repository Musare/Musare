<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Report</p>
				<button class='delete' @click='$parent.modals.report = !$parent.modals.report'></button>
			</header>
			<section class='modal-card-body'>
				<div class='columns song-types'>
					<div class='column song-type' v-if='$parent.previousSong !== null'>
						<div class='card is-fullwidth' :class="{ 'is-highlight-active': isPreviousSongActive }" @click="highlight('previousSong')">
							<header class='card-header'>
								<p class='card-header-title'>
									Previous Song
								</p>
							</header>
							<div class='card-content'>
								<article class='media'>
									<figure class='media-left'>
										<p class='image is-64x64'>
											<img :src='$parent.previousSong.thumbnail' onerror='this.src="/assets/notes.png"'>
										</p>
									</figure>
									<div class='media-content'>
										<div class='content'>
											<p>
												<strong>{{ $parent.previousSong.title }}</strong>
												<br>
												<small>{{ $parent.previousSong.artists.split(' ,') }}</small>
											</p>
										</div>
									</div>
								</article>
							</div>
						</div>
					</div>
					<div class='column song-type' v-if='$parent.currentSong !== null'>
						<div class='card is-fullwidth'  :class="{ 'is-highlight-active': isCurrentSongActive }" @click="highlight('currentSong')">
							<header class='card-header'>
								<p class='card-header-title'>
									Current Song
								</p>
							</header>
							<div class='card-content'>
								<article class='media'>
									<figure class='media-left'>
										<p class='image is-64x64'>
											<img :src='$parent.currentSong.thumbnail' onerror='this.src="/assets/notes.png"'>
										</p>
									</figure>
									<div class='media-content'>
										<div class='content'>
											<p>
												<strong>{{ $parent.currentSong.title }}</strong>
												<br>
												<small>{{ $parent.currentSong.artists.split(' ,') }}</small>
											</p>
										</div>
									</div>
								</article>
							</div>
						</div>
					</div>
				</div>
				<div class='edit-report-wrapper'>
					<div class='columns'>
						<div class='column'>
							<label class='label'>Video</label>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Doesn't exist
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									It's Private
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									It's not available in my country
								</label>
							</p>
						</div>
						<div class='column'>
							<label class='label'>Title</label>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Incorrect
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Inappropriate
								</label>
							</p>
						</div>
					</div>
					<div class='columns'>
						<div class='column'>
							<label class='label'>Duration</label>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Skips too soon
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Skips too late
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Starts too soon
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Starts too late
								</label>
							</p>
						</div>
						<div class='column'>
							<label class='label'>Artists</label>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Incorrect
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Inappropriate
								</label>
							</p>
						</div>
					</div>
					<div class='columns'>
						<div class='column'>
							<label class='label'>Thumbnail</label>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Incorrect
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Inappropriate
								</label>
							</p>
							<p class='control'>
								<label class='checkbox'>
									<input type='checkbox'>
									Doesn't exist
								</label>
							</p>
						</div>
						<div class='column'>
							<label class='label'>Other</label>
							<textarea class='textarea' maxlength='400' placeholder='Any other details...' @keyup='updateCharactersRemaining()'></textarea>
							<div class='textarea-counter'>{{ charactersRemaining }}</div>
						</div>
					</div>
				</div>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-success' @click='save()'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Submit Report</span>
				</a>
				<a class='button is-danger' @click='$parent.modals.report = !$parent.modals.report'>
					<span>&nbsp;Cancel</span>
				</a>
			</footer>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				charactersRemaining: 400,
				isPreviousSongActive: false,
				isCurrentSongActive: true,
				report: {}
			}
		},
		methods: {
			save: function () {
				// this.socket.emit('reports.updateDisplayName', this.$parent.stationId, this.$parent.station.displayName, res => {
				// 	if (res.status == 'success') return Toast.methods.addToast(res.message, 4000);
				// 	Toast.methods.addToast(res.message, 8000);
				// });
			},
			updateCharactersRemaining: function () {
				this.charactersRemaining = 400 - $('.textarea').val().length;
			},
			highlight: function (type) {
				if (type == 'currentSong') {
					this.isPreviousSongActive = false;
					this.isCurrentSongActive = true;
				} else if (type == 'previousSong') {
					this.isCurrentSongActive = false;
					this.isPreviousSongActive = true;
				}
			}
		},
		events: {
			closeModal: function () {
				this.$parent.toggleModal('report');
			}
		}
	}
</script>

<style type='scss' scoped>
	h6 { margin-bottom: 15px; }

	.song-types {
		margin-right: 0;
	}

	.song-type:first-of-type {
		padding-left: 0;
	}

	.media-content {
		display: flex;
		align-items: center;
		height: 64px;
	}

	.radio-controls .control {
		display: flex;
		align-items: center;
	}

	.textarea-counter {
		text-align: right;
	}

	@media screen and (min-width: 769px) {
		.radio-controls .control-label { padding-top: 0 !important; }
	}

	.edit-report-wrapper {
		padding: 20px;
	}

	.is-highlight-active {
		border: 3px #03a9f4 solid;
	}
</style>