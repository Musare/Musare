<template>
	<div class="app">
		<main-header></main-header>
		<div class="container">
			<div class="card is-fullwidth" v-for="item in news">
				<header class="card-header">
					<p class="card-header-title">
						{{item.title}} - {{formatDate(item.createdAt)}}
					</p>
				</header>
				<div class="card-content">
					<div class="content">
						<p>{{item.description}}</p>
					</div>
					<div class="content" v-show="item.features.length > 0">
						<div class="tile notification is-success">Features</div>
						<ul>
							<li v-for="li in item.features">{{li}}</li>
						</ul>
					</div>
					<div class="content" v-show="item.changes.length > 0">
						<div class="tile notification is-info">Changes</div>
						<ul>
							<li v-for="li in item.changes">{{li}}</li>
						</ul>
					</div>
					<div class="content" v-show="item.fixes.length > 0">
						<div class="tile notification is-danger">Bug fixes</div>
						<ul>
							<li v-for="li in item.fixes">{{li}}</li>
						</ul>
					</div>
					<div class="content" v-show="item.upcoming.length > 0">
						<div class="tile notification is-primary">Upcoming</div>
						<ul>
							<li v-for="li in item.upcoming">{{li}}</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	export default {
		components: { MainHeader, MainFooter },
		methods: {
			formatDate: (unix) => {
				return moment(unix).format("DD-MM-YYYY");
			},
		},
		data() {
			return {
				news: []
			}
		},
		ready: function () {
			let _this = this;
			let socket = this.socket = this.$parent.socket;
			socket.emit("news.index", function(result) {
				_this.news = result.data;
				console.log(_this.news)
			});
		}
	}
</script>

<style lang="scss" scoped>
	.card {
		margin-top: 50px;
	}
</style>
