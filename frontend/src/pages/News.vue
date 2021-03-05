<template>
	<div class="app">
		<metadata title="News" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<div
					v-for="(item, index) in news"
					:key="index"
					class="card is-fullwidth"
				>
					<header class="card-header">
						<p class="card-header-title">
							{{ item.title }} - {{ formatDate(item.createdAt) }}
						</p>
					</header>
					<div class="card-content">
						<div class="content">
							<p>{{ item.description }}</p>
						</div>
						<div v-show="item.features.length > 0" class="sect">
							<div class="sect-head-features">
								The features are so great
							</div>
							<ul class="sect-body">
								<li
									v-for="(feature,
									itemIndex) in item.features"
									:key="itemIndex"
								>
									{{ feature }}
								</li>
							</ul>
						</div>
						<div v-show="item.improvements.length > 0" class="sect">
							<div class="sect-head-improvements">
								Improvements
							</div>
							<ul class="sect-body">
								<li
									v-for="(improvement,
									itemIndex) in item.improvements"
									:key="itemIndex"
								>
									{{ improvement }}
								</li>
							</ul>
						</div>
						<div v-show="item.bugs.length > 0" class="sect">
							<div class="sect-head-bugs">Bugs Smashed</div>
							<ul class="sect-body">
								<li
									v-for="(bug, itemIndex) in item.bugs"
									:key="itemIndex"
								>
									{{ bug }}
								</li>
							</ul>
						</div>
						<div v-show="item.upcoming.length > 0" class="sect">
							<div class="sect-head-upcoming">
								Coming Soon to a Musare near you
							</div>
							<ul class="sect-body">
								<li
									v-for="(upcoming,
									itemIndex) in item.upcoming"
									:key="itemIndex"
								>
									{{ upcoming }}
								</li>
							</ul>
						</div>
					</div>
				</div>
				<h3 v-if="noFound" class="has-text-centered page-title">
					No news items were found.
				</h3>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { format } from "date-fns";
import { mapGetters } from "vuex";

import MainHeader from "../components/layout/MainHeader.vue";
import MainFooter from "../components/layout/MainFooter.vue";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			news: [],
			noFound: false
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	mounted() {
		this.socket.dispatch("news.index", res => {
			this.news = res.data;
			if (this.news.length === 0) this.noFound = true;
		});
		this.socket.on("event:admin.news.created", news => {
			this.news.unshift(news);
			this.noFound = false;
		});
		this.socket.on("event:admin.news.updated", news => {
			for (let n = 0; n < this.news.length; n += 1) {
				if (this.news[n]._id === news._id) {
					this.$set(this.news, n, news);
				}
			}
		});
		this.socket.on("event:admin.news.removed", news => {
			this.news = this.news.filter(item => item._id !== news._id);
			if (this.news.length === 0) this.noFound = true;
		});
	},
	methods: {
		formatDate: unix => {
			return format(unix, "dd-MM-yyyy");
		}
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	p {
		color: var(--light-grey-2);
	}
}

.card {
	margin-top: 50px;
}

.sect {
	div[class^="sect-head"],
	div[class*=" sect-head"] {
		padding: 12px;
		text-transform: uppercase;
		font-weight: bold;
		color: var(--white);
	}

	.sect-head-features {
		background-color: dodgerblue;
	}
	.sect-head-improvements {
		background-color: seagreen;
	}
	.sect-head-bugs {
		background-color: brown;
	}
	.sect-head-upcoming {
		background-color: mediumpurple;
	}

	.sect-body {
		padding: 15px 25px;

		li {
			list-style-type: disc;
		}
	}
}
</style>
