<template>
	<div class="app">
		<main-header></main-header>
		<!--<article v-for="item in news">
			<h1>{{ item.author }}</h1>
		</article>-->
		<main-footer></main-footer>
	</div>
</template>

<script>
	import MainHeader from '../MainHeader.vue';
	import MainFooter from '../MainFooter.vue';

	export default {
		components: { MainHeader, MainFooter },
		data() {
			return {
				news: []
			}
		},
		ready: function () {
			// let socket = this.socket = this.$parent.socket;
			// socket.emit("news.all", function(res) {
			// 	this.news = res.data;
			// 	console.log(this.news)
			// });
		}
	}
</script>

<style lang="scss" scoped></style>
