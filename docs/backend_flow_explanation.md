Research Repository Backend Codebase Walkthrough
Complete Flow Explanation from Login to Dashboard

📁 PROJECT STRUCTURE AND FLOW OVERVIEW

Frontend to Backend Flow:
1. Frontend (Login) -> POST /api/auth/google -> Authentication Flow
2. Frontend (Dashboard) -> JWT Authenticated Requests -> Various API Endpoints
3. Backend Processes -> Database -> Response to Frontend

📁 PROJECT DIRECTORY BREAKDOWN (Detailed)

Root Directory Structure:
pom.xml - Maven configuration file that contains project dependencies (Spring Boot, JPA, Security, JWT, PostgreSQL, etc.). This file defines the project structure, dependencies, and build configuration needed for the research repository backend.

application.properties - Application configuration file containing database settings, JWT configuration, Google client ID, upload directory paths, and other runtime properties. This is where environment-specific configurations are defined.

mvnw.cmd - Maven wrapper script for Windows environments allowing consistent builds across different systems without requiring Maven to be installed globally.

.gitignore - Specifies files and directories that Git should ignore during version control operations, preventing sensitive files, build artifacts, and IDE-specific files from being committed to the repository.

.gitattributes - Git attributes configuration file that specifies how Git handles specific files, including line ending normalization and binary file handling.

README.md - Project documentation file providing overview, setup instructions, and usage information for developers and users.

.mvn/ - Maven wrapper directory containing Maven wrapper scripts and configuration files that ensure consistent Maven versions across different development environments.

.idea/ - IDE-specific configuration files for IntelliJ IDEA, containing project settings, code style preferences, and other IDE-specific configurations.

src/ - Main source code directory containing the actual application code organized according to Maven standard directory structure.

main/ - Main application source code and resources directory containing the production code.

test/ - Unit and integration tests directory containing test code organized in the same package structure as the main source code.

🌐 SRC/MAIN/JAVA/COM/SCHOOL/BACKENDRESEARCHREPOSITORY DIRECTORY STRUCTURE

🏗️ BackendResearchRepositoryApplication - The main application class that serves as the entry point of the Spring Boot application. It uses @SpringBootApplication annotation to enable auto-configuration and @EnableJpaAuditing to enable JPA auditing features. The main() method serves as the starting point where the Spring Boot application begins execution, initializing the Spring Context and starting the embedded web server.

⚙️ /config/ - APPLICATION CONFIGURATION CLASSES

  AppConfig.java - Contains general application configuration such as ObjectMapper and CORS settings. This configuration ensures proper JSON serialization/deserialization handling and sets up Cross-Origin Resource Sharing (CORS) to allow communication between the frontend and backend servers.

  JpaConfig.java - JPA-specific configuration file that sets up JPA auditing features and other JPA-related configurations. This ensures that creation and modification timestamps are automatically managed for entities.

  RepositoryConfig.java - JPA Repository configuration that contains settings and configurations specific to Spring Data JPA repositories. This may include custom repository base classes and repository scanning configurations.

