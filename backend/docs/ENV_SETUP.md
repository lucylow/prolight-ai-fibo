# Environment Variables Setup

Add these to your `.env` file in the `backend/` directory:

## reCAPTCHA

```
RECAPTCHA_SECRET=your_recaptcha_secret_here
RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here  # frontend use (VITE_RECAPTCHA_SITE_KEY)
```

## AWS S3 (for resume uploads)

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
```

## Email (SMTP)

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
HR_EMAIL=hello@prolight.ai
```

## Greenhouse (optional - for job listings)

```
GREENHOUSE_API_KEY=your_greenhouse_api_key
GREENHOUSE_ACCOUNT_ID=your_account_id
```

## Database

```
DATABASE_URL=sqlite:///./data.db
```

## Frontend (.env.local or .env)

```
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
```
