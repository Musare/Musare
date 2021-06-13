<template>
	<div class="reports-tab">
		<div class="report-summary">
			<div class="report-summary-header">
				<p class="report-summary-title">Summary</p>
				<div class="report-summary-actions universal-item-actions">
					<i
						class="material-icons resolve-all-icon"
						content="Resolve all"
						v-tippy
						>done_all</i
					>
				</div>
			</div>
			<div class="report-summary-items">
				<div class="report-summary-item report-summary-item-resolved">
					<i
						class="material-icons duration-icon report-summary-item-left-icon"
						content="Duration"
						v-tippy
						>timer</i
					>
					<p class="report-summary-item-description">
						<span class="report-summary-item-description-1"
							>Video starts too soon</span
						>
						<span class="report-summary-item-description-2"
							>The video ends 3 seconds too late</span
						>
						<span class="report-summary-item-description-2"
							>The video ends 3 seconds too late</span
						>
						<span class="report-summary-item-description-2"
							>The video ends 3 seconds too late</span
						>
					</p>
					<div
						class="report-summary-item-actions universal-item-actions"
					>
						<i
							class="material-icons resolve-icon"
							content="Resolve"
							v-tippy
							>done</i
						>
					</div>
				</div>
				<div class="report-summary-item report-summary-item-resolved">
					<i
						class="material-icons thumbnail-icon report-summary-item-left-icon"
						content="Thumbnail"
						v-tippy
						>image</i
					>
					<p class="report-summary-item-description">
						<span class="report-summary-item-description-1"
							>Video starts too soon</span
						>
					</p>
					<div
						class="report-summary-item-actions universal-item-actions"
					>
						<i
							class="material-icons resolve-icon"
							content="Resolve"
							v-tippy
							>done</i
						>
					</div>
				</div>
			</div>
		</div>
		<hr />
		<div class="report-items">
			<div class="report-item">
				<div class="report-item-header">
					<p class="report-item-summary">Duration issues</p>
					<div class="report-item-actions universal-item-actions">
						<i
							class="material-icons resolve-all-icon"
							content="Resolve all"
							v-tippy
							>done_all</i
						>
					</div>
				</div>
				<div class="report-sub-items">
					<div class="report-sub-item report-sub-item-resolved">
						<i
							class="material-icons duration-icon report-sub-item-left-icon"
							content="Duration"
							v-tippy
							>timer</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Video starts too soon</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons unresolve-icon"
								content="Unresolve"
								v-tippy
								>remove</i
							>
						</div>
					</div>
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons duration-icon report-sub-item-left-icon"
							content="Duration"
							v-tippy
							>timer</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Video ends too late</span
							>
							<span class="report-sub-item-description-2"
								>The video ends 3 seconds too late</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
				</div>
			</div>
			<div class="report-item">
				<div class="report-item-header">
					<p class="report-item-summary">
						Duration and thumbnail issues
					</p>
					<div class="report-item-actions universal-item-actions">
						<i
							class="material-icons resolve-all-icon"
							content="Resolve all"
							v-tippy
							>done_all</i
						>
					</div>
				</div>
				<div class="report-sub-items">
					<div class="report-sub-item report-sub-item-resolved">
						<i
							class="material-icons duration-icon report-sub-item-left-icon"
							content="Duration"
							v-tippy
							>timer</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Video starts too soon</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons unresolve-icon"
								content="Unresolve"
								v-tippy
								>remove</i
							>
						</div>
					</div>
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons thumbnail-icon report-sub-item-left-icon"
							content="Thumbnail"
							v-tippy
							>image</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Thumbnail is incorrect</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
				</div>
			</div>
			<div class="report-item">
				<div class="report-item-header">
					<p class="report-item-summary">Various issues</p>
					<div class="report-item-actions universal-item-actions">
						<i
							class="material-icons resolve-all-icon"
							content="Resolve all"
							v-tippy
							>done_all</i
						>
					</div>
				</div>
				<div class="report-sub-items">
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons duration-icon report-sub-item-left-icon"
							content="Duration"
							v-tippy
							>timer</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Video starts too soon</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons video-icon report-sub-item-left-icon"
							content="Video"
							v-tippy
							>tv</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Video doesn't exist</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons thumbnail-icon report-sub-item-left-icon"
							content="Thumbnail"
							v-tippy
							>image</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Thumbnail is incorrect</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons artists-icon report-sub-item-left-icon"
							content="Artists"
							v-tippy
							>record_voice_over</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Artists is missing</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
					<div class="report-sub-item report-sub-item-unresolved">
						<i
							class="material-icons title-icon report-sub-item-left-icon"
							content="Title"
							v-tippy
							>title</i
						>
						<p class="report-sub-item-description">
							<span class="report-sub-item-description-1"
								>Title is misspelled</span
							>
						</p>
						<div
							class="report-sub-item-actions universal-item-actions"
						>
							<i
								class="material-icons resolve-icon"
								content="Resolve"
								v-tippy
								>done</i
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters /* , mapActions */ } from "vuex";

