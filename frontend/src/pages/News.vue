<template>
	<div class="app">
		<metadata title="News" />
		<main-header />
		<div class="container">
			<div class="content-wrapper">
				<div
					v-for="item in news"
					:key="item._id"
					class="card is-fullwidth"
				>
					<header class="card-header">
						<p class="card-header-title">
							{{ item.title }} - {{ formatDate(item.createdAt) }}
						</p>
					</header>
					<div class="card-content">
						<div class="content">
							<p>{{ item.markdown }}</p>
						</div>
					</div>
				</div>
				<h3
					v-if="news.length === 0"
					class="has-text-centered page-title"
				>
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

import MainHeader from "@/components/layout/MainHeader.vue";
import MainFooter from "@/components/layout/MainFooter.vue";

export default {
	components: { MainHeader, MainFooter },
	data() {
		return {
			news: []
		};
	},
	computed: mapGetters({
		socket: "websockets/getSocket"
	}),
	mounted() {
		this.socket.dispatch("news.index", res => {
			if (res.status === "success") this.news = res.data.news;
		});
		this.socket.on("event:admin.news.created", res =>
			this.news.unshift(res.data.news)
		);
		this.socket.on("event:admin.news.updated", res => {
			for (let n = 0; n < this.news.length; n += 1) {
				if (this.news[n]._id === res.data.news._id) {
					this.$set(this.news, n, res.data.news);
				}
			}
		});
		this.socket.on("event:admin.news.removed", res => {
			this.news = this.news.filter(item => item._id !== res.data.newsId);
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
