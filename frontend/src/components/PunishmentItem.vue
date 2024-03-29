<script setup lang="ts">
import { defineAsyncComponent, computed } from "vue";
import { format, formatDistance, parseISO } from "date-fns";
import { useUserAuthStore } from "@/stores/userAuth";

const UserLink = defineAsyncComponent(
	() => import("@/components/UserLink.vue")
);

const props = defineProps({
	punishment: { type: Object, default: () => {} }
});

defineEmits(["deactivate"]);

const { hasPermission } = useUserAuthStore();

const active = computed(
	() =>
		props.punishment.active &&
		new Date(props.punishment.expiresAt).getTime() > Date.now()
);
</script>

<template>
	<div class="universal-item punishment-item">
		<div class="item-icon">
			<p class="is-expanded checkbox-control">
				<label
					class="switch"
					:class="{
						disabled: !(
							hasPermission('punishments.deactivate') && active
						)
					}"
				>
					<input
						type="checkbox"
						:checked="active"
						@click="
							hasPermission('punishments.deactivate') && active
								? $emit('deactivate', $event)
								: $event.preventDefault()
						"
					/>
					<span
						class="slider round"
						:class="{
							disabled: !(
								hasPermission('punishments.deactivate') &&
								active
							)
						}"
					></span>
				</label>
			</p>
			<p>
				<strong>{{ active ? "Active" : "Inactive" }}</strong>
			</p>
		</div>

		<div class="item-title-description">
			<h2 v-if="punishment.type === 'banUserId'" class="item-title">
				<strong>Punishment</strong> for user
				<user-link
					:user-id="punishment.value"
					:alt="punishment.value"
				/>
			</h2>
			<h2 class="item-title" v-else>
				<strong>Punishment</strong> for IP
				{{ punishment.value }}
			</h2>
			<h3 class="item-title-2">Reason: {{ punishment.reason }}</h3>
			<ul>
				<li class="item-description" :title="punishment.expiresAt">
					Expires
					{{
						formatDistance(
							parseISO(punishment.expiresAt),
							new Date(),
							{ addSuffix: true }
						)
					}}
					({{
						format(
							parseISO(punishment.expiresAt),
							"MMMM do yyyy, h:mm:ss a"
						)
					}})
				</li>
				<li class="item-description">
					Punished by
					<user-link
						:user-id="punishment.punishedBy"
						:alt="punishment.punishedBy"
					/>

					<span :title="punishment.punishedAt">
						&nbsp;{{
							formatDistance(
								parseISO(punishment.punishedAt),
								new Date(),
								{ addSuffix: true }
							)
						}}
						({{
							format(
								parseISO(punishment.punishedAt),
								"MMMM do yyyy, h:mm:ss a"
							)
						}})
					</span>
				</li>
			</ul>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode {
	.punishment-item {
		background-color: var(--dark-grey-2) !important;
		border: 0 !important;
	}
}

.punishment-item {
	padding: 15px;
	justify-content: flex-start;

	.item-icon {
		min-width: 85px;
		max-width: 85px;
		height: 85px;
		margin-left: 20px;
		margin-right: 35px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-evenly;
		border: 1px solid var(--light-grey-3);
		border-radius: @border-radius;
	}

	.item-title {
		font-size: 19px;
		margin: 0;
	}

	.item-title-2 {
		font-size: 17px;
		margin: 0;
	}

	ul {
		list-style: inside;
		margin-top: 10px;

		.item-description {
			font-size: 14px;
			margin: 0;
		}
	}
}
</style>