// import Toast from "toasters";

export default {
	data() {
		return {};
	},
	computed: {
		...mapState("modals/editSong", {
			reports: state => state.reports
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {}
	// methods: {
	// 	...mapActions("modals/editSong", ["selectDiscogsInfo"])
	// }
};
</script>

<style lang="scss" scoped>
.report-summary {
	background-color: var(--white);
	border: 0.5px solid var(--primary-color);
	border-radius: 5px;
	margin-bottom: 16px;
	padding: 8px;

	.report-summary-header {
		display: flex;
		margin-bottom: 8px;

		.report-summary-title {
			font-weight: 700;
			flex: 1;
		}

		.report-summary-actions {
			height: 24px;
			margin-right: 4px;

			.resolve-all-icon {
				color: var(--green);
			}
		}
	}

	.report-summary-items {
		.report-summary-item {
			border: 0.5px solid var(--black);
			margin-top: -1px;
			line-height: 24px;
			display: flex;
			padding: 4px;
			display: flex;

			&:first-child {
				border-radius: 3px 3px 0 0;
			}

			&:last-child {
				border-radius: 0 0 3px 3px;
			}

			.report-summary-item-left-icon {
				margin-right: 8px;
				margin-top: auto;
				margin-bottom: auto;
			}

			.report-summary-item-description {
				flex: 1;
				display: flex;
				flex-direction: column;

				.report-summary-item-description-1 {
					font-size: 14px;
				}

				.report-summary-item-description-2::before {
					content: "- ";
					position: absolute;
					left: 0px;
				}

				.report-summary-item-description-2 {
					font-size: 12px;
					line-height: 20px;
					padding-left: 12px;
					position: relative;
				}
			}

			.report-summary-item-actions {
				height: 24px;
				margin-left: 8px;
				margin-top: auto;
				margin-bottom: auto;

				i {
					cursor: pointer;
				}

				.resolve-icon {
					color: var(--green);
				}
			}
		}
	}
}

.report-items {
	.report-item {
		background-color: var(--white);
		border: 0.5px solid var(--primary-color);
		border-radius: 5px;
		margin-bottom: 16px;
		padding: 8px;

		.report-item-header {
			display: flex;
			margin-bottom: 8px;

			.report-item-summary {
				font-weight: 700;
				flex: 1;
			}

			.report-item-actions {
				height: 24px;
				margin-right: 4px;

				.resolve-all-icon {
					color: var(--green);
				}
			}
		}

		.report-sub-items {
			.report-sub-item {
				border: 0.5px solid var(--black);
				margin-top: -1px;
				line-height: 24px;
				display: flex;
				padding: 4px;
				display: flex;

				&:first-child {
					border-radius: 3px 3px 0 0;
				}

				&:last-child {
					border-radius: 0 0 3px 3px;
				}

				&.report-sub-item-resolved {
					.report-sub-item-description {
						text-decoration: line-through;
					}
				}

				// &.report-sub-item-unresolved {

				// }

				.report-sub-item-left-icon {
					margin-right: 8px;
					margin-top: auto;
					margin-bottom: auto;
				}

				.report-sub-item-description {
					flex: 1;
					display: flex;
					flex-direction: column;

					.report-sub-item-description-1 {
						font-size: 14px;
					}

					.report-sub-item-description-2 {
						font-size: 12px;
					}
				}

				.report-sub-item-actions {
					height: 24px;
					margin-left: 8px;
					margin-top: auto;
					margin-bottom: auto;

					i {
						cursor: pointer;
					}

					.resolve-icon {
						color: var(--green);
					}

					.unresolve-icon {
						color: var(--red);
					}
				}
			}
		}
	}
}
</style>
