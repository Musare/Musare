<template>
	<div class="universal-item punishment-item">
		<div class="item-icon">
			<p class="is-expanded checkbox-control">
				<label class="switch">
					<input type="checkbox" v-model="active" disabled />
					<span class="slider round"></span>
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

<script>
import { mapActions } from "vuex";
import { format, formatDistance, parseISO } from "date-fns";

export default {
	props: {
		punishment: { type: Object, default: () => {} }
	},
	data() {
		return {
			active: false
		};
	},
	watch: {
		punishment(punishment) {
			this.active =
				punishment.active &&
				new Date(this.punishment.expiresAt).getTime() > Date.now();
		}
	},
	methods: {
		formatDistance,
		format,
		parseISO,
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

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

		.checkbox-control .slider {
			cursor: default;
		}
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
