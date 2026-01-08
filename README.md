<div align="center">

# 🏥 HealEase Backend API

### A modern, secure, and scalable RESTful API for a health and wellness community platform

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[🌐 Live API](https://healease-server.onrender.com) • [📱 Frontend Repo](https://github.com/BarcDevs/HealEase--client) • [📖 API Docs](#api-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Design Principles](#-design-principles)
- [Local Development](#-local-development)
- [Database Schema](#-database-schema)
- [Roadmap](#-roadmap)
- [Contact](#-contact)

---

## 🎯 Overview

HealEase Backend is a production-ready RESTful API built with modern technologies and best practices. It powers a health and wellness community platform where users can create posts, share experiences, engage in discussions, and connect with others through a secure and performant API.

The project demonstrates expertise in:
- **Backend Architecture** - Clean MVC pattern with separation of concerns
- **Security** - JWT authentication, CSRF protection, input sanitization
- **Database Design** - Optimized Prisma schema with PostgreSQL
- **DevOps** - Cloud deployment, Docker containerization, CI/CD ready
- **Type Safety** - Full TypeScript implementation with strict typing
- **Scalability** - Stateless design, caching strategies, rate limiting

**Current Status**: ✅ Production API deployed on Render | 🚧 NestJS migration planned for enhanced scalability

---

## 🛠️ Tech Stack

### Core Technologies
```
Backend Framework    │ Express.js 4.18 + TypeScript 5.3
ORM                 │ Prisma 7.x
Database            │ PostgreSQL 15 (Neon Serverless)
Authentication      │ JWT (jsonwebtoken) + bcrypt
Validation          │ Joi schemas
```

### Security & Middleware
```
Security Headers    │ Helmet
CSRF Protection     │ Custom CSRF middleware with HTTP-only cookies
Rate Limiting       │ express-rate-limit
Input Sanitization  │ DOMPurify + custom sanitization
HPP Prevention      │ hpp (HTTP Parameter Pollution)
CORS                │ Configured for trusted origins
```

### DevOps & Infrastructure
```
Hosting             │ Render (Cloud Platform)
Database Hosting    │ Neon (Serverless PostgreSQL)
Containerization    │ Docker (Dockerfile ready)
Logging             │ Winston + Morgan
Process Management  │ Node.js with compression & clustering ready
```

### Development Tools
```
Testing             │ Jest + Supertest
Code Quality        │ ESLint + Prettier + Husky
Build               │ TypeScript Compiler + Webpack
Package Manager     │ npm
```

---

## ✨ Key Features

### 🔐 **Authentication & Authorization**
- JWT-based authentication with secure token management
- Password hashing using bcrypt (10 rounds)
- Email verification with OTP (One-Time Password)
- Password reset flow with time-limited tokens
- Role-based access control (USER, ADMIN)
- Protected routes with authentication middleware

### 🛡️ **Security Features**
- CSRF protection with double-submit cookie pattern
- HTTP-only secure cookies for token storage
- Input validation and sanitization on all endpoints
- SQL injection prevention via Prisma parameterized queries
- Rate limiting to prevent brute-force attacks
- Helmet.js security headers
- HTTP Parameter Pollution (HPP) prevention

### 📝 **Forum & Community**
- Create, read, update, delete posts (CRUD operations)
- Nested replies system for discussions
- Tag-based content organization
- User profiles with activity tracking
- Vote system (upvotes/downvotes) with JSON storage
- View tracking for posts
- Category filtering and search

### ⚡ **Performance & Scalability**
- Response caching with custom middleware
- Database query optimization with Prisma
- Compression middleware for reduced payload size
- Efficient indexing on frequently queried fields
- Stateless API design for horizontal scaling
- Connection pooling with Prisma

### 🔧 **Developer Experience**
- Comprehensive error handling with custom error classes
- Centralized error factory pattern
- Structured logging with Winston
- Type-safe API with TypeScript
- RESTful endpoint design
- Clear separation of concerns (MVC pattern)

---

## 📚 API Documentation

### Base URL
```
Production: https://healease-server.onrender.com
Local:      http://localhost:3000
```

### API Version
```
/api/v1
```

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/auth/signup` | Register new user | ❌ |
| `POST` | `/api/v1/auth/login` | User login (returns JWT) | ❌ |
| `GET` | `/api/v1/auth/logout` | User logout | ❌ |
| `GET` | `/api/v1/auth/me` | Get current user profile | ✅ |
| `GET` | `/api/v1/auth/csrf` | Get CSRF token | ✅ |
| `GET` | `/api/v1/auth/forget-password/:email` | Request password reset OTP | ❌ |
| `POST` | `/api/v1/auth/confirm-email` | Verify email with OTP | ✅ CSRF |
| `PUT` | `/api/v1/auth/reset-password` | Reset password with OTP | ✅ CSRF |

### Forum Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/forum/posts` | Get all posts (with pagination) | ❌ |
| `POST` | `/api/v1/forum/posts` | Create new post | ✅ CSRF |
| `GET` | `/api/v1/forum/posts/:postId` | Get single post by ID | ❌ |
| `PUT` | `/api/v1/forum/posts/:postId` | Update post | ✅ CSRF |
| `DELETE` | `/api/v1/forum/posts/:postId` | Delete post | ✅ CSRF |
| `GET` | `/api/v1/forum/posts/:postId/reply` | Get all replies for post | ❌ |
| `POST` | `/api/v1/forum/posts/:postId/reply` | Create reply on post | ✅ CSRF |
| `PUT` | `/api/v1/forum/posts/:postId/reply/:replyId` | Update reply | ✅ CSRF |
| `DELETE` | `/api/v1/forum/posts/:postId/reply/:replyId` | Delete reply | ✅ CSRF |
| `GET` | `/api/v1/forum/tags` | Get all tags | ❌ |
| `GET` | `/api/v1/forum/tags/:tagId` | Get single tag by ID | ❌ |

### Bulk Operations
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/v1/bulk/create-posts` | Bulk create posts | ✅ CSRF |
| `POST` | `/api/v1/bulk/create-replies` | Bulk create replies | ✅ CSRF |

### Server Status
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/status` | Get server health status | ❌ |

---

## 🔒 Security

HealEase Backend implements multiple layers of security to protect user data and prevent common attacks:

### Authentication Security
- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Password Hashing**: Bcrypt with 10 salt rounds (industry standard)
- **Refresh Tokens**: Separate refresh token mechanism for extended sessions
- **HTTP-Only Cookies**: Tokens stored in secure, HTTP-only cookies (not accessible via JavaScript)

### Attack Prevention
- **CSRF Protection**: Double-submit cookie pattern with custom middleware
- **SQL Injection**: Prisma ORM with parameterized queries (zero raw SQL)
- **XSS Prevention**: DOMPurify sanitization on all user inputs
- **Rate Limiting**: Configurable rate limits to prevent brute-force attacks
- **HPP Prevention**: HTTP Parameter Pollution middleware
- **Security Headers**: Helmet.js with CSP, HSTS, and other security headers

### Data Protection
- **Input Validation**: Joi schemas validating all request data
- **CORS Configuration**: Whitelist-based origin validation
- **Environment Variables**: Sensitive data stored in environment variables
- **Password Reset**: Time-limited OTP tokens for password recovery
- **Secure Cookies**: SameSite and Secure flags on production cookies

### Code Security
- **TypeScript**: Compile-time type checking prevents runtime errors
- **Error Handling**: No sensitive data exposed in error messages
- **Logging**: Structured logging with Winston (no sensitive data logged)
- **Dependencies**: Regular updates and vulnerability scanning

---

## 🏗️ Design Principles

### Architecture Patterns
- **MVC Pattern**: Clear separation between Models, Controllers, and Services
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Repository Pattern**: Data access abstraction via Prisma models
- **Factory Pattern**: Centralized error creation with factory classes
- **Middleware Pattern**: Composable request processing pipeline

### Code Quality Standards
- **Type Safety**: Full TypeScript with strict mode enabled
- **Error Handling**: Centralized error handling with custom error classes
- **Code Reusability**: DRY principles with shared utilities and services
- **Separation of Concerns**: Business logic in services, HTTP in controllers
- **RESTful Design**: Resource-based URLs, proper HTTP methods, stateless operations

### Best Practices
- **Security First**: Security measures integrated at every layer
- **Scalability**: Stateless design, horizontal scaling ready
- **Maintainability**: Clean code, consistent naming, comprehensive documentation
- **Testing Ready**: Modular design facilitating unit and integration testing
- **Configuration Management**: Environment-based config with config package

---

## 🚀 Local Development

### Prerequisites
- **Node.js**: v20.x or higher
- **PostgreSQL**: v15 or higher (or use Neon serverless)
- **npm**: v10.x or higher
- **Git**: Latest version

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/BarcDevs/HealEase--server.git
   cd HealEase--server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/healease"

   # Server Configuration
   NODE_ENV=development
   PORT=3000
   SERVER_HOST=localhost
   SERVER_ORIGIN=http://localhost:5173
   SERVER_PROTOCOL=http
   SERVER_API_VERSION=v1

   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRES_IN=86400000
   OTP_EXPIRATION=300000

   # Email Configuration (for password reset)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_SERVICE=gmail
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate

   # Run database migrations
   npm run prisma:migrate

   # (Optional) Seed the database
   npm run prisma:studio
   ```

5. **Start the development server**
   ```bash
   npm run start:dev
   ```

6. **Verify the server is running**
   ```bash
   curl http://localhost:3000/api/v1/status
   ```

### Available Scripts

```bash
npm run start:dev      # Start development server with nodemon
npm run build          # Build for production
npm run start          # Start production server
npm run typecheck      # Run TypeScript type checking
npm run lint:check     # Check code with ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm test               # Run tests with Jest
npm run prisma:studio  # Open Prisma Studio (database GUI)
```

### Common Issues

**"Prisma Client not generated"**
```bash
npm run prisma:generate
```

**"Cannot connect to database"**
- Verify DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall settings

**"JWT authentication fails"**
- Ensure JWT_SECRET is set in .env
- Check token expiration settings
---

## 🗄️ Database Schema

The application uses **Prisma ORM** with **PostgreSQL** for robust and type-safe database operations.

### Core Models
- **User**: User accounts with authentication credentials, profile data, and role-based access
- **Post**: Forum posts with title, body, votes, views, and category
- **Reply**: Nested replies/comments on posts with voting system
- **Tag**: Content tags for post organization and discovery

### Key Features
- UUID primary keys for security and scalability
- Indexed fields for optimized query performance
- JSON fields for flexible vote tracking
- Timestamp tracking for audit trails
- Soft delete capability with `deleted_at` field
- Role-based access control (USER, ADMIN)

### Prisma Schema Location
```
prisma/schema.prisma
```

View the complete schema with:
```bash
npm run prisma:studio
```

---

## 🗺️ Roadmap

### 🔄 Short-term (Q1 2025)
- [ ] **NestJS Migration**: Migrate from Express to NestJS for enhanced modularity and scalability
- [ ] **Swagger/OpenAPI**: Auto-generated API documentation with Swagger UI
- [ ] **Comprehensive Testing**: Unit tests (80%+ coverage) and E2E tests
- [ ] **Advanced Rate Limiting**: Redis-based distributed rate limiting

### 🚀 Medium-term (Q2 2025)
- [ ] **GraphQL Layer**: GraphQL API alongside REST for flexible data fetching
- [ ] **WebSocket Support**: Real-time notifications and live updates
- [ ] **Redis Caching**: Distributed caching layer for improved performance
- [ ] **File Uploads**: S3-compatible image/file upload system
- [ ] **Search Engine**: Elasticsearch integration for advanced search

### 🌟 Long-term
- [ ] **Microservices Architecture**: Break into smaller, independently deployable services
- [ ] **Kubernetes Deployment**: Container orchestration with K8s
- [ ] **Message Queue**: RabbitMQ/Kafka for async processing
- [ ] **Monitoring & Observability**: Prometheus, Grafana, and distributed tracing
- [ ] **Multi-tenancy**: Support for multiple organizations

---

## 📊 Architecture Diagram

![Architecture](./docs/architecture.png)

---

## 🤝 Contact

**Bar Cohen** | Full-Stack Developer | Open to Opportunities

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/barcohendev)
[![Portfolio](https://img.shields.io/badge/Portfolio-Visit-FF5722?style=for-the-badge&logo=google-chrome&logoColor=white)](https://bardevs.com)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:barcprodevelopments@gmail.com)

---

<div align="center">

### ⭐ If you find this project helpful, please consider giving it a star!

**Built with ❤️ by Bar Cohen**

*Passionate about building scalable, secure, and user-friendly applications*

</div>
