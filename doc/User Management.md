IV.3 User Management

This module delves into the realm of User Management, addressing key aspects of user interactions and access control within the Pong platform.
It encompasses two major components, each focused on essential elements of user management and authentication: user participation across multiple tournaments and the implementation of remote authentication.

The management of duplicate usernames/emails is at your discretion. You must provide a solution that makes sense.

• Major module: Standard user management, authentication and users across tournaments.

	◦ Users can securely subscribe to the website.
	◦ Registered users can securely log in.
	◦ Users can select a unique display name to participate in tournaments.
	◦ Users can update their information.
	◦ Users can upload an avatar, with a default option if none is provided.
	◦ Users can add others as friends and view their online status.
	◦ User profiles display stats, such as wins and losses.
	◦ Each user has a Match History including 1v1 games, dates, and relevant details, accessible to logged-in users.

• Major module: Implement remote authentication (Google Sign-in).

	◦ Integrate the authentication system, allowing users to securely sign in.
	◦ Obtain the necessary credentials and permissions from the authority to enable secure login.
	◦ Implement user-friendly login and authorization flows that adhere to best practices and security standards.
	◦ Ensure the secure exchange of authentication tokens and user information between the web application and the authentication provider.

• Major module: Implementing a remote authentication (OAuth 2.0 authentication with 42).

	◦ Integrate the authentication system, allowing users to securely sign in.
	◦ Obtain the necessary credentials and permissions from the authority to enable a secure login.
	◦ Implement user-friendly login and authorization flows that adhere to best practices and security standards.
	◦ Ensure the secure exchange of authentication tokens and user information between the web application and the authentication provider.



IV.6 Cybersecurity

These cybersecurity modules are designed to enhance the security posture of the project.
The major module focuses on robust protection through Web Application Firewall (WAF) and ModSecurity configurations, as well as HashiCorp Vault for secure secrets management.
The minor modules complement this effort by adding features for GDPR compliance, user data anonymization, account deletion, Two-Factor authentication (2FA), and JSON Web Tokens (JWT), collectively ensuring the project’s commitment to data protection, privacy, and authentication security.

• Major module: Implement WAF/ModSecurity with Hardened Configuration and HashiCorp Vault for Secrets Management.

	◦ Configure and deploy a Web Application Firewall (WAF) and ModSecurity with a strict and secure configuration to protect against web-based attacks.
	◦ Integrate HashiCorp Vault to securely manage and store sensitive information, such as API keys, credentials, and environment variables, ensuring that these secrets are properly encrypted and isolated.

• Minor module: GDPR compliance options with user anonymization, local data management, and account deletion.

	◦ Implement GDPR-compliant features that enable users to request anonymization of their personal data, ensuring that their identity and sensitive information are protected.
	◦ Provide tools for users to manage their local data, including the ability to view, edit, or delete their personal information stored within the system.
	◦ Offer a streamlined process for users to request the permanent deletion of their accounts, including all associated data, ensuring compliance with data protection regulations.
	◦ Maintain clear and transparent communication with users regarding their data privacy rights, with easily accessible options to exercise these rights.

	The GDPR is a regulation that aims to protect the personal data and privacy of individuals within the European Union (EU) and the European Economic Area (EEA).
	It sets out strict rules and guidelines for organizations on how they should handle and process personal data.

• Major module: Implement Two-Factor Authentication (2FA) and JWT.

	◦ Implement Two-Factor Authentication (2FA) as an additional layer of security for user accounts, requiring users to provide a secondary verification method, such as a one-time code, in addition to their password.
	◦ Utilize JSON Web Tokens (JWT) as a secure method for authentication and authorization, ensuring that user sessions and access to resources are managed securely.
	◦ Provide a user-friendly setup process for enabling 2FA, with options for SMS codes, authenticator apps, or email-based verification.
	◦ Ensure that JWT tokens are issued and validated securely to prevent unauthorized access to user accounts and sensitive data.
