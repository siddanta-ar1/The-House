# Production Deployment Guide — SRMS

## Pre-Launch Checklist

This guide walks through deploying SRMS to production. Complete all steps before accepting paying customers.

---

## Phase 1: Environment & Secrets Setup

### 1.1 Rotate All Credentials

Your `.env.local` contains test/development credentials. **NEVER** push these to production.

**Supabase:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a **new Supabase project** (separate from dev)
3. Copy new `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Generate new `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → Service Role)

**Stripe:**
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Switch from Test mode to Live mode
3. Copy live keys: `STRIPE_SECRET_KEY` (sk_live_...) and `NEXT_PUBLIC_STRIPE_PK` (pk_live_...)

**Resend Email:**
1. Sign up at [resend.com](https://resend.com)
2. Create API key
3. Verify your sending domain
4. Copy `RESEND_API_KEY` (re_...)
5. Set `RESEND_FROM_EMAIL` to your domain (e.g., noreply@khane.com)

**Stripe Webhook Secret:**
1. Go to Developers → Webhooks in Stripe Dashboard
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Copy Signing secret → `WEBHOOK_SECRET`

### 1.2 Configure Vercel Environment Variables

1. Go to [vercel.com](https://vercel.com) → Your Project → Settings → Environment Variables
2. Add all production variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_STRIPE_PK=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@khane.com
WEBHOOK_SECRET=your_webhook_secret
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

3. **Important:** Uncheck "Automatically expose System Environment Variables"
4. Deploy → Redeploy with new variables

### 1.3 Remove Test Credentials from Code

Never commit actual credentials. Verify:

```bash
# Check for hardcoded keys in seed scripts
grep -r "sk_test\|pk_test\|re_test" srms/scripts/

# Check for hardcoded Supabase keys
grep -r "eyJhbGc" srms/scripts/
```

These should all use environment variables. Update if found:
- `srms/scripts/seed.js`
- `srms/scripts/create_demo_admin.js`
- `srms/scripts/create_demo_staff.js`

---

## Phase 2: Database Setup

### 2.1 Run Migrations in Production

Connect to your production Supabase:

```bash
# Install Supabase CLI if not already done
npm install -g supabase

# Login to Supabase
supabase login

# Link to your production project
supabase link --project-id your_production_project_id

# Push all migrations
supabase db push
```

Verify migrations succeeded:
```bash
supabase migrations list
```

### 2.2 Seed Initial Data (Optional)

If you want demo restaurants:

```bash
cd srms
node scripts/seed.js
```

This creates a test restaurant. **Remove in production.**

### 2.3 Create Super Admin User

The first user to create a tenant must be a super_admin:

```bash
# From srms directory
node scripts/create_demo_admin.js
```

Follow prompts to create super admin email/password.

---

## Phase 3: Authentication & RLS Verification

### 3.1 Test Multi-Tenant Isolation

RLS (Row Level Security) ensures restaurants can't access each other's data.

1. Create two test tenants via super admin dashboard
2. Log in as restaurant A's manager
3. Try to access restaurant B's data via browser DevTools:
   ```javascript
   // In browser console
   await fetch('/api/orders?restaurant_id=restaurant_b_id')
   ```
   Should return **403 Unauthorized** (RLS policy blocks it)

### 3.2 Test Role-Based Access

Login as different roles:
- **Super Admin** → should see `/admin/super-admin`
- **Manager** → should see `/admin/dashboard`
- **Kitchen** → should see `/kitchen`
- **Waiter** → should see `/waiter`
- **Customer** → should see public menu only

---

## Phase 4: Payment Gateway Testing

### 4.1 Test Stripe Payments

Using Stripe test cards:

```
Card:           4242 4242 4242 4242
Expiry:         Any future date (12/25)
CVC:            Any 3-digit number
```

1. Create an order via customer checkout
2. Complete payment flow
3. Verify webhook received:
   - Check Stripe Dashboard → Webhooks → Recent Events
   - Should show `payment_intent.succeeded`

### 4.2 Test Nepal Payment (Manual Verification)

1. Customer submits eSewa/Khalti screenshot
2. Manager approves in admin dashboard
3. Order marked as paid

**Important:** Screenshot verification is manual in MVP. Automate via eSewa/Khalti APIs in Phase 11.

---

## Phase 5: Email Testing

### 5.1 Test Transactional Emails

Verify emails are sent for:
- **Tenant onboarding** → Owner receives welcome email with temp password
- **Password reset** → Click link, can reset password
- **Payment receipt** → After order completion

Check [Resend Dashboard](https://resend.com) → Emails for delivery logs.

### 5.2 Set Up Custom Domain (Optional)

Emails from `noreply@khane.com` may be marked as spam. Use your domain:

1. In Resend → Domains → Add Domain
2. Add DNS records (CNAME, DKIM, SPF)
3. Update `RESEND_FROM_EMAIL` to `noreply@your-domain.com`

---

## Phase 6: Monitoring & Alerting

### 6.1 Set Up Error Tracking (Sentry)

1. Create account at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy DSN
4. Add to `.env` → `SENTRY_DSN`
5. Error logs automatically captured

### 6.2 Monitor Key Metrics

In Vercel Analytics:
- **Build time** → Should be < 20s
- **Edge API latency** → Target < 500ms
- **Web Core Vitals** → LCP < 2.5s, FID < 100ms

### 6.3 Set Up Alerts

Slack/Email alerts for:
- Deployment failures
- High error rates (> 5% in last hour)
- Database connection errors
- Payment processing failures

---

## Phase 7: Security Hardening

### 7.1 Enable HTTPS

Vercel auto-enables HTTPS. Verify in browser:
- URL shows 🔒 lock
- No "Not Secure" warnings

### 7.2 Configure CSP Headers

Already configured in `next.config.ts`:
- Blocks inline scripts
- Allows Supabase, Stripe, image CDNs
- Upgrade insecure requests

### 7.3 Rate Limiting

Upstash Redis provides automatic rate limiting:
- **Checkout:** 5 requests/minute per IP
- **Login:** 5 attempts/15 min per IP
- **API:** 100 requests/minute per IP

Monitor in [Upstash Dashboard](https://console.upstash.com).

### 7.4 Database Security

- ✓ RLS policies enabled (blocks cross-tenant access)
- ✓ Service role key never exposed to client
- ✓ All inputs validated via Zod
- ✓ Prepared statements (via Supabase)

---

## Phase 8: Data Backups

### 8.1 Enable Supabase Backups

1. Supabase Dashboard → Project Settings → Backups
2. Enable "Backups" (Daily, Weekly, Monthly)
3. Download backups to your infrastructure

### 8.2 Set Up Database Replication

1. Create a read-only replica for analytics
2. Redirect reporting queries to replica
3. Reduces load on primary database

---

## Phase 9: Custom Domain Setup (Optional)

### 9.1 Add Custom Domain to Vercel

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain (e.g., `app.khane.com`)
3. Add DNS records (CNAME to Vercel)
4. Wait for SSL certificate (auto)

### 9.2 Update App URL

```bash
# In Vercel environment variables
NEXT_PUBLIC_APP_URL=https://app.khane.com
```

Redeploy with new URL.

---

## Phase 10: Launch Checklist

Before accepting first paying customer:

- [ ] All credentials rotated (no test keys)
- [ ] Migrations applied to production Supabase
- [ ] Email service verified (Resend test email sent)
- [ ] Stripe payments tested (test transaction succeeded)
- [ ] Webhook secret configured (Stripe events received)
- [ ] Multi-tenant isolation tested (RLS working)
- [ ] Rate limiting working (can trigger by spam)
- [ ] Error tracking set up (Sentry receiving events)
- [ ] HTTPS enabled (green lock in browser)
- [ ] Database backups enabled
- [ ] Staff trained on admin dashboard
- [ ] Customer support runbook created
- [ ] Incident response plan documented
- [ ] Data privacy policy & terms published

---

## Phase 11: Post-Launch Monitoring

### 11.1 First Week

Monitor 24/7:
- **Error rate** (target < 1%)
- **API latency** (target < 500ms)
- **Payment success rate** (target > 99%)
- **Database connections** (should stay stable)

### 11.2 Weekly

- [ ] Review error logs in Sentry
- [ ] Check database query performance
- [ ] Verify all backups completed
- [ ] Monitor storage usage

### 11.3 Monthly

- [ ] Review analytics
- [ ] Analyze customer feedback
- [ ] Plan next feature release
- [ ] Audit security logs

---

## Common Issues & Troubleshooting

### Issue: "Service role key not found"

**Cause:** `SUPABASE_SERVICE_ROLE_KEY` not in Vercel env vars

**Fix:**
```bash
# Verify variable exists
vercel env list

# Re-add if missing
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Issue: "Email not sending"

**Cause:** `RESEND_API_KEY` invalid or domain not verified

**Fix:**
1. Check Resend Dashboard → Domains
2. Verify DKIM/SPF records added
3. Test with curl:
   ```bash
   curl -X POST "https://api.resend.com/emails" \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -d '{"from":"noreply@khane.com","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
   ```

### Issue: "Stripe webhook not firing"

**Cause:** Webhook secret mismatch or endpoint unreachable

**Fix:**
1. Verify `WEBHOOK_SECRET` matches Stripe Dashboard
2. Test endpoint: `curl https://your-domain/api/webhooks/stripe`
3. Check Stripe Dashboard → Webhooks → Recent Events for errors

### Issue: "RLS policy denies access"

**Cause:** User doesn't have correct role/restaurant_id claim in JWT

**Fix:**
1. Check JWT in browser DevTools → Application → Cookies → `sb-auth-token`
2. Decode at [jwt.io](https://jwt.io)
3. Verify `app_role` and `restaurant_id` claims present
4. User must be in `users` table with correct role_id

---

## Scaling for Production

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_orders_restaurant_created ON orders(restaurant_id, created_at);
CREATE INDEX idx_sessions_restaurant ON sessions(restaurant_id);
CREATE INDEX idx_users_restaurant_role ON users(restaurant_id, role_id);
```

### CDN Configuration

Vercel auto-caches static assets. For custom images:
```bash
# Configure Supabase storage CDN
supabase-cli bucket-update uploads --public --cache-control "max-age=31536000"
```

### Database Connection Pooling

Supabase automatically pools connections. Monitor in:
- Supabase Dashboard → Database → Connections

---

## Rollback Procedure

If deployment breaks production:

```bash
# Revert to previous commit
git revert <commit-hash>
git push

# Vercel auto-deploys
# Wait for build to complete

# Monitor logs
vercel logs

# If need immediate rollback:
vercel rollback
```

---

## Support & Documentation

- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Stripe Docs:** https://stripe.com/docs/api
- **Resend Docs:** https://resend.com/docs
- **Vercel Docs:** https://vercel.com/docs

---

**Last Updated:** March 14, 2026  
**Maintainer:** SRMS Team  
**Version:** 1.0.0
