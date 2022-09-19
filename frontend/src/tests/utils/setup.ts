import "lofig";
import SocketHandlerMock from "@/classes/__mocks__/SocketHandler.class";

vi.clearAllMocks();

vi.spyOn(SocketHandlerMock.prototype, "on");
vi.spyOn(SocketHandlerMock.prototype, "dispatch");
vi.mock("@/classes/SocketHandler.class");
