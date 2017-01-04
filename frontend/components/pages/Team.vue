<template>
	<div class='app'>
		<main-header></main-header>
		<div class='container'>
			<h2 class="center">Current members</h2>
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							KrisVos130
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<ul>
								<li>
									<b>Joined: </b>
									September 23, 2015
								</li>
								<li>
									<b>Role: </b>
									Co-founder and lead-developer
								</li>
								<li>
									<b>Email: </b>
									<a href="mailto:krisvos130@gmail.com">krisvos130@gmail.com</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br>
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Atjonathan
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<ul>
								<li>
									<b>Joined: </b>
									August 28, 2016
								</li>
								<li>
									<b>Role: </b>
									Developer
								</li>
								<li>
									<b>Email: </b>
									<a href="mailto:atjonathan@engineer.com">atjonathan@engineer.com</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br>
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							IIDjShadowII
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<ul>
								<li>
									<b>Role: </b>
									Moderator
								</li>
							</ul>
						</div>
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
	import io from '../../io';

	export default {
		components: { MainHeader, MainFooter },
		methods: {

		},
		data() {
			return {

			}
		},
		ready: function () {
			let _this = this;
			io.getSocket((socket) => {
				_this.socket = socket;

			});
		}
	}
</script>

<style lang='scss' scoped>

</style>
