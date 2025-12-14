import React from 'react';
import { Layout } from '../components/Layout';

export const Terms = () => (
  <Layout>
    <div className="max-w-3xl mx-auto px-4 py-16">
    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
    <div className="space-y-4 text-slate-700">
        <p className="mb-4">Last updated: December 2024</p>
        <p className="mb-4">By using Professional Headshot AI, you agree to these terms. If you do not agree to any part of these terms, you may not use our service.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. Account and Registration</h2>
        <p className="mb-4">To use Professional Headshot AI, you must:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Create an account using Google authentication</li>
          <li>Provide accurate information</li>
          <li>Be at least 18 years old</li>
          <li>Maintain the confidentiality of your account credentials</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">2. Usage Limits and Quotas</h2>
        <p className="mb-4">Free users are limited to <strong>100 headshot generations per day</strong>. This limit resets daily at UTC midnight. We reserve the right to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Modify usage limits at any time with notice</li>
          <li>Suspend service for accounts violating these terms</li>
          <li>Implement additional rate limiting to prevent abuse</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">3. Acceptable Use</h2>
        <p className="mb-4">You agree not to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Use automated scraping, bots, or scripts to generate images</li>
          <li>Attempt to bypass usage limits or security measures</li>
          <li>Upload content that is not your own likeness or used without consent</li>
          <li>Use generated images to deceive, impersonate, or defame others</li>
          <li>Use the service for illegal activities or to create harmful content</li>
          <li>Reverse engineer, decompile, or access the underlying AI models</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">4. User Content and Intellectual Property</h2>
        <p className="mb-4">You retain all rights to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Your original photos and uploaded reference images</li>
          <li>Generated headshots produced by our service</li>
        </ul>
        <p className="mb-4">By uploading content to Professional Headshot AI, you grant us the right to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Process your uploaded reference images to generate headshots (temporary processing only)</li>
          <li>Delete your reference images from our servers within 24 hours after generation</li>
          <li>Store generated headshots in your account history for your access</li>
          <li>Use anonymized, aggregated data to improve our service</li>
        </ul>
        <p className="mb-4"><strong>Important Privacy Notice:</strong> Your uploaded reference images are temporary and will NOT be permanently retained. We automatically delete them within 24 hours of headshot generation to protect your privacy. Only the AI-generated headshots remain accessible in your account.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">5. Disclaimer of Warranties</h2>
        <p className="mb-4">Professional Headshot AI is provided "AS IS" without warranties. We do not guarantee:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Uninterrupted or error-free service</li>
          <li>High-quality or specific output standards</li>
          <li>That generated images will be suitable for specific purposes</li>
          <li>Preservation of images beyond what is stated in our Privacy Policy</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">6. Limitation of Liability</h2>
        <p className="mb-4">To the maximum extent permitted by law, Professional Headshot AI shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service, including loss of data, business interruption, or any other damages.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">7. Termination</h2>
        <p className="mb-4">We may suspend or terminate your account at any time, with or without notice, if we determine you have violated these terms or engaged in harmful conduct.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">8. Changes to Terms</h2>
        <p className="mb-4">We may update these terms at any time. Continued use of the service constitutes acceptance of the updated terms.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">9. Contact Us</h2>
        <p className="mb-4">For questions about these terms, please contact us through our website.</p>
    </div>
  </div>
  </Layout>
);

