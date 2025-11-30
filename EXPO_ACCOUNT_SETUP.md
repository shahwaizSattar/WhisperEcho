# 🎯 How to Create an Expo.dev Account

## Quick Steps (2 minutes)

### Option 1: Sign Up on Website (Recommended)

1. **Go to Expo website:**
   - Visit: https://expo.dev/signup

2. **Choose sign-up method:**
   - **GitHub** (easiest - if you have GitHub account)
   - **Google** (if you have Gmail)
   - **Email** (create with any email)

3. **Fill in details:**
   - Username (choose something simple)
   - Email address
   - Password (if using email signup)

4. **Verify email:**
   - Check your inbox
   - Click the verification link
   - Done! ✅

### Option 2: Sign Up via Terminal

You can also create an account directly from the terminal:

```bash
cd frontend
eas register
```

Follow the prompts to create your account.

## 📝 What You'll Need

- **Email address** (any email works)
- **Username** (will be used for your app builds)
- **Password** (if not using GitHub/Google)

## 🆓 Free Plan Features

Expo's free plan includes:
- ✅ Unlimited builds per month
- ✅ APK downloads
- ✅ Build history
- ✅ Over-the-air updates
- ✅ All you need for your WhisperEcho app!

## 🔐 After Creating Account

Once your account is created, login from terminal:

```bash
cd frontend
eas login
```

Enter your username/email and password.

## ✅ Verify Login

Check if you're logged in:

```bash
eas whoami
```

You should see your username!

## 🚀 Ready to Build

After logging in, you can immediately build your APK:

```bash
eas build --platform android --profile preview
```

---

## 🎉 That's It!

Creating an Expo account takes less than 2 minutes. Once done, you can build unlimited APKs for free!

### Quick Links:
- **Sign Up:** https://expo.dev/signup
- **Login:** https://expo.dev/login
- **Dashboard:** https://expo.dev/accounts/[your-username]

---

**Next Step:** After creating your account, run the build command from `BUILD_COMMANDS.txt`