🌐 /controller/ - API ENDPOINT HANDLERS (Request Processing Layer)
  The controller layer handles incoming HTTP requests from the frontend and delegates business logic to the service layer. Each controller is responsible for a specific domain or functionality area and returns data in a format suitable for the frontend.

  ## /controller/auth/ - AUTHENTICATION CONTROLLERS
    AuthenticationController.java - Handles user authentication processes. This controller is responsible for processing POST /api/auth/google requests which receive Google OAuth tokens from the frontend. It validates these tokens against Google's services, manages user account creation/updating, and returns JWT tokens for subsequent authenticated requests. The controller uses CORS annotations to allow cross-origin requests from the frontend domain.

  ## /controller/user/ - USER AND DEPARTMENT CONTROLLERS
    UserController.java - Handles current user information requests. Specifically manages GET /api/users/me requests that return the current authenticated user's profile information including their role, department, and other relevant details. This endpoint requires a valid JWT authentication token.
    DepartmentController.java - Handles department-related requests, primarily GET /api/departments which returns all available departments in the system. This data is used by the frontend for dropdown selections, filtering options, and other department-related UI components.

  ## /controller/paper/ - RESEARCH PAPER CONTROLLERS
    ResearchPaperController.java - Manages research paper operations including retrieval and listing. It handles GET /api/papers requests for retrieving papers with pagination and optional department filtering. It also handles GET /api/papers/{id} for retrieving specific paper details. The controller implements role-based access control where students only see non-archived papers while admins can see papers based on their department access rights.
    FileController.java - Manages secure file downloads with comprehensive security measures. Handles GET /api/files/{fileIdOrName} requests for secure file downloads. Implements defense-in-depth security by validating both the file identifier and the user's access rights to ensure only authorized users can download specific files.

  ## /controller/request/ - DOCUMENT REQUEST CONTROLLERS
    StudentRequestController.java - Manages student document request operations. Handles GET /api/users/me/requests for students to retrieve their own requests and POST /api/requests to allow students to request access to specific papers. This controller enforces that only students can create requests and validates that students cannot request archived papers.

  ## /controller/admin/ - ADMINISTRATION CONTROLLERS
    AdminRequestController.java - Manages admin request triage operations. Handles GET /api/admin/requests for retrieving requests pending review by admins and PUT /api/admin/requests/{id} for updating request status (accept/reject). Implements role-based access control ensuring department admins can only see requests for their department while super admins can see all requests.
    AdminPaperController.java - Manages admin paper management operations. Handles POST /api/admin/papers for creating new research papers with file uploads, PUT /api/admin/papers/{id} for updating existing papers, DELETE /api/admin/papers/{id} for removing papers, and archive/unarchive endpoints. Includes comprehensive file upload functionality with validation and security measures.
    AdminStatsController.java - Manages administrative statistics endpoints. Handles GET /api/admin/stats/requests and GET /api/admin/stats/research endpoints to provide dashboard statistics for administrative users. These endpoints provide metrics on request volumes, paper counts, and departmental statistics.

  ## FiltersController.java - Manages filter-related endpoints. Handles GET /api/filters/years, GET /api/filters/departments, and GET /api/filters/dates endpoints which provide filtering options for the frontend. This allows users to filter papers by submission year, department, or date range.

📦 /dto/ - DATA TRANSFER OBJECTS (API Data Format Layer)
  The DTO layer contains objects specifically designed for data transfer between application layers and for API responses. These objects separate the internal domain model from the external API representation, allowing for flexible API contracts that might differ from the internal data structures.

  ## /dto/auth/ - AUTHENTICATION DTOs
    GoogleAuthRequest.java - Defines the request format for Google authentication operations. Contains the Google ID token received from the frontend authentication flow, allowing the backend to verify the user's identity with Google's authentication services.
    GoogleAuthResponse.java - Defines the response format for successful Google authentication. Contains both the JWT token for subsequent authenticated requests and the user information that the frontend needs to initialize the user session.

  ## /dto/request/ - REQUEST-RELATED DTOs
    CreateRequestDTO.java - Defines the format for creating document requests from the frontend. Contains the paper ID for which the student is requesting access, ensuring proper validation and processing of document access requests.
    CreateRequestResponseDTO.java - Defines the response format for successful request creation operations. Contains confirmation details that the frontend needs to display success messages or update UI state after a request has been submitted.
    AdminRequestDecisionDTO.java - Defines the format for admin request decisions. Contains the action (accept/reject) that an admin wants to take on a specific document request, ensuring proper validation and processing of admin decisions.

  ## /dto/error/ - ERROR HANDLING DTOs
    ErrorResponseDTO.java - Defines the standardized error response format used throughout the application. Contains error messages, error codes, and field validation details that provide consistent error reporting to the frontend.
    FieldErrorDTO.java - Defines field-specific validation error format used for form validation errors. Contains the field name, error message, and rejected value to help the frontend display specific validation errors to users.

  ## /dto/paper/ - PAPER-RELATED DTOs
    ResearchPaperDTO.java - Defines the research paper information format for API responses. Contains all paper details including title, author, abstract, status, department, submission date, file URL, and archival status. This DTO provides a complete representation of paper data for frontend display.
    UpdatePaperDTO.java - Defines the format for updating existing papers. Contains updatable paper fields like title, author, abstract, department, and submission date, allowing for selective updates to paper information.
    CreatePaperDTO.java - Defines the format for creating new papers in the system. Contains paper metadata such as title, author, abstract, department ID, and submission date, ensuring proper validation and processing of new paper submissions.

  ## /dto/user/ - USER-RELATED DTOs
    UserDTO.java - Defines the user information format used in API responses. Contains user ID, email, name, role, department, and timestamps, providing a structured representation of user data that does not expose sensitive information.
    DepartmentDTO.java - Defines the department information format for API responses. Contains department ID and name, providing a clean representation of department data that can be used by frontend components.

  ## /dto/response/ - RESPONSE DTOs
    PageResponseDTO.java - Defines the pagination response format for API endpoints that return collections. Contains the list of items, total elements, total pages, current page number, and page size, providing standardized pagination information to the frontend.
    FilterOptionsDTO.java - Defines the response format for filter options endpoints. Contains years, departments, and date range options that the frontend can use for filtering papers and other data.
    DateRangeDTO.java - Defines the date range format for filtering options. Contains minimum and maximum dates for date range filtering capabilities.
    RequestStatsDTO.java - Defines the request statistics format for admin dashboards. Contains counts of total, pending, accepted, and rejected requests for administrative reporting and monitoring.
    ResearchStatsDTO.java - Defines the research paper statistics format for admin dashboards. Contains counts of total, active, and archived papers for administrative reporting and monitoring.

