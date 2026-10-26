# Supabase Auth email templates

Branded versions of every email Supabase Auth sends. Paste each file's contents into
**Supabase Dashboard → Authentication → Emails → (template)** and set the subject shown.

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your NexaLab account |
| Reset password | `reset-password.html` | Reset your NexaLab password |
| Magic link | `magic-link.html` | Your NexaLab sign-in link |
| Invite user | `invite-user.html` | You’re invited to the NexaLab client portal |
| Change email address | `change-email.html` | Confirm your new NexaLab email address |
| Reauthentication | `reauthentication.html` | Your NexaLab verification code |
| Password changed (security notification) | `password-changed.html` | Your NexaLab password was changed |
| Email address changed (security notification) | `email-changed.html` | Your NexaLab sign-in email was changed |

The welcome email is not here — it's sent by the `send-notification` Edge Function
right after a client's first sign-in.

To change the design or copy, edit `supabase/functions/send-notification/templates.ts`
(`authEmails()`), then regenerate:

```
deno run --allow-read --allow-write supabase/templates/generate.ts
```
