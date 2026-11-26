# 0002 One oRPC contract, served by Nuxt

Status: Accepted

## Context

Glot needs a typed API for its own app, a public REST API with an OpenAPI document, and tools for agents, while staying easy to self-host.

## Decision

`@glot/contract` declares every procedure with oRPC. The Nuxt server implements it once and serves it three ways: RPC at `/rpc`, REST at `/api/v1` with its OpenAPI document and reference, and MCP at `/mcp`. `@glot/sdk` builds typed clients from the contract alone.

## Consequences

- One process to deploy, as a Node server or on serverless presets.
- MCP tool names and descriptions come from the contract's OpenAPI metadata.
- People-only procedures are declared once and excluded from MCP.
