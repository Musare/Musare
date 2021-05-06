<template>
	<div v-if="news !== null">
		<modal :title="`News posted ${timeCreated}`">
			<div slot="body">
				<div
					class="section news-item"
					v-html="marked(news.markdown)"
				></div>
			</div>
		</modal>
	</div>
</template>

<script>
import { formatDistance } from "date-fns";
import marked from "marked";
import { mapGetters, mapActions } from "vuex";

import Modal from "../Modal.vue";

export default {
	components: { Modal },
	data() {
		return {
			isModalActive: false,
			news: null
		};
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		}),
		timeCreated() {
			return formatDistance(this.news.createdAt, new Date(), {
				addSuffix: true
			});
		}
	},
	mounted() {
		this.socket.dispatch("news.newest", res => {
			if (res.status !== "success") return;

			const { news } = res.data;

			this.news = news;
			if (this.news && localStorage.getItem("firstVisited")) {
				if (localStorage.getItem("whatIsNew")) {
					if (
						parseInt(localStorage.getItem("whatIsNew")) <
						news.createdAt
					) {
						this.openModal("whatIsNew");
						localStorage.setItem("whatIsNew", news.createdAt);
					}
				} else {
					if (
						parseInt(localStorage.getItem("firstVisited")) <
						news.createdAt
					)
						this.openModal("whatIsNew");
					localStorage.setItem("whatIsNew", news.createdAt);
				}
			} else if (!localStorage.getItem("firstVisited"))
				localStorage.setItem("firstVisited", Date.now());
		});
	},
	methods: {
		marked,
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.modal-card,
	.modal-card-head,
	.modal-card-body {
		background-color: var(--dark-grey-3);
	}

	strong,
	p {
		color: var(--light-grey-2);
	}
}

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
		background-color: var(--light-grey-3);
	}
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
