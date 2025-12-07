# Email Template Setup Guide

## Overview
This guide explains how to set up the Arabic email templates for Supabase email confirmations.

## Files Created
- `supabase/email-templates/confirm_signup.html` - HTML email template (Arabic, RTL)
- `supabase/email-templates/confirm_signup.txt` - Plain text fallback (Arabic)

## How to Apply in Supabase

### Step 1: Go to Supabase Dashboard
1. Log in to your Supabase Dashboard
2. Select your project

### Step 2: Navigate to Email Templates
1. Go to **Authentication** → **Email Templates**
2. Find **Confirm signup** template

### Step 3: Update the Template
1. **For HTML version:**
   - Copy the entire content from `supabase/email-templates/confirm_signup.html`
   - Paste it into the **HTML** field in Supabase
   - Make sure to keep the `{{ .ConfirmationURL }}` variable

2. **For Plain Text version:**
   - Copy the content from `supabase/email-templates/confirm_signup.txt`
   - Paste it into the **Plain Text** field in Supabase
   - Keep the `{{ .ConfirmationURL }}` variable

### Step 4: Save
Click **Save** to apply the changes.

## Template Features

### Design
- ✅ Arabic language (RTL)
- ✅ Teal/Emerald color scheme matching system
- ✅ Cairo font (same as system)
- ✅ Responsive design
- ✅ Professional styling

### Content
- ✅ Clear Arabic instructions
- ✅ Prominent confirmation button
- ✅ Fallback link if button doesn't work
- ✅ Security note about unsolicited emails
- ✅ System branding

### Variables Used
- `{{ .ConfirmationURL }}` - The confirmation link (required)

## Testing

After updating the template:
1. Try registering a new user
2. Check the email sent to the user
3. Verify:
   - Email is in Arabic
   - RTL layout works correctly
   - Button/link works
   - Colors match system (teal/emerald)

## Customization

You can customize:
- Colors: Change `#14b8a6` and `#0d9488` to your preferred colors
- Text: Modify Arabic text in the template
- Logo: Add a logo URL in the header section
- Font: Change Cairo to another Arabic font if needed

## Notes

- The template uses inline CSS for email client compatibility
- Some email clients may not support all CSS features
- Always test in multiple email clients (Gmail, Outlook, etc.)
- The plain text version is a fallback for clients that don't support HTML

