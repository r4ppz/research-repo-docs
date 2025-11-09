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

### 2.3 Security Architecture

- JWT-based authentication without server-side sessions
- Role-based access control with department scoping
- Defense-in-depth validation for file downloads

## 3) Component Interactions

### 3.1 Authentication Flow

1. User logs in → JWT generated with role/department claims
2. Every request → JWT validated by JwtAuthenticationFilter
3. Controller → Service → Database with user context maintained

### 3.2 File Access Control

- File download requires valid JWT and proper authorization
- Students can only download if they have ACCEPTED request and paper is not archived
- Double validation: paper file identifier must match the paper's stored URL

### 3.3 Request Processing Flow

- Controller layer receives HTTP requests
- Delegates business logic to Service layer
- Service layer interacts with Repository layer
- Repository layer handles database operations
- Response flows back through the layers

## 4) Development & Debugging Guidance

### 4.1 Common Development Patterns

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

### 4.2 Key Implementation Details

- **CORS configuration**: Cross-origin resource sharing enabled with specific domain restrictions
- **JPA Auditing**: Automatic management of creation and modification timestamps
- **Exception Handling**: Centralized exception handling with standardized error responses
- **File Upload Security**: Validation by magic bytes with size limits (20MB)
- **Rate Limiting**: Applied to sensitive endpoints (login, create-request)

## 5) Related Documentation

For more detailed information about specific aspects of the system, see:

- [API Contract](api_contract.md) - Complete API endpoint specifications and request/response schemas
- [Database Schema](database_schema.md) - Complete database structure and relationships
- [Main Specification](research_repo_spec.md) - High-level architecture and business requirements
