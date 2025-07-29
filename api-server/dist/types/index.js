"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeAction = exports.SessionType = exports.FieldType = exports.AccessLevel = exports.AdminRole = void 0;
var AdminRole;
(function (AdminRole) {
    AdminRole["MASTER_ADMIN"] = "master_admin";
    AdminRole["ADMIN"] = "admin";
    AdminRole["PROJECT_ADMIN"] = "project_admin";
    AdminRole["LIMITED_ADMIN"] = "limited_admin";
})(AdminRole || (exports.AdminRole = AdminRole = {}));
var AccessLevel;
(function (AccessLevel) {
    AccessLevel["FULL"] = "full";
    AccessLevel["PROJECTS_ONLY"] = "projects_only";
    AccessLevel["READ_ONLY"] = "read_only";
    AccessLevel["CUSTOM"] = "custom";
})(AccessLevel || (exports.AccessLevel = AccessLevel = {}));
var FieldType;
(function (FieldType) {
    FieldType["STRING"] = "string";
    FieldType["NUMBER"] = "number";
    FieldType["BOOLEAN"] = "boolean";
    FieldType["DATE"] = "date";
    FieldType["DATETIME"] = "datetime";
    FieldType["JSON"] = "json";
    FieldType["REFERENCE"] = "reference";
    FieldType["FILE"] = "file";
})(FieldType || (exports.FieldType = FieldType = {}));
var SessionType;
(function (SessionType) {
    SessionType["ADMIN"] = "admin";
    SessionType["PROJECT"] = "project";
})(SessionType || (exports.SessionType = SessionType = {}));
var ChangeAction;
(function (ChangeAction) {
    ChangeAction["CREATE"] = "create";
    ChangeAction["UPDATE"] = "update";
    ChangeAction["DELETE"] = "delete";
})(ChangeAction || (exports.ChangeAction = ChangeAction = {}));
//# sourceMappingURL=index.js.map