🗂️ /enums/ - ENUMERATIONS (Constant Value Definitions)

  Role.java - Defines the user roles in the system with three possible values: STUDENT for regular users with read-only access to approved papers, DEPARTMENT_ADMIN for department-specific admin with paper triage capabilities, and SUPER_ADMIN for system-wide admins with full access to all features. These roles determine user permissions and capabilities throughout the application.
  PaperStatus.java - Defines the possible statuses for research papers with three values: SUBMITTED for new papers awaiting admin review, APPROVED for papers approved for student access, and REJECTED for papers rejected by admins. This enum controls paper visibility and access permissions.
  RequestStatus.java - Defines the possible statuses for document requests with three values: PENDING for new requests awaiting admin review, ACCEPTED for requests approved for file access, and REJECTED for requests denied by admins. This controls whether students can download files based on their request status.

⚠️ /exception/ - CUSTOM EXCEPTIONS (Error Handling Layer)

  GlobalExceptionHandler.java - Provides centralized exception handling for the entire application. Catches and handles various types of exceptions including validation errors, authentication failures, resource not found errors, and other business logic exceptions. Returns standardized error responses that match the API contract and ensure consistent error reporting to the frontend.
  AuthorizationException.java - Defines a custom exception for access violation scenarios. This exception is thrown when users attempt to perform actions they are not authorized to do, such as accessing department-specific resources they don't have permissions for or performing operations outside their role capabilities.
  ResourceNotFoundException.java - Defines a custom exception for missing resource scenarios. This exception is thrown when requested entities (users, papers, requests, etc.) don't exist in the database, providing a consistent way to handle cases where resources are not found.
  DuplicateResourceException.java - Defines a custom exception for resource conflict scenarios. This exception is thrown when attempts are made to create resources that already exist, such as duplicate document requests, ensuring idempotent behavior in the API.

🏗️ /model/ - ENTITY CLASSES (Database Tables Structure)
  The model layer contains JPA entities that represent database tables with their relationships. These entities map directly to database tables and define the structure of data stored in the backend, including relationships between different entities.

  User.java - Represents the user entity in the system, modeling the users table in the database. This entity contains user details including ID, email, name, role, department, and audit timestamps. It establishes relationships with departments and document requests, using JPA annotations for proper database mapping and relationship management.
  Department.java - Represents the department entity modeling academic departments in the system. This entity contains department details (ID and name) and establishes relationships with users, following a one-to-many relationship pattern where one department can have many users.
  ResearchPaper.java - Represents the research paper entity modeling academic papers in the system. This entity contains paper details including title, author, abstract, status, file information, department, and archival status. It establishes relationships with departments and document requests, providing the main data structure for research paper management.
  DocumentRequest.java - Represents the document request entity modeling paper access requests in the system. This entity contains request details including requester, paper, status, and timestamps. It establishes relationships with users and research papers, tracking access requests and their current status.

