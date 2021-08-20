<template>
	<div>
		<page-metadata title="Admin | News" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Status</td>
						<td>Title</td>
						<td>Author</td>
						<td>Markdown</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="news in news" :key="news._id">
						<td class="news-item-status">{{ news.status }}</td>
						<td>
							<strong>{{ news.title }}</strong>
						</td>
						<td>
							<user-id-to-username
								:user-id="news.createdBy"
								:alt="news.createdBy"
								:link="true"
							/>
						</td>
						<td class="news-item-markdown">{{ news.markdown }}</td>
						<td>
							<button
								class="button is-primary"
								@click="edit(news._id)"
							>
								Edit
							</button>
							<confirm @confirm="remove(news._id)">
								<button class="button is-danger">Remove</button>
							</confirm>
						</td>
					</tr>
				</tbody>
			</table>

			<button class="is-primary button" @click="edit()">
				Create News Item
			</button>
		</div>

		<edit-news
			v-if="modals.editNews"
			:news-id="editingNewsId"
			sector="admin"
		/>
	</div>
</template>

<script>
import { mapActions, mapState, mapGetters } from "vuex";
import { defineAsyncComponent } from "vue";
import Toast from "toasters";

import ws from "@/ws";

import Confirm from "@/components/Confirm.vue";
import UserIdToUsername from "@/components/UserIdToUsername.vue";

export default {
	components: {
		Confirm,
		UserIdToUsername,
		EditNews: defineAsyncComponent(() =>
			import("@/components/modals/EditNews.vue")
		)
	},
	data() {
		return {
			editingNewsId: ""
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals
		}),
		...mapState("admin/news", {
			news: state => state.news
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.on("event:admin.news.created", res =>
			this.addNews(res.data.news)
		);

		this.socket.on("event:admin.news.updated", res =>
			this.updateNews(res.data.news)
		);

		this.socket.on("event:admin.news.deleted", res =>
			this.removeNews(res.data.newsId)
		);

		ws.onConnect(this.init);
	},
	methods: {
		edit(id) {
			if (id) this.editingNewsId = id;
			else this.editingNewsId = "";
			this.openModal("editNews");
		},
		remove(id) {
			this.socket.dispatch(
				"news.remove",
				id,
				res => new Toast(res.message)
			);
		},
		init() {
			this.socket.dispatch("news.index", res => {
				if (res.status === "success") this.setNews(res.data.news);
			});

			this.socket.dispatch("apis.joinAdminRoom", "news");
		},
		...mapActions("modalVisibility", ["openModal", "closeModal"]),
		...mapActions("admin/news", [
			"editNews",
			"addNews",
			"setNews",
			"removeNews",
			"updateNews"
		])
	}
};
</script>

<style lang="scss" scoped>
.night-mode {
	.table {
		color: var(--light-grey-2);
		background-color: var(--dark-grey-3);

		thead tr {
			background: var(--dark-grey-3);
			td {
				color: var(--white);
			}
		}

		tbody tr:hover {
			background-color: var(--dark-grey-4) !important;
		}

		tbody tr:nth-child(even) {
			background-color: var(--dark-grey-2);
		}

		strong {
			color: var(--light-grey-2);
		}
	}

	.card {
		background: var(--dark-grey-3);

		.card-header {
			box-shadow: 0 1px 2px rgba(10, 10, 10, 0.8);
		}

		p,
		.label {
			color: var(--light-grey-2);
		}
	}
}

.tag:not(:last-child) {
	margin-right: 5px;
}

td {
	vertical-align: middle;

	& > div {
		display: inline-flex;
	}
}

.is-info:focus {
	background-color: var(--primary-color);
}

.card-footer-item {
	color: var(--primary-color);
}

.news-item-status {
	text-transform: capitalize;
}

.news-item-markdown {
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
	max-width: 400px;
}
</style>
