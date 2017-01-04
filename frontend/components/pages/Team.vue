<template>
	<div class='app'>
		<main-header></main-header>
		<div class='container'>
			<h3 class="center">Current members</h3>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Kris (@KrisVos130)
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="tag is-info">co-founder</span>
							<span class="tag is-black">lead-developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									September 23, 2015
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
							Jonathan (@atjonathan)
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="tag is-black">lead-developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									August 28, 2016
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
							<span class="tag is-dark">moderator</span>
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

	export default {
		components: { MainHeader, MainFooter }
	}
</script>

<style lang='scss' scoped>
	li a {
		color: dodgerblue;
    	border-bottom: 0 !important;
	}
</style>
