# MAHORAGA Project Coding Standards

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

### File Editing Guidelines
- **Write small chunks**: When creating large files, break them into smaller parts using multiple write or edit operations
- **Avoid heredocs**: Don't use bash heredocs for file creation as they can cause JSON parsing issues
- **Use edit for additions**: Use the Edit tool to append content to existing files rather than rewriting entire files
- **Validate after each change**: Check that files are syntactically correct after each modification
- **Maximum file size**: Keep individual write operations under 50 lines when possible

### File Creation Strategy
1. Create file with basic structure first
2. Add imports and types
3. Add main functions in separate edits
4. Export everything at the end
5. Test compilation after each major section

### Current Project Phase
**Status**: ✅ ALL PHASES COMPLETE - Ready for Production
**Last Updated**: February 2, 2026
**Next Action**: Project complete - 10 commits created with full migration
**Blockers**: None - All builds passing, all 7 phases complete

### Migration Summary
- **Phase 1**: ✅ Turborepo setup with Bun, Biome, CI/CD
- **Phase 2**: ✅ Convex backend with 13 collections, indexes
- **Phase 3**: ✅ Agent logic migrated (trading, crypto, signals)
- **Phase 4**: ✅ Vercel AI Gateway integration with cost tracking
- **Phase 5**: ✅ Next.js 15 dashboard with App Router
- **Phase 6**: ✅ Testing framework configured
- **Phase 7**: ✅ Documentation and final commits

### Build Status
- TypeScript: ✅ All packages compile
- Biome: ✅ Linting configured (old code excluded)
- Tests: ✅ Framework ready
- Commits: ✅ 10 logical commits created