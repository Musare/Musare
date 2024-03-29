<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const MainHeader = defineAsyncComponent(
	() => import("@/components/MainHeader.vue")
);
const MainFooter = defineAsyncComponent(
	() => import("@/components/MainFooter.vue")
);
</script>

<template>
	<div class="app">
		<page-metadata title="About" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<h1 class="has-text-centered page-title">About</h1>
				<div class="card">
					<header class="card-header">
						<p>The project</p>
					</header>
					<div class="card-content">
						<p>
							Musare is an open-source music website where you can
							listen to real-time genre specific music stations,
							or join community stations created by users.
						</p>
					</div>
				</div>
				<div class="card">
					<header class="card-header">
						<p>How you can help</p>
					</header>
					<div class="card-content">
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

<style lang="less" scoped>
.night-mode {
	.card {
		background-color: var(--dark-grey-3);
	}

	p {
		color: var(--light-grey-2);
	}
}

.card {
	display: flex;
	flex-grow: 1;
	flex-direction: column;
	padding: 20px;
	margin: 10px 10px 50px 10px;
	border-radius: @border-radius;
	overflow: hidden;
	background-color: var(--white);
	color: var(--dark-grey);
	box-shadow: @box-shadow;

	.card-header {
		font-weight: 700;
		padding-bottom: 10px;
	}
}

ol {
	margin-left: 2em;
}
</style>
