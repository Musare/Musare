<script setup lang="ts"></script>

<template>
	<div class="admin-tab container">
		<page-metadata title="Admin | YouTube" />
		<div class="card tab-info">
			<div class="info-row">
				<h1>SoundCloud API</h1>
			</div>
			<div class="button-row">
				<!-- <run-job-dropdown :jobs="jobs" /> -->
			</div>
		</div>
	</div>
</template>

<style lang="less" scoped>
.night-mode .admin-tab {
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
			background-color: var(--dark-grey-2) !important;
		}

		strong {
			color: var(--light-grey-2);
		}
	}

	.card .quotas .card.quota {
		background-color: var(--dark-grey-2) !important;
	}
}

.admin-tab {
	td {
		vertical-align: middle;
	}

	.is-primary:focus {
		background-color: var(--primary-color) !important;
	}

	.card {
		&.charts {
			flex-direction: row !important;

			.chart {
				width: 50%;
			}

			@media screen and (max-width: 1100px) {
				flex-direction: column !important;

				.chart {
					width: unset;

					&:not(:first-child) {
						margin-top: 10px;
					}
				}
			}
		}

		.quotas {
			display: flex;
			flex-direction: row !important;
			row-gap: 10px;
			column-gap: 10px;

			.card.quota {
				background-color: var(--light-grey) !important;
				padding: 10px !important;
				flex-basis: 33.33%;

				&:not(:last-child) {
					margin-right: 10px;
				}

				h5 {
					margin-bottom: 5px !important;
				}
			}

			@media screen and (max-width: 1100px) {
				flex-direction: column !important;

				.card.quota {
					flex-basis: unset;
				}
			}
		}
	}
}
</style>
