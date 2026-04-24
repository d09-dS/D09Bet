---
description: Generate OpenAPI/Swagger documentation for API endpoints
---

# API Documentation Workflow

This workflow generates comprehensive API documentation.

## Step 1: Scan API Endpoints

Analyze the codebase to find all API endpoints:

- Controllers/Routes
- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- URL patterns
- Request/Response types

## Step 2: Generate OpenAPI Specification

Create `openapi.yaml` or `openapi.json`:

```yaml
openapi: 3.1.0
info:
  title: [Project Name] API
  description: API documentation for [Project Name]
  version: 1.0.0
  contact:
    email: api@example.com

servers:
  - url: http://localhost:3000/api
    description: Development server
  - url: https://api.example.com
    description: Production server

tags:
  - name: Users
    description: User management endpoints
  - name: Auth
    description: Authentication endpoints

paths:
  /users:
    get:
      tags: [Users]
      summary: Get all users
      description: Returns a paginated list of users
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/PageSizeParam'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PaginatedUsers'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Users]
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/ValidationError'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time
      required: [id, email, name, createdAt]

    CreateUserRequest:
      type: object
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 2
          maxLength: 100
        password:
          type: string
          minLength: 12
      required: [email, name, password]

    PaginatedUsers:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: array
          items:
            $ref: '#/components/schemas/User'
        meta:
          $ref: '#/components/schemas/PaginationMeta'

    PaginationMeta:
      type: object
      properties:
        page:
          type: integer
        pageSize:
          type: integer
        totalItems:
          type: integer
        totalPages:
          type: integer

    CursorPaginationMeta:
      type: object
      description: Use for large datasets — consistent O(1) performance at any offset
      properties:
        limit:
          type: integer
          example: 20
        nextCursor:
          type: string
          nullable: true
          example: eyJpZCI6MTAwfQ==
        hasMore:
          type: boolean
          example: true

    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string

  parameters:
    PageParam:
      name: page
      in: query
      schema:
        type: integer
        default: 1
        minimum: 1

    PageSizeParam:
      name: pageSize
      in: query
      schema:
        type: integer
        default: 20
        minimum: 1
        maximum: 100

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

    ValidationError:
      description: Validation error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

## Step 3: Add Code Annotations

### NestJS

```typescript
@ApiTags("users")
@Controller("users")
export class UsersController {
  @Get()
  @ApiOperation({ summary: "Get all users" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedUsersDto })
  findAll(@Query() query: PaginationDto) {}

