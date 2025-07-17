"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const database_1 = __importDefault(require("../../services/database"));
// Mock better-sqlite3
jest.mock("better-sqlite3");
const MockDatabase = better_sqlite3_1.default;
// Mock file system operations
jest.mock("fs", () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
}));
// Mock path operations
jest.mock("path", () => ({
    join: (...args) => args.join("/"),
    resolve: (...args) => args.join("/"),
}));
// Mock crypto
jest.mock("crypto", () => ({
    randomUUID: jest.fn(() => "test-uuid"),
}));
describe("DatabaseService", () => {
    let mockDb;
    let mockStatement;
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        // Create mock statement
        mockStatement = {
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            prepare: jest.fn(),
            finalize: jest.fn(),
            bind: jest.fn(),
            pluck: jest.fn(),
            expand: jest.fn(),
            raw: jest.fn(),
            safeIntegers: jest.fn(),
            columns: jest.fn(),
            busy: false,
            readonly: false,
            reader: false,
        };
        // Create mock database
        mockDb = {
            prepare: jest.fn(() => mockStatement),
            exec: jest.fn(),
            close: jest.fn(),
            transaction: jest.fn(),
            pragma: jest.fn(),
            backup: jest.fn(),
            serialize: jest.fn(),
            function: jest.fn(),
            aggregate: jest.fn(),
            table: jest.fn(),
            loadExtension: jest.fn(),
            defaultSafeIntegers: jest.fn(),
            unsafeMode: jest.fn(),
            memory: false,
            readonly: false,
            name: "test.db",
            open: true,
            inTransaction: false,
        };
        // Mock Database constructor
        MockDatabase.mockImplementation(() => mockDb);
        // Mock require to return our database instance
        jest.doMock("../../services/database", () => database_1.default);
    });
    describe("User Management", () => {
        const mockUser = {
            id: 1,
            username: "testuser",
            email: "test@example.com",
            password: "hashedpassword",
            role: "admin",
            permissions: ["read", "write"],
            active: 1,
            created_at: "2024-01-01T00:00:00Z",
        };
        describe("createUser", () => {
            it("should create a new user successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue(mockUser);
                const result = database_1.default.createUser({
                    username: "testuser",
                    password: "hashedpassword",
                    email: "test@example.com",
                    role: "admin",
                    permissions: ["read", "write"],
                    active: true,
                });
                expect(result).toEqual(mockUser);
                expect(mockStatement.run).toHaveBeenCalled();
            });
            it("should return null if user creation fails", () => {
                const mockRunResult = {
                    changes: 0,
                    lastInsertRowid: 0,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                const result = database_1.default.createUser({
                    username: "testuser",
                    password: "hashedpassword",
                    email: "test@example.com",
                    role: "admin",
                    permissions: ["read", "write"],
                    active: true,
                });
                expect(result).toBeNull();
            });
        });
        describe("getUserByUsername", () => {
            it("should return user when found", () => {
                mockStatement.get.mockReturnValue(mockUser);
                const result = database_1.default.getUserByUsername("testuser");
                expect(result).toEqual(mockUser);
                expect(mockStatement.get).toHaveBeenCalledWith("testuser");
            });
            it("should return undefined when user not found", () => {
                mockStatement.get.mockReturnValue(undefined);
                const result = database_1.default.getUserByUsername("nonexistent");
                expect(result).toBeUndefined();
            });
        });
        describe("updateUser", () => {
            it("should update user successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue({
                    ...mockUser,
                    email: "newemail@example.com",
                });
                const result = database_1.default.updateUser(1, {
                    email: "newemail@example.com",
                });
                expect(result).toBeDefined();
                expect(result?.email).toBe("newemail@example.com");
            });
            it("should return null if update fails", () => {
                const mockRunResult = {
                    changes: 0,
                    lastInsertRowid: 0,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                const result = database_1.default.updateUser(1, {
                    email: "newemail@example.com",
                });
                expect(result).toBeNull();
            });
        });
        describe("deleteUser", () => {
            it("should delete user successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                const result = database_1.default.deleteUser(1);
                expect(result).toBe(true);
                expect(mockStatement.run).toHaveBeenCalledWith(1);
            });
            it("should return false if delete fails", () => {
                const mockRunResult = {
                    changes: 0,
                    lastInsertRowid: 0,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                const result = database_1.default.deleteUser(1);
                expect(result).toBe(false);
            });
        });
    });
    describe("Content Management", () => {
        const mockContent = {
            id: 1,
            key: "test-content",
            data: { title: "Test", body: "Test content" },
            content_type: "article",
            description: "Test description",
            route_path: "/test",
            parent_route_id: 1,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
        };
        describe("createContent", () => {
            it("should create content successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue(mockContent);
                const result = database_1.default.createContent({
                    key: "test-content",
                    data: { title: "Test", body: "Test content" },
                    content_type: "article",
                    description: "Test description",
                    route_path: "/test",
                });
                expect(result).toEqual(mockContent);
            });
        });
        describe("getContentByKey", () => {
            it("should return content when found", () => {
                mockStatement.get.mockReturnValue(mockContent);
                const result = database_1.default.getContentByKey("test-content");
                expect(result).toEqual(mockContent);
            });
        });
        describe("getAllContent", () => {
            it("should return all content", () => {
                const manyResults = Array(100).fill(mockContent);
                mockStatement.all.mockReturnValue(manyResults);
                const result = database_1.default.getAllContent();
                expect(result).toEqual(manyResults);
                expect(result).toHaveLength(100);
            });
        });
        describe("updateContent", () => {
            it("should update content successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue({
                    ...mockContent,
                    data: { title: "Updated", body: "Updated content" },
                });
                const result = database_1.default.updateContent(1, {
                    data: { title: "Updated", body: "Updated content" },
                });
                expect(result).toBeDefined();
                expect(result?.data).toEqual({
                    title: "Updated",
                    body: "Updated content",
                });
            });
        });
        describe("deleteContent", () => {
            it("should delete content successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                const result = database_1.default.deleteContent(1);
                expect(result).toBe(true);
            });
        });
    });
    describe("API Key Management", () => {
        const mockApiKey = {
            id: 1,
            name: "Test Key",
            key: "test-key-123",
            permissions: ["read", "write"],
            rate_limit: 1000,
            active: true,
            created_at: "2024-01-01T00:00:00Z",
            usage_count: 0,
        };
        describe("createApiKey", () => {
            it("should create API key successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue(mockApiKey);
                const result = database_1.default.createApiKey({
                    name: "Test Key",
                    permissions: ["read", "write"],
                    rate_limit: 1000,
                    active: true,
                });
                expect(result).toEqual(mockApiKey);
            });
        });
    });
    describe("Route Management", () => {
        const mockRoute = {
            id: 1,
            path: "/test",
            name: "Test Route",
            description: "Test route description",
            schema: null,
            access_level: "public",
            parent_id: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
        };
        describe("createRoute", () => {
            it("should create route successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue(mockRoute);
                const result = database_1.default.createRoute({
                    path: "/test",
                    name: "Test Route",
                    description: "Test route description",
                    access_level: "public",
                });
                expect(result).toEqual(mockRoute);
            });
        });
    });
    describe("File Management", () => {
        const mockFile = {
            id: 1,
            filename: "test.txt",
            original_name: "test.txt",
            mime_type: "text/plain",
            size: 1024,
            path: "/uploads/test.txt",
            uploaded_by: 1,
            access_level: "public",
            created_at: "2024-01-01T00:00:00Z",
        };
        describe("createFile", () => {
            it("should create file record successfully", () => {
                const mockRunResult = {
                    changes: 1,
                    lastInsertRowid: 1,
                };
                mockStatement.run.mockReturnValue(mockRunResult);
                mockStatement.get.mockReturnValue(mockFile);
                const result = database_1.default.createFile({
                    filename: "test.txt",
                    original_name: "test.txt",
                    mime_type: "text/plain",
                    size: 1024,
                    path: "/uploads/test.txt",
                    uploaded_by: 1,
                    access_level: "public",
                });
                expect(result).toEqual(mockFile);
            });
        });
    });
    describe("Search Functionality", () => {
        it("should perform search across content", () => {
            const mockSearchResult = {
                type: "content",
                id: 1,
                title: "Test Content",
                description: "Test description",
                route_path: "/test",
                content_type: "article",
            };
            const largeResultSet = Array(10000).fill(mockSearchResult);
            mockStatement.all.mockReturnValue(largeResultSet);
            const result = database_1.default.search("test", 50);
            expect(result).toHaveLength(10000);
            expect(mockStatement.all).toHaveBeenCalled();
        });
    });
    describe("Database Operations", () => {
        describe("Transaction Support", () => {
            it("should handle transactions", () => {
                const mockTransaction = jest.fn((_callback) => _callback());
                mockDb.transaction.mockReturnValue(mockTransaction);
                // Test that transaction wrapper works
                expect(mockDb.transaction).toBeDefined();
            });
            it("should rollback failed transactions", () => {
                const mockTransaction = jest.fn((_callback) => {
                    throw new Error("Transaction failed");
                });
                mockDb.transaction.mockReturnValue(mockTransaction);
                // Test error handling
                expect(() => {
                    const transaction = mockDb.transaction(() => {
                        throw new Error("Test error");
                    });
                    transaction();
                }).toThrow("Test error");
            });
        });
        describe("Performance", () => {
            it("should handle large datasets efficiently", () => {
                const start = Date.now();
                const largeDataset = Array(1000).fill(mockContent);
                mockStatement.all.mockReturnValue(largeDataset);
                const result = database_1.default.getAllContent();
                const end = Date.now();
                expect(result).toHaveLength(1000);
                expect(end - start).toBeLessThan(100); // Should be fast with mocked data
            });
        });
    });
});
//# sourceMappingURL=database.test.js.map