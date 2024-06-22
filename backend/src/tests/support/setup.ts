import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import sinonChai from "sinon-chai";

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

afterEach(async function () {
	sinon.reset();
});
