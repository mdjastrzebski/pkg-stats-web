# NPM Stats Agent

This agent assists with the development and maintenance of the npm-stats project, a web application for tracking NPM package download statistics.

## Project Overview

The npm-stats project is a React-based web application that allows users to track download statistics for NPM packages. It displays weekly, monthly, and yearly download trends with percentage changes.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **NPM API** - Data source

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Maintain consistent formatting (use the project's ESLint and formatter configs)
- Write clear, descriptive variable and function names

### Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── services/      # API service layer
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

### Key Features

- Download statistics tracking (week, month, year)
- Trend analysis with percentage changes
- Local storage caching (6-hour expiration)
- Auto-retry for failed fetches
- Responsive dark-themed UI

## Available Skills

This project includes the following agent skills:

- **code-reviewer**: For reviewing code changes and pull requests
- **humanizer**: For making text sound more natural and human-written

## Common Tasks

When working on this project:

1. **Adding Features**: Ensure new features follow the existing patterns and maintain type safety
2. **Bug Fixes**: Test thoroughly and ensure caching behavior is preserved
3. **Code Review**: Use the code-reviewer skill for thorough reviews
4. **Documentation**: Keep README and code comments up to date

## Testing

- Run `bun run dev` to start the development server
- Run `bun run build` to build for production
- Run `bun run lint` to check code quality
- Run `bun run validate` to run all checks (build, lint, type-check, format check)
- Run `bun run validate:fix` to automatically fix formatting and linting issues

## Notes

- Data is fetched from the NPM API and cached in localStorage
- Cache expiration is set to 6 hours
- Failed fetches are automatically retried on page reload
