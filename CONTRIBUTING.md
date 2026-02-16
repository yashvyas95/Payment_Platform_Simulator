# Contributing to Payment Platform Simulator

First off, thank you for considering contributing to Payment Platform Simulator! It's people like you that make this project a great learning resource for the developer community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what you expected
- **Include screenshots** if relevant
- **Include your environment details** (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List any alternatives** you've considered

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Issues that are suitable for first-time contributors
- `help wanted` - Issues that need assistance
- `documentation` - Documentation improvements

### Pull Requests

We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`
2. If you've added code, add tests that cover your changes
3. Ensure the test suite passes
4. Make sure your code lints
5. Update documentation as needed
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- Docker & Docker Compose
- Git

### Local Setup

```bash
# Fork and clone the repository
git clone https://github.com/<your-fork>/Payment_Platform_Simulator.git
cd Payment_Platform_Simulator

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Copy environment files
cp .env.example .env

# Start services
docker-compose up -d

# Run migrations
npm run prisma:migrate
npm run prisma:generate

# Start development servers
npm run dev

# In another terminal
cd frontend && npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Frontend tests
cd frontend
npm test
```

## Coding Guidelines

### TypeScript Style Guide

We follow TypeScript best practices and use ESLint + Prettier for code formatting:

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Key Principles

- **Type Safety**: Use TypeScript types, avoid `any`
- **Functional Programming**: Prefer pure functions and immutability
- **Error Handling**: Always handle errors explicitly
- **Naming Conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants
- **Comments**: Write self-documenting code, add comments for complex logic

### Code Structure

```typescript
// Good: Clear, typed, and functional
interface PaymentRequest {
  amount: number;
  currency: string;
  gateway: PaymentGateway;
}

async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  // Implementation
}

// Bad: Unclear types and naming
async function process(data: any) {
  // Implementation
}
```

### Testing Standards

- Write unit tests for all business logic
- Write integration tests for API endpoints
- Aim for >80% code coverage
- Use descriptive test names

```typescript
describe('PaymentService', () => {
  describe('processPayment', () => {
    it('should successfully process a valid payment request', async () => {
      // Arrange
      const request = createValidPaymentRequest();

      // Act
      const result = await paymentService.processPayment(request);

      // Assert
      expect(result.status).toBe('success');
    });

    it('should reject payment when insufficient funds', async () => {
      // Test implementation
    });
  });
});
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
feat(payment): add support for Razorpay gateway

Implemented Razorpay payment gateway integration with:
- Payment processing
- Refund handling
- Webhook verification

Closes #123

fix(webhook): prevent duplicate webhook processing

Added idempotency check using webhook event ID to prevent
processing the same webhook multiple times.

Fixes #456
```

## Pull Request Process

1. **Update Documentation**: Update README.md and relevant docs with any changes
2. **Add Tests**: Ensure test coverage for new features
3. **Run Tests**: All tests must pass
4. **Update CHANGELOG**: Add your changes to CHANGELOG.md (if exists)
5. **One Feature Per PR**: Keep PRs focused on a single feature or bugfix
6. **Clear Description**: Explain what changes you made and why
7. **Link Issues**: Reference related issues using `Closes #123`

### PR Template

```markdown
## Description

Brief description of what this PR does

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe the tests you added or how you tested

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
```

## Issue Reporting

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:

1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**

- OS: [e.g. Windows 11]
- Node Version: [e.g. 18.16.0]
- Browser: [e.g. Chrome 120]

**Additional context**
Any other context about the problem.
```

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives**
Alternative solutions you've considered.

**Additional context**
Any other context or screenshots.
```

## Questions?

Feel free to:

- Open a GitHub Discussion
- Comment on existing issues
- Contact maintainers

## Recognition

Contributors will be recognized in:

- README.md Contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
