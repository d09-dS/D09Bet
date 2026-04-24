---
description: Review and generate database migrations safely
---

# Database Migration Workflow

This workflow helps create and review database migrations safely.

## Step 1: Analyze Schema Changes

Ask the user:

```
What schema changes do you need?
a) Add new table
b) Modify existing table (add/remove/rename columns)
c) Add/modify indexes
d) Add/modify constraints
e) Data migration
f) Review existing migrations
```

## Step 2: Generate Migration

### Adding a New Table

```sql
-- Migration: create_users_table
-- Created: [timestamp]

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Down migration
-- DROP TABLE users;
```

### Adding Columns (Safe)

```sql
-- Migration: add_phone_to_users
-- Safe: Adding nullable column

ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down migration
-- ALTER TABLE users DROP COLUMN phone;
```

### Adding NOT NULL Column (Safe Pattern)

```sql
-- Migration: add_role_to_users
-- Pattern: Add nullable → Backfill → Add constraint

-- Step 1: Add nullable column
ALTER TABLE users ADD COLUMN role VARCHAR(20);

-- Step 2: Backfill existing rows
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Step 4: Add default for future rows
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

-- Down migration
-- ALTER TABLE users DROP COLUMN role;
```

### Renaming Columns (Careful!)

```sql
-- Migration: rename_name_to_full_name
-- ⚠️ WARNING: May break application code

-- Option 1: Direct rename (causes downtime)
ALTER TABLE users RENAME COLUMN name TO full_name;

-- Option 2: Zero-downtime pattern
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

-- Step 2: Copy data
UPDATE users SET full_name = name;

-- Step 3: Update application to use both columns
-- Step 4: After deployment, drop old column
-- ALTER TABLE users DROP COLUMN name;
```

### Adding Indexes (Safe)

```sql
-- Migration: add_index_users_email_status
-- Use CONCURRENTLY to avoid locking

CREATE INDEX CONCURRENTLY idx_users_email_status
ON users(email, status);

-- Down migration
-- DROP INDEX idx_users_email_status;
```

## Step 3: Safety Checklist

Before applying migration:

### Pre-Migration

- [ ] Migration tested on copy of production data
- [ ] Rollback script prepared and tested
- [ ] Application code compatible with both old and new schema
- [ ] Estimated execution time calculated
- [ ] Maintenance window scheduled (if needed)
- [ ] Database backup taken

### Migration Risks

| Operation             | Risk Level | Lock Type  | Recommendation            |
| --------------------- | ---------- | ---------- | ------------------------- |
| CREATE TABLE          | Low        | None       | Safe                      |
| ADD COLUMN (nullable) | Low        | Brief      | Safe                      |
| ADD COLUMN (NOT NULL) | High       | Table lock | Use 3-step pattern        |
| DROP COLUMN           | Medium     | Brief      | Ensure no code references |
| RENAME COLUMN         | High       | Table lock | Use zero-downtime pattern |
| ADD INDEX             | Medium     | Table lock | Use CONCURRENTLY          |
| DROP INDEX            | Low        | Brief      | Safe                      |
| ALTER TYPE            | High       | Table lock | Create new column instead |

## Step 4: Generate ORM Migration

### Prisma

```prisma
// schema.prisma changes
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  phone     String?  // New field
  role      String   @default("user") // New field
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

```bash
# Generate migration
npx prisma migrate dev --name add_phone_and_role

# Apply to production
npx prisma migrate deploy
```

### TypeORM

```typescript
// migrations/[timestamp]-AddPhoneAndRole.ts
export class AddPhoneAndRole1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "phone",
        type: "varchar",
        length: "20",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "role",
        type: "varchar",
        length: "20",
        default: "'user'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "phone");
    await queryRunner.dropColumn("users", "role");
  }
}
```

### Entity Framework Core

```csharp
// Migrations/[timestamp]_AddPhoneAndRole.cs
public partial class AddPhoneAndRole : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Phone",
            table: "Users",
            type: "varchar(20)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Role",
            table: "Users",
            type: "varchar(20)",
            nullable: false,
            defaultValue: "user");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Phone", table: "Users");
        migrationBuilder.DropColumn(name: "Role", table: "Users");
    }
}
```

### Django

```bash
# Generate migration after model change
python manage.py makemigrations

# Preview SQL before applying
python manage.py sqlmigrate myapp 0003

# Apply
python manage.py migrate

# Apply to production
python manage.py migrate --database=production
```

```python
# migrations/0003_add_role_to_user.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('myapp', '0002_previous')]
    operations = [
        # Step 1: Add nullable
        migrations.AddField('User', 'role', models.CharField(max_length=20, null=True)),
        # Step 2: Backfill (use RunPython for data migrations)
        migrations.RunPython(
            lambda apps, schema_editor: apps.get_model('myapp', 'User').objects.filter(role=None).update(role='user'),
            migrations.RunPython.noop,
        ),
        # Step 3: Add constraint
        migrations.AlterField('User', 'role', models.CharField(max_length=20, default='user')),
    ]
```

### Alembic (FastAPI / SQLAlchemy)

```bash
# Auto-generate from model changes
alembic revision --autogenerate -m "add_role_to_users"

# Preview
alembic upgrade head --sql

# Apply
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

```python
# alembic/versions/xxxx_add_role_to_users.py
def upgrade():
    op.add_column('users', sa.Column('role', sa.String(20), nullable=True))
    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")
    op.alter_column('users', 'role', nullable=False, server_default='user')

def downgrade():
    op.drop_column('users', 'role')
```

