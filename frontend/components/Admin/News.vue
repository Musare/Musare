<template>
	<div class='container'>
		<table class='table is-striped'>
			<thead>
				<tr>
					<td>Title</td>
					<td>Description</td>
					<td>Bugs</td>
					<td>Features</td>
					<td>Improvements</td>
					<td>Upcoming</td>
					<td>Options</td>
				</tr>
			</thead>
			<tbody>
				<tr v-for='(index, news) in news' track-by='$index'>
					<td>
						<strong>{{ news.title }}</strong>
					</td>
					<td>{{ news.description }}</td>
					<td>{{ news.bugs.join(', ') }}</td>
					<td>{{ news.features.join(', ') }}</td>
					<td>{{ news.improvements.join(', ') }}</td>
					<td>{{ news.upcoming.join(', ') }}</td>
					<td>
						<button class='button is-primary' @click='editNews(news)'>Edit</button>
						<button class='button is-danger' @click='removeNews(news)'>Remove</button>
					</td>
				</tr>
			</tbody>
		</table>

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
								<input class='input' type='text' placeholder='Title' v-model='creating.title'>
							</p>
							<p class='control is-expanded'>
								<input class='input' type='text' placeholder='Short description' v-model='creating.description'>
							</p>
						</div>
					</div>

					<div class="columns">
						<div class="column">
							<label class='label'>Bugs</label>
							<p class='control has-addons'>
								<input class='input' id='new-bugs' type='text' placeholder='Bug' v-on:keyup.enter='addChange("bugs")'>
								<a class='button is-info' href='#' @click='addChange("bugs")'>Add</a>
							</p>
							<span class='tag is-info' v-for='(index, bug) in creating.bugs' track-by='$index'>
								{{ bug }}
								<button class='delete is-info' @click='removeChange("bugs", index)'></button>
							</span>
						</div>
						<div class="column">
							<label class='label'>Features</label>
							<p class='control has-addons'>
								<input class='input' id='new-features' type='text' placeholder='Feature' v-on:keyup.enter='addChange("features")'>
								<a class='button is-info' href='#' @click='addChange("features")'>Add</a>
							</p>
							<span class='tag is-info' v-for='(index, feature) in creating.features' track-by='$index'>
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
								<a class='button is-info' href='#' @click='addChange("improvements")'>Add</a>
							</p>
							<span class='tag is-info' v-for='(index, improvement) in creating.improvements' track-by='$index'>
								{{ improvement }}
								<button class='delete is-info' @click='removeChange("improvements", index)'></button>
							</span>
						</div>
						<div class="column">
							<label class='label'>Upcoming</label>
							<p class='control has-addons'>
								<input class='input' id='new-upcoming' type='text' placeholder='Upcoming' v-on:keyup.enter='addChange("upcoming")'>
								<a class='button is-info' href='#' @click='addChange("upcoming")'>Add</a>
							</p>
							<span class='tag is-info' v-for='(index, upcoming) in creating.upcoming' track-by='$index'>
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

	<edit-news v-if='modals.editNews'></edit-news>
</template>

<script>
	import { Toast } from 'vue-roaster';
	import io from '../../io';

	import EditNews from '../Modals/EditNews.vue';

	export default {
		components: { EditNews },
		data() {
			return {
				modals: { editNews: false },
				news: [],
				creating: {
					title: '',
					description: '',
					bugs: [],
					features: [],
					improvements: [],
					upcoming: []
				},
				editing: {}
			}
		},
		methods: {
			toggleModal: function () {
				this.modals.editNews = !this.modals.editNews;
			},
			createNews: function () {
				let _this = this;

				let { creating: { bugs, features, improvements, upcoming } } = this;

				if (this.creating.title === '') return Toast.methods.addToast('Field (Title) cannot be empty', 3000);
				if (this.creating.description === '') return Toast.methods.addToast('Field (Description) cannot be empty', 3000);
				if (
					bugs.length <= 0 && features.length <= 0 &&
					improvements.length <= 0 && upcoming.length <= 0
				) return Toast.methods.addToast('You must have at least one News Item', 3000);

				_this.socket.emit('news.create', _this.creating, result => {
					Toast.methods.addToast(result.message, 4000);
					if (result.status == 'success') _this.creating = {
						title: '',
						description: '',
						bugs: [],
						features: [],
						improvements: [],
						upcoming: []
					}
				});
			},
			removeNews: function (news) {
				this.socket.emit('news.remove', news, res => {
					Toast.methods.addToast(res.message, 8000);
				});
			},
			editNews: function (news) {
				this.editing = news;
				this.toggleModal();
			},
			updateNews: function (close) {
				let _this = this;
				this.socket.emit('news.update', _this.editing._id, _this.editing, res => {
					Toast.methods.addToast(res.message, 4000);
					if (res.status === 'success') {
						if (close) _this.toggleModal();
					}
				});
			},
			addChange: function (type) {
				let change = $(`#new-${type}`).val().trim();

				if (this.creating[type].indexOf(change) !== -1) return Toast.methods.addToast(`Tag already exists`, 3000);

				if (change) {
					$(`#new-${type}`).val('');
					this.creating[type].push(change);
				}
				else Toast.methods.addToast(`${type} cannot be empty`, 3000);
			},
			removeChange: function (type, index) {
				this.creating[type].splice(index, 1);
			},
			init: function () {
				this.socket.emit('apis.joinAdminRoom', 'news', data => {});
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('news.index', result => {
					_this.news = result.data;
				});
				_this.socket.on('event:admin.news.created', news => {
					_this.news.unshift(news);
				});
				_this.socket.on('event:admin.news.removed', news => {
					_this.news = _this.news.filter(item => item._id !== news._id);
				});
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

	td { vertical-align: middle; }

	.is-info:focus { background-color: #0398db; }

	.card-footer-item { color: #03a9f4; }
</style>