🗄️ /repository/ - DATABASE ACCESS LAYER (JPA Repository Interfaces)

  The repository layer provides Spring Data JPA repositories for database operations, abstracting database access and providing a clean interface for data operations. These repositories extend JpaRepository and can include custom query methods.
  UserRepository.java - Repository for User entity operations providing Spring Data JPA functionality for user data access. Extends JpaRepository with custom methods for user queries, specifically providing findByEmail for efficient user lookup by email address which is commonly used in authentication and authorization processes.
  DepartmentRepository.java - Repository for Department entity operations providing basic CRUD functionality for department data access. Extends JpaRepository and provides standard repository operations for department entities used throughout the application.
  PaperRepository.java - Repository for ResearchPaper entity operations providing Spring Data JPA functionality for paper data access. Extends JpaRepository with custom methods for paper queries including department-based filtering, archived status filtering, and statistics queries. Provides methods for various paper access patterns needed by different parts of the application.
  DocumentRequestRepository.java - Repository for DocumentRequest entity operations providing Spring Data JPA functionality for document request data access. Extends JpaRepository with custom methods for request queries including requester-based, paper-based, and department-based lookups needed for the various access control scenarios.

🛡️ /security/ - SECURITY CONFIGURATION (Authentication and Authorization)

  The security layer contains Spring Security configuration and components that handle authentication and authorization throughout the application, ensuring only authorized users can access specific resources.
  SecurityConfig.java - Main security configuration class that sets up JWT-based authentication without server-side sessions. Defines which endpoints require authentication versus which are public, adds JWT authentication filter to the security chain, and configures security settings to protect the application from unauthorized access.
  JwtAuthenticationFilter.java - JWT token validation filter that intercepts incoming requests to validate JWT tokens before they reach the controller layer. Extracts user information from tokens and sets the security context, checking token validity against user database records to ensure active and valid tokens.
  CustomUserDetailsService.java - Spring Security user details service that loads user details for authentication purposes. Integrates with JWT token validation process by providing user details when tokens are validated, ensuring consistency between JWT claims and actual user data.

⚙️ /service/ - BUSINESS LOGIC INTERFACE LAYER
  The service layer defines interfaces that specify business logic contracts, providing abstraction between the controller layer and implementation details. This allows for loose coupling and easier testing of business logic components.

  ## /service/auth/ - AUTHENTICATION SERVICES
    AuthService.java - Interface defining the contract for Google authentication services. Specifies the authenticateWithGoogle method signature that handles the Google OAuth authentication flow and user account management.
    JwtService.java - Interface defining the contract for JWT token operations. Specifies methods for token extraction, validation, and generation that are used throughout the application for authentication and authorization.

  ## /service/user/ - USER SERVICES
    UserService.java - Interface defining the contract for user-related operations. Specifies the getCurrentUser method signature that retrieves the currently authenticated user's information from the security context.
    DepartmentService.java - Interface defining the contract for department operations. Specifies methods for retrieving all departments that are used by various parts of the application.

  ## /service/paper/ - PAPER SERVICES
    PaperService.java - Interface defining the contract for research paper operations. Specifies methods for retrieving papers with various filters, pagination, and access controls that are used throughout the application.
    FileService.java - Interface defining the contract for file operations. Specifies methods for file downloads, access control validation, and file lookup functionality required for secure document access.

  ## /service/request/ - REQUEST SERVICES
    RequestService.java - Interface defining the contract for document request operations. Specifies methods for creating and retrieving document requests for authenticated users.

  ## /service/admin/ - ADMIN SERVICES
    AdminRequestService.java - Interface defining the contract for admin request operations. Specifies methods for request triage, decision-making, and statistics that are available to administrative users.
    AdminPaperService.java - Interface defining the contract for admin paper operations. Specifies methods for paper creation, update, deletion, archival management, and statistics that are available to administrative users.

