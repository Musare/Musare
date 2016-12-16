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
											<img :src='$parent.previousSong.thumbnail' onerror='this.src="/assets/notes-transparent.png"'>
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
							<a @click=highlight('previousSong') href='#' class='absolute-a'></a>
						</div>
					</div>
					<div class='column song-type' v-if='$parent.currentSong !== {}'>
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
											<img :src='$parent.currentSong.thumbnail' onerror='this.src="/assets/notes-transparent.png"'>
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
							<a @click=highlight('currentSong') href='#' class='absolute-a'></a>
						</div>
					</div>
				</div>
				<div class='edit-report-wrapper'>
					<div class='columns is-multiline'>
						<div class='column is-half' v-for='issue in issues'>
							<label class='label'>{{ issue.name }}</label>
							<p class='control' v-for='reason in issue.reasons' track-by='$index'>
								<label class='checkbox'>
									<input type='checkbox' @click='toggleIssue(issue.name, reason)'>
									{{ reason }}
								</label>
							</p>
						</div>
						<div class='column'>
							<label class='label'>Other</label>
							<textarea class='textarea' maxlength='400' placeholder='Any other details...' @keyup='updateCharactersRemaining()' v-model='report.description'></textarea>
							<div class='textarea-counter'>{{ charactersRemaining }}</div>
						</div>
					</div>
				</div>
			</section>
			<footer class='modal-card-foot'>
				<a class='button is-success' @click='create()' href='#'>
					<i class='material-icons save-changes'>done</i>
					<span>&nbsp;Create</span>
				</a>
				<a class='button is-danger' @click='$parent.modals.report = !$parent.modals.report' href='#'>
					<span>&nbsp;Cancel</span>
				</a>
			</footer>
		</div>
	</div>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	export default {
		data() {
			return {
				charactersRemaining: 400,
				isPreviousSongActive: false,
				isCurrentSongActive: true,
				report: {
					resolved: false,
					songId: this.$parent.currentSong._id,
					description: '',
					issues: [
						{ name: 'Video', reasons: [] },
						{ name: 'Title', reasons: [] },
						{ name: 'Duration', reasons: [] },
						{ name: 'Artists', reasons: [] },
						{ name: 'Thumbnail', reasons: [] }
					]
				},
				issues: [
					{
						name: 'Video',
						reasons: [
							'Doesn\'t exist',
							'It\'s private',
							'It\'s not available in my country'
						]
					},
					{
						name: 'Title',
						reasons: [
							'Incorrect',
							'Inappropriate'
						]
					},
					{
						name: 'Duration',
						reasons: [
							'Skips too soon',
							'Skips too late',
							'Starts too soon',
							'Skips too late'
						]
					},
					{
						name: 'Artists',
						reasons: [
							'Incorrect',
							'Inappropriate'
						]
					},
					{
						name: 'Thumbnail',
						reasons: [
							'Incorrect',
							'Inappropriate',
							'Doesn\'t exist'
						]
					}
				]
			}
		},
		methods: {
			create: function () {
				let _this = this;
				_this.socket.emit('reports.create', _this.report, res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status == 'success') _this.$parent.modals.report = !_this.$parent.modals.report;
				});
			},
			updateCharactersRemaining: function () {
				this.charactersRemaining = 400 - $('.textarea').val().length;
			},
			highlight: function (type) {
				if (type == 'currentSong') {
					this.report.songId = this.$parent.currentSong._id;
					this.isPreviousSongActive = false;
					this.isCurrentSongActive = true;
				} else if (type == 'previousSong') {
					this.report.songId = this.$parent.previousSong._id;
					this.isCurrentSongActive = false;
					this.isPreviousSongActive = true;
				}
			},
			toggleIssue: function (name, reason) {
				for (let z = 0; z < this.report.issues.length; z++) {
					if (this.report.issues[z].name == name) {
						if (this.report.issues[z].reasons.indexOf(reason) > -1) {
							this.report.issues[z].reasons.splice(
								this.report.issues[z].reasons.indexOf(reason), 1
							);
						} else this.report.issues[z].reasons.push(reason);
					}
				}
			}
		},
		events: {
			closeModal: function () {
				this.$parent.toggleModal('report');
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
			});
		},
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