export const Privacy = () => (
  <Layout>
    <div className="max-w-3xl mx-auto px-4 py-16">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <div className="space-y-4 text-slate-700">
        <p className="mb-4">Last updated: December 2024</p>
        <p className="mb-4">Professional Headshot AI ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">1. Information We Collect</h2>
        <p className="mb-4">We collect the following types of information:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li><strong>Account Information:</strong> Email address and name (from Google authentication)</li>
          <li><strong>Reference Images (Your Uploaded Photos):</strong> Reference images you temporarily upload to generate headshots. These are NOT permanently retained (see data retention section).</li>
          <li><strong>Generated Content:</strong> AI-generated headshots and associated metadata stored in your account history</li>
          <li><strong>Usage Data:</strong> Generation history, timestamps, and style preferences</li>
          <li><strong>Device Information:</strong> Browser type, IP address, and usage patterns (via analytics)</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">2. How We Use Your Information</h2>
        <p className="mb-4">We use the collected information to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Temporarily process your uploaded reference images to generate headshots</li>
          <li>Automatically delete your reference images within 24 hours to protect your privacy</li>
          <li>Store and manage your account and generation history (generated headshots only)</li>
          <li>Enforce usage limits and prevent abuse</li>
          <li>Provide customer support</li>
          <li>Analyze usage patterns to improve our service (anonymized data only, never including your personal photos)</li>
          <li>Send important service notifications</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">3. Data Storage and Security</h2>
        <p className="mb-4">We store your data using:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li><strong>Supabase:</strong> For account authentication, generation history, and image metadata</li>
          <li><strong>Supabase Storage:</strong> For your reference images and generated headshots</li>
        </ul>
        <p className="mb-4">Your data is encrypted in transit and at rest. We implement industry-standard security measures to protect against unauthorized access.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">4. Data Retention and Deletion</h2>
        <p className="mb-4">Your information is retained as follows:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li><strong>Reference Images (Your Uploaded Photos):</strong> We do NOT permanently store your uploaded reference images. Your photos are deleted from our servers within 24 hours after the headshot generation is complete. This ensures your personal photos are not retained and protects your privacy.</li>
          <li><strong>Generated Headshots:</strong> The AI-generated headshots are stored in your account history and accessible from your "My Headshots" page. You own these generated images and can download or delete them at any time.</li>
          <li><strong>Account Data:</strong> Email and account information are retained while your account is active. Upon account deletion, all associated data (account info and generated headshots) is permanently removed within 30 days.</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">5. Third-Party Services</h2>
        <p className="mb-4">We use the following third-party services:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li><strong>Google:</strong> For authentication (OAuth 2.0)</li>
          <li><strong>Supabase:</strong> For backend infrastructure and storage</li>
          <li><strong>Nano Banana Pro API:</strong> For AI headshot generation</li>
          <li><strong>Google Analytics:</strong> For website usage analytics</li>
        </ul>
        <p className="mb-4">These services have their own privacy policies. We recommend reviewing them.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">6. Sharing Your Information</h2>
        <p className="mb-4">We do not sell your personal information. We may share information only:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>With third-party service providers necessary to operate the service</li>
          <li>When required by law or legal process</li>
          <li>To protect our rights, privacy, or safety</li>
        </ul>

        <h2 className="text-xl font-bold mt-8 mb-3">7. Your Rights</h2>
        <p className="mb-4">Depending on your location, you may have the right to:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Access your personal information</li>
          <li>Correct or update inaccurate information</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
          <li>Opt out of analytics and tracking</li>
        </ul>
        <p className="mb-4">To exercise these rights, please contact us through our website.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">8. Cookies and Tracking</h2>
        <p className="mb-4">We use:</p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li><strong>Essential Cookies:</strong> For authentication and session management</li>
          <li><strong>Analytics Cookies:</strong> To understand how users interact with our service</li>
        </ul>
        <p className="mb-4">You can manage cookie preferences through your browser settings.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">9. Children's Privacy</h2>
        <p className="mb-4">Professional Headshot AI is not intended for users under 18 years old. We do not knowingly collect information from children. If we discover such collection, we will delete the data and terminate the account.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">10. Contact Us</h2>
        <p className="mb-4">If you have questions about our Privacy Policy or your data, please contact us through our website.</p>

        <h2 className="text-xl font-bold mt-8 mb-3">11. Policy Updates</h2>
        <p className="mb-4">We may update this Privacy Policy periodically. We will notify you of material changes by updating the "Last updated" date and posting the new policy on this page.</p>
    </div>
  </div>
  </Layout>
);