🔧 /service/impl/ - BUSINESS LOGIC IMPLEMENTATION LAYER
  The service implementation layer contains concrete implementations of service interfaces, providing the actual business logic and data processing that handles the core functionality of the application.

  ## /service/impl/auth/ - AUTHENTICATION SERVICE IMPLEMENTATIONS
    AuthServiceImpl.java - Concrete implementation of Google authentication services. Validates Google tokens against Google's services, checks domain restrictions (@acdeducation.com), creates or updates users in the database with default STUDENT role, and generates JWT tokens using JwtServiceImpl.
    JwtServiceImpl.java - Concrete implementation of JWT token operations. Handles JWT token generation and validation, contains secret key and expiration configuration, and provides secure token management throughout the application.

  ## /service/impl/user/ - USER SERVICE IMPLEMENTATIONS
    UserServiceImpl.java - Concrete implementation of user operations. Called when frontend accesses /api/users/me endpoints and extracts user information from the JWT security context, returning UserDTO with role and department information.
    DepartmentServiceImpl.java - Concrete implementation of department operations. Called for /api/departments requests and returns all departments for frontend dropdowns and filtering components.

  ## /service/impl/paper/ - PAPER SERVICE IMPLEMENTATIONS
    PaperServiceImpl.java - Concrete implementation of paper operations called for all /api/papers requests. Implements role-based access control where students only see non-archived papers while admins can see papers based on department access and archival status. Handles pagination, filtering, and authorization checks.
    FileServiceImpl.java - Concrete implementation of file operations called for /api/files requests. Implements defense-in-depth security by validating both file identifiers and user access rights. Checks authorization via hasAccessToDownloadFile method and implements proper access controls for archived papers.

  ## /service/impl/request/ - REQUEST SERVICE IMPLEMENTATIONS
    RequestServiceImpl.java - Concrete implementation of document request operations. Provides getMyRequests() method called for /api/users/me/requests allowing students to see their requests, and createRequest() method called for POST /api/requests allowing students to request papers. Includes validation to prevent requests for archived papers.

  ## /service/impl/admin/ - ADMIN SERVICE IMPLEMENTATIONS
    AdminRequestServiceImpl.java - Concrete implementation of admin request operations. Provides getRequestsForTriage() for /api/admin/requests to retrieve pending requests and decideRequest() for PUT /api/admin/requests/{id} to accept or reject requests. Implements proper department-based access controls.
    AdminPaperServiceImpl.java - Concrete implementation of admin paper operations. Provides createPaper() for POST /api/admin/papers with file upload functionality, updatePaper() for PUT /api/admin/papers/{id}, deletePaper() for DELETE /api/admin/papers/{id}, and archive/unarchive functionality. Includes comprehensive file handling and validation.

📂 SRC/MAIN/RESOURCES DIRECTORY - APPLICATION RESOURCES

application.properties - Main configuration file containing database connection settings, JWT secret and expiration configuration, Google OAuth client ID, upload directory configuration, server port settings, and JPA settings. This file provides runtime configuration values that can be changed without recompiling the application.

/static/ - Static web resources directory for CSS, JavaScript, images, and other static files that will be served by the Spring Boot application when running in embedded server mode.

/templates/ - Template files directory for server-side rendering technologies like Thymeleaf, though this backend primarily serves API endpoints rather than server-rendered pages.

🧪 SRC/TEST/JAVA DIRECTORY - TEST DIRECTORY
Contains unit and integration tests for the application organized in the same package structure as the main source code. Uses JUnit, Spring Boot Test, and Mockito frameworks to test individual components, service layer functionality, and integration between different parts of the application to ensure code quality and prevent regressions.

🔄 USER FLOW BREAKDOWN