  @Post()
  @ApiOperation({ summary: "Create user" })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserDto })
  @ApiResponse({ status: 400, description: "Validation error" })
  create(@Body() dto: CreateUserDto) {}
}
```

### Express with JSDoc

```typescript
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/users", getUsers);
```

## Step 4: Generate DTO Documentation

For each DTO/Schema:

```typescript
// NestJS with Swagger
export class CreateUserDto {
  @ApiProperty({
    description: "User email address",
    example: "john@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "User full name",
    example: "John Doe",
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: "User password",
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  password: string;
}
```

## Step 5: Document Authentication

```yaml
# In OpenAPI spec
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        JWT token obtained from /auth/login endpoint.
        Include in header: `Authorization: Bearer <token>`

    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service-to-service communication
```

## Step 6: Add Examples

```yaml
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateUserRequest"
            examples:
              basic:
                summary: Basic user
                value:
                  email: john@example.com
                  name: John Doe
                  password: SecurePass123!
              admin:
                summary: Admin user
                value:
                  email: admin@example.com
                  name: Admin User
                  password: AdminPass123!
                  role: admin
```

## Step 7: Generate Markdown Documentation

Create `.windsurf/docs/API.md`:

```markdown
# API Documentation

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://api.example.com`

## Authentication

All endpoints require JWT authentication unless marked as public.

Include token in header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Endpoints

### Users

#### GET /users

Get paginated list of users.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| pageSize | integer | 20 | Items per page |

**Response:**
\`\`\`json
{
"success": true,
"data": [...],
"meta": {
"page": 1,
"pageSize": 20,
"totalItems": 100,
"totalPages": 5
}
}
\`\`\`

#### POST /users

Create a new user.

**Request Body:**
\`\`\`json
{
"email": "john@example.com",
"name": "John Doe",
"password": "SecurePass123!"
}
\`\`\`

**Response:** `201 Created`
\`\`\`json
{
"success": true,
"data": {
"id": "uuid",
"email": "john@example.com",
"name": "John Doe",
"createdAt": "2024-01-15T10:00:00Z"
}
}
\`\`\`

## Error Responses

All errors follow this format:
\`\`\`json
{
"success": false,
"error": {
"code": "ERROR_CODE",
"message": "Human readable message"
}
}
\`\`\`

### Common Error Codes

| Code             | HTTP Status | Description              |
| ---------------- | ----------- | ------------------------ |
| VALIDATION_ERROR | 400         | Invalid request data     |
| UNAUTHORIZED     | 401         | Missing or invalid token |
| FORBIDDEN        | 403         | Insufficient permissions |
| NOT_FOUND        | 404         | Resource not found       |
```

## Step 8: Setup Swagger UI

```typescript
// NestJS
const config = new DocumentBuilder()
  .setTitle("API Documentation")
  .setDescription("API description")
  .setVersion("1.0")
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("api/docs", app, document);

// Express with swagger-ui-express
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
```

## Step 8b: FastAPI Auto-Generated Docs

FastAPI generates OpenAPI 3.1.0 documentation automatically from type hints and Pydantic models. Enhance the defaults:

```python
# ✅ Good - FastAPI app with customized OpenAPI metadata
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(
    title="My API",
    description="API documentation for My Project",
    version="1.0.0",
    docs_url="/api/docs",       # Swagger UI
    redoc_url="/api/redoc",     # ReDoc
    openapi_url="/api/openapi.json",
)

# ✅ Good - Pydantic models generate schema automatically
class CreateUserRequest(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=100, examples=["John Doe"])
    password: str = Field(min_length=12)

class UserResponse(BaseModel):
    id: str
    email: str
    name: str

class ApiResponse(BaseModel):
    success: bool
    data: UserResponse | None = None

# ✅ Good - endpoint with typed request/response and tags
@app.post(
    "/api/v1/users",
    response_model=ApiResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Users"],
    summary="Create a new user",
    responses={
        400: {"description": "Validation error"},
        409: {"description": "Email already exists"},
    },
)
async def create_user(body: CreateUserRequest) -> ApiResponse:
    # FastAPI auto-validates body against CreateUserRequest
    user = await user_service.create(body)
    return ApiResponse(success=True, data=UserResponse.model_validate(user))
```

```python
# ✅ Good - dependency injection for auth (appears in Swagger UI)
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

@app.get("/api/v1/users/me", tags=["Users"])
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Returns the authenticated user's profile."""
    user = await verify_token(credentials.credentials)
    return ApiResponse(success=True, data=UserResponse.model_validate(user))
```

- **Swagger UI** is available at `/api/docs` -- interactive API explorer with "Try it out"
- **ReDoc** is available at `/api/redoc` -- clean read-only documentation
- **Pydantic `Field`** with `examples` populates example values in Swagger UI
- **`response_model`** generates the response schema; **`responses`** documents error codes
- **Use `HTTPBearer`** dependency to add the lock icon for auth in Swagger UI

## Step 8c: Django REST Framework Schema

For Django DRF projects, use `drf-spectacular` for OpenAPI 3.1 generation:

```python
# settings.py
INSTALLED_APPS = [
    ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'My API',
    'DESCRIPTION': 'API documentation for My Project',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

```python
# ✅ Good - DRF serializer with OpenAPI annotations
from drf_spectacular.utils import extend_schema, OpenApiExample

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'created_at']

class CreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(min_length=2, max_length=100)
    password = serializers.CharField(min_length=12, write_only=True)

@extend_schema(
    request=CreateUserSerializer,
    responses={201: UserSerializer},
    examples=[
        OpenApiExample('Basic user', value={'email': 'john@example.com', 'name': 'John Doe', 'password': 'SecurePass123!'}),
    ],
    tags=['Users'],
)
class UserCreateView(generics.CreateAPIView):
    serializer_class = CreateUserSerializer
```

- Use `drf-spectacular` (not `drf-yasg`) -- it supports OpenAPI 3.1 and is actively maintained
- Use `@extend_schema` for custom annotations when the auto-generated schema is insufficient
- Export the schema with `python manage.py spectacular --file openapi.yaml`

## Step 8d: Validation Checklist

Before committing the OpenAPI spec:

- [ ] Version is `3.1.0` (not 3.0.x — 3.1 aligns with JSON Schema draft 2020-12)
- [ ] All endpoints have `summary` and at least one `tags` entry
- [ ] Every `4xx`/`5xx` response references `$ref: '#/components/responses/...'`
- [ ] No inline schema duplication — use `$ref` for shared types
- [ ] All required fields marked in `required: [...]` arrays
- [ ] Sensitive fields (passwords, tokens) marked `writeOnly: true`
- [ ] Spec validated: `npx @redocly/cli lint openapi.yaml`

## Gotchas

- **OpenAPI 3.0 vs 3.1** — `nullable: true` is 3.0 only. In 3.1, use `type: ['string', 'null']`. Mixing versions causes validation errors.
- **`success: boolean` in every response** — if used, apply it consistently across ALL endpoints (see `api-standards.md` response envelope). Never mix enveloped and non-enveloped responses in the same API.
- **Documenting pagination as offset-only** — document cursor-based pagination for list endpoints that may grow. See `CursorPaginationMeta` schema above.
- **Missing `securitySchemes` on individual endpoints** — global `security: [BearerAuth: []]` applies to all routes; explicitly add `security: []` to override for public endpoints.

## References

- `spec.openapis.org/oas/v3.1.0` — OpenAPI 3.1.0 specification
- `redocly.com/docs/cli/` — Redocly CLI for spec linting and validation

## Step 9: Output Summary

```
API Documentation Generated

Files created:
- .windsurf/docs/openapi.yaml (OpenAPI 3.1.0 specification)
- .windsurf/docs/API.md (Markdown documentation)

Swagger UI available at: /api/docs

Endpoints documented: 15
- GET endpoints: 6
- POST endpoints: 4
- PUT endpoints: 2
- PATCH endpoints: 2
- DELETE endpoints: 1

Schemas documented: 12
```

## Step 10: Save to Dashboard

Persist the API documentation results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/api-docs/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "api-docs",
  "timestamp": "[ISO timestamp]",
  "score": "[completeness percentage, 0-100]",
  "maxScore": 100,
  "verdict": "[Complete / Partial / Minimal]",
  "findings": {
    "critical": 0,
    "high": "[undocumented auth endpoints]",
    "medium": "[missing response schemas]",
    "low": "[missing examples]"
  },
  "highlights": ["[well-documented endpoints]"],
  "issues": ["[undocumented endpoints or missing schemas]"],
  "summary": "[N] endpoints documented, [M] schemas defined",
  "reportPath": ".windsurf/dashboard/runs/api-docs/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk
