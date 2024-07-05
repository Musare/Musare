import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinonChai from "sinon-chai";
import LogBook from "@/LogBook";

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

if (typeof beforeEach !== "undefined")
	beforeEach(async function () {
		await LogBook.updateOutput("console", "exclude", "set", [
			{
				// @ts-ignore
				type: "error"
			},
			{
				// @ts-ignore
				type: "debug"
			},
			{
				// @ts-ignore
				type: "info"
			},
			{
				// @ts-ignore
				type: "success"
			}
		]);
	});
