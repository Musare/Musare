/* eslint-disable import/no-cycle */

import Toast from "toasters";
import ws from "@/ws";

export default {
	resolve(reportId) {
		return new Promise((resolve, reject) => {
			ws.socket.dispatch("reports.resolve", reportId, res => {
				new Toast(res.message);
				if (res.status === "success")
					return resolve({ status: "success" });
				return reject(new Error(res.message));
			});
		});
	},
	remove(reportId) {
		return new Promise((resolve, reject) => {
			ws.socket.dispatch("reports.remove", reportId, res => {
				new Toast(res.message);
				if (res.status === "success")
					return resolve({ status: "success" });
				return reject(new Error(res.message));
			});
		});
	}
};
