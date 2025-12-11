import React from 'react';

export const Terms = () => (
  <div className="max-w-3xl mx-auto px-4 py-16">
    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
    <div className="prose prose-slate">
        <p className="mb-4">By using AI Pro Headshot, you agree to these terms.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">1. Usage</h2>
        <p className="mb-4">You may generate up to 100 images per day for free. Automated scraping is prohibited.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">2. User Content</h2>
        <p className="mb-4">You retain rights to photos you upload. You grant us permission to process them to generate your headshots.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">3. Disclaimer</h2>
        <p className="mb-4">The AI generation is provided "as is". We do not guarantee likeness or specific quality standards for every generation.</p>
    </div>
  </div>
);

export const Privacy = () => (
  <div className="max-w-3xl mx-auto px-4 py-16">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <div className="prose prose-slate">
        <p className="mb-4">Your privacy is important to us.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Data Collection</h2>
        <p className="mb-4">We collect uploaded images solely for the purpose of generating headshots. We do not sell your photos.</p>
        <h2 className="text-xl font-bold mt-6 mb-2">Data Deletion</h2>
        <p className="mb-4">Uploaded source images are deleted from our processing servers within 24 hours of generation.</p>
    </div>
  </div>
);