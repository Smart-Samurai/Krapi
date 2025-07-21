import express from "express";
import "./services/project-database";
declare const app: express.Application;
declare function broadcastToAll(message: Record<string, unknown>): void;
export { broadcastToAll };
export default app;
//# sourceMappingURL=app.d.ts.map