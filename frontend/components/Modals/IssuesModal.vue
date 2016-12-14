<template>
	<div class='modal is-active'>
		<div class='modal-background'></div>
		<div class='modal-card'>
			<header class='modal-card-head'>
				<p class='modal-card-title'>Report Issues</p>
				<button class='delete' @click='$parent.toggleModal()'></button>
			</header>
			<section class='modal-card-body'>

				<table class='table is-narrow'>
					<thead>
						<tr>
							<td>Issue</td>
							<td>Reasons</td>
						</tr>
					</thead>
					<tbody>
						<tr v-for='(index, issue) in $parent.editing.issues' track-by='$index'>
							<td>
								<span>{{ issue.name }}</span>
							</td>
							<td>
								<span>{{ issue.reasons }}</span>
							</td>
						</tr>
					</tbody>
				</table>

			</section>
			<footer class='modal-card-foot'>
				<a class='button is-primary' @click='$parent.resolve($parent.editing._id)'>
					<span>Resolve</span>
				</a>
				<a class='button is-danger' @click='$parent.toggleModal()'>
					<span>Cancel</span>
				</a>
			</footer>
		</div>
	</div>
</template>