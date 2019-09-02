<template>
	<div class="app">
		<metadata title="News" />
		<main-header />
		<div class="container">
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
								v-for="(feature, index) in item.features"
								:key="index"
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
								index) in item.improvements"
								:key="index"
							>
								{{ improvement }}
							</li>
						</ul>
					</div>
					<div v-show="item.bugs.length > 0" class="sect">
						<div class="sect-head-bugs">
							Bugs Smashed
						</div>
						<ul class="sect-body">
							<li v-for="(bug, index) in item.bugs" :key="index">
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
								v-for="(upcoming, index) in item.upcoming"
								:key="index"
							>
								{{ upcoming }}
							</li>
						</ul>
					</div>
				</div>
			</div>
			<h3 v-if="noFound" class="center">
				No news items were found.
			</h3>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { format } from "date-fns";

import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";
import io from "../../io";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			news: [],
			noFound: false
		};
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;
			this.socket.emit("news.index", res => {
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
						this.news.$set(n, news);
					}
				}
			});
			this.socket.on("event:admin.news.removed", news => {
				this.news = this.news.filter(item => item._id !== news._id);
				if (this.news.length === 0) this.noFound = true;
			});
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
@import "styles/global.scss";

.card {
	margin-top: 50px;
}

.sect {
	div[class^="sect-head"],
	div[class*=" sect-head"] {
		padding: 12px;
		text-transform: uppercase;
		font-weight: bold;
		color: $white;
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
