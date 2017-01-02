<template>
	<div class='app'>
		<main-header></main-header>
		<div class='container'>
			<div class='card is-fullwidth' v-for='item in news'>
				<header class='card-header'>
					<p class='card-header-title'>
						{{ item.title }} - {{ formatDate(item.createdAt) }}
					</p>
				</header>
				<div class='card-content'>
					<div class='content'>
						<p>{{ item.description }}</p>
					</div>
					<div class='sect' v-show='item.features.length > 0'>
						<div class='sect-head-features'>The features are so great</div>
						<ul class='sect-body'>
							<li v-for='li in item.features'>{{ li }}</li>
						</ul>
					</div>
					<div class='sect' v-show='item.improvements.length > 0'>
						<div class='sect-head-improvements'>Improvements</div>
						<ul class='sect-body'>
							<li v-for='li in item.improvements'>{{ li }}</li>
						</ul>
					</div>
					<div class='sect' v-show='item.bugs.length > 0'>
						<div class='sect-head-bugs'>Bugs Smashed</div>
						<ul class='sect-body'>
							<li v-for='li in item.bugs'>{{ li }}</li>
						</ul>
					</div>
					<div class='sect' v-show='item.upcoming.length > 0'>
						<div class='sect-head-upcoming'>Coming Soon to a Musare near you</div>
						<ul class='sect-body'>
							<li v-for='li in item.upcoming'>{{ li }}</li>
						</ul>
					</div>
				</div>
			</div>
			<h3 v-if="noFound" class="center">No news items were found.</h3>
		</div>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';
	import io from '../../io';

	export default {
		components: { MainHeader, MainFooter },
		methods: {
			formatDate: unix => {
				return moment(unix).format('DD-MM-YYYY');
			}
		},
		data() {
			return {
				news: [],
				noFound: false
			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;
				_this.socket.emit('news.index', res => {
					_this.news = res.data;
					if (_this.news.length === 0) _this.noFound = true;
				});
				_this.socket.on('event:admin.news.created', news => {
					_this.news.unshift(news);
					_this.noFound = false;
				});
				_this.socket.on('event:admin.news.updated', news => {
					for (let n = 0; n < _this.news.length; n++) {
						if (_this.news[n]._id === news._id) {
							_this.news.$set(n, news);
						}
					}
				});
				_this.socket.on('event:admin.news.removed', news => {
					_this.news = _this.news.filter(item => item._id !== news._id);
					if (_this.news.length === 0) _this.noFound = true;
				});
			});
		}
	}
</script>

<style lang='scss' scoped>
	.card { margin-top: 50px; }

	.sect {
		div[class^='sect-head'], div[class*=' sect-head']{
			padding: 12px;
			text-transform: uppercase;
			font-weight: bold;
			color: #fff;
		}

		.sect-head-features { background-color: dodgerblue; }
		.sect-head-improvements { background-color: seagreen; }
		.sect-head-bugs { background-color: brown; }
		.sect-head-upcoming { background-color: mediumpurple; }

		.sect-body {
			padding: 15px 25px;

			li { list-style-type: disc; }
		}
	}
</style>
