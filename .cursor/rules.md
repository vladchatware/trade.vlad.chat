# MAHORAGA Project Coding Standards

We are the documents we maintain.

## TypeScript Rules

### Strict Type Safety
- Enable strict mode in all tsconfig.json files
- Never use any type - use unknown with proper type guards
- All function parameters and return types must be explicitly typed
- No implicit any allowed
- Use const by default, let only when reassignment needed

### Type Definitions
Use explicit interfaces and type guards instead of any.

## Convex Patterns

### File Organization
- All queries/mutations/actions must be exported from index.ts
- Use internal prefix for functions called only by other Convex functions
- Group related functions in separate files by domain

### Function Naming
- Queries: get prefix (e.g., getUser, getTrades)
- Mutations: create, update, delete prefixes
- Actions: Verb-noun format (e.g., executeTrade, processSignal)

### Database Patterns
- Always use indexes for frequently queried fields
- Use first() for single results, collect() for lists
- Validate all inputs with Zod schemas

## React and Next.js Patterns

### Component Structure
- Use Server Components by default
- Mark Client Components explicitly with use client
- Keep components small and focused
- Co-locate related components in feature folders

### Hooks
- Custom hooks in hooks directory
- Hook names start with use
- Document hook parameters and return types

### Data Fetching
- Use useQuery from Convex for real-time data
- Use Server Components for initial data loading
- Implement loading states with Suspense

## Error Handling

### Never Swallow Errors
Always handle errors explicitly - log and re-throw or handle based on error type.

### Use Structured Logging
Include context in all log messages for debugging.

## Performance Guidelines

### Database
- Use appropriate indexes
- Batch writes when possible
- Cache frequently accessed data
- Use pagination for large datasets

### React
- Memoize expensive calculations
- Use useMemo and useCallback appropriately
- Lazy load heavy components
- Optimize re-renders with React DevTools

## Security Rules

### API Keys
- Store in environment variables only
- Never commit keys to repository
- Use different keys for dev/staging/prod
- Rotate keys regularly

### Input Validation
- Validate all user inputs
- Sanitize data before storage
- Use parameterized queries
- Implement rate limiting

## Testing Standards

### Coverage Requirements
- 80 percent minimum coverage for Convex actions
- Component tests for all UI components
- Integration tests for critical paths
- E2E tests for user workflows

### Test Structure
- Arrange-Act-Assert pattern
- Descriptive test names
- One assertion per test when possible
- Mock external dependencies

## Code Review Checklist

### Before Submitting PR
- All tests pass
- No Biome linting errors
- TypeScript strict checks pass
- No console.log statements
- Documentation updated
- CHANGELOG.md updated

### During Review
- Check for any types
- Verify error handling
- Review test coverage
- Check performance implications
- Verify security considerations

## Agent Instructions

### Autonomous Execution Mode
- **Act autonomously**: Execute tasks without waiting for user confirmation at each step
- **Self-drive completion**: Check todo list, identify next pending task, and execute it immediately
- **No manual prompts**: Do not ask "should I continue" or "ready to proceed" - just continue
- **Proactive progress**: Update todo list status in real-time as tasks complete
- **Automatic phase transitions**: When all tasks in a phase complete, immediately start the next phase

### Progress Tracking Requirements
- **Update .cursor/rules.md frequently**: Keep this file updated with current project state
- **Update todo list continuously**: Mark tasks as completed as soon as they finish
- **Reflect current phase**: Rules should indicate which phase is currently in progress
- **Track blockers**: If blocked, document the blocker and proposed solution
- **Review after each commit**: Update progress tracking after every git commit

### Long-Running Commands
The following commands are long-running processes that stay active (do not complete immediately):
- `bunx convex dev` - Convex development server (watches for changes and hot-reloads)
- `bun run dev` - Next.js development server (stays running for development)
- `bun run dashboard:dev` - Dashboard development server
- `npx convex dev` - Alternative Convex dev command (always prefex bun)

**When executing these commands**:
- They will continue running until manually stopped
- Use appropriate process management if running in background
- Do not wait for them to "complete" - they are designed to stay running
- These are development servers, not one-time commands

### Module Implementation Tracking
When implementing features module-by-module:
- **Trace every method call**: Check if referenced methods actually exist in the target module
- **Verify exports**: Ensure all referenced functions are exported from their files
- **Validate signatures**: Confirm function arguments match between caller and implementation
- **Use grep to find exports**: Run `grep "^export" convex/*.ts` to see what's actually implemented
- **Fix references before typegen**: Update broken api.* references before regenerating types


### Convex Function Types
**Critical**: You cannot mix function types in the same file with `'use node'`:

| Directive | Function Types | Use Case |
|-----------|---------------|----------|
| `'use node'` | Actions ONLY | External HTTP requests, Node.js APIs |
| (none) | Queries, Mutations | Database operations, Convex runtime |

**Never** put Queries or Mutations in a file with `'use node'`. If you need both:
1. Put Actions in one file with `'use node'`
2. Put Queries/Mutations in a separate file without the directive
3. Reference them via `api.moduleName.functionName`

### File Editing Guidelines
- **Write small chunks**: When creating large files, break them into smaller parts using multiple write or edit operations
- **Avoid heredocs**: Don't use bash heredocs for file creation as they can cause JSON parsing issues
- **Use edit for additions**: Use the Edit tool to append content to existing files rather than rewriting entire files
- **Validate after each change**: Check that files are syntactically correct after each modification
- **Maximum file size**: Keep individual write operations small and efficient
- **Never edit _generated files**: The `convex/_generated/` directory is auto-generated by Convex CLI. Always run `bunx convex dev` to regenerate types instead of manually editing these files

### File Creation Strategy
1. Create file with basic structure first
2. Add imports and types
3. Add main functions in separate edits
4. Export everything at the end
5. Test compilation after each major section
6. Keep cyclomatic complexity low
7. Keep the files organized and maintainable
8. Keep the modules flexible and reusable at the appropriate level of abstraction
9. Ship working increments, not big-bang releases

### Current Project Phase
**Status**: 🔄 Dashboard UI Migration - Phases 1-4 Complete, working on Phase 5
**Last Updated**: February 2, 2026
**Next Action**: Adding charts and crypto support to dashboard
**Components Created**: Tooltip, StatusIndicator, LineChart, enhanced Metric, useClock hook, usePortfolioHistory hook
**Backend Changes**: Extended status.ts, created dashboardActions.ts
**Blockers**: None

### Migration Summary
- **Phase 1**: ✅ Turborepo setup with Bun, Biome, CI/CD
- **Phase 2**: ✅ Convex backend with 13 collections, indexes
- **Phase 3**: ✅ Agent logic migrated (trading, crypto, signals)
- **Phase 4**: ✅ Vercel AI Gateway integration with cost tracking
- **Phase 5**: 🔄 Dashboard UI enhancements (charts, crypto support) - IN PROGRESS
- **Phase 6**: ⏳ Testing framework configured
- **Phase 7**: ⏳ Documentation and final commits

### Build Status
- TypeScript: ✅ Passing (45 kB)
- Biome: ✅ Linting configured (old code excluded)
- Tests: ⏳ Framework ready
- Commits: 🔄 Dashboard Phase 5 in progress
