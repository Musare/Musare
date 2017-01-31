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
							Kris
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag blue">co-founder</span>
							<span class="custom-tag light-blue">lead-developer</span>
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
							Jonathan
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag light-blue">lead-developer</span>
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
							<span class="custom-tag light-green">moderator</span>
							<ul>
								<li>
									<b>Joined: </b>
									November 11, 2015
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<h3 class="center">Old/inactive members</h3>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Cameron Kline
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag light-blue">developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									August 26, 2016
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Wesley McCann
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag light-blue">developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									November 8, 2015
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Nex
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag light-blue">developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									February 29, 2016
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Akira Laine
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag blue">co-founder</span>
							<span class="custom-tag light-blue">lead-developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									September 23, 2015
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Johannes Andersen
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag light-blue">developer</span>
							<ul>
								<li>
									<b>Joined: </b>
									September 23, 2015
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
			<br />
			<div class="columns">
				<div class='card column is-6-desktop is-offset-3-desktop is-12-mobile'>
					<header class='card-header'>
						<p class='card-header-title'>
							Aaron Gildea
						</p>
					</header>
					<div class='card-content'>
						<div class='content'>
							<span class="custom-tag light-green">moderator</span>
							<ul>
								<li>
									<b>Joined: </b>
									November 7, 2015
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

	export default {
		components: { MainHeader, MainFooter }
	}
</script>

<style lang='scss' scoped>
	li a {
		color: dodgerblue;
    	border-bottom: 0 !important;
	}

	ul {
		margin-left: 0;
		margin-right: 0;
		list-style: none;
	}

	.custom-tag {
		padding: 2px 5px;
		border-radius: 10px;
		display: inline-block;
	}

	.custom-tag.blue {
		background-color: #0066f4;
		color: white;
	}

	.custom-tag.light-blue {
		background-color: #00baf4;
		color: white;
	}

	.custom-tag.light-green {
		background-color: #00f472;
		color: white;
	}
</style>
