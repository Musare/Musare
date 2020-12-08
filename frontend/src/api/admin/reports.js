import Toast from "toasters";
import io from "../../io";

export default {
	resolve(reportId) {
		return new Promise((resolve, reject) => {
			io.getSocket(socket => {
				socket.emit("reports.resolve", reportId, res => {
					new Toast({ content: res.message, timeout: 3000 });
					if (res.status === "success")
						return resolve({ status: "success" });
					return reject(new Error(res.message));
				});
			});
		});
	}
};
