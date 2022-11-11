import Toast from "toasters";
import { useWebsocketsStore } from "@/stores/websockets";

export const useReports = () => {
	const { socket } = useWebsocketsStore();

	const resolveReport = ({ reportId, value }) =>
		new Promise((resolve, reject) => {
			socket.dispatch("reports.resolve", reportId, value, res => {
				new Toast(res.message);
				if (res.status === "success")
					return resolve({ status: "success" });
				return reject(new Error(res.message));
			});
		});

	const removeReport = reportId =>
		new Promise((resolve, reject) => {
			socket.dispatch("reports.remove", reportId, res => {
				new Toast(res.message);
				if (res.status === "success")
					return resolve({ status: "success" });
				return reject(new Error(res.message));
			});
		});

	return {
		resolveReport,
		removeReport
	};
};
