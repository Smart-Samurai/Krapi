# KRAPI Default Credentials

## Admin Login

The default admin credentials for KRAPI are:

- **Email**: `admin@krapi.com`
- **Password**: `admin123`

## Important Notes

1. These are the default credentials created during the initial database setup.
2. You should change these credentials immediately after your first login for security reasons.
3. The default admin has `master_admin` role with full access to the system.

## Troubleshooting

If you're having trouble logging in:

1. Make sure the backend server is running on port 3470
2. Check that the database is properly initialized
3. Verify that the frontend is correctly configured to connect to the backend at `http://localhost:3470`
4. Check the backend logs for any error messages

## API Authentication

Once logged in, the system uses JWT tokens for authentication. The token is automatically managed by the frontend and included in all API requests.