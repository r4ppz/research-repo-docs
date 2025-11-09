# Research Repository — Backend Implementation Guide

Comprehensive walkthrough of the backend architecture and implementation details for the research repository system.

## 1) Project Structure Overview

```
src/
├── main/
│   ├── java/
│   │   └── com/school/backendresearchrepository/
│   │       ├── config/           # Configuration classes
│   │       ├── controller/       # API endpoint handlers
│   │       ├── dto/              # Data transfer objects
│   │       ├── enums/            # Enumerations
│   │       ├── exception/        # Custom exceptions
│   │       ├── model/            # Entity classes (JPA)
│   │       ├── repository/       # JPA repository interfaces
│   │       ├── security/         # Security configuration
│   │       └── service/          # Business logic layer
│   │           └── impl/         # Service implementations
│   └── resources/
│       └── application.properties # Configuration settings
└── test/                         # Unit and integration tests
```

## 2) Architecture Patterns & Implementation

### 2.1 Layered Architecture

This backend follows a layered architecture pattern:

- **Presentation Layer**: Controllers handle HTTP requests
- **Service Layer**: Business logic and data processing
- **Persistence Layer**: Data access through repositories
- **Domain Layer**: Entity models representing the data

### 2.2 Design Patterns Used

- **Separation of Concerns**: Each component has a specific responsibility
- **Dependency Injection**: Spring manages object creation and injection
- **Interface-based Design**: Services use interfaces for loose coupling
- **Repository Pattern**: Abstracts database access operations

### 2.3 Key Configuration Classes

- **BackendResearchRepositoryApplication**: Main application class with `@SpringBootApplication` and `@EnableJpaAuditing`
- **SecurityConfig**: JWT-based authentication without sessions, defines public vs protected endpoints
- **JPAConfig**: JPA auditing setup for automatic timestamp management
- **AppConfig**: ObjectMapper and CORS configurations

## 3) Security Implementation Details

### 3.1 JWT Authentication Flow

The security layer implements a stateless JWT authentication mechanism:

- **SecurityConfig**: Configures JWT filter chain, defines public endpoints (`/api/auth/**`) vs protected endpoints
- **JwtAuthenticationFilter**: Intercepts requests, validates JWT tokens, extracts user info to security context
- **CustomUserDetailsService**: Integrates with JWT validation by providing user details from database
- **AuthService**: Handles Google OAuth token validation and user creation/update
- **JwtService**: Manages JWT generation and validation with secret key and expiration settings

### 3.2 Role-Based Access Control (RBAC)

The system enforces access control at multiple levels:

- **Department Scoping**: Department admins can only access resources within their department
- **Role Hierarchy**: SUPER_ADMIN has global access, DEPARTMENT_ADMIN has department-scoped access, STUDENT has limited access
- **File Access**: Students can only download files if they have an ACCEPTED request AND the paper is not archived

### 3.3 Security Measures

- **Token Validation**: JWT tokens validated against user database records to ensure active status
- **Domain Restriction**: Google OAuth validated to ensure `@acdeducation.com` domain
- **Secure File Downloads**: Double validation to ensure file identifier matches stored URL
- **Input Validation**: All user inputs validated at controller and service layers

## 4) Component Interactions

### 4.1 Authentication Flow

1. Frontend sends Google ID token to `POST /api/auth/google`
2. `AuthenticationController` delegates to `AuthService`
3. `AuthService` validates token with Google services and creates/updates user in DB
4. `JwtService` generates JWT with user claims (userId, email, role, deptId)
5. Response includes JWT and user details in `GoogleAuthResponse`

### 4.2 File Access Flow

1. Request hits `FileController` with file identifier
2. `JwtAuthenticationFilter` validates JWT and sets security context
3. `FileController` calls `FileService.hasAccessToDownloadFile()`
4. `FileService` checks authorization based on user role and request status
5. If authorized, file is served; otherwise, access denied

### 4.3 Request Processing Flow

- Controller layer receives HTTP requests and performs initial validation
- Delegates business logic to Service layer with security context
- Service layer performs authorization checks and business validation
- Service layer interacts with Repository layer for data access
- Repository layer handles database operations using Spring Data JPA
- Response flows back through the layers with appropriate error handling

## 5) Data Flow & Validation

### 5.1 Entity Relationships

- **User ↔ Department**: Many-to-one (nullable for students/admins without dept)
- **User ↔ DocumentRequest**: One-to-many
- **ResearchPaper ↔ Department**: Many-to-one
- **DocumentRequest ↔ ResearchPaper**: Many-to-one
- **DocumentRequest ↔ User**: Many-to-one (requester)

### 5.2 Database Interaction Patterns

- **Repository Custom Queries**: Custom finder methods in repositories for complex queries
- **Transaction Management**: Spring's `@Transactional` annotations for data consistency
- **Entity Auditing**: Automatic creation/updated timestamps via `@EnableJpaAuditing`
- **Lazy/Eager Loading**: Strategic use of fetch types to optimize performance

### 5.3 Validation Implementation

- **Request Level**: Spring's `@Valid` annotations with Bean Validation
- **Service Level**: Business logic validation for complex requirements
- **Database Level**: Constraints enforced at DB level (UNIQUE, NOT NULL, etc.)
- **Exception Handling**: `GlobalExceptionHandler` for consistent error responses

## 6) Development & Debugging Guidance

### 6.1 Common Development Patterns

**Authentication Issues:**
Controller → JwtAuthenticationFilter → JwtService → User Repository

**Access Denied Issues:**
SecurityConfig → JwtAuthenticationFilter → Service (authorization checks)

**File Download Issues:**
FileController → FileService (hasAccessToDownloadFile) → Request/Paper Repositories

**Database Issues:**
Service → Repository → Entity (model package)

**Validation Errors:**
Controller → GlobalExceptionHandler → ErrorResponseDTO

### 6.2 Key Implementation Details

- **CORS Configuration**: Cross-origin resource sharing enabled with specific domain restrictions
- **JPA Auditing**: Automatic management of creation and modification timestamps via `@CreatedDate` and `@LastModifiedDate`
- **Exception Handling**: Centralized exception handling with standardized error responses in `ErrorResponseDTO`
- **File Upload Security**: Validation by magic bytes with size limits (20MB)
- **Rate Limiting**: Applied to sensitive endpoints (login, create-request)
- **Pagination**: Standardized `PageResponseDTO` for all paginated endpoints
- **Error Codes**: Consistent error code system across the application

### 6.3 Performance Considerations

- **Database Indexes**: Strategic indexes (e.g., `idx_papers_archived`) for common queries
- **JPA Optimizations**: Proper use of fetch types to avoid N+1 problems
- **Caching**: Potential for caching configurations (not implemented yet but architected for)
- **File Storage**: Efficient file upload/download handling with security checks

## 7) Testing Strategy

### 7.1 Test Organization

- Tests follow the same package structure as main source code
- Uses JUnit 5, Spring Boot Test, and Mockito frameworks
- Integration tests verify component interactions
- Unit tests for individual service methods

### 7.2 Coverage Areas

- Authentication flow validation
- Authorization rule enforcement
- Database operation correctness
- API endpoint functionality
- File upload/download security

## 8) Related Documentation

For more detailed information about specific aspects of the system, see:

- [API Contract](api_contract.md) - Complete API endpoint specifications and request/response schemas
- [Database Schema](database_schema.md) - Complete database structure and relationships
- [Main Specification](research_repo_spec.md) - High-level architecture and business requirements
