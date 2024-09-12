// import Migration from "@/modules/DataModule/Migration";

// export default class Migration170526579600 extends Migration {
// 	async up() {
// 		// await this._getDb().createCollection("minifiedUsers", {
// 		// 	viewOn: "users",
// 		// 	pipeline: [
// 		// 		{
// 		// 			$project: {
// 		// 				_id: 1,
// 		// 				name: 1,
// 		// 				username: 1,
// 		// 				location: 1,
// 		// 				bio: 1,
// 		// 				role: 1,
// 		// 				avatar: 1,
// 		// 				createdAt: 1,
// 		// 				updatedAt: 1
// 		// 			}
// 		// 		}
// 		// 	]
// 		// });
// 	}

// 	async down() {
// 		await this._getDb().dropCollection("minifiedUsers");
// 	}
// }
