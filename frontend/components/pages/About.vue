<template>
	<div class="app">
		<metadata title="About" />
		<main-header />
		<div class="content-wrapper">
			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">
						The project
					</p>
				</header>
				<div class="card-content">
					<div class="content">
						<p>
							Musare is an open-source music website where you can
							listen to real-time genre specific music stations,
							or join community stations created by users.
						</p>
					</div>
				</div>
			</div>
			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">
						How you can help
					</p>
				</header>
				<div class="card-content">
					<div class="content">
						<span>
							There are multiple ways you can help us:
							<ol>
								<li>
									Reporting bugs. No website is perfect, but
									we try to eliminate as many bugs as
									possible. If you find a bug, we would highly
									appreciate it if you could create an issue
									on the GitHub project with steps to
									reproduce the issue, so we can fix it as
									soon as possible.
								</li>
								<li>
									Sending us feedback. Your comments and/or
									suggestions are extremely valuable to us. In
									order to improve we need to know what you
									like, don't like and what you might want on
									the website.
								</li>
								<li>
									Sharing the joy. The more people enjoying
									Musare, the better. Telling your friends or
									relatives about Musare would increase the
									amount of users we have, which would
									motivate us and cause Musare to grow faster.
								</li>
							</ol>
						</span>
					</div>
				</div>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {};
	},
	mounted() {},
	methods: {}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.card {
	margin-top: 50px;
}
</style>
