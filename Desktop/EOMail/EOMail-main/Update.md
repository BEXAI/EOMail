# EOMail Deployment Guide for Render.com

This guide will walk you through the process of deploying the EOMail application to Render.com.

## Prerequisites

*   A Render.com account.
*   A GitHub account with the EOMail project forked or pushed to a new repository.

## Deployment Steps

1.  **Create a New Blueprint Service:**
    *   Go to the Render.com dashboard.
    *   Click the "New +" button and select "Blueprint".
    *   Connect your GitHub account and select the repository for EOMail.
    *   Render will automatically detect the `render.yaml` file and propose a new deployment.

2.  **Review the Plan:**
    *   Render will show you the services that will be created:
        *   A `web` service named `eomail`.
        *   A `database` service named `eomail-db`.
    *   Click "Approve" to create the services.

3.  **Initial Deployment:**
    *   The first deployment will start automatically. It may take a few minutes to complete.
    *   The build command `npm install && npm run build && npm run db:push` will be executed. This will install dependencies, build the application, and run the initial database migration.

4.  **Set Environment Variables:**
    *   After the initial deployment, you need to set the following environment variables in the `eomail` service's "Environment" tab:
        *   `OPENAI_API_KEY`: Your API key from OpenAI.
        *   `RESEND_API_KEY`: Your API key from Resend.
        *   `RESEND_WEBHOOK_SECRET`: A secret you create for securing the Resend webhook. You can generate a strong random string for this.
        *   `DOMAIN`: The domain name you plan to use for this application (e.g., `eomail.yourdomain.com`). This is important for generating correct links in emails. For the initial deployment, you can use the `onrender.com` URL that Render provides (e.g., `eomail.onrender.com`).

5.  **Set Up Resend Webhook:**
    *   In your Resend account, go to the "Webhooks" section.
    *   Create a new webhook.
    *   For the "Webhook URL", enter `https://<your-render-app-url>/api/email/inbound`. Replace `<your-render-app-url>` with the URL of your deployed `eomail` service (e.g., `https://eomail.onrender.com/api/email/inbound`).
    *   For the "Webhook secret", enter the same secret you used for the `RESEND_WEBHOOK_SECRET` environment variable.
    *   Select the "Email received" event.

6.  **Redeploy the Application:**
    *   After setting the environment variables, you'll need to trigger a new deployment for the changes to take effect. You can do this by clicking the "Manual Deploy" button in the Render dashboard.

7.  **Future Deployments and Schema Changes:**
    *   As recommended in the `AUDIT.md` report, it's best to remove `&& npm run db:push` from the `buildCommand` in your `render.yaml` file for future deployments.
    *   To make schema changes after the initial deployment, you can connect to your database using the credentials provided by Render and run the `npm run db:push` command locally, or you can use the "Shell" tab in the Render dashboard for your `eomail` service to run the command.

## Conclusion

Your EOMail application should now be deployed and running on Render.com. You can access it at the URL provided by Render.
