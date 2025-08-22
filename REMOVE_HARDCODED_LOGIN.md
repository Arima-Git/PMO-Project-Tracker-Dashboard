# REMOVE HARDCODED LOGIN CREDENTIALS

This file is a reminder to remove the hardcoded login credentials from `login-pmo.html` and `login-admin.html` once database authentication is fully working and tested.

## Hardcoded credentials to remove:
- **PMO Dashboard:**
  - Username: `pmomanager`
  - Password: `pmomanager123`
- **Viewer Dashboard:**
  - Username: `pmoviewer`
  - Password: `pmoviewer123`
- **Admin Dashboard:**
  - Username: `pmotrangotech`
  - Password: `pmotrangotech123`

## Files to update:
- `public/login-pmo.html`
- `public/login-admin.html`

## Action:
- Delete the hardcoded credential checks from the frontend JS.
- Ensure all logins use only the backend/database authentication.

---
**Do this before production deployment!**
