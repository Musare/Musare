<template>
	<div
		v-if="news !== null"
		class="modal"
		:class="{ 'is-active': isModalActive }"
	>
		<div class="modal-background" />
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">
					<strong>{{ news.title }}</strong>
					({{ formatDate(news.createdAt) }})
				</p>
				<button class="delete" v-on:click="toggleModal()" />
			</header>
			<section class="modal-card-body">
				<div class="content">
					<p>{{ news.description }}</p>
				</div>
				<div v-show="news.features.length > 0" class="sect">
					<div class="sect-head-features">
						The features are so great
					</div>
					<ul class="sect-body">
						<li
							v-for="(feature, index) in news.features"
							:key="index"
						>
							{{ feature }}
						</li>
					</ul>
				</div>
				<div v-show="news.improvements.length > 0" class="sect">
					<div class="sect-head-improvements">
						Improvements
					</div>
					<ul class="sect-body">
						<li
							v-for="(improvement, index) in news.improvements"
							:key="index"
						>
							{{ improvement }}
						</li>
					</ul>
				</div>
				<div v-show="news.bugs.length > 0" class="sect">
					<div class="sect-head-bugs">
						Bugs Smashed
					</div>
					<ul class="sect-body">
						<li v-for="(bug, index) in news.bugs" :key="index">
							{{ bug }}
						</li>
					</ul>
				</div>
				<div v-show="news.upcoming.length > 0" class="sect">
					<div class="sect-head-upcoming">
						Coming Soon to a Musare near you
					</div>
					<ul class="sect-body">
						<li
							v-for="(upcoming, index) in news.upcoming"
							:key="index"
						>
							{{ upcoming }}
						</li>
					</ul>
				</div>
			</section>
		</div>
	</div>
</template>

<script>
import { format } from "date-fns";

import io from "../../io";

export default {
	data() {
		return {
			isModalActive: false,
			news: null
		};
	},
	mounted() {
		io.getSocket(true, socket => {
			this.socket = socket;
			this.socket.emit("news.newest", res => {
				this.news = res.data;
				if (this.news && localStorage.getItem("firstVisited")) {
					if (localStorage.getItem("whatIsNew")) {
						if (
							parseInt(localStorage.getItem("whatIsNew")) <
							res.data.createdAt
						) {
							this.toggleModal();
							localStorage.setItem(
								"whatIsNew",
								res.data.createdAt
							);
						}
					} else {
						if (
							parseInt(localStorage.getItem("firstVisited")) <
							res.data.createdAt
						) {
							this.toggleModal();
						}
						localStorage.setItem("whatIsNew", res.data.createdAt);
					}
				} else if (!localStorage.getItem("firstVisited"))
					localStorage.setItem("firstVisited", Date.now());
			});
		});
	},
	methods: {
		toggleModal() {
			this.isModalActive = !this.isModalActive;
		},
		formatDate: unix => {
			return format(unix, "dd-MM-yyyy");
		}
	},
	events: {
		closeModal() {
			this.isModalActive = false;
		}
	}
};
</script>

<style lang="scss" scoped>
@import "styles/global.scss";

.modal-card-head {
	border-bottom: none;
	background-color: ghostwhite;
	padding: 15px;
}

.modal-card-title {
	font-size: 14px;
}

.delete {
	background: transparent;
	&:hover {
		background: transparent;
	}

	&:before,
	&:after {
		background-color: #bbb;
	}
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