🚪 STUDENT LOGIN FLOW:
Frontend Login -> POST /api/auth/google (token) -> AuthenticationController -> AuthService -> Validate Google token -> Create JWT -> Return GoogleAuthResponse -> Frontend gets JWT + User info

📊 STUDENT DASHBOARD FLOW:
Frontend Dashboard -> GET /api/users/me (with JWT) -> JwtAuthenticationFilter -> UserController -> UserServiceImpl -> Return UserDTO

Frontend Lists Papers -> GET /api/papers (with JWT) -> JwtAuthenticationFilter -> ResearchPaperController -> PaperServiceImpl (only non-archived papers for students) -> Return PageResponseDTO<ResearchPaperDTO>

Frontend Requests Paper -> POST /api/requests (with JWT) -> JwtAuthenticationFilter -> StudentRequestController -> RequestServiceImpl -> Creates DocumentRequest with PENDING status

🛠️ ADMIN DASHBOARD FLOW:
Frontend Admin Panel -> GET /api/admin/requests (with JWT) -> JwtAuthenticationFilter -> AdminRequestController -> AdminRequestServiceImpl -> Returns pending requests for triage

Admin Approves Request -> PUT /api/admin/requests/{id} (with JWT) -> JwtAuthenticationFilter -> AdminRequestController -> AdminRequestServiceImpl -> Updates DocumentRequest status to ACCEPTED/REJECTED

Admin Uploads Paper -> POST /api/admin/papers (multipart with JWT) -> JwtAuthenticationFilter -> AdminPaperController -> AdminPaperServiceImpl -> Validates file -> Saves to storage -> Creates ResearchPaper entity

🏢 SUPER ADMIN FLOW:
Has access to all departments and papers, can override all restrictions, and has access to all administrative functions across the entire system.

🔒 SECURITY FEATURES

JWT Token Flow:
1. User logs in -> JWT generated with role/department claims
2. Every request -> JWT validated by JwtAuthenticationFilter
3. Controller -> Service -> Database with user context maintained

Access Control:
SUPER_ADMIN: Can access all departments and papers across the entire system
DEPARTMENT_ADMIN: Only their department's papers/requests within their authorized scope
STUDENT: Only non-archived papers and their own requests

File Security:
- File download requires valid JWT and proper authorization
- Double validation: paper file identifier must match the paper's stored URL
- Students can only download if they have ACCEPTED request and paper is not archived

🔍 DEBUGGING PATHS

Authentication Issues:
Controller -> JwtAuthenticationFilter -> JwtService -> User Repository

Access Denied Issues:
SecurityConfig -> JwtAuthenticationFilter -> Service (authorization checks)

File Download Issues:
FileController -> FileService (hasAccessToDownloadFile) -> Request/Paper Repositories

Database Issues:
Service -> Repository -> Entity (model package)

Validation Errors:
Controller -> GlobalExceptionHandler -> ErrorResponseDTO

🧠 PROJECT ARCHITECTURE SUMMARY

This backend follows the Model-View-Controller (MVC) pattern with a Layered Architecture:
- Presentation Layer: Controllers handle HTTP requests
- Service Layer: Business logic and data processing
- Persistence Layer: Data access through repositories
- Domain Layer: Entity models representing the data

Key Architecture Patterns:
1. Separation of Concerns: Each component has a specific responsibility
2. Dependency Injection: Spring manages object creation and injection
3. Interface-based Design: Services use interfaces for loose coupling
4. Security-First: JWT-based authentication and authorization built-in
5. Repository Pattern: Abstracts database access operations

Technology Stack:
- Spring Boot 3.5.7: Main framework providing auto-configuration
- Spring Security: Authentication and authorization framework
- Spring Data JPA: Database access abstraction with Hibernate
- PostgreSQL: Relational database management system
- JWT: Token-based authentication implementation
- Maven: Build automation and dependency management
- Java 21: Programming language with modern features

This architecture enables maintainable, testable, and scalable code while providing strong security and access control mechanisms. The system supports role-based access control, secure file handling, comprehensive error handling, and follows established Java and Spring Boot best practices.