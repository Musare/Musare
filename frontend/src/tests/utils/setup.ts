import "lofig";
import CustomWebSocketMock from "@/classes/__mocks__/CustomWebSocket.class";

vi.clearAllMocks();

vi.spyOn(CustomWebSocketMock.prototype, "on");
vi.spyOn(CustomWebSocketMock.prototype, "dispatch");
vi.mock("@/classes/CustomWebSocket.class");
