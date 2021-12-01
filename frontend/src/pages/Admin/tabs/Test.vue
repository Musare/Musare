<template>
	<div>
		<page-metadata title="Admin | Test" />
		<div class="container">
			<advanced-table :columns="columns" data-action="songs.getData">
				<template #column-column1="slotProps">
					{{ slotProps.item.title }}
				</template>
				<template #column-column2="slotProps">
					{{ slotProps.item.artists.join(", ") }}
				</template>
			</advanced-table>
		</div>
	</div>
</template>

<script>
import AdvancedTable from "@/components/AdvancedTable.vue";

export default {
	components: {
		AdvancedTable
	},
	data() {
		return {
			columns: [
				{
					name: "column1",
					displayName: "Column 1",
					properties: ["title"],
					sortable: true,
					sortProperty: "title"
				},
				{
					name: "column2",
					displayName: "Column 2",
					properties: ["artists"],
					sortable: true,
					sortProperty: "artists"
				}
			]
		};
	},
	mounted() {},
	beforeUnmount() {},
	methods: {}
};
</script>

<style lang="scss" scoped></style>
