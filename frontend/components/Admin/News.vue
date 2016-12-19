<template>
	<div class='container'>
		<div class='card is-fullwidth'>
			<header class='card-header'>
				<p class='card-header-title'>Create News</p>
			</header>
			<div class='card-content'>
				<div class='content'>

					<label class='label'>Title & Description</label>
					<div class='control is-horizontal'>
						<div class='control is-grouped'>
							<p class='control is-expanded'>
								<input class='input' type='text' placeholder='Title' v-model='news.title'>
							</p>
							<p class='control is-expanded'>
								<input class='input' type='text' placeholder='Short description' v-model='news.description'>
							</p>
						</div>
					</div>

					<div class="columns">
						<div class="column">
							<label class='label'>Bugs</label>
							<p class='control has-addons'>
								<input class='input' id='new-bugs' type='text' placeholder='Bug' v-on:keyup.enter='addChange("bugs")'>
								<a class='button is-info' href='#' @click='addChange("bugs")'>Add Bug</a>
							</p>
							<span class='tag is-info' v-for='(index, bug) in news.bugs' track-by='$index'>
								{{ bug }}
								<button class='delete is-info' @click='removeChange("bugs", index)'></button>
							</span>
						</div>
						<div class="column">
							<label class='label'>Features</label>
							<p class='control has-addons'>
								<input class='input' id='new-features' type='text' placeholder='Feature' v-on:keyup.enter='addChange("features")'>
								<a class='button is-info' href='#' @click='addChange("features")'>Add Feature</a>
							</p>
							<span class='tag is-info' v-for='(index, feature) in news.features' track-by='$index'>
								{{ feature }}
								<button class='delete is-info' @click='removeChange("features", index)'></button>
							</span>
						</div>
					</div>

					<div class="columns">
						<div class="column">
							<label class='label'>Improvements</label>
							<p class='control has-addons'>
								<input class='input' id='new-improvements' type='text' placeholder='Improvement' v-on:keyup.enter='addChange("improvements")'>
								<a class='button is-info' href='#' @click='addChange("improvements")'>Add Improvement</a>
							</p>
							<span class='tag is-info' v-for='(index, improvement) in news.improvements' track-by='$index'>
								{{ improvement }}
								<button class='delete is-info' @click='removeChange("improvements", index)'></button>
							</span>
						</div>
						<div class="column">
							<label class='label'>Upcoming</label>
							<p class='control has-addons'>
								<input class='input' id='new-upcoming' type='text' placeholder='Upcoming' v-on:keyup.enter='addChange("upcoming")'>
								<a class='button is-info' href='#' @click='addChange("upcoming")'>Add Upcoming Change</a>
							</p>
							<span class='tag is-info' v-for='(index, upcoming) in news.upcoming' track-by='$index'>
								{{ upcoming }}
								<button class='delete is-info' @click='removeChange("upcoming", index)'></button>
							</span>
						</div>
					</div>

				</div>
			</div>
			<footer class='card-footer'>
				<a class='card-footer-item' @click='createNews()' href='#'>Create</a>
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
				news: {
					title: '',
					description: '',
					bugs: [],
					features: [],
					improvements: [],
					upcoming: []
				}
			}
		},
		methods: {
			createNews: function () {
				let _this = this;

				let { news: { bugs, features, improvements, upcoming } } = this;

				if (this.news.title === '') return Toast.methods.addToast('Field (Title) cannot be empty', 3000);
				if (this.news.description === '') return Toast.methods.addToast('Field (Description) cannot be empty', 3000);
				if (
					bugs.length <= 0 && features.length <= 0 && 
					improvements.length <= 0 && upcoming.length <= 0
				) return Toast.methods.addToast('You must have at least one News Item', 3000);

				_this.socket.emit('news.create', _this.news, result => {
					Toast.methods.addToast(result.message, 4000);
				});
			},
			addChange: function (type) {
				let change = $(`#new-${type}`).val().toLowerCase().trim();

				if (this.news[type].indexOf(change) !== -1) return Toast.methods.addToast(`Tag already exists`, 3000);

				if (change) this.news[type].push(change);
				else Toast.methods.addToast(`${type} cannot be empty`, 3000);
			},
			removeChange: function (type, index) {
				this.news[type].splice(index, 1);
			},
			init: function () {
				this.socket.emit('apis.joinAdminRoom', 'news', data => {});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				if (_this.socket.connected) _this.init();
				io.onConnect(() => {
					_this.init();
				});
			});
		}
	}
</script>

<style lang='scss' scoped>
	.tag:not(:last-child) { margin-right: 5px; }

	.is-info:focus { background-color: #0398db; }

	.card-footer-item { color: #03A9F4; }
</style>
