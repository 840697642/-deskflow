# Workbench API v1（仓库副本）

本文件是 `tri-mode` 代码仓库中的非敏感契约入口，完整的架构说明、知识流程和工具路由在工作区 `workspace-docs` 与私人 Obsidian Vault 中维护。

## Queries

```text
GET /api/workbench/summary
GET /api/tasks?projectId=&status=
GET /api/tasks/:id
GET /api/jobs?status=&module=
GET /api/jobs/:id
GET /api/modules/health
GET /api/modules
GET /api/modules/:id
GET /api/conversations?limit=20
GET /api/artifacts?limit=20
GET /api/inspector/:type/:id
```

## Commands

```text
POST /api/tasks/:id/complete
PATCH /api/tasks/:id
POST /api/jobs/:id/pause
POST /api/jobs/:id/resume
POST /api/jobs/:id/cancel
POST /api/jobs/:id/retry
POST /api/modules/:id/reconnect
```

`PATCH /api/jobs/:id` 接受 `{ "action": "pause|resume|cancel|retry" }`，用于兼容早期 Mock 客户端。

## Common rules

- 每个响应包含 `data` 或 `error`、`requestId`、`schemaVersion` 和 `timestamp`。
- 列表响应额外包含 `total`。
- 长任务立即返回 `jobId`（真实服务接入时适用）。
- 写操作应包含 `projectId`、`actor`、`clientMutationId` 和 `schemaVersion`；Mock 缺少时使用开发默认值。
- 重复的 `actor + clientMutationId + 操作` 不得重复创建任务或应用状态变化。
- 错误响应至少包含 `code`、`message`、`retryable`、`requestId` 和 `schemaVersion`。
- Mock 状态只存在于当前进程，重启后恢复 fixtures，不代表真实后端已完成。
