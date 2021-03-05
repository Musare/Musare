<template>
	<div>
		<metadata title="Admin | News" />
		<div class="container">
			<table class="table is-striped">
				<thead>
					<tr>
						<td>Title</td>
						<td>Description</td>
						<td>Bugs</td>
						<td>Features</td>
						<td>Improvements</td>
						<td>Upcoming</td>
						<td>Options</td>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(news, index) in news" :key="index">
						<td>
							<strong>{{ news.title }}</strong>
						</td>
						<td>{{ news.description }}</td>
						<td>{{ news.bugs.join(", ") }}</td>
						<td>{{ news.features.join(", ") }}</td>
						<td>{{ news.improvements.join(", ") }}</td>
						<td>{{ news.upcoming.join(", ") }}</td>
						<td>
							<button
								class="button is-primary"
								@click="editNewsClick(news)"
							>
								Edit
							</button>
							<button
								class="button is-danger"
								@click="remove(news)"
							>
								Remove
							</button>
						</td>
					</tr>
				</tbody>
			</table>

			<div class="card is-fullwidth">
				<header class="card-header">
					<p class="card-header-title">Create News</p>
				</header>
				<div class="card-content">
					<div class="content">
						<label class="label">Title & Description</label>
						<div class="control is-horizontal">
							<div class="control is-grouped">
								<p class="control is-expanded">
									<input
										v-model="creating.title"
										class="input"
										type="text"
										placeholder="Title"
									/>
								</p>
								<p class="control is-expanded">
									<input
										v-model="creating.description"
										class="input"
										type="text"
										placeholder="Short description"
									/>
								</p>
							</div>
						</div>

						<div class="columns">
							<div class="column">
								<label class="label">Bugs</label>
								<p class="control has-addons">
									<input
										id="new-bugs"
										class="input"
										type="text"
										placeholder="Bug"
										@keyup.enter="addChange('bugs')"
									/>
									<a
										class="button is-info"
										href="#"
										@click="addChange('bugs')"
										>Add</a
									>
								</p>
								<span
									v-for="(bug, index) in creating.bugs"
									:key="index"
									class="tag is-info"
								>
									{{ bug }}
									<button
										class="delete is-info"
										@click="removeChange('bugs', index)"
									/>
								</span>
							</div>
							<div class="column">
								<label class="label">Features</label>
								<p class="control has-addons">
									<input
										id="new-features"
										class="input"
										type="text"
										placeholder="Feature"
										@keyup.enter="addChange('features')"
									/>
									<a
										class="button is-info"
										href="#"
										@click="addChange('features')"
										>Add</a
									>
								</p>
								<span
									v-for="(feature,
									index) in creating.features"
									:key="index"
									class="tag is-info"
								>
									{{ feature }}
									<button
										class="delete is-info"
										@click="removeChange('features', index)"
									/>
								</span>
							</div>
						</div>

						<div class="columns">
							<div class="column">
								<label class="label">Improvements</label>
								<p class="control has-addons">
									<input
										id="new-improvements"
										class="input"
										type="text"
										placeholder="Improvement"
										@keyup.enter="addChange('improvements')"
									/>
									<a
										class="button is-info"
										href="#"
										@click="addChange('improvements')"
										>Add</a
									>
								</p>
								<span
									v-for="(improvement,
									index) in creating.improvements"
									:key="index"
									class="tag is-info"
								>
									{{ improvement }}
									<button
										class="delete is-info"
										@click="
											removeChange('improvements', index)
										"
									/>
								</span>
							</div>
							<div class="column">
								<label class="label">Upcoming</label>
								<p class="control has-addons">
									<input
										id="new-upcoming"
										class="input"
										type="text"
										placeholder="Upcoming"
										@keyup.enter="addChange('upcoming')"
									/>
									<a
										class="button is-info"
										href="#"
										@click="addChange('upcoming')"
										>Add</a
									>
								</p>
								<span
									v-for="(upcoming,
									index) in creating.upcoming"
									:key="index"
									class="tag is-info"
								>
									{{ upcoming }}
									<button
										class="delete is-info"
										@click="removeChange('upcoming', index)"
									/>
								</span>
							</div>
						</div>
					</div>
				</div>
				<footer class="card-footer">
					<a class="card-footer-item" @click="createNews()" href="#"
						>Create</a
					>
				</footer>
			</div>
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

import Toast from "toasters";
import io from "../../../io";

import EditNews from "../../../components/modals/EditNews.vue";

export default {
	components: { EditNews },
	data() {
		return {
			editingNewsId: "",
			creating: {
				title: "",
				description: "",
				bugs: [],
				features: [],
				improvements: [],
				upcoming: []
			}
		};
	},
	computed: {
		...mapState("modalVisibility", {
			modals: state => state.modals.admin
		}),
		...mapState("admin/news", {
			news: state => state.news
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		this.socket.dispatch("news.index", res =>
			res.data.forEach(news => this.addNews(news))
		);

		this.socket.on("event:admin.news.created", news => this.addNews(news));

		this.socket.on("event:admin.news.updated", updatedNews =>
			this.updateNews(updatedNews)
		);

		this.socket.on("event:admin.news.removed", news =>
			this.removeNews(news._id)
		);

		if (this.socket.readyState === 1) this.init();
		io.onConnect(() => this.init());
	},
	methods: {
		createNews() {
			const {
				creating: { bugs, features, improvements, upcoming }
			} = this;

			if (this.creating.title === "")
				return new Toast({
					content: "Field (Title) cannot be empty",
					timeout: 3000
				});
			if (this.creating.description === "")
				return new Toast({
					content: "Field (Description) cannot be empty",
					timeout: 3000
				});
			if (
				bugs.length <= 0 &&
				features.length <= 0 &&
				improvements.length <= 0 &&
				upcoming.length <= 0
			)
				return new Toast({
					content: "You must have at least one News Item",
					timeout: 3000
				});

			return this.socket.dispatch(
				"news.create",
				this.creating,
				result => {
					new Toast(result.message, 4000);
					if (result.status === "success")
						this.creating = {
							title: "",
							description: "",
							bugs: [],
							features: [],
							improvements: [],
							upcoming: []
						};
				}
			);
		},
		remove(news) {
			this.socket.dispatch(
				"news.remove",
				news,
				res => new Toast({ content: res.message, timeout: 8000 })
			);
		},
		editNewsClick(news) {
			this.editingNewsId = news._id;
			this.openModal({ sector: "admin", modal: "editNews" });
		},
		addChange(type) {
			const change = document.getElementById(`new-${type}`).value.trim();

			if (this.creating[type].indexOf(change) !== -1)
				return new Toast({
					content: `Tag already exists`,
					timeout: 3000
				});

			if (change) {
				document.getElementById(`new-${type}`).value = "";
				this.creating[type].push(change);
				return true;
			}
			return new Toast({
				content: `${type} cannot be empty`,
				timeout: 3000
			});
		},
		removeChange(type, index) {
			this.creating[type].splice(index, 1);
		},
		init() {
			this.socket.dispatch("apis.joinAdminRoom", "news", () => {});
		},
		...mapActions("modalVisibility", ["openModal", "closeModal"]),
		...mapActions("admin/news", [
			"editNews",
			"addNews",
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
}

.is-info:focus {
	background-color: var(--primary-color);
}

.card-footer-item {
	color: var(--primary-color);
}
</style>
