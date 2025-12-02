import { useEffect } from 'react';

export function PrivacyPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8 lg:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            RAIN.CLUB PRIVACY POLICY
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Operated by CRE Media III, LLC (a Florida limited liability company)
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
            <strong>Effective Date:</strong> November 28, 2025
          </p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              CRE Media III, LLC ("CRE Media," "Rain.club," "we," or "us") operates the Rain.club website, 
              the Rainmakers community, and related tools and services focused on commercial real estate 
              education and referrals (collectively, the "Services").
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              This Privacy Policy ("Policy") explains how we collect, use, disclose, and otherwise process 
              personal information, and the rights and choices you may have regarding that information.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Your use of our Services and any dispute over privacy is subject to this Policy and our Terms of Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. SCOPE</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This Policy applies to personal information we process relating to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Users of our website Rain.club and any other sites where this Policy is posted;</li>
              <li>Members of the Rainmakers community, including free and paid members;</li>
              <li>Individuals who register for or receive training, calls, events, or content from us;</li>
              <li>Individuals who communicate with us (for example, via email, chat, or online forms); and</li>
              <li>Prospective members or users who request information about our Services.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This Policy does not apply to:
            </p>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Job applicants, employees, or contractors of CRE Media; or</li>
              <li>Third-party websites, platforms, or services that we do not control.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. PERSONAL INFORMATION WE COLLECT</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We collect personal information from you, from third parties, and automatically, as described below.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">A. Information You Provide Directly</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The types of information you may provide include:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Registration and Account Information:</strong> Name, email address, username, password, phone number, membership level, and other account details.</li>
              <li><strong>Profile and Referral Information:</strong> Information about your business, markets you operate in, referral activity, and other details you choose to include in your profile or share with us.</li>
              <li><strong>Payment and Billing Information:</strong> If you purchase a paid membership, we may collect billing contact details (name, address, email) and payment-related information (which may be processed through a third-party payment processor).</li>
              <li><strong>Communications and Support:</strong> Messages, emails, chats, or other communications you send to us, including feedback, support requests, or questions.</li>
              <li><strong>Event / Program Participation:</strong> Information related to webinars, training sessions, or other programs, including registrations, attendance, and participation.</li>
              <li><strong>Surveys and Forms:</strong> Information you provide when completing surveys, questionnaires, or forms.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">B. Information We Collect from Third Parties</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may receive information about you from:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Service Providers & Partners:</strong> Payment processors, analytics providers, referral platforms, or marketing partners who help us operate the Services.</li>
              <li><strong>Social Media or Third-Party Accounts:</strong> If you choose to link or log into the Services using a third-party account, that third party may share certain information with us, depending on their policies and your settings.</li>
              <li><strong>Lead Sources & Public Data:</strong> We may receive information about prospective users from lead-generation providers or from publicly available sources.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">C. Information We Collect Automatically</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              When you access or use the Services, we and our service providers automatically collect certain information, such as:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Device & Usage Information:</strong> IP address, browser type, device type, operating system, access times, pages viewed, referring/exit pages, and similar usage information.</li>
              <li><strong>Activity Information:</strong> Clicks, page views, scrolls, time spent on pages, features used, logs, and other information about how you interact with the Services.</li>
              <li><strong>Cookies & Similar Technologies:</strong> We use cookies, pixels, and similar tracking technologies to collect and store information, as described in Section 6.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. HOW WE USE PERSONAL INFORMATION</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We use personal information for the following purposes:
            </p>
            <ol className="list-decimal pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-3">
              <li><strong>To Provide and Maintain the Services:</strong> Creating and managing accounts; providing access to content, community, and tools; processing membership payments and Referral Fees.</li>
              <li><strong>To Communicate with You:</strong> Sending transactional emails about your account or membership; responding to your questions, support requests, or feedback; sending notices about changes to our Terms or this Policy.</li>
              <li><strong>To Operate the Rainmakers Program:</strong> Tracking referrals and deal-related activity; administering Referral Fees and eligibility; preventing fraud or abuse of the program.</li>
              <li><strong>Analytics, Improvement & Development:</strong> Understanding how users access and use the Services; evaluating and improving our content, features, and marketing; developing new offerings and functionality.</li>
              <li><strong>Marketing and Promotions:</strong> Sending you emails or messages about products, services, or content we think may interest you (where permitted by law); measuring and improving our marketing.</li>
              <li><strong>Security and Fraud Prevention:</strong> Monitoring, detecting, and preventing fraud, abuse, or security incidents; protecting the integrity of our systems and Services.</li>
              <li><strong>Legal and Compliance:</strong> Complying with laws, regulations, legal processes, and lawful requests; enforcing our Terms of Service and protecting our rights.</li>
            </ol>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              We may also use personal information for any other purpose that we disclose to you at the time of collection or with your consent, where required.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. HOW WE DISCLOSE PERSONAL INFORMATION</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may disclose personal information as reasonably necessary for the purposes described above, including:
            </p>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Service Providers:</strong> We share information with third-party vendors who perform services on our behalf (for example, hosting, payment processing, analytics, email delivery, customer support).</li>
              <li><strong>Affiliates:</strong> We may share information with our affiliates (such as entities under common control), who will use it in accordance with this Policy.</li>
              <li><strong>Community and Other Users:</strong> Certain profile or community information (such as your name, username, or messages you post in community spaces) may be visible to other members or users as part of the Service.</li>
              <li><strong>Business Partners / Deal Counterparties:</strong> If you refer a deal or opportunity, we may share necessary information with lenders, borrowers, or other parties as needed to evaluate or close a transaction.</li>
              <li><strong>Legal, Protection & Safety:</strong> We may share information where we believe it is necessary to: (a) comply with applicable laws, legal processes, or lawful requests; (b) protect the rights, property, and safety of CRE Media, our users, or the public; or (c) enforce our Terms and policies.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, financing, sale of assets, bankruptcy, or similar event, your information may be disclosed or transferred as part of the transaction.</li>
              <li><strong>With Your Consent:</strong> We may disclose personal information to other third parties with your consent or at your direction.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. AGGREGATE & DE-IDENTIFIED INFORMATION</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may create and use aggregated, anonymized, or de-identified data:
            </p>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li>For analytics, research, marketing, and Service improvement;</li>
              <li>To generate statistical or benchmarking information; and</li>
              <li>For any other lawful business purpose.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              We will not attempt to re-identify such data where prohibited by law.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. COOKIES, TRACKING, AND ANALYTICS</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We and our third-party providers use cookies, pixels, and similar technologies to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Recognize you and your device;</li>
              <li>Remember your preferences;</li>
              <li>Analyze how you use the Services; and</li>
              <li>Support security and performance.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You can often control cookies through your browser settings (for example, blocking or deleting cookies). 
              If you disable certain cookies, some parts of the Services may not function properly.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              We may also use third-party analytics tools to help us understand how users interact with the Services. 
              These tools may collect information such as IP address, device type, and browsing behavior.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. YOUR PRIVACY CHOICES</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You may have the following choices regarding your personal information:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Account Information:</strong> You can review and update certain account information by logging into your account settings (if available). You may also contact us at support@rain.club.</li>
              <li><strong>Marketing Communications:</strong> You can opt out of marketing emails by following the unsubscribe instructions in those emails or contacting support@rain.club. We may still send you transactional or account-related messages.</li>
              <li><strong>Cookies & Tracking:</strong> You can adjust your browser settings to delete or block cookies. Some browsers also offer "Do Not Track" signals; our Services may not currently respond to all such signals.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Depending on your jurisdiction, you may have additional rights, such as the right to access, correct, or delete certain personal information. 
              You can contact us at support@rain.club for assistance.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">8. CHILDREN'S PRIVACY</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Our Services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
              If you believe we have collected information from a child under 13, please contact us at support@rain.club, 
              and we will take appropriate steps to delete such information.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">9. THIRD-PARTY WEBSITES & SERVICES</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Our Services may contain links to third-party sites, platforms, or services that we do not control.
              We are not responsible for the privacy practices of such third parties. We encourage you to review their 
              privacy policies before providing any personal information to them.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">10. INTERNATIONAL TRANSFERS</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              CRE Media III, LLC is based in the United States, and we may process your information in the United States 
              and other countries that may have different data protection laws than your home jurisdiction.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Where required by law, we will implement appropriate safeguards to protect personal information transferred across borders.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">11. SECURITY</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We use reasonable administrative, technical, and physical safeguards designed to protect personal information 
              against unauthorized access, loss, or misuse.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              However, no security method is perfect, and we cannot guarantee absolute security. You are responsible for 
              maintaining the confidentiality of any account credentials and for notifying us promptly at support@rain.club 
              if you believe your account has been compromised.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">12. DATA RETENTION</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We retain personal information:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>For as long as necessary to provide the Services, operate the Rainmakers program, and fulfill the purposes described in this Policy;</li>
              <li>As needed to comply with legal obligations, resolve disputes, and enforce our agreements; and</li>
              <li>As necessary for legitimate business needs.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              When personal information is no longer needed, we may delete, anonymize, or aggregate it in accordance with 
              applicable law and our internal policies.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">13. CHANGES TO THIS PRIVACY POLICY</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may update this Policy from time to time. When we do, we will:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Update the Effective Date at the top of this Policy; and</li>
              <li>Post the updated Policy on Rain.club.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              In some cases, we may provide additional notice (such as by email or prominent notice on the site) if required 
              by law or if the changes are material. Your continued use of the Services after any changes become effective 
              means you accept the updated Policy.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">14. CONTACT US</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              If you have any questions or concerns about this Privacy Policy or our data practices, you may contact us at:
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              <strong>Email:</strong> support@rain.club
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

