<template>
	<div>
		<table class="table">
			<thead>
				<tr>
					<th
						v-for="column in columns"
						:key="column.name"
						:class="{ sortable: column.sortable }"
						@click="changeSort(column)"
					>
						{{ column.displayName }}
						<span
							v-if="column.sortable && sort[column.sortProperty]"
							>({{ sort[column.sortProperty] }})</span
						>
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="item in data" :key="item._id">
					<td
						v-for="column in columns"
						:key="`${item._id}-${column.name}`"
					>
						<slot
							:name="`column-${column.name}`"
							:item="item"
						></slot>
					</td>
				</tr>
			</tbody>
		</table>
		<br />
		<div class="control">
			<label class="label">Items per page</label>
			<p class="control select">
				<select v-model.number="pageSize" @change="getData()">
					<option value="10">10</option>
					<option value="25">25</option>
					<option value="50">50</option>
					<option value="100">100</option>
					<option value="250">250</option>
					<option value="500">500</option>
					<option value="1000">1000</option>
				</select>
			</p>
		</div>
		<br />
		<p>Page {{ page }} / {{ lastPage }}</p>
		<br />
		<button class="button is-primary" @click="changePage(page - 1)">
			Go to previous page</button
		>&nbsp;
		<button class="button is-primary" @click="changePage(page + 1)">
			Go to next page</button
		>&nbsp;
		<button class="button is-primary" @click="changePage(1)">
			Go to first page</button
		>&nbsp;
		<button class="button is-primary" @click="changePage(lastPage)">
			Go to last page
		</button>
	</div>
</template>

<script>
import { mapGetters } from "vuex";

import Toast from "toasters";

import ws from "@/ws";

export default {
	props: {
		columns: { type: Array, default: null },
		dataAction: { type: String, default: null }
	},
	data() {
		return {
			page: 1,
			pageSize: 10,
			data: [],
			count: 0, // TODO Rename
			sort: {
				title: "ascending"
			}
		};
	},
	computed: {
		properties() {
			return Array.from(
				new Set(this.columns.flatMap(column => column.properties))
			);
		},
		lastPage() {
			return Math.ceil(this.count / this.pageSize);
		},
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		ws.onConnect(this.init);
	},
	methods: {
		init() {
			this.getData();
		},
		getData() {
			this.socket.dispatch(
				this.dataAction,
				this.page,
				this.pageSize,
				this.properties,
				this.sort,
				res => {
					console.log(111, res);
					new Toast(res.message);
					if (res.status === "success") {
						const { data, count } = res.data;
						this.data = data;
						this.count = count;
					}
				}
			);
		},
		changePage(page) {
			if (page < 1) return;
			if (page > this.lastPage) return;
			if (page === this.page) return;
			this.page = page;
			this.getData();
		},
		changeSort(column) {
			if (column.sortable) {
				if (this.sort[column.sortProperty] === undefined)
					this.sort[column.sortProperty] = "ascending";
				else if (this.sort[column.sortProperty] === "ascending")
					this.sort[column.sortProperty] = "descending";
				else if (this.sort[column.sortProperty] === "descending")
					delete this.sort[column.sortProperty];
				this.getData();
			}
		}
	}
};
</script>

<style lang="scss" scoped>
.table {
	.sortable {
		cursor: pointer;
	}
}
</style>