## Step 5: Data Migration

For data transformations:

```sql
-- Migration: migrate_user_names
-- Split 'name' into 'first_name' and 'last_name'

-- Step 1: Add new columns
ALTER TABLE users ADD COLUMN first_name VARCHAR(50);
ALTER TABLE users ADD COLUMN last_name VARCHAR(50);

-- Step 2: Migrate data in batches
DO $$
DECLARE
    batch_size INT := 1000;
    total_rows INT;
    processed INT := 0;
BEGIN
    SELECT COUNT(*) INTO total_rows FROM users WHERE first_name IS NULL;

    WHILE processed < total_rows LOOP
        UPDATE users
        SET
            first_name = SPLIT_PART(name, ' ', 1),
            last_name = COALESCE(NULLIF(SPLIT_PART(name, ' ', 2), ''), 'Unknown')
        WHERE id IN (
            SELECT id FROM users
            WHERE first_name IS NULL
            LIMIT batch_size
        );

        processed := processed + batch_size;
        RAISE NOTICE 'Processed % of % rows', processed, total_rows;

        -- Allow other transactions
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;

-- Step 3: Add constraints after data is migrated
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
```

## Step 6: Review Existing Migrations

Check migration history:

```bash
# Prisma
npx prisma migrate status

# TypeORM
npx typeorm migration:show

# Entity Framework
dotnet ef migrations list
```

Verify:

- [ ] All migrations applied in order
- [ ] No pending migrations
- [ ] No failed migrations
- [ ] Migration checksums match

## Step 7: Rollback Plan

Always prepare rollback:

```sql
-- Rollback script for: add_phone_and_role

-- Verify current state
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('phone', 'role');

-- Rollback
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Verify rollback
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users';
```

## Gotchas

- **`migrate deploy` (Prisma) does not rollback on error** — always test migrations on a staging DB with production data size before deploying.
- **Adding NOT NULL without a default locks the table** — on large tables, this can cause minutes of downtime. Always use the 3-step pattern: add nullable → backfill → add constraint.
- **Django `RunPython` without `reverse_code`** — `migrations.RunPython.noop` as `reverse_code` prevents `migrate --fake` from failing; always provide it.
- **Alembic autogenerate misses some changes** — it does not detect column renames (creates drop + add), server-side defaults, or constraints by name. Always review generated migrations manually.
- **`CREATE INDEX` without `CONCURRENTLY` locks the table** — on any table with > ~1000 rows in production, always use `CREATE INDEX CONCURRENTLY`.

## References

- `martinfowler.com/articles/evodb.html` — Evolutionary Database Design (zero-downtime migration patterns)
- `docs.djangoproject.com/en/stable/topics/migrations/` — Django migrations
- `alembic.sqlalchemy.org/en/latest/` — Alembic docs

## Step 8: Output Summary

```
✅ Migration Generated

Migration: add_phone_and_role_to_users
Type: Schema change (safe)

Changes:
- ADD COLUMN phone VARCHAR(20) NULLABLE
- ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'

Risk Level: Low
Estimated Time: < 1 second
Requires Downtime: No

Files created:
- migrations/[timestamp]_add_phone_and_role.sql
- migrations/[timestamp]_add_phone_and_role_rollback.sql

Next steps:
1. Review migration SQL
2. Test on staging database
3. Apply: npx prisma migrate deploy
```

## Step 9: Save to Dashboard

Persist the migration results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/migration/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "migration",
  "timestamp": "[ISO timestamp]",
  "score": "[100 if safe, 70 if needs-downtime, 40 if destructive]",
  "maxScore": 100,
  "verdict": "[Safe / Needs Downtime / Destructive]",
  "findings": {
    "critical": "[destructive ops count]",
    "high": "[downtime-requiring ops]",
    "medium": 0,
    "low": 0
  },
  "highlights": ["[migration type, estimated time]"],
  "issues": ["[risk factors identified]"],
  "summary": "Migration [name]: [type], risk level [level]",
  "reportPath": ".windsurf/dashboard/runs/migration/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk

## Step 8a: Prisma Migration Workflow (Stack: Prisma)

> Auto-added by /project-init -- Stack: Prisma -- Remove if stack changes

When generating or reviewing database migrations for this project:

1. **Generate migration** (development):
   ```bash
   npx prisma migrate dev --name <descriptive-name> --create-only
   ```
   This generates the SQL without applying it. Review the SQL in `prisma/migrations/` before proceeding.

2. **Apply migration** (after review):
   ```bash
   npx prisma migrate dev
   ```

3. **Production deployment**:
   ```bash
   npx prisma migrate deploy
   ```
   Never use `migrate dev` in production -- it resets the database on schema drift.

4. **Seed data**:
   ```bash
   npx prisma db seed
   ```
   Seed script must be idempotent (use `upsert`, not `create`).

5. **Schema changes checklist**:
   - [ ] New columns have defaults or are nullable (to prevent breaking existing rows)
   - [ ] Indexes added for columns used in WHERE/ORDER BY
   - [ ] Foreign keys have `onDelete` action specified
   - [ ] Migration SQL reviewed for destructive operations (DROP COLUMN, DROP TABLE)
   - [ ] `prisma generate` run after schema changes

If migration fails: run `npx prisma migrate resolve --rolled-back <migration-name>` to mark it as rolled back.
