# Firebase Studio - DriveGuru

This is a Next.js starter project for DriveGuru, built in Firebase Studio.

## Getting Started

To run the application and use all its features, you need to set up your environment variables.

### 1. Create the Environment File

In the root directory of the project, create a file named `.env`.

### 2. Add Your API Keys

Open the `.env` file and add the following lines, replacing the placeholder text with your actual secret keys. You can get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```
# For Gemini AI Features (AI Search, Content Generation, etc.)
GEMINI_API_KEY="your_gemini_api_key_here"

# For Cashfree Payment Gateway (if you use the API method)
CASHFREE_APP_ID="your_cashfree_client_id"
CASHFREE_SECRET="your_cashfree_secret_key"
```

**IMPORTANT:** Never commit the `.env` file to a public repository. It contains sensitive information.

### 3. Run the Application

After saving your `.env` file, you can run the development server:

```bash
npm run dev
```

The application will now be able to connect to the Gemini API and other services you have configured.
